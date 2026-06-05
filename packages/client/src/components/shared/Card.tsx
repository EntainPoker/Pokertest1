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
 * Mobile-first compact sizing (w-8 h-11 default).
 * Satisfies Requirements 6.5, 13.2.
 */
export function Card({ rank, suit, faceDown = false }: CardProps) {
  if (faceDown || !rank || !suit) {
    return (
      <div
        className="w-8 h-11 rounded-md bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 border border-gray-600/50 shadow-md flex items-center justify-center overflow-hidden"
        aria-label="Face-down card"
        role="img"
      >
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-0.5 rounded-sm border border-poker-gold/30" />
          <span className="text-poker-gold text-[8px] opacity-50">♦</span>
        </div>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit];
  const colorClass = getSuitColor(suit);

  return (
    <div
      className={`relative w-8 h-11 rounded-md bg-white border border-gray-200 shadow-md flex flex-col items-start justify-start p-0.5 ${colorClass}`}
      aria-label={`${rank} of ${suit}`}
      role="img"
    >
      {/* Top-left rank + suit */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-[9px] font-bold">{rank}</span>
        <span className="text-[10px]">{suitSymbol}</span>
      </div>
      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm opacity-90">{suitSymbol}</span>
      </div>
    </div>
  );
}
