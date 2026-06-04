import { useState, useCallback } from 'react';
import type { HandState, PlayerAction } from '@spin-and-go/shared';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionPanel } from './ActionPanel';
import { LastHandSummary } from '../history/LastHandSummary';
import { getSocket } from '../../services/socket';

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

  /** Emit player action via WebSocket */
  const handleAction = useCallback((action: PlayerAction) => {
    const socket = getSocket();
    socket.emit('game:action', { gameId, playerId: currentPlayerId, action });
  }, [gameId, currentPlayerId]);

  const getPlayer = (index: number) => players[index] ?? null;

  return (
    <div className="w-full max-w-4xl mx-auto aspect-[4/3] sm:aspect-[16/10] relative">
      {/* Last Hand button — fixed position top-left */}
      {gameId && (
        <button
          onClick={() => setShowLastHand(true)}
          className="absolute top-2 left-2 z-20 min-w-[44px] min-h-[44px] px-3 py-2 rounded-lg bg-gray-800/90 border border-gray-600 text-gray-200 text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors shadow-md"
          aria-label="View last hand history"
        >
          Last Hand
        </button>
      )}

      {/* Last Hand overlay */}
      {showLastHand && gameId && (
        <LastHandSummary gameId={gameId} onClose={() => setShowLastHand(false)} />
      )}
      {/* Table felt background */}
      <div className="absolute inset-0 rounded-[2rem] sm:rounded-[3rem] bg-poker-felt border-4 sm:border-8 border-poker-green shadow-2xl overflow-hidden">
        {/* Inner table border */}
        <div className="absolute inset-3 sm:inset-6 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-poker-green/50" />
      </div>

      {/* Table content */}
      <div className="relative w-full h-full flex flex-col items-center justify-between p-3 sm:p-6 md:p-8">
        {/* Top player (position 0) */}
        <div className="flex justify-center w-full">
          {getPlayer(0) && (
            <PlayerSeat
              player={getPlayer(0)!}
              isActive={currentPlayerIndex === 0}
              isDealer={dealerPosition === 0}
              showCards={getPlayer(0)!.playerId === currentPlayerId}
            />
          )}
        </div>

        {/* Center area: community cards + pot */}
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <PotDisplay amount={pot} sidePots={sidePots} />
          <CommunityCards cards={communityCards} />
        </div>

        {/* Bottom players (positions 1 and 2) */}
        <div className="flex justify-between w-full px-2 sm:px-8 md:px-16">
          {/* Bottom-left (position 1) */}
          <div className="flex justify-start">
            {getPlayer(1) && (
              <PlayerSeat
                player={getPlayer(1)!}
                isActive={currentPlayerIndex === 1}
                isDealer={dealerPosition === 1}
                showCards={getPlayer(1)!.playerId === currentPlayerId}
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
              />
            )}
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
