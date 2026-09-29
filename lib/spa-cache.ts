// In-memory data cache for instantaneous SPA navigation without loading spinners

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute fresh cache, then revalidate in background

export const spaCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    return entry.data as T;
  },

  isStale(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
    const entry = memoryCache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > ttlMs;
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  delete(key: string): void {
    memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },
};
