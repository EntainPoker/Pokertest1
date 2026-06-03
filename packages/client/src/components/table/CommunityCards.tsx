import type { Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface CommunityCardsProps {
  cards: CardType[];
}

/**
 * Community cards display showing 0-5 cards in a row in the center of the table.
 * Cards are revealed progressively: flop (3), turn (4), river (5).
 * Satisfies Requirements 6.3.
 */
export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always show 5 card slots, with empty/face-down for undealt positions
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2" aria-label="Community cards">
      {slots.map((card, i) => (
        <div key={i} className="flex-shrink-0">
          {card ? (
            <Card rank={card.rank} suit={card.suit} />
          ) : (
            <div className="w-10 h-14 sm:w-12 sm:h-[4.25rem] md:w-14 md:h-[4.75rem] min-w-[44px] min-h-[44px] rounded-md border border-gray-600/50 bg-poker-green/30" aria-label="Empty card slot" />
          )}
        </div>
      ))}
    </div>
  );
}
