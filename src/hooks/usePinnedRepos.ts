import { useState, useCallback } from 'react';

const STORAGE_KEY = 'gh_pinned_repos';

const loadPinnedRepos = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

const savePinnedRepos = (pinned: Set<string>): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...pinned]));
}

export const usePinnedRepos = () => {
  const [pinnedRepos, setPinnedRepos] = useState<Set<string>>(loadPinnedRepos);

  const togglePin = useCallback((repoFullName: string) => {
    setPinnedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoFullName)) {
        next.delete(repoFullName);
      } else {
        next.add(repoFullName);
      }
      savePinnedRepos(next);
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (repoFullName: string) => pinnedRepos.has(repoFullName),
    [pinnedRepos],
  );

  return { pinnedRepos, togglePin, isPinned };
}
