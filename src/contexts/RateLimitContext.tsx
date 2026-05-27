// src/contexts/RateLimitContext.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  setRateLimitCallback,
  type RateLimitCallback,
} from '@/lib/github-client';

type RateLimitState = {
  remaining: number;
  limit: number;
  /** Unix timestamp (seconds) when the rate limit window resets. */
  reset: number;
}

type RateLimitContextValue = RateLimitState & {
  /**
   * Multiplier that polling intervals should apply:
   * - 1 when remaining > 1000
   * - 2 when remaining is 500-1000
   *
   * Below 500, components should pause polling entirely (check remaining directly).
   */
  rateLimitMultiplier: number;
  /** Callback for manually updating rate-limit state (e.g. from response headers). */
  updateRateLimit: RateLimitCallback;
}

const RateLimitContext = createContext<RateLimitContextValue | null>(null);

const INITIAL_STATE: RateLimitState = {
  remaining: 5000,
  limit: 5000,
  reset: 0,
};

const computeMultiplier = (remaining: number): number => {
  if (remaining > 1000) return 1;
  if (remaining >= 500) return 2;
  // Below 500 the multiplier is still returned as 2, but consumers
  // should check `remaining` directly and pause when < 500.
  return 2;
}

export const RateLimitProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<RateLimitState>(INITIAL_STATE);

  const updateRateLimit: RateLimitCallback = useCallback(
    (info: { remaining: number; limit: number; reset: number }) => {
      setState(info);
    },
    [],
  );

  // Wire the callback into githubFetch on mount, clear on unmount.
  useEffect(() => {
    setRateLimitCallback(updateRateLimit);
    return () => setRateLimitCallback(null);
  }, [updateRateLimit]);

  const value: RateLimitContextValue = useMemo(() => ({
    ...state,
    rateLimitMultiplier: computeMultiplier(state.remaining),
    updateRateLimit,
  }), [state, updateRateLimit]);

  return (
    <RateLimitContext.Provider value={value}>
      {children}
    </RateLimitContext.Provider>
  );
}

export const useRateLimit = (): RateLimitContextValue => {
  const context = useContext(RateLimitContext);
  if (context === null) {
    throw new Error('useRateLimit must be used within a RateLimitProvider');
  }
  return context;
}
