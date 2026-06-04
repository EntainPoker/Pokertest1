import type { HandPlayer, Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';
import { ChipStack } from '../shared/ChipStack';

interface PlayerSeatProps {
  player: HandPlayer;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
  /** Hole cards to display (passed from parent for the current player) */
  holeCards?: CardType[];
}

/**
 * Player seat component showing username, chip count, current bet,
 * active/folded state, and hole cards when visible.
 * Highlights the active player whose turn it is.
 * Satisfies Requirements 6.1, 6.2, 6.5, 6.8.
 */
export function PlayerSeat({ player, isActive, isDealer, showCards, holeCards = [] }: PlayerSeatProps) {
  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all_in';

  return (
    <div
      className={`relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-lg transition-all min-w-[90px] sm:min-w-[120px] ${
        isActive
          ? 'bg-poker-gold/20 border-2 border-poker-gold shadow-lg shadow-poker-gold/30'
          : 'bg-poker-dark/80 border border-gray-600'
      } ${isFolded ? 'opacity-50' : ''}`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Dealer button indicator */}
      {isDealer && (
        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-poker-dark text-xs font-bold flex items-center justify-center border border-gray-300 shadow-sm">
          D
        </span>
      )}

      {/* Username */}
      <span className="text-xs sm:text-sm font-medium text-gray-100 truncate max-w-[80px] sm:max-w-[110px]">
        {player.username}
      </span>

      {/* Chip count */}
      <ChipStack amount={player.chipCount} />

      {/* Status badge */}
      {isFolded && (
        <span className="text-[10px] sm:text-xs text-red-400 font-medium">Folded</span>
      )}
      {isAllIn && (
        <span className="text-[10px] sm:text-xs text-yellow-300 font-medium">All-In</span>
      )}

      {/* Current bet */}
      {player.currentBet > 0 && (
        <span className="text-[10px] sm:text-xs text-gray-300">
          Bet: ${player.currentBet}
        </span>
      )}

      {/* Hole cards */}
      <div className="flex gap-0.5 mt-1">
        {showCards && holeCards.length > 0
          ? holeCards.map((card, i) => (
              <Card key={i} rank={card.rank} suit={card.suit} />
            ))
          : !isFolded && (
              <>
                <Card faceDown />
                <Card faceDown />
              </>
            )}
      </div>
    </div>
  );
}
