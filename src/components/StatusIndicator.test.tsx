// src/components/StatusIndicator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator';

describe('StatusIndicator', () => {
  it('renders a pulsing blue dot for in_progress status', () => {
    render(<StatusIndicator status="in_progress" conclusion={null} />);

    expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', 'Running');
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-status-running');
    expect(screen.getByTestId('status-dot')).toHaveClass('animate-pulse');
  });

  it('renders amber dot for queued/waiting/pending/requested statuses', () => {
    const queuedStatuses = ['queued', 'waiting', 'pending', 'requested'] as const;

    for (const status of queuedStatuses) {
      const { unmount } = render(<StatusIndicator status={status} conclusion={null} />);
      expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', 'Queued');
      expect(screen.getByTestId('status-dot')).toHaveClass('bg-status-queued');
      expect(screen.getByTestId('status-dot')).not.toHaveClass('animate-pulse');
      unmount();
    }
  });

  it('renders green dot for completed/success', () => {
    render(<StatusIndicator status="completed" conclusion="success" />);

    expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', 'Passed');
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-status-success');
  });

  it('renders red dot for completed/failure', () => {
    render(<StatusIndicator status="completed" conclusion="failure" />);

    expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', 'Failed');
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-status-failure');
  });

  it('renders correct dot and aria-label for cancelled, timed_out, action_required, skipped, stale conclusions', () => {
    const cases = [
      { conclusion: 'cancelled' as const, label: 'Cancelled', dotClass: 'bg-status-cancelled' },
      { conclusion: 'timed_out' as const, label: 'Timed out', dotClass: 'bg-status-failure' },
      { conclusion: 'action_required' as const, label: 'Action required', dotClass: 'bg-status-queued' },
      { conclusion: 'skipped' as const, label: 'Skipped', dotClass: 'bg-status-cancelled' },
      { conclusion: 'stale' as const, label: 'Stale', dotClass: 'bg-status-cancelled' },
    ];

    for (const { conclusion, label, dotClass } of cases) {
      const { unmount } = render(<StatusIndicator status="completed" conclusion={conclusion} />);
      expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', label);
      expect(screen.getByTestId('status-dot')).toHaveClass(dotClass);
      unmount();
    }
  });

  it('renders unknown aria-label with neutral dot for unrecognized conclusion', () => {
    // Cast to simulate an unknown future conclusion value
    render(<StatusIndicator status="completed" conclusion={'new_value' as 'success'} />);

    expect(screen.getByTestId('status-indicator')).toHaveAttribute('aria-label', 'Unknown');
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-status-cancelled');
  });

  it('does NOT have role="status" on the wrapper', () => {
    render(<StatusIndicator status="in_progress" conclusion={null} />);

    const wrapper = screen.getByTestId('status-indicator');
    expect(wrapper).not.toHaveAttribute('role');
  });

  it('has aria-hidden="true" on the dot element', () => {
    render(<StatusIndicator status="completed" conclusion="success" />);

    expect(screen.getByTestId('status-dot')).toHaveAttribute('aria-hidden', 'true');
  });
});
