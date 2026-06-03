import type { BlindLevel } from '@spin-and-go/shared';
import { Timer } from '../shared/Timer';

interface BlindTimerProps {
  /** Current blind level */
  currentLevel: BlindLevel;
  /** Next blind level (null if at final level) */
  nextLevel: BlindLevel | null;
  /** Seconds remaining until next blind level */
  timeRemaining: number;
}

/**
 * Blind level display showing current level, blind amounts,
 * and countdown to the next level increase.
 * Satisfies Requirements 6.4, 9.3.
 */
export function BlindTimer({ currentLevel, nextLevel, timeRemaining }: BlindTimerProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 sm:px-4 sm:py-2 bg-poker-dark/90 rounded-lg border border-gray-600 min-w-[140px] sm:min-w-[180px]">
      {/* Current level */}
      <div className="text-center">
        <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">
          Level {currentLevel.level}
        </span>
        <div className="text-sm sm:text-base font-bold text-gray-100">
          {currentLevel.smallBlind}/{currentLevel.bigBlind}
        </div>
      </div>

      {/* Timer countdown */}
      <div className="flex items-center gap-1">
        <svg
          className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <Timer seconds={timeRemaining} className="text-sm sm:text-base" />
      </div>

      {/* Next level preview */}
      {nextLevel && (
        <div className="text-[10px] sm:text-xs text-gray-400 text-center">
          Next: {nextLevel.smallBlind}/{nextLevel.bigBlind}
        </div>
      )}
      {!nextLevel && (
        <div className="text-[10px] sm:text-xs text-yellow-400 text-center">
          Final Level
        </div>
      )}
    </div>
  );
}
