// src/lib/time.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDuration, formatRelativeTime } from './time';

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration('2026-04-18T10:00:00Z', '2026-04-18T10:00:45Z')).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration('2026-04-18T10:00:00Z', '2026-04-18T10:02:30Z')).toBe('2m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration('2026-04-18T10:00:00Z', '2026-04-18T11:15:00Z')).toBe('1h 15m');
  });

  it('drops trailing seconds past the 1h boundary (lossy by design)', () => {
    // 4530s elapsed -> 1h 15m 30s in real time, but we render '1h 15m'
    expect(formatDuration('2026-04-18T10:00:00Z', '2026-04-18T11:15:30Z')).toBe('1h 15m');
  });

  it('uses current time when endedAt is omitted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T10:01:00Z'));
    expect(formatDuration('2026-04-18T10:00:00Z')).toBe('1m 0s');
    vi.useRealTimers();
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for times under 60 seconds ago', () => {
    expect(formatRelativeTime('2026-04-18T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(formatRelativeTime('2026-04-18T11:55:00Z')).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatRelativeTime('2026-04-18T10:00:00Z')).toBe('2h ago');
  });

  it('returns days ago', () => {
    expect(formatRelativeTime('2026-04-16T12:00:00Z')).toBe('2d ago');
  });
});
