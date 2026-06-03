import type { SidePot } from '@spin-and-go/shared';

interface PotDisplayProps {
  amount: number;
  sidePots?: SidePot[];
}

/**
 * Pot display showing the current pot amount in the center of the table.
 * Also shows side pots when present.
 * Satisfies Requirements 6.6.
 */
export function PotDisplay({ amount, sidePots }: PotDisplayProps) {
  if (amount === 0 && (!sidePots || sidePots.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`Pot: $${amount}`}>
      <div className="bg-poker-dark/70 border border-poker-gold/50 rounded-full px-3 py-1 sm:px-4 sm:py-1.5">
        <span className="text-poker-gold font-bold text-sm sm:text-base">
          Pot: ${amount.toLocaleString()}
        </span>
      </div>

      {sidePots && sidePots.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {sidePots.map((sidePot, i) => (
            <span
              key={i}
              className="text-[10px] sm:text-xs text-gray-300 bg-poker-dark/50 rounded-full px-2 py-0.5"
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
