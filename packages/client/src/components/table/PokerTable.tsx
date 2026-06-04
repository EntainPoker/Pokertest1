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
 * Main poker table layout with premium oval felt design.
 * Players are rendered by their raw array index:
 *   - 2 players: player[0] at top, player[1] at bottom
 *   - 3 players: player[0] at top, player[1] bottom-left, player[2] bottom-right
 * Current player's cards show face-up based on playerId match.
 *
 * Satisfies Requirements 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 13.1.
 */
export function PokerTable({ handState, currentPlayerId, gameId, turnTimeRemaining = 30 }: PokerTableProps) {
  const { players, communityCards, pot, sidePots, dealerPosition, currentPlayerIndex } = handState;
  const [showLastHand, setShowLastHand] = useState(false);
  const myHoleCards = useGameStore((s) => s.myHoleCards);

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
    <div className="w-full h-screen max-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-poker-gold/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-900/20 rounded-full blur-3xl pointer-events-none" />

      {/* Last Hand button — fixed position top-left */}
      {gameId && (
        <button
          onClick={() => setShowLastHand(true)}
          className="absolute top-3 left-3 z-20 min-w-[44px] min-h-[44px] px-4 py-2.5 rounded-xl bg-gray-800/90 border border-gray-700/50 text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-700 hover:text-white hover:border-gray-600 transition-all shadow-lg backdrop-blur-sm"
          aria-label="View last hand history"
        >
          Last Hand
        </button>
      )}

      {/* Last Hand overlay */}
      {showLastHand && gameId && (
        <LastHandSummary gameId={gameId} onClose={() => setShowLastHand(false)} />
      )}

      {/* Table container */}
      <div className="w-full max-w-4xl aspect-[4/3] sm:aspect-[16/10] relative">
        {/* Table wood-grain border */}
        <div className="absolute inset-0 rounded-[3rem] sm:rounded-[4rem] bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 shadow-2xl shadow-black/60 p-2.5 sm:p-3.5">
          {/* Table felt */}
          <div className="w-full h-full rounded-[2.5rem] sm:rounded-[3.5rem] bg-gradient-to-br from-poker-felt via-green-900 to-poker-felt border-2 border-green-800/40 shadow-inner overflow-hidden relative">
            {/* Inner rail highlight */}
            <div className="absolute inset-3 sm:inset-5 rounded-[2rem] sm:rounded-[3rem] border border-green-700/25" />
            {/* Subtle center glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-600/10 to-transparent pointer-events-none" />
            {/* Table edge shadow */}
            <div className="absolute inset-0 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[inset_0_4px_20px_rgba(0,0,0,0.4)]" />
          </div>
        </div>

        {/* Table content */}
        <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 md:p-10 z-10">
          {/* Top players (opponents) */}
          <div className={`flex ${topIndices.length === 1 ? 'justify-center' : 'justify-between'} w-full px-4 sm:px-8`}>
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
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <PotDisplay amount={pot} sidePots={sidePots} />
            <CommunityCards cards={communityCards} />
          </div>

          {/* Bottom player (current player) */}
          <div className="flex justify-center w-full pb-40 sm:pb-48">
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
        </div>
      </div>

      {/* Action Panel — fixed at bottom of viewport, outside the table */}
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
