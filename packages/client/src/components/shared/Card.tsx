import type { Card as CardType } from '@spin-and-go/shared';

interface CardProps {
  rank?: CardType['rank'];
  suit?: CardType['suit'];
  faceDown?: boolean;
  /** Highlight this card with a golden glow (part of winning best 5) */
  highlighted?: boolean;
  /** Dim/grey out this card (losing player's hand) */
  dimmed?: boolean;
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
 * Larger sizing for PartyPoker desktop-style visuals.
 * Satisfies Requirements 6.5, 13.2.
 */
export function Card({ rank, suit, faceDown = false }: CardProps) {
  if (faceDown || !rank || !suit) {
    return (
      <div
        className="w-12 h-[4.5rem] sm:w-14 sm:h-[5.25rem] rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-950 border-2 border-gray-600/60 shadow-lg flex items-center justify-center overflow-hidden"
        aria-label="Face-down card"
        role="img"
      >
        <div className="w-full h-full relative flex items-center justify-center">
          <div className="absolute inset-1 rounded-md border border-poker-gold/40 bg-gradient-to-br from-gray-700/30 to-gray-900/30" />
          <div className="absolute inset-2 rounded-sm opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,215,0,0.15)_3px,rgba(255,215,0,0.15)_4px)]" />
          <span className="text-poker-gold text-sm sm:text-base opacity-60 z-10">♦</span>
        </div>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[suit];
  const colorClass = getSuitColor(suit);

  return (
    <div
      className={`relative w-12 h-[4.5rem] sm:w-14 sm:h-[5.25rem] rounded-lg bg-gradient-to-b from-white to-gray-50 border border-gray-300 shadow-lg flex flex-col items-start justify-start p-1 ${colorClass}`}
      aria-label={`${rank} of ${suit}`}
      role="img"
    >
      {/* Top-left rank + suit */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-sm sm:text-base font-bold">{rank}</span>
        <span className="text-xs">{suitSymbol}</span>
      </div>
      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl sm:text-2xl opacity-90">{suitSymbol}</span>
      </div>
    </div>
  );
}
