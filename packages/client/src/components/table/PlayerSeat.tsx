import type { HandPlayer, Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface PlayerSeatProps {
  player: HandPlayer;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
  /** Hole cards to display (passed from parent for the current player) */
  holeCards?: CardType[];
}

/**
 * Player seat component — ultra-compact for mobile opponents.
 * Shows small avatar, username, chip count, and face-down card placeholders.
 * Folded players are dimmed via opacity.
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
      className={`relative flex flex-col items-center gap-0.5 p-1 rounded-lg transition-opacity ${
        isFolded ? 'opacity-40' : ''
      }`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Dealer button indicator */}
      {isDealer && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white text-gray-900 text-[6px] font-black flex items-center justify-center shadow-sm border border-gray-300 z-10">
          D
        </span>
      )}

      {/* Avatar circle with status ring */}
      <div
        className={`relative w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-md bg-gradient-to-br ${avatarGradient} ${
          isActive
            ? 'ring-2 ring-poker-gold animate-pulse'
            : isFolded
            ? 'ring-1 ring-red-500/50'
            : 'ring-1 ring-gray-600/50'
        } ${isAllIn ? 'ring-2 ring-red-500' : ''}`}
      >
        {firstLetter}
      </div>

      {/* Username */}
      <span className="text-[8px] font-medium text-gray-200 truncate max-w-[50px]">
        {player.username}
      </span>

      {/* Chip count */}
      <span className="text-[8px] text-poker-gold font-bold">
        ${player.chipCount}
      </span>

      {/* All-In badge */}
      {isAllIn && (
        <span className="text-[7px] text-amber-300 font-bold">ALL-IN</span>
      )}

      {/* Folded text — minimal */}
      {isFolded && (
        <span className="text-[7px] text-red-400 font-medium">Folded</span>
      )}

      {/* Current bet */}
      {typeof player.currentBet === 'number' && player.currentBet > 0 && (
        <span className="text-[8px] text-poker-gold/80">${Number(player.currentBet)}</span>
      )}

      {/* Hole cards — tiny face-down placeholders or face-up */}
      <div className="flex gap-0.5 [&>div]:w-5 [&>div]:h-7">
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
