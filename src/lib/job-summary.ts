// src/lib/job-summary.ts
import type { GitHubJob } from './github-types';
import { isQueuedStatus } from './status-utils';

export type JobSummary = {
  total: number;
  passed: number;
  failed: number;
  running: number;
  queued: number;
  skipped: number;
}

export const computeJobSummary = (jobs: GitHubJob[]): JobSummary => {
  const summary: JobSummary = {
    total: jobs.length,
    passed: 0,
    failed: 0,
    running: 0,
    queued: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    if (job.status === 'in_progress') {
      summary.running++;
    } else if (isQueuedStatus(job.status)) {
      summary.queued++;
    } else if (job.conclusion === 'success') {
      summary.passed++;
    } else if (job.conclusion === 'failure' || job.conclusion === 'timed_out') {
      summary.failed++;
    } else {
      summary.skipped++;
    }
  }

  return summary;
}

export const formatJobSummary = (summary: JobSummary): string => {
  const parts: string[] = [];
  if (summary.passed > 0) parts.push(`${summary.passed} passed`);
  if (summary.failed > 0) parts.push(`${summary.failed} failed`);
  if (summary.running > 0) parts.push(`${summary.running} running`);
  if (summary.queued > 0) parts.push(`${summary.queued} queued`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
  return parts.join(', ');
}
