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
 * CRITICAL: Timer resets to full 15s on EVERY new turn.
 * Uses isActive transitions to detect turn changes (even if timeRemaining stays at 15).
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
  const prevIsActiveRef = useRef(isActive);
  const prevTimeRef = useRef(timeRemaining);

  // Keep onExpire ref up to date
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Detect turn change: either isActive changed to true, or timeRemaining value changed
  // This handles the case where timeRemaining goes 15→15 (same value) but it's a new turn
  useEffect(() => {
    const wasActive = prevIsActiveRef.current;
    const prevTime = prevTimeRef.current;
    prevIsActiveRef.current = isActive;
    prevTimeRef.current = timeRemaining;

    // Reset if:
    // 1. isActive just became true (new turn for this player)
    // 2. timeRemaining changed to a higher value (server sent fresh timer)
    // 3. isActive is true and timeRemaining > secondsLeft (server reset)
    const justBecameActive = isActive && !wasActive;
    const timeReset = timeRemaining !== prevTime && timeRemaining > 0;
    
    if (justBecameActive || timeReset) {
      setSecondsLeft(timeRemaining);
      setIsExpired(false);
    }
  }, [isActive, timeRemaining]);

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
