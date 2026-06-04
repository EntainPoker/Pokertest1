interface ChipStackProps {
  amount: number;
}

/**
 * Chip stack display showing a chip count with gold coin icon.
 * Satisfies Requirements 6.2, 6.6.
 */
export function ChipStack({ amount }: ChipStackProps) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-gray-900/80 border border-poker-gold/30 rounded-full px-2.5 py-1 text-poker-gold font-bold text-xs sm:text-sm shadow-sm">
      <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-br from-poker-gold to-amber-600 border border-yellow-600 flex-shrink-0 shadow-sm" aria-hidden="true" />
      <span>${amount.toLocaleString()}</span>
    </span>
  );
}
