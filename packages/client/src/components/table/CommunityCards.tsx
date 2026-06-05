import type { Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface CommunityCardsProps {
  cards: CardType[];
}

/**
 * Community cards display showing 0-5 cards in a compact row.
 * Cards are revealed progressively: flop (3), turn (4), river (5).
 * Mobile-first sizing with w-8 h-11 cards and tight gaps.
 * Satisfies Requirements 6.3.
 */
export function CommunityCards({ cards }: CommunityCardsProps) {
  // Always show 5 card slots, with empty/face-down for undealt positions
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-1" aria-label="Community cards">
      {slots.map((card, i) => (
        <div key={i} className="flex-shrink-0">
          {card ? (
            <Card rank={card.rank} suit={card.suit} />
          ) : (
            <div className="w-8 h-11 rounded-md border border-green-700/40 bg-green-900/30 shadow-inner" aria-label="Empty card slot" />
          )}
        </div>
      ))}
    </div>
  );
}
