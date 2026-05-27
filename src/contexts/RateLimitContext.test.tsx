// src/contexts/RateLimitContext.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { RateLimitProvider, useRateLimit } from './RateLimitContext';
import { setRateLimitCallback } from '@/lib/github-client';
import React from 'react';

// Mock github-client
vi.mock('@/lib/github-client', () => ({
  setRateLimitCallback: vi.fn(),
}));

describe('RateLimitContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useRateLimit', () => {
    it('throws error when used outside of RateLimitProvider', () => {
      // Suppress console.error for expected throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => renderHook(() => useRateLimit())).toThrow('useRateLimit must be used within a RateLimitProvider');
      
      consoleSpy.mockRestore();
    });

    it('provides initial state when used within RateLimitProvider', () => {
      const { result } = renderHook(() => useRateLimit(), {
        wrapper: RateLimitProvider,
      });

      expect(result.current.remaining).toBe(5000);
      expect(result.current.limit).toBe(5000);
      expect(result.current.rateLimitMultiplier).toBe(1);
    });
  });

  describe('RateLimitProvider', () => {
    it('registers callback with setRateLimitCallback on mount and clears on unmount', () => {
      const { unmount } = render(
        <RateLimitProvider>
          <div>Child</div>
        </RateLimitProvider>
      );

      expect(setRateLimitCallback).toHaveBeenCalledWith(expect.any(Function));
      
      unmount();
      expect(setRateLimitCallback).toHaveBeenLastCalledWith(null);
    });

    it('updates state and multiplier when updateRateLimit is called', () => {
      const { result } = renderHook(() => useRateLimit(), {
        wrapper: RateLimitProvider,
      });

      // Initially multiplier is 1 (remaining 5000)
      expect(result.current.rateLimitMultiplier).toBe(1);

      // Update to threshold where multiplier becomes 2 (remaining 1000)
      React.act(() => {
        result.current.updateRateLimit({ remaining: 1000, limit: 5000, reset: 0 });
      });
      expect(result.current.remaining).toBe(1000);
      expect(result.current.rateLimitMultiplier).toBe(2);

      // Update to below 500
      React.act(() => {
        result.current.updateRateLimit({ remaining: 499, limit: 5000, reset: 0 });
      });
      expect(result.current.remaining).toBe(499);
      expect(result.current.rateLimitMultiplier).toBe(2);
      
      // Update back to high remaining
      React.act(() => {
        result.current.updateRateLimit({ remaining: 1001, limit: 5000, reset: 0 });
      });
      expect(result.current.rateLimitMultiplier).toBe(1);
    });
  });
});
