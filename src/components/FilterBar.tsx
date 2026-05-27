// src/components/FilterBar.tsx
'use client';

import type { StatusFilter } from '@/lib/github-types';

export type StatusCounts = {
  running: number;
  queued: number;
  passed: number;
  failed: number;
}

export type FilterBarProps = {
  searchQuery: string;
  statusFilter: StatusFilter;
  totalRepos: number;
  counts: StatusCounts;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: StatusFilter) => void;
}

const FILTER_PILLS: ReadonlyArray<{
  value: StatusFilter;
  label: string;
  testId: string;
  countKey: keyof StatusCounts | 'all';
  dotClass: string | null;
  pulse: boolean;
}> = [
  { value: 'all', label: 'All', testId: 'filter-pill-all', countKey: 'all', dotClass: null, pulse: false },
  { value: 'running', label: 'Running', testId: 'filter-pill-running', countKey: 'running', dotClass: 'bg-status-running', pulse: true },
  { value: 'failed', label: 'Failed', testId: 'filter-pill-failed', countKey: 'failed', dotClass: 'bg-status-failure', pulse: false },
  { value: 'passed', label: 'Passed', testId: 'filter-pill-passed', countKey: 'passed', dotClass: 'bg-status-success', pulse: false },
  { value: 'queued', label: 'Queued', testId: 'filter-pill-queued', countKey: 'queued', dotClass: 'bg-status-queued', pulse: false },
];

export const FilterBar = ({
  searchQuery,
  statusFilter,
  totalRepos,
  counts,
  onSearchChange,
  onStatusChange,
}: FilterBarProps) => {
  const activeCount = statusFilter === 'all' ? totalRepos : counts[statusFilter];
  const placeholder = activeCount > 0
    ? `Search ${activeCount} ${activeCount === 1 ? 'repository' : 'repositories'}...`
    : 'Search';

  return (
    <div
      data-testid="filter-bar"
      className="flex flex-col sm:flex-row gap-3"
    >
      <input
        data-testid="filter-search"
        type="search"
        aria-label="Search repositories"
        placeholder={placeholder}
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
          const count = pill.countKey === 'all' ? totalRepos : counts[pill.countKey];
          return (
            <button
              key={pill.value}
              data-testid={pill.testId}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStatusChange(pill.value)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-status-running ${
                isActive
                  ? 'bg-ink text-canvas shadow-sm'
                  : 'text-ink hover:bg-surface-raised active:bg-surface-raised'
              }`}
            >
              {pill.dotClass && (
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${pill.dotClass}${pill.pulse ? ' animate-pulse' : ''}`}
                />
              )}
              <span>{pill.label}</span>
              <span
                data-testid={`${pill.testId}-count`}
                className={`font-mono tabular-nums text-xs ${
                  isActive ? 'text-canvas/70' : 'text-ink-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
