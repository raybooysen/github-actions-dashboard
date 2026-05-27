// src/hooks/useVisibility.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibility } from './useVisibility';

describe('useVisibility', () => {
  let mockObserve: (el: Element) => void;
  let mockDisconnect: () => void;
  let observerCallback: (entries: { isIntersecting: boolean }[]) => void;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    // Mock IntersectionObserver as a class
    class MockObserver {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        observerCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', MockObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false initially', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useVisibility(ref));

    expect(result.current).toBe(false);
  });

  it('observes the element on mount', () => {
    const element = document.createElement('div');
    const ref = { current: element };
    renderHook(() => useVisibility(ref));

    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it('updates visibility when intersection changes', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useVisibility(ref));

    // Initially false
    expect(result.current).toBe(false);

    // Trigger intersection
    act(() => {
      observerCallback([{ isIntersecting: true }]);
    });
    expect(result.current).toBe(true);

    // Trigger non-intersection
    act(() => {
      observerCallback([{ isIntersecting: false }]);
    });
    expect(result.current).toBe(false);
  });

  it('disconnects observer on unmount', () => {
    const ref = { current: document.createElement('div') };
    const { unmount } = renderHook(() => useVisibility(ref));

    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('does nothing if ref is empty', () => {
    const ref = { current: null };
    renderHook(() => useVisibility(ref));

    expect(mockObserve).not.toHaveBeenCalled();
  });
});
