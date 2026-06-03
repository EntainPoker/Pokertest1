import { create } from 'zustand';
import type {
  HandState,
  Tournament,
  TournamentResult,
  Card,
  PlayerAction,
} from '@spin-and-go/shared';

export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface GameState {
  /** Current hand state */
  handState: HandState | null;
  /** Current tournament info */
  tournament: Tournament | null;
  /** Whether it is the current player's turn */
  isMyTurn: boolean;
  /** Current player's hole cards (private — only this player's cards) */
  myHoleCards: Card[];
  /** Seconds remaining for the current turn */
  turnTimeRemaining: number;
  /** Overall game status */
  gameStatus: GameStatus;
  /** Final tournament result when game ends */
  tournamentResult: TournamentResult | null;

  /** Replace the full game state (hand + tournament) */
  setGameState: (handState: HandState, tournament: Tournament) => void;
  /** Update only the hand state */
  setHandState: (handState: HandState) => void;
  /** Update the turn timer countdown */
  setTurnTime: (seconds: number) => void;
  /** Send a player action (stored as last intent for the hook to emit) */
  sendAction: (action: PlayerAction) => void;
  /** Reset the store to initial state */
  reset: () => void;
}

/** Action pending emission via WebSocket — consumed by useGameState hook */
let pendingAction: PlayerAction | null = null;

export function consumePendingAction(): PlayerAction | null {
  const action = pendingAction;
  pendingAction = null;
  return action;
}

const initialState = {
  handState: null,
  tournament: null,
  isMyTurn: false,
  myHoleCards: [],
  turnTimeRemaining: 0,
  gameStatus: 'waiting' as GameStatus,
  tournamentResult: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setGameState: (handState: HandState, tournament: Tournament) => {
    set({
      handState,
      tournament,
      gameStatus: 'playing',
    });
  },

  setHandState: (handState: HandState) => {
    set({ handState });
  },

  setTurnTime: (seconds: number) => {
    set({ turnTimeRemaining: seconds });
  },

  sendAction: (action: PlayerAction) => {
    pendingAction = action;
    // Trigger a minimal state update so the hook can detect and emit
    set({});
  },

  reset: () => {
    pendingAction = null;
    set(initialState);
  },
}));
