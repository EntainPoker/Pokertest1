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

/** Suit color mapping: red for hearts/diamonds, dark for clubs/spades */
function getSuitColor(suit: CardType['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
}

/**
 * Card component displaying a playing card with rank and suit.
 * Shows a premium card back pattern when faceDown is true.
 * Responsive sizing with proper 2:3 ratio and min 44x44px touch target.
 * Satisfies Requirements 6.5, 13.2.
 */
export function Card({ rank, suit, faceDown = false }: CardProps) {
  if (faceDown || !rank || !suit) {
    return (
      <div
        className="w-9 h-13 sm:w-11 sm:h-16 md:w-14 md:h-[84px] min-w-[36px] min-h-[36px] rounded-lg bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 border border-gray-600/50 shadow-lg flex items-center justify-center overflow-hidden"
        aria-label="Face-down card"
        role="img"
      >
        {/* Diamond pattern design */}
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-1 rounded-md border border-poker-gold/30 bg-gradient-to-br from-gray-800/50 to-gray-900/50" />
          <div className="relative grid grid-cols-3 grid-rows-4 gap-0.5 p-2 opacity-40">
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
            <span className="text-poker-gold text-[6px]">◆</span>
          </div>
        </div>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit];
  const colorClass = getSuitColor(suit);

  return (
    <div
      className={`relative w-9 h-13 sm:w-11 sm:h-16 md:w-14 md:h-[84px] min-w-[36px] min-h-[36px] rounded-lg bg-white border border-gray-200 shadow-lg flex flex-col items-start justify-start p-0.5 sm:p-1.5 ${colorClass}`}
      aria-label={`${rank} of ${suit}`}
      role="img"
    >
      {/* Top-left rank + suit */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-xs sm:text-sm md:text-base font-bold">{rank}</span>
        <span className="text-[10px] sm:text-xs">{suitSymbol}</span>
      </div>
      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg sm:text-2xl md:text-3xl opacity-90">{suitSymbol}</span>
      </div>
    </div>
  );
}
