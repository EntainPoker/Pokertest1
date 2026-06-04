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
  const firstLetter = player.username.charAt(0).toUpperCase();

  // Generate a consistent color from the username
  const avatarColors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-rose-500 to-rose-700',
    'from-amber-500 to-amber-700',
    'from-cyan-500 to-cyan-700',
  ];
  const colorIndex = player.username.charCodeAt(0) % avatarColors.length;
  const avatarGradient = avatarColors[colorIndex];

  return (
    <div
      className={`relative flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-2xl transition-all min-w-[100px] sm:min-w-[130px] ${
        isFolded ? 'opacity-40' : ''
      }`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Dealer button indicator */}
      {isDealer && (
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-gray-900 text-[10px] font-black flex items-center justify-center shadow-md border-2 border-gray-300 z-10">
          D
        </span>
      )}

      {/* Avatar circle */}
      <div
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg bg-gradient-to-br ${avatarGradient} ${
          isActive
            ? 'ring-[3px] ring-poker-gold shadow-poker-gold/40 shadow-xl'
            : 'ring-2 ring-gray-600/50'
        } ${isAllIn ? 'ring-[3px] ring-red-500 animate-pulse' : ''}`}
      >
        {isFolded ? (
          <span className="text-gray-300 line-through">{firstLetter}</span>
        ) : (
          firstLetter
        )}
      </div>

      {/* Username */}
      <span className="text-xs sm:text-sm font-semibold text-gray-100 truncate max-w-[90px] sm:max-w-[120px]">
        {player.username}
      </span>

      {/* Chip count pill */}
      <ChipStack amount={player.chipCount} />

      {/* Status badges */}
      {isFolded && (
        <span className="text-[10px] sm:text-xs text-red-400 font-semibold bg-red-400/10 rounded-full px-2 py-0.5">Folded</span>
      )}
      {isAllIn && (
        <span className="text-[10px] sm:text-xs text-amber-300 font-semibold bg-amber-400/10 rounded-full px-2 py-0.5 animate-pulse">All-In</span>
      )}

      {/* Current bet shown toward center */}
      {player.currentBet > 0 && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-poker-gold font-bold bg-gray-900/80 rounded-full px-2 py-0.5 border border-poker-gold/30">
            <span className="w-2 h-2 rounded-full bg-poker-gold" aria-hidden="true" />
            ${player.currentBet}
          </span>
        </div>
      )}

      {/* Hole cards */}
      <div className="flex gap-0.5 sm:gap-1 mt-2">
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
