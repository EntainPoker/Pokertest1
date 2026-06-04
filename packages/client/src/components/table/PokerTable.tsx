import { useState, useCallback } from 'react';
import type { HandState, PlayerAction, Card as CardType } from '@spin-and-go/shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
import { Card } from '../shared/Card';
import { LastHandSummary } from '../history/LastHandSummary';
import { getSocket } from '../../services/socket';
import { useGameStore } from '../../stores/gameStore';

interface PokerTableProps {
  handState: HandState;
  currentPlayerId: string;
  gameId?: string;
  /** Turn time remaining in seconds (from game state) */
  turnTimeRemaining?: number;
}

/**
 * Main poker table layout — GGPoker-style mobile-first design.
 * Three vertical zones: table (top), player cards (middle), actions (bottom).
 * Players are rendered by their raw array index:
 *   - 2 players: player[0] at top, player[1] at bottom
 *   - 3 players: player[0] at top, player[1] bottom-left, player[2] bottom-right
 * Current player's cards show face-up based on playerId match.
 *
 * Satisfies Requirements 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1.
 */
export function PokerTable({ handState, currentPlayerId, gameId, turnTimeRemaining = 30 }: PokerTableProps) {
  const { players = [], communityCards = [], pot = 0, sidePots = [], dealerPosition = 0, currentPlayerIndex = 0 } = handState || {};
  const [showLastHand, setShowLastHand] = useState(false);
  const myHoleCards = useGameStore((s) => s.myHoleCards);

  // Ensure pot is always a number (never an object) to prevent React Error #300
  const safePot = typeof pot === 'number' && !isNaN(pot) ? pot : 0;
  const safeSidePots = Array.isArray(sidePots) ? sidePots : [];

  /** Emit player action via WebSocket */
  const handleAction = useCallback((action: PlayerAction) => {
    const socket = getSocket();
    socket.emit('game:action', { gameId, playerId: currentPlayerId, action });
  }, [gameId, currentPlayerId]);

  // Safety: if players array is empty or invalid, show loading state
  if (!players || players.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading table...</p>
      </div>
    );
  }

  /** Get the hole cards to display for a given player index */
  const getHoleCards = (index: number): CardType[] => {
    const player = players[index];
    if (!player) return [];
    if (player.playerId === currentPlayerId) {
      return myHoleCards;
    }
    return [];
  };

  /** Check if a player's cards should be shown face-up */
  const shouldShowCards = (index: number): boolean => {
    const player = players[index];
    if (!player) return false;
    return player.playerId === currentPlayerId;
  };

  // Simple index-based layout: separate top opponents from bottom (current) player
  // Find which index is the current player for bottom positioning
  const myIndex = players.findIndex(p => p.playerId === currentPlayerId);

  // Top row: all players except the current player
  const topIndices = players
    .map((_, idx) => idx)
    .filter(idx => idx !== myIndex);

  // Bottom player: the current player (or fallback to last player if not found)
  const bottomIndex = myIndex >= 0 ? myIndex : players.length - 1;

  return (
    <div className="w-full h-screen max-h-[100dvh] bg-gray-950 flex flex-col overflow-hidden">
      {/* Last Hand button — fixed position top-left */}
      {gameId && (
        <button
          onClick={() => setShowLastHand(true)}
          className="absolute top-2 left-2 z-20 min-w-[44px] min-h-[44px] px-2 py-1.5 rounded-lg bg-gray-800/90 border border-gray-700/50 text-gray-300 text-[10px] font-medium hover:bg-gray-700 hover:text-white transition-all shadow-md"
          aria-label="View last hand history"
        >
          Last Hand
        </button>
      )}

      {/* Last Hand overlay */}
      {showLastHand && gameId && (
        <LastHandSummary gameId={gameId} onClose={() => setShowLastHand(false)} />
      )}

      {/* TOP ZONE — Green felt table area (takes remaining space) */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-2 pt-8 pb-2 bg-gradient-to-b from-green-900 via-emerald-900 to-green-950 rounded-b-2xl relative">
        {/* Opponents row */}
        <div className={`relative z-10 flex ${topIndices.length === 1 ? 'justify-center' : 'justify-center gap-3 sm:gap-8'} w-full`}>
          {topIndices.map((idx) => {
            const p = players[idx];
            if (!p) return null;
            return (
              <PlayerSeat
                key={p.playerId}
                player={p}
                isActive={currentPlayerIndex === idx}
                isDealer={dealerPosition === idx}
                showCards={shouldShowCards(idx)}
                holeCards={getHoleCards(idx)}
              />
            );
          })}
        </div>

        {/* Center area: pot + community cards */}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <PotDisplay amount={safePot} sidePots={safeSidePots} />
          <CommunityCards cards={communityCards} />
        </div>

        {/* Spacer */}
        <div className="h-1" />
      </div>

      {/* MIDDLE ZONE — Current player's cards and info (fixed height, never overlapped) */}
      <div className="shrink-0 flex items-center justify-center gap-3 px-3 py-1.5 bg-gray-900 border-t border-gray-800">
        {players[bottomIndex] && (
          <div className="flex items-center gap-2">
            {/* Avatar + name + chips */}
            <div className="flex flex-col items-center gap-0.5">
              {dealerPosition === bottomIndex && (
                <span className="w-4 h-4 rounded-full bg-white text-gray-900 text-[8px] font-black flex items-center justify-center shadow-sm border border-gray-300">D</span>
              )}
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md bg-gradient-to-br from-blue-500 to-blue-700 ${currentPlayerIndex === bottomIndex ? 'ring-2 ring-poker-gold' : 'ring-1 ring-gray-600/50'}`}>
                {players[bottomIndex].username.charAt(0).toUpperCase()}
              </div>
              <span className="text-[9px] text-gray-400 font-medium">{players[bottomIndex].username}</span>
              <span className="text-[9px] text-poker-gold font-bold">${players[bottomIndex].chipCount}</span>
            </div>
            {/* Cards — displayed horizontally next to avatar */}
            <div className="flex gap-0.5">
              {getHoleCards(bottomIndex).length > 0
                ? getHoleCards(bottomIndex).map((card, i) => (
                    <Card key={i} rank={card.rank} suit={card.suit} />
                  ))
                : !players[bottomIndex].status?.includes('folded') && (
                    <>
                      <Card faceDown />
                      <Card faceDown />
                    </>
                  )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ZONE — Action Panel (shrink-0 = fixed height, never grows) */}
      <div className="shrink-0 w-full">
        <ActionPanel
          handState={handState}
          currentPlayerId={currentPlayerId}
          onAction={handleAction}
          turnTimeRemaining={turnTimeRemaining}
        />
      </div>
    </div>
  );
}
