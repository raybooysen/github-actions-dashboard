// src/components/FilterBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  const defaultProps = {
    searchQuery: '',
    statusFilter: 'all' as const,
    totalRepos: 0,
    counts: { running: 0, queued: 0, passed: 0, failed: 0 },
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
  };

  it('renders a search input with aria-label and type="search"', () => {
    render(<FilterBar {...defaultProps} />);

    const searchInput = screen.getByTestId('filter-search');
    expect(searchInput.tagName).toBe('INPUT');
    expect(searchInput).toHaveAttribute('type', 'search');
    expect(searchInput).toHaveAttribute('aria-label', 'Search repositories');
  });

  it('shows just "Search" when the active filter has zero matching repos', () => {
    render(<FilterBar {...defaultProps} totalRepos={0} />);
    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search');
  });

  it('embeds the total repo count in the placeholder when the All filter is active', () => {
    render(<FilterBar {...defaultProps} totalRepos={86} />);
    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search 86 repositories...');
  });

  it('uses the singular form for a single repository', () => {
    render(<FilterBar {...defaultProps} totalRepos={1} />);
    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search 1 repository...');
  });

  it('switches the placeholder to the active filter count when a non-All filter is selected', () => {
    render(
      <FilterBar
        {...defaultProps}
        statusFilter="failed"
        totalRepos={86}
        counts={{ running: 2, queued: 1, passed: 60, failed: 10 }}
      />,
    );
    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search 10 repositories...');
  });

  it('drops to "Search" when the active filter matches zero repos, even if the total is non-zero', () => {
    render(
      <FilterBar
        {...defaultProps}
        statusFilter="queued"
        totalRepos={86}
        counts={{ running: 2, queued: 0, passed: 60, failed: 10 }}
      />,
    );
    expect(screen.getByTestId('filter-search')).toHaveAttribute('placeholder', 'Search');
  });

  it('renders per-status counts inside each pill, with total on the All pill', () => {
    render(
      <FilterBar
        {...defaultProps}
        totalRepos={86}
        counts={{ running: 2, queued: 1, passed: 60, failed: 10 }}
      />,
    );

    expect(screen.getByTestId('filter-pill-all-count')).toHaveTextContent('86');
    expect(screen.getByTestId('filter-pill-running-count')).toHaveTextContent('2');
    expect(screen.getByTestId('filter-pill-queued-count')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-pill-passed-count')).toHaveTextContent('60');
    expect(screen.getByTestId('filter-pill-failed-count')).toHaveTextContent('10');
  });

  it('calls onSearchChange when text is typed in the search input', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterBar {...defaultProps} onSearchChange={onSearchChange} />,
    );

    const searchInput = screen.getByTestId('filter-search');
    await user.type(searchInput, 'api');

    // onSearchChange is called once per keystroke with the input's current value.
    // Since this is a controlled component and the parent doesn't update the prop,
    // each keystroke produces a single character in the input.
    expect(onSearchChange).toHaveBeenCalledTimes(3);
    expect(onSearchChange).toHaveBeenCalledWith('a');
    expect(onSearchChange).toHaveBeenCalledWith('p');
    expect(onSearchChange).toHaveBeenCalledWith('i');
  });

  it('highlights the active filter pill with aria-pressed="true"', () => {
    render(<FilterBar {...defaultProps} statusFilter="failed" />);

    expect(screen.getByTestId('filter-pill-all')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('filter-pill-failed')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-pill-running')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('filter-pill-passed')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('filter-pill-queued')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onStatusChange when a filter pill is clicked', async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();

    render(
      <FilterBar {...defaultProps} onStatusChange={onStatusChange} />,
    );

    await user.click(screen.getByTestId('filter-pill-running'));
    expect(onStatusChange).toHaveBeenCalledWith('running');

    await user.click(screen.getByTestId('filter-pill-failed'));
    expect(onStatusChange).toHaveBeenCalledWith('failed');
  });

  it('uses role="toolbar" with aria-label on the pills container', () => {
    render(<FilterBar {...defaultProps} />);

    const toolbar = screen.getByTestId('filter-pills');
    expect(toolbar).toHaveAttribute('role', 'toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Filter by status');
  });
});
