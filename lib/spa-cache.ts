// Encrypted in-memory data cache for instantaneous SPA navigation without exposing plaintext in DevTools

import { decryptSyncString, encryptSyncString } from "@/lib/e2e-crypto";

interface CacheEntry {
  cipher: string;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute fresh cache, then revalidate in background

export const spaCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(encryptSyncString(key));
    if (!entry) return null;
    try {
      const json = decryptSyncString(entry.cipher);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  },

  isStale(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
    const entry = memoryCache.get(encryptSyncString(key));
    if (!entry) return true;
    return Date.now() - entry.timestamp > ttlMs;
  },

  set<T>(key: string, data: T): void {
    try {
      const cipher = encryptSyncString(JSON.stringify(data));
      memoryCache.set(encryptSyncString(key), {
        cipher,
        timestamp: Date.now(),
      });
    } catch {
      // ignore serialization errors
    }
  },

  delete(key: string): void {
    memoryCache.delete(encryptSyncString(key));
  },

  clear(): void {
    memoryCache.clear();
  },
};

