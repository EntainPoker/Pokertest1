import { useEffect, useRef, useState } from 'react';

interface UseTurnTimerOptions {
  /** Time to count down from (always 15) */
  timeRemaining: number;
  /** Callback when timer hits 0 */
  onExpire: () => void;
  /** Whether timer should be running */
  isActive: boolean;
  /** Increment to force restart (unused — kept for API compat) */
  resetKey?: number;
}

interface UseTurnTimerResult {
  secondsLeft: number;
  isExpired: boolean;
}

/**
 * Simple countdown timer. Starts immediately on mount.
 * Since ActionPanel only mounts when it's your turn,
 * this always starts fresh at 15 on every mount.
 */
export function useTurnTimer({
  timeRemaining,
  onExpire,
}: UseTurnTimerOptions): UseTurnTimerResult {
  const duration = timeRemaining > 0 ? timeRemaining : 15;
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Single effect: start counting down on mount, clean up on unmount
  useEffect(() => {
    expiredRef.current = false;
    setSecondsLeft(duration);

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.ceil((endTime - now) / 1000);

      if (remaining <= 0) {
        setSecondsLeft(0);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
        return;
      }

      setSecondsLeft(remaining);
      timerId = window.setTimeout(tick, 250);
    };

    let timerId = window.setTimeout(tick, 250);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []); // Empty deps — only runs on mount/unmount

  return { secondsLeft, isExpired: secondsLeft <= 0 };
}
