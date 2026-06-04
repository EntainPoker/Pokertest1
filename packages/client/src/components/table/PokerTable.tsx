import { useState, useCallback } from 'react';
import type { HandState, PlayerAction, Card as CardType } from '@spin-and-go/shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
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
    <div className="w-full h-screen max-h-screen bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Last Hand button — fixed position top-left */}
      {gameId && (
        <button
          onClick={() => setShowLastHand(true)}
          className="absolute top-3 left-3 z-20 min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg bg-gray-800/90 border border-gray-700/50 text-gray-300 text-xs font-medium hover:bg-gray-700 hover:text-white transition-all shadow-md"
          aria-label="View last hand history"
        >
          Last Hand
        </button>
      )}

      {/* Last Hand overlay */}
      {showLastHand && gameId && (
        <LastHandSummary gameId={gameId} onClose={() => setShowLastHand(false)} />
      )}

      {/* TOP ZONE — Green felt table area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-3 pt-10 pb-3 bg-gradient-to-b from-green-900 via-emerald-900 to-green-950 rounded-b-3xl relative">
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-b-3xl bg-gradient-to-b from-green-800/20 via-transparent to-black/20 pointer-events-none" />

        {/* Opponents row */}
        <div className={`relative z-10 flex ${topIndices.length === 1 ? 'justify-center' : 'justify-center gap-4 sm:gap-8'} w-full`}>
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
        <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3">
          <PotDisplay amount={safePot} sidePots={safeSidePots} />
          <CommunityCards cards={communityCards} />
        </div>

        {/* Spacer to push content up */}
        <div className="h-2" />
      </div>

      {/* MIDDLE ZONE — Current player's cards and info */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 bg-gray-900 pb-36 sm:pb-44">
        {players[bottomIndex] && (
          <PlayerSeat
            player={players[bottomIndex]}
            isActive={currentPlayerIndex === bottomIndex}
            isDealer={dealerPosition === bottomIndex}
            showCards={true}
            holeCards={getHoleCards(bottomIndex)}
          />
        )}
      </div>

      {/* Action Panel — fixed at bottom of viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
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
