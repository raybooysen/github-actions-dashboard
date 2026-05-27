// src/components/ElapsedTimer.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ElapsedTimer } from './ElapsedTimer';

describe('ElapsedTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders elapsed time in a <time> element with datetime attribute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T10:02:30Z'));

    const startedAt = '2026-04-18T10:00:00Z';
    render(<ElapsedTimer startedAt={startedAt} />);

    const timeElement = screen.getByTestId('elapsed-timer');
    expect(timeElement.tagName).toBe('TIME');
    expect(timeElement).toHaveAttribute('datetime', startedAt);
    expect(timeElement).toHaveTextContent('2m 30s');
  });

  it('updates the displayed time after one second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T10:01:00Z'));

    const startedAt = '2026-04-18T10:00:00Z';
    render(<ElapsedTimer startedAt={startedAt} />);

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('1m 0s');

    // Advance system time and trigger the interval callback
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('elapsed-timer')).toHaveTextContent('1m 1s');
  });
});
