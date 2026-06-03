import { useEffect, useRef, useState } from 'react';

interface TimerProps {
  /** Total seconds to count down from */
  seconds: number;
  /** Callback when timer reaches 0 */
  onExpire?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable countdown timer component.
 * Displays time in MM:SS format (or just SS when under 60 seconds).
 * Shows visual urgency (red text) when less than 10 seconds remain.
 * Satisfies Requirements 6.4, 7.8, 9.3.
 */
export function Timer({ seconds, onExpire, className = '' }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reset when seconds prop changes
  useEffect(() => {
    setRemaining(seconds);
    hasFiredRef.current = false;
  }, [seconds]);

  // Manage the countdown interval
  useEffect(() => {
    if (seconds <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  // Fire onExpire when remaining hits 0
  useEffect(() => {
    if (remaining === 0 && seconds > 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onExpireRef.current?.();
    }
  }, [remaining, seconds]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining < 10 && remaining > 0;

  const display =
    minutes > 0
      ? `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(secs).padStart(2, '0')}s`;

  return (
    <span
      className={`font-mono font-bold tabular-nums ${
        isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-100'
      } ${className}`}
      role="timer"
      aria-label={`${remaining} seconds remaining`}
    >
      {display}
    </span>
  );
}
