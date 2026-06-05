import type { Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface CommunityCardsProps {
  cards: CardType[];
}

/**
 * Community cards display showing 0-5 cards in a compact row.
 * Cards are revealed progressively: flop (3), turn (4), river (5).
 * Larger cards with proper spacing for PartyPoker desktop style.
 * Satisfies Requirements 6.3.
 */
export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always show 5 card slots, with empty/face-down for undealt positions
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" aria-label="Community cards">
      {slots.map((card, i) => (
        <div key={i} className="flex-shrink-0">
          {card ? (
            <Card rank={card.rank} suit={card.suit} />
          ) : (
            <div className="w-12 h-[4.5rem] sm:w-14 sm:h-[5.25rem] rounded-lg border-2 border-green-700/40 bg-green-800/20 shadow-inner" aria-label="Empty card slot" />
          )}
        </div>
      ))}
    </div>
  );
}
