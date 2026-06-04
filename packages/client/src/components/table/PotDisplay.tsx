import type { SidePot } from '@spin-and-go/shared';

interface PotDisplayProps {
  amount: number;
  sidePots?: SidePot[];
}

/**
 * Pot display with gold chip icon and amount.
 * Positioned above community cards with side pot badges.
 * Satisfies Requirements 6.6.
 */
export function PotDisplay({ amount, sidePots }: PotDisplayProps) {
  if (amount === 0 && (!sidePots || sidePots.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={`Pot: $${amount}`}>
      <div className="bg-gray-900/80 border border-poker-gold/40 rounded-full px-4 py-1.5 sm:px-5 sm:py-2 shadow-lg shadow-poker-gold/10 backdrop-blur-sm">
        <span className="inline-flex items-center gap-2 text-poker-gold font-bold text-sm sm:text-lg">
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 border border-yellow-600 shadow-sm" aria-hidden="true" />
          Pot: ${amount.toLocaleString()}
        </span>
      </div>

      {sidePots && sidePots.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {sidePots.map((sidePot, i) => (
            <span
              key={i}
              className="text-[10px] sm:text-xs text-amber-300 bg-gray-900/70 border border-amber-500/30 rounded-full px-2.5 py-0.5 font-medium"
              aria-label={`Side pot ${i + 1}: $${sidePot.amount}`}
            >
              Side: ${sidePot.amount.toLocaleString()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
