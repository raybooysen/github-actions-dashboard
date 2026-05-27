// src/components/RepoRow.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoRow } from './RepoRow';
import { renderWithProviders } from '../../test/test-utils';
import { mockRepos, mockRunning, mockPassed, mockFailed } from '../../test/fixtures';

const repo = mockRepos[0];
if (!repo) throw new Error('mockRepos fixture is empty');
const defaultProps = {
  repo,
  latestRun: mockPassed,
  isExpanded: false,
  onToggle: vi.fn(),
  isLoading: false,
  isPinned: false,
  onTogglePin: vi.fn(),
};

describe('RepoRow', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders repo name as a link', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    const nameEl = screen.getByTestId('repo-row-name');
    expect(nameEl).toHaveTextContent(repo.full_name);
    const link = nameEl.closest('a');
    expect(link).toHaveAttribute('href', repo.html_url);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows status indicator for the latest run', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('repo-row-status-label')).toHaveTextContent('Passed');
  });

  it('shows branch badge', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    const branch = screen.getByTestId('repo-row-branch');
    expect(branch).toHaveTextContent('main');
    expect(branch.className).toContain('font-mono');
  });

  it('shows static duration for completed runs', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    expect(screen.getByTestId('repo-row-duration')).toBeInTheDocument();
    expect(screen.queryByTestId('repo-row-timer')).not.toBeInTheDocument();
  });

  it('shows ElapsedTimer for running runs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T10:32:00Z'));
    renderWithProviders(<RepoRow {...defaultProps} latestRun={mockRunning} />);
    expect(screen.getByTestId('repo-row-timer')).toBeInTheDocument();
    expect(screen.queryByTestId('repo-row-duration')).not.toBeInTheDocument();
  });

  it('shows expand arrow collapsed (triangleright) when not expanded', () => {
    renderWithProviders(<RepoRow {...defaultProps} isExpanded={false} />);
    expect(screen.getByTestId('repo-row-expand')).toHaveTextContent('\u25B8');
  });

  it('shows expand arrow expanded (triangledown) when expanded', () => {
    renderWithProviders(<RepoRow {...defaultProps} isExpanded={true} />);
    expect(screen.getByTestId('repo-row-expand')).toHaveTextContent('\u25BE');
  });

  it('returns null when latestRun is null', () => {
    const { container } = renderWithProviders(
      <RepoRow {...defaultProps} latestRun={null} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows skeleton when loading', () => {
    renderWithProviders(<RepoRow {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('repo-row-skeleton')).toBeInTheDocument();
  });

  it('failed repos have red border', () => {
    renderWithProviders(<RepoRow {...defaultProps} latestRun={mockFailed} />);
    const container = screen.getByTestId(`repo-row-${repo.name}`);
    expect(container).toHaveClass('border-l-4');
    expect(container).toHaveClass('sm:border-l-2');
    expect(container).toHaveClass('sm:border-status-failure');
  });

  it('passed repos do not have red border', () => {
    renderWithProviders(<RepoRow {...defaultProps} latestRun={mockPassed} />);
    const container = screen.getByTestId(`repo-row-${repo.name}`);
    expect(container).not.toHaveClass('sm:border-status-failure');
  });

  it('shows workflow name', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    expect(screen.getByTestId('repo-row-workflow')).toHaveTextContent('Deploy');
  });

  it('shows actor avatar as a link to GitHub profile', () => {
    renderWithProviders(<RepoRow {...defaultProps} />);
    const avatar = screen.getByTestId('repo-row-actor-avatar');
    expect(avatar).toHaveAttribute('src', mockPassed.triggering_actor!.avatar_url);
    const link = avatar.closest('a');
    expect(link).toHaveAttribute('href', `https://github.com/${mockPassed.triggering_actor!.login}`);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows relative time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
    renderWithProviders(<RepoRow {...defaultProps} />);
    expect(screen.getByTestId('repo-row-relative-time')).toHaveTextContent('2h ago');
  });

  describe('keyboard expand/collapse', () => {
    it('clicking the disclosure row calls onToggle', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<RepoRow {...defaultProps} onToggle={onToggle} />);

      const row = screen.getByRole('button', { name: /expand details/ });
      await user.click(row);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('Enter key on the disclosure row calls onToggle', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<RepoRow {...defaultProps} onToggle={onToggle} />);

      const row = screen.getByRole('button', { name: /expand details/ });
      row.focus();
      await user.keyboard('{Enter}');

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('Space key on the disclosure row calls onToggle', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<RepoRow {...defaultProps} onToggle={onToggle} />);

      const row = screen.getByRole('button', { name: /expand details/ });
      row.focus();
      await user.keyboard(' ');

      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });
});
