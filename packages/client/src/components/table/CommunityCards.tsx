import { useRef, useEffect, useState } from 'react';
import type { Card as CardType } from '@spin-and-go/shared';
import { Card } from '../shared/Card';

interface CommunityCardsProps {
  cards: CardType[];
  /** Indices of cards that are part of the winning best 5 (highlighted with golden glow) */
  highlightedIndices?: Set<number>;
}

/**
 * Community cards display showing 0-5 cards with deal animations.
 * Cards are revealed progressively: flop (3), turn (4), river (5).
 * New cards animate in with slide-in effect (Rule 249-251).
 * Supports highlighting winning cards at showdown.
 * Satisfies Requirements 6.3.
 */
export function CommunityCards({ cards, highlightedIndices }: CommunityCardsProps) {
  const [animatingIndices, setAnimatingIndices] = useState<Set<number>>(new Set());
  const prevCountRef = useRef(0);

  // Detect newly dealt cards and trigger animation
  useEffect(() => {
    const prevCount = prevCountRef.current;
    const newCount = cards.length;

    if (newCount > prevCount) {
      // New cards were dealt — animate them
      const newIndices = new Set<number>();
      for (let i = prevCount; i < newCount; i++) {
        newIndices.add(i);
      }
      setAnimatingIndices(newIndices);

      // Clear animation class after animation completes
      const timer = setTimeout(() => {
        setAnimatingIndices(new Set());
      }, 500);

      prevCountRef.current = newCount;
      return () => clearTimeout(timer);
    }

    prevCountRef.current = newCount;
  }, [cards.length]);

  // Always show 5 card slots
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" aria-label="Community cards">
      {slots.map((card, i) => (
        <div
          key={i}
          className={`flex-shrink-0 ${animatingIndices.has(i) ? 'animate-slide-in' : ''}`}
          style={animatingIndices.has(i) ? { animationDelay: `${(i - Math.min(...animatingIndices)) * 100}ms` } : undefined}
        >
          {card ? (
            <Card rank={card.rank} suit={card.suit} highlighted={highlightedIndices?.has(i)} />
          ) : (
            <div className="w-12 h-[4.5rem] sm:w-14 sm:h-[5.25rem] rounded-lg border-2 border-green-700/40 bg-green-800/20 shadow-inner" aria-label="Empty card slot" />
          )}
        </div>
      ))}
    </div>
  );
}
