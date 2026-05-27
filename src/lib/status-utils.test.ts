// src/lib/status-utils.test.ts
import { describe, it, expect } from 'vitest';
import { getStatusBorderClass, getStatusLabel, isQueuedStatus, QUEUED_STATUSES } from './status-utils';
import type { WorkflowRunConclusion, WorkflowRunStatus } from '@/lib/github-types';

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
