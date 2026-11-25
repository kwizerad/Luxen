"use client";

/**
 * Navo Persistent Selective-Encrypted Student Data Cache
 *
 * Two-tier architecture:
 *  1. Hot in-memory Map for synchronous 0ms reads during SPA navigation
 *  2. Durable browser IndexedDB ("navo-student-cache") across page refreshes & browser restarts
 *
 * Privacy separation:
 *  - "public"  tier: unencrypted shared educational catalogs (course syllabi, road signs, exam categories)
 *  - "private" tier: AES-256-GCM encrypted user-scoped data (exam history, reviewed questions,
 *                    active exam session, lesson/module progress, dashboard stats & user profile),
 *                    cryptographically bound to the authenticated userId so other accounts cannot decrypt it.
 */

import { spaCache } from "@/lib/spa-cache";

const DB_NAME = "navo-student-cache";
const DB_VERSION = 1;
const STORE_PUBLIC = "public_catalog";
const STORE_PRIVATE = "private_student";
const CACHE_SCHEMA_VERSION = 1;

const HARD_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days retention ceiling
const MAX_LRU_REVIEW_ENTRIES = 25; // Cap cached exam review question sets per user

const RAW_SECRET_MATERIAL =
  process.env.NEXT_PUBLIC_E2E_KEY ||
  "luxen-navo-e2e-quantum-shield-2026-rwanda-traffic-exam-key-9f8e7d6c5b4a";

export type CacheTier = "public" | "private";

export interface PersistentCacheRecord<T> {
  key: string;
  userId?: string;
  schemaVersion: number;
  updatedAt: number;
  lastAccessedAt: number;
  category?: string;
  data: T;
}

interface StoredIndexedRecord {
  key: string;
  userId?: string;
  schemaVersion: number;
  updatedAt: number;
  lastAccessedAt: number;
  category?: string;
  // Present on public records
  data?: unknown;
  // Present on private encrypted records
  iv?: string;
  ciphertext?: string;
}

interface HotMemoryEntry {
  data: unknown;
  updatedAt: number;
  schemaVersion: number;
}

const hotMemory = new Map<string, HotMemoryEntry>();
const userKeyCache = new Map<string, CryptoKey>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let lastKnownUserId: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildHotKey(tier: CacheTier, key: string, userId?: string): string {
  return tier === "private" ? `u:${userId || "anon"}:${key}` : `public:${key}`;
}

function buildStorageKey(tier: CacheTier, key: string, userId?: string): string {
  return tier === "private" ? `u:${userId || "anon"}:${key}` : `public:${key}`;
}

/**
 * Derives a non-exportable AES-256-GCM CryptoKey scoped specifically to `userId`.
 * Records encrypted for User A cannot be decrypted under User B's derived key.
 */
async function getUserCryptoKey(userId: string): Promise<CryptoKey | null> {
  if (!isBrowser() || !globalThis.crypto?.subtle || !userId) return null;
  const cached = userKeyCache.get(userId);
  if (cached) return cached;

  try {
    const material = new TextEncoder().encode(`${RAW_SECRET_MATERIAL}::navo-user::${userId}`);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", material);
    const key = await globalThis.crypto.subtle.importKey(
      "raw",
      digest,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    userKeyCache.set(userId, key);
    return key;
  } catch {
    return null;
  }
}

async function encryptForUser(
  userId: string,
  payload: unknown
): Promise<{ iv: string; ciphertext: string } | null> {
  const cryptoKey = await getUserCryptoKey(userId);
  if (!cryptoKey || !globalThis.crypto?.subtle) return null;

  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      cryptoKey,
      plaintext
    );
    return {
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    };
  } catch {
    return null;
  }
}

