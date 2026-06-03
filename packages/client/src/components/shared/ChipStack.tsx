interface ChipStackProps {
  amount: number;
}

/**
 * Chip stack display showing a chip count with $ prefix.
 * Satisfies Requirements 6.2, 6.6.
 */
export function ChipStack({ amount }: ChipStackProps) {
  return (
    <span className="inline-flex items-center gap-1 text-poker-gold font-semibold text-xs sm:text-sm">
      <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-poker-gold border border-yellow-600 flex-shrink-0" aria-hidden="true" />
      <span>${amount.toLocaleString()}</span>
    </span>
  );
}
