'use client';

import Image from "next/image";
import Link from "next/link";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';
import { useRepositories } from '@/hooks/useRepositories';
import { useRateLimit } from '@/contexts/RateLimitContext';
import { useVisibility } from '@/hooks/useVisibility';
import { usePinnedRepos } from '@/hooks/usePinnedRepos';
import { isQueuedStatus } from '@/lib/status-utils';
import { fetchLatestRun, fetchWorkflowRuns } from '@/lib/github-client';
import { computeRefetchInterval } from '@/lib/polling';
import { SummaryBar } from './SummaryBar';
import { FilterBar } from './FilterBar';
import { RepoRow } from './RepoRow';
import { WorkflowRunRow } from './WorkflowRunRow';
import type {
  StatusFilter,
  GitHubRepo,
  GitHubWorkflowRun,
} from '@/lib/github-types';

const RepoItem = ({
  repo,
  token,
  isExpanded,
  onToggle,
  rateLimitMultiplier,
  isPinned,
  onTogglePin,
}: {
  repo: GitHubRepo;
  token: string;
  isExpanded: boolean;
  onToggle: (name: string) => void;
  rateLimitMultiplier: number;
  isPinned: boolean;
  onTogglePin: (name: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const isVisible = useVisibility(rowRef);

  // Fetch latest run (per_page=1) for the collapsed summary row.
  // Shares the query key with DashboardShell's `useQueries` so TanStack Query
  // deduplicates the network request. Inherits the default staleTime; the
  // refetchInterval below drives freshness independently.
  const latestRunQuery = useQuery({
    queryKey: ['latestRun', repo.owner.login, repo.name],
    queryFn: () => fetchLatestRun(token, repo.owner.login, repo.name),
    enabled: true,
    refetchInterval: (query) => {
      if (!isVisible) return false;
      const runs = query.state.data?.workflow_runs;
      const interval = computeRefetchInterval(runs);
      return interval * rateLimitMultiplier;
    },
  });

  const fullRunsQuery = useQuery({
    queryKey: ['workflowRuns', repo.owner.login, repo.name],
    queryFn: () => fetchWorkflowRuns(token, repo.owner.login, repo.name),
    enabled: isExpanded,
    refetchInterval: (query) => {
      if (!isExpanded || !isVisible) return false;
      const runs = query.state.data?.workflow_runs;
      const interval = computeRefetchInterval(runs);
      return interval * rateLimitMultiplier;
    },
  });

  const latestRun = latestRunQuery.data?.workflow_runs?.[0] ?? null;
  const totalCount = latestRunQuery.data?.total_count ?? 0;
  const fullRuns = fullRunsQuery.data?.workflow_runs ?? [];

  if (!latestRunQuery.isLoading && totalCount === 0) {
    return null;
  }

  return (
    <div ref={rowRef}>
      <div
        className={`rounded-xl border bg-surface shadow-sm transition-all duration-normal hover:shadow-md hover:-translate-y-0.5 overflow-hidden ${
          latestRun?.conclusion === 'failure' ? 'border-status-failure/30' : 'border-edge'
        }`}
      >
        <RepoRow
          repo={repo}
          latestRun={latestRun}
          isExpanded={isExpanded}
          onToggle={() => onToggle(repo.full_name)}
          isLoading={latestRunQuery.isLoading}
          isPinned={isPinned}
          onTogglePin={() => onTogglePin(repo.full_name)}
        />

        {isExpanded && (
          <div
            id={`repo-expanded-${repo.full_name}`}
            className="border-t border-edge/50 bg-canvas/30"
          >
            {fullRunsQuery.isLoading ? (
              <div className="py-4 px-4 space-y-2 animate-pulse">
                <div className="h-12 rounded bg-ink/[0.03]" />
                <div className="h-12 rounded bg-ink/[0.03]" />
              </div>
            ) : fullRuns.length > 0 ? (
              <div className="px-2 py-1 space-y-0.5">
                {fullRuns.map((run) => (
                  <WorkflowRunRow
                    key={run.id}
                    run={run}
                    owner={repo.owner.login}
                    repo={repo.name}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 px-4 text-sm text-ink-muted">No recent workflow runs</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const DashboardShell = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  // Track user-initiated toggles as a map of repo full name → expanded/collapsed.
  // Failed repos auto-expand via derived state below.
  const [userToggles, setUserToggles] = useState<Map<string, boolean>>(new Map());

  const { token, logout } = useAuth();
  const { data: user } = useUser(token);
  const { data: repos, isLoading: reposLoading } = useRepositories(token);
  const { rateLimitMultiplier } = useRateLimit();
  const { isPinned, togglePin } = usePinnedRepos();

  const latestRunQueries = useQueries({
    queries: (repos ?? []).map((repo) => ({
      queryKey: ['latestRun', repo.owner.login, repo.name] as const,
      queryFn: () => fetchLatestRun(token!, repo.owner.login, repo.name),
      enabled: !!token,
      staleTime: 30_000,
    })),
  });

  const latestRunByRepo = useMemo(() => {
    const map = new Map<string, GitHubWorkflowRun | null>();
    (repos ?? []).forEach((repo, i) => {
      const data = latestRunQueries[i]?.data;
      const run = data?.workflow_runs?.[0] ?? null;
      map.set(repo.full_name, run);
    });
    return map;
  }, [repos, latestRunQueries]);

  const noActionsCount = useMemo(() => {
    let count = 0;
    (repos ?? []).forEach((repo, i) => {
      const data = latestRunQueries[i]?.data;
      if (data && data.total_count === 0) count++;
    });
    return count;
  }, [repos, latestRunQueries]);

  const allLatestRuns = useMemo<GitHubWorkflowRun[]>(() => {
    const runs: GitHubWorkflowRun[] = [];
    for (const run of latestRunByRepo.values()) {
      if (run) runs.push(run);
    }
    return runs;
  }, [latestRunByRepo]);

  const filteredAndSorted = useMemo(() => {
    if (!repos) return [];

    const filtered = repos.filter((repo) => {
      const latestRun = latestRunByRepo.get(repo.full_name);

      if (!latestRun) return false;

      if (searchQuery && !repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'running':
            if (latestRun.status !== 'in_progress') return false;
            break;
          case 'failed':
            if (latestRun.conclusion !== 'failure') return false;
            break;
          case 'passed':
            if (latestRun.conclusion !== 'success') return false;
            break;
          case 'queued':
            if (!isQueuedStatus(latestRun.status)) return false;
            break;
        }
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const aPinned = isPinned(a.full_name) ? 1 : 0;
      const bPinned = isPinned(b.full_name) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aRun = latestRunByRepo.get(a.full_name);
      const bRun = latestRunByRepo.get(b.full_name);
      const aTime = aRun?.created_at ?? a.pushed_at;
      const bTime = bRun?.created_at ?? b.pushed_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [repos, searchQuery, statusFilter, latestRunByRepo, isPinned]);

  // Derive expanded repos: failed repos auto-expand, user toggles override
  const expandedRepos = useMemo(() => {
    const expanded = new Set<string>();
    for (const [fullName, run] of latestRunByRepo) {
      if (run?.conclusion === 'failure') {
        expanded.add(fullName);
      }
    }
    // Apply user toggles (explicit expand or collapse overrides auto-expand)
    for (const [fullName, isExpanded] of userToggles) {
      if (isExpanded) {
        expanded.add(fullName);
      } else {
        expanded.delete(fullName);
      }
    }
    return expanded;
  }, [latestRunByRepo, userToggles]);

  const expandedReposRef = useRef(expandedRepos);
  useEffect(() => {
    expandedReposRef.current = expandedRepos;
  }, [expandedRepos]);

  const toggleRepo = useCallback((repoFullName: string) => {
    setUserToggles((prev) => {
      const next = new Map(prev);
      const currentlyExpanded = expandedReposRef.current.has(repoFullName);
      next.set(repoFullName, !currentlyExpanded);
      return next;
    });
  }, []);

  const repoCount = filteredAndSorted.length;
  const runningCount = allLatestRuns.filter((r) => r.status === 'in_progress').length;
  const failedCount = allLatestRuns.filter((r) => r.conclusion === 'failure').length;
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all';

  // Show skeletons until repos AND their latest-run queries have settled.
  // This prevents a flash of "No repositories" while runs are still loading.
  const latestRunsStillLoading = repos && repos.length > 0 && latestRunQueries.some((q) => q.isLoading);
  const isLoading = reposLoading || latestRunsStillLoading;

  return (
    <div data-testid="dashboard-shell" className="min-h-screen bg-canvas overflow-x-hidden">
      <a
        href="#main-content"
        data-testid="skip-to-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:text-canvas focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
      >
        Skip to content
      </a>
      <header
        data-testid="dashboard-header"
        className="sticky top-0 z-10 border-b border-edge bg-surface/80 backdrop-blur-md"
      >
        <nav
          aria-label="Dashboard navigation"
          data-testid="dashboard-nav"
          className="max-w-5xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3"
        >
          <Link
            href="/dashboard"
            data-testid="dashboard-title-link"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <h1
              data-testid="dashboard-title"
              className="text-lg font-bold tracking-tight text-ink"
            >
              Actions Dashboard
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <Image
                data-testid="dashboard-user-avatar"
                src={user.avatar_url}
                alt={user.login}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-full"
                width={28}
                height={28}
              />
            )}
            <button
              data-testid="dashboard-logout"
              onClick={logout}
              type="button"
              className="text-sm text-ink-secondary hover:text-ink transition-colors duration-fast cursor-pointer"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-3 sm:px-4 py-6 space-y-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SummaryBar runs={allLatestRuns} />
          {!isLoading && (
            <span className="text-xs text-ink-muted">
              {repoCount} repositories
              {failedCount > 0 && <span className="text-status-failure"> · {failedCount} failing</span>}
              {runningCount > 0 && <span className="text-status-running"> · {runningCount} running</span>}
            </span>
          )}
        </div>
        <FilterBar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
        />
        <h2 className="sr-only">Repositories</h2>
        <div
          data-testid="repo-grid"
          aria-busy={isLoading}
          className="grid gap-3"
        >
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="rounded-xl border border-edge bg-surface p-1 shadow-sm">
                <RepoRow
                  repo={{ id: 0, name: '', full_name: '', owner: { login: '' }, private: false, pushed_at: '', html_url: '' }}
                  latestRun={null}
                  isExpanded={false}
                  onToggle={() => {}}
                  isLoading={true}
                  isPinned={false}
                  onTogglePin={() => {}}
                />
              </div>
            ))
          ) : filteredAndSorted.length === 0 ? (
            <p
              data-testid="empty-state"
              role="status"
              className="text-center text-ink-muted py-16 text-sm"
            >
              {hasActiveFilters
                ? 'No repositories match your filters.'
                : 'No repositories with GitHub Actions found.'}
            </p>
          ) : (
            filteredAndSorted.map((repo, index) => (
              <div
                key={repo.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <RepoItem
                  repo={repo}
                  token={token!}
                  isExpanded={expandedRepos.has(repo.full_name)}
                  onToggle={toggleRepo}
                  rateLimitMultiplier={rateLimitMultiplier}
                  isPinned={isPinned(repo.full_name)}
                  onTogglePin={togglePin}
                />
              </div>
            ))
          )}
        </div>

        {noActionsCount > 0 && (
          <p className="text-center text-xs text-ink-muted py-4">
            {noActionsCount} {noActionsCount === 1 ? 'repository' : 'repositories'} with no GitHub Actions hidden
          </p>
        )}
      </main>
    </div>
  );
}
export default DashboardShell;
