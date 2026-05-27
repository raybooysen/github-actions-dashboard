// src/lib/job-summary.test.ts
import { describe, it, expect } from 'vitest';
import { computeJobSummary, formatJobSummary, type JobSummary } from './job-summary';
import type { GitHubJob } from './github-types';

const makeSummary = (overrides: Partial<JobSummary> = {}): JobSummary => {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    running: 0,
    queued: 0,
    skipped: 0,
    ...overrides,
  };
};

const makeJob = (overrides: Partial<GitHubJob>): GitHubJob => {
  return {
    id: 1,
    name: 'test',
    status: 'completed',
    conclusion: 'success',
    started_at: '2026-04-18T10:00:00Z',
    completed_at: '2026-04-18T10:05:00Z',
    html_url: 'https://github.com/test/test/actions/runs/1/job/1',
    steps: [],
    ...overrides,
  };
}

describe('computeJobSummary', () => {
  it('counts all-passed jobs', () => {
    const jobs = [
      makeJob({ id: 1, conclusion: 'success' }),
      makeJob({ id: 2, conclusion: 'success' }),
      makeJob({ id: 3, conclusion: 'success' }),
    ];
    const summary = computeJobSummary(jobs);
    expect(summary).toEqual({
      total: 3,
      passed: 3,
      failed: 0,
      running: 0,
      queued: 0,
      skipped: 0,
    });
  });

  it('counts mixed job statuses', () => {
    const jobs = [
      makeJob({ id: 1, conclusion: 'success' }),
      makeJob({ id: 2, conclusion: 'failure' }),
      makeJob({ id: 3, status: 'in_progress', conclusion: null }),
      makeJob({ id: 4, status: 'queued', conclusion: null }),
    ];
    const summary = computeJobSummary(jobs);
    expect(summary).toEqual({
      total: 4,
      passed: 1,
      failed: 1,
      running: 1,
      queued: 1,
      skipped: 0,
    });
  });

  it('counts skipped and cancelled as skipped', () => {
    const jobs = [
      makeJob({ id: 1, conclusion: 'skipped' }),
      makeJob({ id: 2, conclusion: 'cancelled' }),
    ];
    const summary = computeJobSummary(jobs);
    expect(summary.skipped).toBe(2);
  });

  it('returns zero counts for empty array', () => {
    const summary = computeJobSummary([]);
    expect(summary.total).toBe(0);
  });
});

describe('formatJobSummary', () => {
  it('returns an empty string for zero jobs', () => {
    expect(formatJobSummary(makeSummary())).toBe('');
  });

  it('returns only the passed count when all jobs passed', () => {
    expect(formatJobSummary(makeSummary({ total: 5, passed: 5 }))).toBe('5 passed');
  });

  it('returns only the failed count when all jobs failed', () => {
    expect(formatJobSummary(makeSummary({ total: 3, failed: 3 }))).toBe('3 failed');
  });

  it('returns counts comma-separated in passed/failed/running/queued/skipped order', () => {
    const summary = makeSummary({
      total: 10,
      passed: 2,
      failed: 1,
      running: 3,
      queued: 2,
      skipped: 2,
    });
    expect(formatJobSummary(summary)).toBe(
      '2 passed, 1 failed, 3 running, 2 queued, 2 skipped',
    );
  });

  it('omits zero-count categories from the output', () => {
    const summary = makeSummary({ total: 3, passed: 3, failed: 0 });
    const formatted = formatJobSummary(summary);
    expect(formatted).toBe('3 passed');
    expect(formatted).not.toContain('0 failed');
  });
});
