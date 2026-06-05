import { useEffect, useRef, useState } from 'react';

interface UseTurnTimerOptions {
  /** Time remaining in seconds (from server) */
  timeRemaining: number;
  /** Callback when timer expires (auto-fold/auto-check) */
  onExpire: () => void;
  /** Whether the timer is active (it's the player's turn) */
  isActive: boolean;
  /** Increments on every new turn — forces timer reset even if timeRemaining stays 15 */
  resetKey?: number;
}

interface UseTurnTimerResult {
  /** Current seconds remaining */
  secondsLeft: number;
  /** Whether the timer has expired */
  isExpired: boolean;
}

/**
 * Hook for managing the turn timer countdown.
 * CRITICAL: Timer resets to full 15s on EVERY new turn.
 * Uses resetKey to detect new turns even when timeRemaining stays at 15.
 */
export function useTurnTimer({
  timeRemaining,
  onExpire,
  isActive,
  resetKey = 0,
}: UseTurnTimerOptions): UseTurnTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(timeRemaining);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep onExpire ref up to date
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // RESET timer whenever resetKey changes (new turn) or timeRemaining changes
  useEffect(() => {
    setSecondsLeft(timeRemaining);
    setIsExpired(false);
    // Clear any running interval so the countdown effect restarts fresh
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [resetKey, timeRemaining]);

  // Run the countdown
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
  }, [isActive, isExpired, secondsLeft]);

  return { secondsLeft, isExpired };
}
