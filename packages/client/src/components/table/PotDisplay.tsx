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
    <div className="flex flex-col items-center gap-0.5" aria-label={`Pot: $${safeAmount}`}>
      <div className="bg-gray-900/80 border border-poker-gold/40 rounded-full px-3 py-0.5 shadow-md">
        <span className="inline-flex items-center gap-1 text-poker-gold font-bold text-xs">
          <span className="w-3 h-3 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 border border-yellow-600 shadow-sm" aria-hidden="true" />
          Pot: ${safeAmount.toLocaleString()}
        </span>
      </div>

      {sidePots && sidePots.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center">
          {sidePots.map((sidePot, i) => {
            const sideAmount = typeof sidePot.amount === 'number' && !isNaN(sidePot.amount) ? sidePot.amount : 0;
            return (
              <span
                key={i}
                className="text-[8px] text-amber-300 bg-gray-900/70 border border-amber-500/30 rounded-full px-1.5 py-0.5 font-medium"
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
