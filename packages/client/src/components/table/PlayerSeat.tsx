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
 * Player seat component — compact for opponents (top zone), expanded for current player (middle zone).
 * Shows circular avatar, username, chip count, active/folded state, and hole cards when visible.
 * Status indicators: green ring for active, red for folded, gold pulsing for current turn.
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
      className={`relative flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl transition-all ${
        isFolded ? 'opacity-40' : ''
      }`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Dealer button indicator */}
      {isDealer && (
        <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-gray-900 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md border-2 border-gray-300 z-10">
          D
        </span>
      )}

      {/* Avatar circle with status ring */}
      <div
        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md bg-gradient-to-br ${avatarGradient} ${
          isActive
            ? 'ring-[3px] ring-poker-gold shadow-poker-gold/50 shadow-lg animate-pulse'
            : isFolded
            ? 'ring-2 ring-red-500/50'
            : 'ring-2 ring-gray-600/50'
        } ${isAllIn ? 'ring-[3px] ring-red-500' : ''}`}
      >
        {isFolded ? (
          <span className="text-gray-300 line-through">{firstLetter}</span>
        ) : (
          firstLetter
        )}
      </div>

      {/* Username */}
      <span className="text-[10px] sm:text-xs font-semibold text-gray-100 truncate max-w-[70px] sm:max-w-[100px]">
        {player.username}
      </span>

      {/* Chip count pill */}
      <ChipStack amount={player.chipCount} />

      {/* Status badges */}
      {isFolded && (
        <span className="text-[10px] sm:text-xs text-red-400 font-semibold bg-red-400/10 rounded-full px-2 py-0.5 border border-red-400/20">Folded</span>
      )}
      {isAllIn && (
        <span className="text-[10px] sm:text-xs text-amber-300 font-semibold bg-amber-400/10 rounded-full px-2 py-0.5 border border-amber-400/30 animate-pulse">All-In</span>
      )}

      {/* Current bet shown toward center */}
      {typeof player.currentBet === 'number' && player.currentBet > 0 && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-poker-gold font-bold bg-gray-900/90 rounded-full px-2 py-0.5 border border-poker-gold/30 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-poker-gold to-amber-600" aria-hidden="true" />
            ${Number(player.currentBet)}
          </span>
        </div>
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
