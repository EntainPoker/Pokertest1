import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTurnTimer } from './useTurnTimer';

describe('useTurnTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with the provided timeRemaining', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useTurnTimer({ timeRemaining: 30, onExpire, isActive: true })
    );

    expect(result.current.secondsLeft).toBe(30);
    expect(result.current.isExpired).toBe(false);
  });

  it('counts down when active', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useTurnTimer({ timeRemaining: 30, onExpire, isActive: true })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsLeft).toBe(25);
  });

  it('calls onExpire when timer reaches 0', () => {
    const onExpire = vi.fn();
    renderHook(() =>
      useTurnTimer({ timeRemaining: 3, onExpire, isActive: true })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('sets isExpired to true when timer reaches 0', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useTurnTimer({ timeRemaining: 2, onExpire, isActive: true })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.secondsLeft).toBe(0);
  });

  it('does not count down when inactive', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useTurnTimer({ timeRemaining: 30, onExpire, isActive: false })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.secondsLeft).toBe(30);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('resets when timeRemaining changes', () => {
    const onExpire = vi.fn();
    const { result, rerender } = renderHook(
      ({ timeRemaining }) =>
        useTurnTimer({ timeRemaining, onExpire, isActive: true }),
      { initialProps: { timeRemaining: 30 } }
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.secondsLeft).toBe(20);

    // Simulate new turn with fresh timer
    rerender({ timeRemaining: 30 });
    expect(result.current.secondsLeft).toBe(30);
    expect(result.current.isExpired).toBe(false);
  });
});
