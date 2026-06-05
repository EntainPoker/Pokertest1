import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTurnTimerOptions {
  /** Time remaining in seconds (from server — always 15 for a fresh turn) */
  timeRemaining: number;
  /** Callback when timer expires (auto-fold/auto-check) */
  onExpire: () => void;
  /** Whether the timer is active (it's the player's turn) */
  isActive: boolean;
  /** Increments on every new turn — forces timer reset */
  resetKey?: number;
}

interface UseTurnTimerResult {
  /** Current seconds remaining (counts down 15, 14, 13... 0) */
  secondsLeft: number;
  /** Whether the timer has expired */
  isExpired: boolean;
}

/**
 * Turn timer that counts down from timeRemaining (15) to 0.
 * ALWAYS starts fresh when:
 * - Component mounts (isActive becomes true)
 * - resetKey changes
 * - timeRemaining changes
 *
 * Uses a ref-based interval to avoid React state dependency issues.
 */
export function useTurnTimer({
  timeRemaining,
  onExpire,
  isActive,
  resetKey = 0,
}: UseTurnTimerOptions): UseTurnTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(timeRemaining > 0 ? timeRemaining : 15);
  const [isExpired, setIsExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const durationRef = useRef<number>((timeRemaining > 0 ? timeRemaining : 15) * 1000);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/restart timer whenever isActive, resetKey, or timeRemaining changes
  useEffect(() => {
    clearTimer();

    const duration = timeRemaining > 0 ? timeRemaining : 15;
    setSecondsLeft(duration);
    setIsExpired(false);

    if (!isActive || duration <= 0) {
      return;
    }

    // Record start time for accurate countdown
    startTimeRef.current = Date.now();
    durationRef.current = duration * 1000;

    // Use time-based countdown (not just interval counting) for accuracy
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.ceil((durationRef.current - elapsed) / 1000);

      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsExpired(true);
        clearTimer();
        onExpireRef.current();
      } else {
        setSecondsLeft(remaining);
      }
    }, 250); // Check 4x per second for smooth updates

    return clearTimer;
  }, [isActive, resetKey, timeRemaining, clearTimer]);

  return { secondsLeft, isExpired };
}
