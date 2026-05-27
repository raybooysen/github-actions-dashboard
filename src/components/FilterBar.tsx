// src/components/FilterBar.tsx
'use client';

import type { StatusFilter } from '@/lib/github-types';

export type FilterBarProps = {
  searchQuery: string;
  statusFilter: StatusFilter;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: StatusFilter) => void;
}

const FILTER_PILLS: ReadonlyArray<{ value: StatusFilter; label: string; testId: string }> = [
  { value: 'all', label: 'All', testId: 'filter-pill-all' },
  { value: 'running', label: 'Running', testId: 'filter-pill-running' },
  { value: 'failed', label: 'Failed', testId: 'filter-pill-failed' },
  { value: 'passed', label: 'Passed', testId: 'filter-pill-passed' },
  { value: 'queued', label: 'Queued', testId: 'filter-pill-queued' },
];

export const FilterBar = ({
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: FilterBarProps) => {
  return (
    <div
      data-testid="filter-bar"
      className="flex flex-col sm:flex-row gap-3"
    >
      <input
        data-testid="filter-search"
        type="search"
        aria-label="Search repositories"
        placeholder="Search repositories..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 rounded-xl border border-edge bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-status-running/30 focus:border-status-running/50"
      />
      <div
        data-testid="filter-pills"
        role="toolbar"
        aria-label="Filter by status"
        className="flex flex-row gap-1 rounded-xl bg-surface border border-edge p-1 overflow-x-auto"
      >
        {FILTER_PILLS.map((pill) => {
          const isActive = statusFilter === pill.value;
          return (
            <button
              key={pill.value}
              data-testid={pill.testId}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(pill.value)}
              className={`rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-status-running ${
                isActive
                  ? 'bg-ink text-canvas shadow-sm'
                  : 'text-ink hover:bg-surface-raised active:bg-surface-raised'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
