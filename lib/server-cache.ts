// Lightweight server-side in-memory TTL cache with in-flight request deduplication.
// Safe for shared/public configuration and external question bank snapshots.
// NEVER cache user-specific records, attempts, or auth state here.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const running = inFlight.get(key);
  if (running) {
    return running as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await fetcher();
      store.set(key, {
        value,
        expiresAt: Date.now() + Math.max(0, ttlMs),
      });
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export const CACHE_KEYS = {
  SYSTEM_CONFIG_ALL: "system_config:all",
  EXAM_CATEGORIES_META: "exam_categories:meta",
  EXTERNAL_QUESTIONS_POOL: "external:questions_pool",
  EXTERNAL_CATALOG: "external:catalog",
} as const;
