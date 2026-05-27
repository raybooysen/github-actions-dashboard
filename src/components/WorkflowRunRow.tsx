'use client';

import Image from "next/image";
import { useState, memo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GitHubWorkflowRun, GitHubJobsResponse } from '@/lib/github-types';
import { computeJobSummary } from '@/lib/job-summary';
import { formatDuration, formatRelativeTime } from '@/lib/time';
import { rerunWorkflow, fetchRunHistory } from '@/lib/github-client';
import { getStatusBorderClass, getStatusLabel } from '@/lib/status-utils';
import { useAuth } from '@/hooks/useAuth';
import { StatusIndicator } from './StatusIndicator';
import { ElapsedTimer } from './ElapsedTimer';
import { JobList } from './JobList';
import { Sparkline } from './Sparkline';
import { GhLink } from './GhLink';

export type WorkflowRunRowProps = {
  run: GitHubWorkflowRun;
  owner: string;
  repo: string;
};

const EVENT_LABELS: Record<string, { label: string; className: string }> = {
  push: { label: 'push', className: 'bg-ink/5 text-ink-secondary' },
  pull_request: { label: 'PR', className: 'bg-status-running/10 text-status-running' },
  pull_request_target: { label: 'PR', className: 'bg-status-running/10 text-status-running' },
  workflow_dispatch: { label: 'manual', className: 'bg-status-queued/10 text-status-queued' },
  schedule: { label: 'schedule', className: 'bg-ink/5 text-ink-secondary' },
  release: { label: 'release', className: 'bg-status-success/10 text-status-success' },
  deployment: { label: 'deploy', className: 'bg-status-success/10 text-status-success' },
  deployment_status: { label: 'deploy', className: 'bg-status-success/10 text-status-success' },
};

type RerunButtonProps = {
  run: GitHubWorkflowRun;
  rerunMutation: { isPending: boolean; mutate: () => void };
  rerunState: 'idle' | 'success';
};

/** Re-run button shared by both mobile and desktop layouts */
const RerunButton = ({ run, rerunMutation, rerunState }: RerunButtonProps) => {
  if (run.conclusion !== 'failure' && run.conclusion !== 'cancelled') {
    return null;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        rerunMutation.mutate();
      }}
      disabled={rerunMutation.isPending || rerunState === 'success'}
      className={`text-[11px] font-medium px-2 py-0.5 min-h-[44px] sm:min-h-0 rounded transition-all duration-150 active:scale-[0.95] ${
        rerunState === 'success'
          ? 'bg-status-success/10 text-status-success'
          : rerunMutation.isPending
            ? 'bg-ink/5 text-ink-muted cursor-wait'
            : 'bg-ink/5 text-ink-secondary hover:bg-ink/10 hover:text-ink cursor-pointer'
      }`}
    >
      {rerunState === 'success' ? 'Triggered' : rerunMutation.isPending ? 'Re-running...' : 'Re-run'}
    </button>
  );
};

