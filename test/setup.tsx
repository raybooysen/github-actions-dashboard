// test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './msw-server';
import { clearEtagCache } from '@/lib/etag-cache';
import { setRateLimitCallback } from '@/lib/github-client';

// Node.js v22+ provides a native globalThis.localStorage that shadows jsdom's
// Storage implementation. When --localstorage-file is not provided, the native
// object is a bare object without Storage API methods. We polyfill it here to
// restore the Web Storage interface expected by tests and application code.
const ensureLocalStorage = (): void => {
  const ls = globalThis.localStorage;
  if (ls && typeof ls.clear === 'function') return;

  const store = new Map<string, string>();
  const storage = {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
};

ensureLocalStorage();

// IntersectionObserver is not available in jsdom — mock it globally
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    private callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(el: Element) {
      this.callback(
        [{ isIntersecting: true, target: el, intersectionRatio: 1 } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: MockIntersectionObserver,
    writable: true,
    configurable: true,
  });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  clearEtagCache();
  setRateLimitCallback(null);
});
afterAll(() => server.close());

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));