async function decryptForUser<T>(
  userId: string,
  ivB64: string,
  cipherB64: string
): Promise<T | null> {
  const cryptoKey = await getUserCryptoKey(userId);
  if (!cryptoKey || !globalThis.crypto?.subtle) return null;

  try {
    const iv = base64ToBytes(ivB64);
    const cipherBytes = base64ToBytes(cipherB64);
    const plainBuffer = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      cryptoKey,
      cipherBytes as BufferSource
    );
    const json = new TextDecoder().decode(plainBuffer);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function openCacheDB(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_PUBLIC)) {
          db.createObjectStore(STORE_PUBLIC, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORE_PRIVATE)) {
          const privStore = db.createObjectStore(STORE_PRIVATE, { keyPath: "key" });
          privStore.createIndex("by_user", "userId", { unique: false });
          privStore.createIndex("by_category", "category", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function getStoreName(tier: CacheTier): string {
  return tier === "private" ? STORE_PRIVATE : STORE_PUBLIC;
}

function idbGet(storeName: string, storageKey: string): Promise<StoredIndexedRecord | null> {
  return openCacheDB().then((db) => {
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(storageKey);
        req.onsuccess = () => resolve((req.result as StoredIndexedRecord) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

function idbPut(storeName: string, record: StoredIndexedRecord): Promise<void> {
  return openCacheDB().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

function idbDelete(storeName: string, storageKey: string): Promise<void> {
  return openCacheDB().then((db) => {
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.delete(storageKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  });
}

/**
 * Enforces LRU cap on cached exam review payloads per user so IndexedDB never grows unbounded.
 */
async function enforceReviewLruCap(userId: string): Promise<void> {
  const db = await openCacheDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PRIVATE, "readwrite");
      const store = tx.objectStore(STORE_PRIVATE);
      const idx = store.index("by_user");
      const req = idx.getAll(userId);

      req.onsuccess = () => {
        const records = ((req.result as StoredIndexedRecord[]) || []).filter(
          (r) => r.category === "exam_review"
        );
        if (records.length <= MAX_LRU_REVIEW_ENTRIES) {
          resolve();
          return;
        }
        records.sort((a, b) => (a.lastAccessedAt || a.updatedAt) - (b.lastAccessedAt || b.updatedAt));
        const excess = records.length - MAX_LRU_REVIEW_ENTRIES;
        for (let i = 0; i < excess; i++) {
          store.delete(records[i].key);
          hotMemory.delete(records[i].key);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const studentCache = {
  /**
   * Synchronous read from the hot in-memory tier. Useful in React initial state.
   */
  getHot<T>(key: string, options: { tier?: CacheTier; userId?: string } = {}): T | null {
    const tier = options.tier || "public";
    if (tier === "private" && !options.userId) return null;
    const hotKey = buildHotKey(tier, key, options.userId);
    const entry = hotMemory.get(hotKey);
    if (!entry) return null;
    if (entry.schemaVersion !== CACHE_SCHEMA_VERSION) {
      hotMemory.delete(hotKey);
      return null;
    }
    if (Date.now() - entry.updatedAt > HARD_MAX_AGE_MS) {
      hotMemory.delete(hotKey);
      return null;
    }
    return entry.data as T;
  },

  /**
   * Async read checking hot memory first, then durable IndexedDB (decrypting private records).
   */
  async read<T>(
    key: string,
    options: { tier?: CacheTier; userId?: string; maxAgeMs?: number } = {}
  ): Promise<{ data: T; updatedAt: number; isStale: boolean } | null> {
    const tier = options.tier || "public";
    const userId = options.userId;
    if (tier === "private" && !userId) return null;

    const hotKey = buildHotKey(tier, key, userId);
    const maxAgeMs = options.maxAgeMs ?? 5 * 60 * 1000;

    const hot = hotMemory.get(hotKey);
    if (hot && hot.schemaVersion === CACHE_SCHEMA_VERSION) {
      const age = Date.now() - hot.updatedAt;
      if (age <= HARD_MAX_AGE_MS) {
        return {
          data: hot.data as T,
          updatedAt: hot.updatedAt,
          isStale: age > maxAgeMs,
        };
      }
      hotMemory.delete(hotKey);
    }

    const storageKey = buildStorageKey(tier, key, userId);
    const storeName = getStoreName(tier);
    const record = await idbGet(storeName, storageKey);
    if (!record) return null;

    const age = Date.now() - (record.updatedAt || 0);
    if (record.schemaVersion !== CACHE_SCHEMA_VERSION || age > HARD_MAX_AGE_MS) {
      void idbDelete(storeName, storageKey);
      return null;
    }

    let decoded: T | null = null;
    if (tier === "private") {
      if (!record.iv || !record.ciphertext || record.userId !== userId) {
        return null;
      }
      decoded = await decryptForUser<T>(userId!, record.iv, record.ciphertext);
      if (decoded === null) {
        void idbDelete(storeName, storageKey);
        return null;
      }
    } else {
      decoded = (record.data as T) ?? null;
    }

    if (decoded === null) return null;

    hotMemory.set(hotKey, {
      data: decoded,
      updatedAt: record.updatedAt,
      schemaVersion: CACHE_SCHEMA_VERSION,
    });

    // Update access timestamp asynchronously for LRU review records
    if (record.category === "exam_review") {
      void idbPut(storeName, {
        ...record,
        lastAccessedAt: Date.now(),
      });
    }

    return {
      data: decoded,
      updatedAt: record.updatedAt,
      isStale: age > maxAgeMs,
    };
  },

  /**
   * Writes data to both hot memory and IndexedDB (encrypting private tier records with AES-256-GCM).
   */
  async write<T>(
    key: string,
    data: T,
    options: { tier?: CacheTier; userId?: string; category?: string } = {}
  ): Promise<void> {
    const tier = options.tier || "public";
    const userId = options.userId;
    if (tier === "private" && !userId) return;

    const now = Date.now();
    const hotKey = buildHotKey(tier, key, userId);
    hotMemory.set(hotKey, {
      data,
      updatedAt: now,
      schemaVersion: CACHE_SCHEMA_VERSION,
    });

    const storageKey = buildStorageKey(tier, key, userId);
    const storeName = getStoreName(tier);

    if (tier === "private") {
      const encrypted = await encryptForUser(userId!, data);
      if (!encrypted) return; // Fail closed for persistence if WebCrypto cannot encrypt private data
      await idbPut(storeName, {
        key: storageKey,
        userId,
        schemaVersion: CACHE_SCHEMA_VERSION,
        updatedAt: now,
        lastAccessedAt: now,
        category: options.category,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      });

      if (options.category === "exam_review" && userId) {
        void enforceReviewLruCap(userId);
      }
    } else {
      await idbPut(storeName, {
        key: storageKey,
        schemaVersion: CACHE_SCHEMA_VERSION,
        updatedAt: now,
        lastAccessedAt: now,
        category: options.category,
        data,
      });
    }
  },

  /**
   * Deletes a single key from both hot memory and IndexedDB.
   */
  async remove(
    key: string,
    options: { tier?: CacheTier; userId?: string } = {}
  ): Promise<void> {
    const tier = options.tier || "public";
    const userId = options.userId;
    const hotKey = buildHotKey(tier, key, userId);
    hotMemory.delete(hotKey);
    const storageKey = buildStorageKey(tier, key, userId);
    await idbDelete(getStoreName(tier), storageKey);
  },

  /**
   * Deletes all private entries whose key contains `keyPrefix` for a user.
   */
  async removeByPrefix(keyPrefix: string, userId: string): Promise<void> {
    if (!userId) return;
    const hotPrefix = `u:${userId}:${keyPrefix}`;
    for (const k of Array.from(hotMemory.keys())) {
      if (k.startsWith(hotPrefix)) {
        hotMemory.delete(k);
      }
    }

    const db = await openCacheDB();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_PRIVATE, "readwrite");
        const store = tx.objectStore(STORE_PRIVATE);
        const idx = store.index("by_user");
        const req = idx.getAllKeys(userId);
        req.onsuccess = () => {
          const keys = (req.result as string[]) || [];
          for (const k of keys) {
            if (typeof k === "string" && k.startsWith(hotPrefix)) {
              store.delete(k);
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  },
};

/**
 * Purges encrypted private cache records and derived cryptographic keys for a user
 * (or all private records if no userId is specified). Public course catalogs are preserved.
 */
export async function purgePrivateStudentCache(userId?: string | null): Promise<void> {
  if (userId) {
    const prefix = `u:${userId}:`;
    for (const k of Array.from(hotMemory.keys())) {
      if (k.startsWith(prefix)) {
        hotMemory.delete(k);
      }
    }
    userKeyCache.delete(userId);
  } else {
    for (const k of Array.from(hotMemory.keys())) {
      if (k.startsWith("u:")) {
        hotMemory.delete(k);
      }
    }
    userKeyCache.clear();
  }

  // Also clear user-bound last-topic resume pointers in localStorage on explicit sign-out/switch
  if (isBrowser()) {
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k === "luxen_last_topic_global" || k.startsWith("luxen_last_topic_"))) {
          keysToClear.push(k);
        }
      }
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  const db = await openCacheDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_PRIVATE, "readwrite");
      const store = tx.objectStore(STORE_PRIVATE);
      if (userId) {
        const idx = store.index("by_user");
        const req = idx.getAllKeys(userId);
        req.onsuccess = () => {
          const keys = (req.result as string[]) || [];
          for (const k of keys) {
            store.delete(k);
          }
        };
      } else {
        store.clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Ensures account transitions never leak previous student hot-memory or storage state.
 */
export function syncActiveStudentCacheUser(nextUserId: string | null): void {
  if (lastKnownUserId && nextUserId && lastKnownUserId !== nextUserId) {
    void purgePrivateStudentCache(lastKnownUserId);
  } else if (lastKnownUserId && !nextUserId) {
    void purgePrivateStudentCache(lastKnownUserId);
  }
  lastKnownUserId = nextUserId;
}

export type CacheInvalidationScope =
  | "dashboard"
  | "exam_history"
  | "exam_meta"
  | "course_progress"
  | "all_private";

export function emitCacheInvalidation(
  scope: CacheInvalidationScope,
  userId?: string | null
): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent("navo-cache-invalidated", {
        detail: { scope, userId: userId || null, timestamp: Date.now() },
      })
    );
  } catch {}
}

export async function invalidateStudentDashboardCache(userId?: string | null): Promise<void> {
  if (!userId) return;
  await studentCache.removeByPrefix("dashboard_bundle", userId);
  emitCacheInvalidation("dashboard", userId);
}

export async function invalidateStudentExamHistoryCache(userId?: string | null): Promise<void> {
  if (!userId) return;
  spaCache.delete(`spa_exam_history_${userId}`);
  spaCache.delete(`spa_exam_history_v2_${userId}`);
  await Promise.all([
    studentCache.remove("exam_history", { tier: "private", userId }),
    studentCache.remove("exam_history_v2", { tier: "private", userId }),
    studentCache.remove("exam_meta", { tier: "private", userId }),
  ]);
  emitCacheInvalidation("exam_history", userId);
}

export async function invalidateStudentCourseProgressCache(
  userId?: string | null,
  language?: string
): Promise<void> {
  if (!userId) return;
  if (language) {
    await studentCache.remove(`course_progress_${language}`, { tier: "private", userId });
  } else {
    await studentCache.removeByPrefix("course_progress_", userId);
  }
  emitCacheInvalidation("course_progress", userId);
}
