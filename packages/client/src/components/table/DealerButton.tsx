interface DealerButtonProps {
  position: number;
}

/**
 * Dealer button indicator — a small "D" button shown at the current dealer's position.
 * This component is used standalone when the dealer indicator needs to be placed
 * independently of the PlayerSeat component.
 * Satisfies Requirements 6.7.
 */
export function DealerButton({ position }: DealerButtonProps) {
  return (
    <div
      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-poker-dark text-xs sm:text-sm font-bold flex items-center justify-center border-2 border-gray-300 shadow-md"
      aria-label={`Dealer button at position ${position}`}
      role="img"
    >
      D
    </div>
  );
}