export const WorkflowRunRow = memo(({ run, owner, repo }: WorkflowRunRowProps) => {
  const [expanded, setExpanded] = useState(false);
  const [rerunState, setRerunState] = useState<'idle' | 'success'>('idle');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const rerunMutation = useMutation({
    mutationFn: () => rerunWorkflow(token!, owner, repo, run.id),
    onSuccess: () => {
      setRerunState('success');
      queryClient.invalidateQueries({ queryKey: ['workflowRuns', owner, repo] });
      queryClient.invalidateQueries({ queryKey: ['latestRun', owner, repo] });
    },
  });

  useEffect(() => {
    if (rerunState === 'success') {
      const timer = setTimeout(() => setRerunState('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [rerunState]);

  const cachedJobs = queryClient.getQueryData<GitHubJobsResponse>(['jobs', owner, repo, run.id]);
  const jobSummary = cachedJobs ? computeJobSummary(cachedJobs.jobs) : null;

  const historyQuery = useQuery({
    queryKey: ['runHistory', owner, repo, run.workflow_id],
    queryFn: () => fetchRunHistory(token!, owner, repo, run.workflow_id, 10),
    enabled: !!token,
    staleTime: 5 * 60_000, // 5 minutes
  });

  // Compute durations from history. `fetchRunHistory` already passes
  // `?status=completed` to GitHub, so the API response only contains
  // completed runs — an in-progress run's updated_at is a poll timestamp,
  // not a build duration, and would pollute the regression heuristic.
  const durations = (historyQuery.data?.workflow_runs ?? [])
    .filter((r) => r.run_started_at && r.updated_at)
    .map((r) => (new Date(r.updated_at).getTime() - new Date(r.run_started_at).getTime()) / 1000)
    .reverse(); // oldest first for sparkline

  const isActive = run.status === 'in_progress';
  const isFailed = run.conclusion === 'failure';
  const statusLabel = getStatusLabel(run.status, run.conclusion);
  const statusBorderClass = getStatusBorderClass(run.status, run.conclusion);
  const prNumber = run.pull_requests?.[0]?.number;
  const commitMsg = run.display_title || run.head_commit?.message || '';
  const shortSha = run.head_sha?.slice(0, 7);

  // Build GitHub URLs for deep-linking
  const repoUrl = `https://github.com/${owner}/${repo}`;
  const branchUrl = `${repoUrl}/tree/${encodeURIComponent(run.head_branch)}`;
  const commitUrl = run.head_sha ? `${repoUrl}/commit/${run.head_sha}` : null;
  const prUrl = prNumber ? `${repoUrl}/pull/${prNumber}` : null;
  const actorUrl = run.triggering_actor ? `https://github.com/${run.triggering_actor.login}` : null;

  const eventConfig = EVENT_LABELS[run.event] ?? {
    label: run.event,
    className: 'bg-ink/5 text-ink-secondary',
  };

  // Conditional border classes: mobile gets color bar, desktop restores existing behavior
  const borderClasses = isFailed
    ? `border-l-[3px] ${statusBorderClass} sm:border-l-2 sm:border-status-failure`
    : `border-l-[3px] ${statusBorderClass} sm:border-l-0`;

  // Event badge element (shared reference for both layouts)
  const eventBadge = prUrl ? (
    <GhLink href={prUrl} title={`View PR #${prNumber}`}>
      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${eventConfig.className}`}>
        {eventConfig.label} #{prNumber}
      </span>
    </GhLink>
  ) : (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${eventConfig.className}`}>
      {eventConfig.label}
    </span>
  );

  return (
    <div
      data-testid={`workflow-run-${run.id}`}
      className={`rounded-lg overflow-hidden ${borderClasses}`}
    >
      {/* Main row -- clickable to expand. Uses div+role=button to allow <a> and <button> children */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`run-jobs-${run.id}`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        className="w-full text-left cursor-pointer hover:bg-surface-raised active:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-status-running focus-visible:rounded-lg px-3 py-2.5"
      >
        <span className="sr-only">
          {`${run.name} #${run.run_number}, status: ${statusLabel}, ${expanded ? 'collapse' : 'expand'} details`}
        </span>

        {/* ===== Mobile layout: two lines ===== */}
        <div className="sm:hidden">
          {/* Mobile Line 1: status label, workflow name, run number, duration, chevron */}
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-ink-secondary shrink-0">
              {statusLabel}
            </span>
            <GhLink
              href={run.html_url}
              className="text-sm font-semibold text-ink truncate min-w-0"
              title="View run on GitHub"
            >
              {run.name}
            </GhLink>
            <span className="text-xs text-ink-muted font-mono shrink-0">#{run.run_number}</span>
            <span className="flex-1" />
            {isActive ? (
              <ElapsedTimer startedAt={run.run_started_at} />
            ) : (
              <span className="font-mono text-xs tabular-nums text-ink-secondary shrink-0">
                {formatDuration(run.run_started_at, run.updated_at)}
              </span>
            )}
            <span className="text-ink-muted text-xs w-4 text-center shrink-0">
              {expanded ? '\u25BE' : '\u25B8'}
            </span>
          </span>
          {/* Mobile Line 2: commit message, event badge, re-run button */}
          <span className="flex items-center gap-2 mt-1 min-w-0">
            {commitUrl ? (
              <GhLink href={commitUrl} className="text-xs text-ink-secondary truncate min-w-0" title="View commit">
                {commitMsg}
              </GhLink>
            ) : (
              <span className="text-xs text-ink-secondary truncate min-w-0">
                {commitMsg}
              </span>
            )}
            <span className="flex-1" />
            {eventBadge}
            <RerunButton run={run} rerunMutation={rerunMutation} rerunState={rerunState} />
          </span>
        </div>

        {/* ===== Desktop layout: existing structure ===== */}
        <div className="hidden sm:block">
          {/* Top line: status, workflow name, run number, event, actor, duration, time */}
          <span data-testid="workflow-run-desktop-top" className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true">
              <StatusIndicator status={run.status} conclusion={run.conclusion} />
            </span>

            {/* Status label for clarity after the dot */}
            <span data-testid="workflow-run-status-label" className="text-sm font-medium text-ink-secondary">
              {statusLabel}
            </span>

            {/* Workflow name -> links to run on GitHub.
                min-w-0 lets the flex item shrink below its intrinsic content
                width so `truncate` actually engages; without it a long run
                name forces the row past the container and gets clipped by
                the dashboard-shell's overflow-x-hidden. */}
            <GhLink
              href={run.html_url}
              className="text-sm font-semibold text-ink truncate min-w-0"
              title="View run on GitHub"
            >
              <span data-testid="workflow-run-name">{run.name}</span>
            </GhLink>

            {durations.length >= 2 && (
              <span title="Build duration trend (last 10 runs)">
                <Sparkline values={durations} />
              </span>
            )}

            {/* Run number -> links to run on GitHub */}
            <GhLink href={run.html_url} className="text-xs text-ink-muted font-mono">
              <span data-testid="workflow-run-number">#{run.run_number}</span>
            </GhLink>

            {/* Event badge -- PR badge links to PR, others link to run */}
            {eventBadge}

            <span className="flex-1" />

            {/* Actor avatar -> links to GitHub profile */}
            {run.triggering_actor && actorUrl && (
              <GhLink href={actorUrl} className="shrink-0" title={run.triggering_actor.login}>
                <Image
                  src={run.triggering_actor.avatar_url}
                  alt={run.triggering_actor.login}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              </GhLink>
            )}

            {jobSummary && (
              <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                jobSummary.failed > 0 ? 'bg-status-failure/10 text-status-failure' :
                jobSummary.running > 0 ? 'bg-status-running/10 text-status-running' :
                'bg-status-success/10 text-status-success'
              }`}>
                {jobSummary.passed}/{jobSummary.total}
              </span>
            )}

            {isActive ? (
              <span data-testid="workflow-run-timer">
                <ElapsedTimer startedAt={run.run_started_at} />
              </span>
            ) : (
              <span
                data-testid="workflow-run-duration"
                className="font-mono text-xs tabular-nums text-ink-secondary"
              >
                {formatDuration(run.run_started_at, run.updated_at)}
              </span>
            )}

            <span
              data-testid="workflow-run-relative-time"
              className="text-xs text-ink-muted min-w-14 text-right"
            >
              {formatRelativeTime(run.created_at)}
            </span>

            <span className="text-ink-muted text-xs w-4 text-center shrink-0">
              {expanded ? '\u25BE' : '\u25B8'}
            </span>
          </span>

          {/* Bottom line: commit message, branch, sha */}
          <span className="flex items-center gap-2 mt-1 ml-[26px] min-w-0">
            {/* Commit message -> links to commit */}
            {commitUrl ? (
              <GhLink href={commitUrl} className="text-xs text-ink-secondary truncate max-w-[50%]" title="View commit">
                <span data-testid="workflow-run-title">{commitMsg}</span>
              </GhLink>
            ) : (
              <span data-testid="workflow-run-title" className="text-xs text-ink-secondary truncate max-w-[50%]">
                {commitMsg}
              </span>
            )}

            {/* Branch -> links to branch on GitHub */}
            <GhLink
              href={branchUrl}
              className="text-[11px] text-ink-muted font-mono bg-ink/5 rounded px-1.5 py-0.5 truncate max-w-32"
              title={`View branch ${run.head_branch}`}
            >
              <span data-testid="workflow-run-branch">{run.head_branch}</span>
            </GhLink>

            {/* SHA -> links to commit */}
            {shortSha && commitUrl && (
              <GhLink href={commitUrl} className="hidden md:inline text-[11px] text-ink-muted font-mono" title="View commit">
                {shortSha}
              </GhLink>
            )}

            <span className="flex-1" />

            {/* Re-run button for failed/cancelled runs */}
            <RerunButton run={run} rerunMutation={rerunMutation} rerunState={rerunState} />

            {/* Direct link to run */}
            <GhLink
              href={run.html_url}
              className="text-[11px] text-ink-muted shrink-0"
              title="View on GitHub"
            >
              view &#8599;
            </GhLink>
          </span>
        </div>
      </div>

      {/* Expanded: job details */}
      {expanded && (
        <div id={`run-jobs-${run.id}`}>
          <JobList owner={owner} repo={repo} runId={run.id} />
        </div>
      )}
    </div>
  );
});

WorkflowRunRow.displayName = 'WorkflowRunRow';
