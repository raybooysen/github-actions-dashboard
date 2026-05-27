// src/components/RepoRow.tsx
'use client';

import Image from "next/image";
import { memo } from "react";
import type { GitHubRepo, GitHubWorkflowRun } from "@/lib/github-types";
import { formatDuration, formatRelativeTime } from '@/lib/time';
import { getStatusBorderClass, getStatusLabel } from '@/lib/status-utils';
import { StatusIndicator } from './StatusIndicator';
import { ElapsedTimer } from './ElapsedTimer';
import { GhLink } from './GhLink';

export type RepoRowProps = {
  repo: GitHubRepo;
  latestRun: GitHubWorkflowRun | null;
  isExpanded: boolean;
  onToggle: () => void;
  isLoading: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
};

const RepoRowSkeleton = () => {
  return (
    <div
      data-testid="repo-row-skeleton"
      aria-hidden="true"
      className="flex items-center gap-2 px-3 py-2.5 animate-pulse"
    >
      <div className="h-2.5 w-2.5 rounded-full bg-ink/10" />
      <div className="h-4 w-16 rounded bg-ink/5" />
      <div className="h-4 w-32 rounded bg-ink/5" />
      <div className="h-4 w-16 rounded bg-ink/5" />
      <div className="flex-1" />
      <div className="h-4 w-24 rounded bg-ink/5" />
      <div className="h-5 w-5 rounded-full bg-ink/5" />
      <div className="h-4 w-12 rounded bg-ink/5" />
      <div className="h-4 w-12 rounded bg-ink/5" />
      <div className="h-4 w-4 rounded bg-ink/5" />
    </div>
  );
};

export const RepoRow = memo(({ repo, latestRun, isExpanded, onToggle, isLoading, isPinned, onTogglePin }: RepoRowProps) => {
  if (isLoading) {
    return <RepoRowSkeleton />;
  }

  if (!latestRun) {
    return null;
  }

  const isActive = latestRun.status === 'in_progress';
  const isFailed = latestRun.conclusion === 'failure';
  const statusLabel = getStatusLabel(latestRun.status, latestRun.conclusion);
  const statusBorderClass = getStatusBorderClass(latestRun.status, latestRun.conclusion);
  const repoUrl = repo.html_url;
  const actorUrl = latestRun.triggering_actor
    ? `https://github.com/${latestRun.triggering_actor.login}`
    : null;

  // Conditional border classes: mobile gets color bar, desktop restores existing behavior
  // Failed rows keep border-l-2 on desktop; non-failed rows remove border on desktop
  const borderClasses = isFailed
    ? `border-l-4 ${statusBorderClass} sm:border-l-2 sm:border-status-failure`
    : `border-l-4 ${statusBorderClass} sm:border-l-0`;

  return (
    <div
      data-testid={`repo-row-${repo.name}`}
      className={`rounded-lg overflow-hidden ${borderClasses}`}
    >
      <span className="sr-only">{statusLabel}</span>
      <div className="flex items-center gap-0 hover:bg-surface-raised active:bg-surface-raised rounded-lg transition-colors duration-150">
        <button
          onClick={onTogglePin}
          className={`shrink-0 px-2 py-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center transition-colors duration-150 cursor-pointer ${
            isPinned ? 'text-status-queued' : 'text-ink-muted/30 hover:text-ink-muted'
          }`}
          title={isPinned ? 'Unpin repository' : 'Pin to top'}
          aria-label={isPinned ? 'Unpin repository' : 'Pin to top'}
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            viewBox="0 0 16 16"
            fill={isPinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4.456 2.193c.282-.282.7-.36 1.063-.199l5.25 2.333c.259.115.442.355.483.634l.512 3.483 1.575 1.575a.75.75 0 0 1-.53 1.281H9.28l-1.03 3.03a.75.75 0 0 1-1.42.02L5.5 11.28H1.31a.75.75 0 0 1-.53-1.281l1.575-1.575.512-3.483a.75.75 0 0 1 .483-.634l1.106-.49Z" />
          </svg>
        </button>

        <div
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={`repo-expanded-${repo.full_name}`}
          onClick={onToggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
          className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-status-running focus-visible:rounded-lg pr-3 py-2.5 overflow-hidden transition-all duration-150 active:scale-[0.995]"
        >
          <span className="sr-only">
            {`${repo.full_name}, status: ${statusLabel}, ${isExpanded ? 'collapse' : 'expand'} details`}
          </span>
          <span className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="hidden sm:inline-flex" aria-hidden="true">
              <StatusIndicator status={latestRun.status} conclusion={latestRun.conclusion} />
            </span>

            <span data-testid="repo-row-status-label" className="text-sm font-medium text-ink-secondary">
              {statusLabel}
            </span>

            <GhLink
              href={repoUrl}
              className="text-sm font-semibold text-ink truncate"
              title={`View ${repo.full_name} on GitHub`}
            >
              <span data-testid="repo-row-name">{repo.full_name}</span>
            </GhLink>

            <span
              data-testid="repo-row-branch"
              className="hidden sm:inline text-[11px] text-ink-muted font-mono bg-ink/5 rounded px-1.5 py-0.5 truncate max-w-32"
            >
              {latestRun.head_branch}
            </span>

            <span className="flex-1" />

            <span
              data-testid="repo-row-workflow"
              className="hidden md:inline text-xs text-ink-secondary truncate max-w-40"
            >
              {latestRun.name}
            </span>

            {latestRun.triggering_actor && actorUrl && (
              <GhLink href={actorUrl} className="hidden sm:inline shrink-0" title={latestRun.triggering_actor.login}>
                <Image
                  src={latestRun.triggering_actor.avatar_url}
                  alt={latestRun.triggering_actor.login}
                  width={20}
                  height={20}
                  className="rounded-full"
                  data-testid="repo-row-actor-avatar"
                />
              </GhLink>
            )}

            {isActive ? (
              <span data-testid="repo-row-timer">
                <ElapsedTimer startedAt={latestRun.run_started_at} />
              </span>
            ) : (
              <span
                data-testid="repo-row-duration"
                className="font-mono text-xs tabular-nums text-ink-secondary"
              >
                {formatDuration(latestRun.run_started_at, latestRun.updated_at)}
              </span>
            )}

            <span
              data-testid="repo-row-relative-time"
              className="text-xs text-ink-muted min-w-14 text-right"
            >
              {formatRelativeTime(latestRun.created_at)}
            </span>

            <span
              data-testid="repo-row-expand"
              className="text-ink-muted text-xs w-4 text-center shrink-0"
            >
              {isExpanded ? '\u25BE' : '\u25B8'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
});
RepoRow.displayName = 'RepoRow';
