import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTurnTimerOptions {
  /** Time remaining in seconds (from server) */
  timeRemaining: number;
  /** Callback when timer expires (auto-fold) */
  onExpire: () => void;
  /** Whether the timer is active (it's the player's turn) */
  isActive: boolean;
}

interface UseTurnTimerResult {
  /** Current seconds remaining */
  secondsLeft: number;
  /** Whether the timer has expired */
  isExpired: boolean;
}

/**
 * Hook for managing the 30-second turn timer.
 * Counts down from the server-provided timeRemaining value.
 * Calls onExpire (auto-fold) when the timer reaches 0.
 * Satisfies Requirements 7.8, 7.9.
 */
export function useTurnTimer({
  timeRemaining,
  onExpire,
  isActive,
}: UseTurnTimerOptions): UseTurnTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(timeRemaining);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep onExpire ref up to date without triggering re-renders
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset timer when timeRemaining changes (new turn)
  useEffect(() => {
    setSecondsLeft(timeRemaining);
    setIsExpired(false);
  }, [timeRemaining]);

  // Run the countdown
  useEffect(() => {
    if (!isActive || isExpired) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isExpired]);

  return { secondsLeft, isExpired };
}
