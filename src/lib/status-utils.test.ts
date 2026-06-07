// src/lib/status-utils.test.ts
import { describe, it, expect } from 'vitest';
import { getStatusBorderClass, getStatusLabel, isQueuedStatus, pickRepresentativeRun, QUEUED_STATUSES } from './status-utils';
import type { GitHubWorkflowRun, WorkflowRunConclusion, WorkflowRunStatus } from '@/lib/github-types';

describe('getStatusBorderClass', () => {
  it('returns border-status-running for in_progress status', () => {
    expect(getStatusBorderClass('in_progress', null)).toBe('border-status-running');
  });

  it('returns border-status-queued for queued/waiting/pending/requested status', () => {
    QUEUED_STATUSES.forEach(status => {
      expect(getStatusBorderClass(status, null)).toBe('border-status-queued');
    });
  });

  describe('completed status', () => {
    const testCases: [WorkflowRunConclusion, string][] = [
      ['success', 'border-status-success'],
      ['failure', 'border-status-failure'],
      ['cancelled', 'border-status-cancelled'],
      ['timed_out', 'border-status-failure'],
      ['action_required', 'border-status-queued'],
      ['skipped', 'border-status-cancelled'],
      ['stale', 'border-status-cancelled'],
      [null, 'border-status-cancelled'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ['unknown' as any, 'border-status-cancelled'],
    ];

    testCases.forEach(([conclusion, expected]) => {
      it(`returns ${expected} for conclusion ${conclusion}`, () => {
        expect(getStatusBorderClass('completed', conclusion)).toBe(expected);
      });
    });
  });

  it('returns border-status-cancelled for unknown status', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getStatusBorderClass('unknown' as any, null)).toBe('border-status-cancelled');
  });
});

describe('getStatusLabel', () => {
  it('returns "Running" for in_progress status', () => {
    expect(getStatusLabel('in_progress', null)).toBe('Running');
  });

  it('returns "Queued" for queued/waiting/pending/requested status', () => {
    QUEUED_STATUSES.forEach(status => {
      expect(getStatusLabel(status, null)).toBe('Queued');
    });
  });

  describe('completed status', () => {
    const testCases: [WorkflowRunConclusion, string][] = [
      ['success', 'Passed'],
      ['failure', 'Failed'],
      ['cancelled', 'Cancelled'],
      ['timed_out', 'Timed out'],
      ['action_required', 'Action required'],
      ['skipped', 'Skipped'],
      ['stale', 'Stale'],
      [null, 'Unknown'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ['unknown' as any, 'Unknown'],
    ];

    testCases.forEach(([conclusion, expected]) => {
      it(`returns "${expected}" for conclusion ${conclusion}`, () => {
        expect(getStatusLabel('completed', conclusion)).toBe(expected);
      });
    });
  });

  it('returns "Unknown" for unknown status', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getStatusLabel('unknown' as any, null)).toBe('Unknown');
  });
});

describe('isQueuedStatus', () => {
  it('returns true for all queued statuses', () => {
    const expected: WorkflowRunStatus[] = ['queued', 'waiting', 'pending', 'requested'];
    expected.forEach(status => {
      expect(isQueuedStatus(status)).toBe(true);
    });
  });

  it('returns false for non-queued statuses', () => {
    expect(isQueuedStatus('in_progress')).toBe(false);
    expect(isQueuedStatus('completed')).toBe(false);
    expect(isQueuedStatus('unknown')).toBe(false);
  });
});

describe('pickRepresentativeRun', () => {
  const makeRun = (overrides: Partial<GitHubWorkflowRun> & { id: number; head_sha: string }): GitHubWorkflowRun => ({
    id: overrides.id,
    workflow_id: 1,
    name: `workflow-${overrides.id}`,
    display_title: 'commit',
    status: 'completed',
    conclusion: 'success',
    head_branch: 'main',
    head_sha: overrides.head_sha,
    event: 'push',
    created_at: '2026-04-18T10:00:00Z',
    updated_at: '2026-04-18T10:01:00Z',
    run_started_at: '2026-04-18T10:00:00Z',
    html_url: `https://github.com/x/y/actions/runs/${overrides.id}`,
    run_number: overrides.id,
    head_commit: { message: 'commit', author: { name: 'test' } },
    triggering_actor: { login: 'test', avatar_url: '' },
    pull_requests: [],
    ...overrides,
  });

  it('returns null for empty or undefined input', () => {
    expect(pickRepresentativeRun(undefined)).toBeNull();
    expect(pickRepresentativeRun([])).toBeNull();
  });

  it('returns the single run when there is only one', () => {
    const run = makeRun({ id: 1, head_sha: 'abc' });
    expect(pickRepresentativeRun([run])).toBe(run);
  });

  it('ignores runs from older commits (different head_sha)', () => {
    // Latest commit has a passing build; older commit had a failure.
    // The repo should display the passing run since the failure is stale.
    const passingLatest = makeRun({ id: 10, head_sha: 'newSha' });
    const failingOlder = makeRun({ id: 5, head_sha: 'oldSha', conclusion: 'failure' });
    expect(pickRepresentativeRun([passingLatest, failingOlder])).toBe(passingLatest);
  });

  it('surfaces a failed concurrent build over a passing latest', () => {
    // Two workflows for the same commit; the chronologically latest passed,
    // but a concurrent one failed. Repo should show as failed.
    const passing = makeRun({ id: 10, head_sha: 'sha' });
    const failing = makeRun({ id: 9, head_sha: 'sha', conclusion: 'failure' });
    expect(pickRepresentativeRun([passing, failing])).toBe(failing);
  });

  it('surfaces an in-progress run over a passing one', () => {
    const passing = makeRun({ id: 10, head_sha: 'sha' });
    const running = makeRun({ id: 9, head_sha: 'sha', status: 'in_progress', conclusion: null });
    expect(pickRepresentativeRun([passing, running])).toBe(running);
  });

  it('prioritises failed > running > queued > passed within the same commit', () => {
    const passed = makeRun({ id: 1, head_sha: 'sha' });
    const queued = makeRun({ id: 2, head_sha: 'sha', status: 'queued', conclusion: null });
    const running = makeRun({ id: 3, head_sha: 'sha', status: 'in_progress', conclusion: null });
    const failed = makeRun({ id: 4, head_sha: 'sha', conclusion: 'failure' });

    expect(pickRepresentativeRun([passed, queued])).toBe(queued);
    expect(pickRepresentativeRun([passed, queued, running])).toBe(running);
    expect(pickRepresentativeRun([passed, queued, running, failed])).toBe(failed);
  });

  it('treats waiting/pending/requested status as queued', () => {
    const passed = makeRun({ id: 1, head_sha: 'sha' });
    const waiting = makeRun({ id: 2, head_sha: 'sha', status: 'waiting', conclusion: null });
    expect(pickRepresentativeRun([passed, waiting])).toBe(waiting);
  });

  it('does not pull a failed run from an older commit into the current decision', () => {
    // Latest commit: only an in-progress workflow.
    // Older commit: a failed workflow.
    // Display should be the in-progress one — the failure is from a stale commit.
    const runningOnLatest = makeRun({ id: 10, head_sha: 'newSha', status: 'in_progress', conclusion: null });
    const failedOnOlder = makeRun({ id: 5, head_sha: 'oldSha', conclusion: 'failure' });
    expect(pickRepresentativeRun([runningOnLatest, failedOnOlder])).toBe(runningOnLatest);
  });
});
