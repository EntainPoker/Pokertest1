import type { SidePot } from '@spin-and-go/shared';

interface PotDisplayProps {
  amount: number;
  sidePots?: SidePot[];
}

/**
 * Compact pot display with gold chip icon and amount.
 * Positioned above community cards.
 * Satisfies Requirements 6.6.
 */
export function PotDisplay({ amount, sidePots }: PotDisplayProps) {
  // Ensure amount is always a safe number for rendering
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

  if (safeAmount === 0 && (!sidePots || sidePots.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`Pot: $${safeAmount}`}>
      <div className="bg-gray-900/85 border border-poker-gold/50 rounded-full px-4 py-1 shadow-lg backdrop-blur-sm">
        <span className="inline-flex items-center gap-1.5 text-poker-gold font-bold text-sm sm:text-base">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 border border-yellow-600 shadow-md flex items-center justify-center text-[8px] sm:text-[10px]" aria-hidden="true">🪙</span>
          Total Pot: ${safeAmount.toLocaleString()}
        </span>
      </div>

      {sidePots && sidePots.length > 0 && (
        <div className="flex gap-1.5 flex-wrap justify-center">
          {sidePots.map((sidePot, i) => {
            const sideAmount = typeof sidePot.amount === 'number' && !isNaN(sidePot.amount) ? sidePot.amount : 0;
            return (
              <span
                key={i}
                className="text-[9px] sm:text-xs text-amber-300 bg-gray-900/70 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium"
                aria-label={`Side pot ${i + 1}: $${sideAmount}`}
              >
                Side: ${sideAmount.toLocaleString()}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
