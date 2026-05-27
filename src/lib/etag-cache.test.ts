// src/lib/etag-cache.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedEtag, getCachedData, setCacheEntry, clearEtagCache, cacheSize } from './etag-cache';

describe('etag-cache', () => {
  beforeEach(() => {
    clearEtagCache();
  });

  it('stores and retrieves entries', () => {
    setCacheEntry('url1', 'etag1', { foo: 'bar' });
    expect(getCachedEtag('url1')).toBe('etag1');
    expect(getCachedData('url1')).toEqual({ foo: 'bar' });
  });

  it('updates entry and position on set', () => {
    setCacheEntry('url1', 'etag1', 'data1');
    setCacheEntry('url2', 'etag2', 'data2');
    
    // url1 is oldest
    setCacheEntry('url1', 'etag1-new', 'data1-new');
    // url1 should now be newest
    
    // Trigger eviction by filling cache (using a smaller MAX_CACHE_SIZE for test would be better, but we use 100)
    for (let i = 3; i <= 101; i++) {
      setCacheEntry(`url${i}`, `etag${i}`, `data${i}`);
    }
    
    // url2 (the real oldest now) should be evicted, url1 should remain
    expect(getCachedEtag('url2')).toBeUndefined();
    expect(getCachedEtag('url1')).toBe('etag1-new');
  });

  it('evicts oldest entry when limit reached', () => {
    // Fill cache to limit
    for (let i = 1; i <= 100; i++) {
      setCacheEntry(`url${i}`, `etag${i}`, `data${i}`);
    }
    expect(cacheSize()).toBe(100);

    // Add one more
    setCacheEntry('url101', 'etag101', 'data101');
    
    expect(cacheSize()).toBe(100);
    expect(getCachedEtag('url1')).toBeUndefined(); // Oldest evicted
    expect(getCachedEtag('url2')).toBe('etag2');
    expect(getCachedEtag('url101')).toBe('etag101');
  });

  it('updates position on get', () => {
    setCacheEntry('url1', 'etag1', 'data1');
    setCacheEntry('url2', 'etag2', 'data2');
    
    // Access url1 to move it to newest
    getCachedEtag('url1');
    
    // Fill to limit
    for (let i = 3; i <= 101; i++) {
      setCacheEntry(`url${i}`, `etag${i}`, `data${i}`);
    }
    
    expect(getCachedEtag('url2')).toBeUndefined(); // url2 was oldest after getCachedEtag('url1')
    expect(getCachedEtag('url1')).toBe('etag1');
  });
});
