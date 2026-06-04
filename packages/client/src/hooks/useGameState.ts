import { useEffect, useCallback } from 'react';
import type {
  GameState as GameStatePayload,
  GameDealPayload,
  GameTurnPayload,
  BlindLevel,
  GameEliminatePayload,
  TournamentResult,
  PlayerAction,
} from '@spin-and-go/shared';
import { useGameStore, consumePendingAction } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { getSocket } from '../services/socket';

/**
 * Hook that subscribes to WebSocket game events and updates the game store.
 *
 * Handles:
 * - game:start → initializes tournament and hand state
 * - game:deal → updates hole cards (only current player's) and community cards
 * - game:state → full state sync
 * - game:turn → sets whose turn it is and time remaining
 * - game:blind-change → updates blind level in tournament
 * - game:eliminate → marks a player as eliminated
 * - game:end → sets tournament result and game status to 'ended'
 *
 * Also provides sendAction to emit game:action events via WebSocket.
 */
export function useGameState() {
  const store = useGameStore();
  const player = useAuthStore((s) => s.player);
  const currentPlayerId = player?.id ?? '';

  const sendAction = useCallback(
    (action: PlayerAction) => {
      const socket = getSocket();
      socket.emit('game:action', action);
    },
    [],
  );

  useEffect(() => {
    const socket = getSocket();

    // --- game:start ---
    const handleGameStart = (payload: GameStatePayload) => {
      // NUCLEAR FIX: JSON roundtrip strips ALL non-serializable objects
      let safePayload: GameStatePayload;
      try {
        safePayload = JSON.parse(JSON.stringify(payload));
      } catch {
        return;
      }

      const { handState, tournament } = safePayload;
      handState.lastAction = null;

      // Preserve existing hole cards if we already received them via game:deal
      const existingHoleCards = useGameStore.getState().myHoleCards;

      // Extract current player's hole cards from payload (may be empty in sanitized state)
      const myPlayer = handState.players.find(
        (p) => p.playerId === currentPlayerId,
      );
      const payloadHoleCards = myPlayer?.holeCards ?? [];
      
      // Use payload cards if they exist, otherwise preserve existing
      const myHoleCards = payloadHoleCards.length > 0 ? payloadHoleCards : existingHoleCards;

      // Determine if it's our turn
      const currentTurnPlayer = handState.players[handState.currentPlayerIndex];
      const isMyTurn = currentTurnPlayer?.playerId === currentPlayerId;

      useGameStore.setState({
        handState,
        tournament,
        gameStatus: 'playing',
        myHoleCards,
        isMyTurn,
        turnTimeRemaining: handState.turnTimeoutSeconds,
        tournamentResult: null,
      });
    };

    // --- game:deal ---
    const handleGameDeal = (payload: GameDealPayload) => {
      const { holeCards, communityCards } = payload;

      useGameStore.setState((state) => {
        // Only store hole cards if they were sent to us (server sends per-player)
        const newHoleCards =
          holeCards.length > 0 ? holeCards : state.myHoleCards;

        const updatedHandState = state.handState
          ? { ...state.handState, communityCards }
          : state.handState;

        return {
          myHoleCards: newHoleCards,
          handState: updatedHandState,
        };
      });
    };

    // --- game:state ---
    const handleGameState = (payload: GameStatePayload) => {
      // Validate payload before updating state — reject invalid data to prevent crashes
      if (
        !payload ||
        !payload.handState ||
        !payload.handState.players ||
        payload.handState.players.length === 0
      ) {
        return;
      }

      // NUCLEAR FIX: JSON roundtrip strips ALL non-serializable objects (Date, functions, etc.)
      // This guarantees only strings, numbers, booleans, arrays, and null reach the React render tree.
      let sanitizedPayload: GameStatePayload;
      try {
        sanitizedPayload = JSON.parse(JSON.stringify(payload));
      } catch {
        return; // If serialization fails, skip this update
      }

      const { handState, tournament } = sanitizedPayload;

      // Ensure currentPlayerIndex is within bounds
      const safeCurrentPlayerIndex =
        handState.currentPlayerIndex >= 0 && handState.currentPlayerIndex < handState.players.length
          ? handState.currentPlayerIndex
          : 0;

      handState.currentPlayerIndex = safeCurrentPlayerIndex;
      handState.lastAction = null; // Never store action objects

      // Preserve existing hole cards (game:state sends sanitized state without cards)
      const existingHoleCards = useGameStore.getState().myHoleCards;

      // Determine if it's our turn
      const currentTurnPlayer = handState.players[handState.currentPlayerIndex];
      const isMyTurn = currentTurnPlayer?.playerId === currentPlayerId;

      useGameStore.setState({
        handState,
        tournament,
        myHoleCards: existingHoleCards,
        isMyTurn,
        turnTimeRemaining: handState.turnTimeoutSeconds,
      });
    };

    // --- game:turn ---
    const handleGameTurn = (payload: GameTurnPayload) => {
      const isMyTurn = payload.playerId === currentPlayerId;

      // Also update currentPlayerIndex in hand state so ActionPanel shows correctly
      useGameStore.setState((state) => {
        if (!state.handState) return { isMyTurn, turnTimeRemaining: payload.timeRemaining };
        
        const playerIndex = state.handState.players.findIndex(
          p => p.playerId === payload.playerId
        );
        
        return {
          isMyTurn,
          turnTimeRemaining: payload.timeRemaining,
          handState: {
            ...state.handState,
            currentPlayerIndex: playerIndex >= 0 ? playerIndex : state.handState.currentPlayerIndex,
          },
        };
      });
    };

    // --- game:blind-change ---
    const handleBlindChange = (payload: BlindLevel) => {
      useGameStore.setState((state) => {
        if (!state.tournament) return {};

        return {
          tournament: {
            ...state.tournament,
            currentBlindLevel: payload.level,
          },
        };
      });
    };

    // --- game:eliminate ---
    const handleEliminate = (payload: GameEliminatePayload) => {
      useGameStore.setState((state) => {
        if (!state.tournament) return {};

        const updatedPlayers = state.tournament.players.map((p) =>
          p.playerId === payload.playerId
            ? {
                ...p,
                status: 'eliminated' as const,
                finishPosition: payload.position,
                eliminatedAt: new Date(),
              }
            : p,
        );

        return {
          tournament: {
            ...state.tournament,
            players: updatedPlayers,
          },
        };
      });
    };

    // --- game:end ---
    const handleGameEnd = (payload: TournamentResult) => {
      useGameStore.setState({
        gameStatus: 'ended',
        tournamentResult: payload,
        isMyTurn: false,
      });
    };

    // Subscribe to all game events
    socket.on('game:start', handleGameStart);
    socket.on('game:deal', handleGameDeal);
    socket.on('game:state', handleGameState);
    socket.on('game:turn', handleGameTurn);
    socket.on('game:blind-change', handleBlindChange);
    socket.on('game:eliminate', handleEliminate);
    socket.on('game:end', handleGameEnd);

    // Cleanup subscriptions on unmount
    return () => {
      socket.off('game:start', handleGameStart);
      socket.off('game:deal', handleGameDeal);
      socket.off('game:state', handleGameState);
      socket.off('game:turn', handleGameTurn);
      socket.off('game:blind-change', handleBlindChange);
      socket.off('game:eliminate', handleEliminate);
      socket.off('game:end', handleGameEnd);
    };
  }, [currentPlayerId]);

  return {
    ...store,
    sendAction,
    consumePendingAction,
  };
}
