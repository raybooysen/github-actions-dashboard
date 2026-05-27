// src/components/SummaryBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SummaryBar } from './SummaryBar';
import { mockRunning, mockPassed, mockFailed } from '../../test/fixtures';
import type { GitHubWorkflowRun } from '@/lib/github-types';

describe('SummaryBar', () => {
  it('renders correct counts for each status using data-testid queries', () => {
    const runs: GitHubWorkflowRun[] = [mockRunning, mockPassed, mockFailed];

    render(<SummaryBar runs={runs} />);

    expect(
      within(screen.getByTestId('summary-running')).getByText('1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-queued')).getByText('0'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-passed')).getByText('1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-failed')).getByText('1'),
    ).toBeInTheDocument();
  });

  it('renders zero counts correctly when no runs are provided', () => {
    render(<SummaryBar runs={[]} />);

    expect(
      within(screen.getByTestId('summary-running')).getByText('0'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-queued')).getByText('0'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-passed')).getByText('0'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('summary-failed')).getByText('0'),
    ).toBeInTheDocument();
  });

  it('has aria-live="polite" on the wrapper element', () => {
    render(<SummaryBar runs={[]} />);

    const summaryBar = screen.getByTestId('summary-bar');
    expect(summaryBar).toHaveAttribute('aria-live', 'polite');
  });

  it('has role="region" with an accessible label', () => {
    render(<SummaryBar runs={[]} />);

    const summaryBar = screen.getByTestId('summary-bar');
    expect(summaryBar).toHaveAttribute('role', 'region');
    expect(summaryBar).toHaveAttribute('aria-label', 'Workflow run summary');
  });
});
