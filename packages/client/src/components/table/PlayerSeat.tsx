import type { HandPlayer, Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface PlayerSeatProps {
  player: HandPlayer;
  isActive: boolean;
  isDealer: boolean;
  showCards: boolean;
  /** Hole cards to display (passed from parent for the current player) */
  holeCards?: CardType[];
  /** Last action text to display (e.g. "Check", "Call", "Raise $40", "Fold") */
  lastAction?: string;
  /** Whether this player won the last pot */
  isWinner?: boolean;
  /** Position label (BTN, SB, BB, UTG, etc.) */
  positionLabel?: string;
}

/**
 * Player seat component — ultra-compact for mobile opponents.
 * Shows small avatar, username, chip count, and face-down card placeholders.
 * Folded players are dimmed via opacity with FOLD overlay.
 * Shows bet chips prominently and last action badge.
 * Satisfies Requirements 6.1, 6.2, 6.5, 6.8.
 */
export function PlayerSeat({ player, isActive, isDealer, showCards, holeCards = [], lastAction, isWinner, positionLabel }: PlayerSeatProps) {
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
        isFolded ? 'opacity-30 grayscale' : ''
      }`}
      aria-label={`${player.username}${isActive ? ' (active)' : ''}${isFolded ? ' (folded)' : ''}${isAllIn ? ' (all-in)' : ''}`}
    >
      {/* Winner banner (Rule 234-235: "WINS $X — HAND TYPE") */}
      {isWinner && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg z-20 animate-bounce whitespace-nowrap">
          🏆 {lastAction || 'WINNER'}
        </span>
      )}

      {/* Last action badge (non-winner) */}
      {lastAction && !isWinner && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 text-white text-[8px] sm:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md z-20 whitespace-nowrap">
          {lastAction}
        </span>
      )}

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
        {/* Fold overlay on avatar */}
        {isFolded && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full text-[8px] font-black text-red-400">
            FOLD
          </span>
        )}
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

      {/* Position label (BTN, SB, BB, UTG, etc.) — Rule 83 */}
      {positionLabel && !isAllIn && (
        <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded ${
          positionLabel === 'BTN' ? 'bg-white text-gray-900' :
          positionLabel === 'SB' ? 'bg-blue-600/80 text-white' :
          positionLabel === 'BB' ? 'bg-orange-600/80 text-white' :
          'bg-gray-700/80 text-gray-300'
        }`}>
          {positionLabel}
        </span>
      )}

      {/* Bet chip indicator — gold pill with amount */}
      {typeof player.currentBet === 'number' && player.currentBet > 0 && (
        <span className="flex items-center gap-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 text-[9px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-md">
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/>
            <circle cx="6" cy="6" r="3" fill="#f59e0b"/>
          </svg>
          ${Number(player.currentBet)}
        </span>
      )}

      {/* Hole cards — face-down with overlapping tilt for opponents */}
      <div className={`flex ${isFolded ? 'animate-fold-to-muck' : ''}`}>
        {showCards && holeCards.length > 0
          ? holeCards.map((card, i) => (
              <div key={i} className={`${i === 1 ? '-ml-3' : ''} ${showCards ? 'animate-card-flip' : ''}`}>
                <Card rank={card.rank} suit={card.suit} />
              </div>
            ))
          : (
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
