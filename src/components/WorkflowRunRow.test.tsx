// src/components/WorkflowRunRow.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw-server';
import { renderWithProviders } from '../../test/test-utils';
import { WorkflowRunRow } from './WorkflowRunRow';
import { mockRunning, mockPassed, mockFailed } from '../../test/fixtures';
import type { GitHubWorkflowRun } from '@/lib/github-types';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token' }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const defaultProps = { owner: 'testuser', repo: 'api-server' };

describe('WorkflowRunRow', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders the workflow name', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-name')).toHaveTextContent('Deploy');
  });

  it('makes the desktop workflow name the flex-grow element so it absorbs leftover space and truncates instead of overflowing', () => {
    // jsdom has no layout engine, so we assert the CSS contract: the parent
    // anchor must have `truncate` (overflow/ellipsis rules), `min-w-0` (so
    // it can shrink below intrinsic content width), AND `flex-1` (so it
    // claims whatever space the fixed-width sibling items don't, with no
    // separate spacer competing for that space).
    const longRun: GitHubWorkflowRun = {
      ...mockPassed,
      name: 'A very very very long workflow name that would otherwise blow out the desktop row width',
    };
    renderWithProviders(<WorkflowRunRow run={longRun} {...defaultProps} />);
    const nameLink = screen.getByTestId('workflow-run-name').closest('a');
    expect(nameLink).not.toBeNull();
    expect(nameLink).toHaveClass('truncate');
    expect(nameLink).toHaveClass('min-w-0');
    expect(nameLink).toHaveClass('flex-1');
  });

  it('renders the branch name', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-branch')).toHaveTextContent('main');
  });

  it('renders the run number', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    // Dual-render (mobile + desktop) produces two instances of run number text
    const elements = screen.getAllByText('#41');
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toBeInTheDocument();
  });

  it('renders the display title / commit message', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-title')).toHaveTextContent('Deploy v2.1.0 to production');
  });

  it('renders the event badge', () => {
    renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);
    // Dual-render (mobile + desktop) produces two instances of event badge text
    const elements = screen.getAllByText(/PR/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toBeInTheDocument();
  });

  it('renders PR number for pull_request events', () => {
    renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);
    // Dual-render (mobile + desktop) produces two instances of PR number text
    const elements = screen.getAllByText(/PR #42/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(elements[0]).toBeInTheDocument();
  });

  it('renders the triggering actor avatar', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    const avatar = screen.getByAltText('testuser');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://avatars.githubusercontent.com/u/1');
  });

  it('shows ElapsedTimer for in-progress runs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T10:32:00Z'));
    renderWithProviders(<WorkflowRunRow run={mockRunning} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-run-duration')).not.toBeInTheDocument();
  });

  it('shows static duration for completed runs', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-duration')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-run-timer')).not.toBeInTheDocument();
  });

  it('applies failure border class for failed runs', () => {
    renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);
    const container = screen.getByTestId(`workflow-run-${mockFailed.id}`);
    expect(container.className).toContain('border-status-failure');
  });

  it('renders relative time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    expect(screen.getByTestId('workflow-run-relative-time')).toHaveTextContent('2h ago');
  });

  it('renders a view link to GitHub', () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
    const link = screen.getByText('view ↗');
    expect(link).toHaveAttribute('href', mockPassed.html_url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders sparkline without requiring expand click', async () => {
    renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);

    await waitFor(() => {
      const sparkline = document.querySelector('svg[aria-label^="Duration trend"]');
      expect(sparkline).toBeInTheDocument();
    });
  });

  describe('Re-run button', () => {
    const mockCancelled: GitHubWorkflowRun = {
      ...mockFailed,
      id: 97,
      conclusion: 'cancelled',
    };

    it('renders when the run failed', () => {
      renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { name: 'Re-run' });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders when the run was cancelled', () => {
      renderWithProviders(<WorkflowRunRow run={mockCancelled} {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { name: 'Re-run' });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render when the run passed', () => {
      renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
    });

    it('does not render when the run is in progress', () => {
      renderWithProviders(<WorkflowRunRow run={mockRunning} {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
    });

    it('does not render when the run timed out', () => {
      const mockTimedOut: GitHubWorkflowRun = {
        ...mockFailed,
        conclusion: 'timed_out',
      };
      renderWithProviders(<WorkflowRunRow run={mockTimedOut} {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'Re-run' })).not.toBeInTheDocument();
    });

    it('clicking the button POSTs to the rerun endpoint', async () => {
      const rerunHandler = vi.fn();
      server.use(
        http.post(
          'https://api.github.com/repos/:owner/:repo/actions/runs/:runId/rerun',
          ({ params }) => {
            rerunHandler({
              owner: params.owner,
              repo: params.repo,
              runId: params.runId,
            });
            return new HttpResponse(null, { status: 201 });
          },
        ),
      );

      const user = userEvent.setup();
      renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);

      const [button] = screen.getAllByRole('button', { name: 'Re-run' });
      if (!button) throw new Error('expected at least one Re-run button');
      await user.click(button);

      await waitFor(() => {
        expect(rerunHandler).toHaveBeenCalledWith({
          owner: 'testuser',
          repo: 'api-server',
          runId: String(mockFailed.id),
        });
      });
    });

    it('shows pending state while the request is in-flight', async () => {
      let resolveRequest: ((value: HttpResponse<null>) => void) | undefined;
      const pendingPromise = new Promise<HttpResponse<null>>((resolve) => {
        resolveRequest = resolve;
      });
      server.use(
        http.post(
          'https://api.github.com/repos/:owner/:repo/actions/runs/:runId/rerun',
          () => pendingPromise,
        ),
      );

      const user = userEvent.setup();
      renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);

      const [button] = screen.getAllByRole('button', { name: 'Re-run' });
      if (!button) throw new Error('expected at least one Re-run button');
      await user.click(button);

      await waitFor(() => {
        const pendingButtons = screen.getAllByRole('button', { name: 'Re-running...' });
        expect(pendingButtons[0]).toBeDisabled();
      });

      resolveRequest?.(new HttpResponse(null, { status: 201 }));
    });

    it('transitions label to "Triggered" on success then back to "Re-run" after 3s', async () => {
      server.use(
        http.post(
          'https://api.github.com/repos/:owner/:repo/actions/runs/:runId/rerun',
          () => new HttpResponse(null, { status: 201 }),
        ),
      );

      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
      renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);

      const [button] = screen.getAllByRole('button', { name: 'Re-run' });
      if (!button) throw new Error('expected at least one Re-run button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: 'Triggered' })[0]).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryAllByRole('button', { name: 'Triggered' })).toHaveLength(0);
      });
      const reRunButtons = screen.getAllByRole('button', { name: 'Re-run' });
      expect(reRunButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('invalidates workflowRuns and latestRun queries on success', async () => {
      server.use(
        http.post(
          'https://api.github.com/repos/:owner/:repo/actions/runs/:runId/rerun',
          () => new HttpResponse(null, { status: 201 }),
        ),
      );

      const user = userEvent.setup();
      const { queryClient } = renderWithProviders(<WorkflowRunRow run={mockFailed} {...defaultProps} />);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const [button] = screen.getAllByRole('button', { name: 'Re-run' });
      if (!button) throw new Error('expected at least one Re-run button');
      await user.click(button);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['workflowRuns', 'testuser', 'api-server'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['latestRun', 'testuser', 'api-server'],
        });
      });
    });
  });

  describe('keyboard expand/collapse', () => {
    it('Enter key on the row toggles expanded state', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);

      // JobList only renders when expanded
      expect(screen.queryByText(/jobs:/)).not.toBeInTheDocument();

      const row = screen.getByRole('button', { name: /expand details/ });
      row.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /collapse details/ })).toBeInTheDocument();
      });

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /expand details/ })).toBeInTheDocument();
      });
    });

    it('Space key on the row toggles expanded state', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WorkflowRunRow run={mockPassed} {...defaultProps} />);

      const row = screen.getByRole('button', { name: /expand details/ });
      row.focus();
      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /collapse details/ })).toBeInTheDocument();
      });

      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /expand details/ })).toBeInTheDocument();
      });
    });
  });
});
