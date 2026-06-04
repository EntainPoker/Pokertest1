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
 * Main poker table layout with 3 player positions arranged around the table.
 * Green felt background, community cards in center, pot display, and dealer button.
 * Highlights the active player whose turn it is.
 *
 * Player positions:
 * - Position 0: top-center
 * - Position 1: bottom-left
 * - Position 2: bottom-right
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

  const getPlayer = (index: number) => players[index] ?? null;

  /** Get the hole cards to display for a given player index */
  const getHoleCards = (index: number): CardType[] => {
    const player = players[index];
    if (!player) return [];
    if (player.playerId === currentPlayerId) {
      return myHoleCards;
    }
    return [];
  };

  return (
    <div className="w-full h-screen max-h-screen bg-gradient-to-b from-gray-900 to-gray-950 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Last Hand button — fixed position top-left */}
      {gameId && (
        <button
          onClick={() => setShowLastHand(true)}
          className="absolute top-3 left-3 z-20 min-w-[44px] min-h-[44px] px-4 py-2.5 rounded-xl bg-gray-800/90 border border-gray-600/50 text-gray-300 text-xs sm:text-sm font-medium hover:bg-gray-700 hover:text-white transition-all shadow-lg backdrop-blur-sm"
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
        <div className="absolute inset-0 rounded-[3rem] sm:rounded-[4rem] bg-gradient-to-b from-amber-900 via-amber-800 to-amber-950 shadow-2xl shadow-black/50 p-2 sm:p-3">
          {/* Table felt */}
          <div className="w-full h-full rounded-[2.5rem] sm:rounded-[3.5rem] bg-gradient-to-br from-poker-felt via-green-900 to-poker-felt border-2 border-green-800/50 shadow-inner overflow-hidden relative">
            {/* Inner rail highlight */}
            <div className="absolute inset-3 sm:inset-5 rounded-[2rem] sm:rounded-[3rem] border border-green-700/30" />
            {/* Subtle center glow */}
            <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-20 bg-gradient-to-r from-transparent via-green-600/20 to-transparent" />
          </div>
        </div>

        {/* Table content */}
        <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 md:p-10 z-10">
          {/* Top player (position 0) */}
          <div className="flex justify-center w-full">
            {getPlayer(0) && (
              <PlayerSeat
                player={getPlayer(0)!}
                isActive={currentPlayerIndex === 0}
                isDealer={dealerPosition === 0}
                showCards={getPlayer(0)!.playerId === currentPlayerId}
                holeCards={getHoleCards(0)}
              />
            )}
          </div>

          {/* Center area: pot + community cards */}
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <PotDisplay amount={pot} sidePots={sidePots} />
            <CommunityCards cards={communityCards} />
          </div>

          {/* Bottom players (positions 1 and 2) */}
          <div className="flex justify-between w-full px-0 sm:px-6 md:px-12">
            {/* Bottom-left (position 1) */}
            <div className="flex justify-start">
              {getPlayer(1) && (
                <PlayerSeat
                  player={getPlayer(1)!}
                  isActive={currentPlayerIndex === 1}
                  isDealer={dealerPosition === 1}
                  showCards={getPlayer(1)!.playerId === currentPlayerId}
                  holeCards={getHoleCards(1)}
                />
              )}
            </div>

            {/* Bottom-right (position 2) */}
            <div className="flex justify-end">
              {getPlayer(2) && (
                <PlayerSeat
                  player={getPlayer(2)!}
                  isActive={currentPlayerIndex === 2}
                  isDealer={dealerPosition === 2}
                  showCards={getPlayer(2)!.playerId === currentPlayerId}
                  holeCards={getHoleCards(2)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel — wired to emit game:action via WebSocket */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
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
