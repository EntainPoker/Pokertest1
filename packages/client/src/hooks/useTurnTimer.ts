import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTurnTimerOptions {
  /** Time remaining in seconds (from server — always 15 for a fresh turn) */
  timeRemaining: number;
  /** Callback when timer expires (auto-fold/auto-check) */
  onExpire: () => void;
  /** Whether the timer is active (it's the player's turn) */
  isActive: boolean;
  /** Increments on every new turn — forces timer reset even if timeRemaining stays 15 */
  resetKey?: number;
}

interface UseTurnTimerResult {
  /** Current seconds remaining (counts down 15, 14, 13... 0) */
  secondsLeft: number;
  /** Whether the timer has expired */
  isExpired: boolean;
}

/**
 * Turn timer that counts down from 15 to 0.
 * Resets to 15 on every new turn (detected via resetKey change).
 * Fires onExpire when it hits 0.
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

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Clear interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // When resetKey or isActive changes: reset and start/stop the countdown
  useEffect(() => {
    clearTimer();

    // Reset to full time
    setSecondsLeft(timeRemaining);
    setIsExpired(false);

    // Only start counting if it's our turn
    if (!isActive || timeRemaining <= 0) {
      return;
    }

    // Start countdown from timeRemaining
    let current = timeRemaining;

    intervalRef.current = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        setSecondsLeft(0);
        setIsExpired(true);
        clearTimer();
        onExpireRef.current();
      } else {
        setSecondsLeft(current);
      }
    }, 1000);

    return clearTimer;
  }, [isActive, resetKey, timeRemaining, clearTimer]);

  return { secondsLeft, isExpired };
}
