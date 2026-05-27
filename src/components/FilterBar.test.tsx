// src/components/FilterBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  const defaultProps = {
    searchQuery: '',
    statusFilter: 'all' as const,
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
