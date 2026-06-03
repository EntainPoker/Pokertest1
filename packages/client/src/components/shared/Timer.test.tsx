import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timer } from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays seconds in SS format when under 60 seconds', () => {
    render(<Timer seconds={45} />);
    expect(screen.getByRole('timer')).toHaveTextContent('45s');
  });

  it('displays time in MM:SS format when 60 seconds or more', () => {
    render(<Timer seconds={125} />);
    expect(screen.getByRole('timer')).toHaveTextContent('02:05');
  });

  it('counts down every second', () => {
    render(<Timer seconds={5} />);
    expect(screen.getByRole('timer')).toHaveTextContent('05s');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('04s');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('03s');
  });

  it('calls onExpire when timer reaches 0', () => {
    const onExpire = vi.fn();
    render(<Timer seconds={2} onExpire={onExpire} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('applies red text and animate-pulse when under 10 seconds', () => {
    render(<Timer seconds={9} />);
    const timer = screen.getByRole('timer');
    expect(timer.className).toContain('text-red-500');
    expect(timer.className).toContain('animate-pulse');
  });

  it('does not apply urgency styling when 10 or more seconds remain', () => {
    render(<Timer seconds={15} />);
    const timer = screen.getByRole('timer');
    expect(timer.className).not.toContain('text-red-500');
    expect(timer.className).not.toContain('animate-pulse');
  });

  it('applies custom className', () => {
    render(<Timer seconds={30} className="text-xl" />);
    const timer = screen.getByRole('timer');
    expect(timer.className).toContain('text-xl');
  });

  it('has accessible aria-label', () => {
    render(<Timer seconds={20} />);
    expect(screen.getByLabelText('20 seconds remaining')).toBeInTheDocument();
  });
});
