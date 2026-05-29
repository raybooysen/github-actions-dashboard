// src/lib/status-utils.ts

import type { GitHubWorkflowRun, WorkflowRunStatus, WorkflowRunConclusion } from '@/lib/github-types';

export const QUEUED_STATUSES: ReadonlySet<WorkflowRunStatus> = new Set<WorkflowRunStatus>(['queued', 'waiting', 'pending', 'requested']);

export const isQueuedStatus = (status: string): boolean => (QUEUED_STATUSES as ReadonlySet<string>).has(status);

export type ResolvedStatus = {
  label: string;
  dotClass: string;
  borderClass: string;
  pulse: boolean;
}

/**
 * Consolidates all status-related display logic into a single resolution function.
 */
export const resolveStatus = (
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
): ResolvedStatus => {
  if (status === 'in_progress') {
    return {
      label: 'Running',
      dotClass: 'bg-status-running',
      borderClass: 'border-status-running',
      pulse: true,
    };
  }

  if (isQueuedStatus(status)) {
    return {
      label: 'Queued',
      dotClass: 'bg-status-queued',
      borderClass: 'border-status-queued',
      pulse: false,
    };
  }

  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return { label: 'Passed', dotClass: 'bg-status-success', borderClass: 'border-status-success', pulse: false };
      case 'failure':
        return { label: 'Failed', dotClass: 'bg-status-failure', borderClass: 'border-status-failure', pulse: false };
      case 'cancelled':
        return { label: 'Cancelled', dotClass: 'bg-status-cancelled', borderClass: 'border-status-cancelled', pulse: false };
      case 'timed_out':
        return { label: 'Timed out', dotClass: 'bg-status-failure', borderClass: 'border-status-failure', pulse: false };
      case 'action_required':
        return { label: 'Action required', dotClass: 'bg-status-queued', borderClass: 'border-status-queued', pulse: false };
      case 'skipped':
        return { label: 'Skipped', dotClass: 'bg-status-cancelled', borderClass: 'border-status-cancelled', pulse: false };
      case 'stale':
        return { label: 'Stale', dotClass: 'bg-status-cancelled', borderClass: 'border-status-cancelled', pulse: false };
      default:
        return { label: 'Unknown', dotClass: 'bg-status-cancelled', borderClass: 'border-status-cancelled', pulse: false };
    }
  }

  return { label: 'Unknown', dotClass: 'bg-status-cancelled', borderClass: 'border-status-cancelled', pulse: false };
};

/**
 * Returns the Tailwind border-color class for a given workflow run status/conclusion.
 */
export const getStatusBorderClass = (
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
): string => {
  return resolveStatus(status, conclusion).borderClass;
};

/**
 * Returns a human-readable status label for a given workflow run status/conclusion.
 */
export const getStatusLabel = (
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
): string => {
  return resolveStatus(status, conclusion).label;
};

/**
 * From an array of recent workflow runs (assumed sorted newest-first by
 * created_at, which is the GitHub API's default), returns the run that should
 * represent the repo's current state in the dashboard.
 *
 * Multiple workflows triggered by the same commit (e.g. CI + Deploy + Lint
 * after a merge to main) share a `head_sha` but finish at different times.
 * Surfacing only the literal latest run by `created_at` means a single
 * slow-passing workflow can mask a concurrent failure or in-progress build.
 *
 * Instead, we look at all runs sharing the latest run's `head_sha` — that's
 * the "concurrent build group" — and pick the one with the worst status, in
 * priority order: failed > running > queued > anything else. The returned
 * run drives both the displayed metadata (workflow name, branch, time) and
 * the status badge, so the row tells the user *which* workflow is failing /
 * running, not just that something is.
 */
const runPriority = (run: GitHubWorkflowRun): number => {
  if (run.conclusion === 'failure') return 3;
  if (run.status === 'in_progress') return 2;
  if (isQueuedStatus(run.status)) return 1;
  return 0;
};

export const pickRepresentativeRun = (
  runs: GitHubWorkflowRun[] | undefined,
): GitHubWorkflowRun | null => {
  if (!runs || runs.length === 0) return null;

  const latestSha = runs[0]!.head_sha;
  const concurrentGroup = runs.filter((r) => r.head_sha === latestSha);

  return concurrentGroup.reduce((worst, current) =>
    runPriority(current) > runPriority(worst) ? current : worst,
  );
};
