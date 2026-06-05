import { useEffect, useRef, useState } from 'react';
import type { SidePot } from '@spin-and-go/shared';

interface PotDisplayProps {
  amount: number;
  sidePots?: SidePot[];
}

/**
 * Pot display with animated number tween (Rule 156).
 * Pot value animates smoothly — never instantly jumps.
 * Positioned above community cards.
 * Satisfies Requirements 6.6.
 */
export function PotDisplay({ amount, sidePots }: PotDisplayProps) {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const [displayAmount, setDisplayAmount] = useState(safeAmount);
  const animationRef = useRef<number | null>(null);
  const prevAmountRef = useRef(safeAmount);

  // Animate pot value changes (Rule 156: pot growth must visually animate)
  useEffect(() => {
    const from = prevAmountRef.current;
    const to = safeAmount;
    prevAmountRef.current = to;

    if (from === to) return;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const duration = 400; // ms
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplayAmount(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [safeAmount]);

  if (displayAmount === 0 && safeAmount === 0 && (!sidePots || sidePots.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`Pot: $${safeAmount}`}>
      <div className={`bg-gray-900/85 border border-poker-gold/50 rounded-full px-4 py-1 shadow-lg backdrop-blur-sm transition-transform ${
        safeAmount > prevAmountRef.current ? 'scale-105' : ''
      }`}>
        <span className="inline-flex items-center gap-1.5 text-poker-gold font-bold text-sm sm:text-base tabular-nums">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 border border-yellow-600 shadow-md flex items-center justify-center text-[8px] sm:text-[10px]" aria-hidden="true">🪙</span>
          Pot: ${displayAmount.toLocaleString()}
        </span>
      </div>

      {sidePots && sidePots.length > 1 && (
        <div className="flex gap-1.5 flex-wrap justify-center">
          {sidePots.map((sidePot, i) => {
            const sideAmount = typeof sidePot.amount === 'number' && !isNaN(sidePot.amount) ? sidePot.amount : 0;
            if (sideAmount <= 0) return null;
            return (
              <span
                key={i}
                className="text-[9px] sm:text-xs text-amber-300 bg-gray-900/70 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium"
                aria-label={`Side pot ${i + 1}: $${sideAmount}`}
              >
                Side Pot {i + 1}: ${sideAmount.toLocaleString()}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
