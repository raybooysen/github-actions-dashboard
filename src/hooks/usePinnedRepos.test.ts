// src/hooks/usePinnedRepos.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedRepos } from './usePinnedRepos';

describe('usePinnedRepos', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no pinned repos', () => {
    const { result } = renderHook(() => usePinnedRepos());
    expect(result.current.pinnedRepos).toEqual(new Set());
  });

  it('pins a repo', () => {
    const { result } = renderHook(() => usePinnedRepos());
    act(() => result.current.togglePin('acme/api-server'));
    expect(result.current.pinnedRepos.has('acme/api-server')).toBe(true);
    expect(result.current.isPinned('acme/api-server')).toBe(true);
  });

  it('unpins a repo', () => {
    const { result } = renderHook(() => usePinnedRepos());
    act(() => result.current.togglePin('acme/api-server'));
    act(() => result.current.togglePin('acme/api-server'));
    expect(result.current.isPinned('acme/api-server')).toBe(false);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => usePinnedRepos());
    act(() => result.current.togglePin('acme/api-server'));

    const stored = JSON.parse(localStorage.getItem('gh_pinned_repos') ?? '[]');
    expect(stored).toContain('acme/api-server');
  });

  it('loads from localStorage on mount', () => {
    localStorage.setItem('gh_pinned_repos', JSON.stringify(['acme/web-app']));
    const { result } = renderHook(() => usePinnedRepos());
    expect(result.current.isPinned('acme/web-app')).toBe(true);
  });
});
