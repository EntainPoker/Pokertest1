import type { Card as CardType } from '@spin-and-go/shared';

interface CardProps {
  rank?: CardType['rank'];
  suit?: CardType['suit'];
  faceDown?: boolean;
}

/** Unicode suit symbols */
const SUIT_SYMBOLS: Record<CardType['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

/** Suit color mapping: red for hearts/diamonds, black (white text on dark bg) for clubs/spades */
function getSuitColor(suit: CardType['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-100';
}

/**
 * Card component displaying a playing card with rank and suit.
 * Shows a card back pattern when faceDown is true.
 * Responsive sizing with min 44x44px touch target.
 * Satisfies Requirements 6.5, 13.2.
 */
export function Card({ rank, suit, faceDown = false }: CardProps) {
  if (faceDown || !rank || !suit) {
    return (
      <div
        className="w-10 h-14 sm:w-12 sm:h-[4.25rem] md:w-14 md:h-[4.75rem] min-w-[44px] min-h-[44px] rounded-md bg-gradient-to-br from-blue-900 to-blue-700 border border-blue-500 shadow-md flex items-center justify-center"
        aria-label="Face-down card"
        role="img"
      >
        <div className="w-6 h-8 sm:w-7 sm:h-10 rounded-sm border border-blue-400 bg-blue-800 opacity-80" />
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit];
  const colorClass = getSuitColor(suit);

  return (
    <div
      className={`w-10 h-14 sm:w-12 sm:h-[4.25rem] md:w-14 md:h-[4.75rem] min-w-[44px] min-h-[44px] rounded-md bg-white border border-gray-300 shadow-md flex flex-col items-center justify-center p-0.5 ${colorClass}`}
      aria-label={`${rank} of ${suit}`}
      role="img"
    >
      <span className="text-xs sm:text-sm md:text-base font-bold leading-none">
        {rank}
      </span>
      <span className="text-sm sm:text-lg md:text-xl leading-none">
        {suitSymbol}
      </span>
    </div>
  );
}
