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
      className={`relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-opacity ${
        isFolded ? 'opacity-40' : ''
      }`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Dealer button indicator */}
      {isDealer && (
        <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white text-gray-900 text-[7px] sm:text-[8px] font-black flex items-center justify-center shadow-md border border-gray-300 z-10">
          D
        </span>
      )}

      {/* Avatar circle with status ring */}
      <div
        className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg bg-gradient-to-br ${avatarGradient} ${
          isActive
            ? 'ring-2 ring-poker-gold animate-pulse'
            : isFolded
            ? 'ring-1 ring-red-500/50'
            : 'ring-2 ring-gray-600/50'
        } ${isAllIn ? 'ring-2 ring-red-500' : ''}`}
      >
        {firstLetter}
      </div>

      {/* Name badge — dark background like PartyPoker */}
      <div className="bg-gray-900/90 border border-gray-700 rounded px-2 py-0.5 mt-0.5 shadow-md">
        <span className="text-xs sm:text-sm font-medium text-gray-100 truncate max-w-[60px] block text-center">
          {player.username}
        </span>
        <span className="text-xs sm:text-sm text-poker-gold font-bold block text-center">
          ${player.chipCount}
        </span>
      </div>

      {/* All-In badge */}
      {isAllIn && (
        <span className="text-[9px] sm:text-[10px] text-amber-300 font-bold bg-red-900/60 px-1.5 py-0.5 rounded">ALL-IN</span>
      )}

      {/* Folded text — minimal */}
      {isFolded && (
        <span className="text-[9px] sm:text-[10px] text-red-400 font-medium">Folded</span>
      )}

      {/* Current bet */}
      {typeof player.currentBet === 'number' && player.currentBet > 0 && (
        <span className="text-[9px] sm:text-xs text-poker-gold/80">${Number(player.currentBet)}</span>
      )}

      {/* Hole cards — face-down with overlapping tilt for opponents */}
      <div className="flex">
        {showCards && holeCards.length > 0
          ? holeCards.map((card, i) => (
              <div key={i} className={i === 1 ? '-ml-3' : ''}>
                <Card rank={card.rank} suit={card.suit} />
              </div>
            ))
          : !isFolded && (
              <>
                <div className="-rotate-6">
                  <Card faceDown />
                </div>
                <div className="-ml-3 rotate-6">
                  <Card faceDown />
                </div>
              </>
            )}
      </div>
    </div>
  );
}
