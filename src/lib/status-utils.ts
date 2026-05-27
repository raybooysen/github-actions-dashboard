// src/lib/status-utils.ts

import type { WorkflowRunStatus, WorkflowRunConclusion } from '@/lib/github-types';

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
