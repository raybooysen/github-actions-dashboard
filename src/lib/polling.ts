// src/lib/polling.ts
import type { WorkflowRunStatus } from './github-types';

export const INTERVAL_ACTIVE = 10_000;   // 10s -- repos with running/queued jobs
export const INTERVAL_RECENT = 30_000;   // 30s -- repos with recently finished runs
export const INTERVAL_IDLE = 5 * 60_000; // 5m  -- everything else

type PollableRun = {
  status: WorkflowRunStatus;
  updated_at: string;
}

const ACTIVE_STATUSES: ReadonlySet<WorkflowRunStatus> = new Set([
  'in_progress',
  'queued',
  'waiting',
]);

export const computeRefetchInterval = (
  runs: PollableRun[] | undefined,
): number => {
  if (!runs || runs.length === 0) return INTERVAL_IDLE;

  if (runs.some((r) => ACTIVE_STATUSES.has(r.status))) {
    return INTERVAL_ACTIVE;
  }

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (runs.some((r) => new Date(r.updated_at).getTime() > fiveMinutesAgo)) {
    return INTERVAL_RECENT;
  }

  return INTERVAL_IDLE;
};
