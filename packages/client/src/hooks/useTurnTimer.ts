import { useEffect, useRef, useState } from 'react';

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
 * Hook for managing the turn timer countdown.
 * Counts down from the server-provided timeRemaining value.
 * Calls onExpire (auto-fold) when the timer reaches 0 and isActive is true.
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
  const isActiveRef = useRef(isActive);

  // Keep refs up to date
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Reset timer when timeRemaining changes (new turn started)
  useEffect(() => {
    if (timeRemaining > 0) {
      setSecondsLeft(timeRemaining);
      setIsExpired(false);
    }
  }, [timeRemaining]);

  // Run the countdown whenever active and not expired
  useEffect(() => {
    // Clean up any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive || isExpired || secondsLeft <= 0) {
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
          // Only fire onExpire if this player's turn
          if (isActiveRef.current) {
            onExpireRef.current();
          }
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
  }, [isActive, isExpired, timeRemaining]); // Re-trigger on timeRemaining to catch resets

  return { secondsLeft, isExpired };
}
