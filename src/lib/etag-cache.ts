type CacheEntry = {
  etag: string;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 100;

export const getCachedEtag = (url: string): string | undefined => {
  const entry = cache.get(url);
  if (entry) {
    // LRU touch: re-insert to move to the most-recent end of the Map's iteration order
    cache.delete(url);
    cache.set(url, entry);
  }
  return entry?.etag;
}

export const getCachedData = <T>(url: string): T | undefined => {
  const entry = cache.get(url);
  if (entry) {
    // LRU touch: re-insert to move to the most-recent end of the Map's iteration order
    cache.delete(url);
    cache.set(url, entry);
  }
  return entry?.data as T | undefined;
}

export const setCacheEntry = (url: string, etag: string, data: unknown): void => {
  if (cache.has(url)) {
    // Re-insert so this entry moves to the most-recent end of the Map's iteration order
    cache.delete(url);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest (least-recently used) entry — Map iteration is insertion order
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(url, { etag, data });
}

export const clearEtagCache = (): void => {
  cache.clear();
}

export const cacheSize = (): number => {
  return cache.size;
}
