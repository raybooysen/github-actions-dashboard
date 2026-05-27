// src/lib/polling.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { computeRefetchInterval, INTERVAL_ACTIVE, INTERVAL_RECENT, INTERVAL_IDLE } from './polling';

describe('computeRefetchInterval', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns IDLE for undefined runs', () => {
    expect(computeRefetchInterval(undefined)).toBe(INTERVAL_IDLE);
  });

  it('returns IDLE for empty runs', () => {
    expect(computeRefetchInterval([])).toBe(INTERVAL_IDLE);
  });

  it('returns ACTIVE when a run is in_progress', () => {
    const runs = [{ status: 'in_progress' as const, updated_at: new Date().toISOString() }];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_ACTIVE);
  });

  it('returns ACTIVE when a run is queued', () => {
    const runs = [{ status: 'queued' as const, updated_at: new Date().toISOString() }];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_ACTIVE);
  });

  it('returns ACTIVE when a run is waiting', () => {
    const runs = [{ status: 'waiting' as const, updated_at: new Date().toISOString() }];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_ACTIVE);
  });

  it('returns RECENT when latest run completed within 5 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
    const runs = [{ status: 'completed' as const, updated_at: '2026-04-18T11:57:00Z' }];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_RECENT);
  });

  it('returns IDLE when latest run completed over 5 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
    const runs = [{ status: 'completed' as const, updated_at: '2026-04-18T11:50:00Z' }];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_IDLE);
  });

  it('prioritizes ACTIVE over RECENT when both exist', () => {
    const runs = [
      { status: 'completed' as const, updated_at: new Date().toISOString() },
      { status: 'in_progress' as const, updated_at: new Date().toISOString() },
    ];
    expect(computeRefetchInterval(runs)).toBe(INTERVAL_ACTIVE);
  });
});
