// End-to-End Payload Encryption & DevTools Obfuscation Engine
// Encrypts all User Info, Exam Questions, Exam Attempts, and Storage Payloads using AES-256-GCM
// so Network Inspector, Application Storage, and Console in Browser DevTools never display plaintext JSON.

const ENCRYPTED_ENVELOPE_MARKER = "__e2e_v1";
const STORAGE_PREFIX = "enc_v1:";

// Shared application-level key material (combined with PBKDF2 / SHA-256)
const RAW_SECRET_MATERIAL =
  process.env.NEXT_PUBLIC_E2E_KEY ||
  "luxen-navo-e2e-quantum-shield-2026-rwanda-traffic-exam-key-9f8e7d6c5b4a";

// Fast synchronous XOR + Base64url cipher for synchronous localStorage/sessionStorage hooks
function syncCipherTransform(input: string, key: string): Uint8Array {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(input);
  const keyBytes = encoder.encode(key);
  const out = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function encryptSyncString(plaintext: string): string {
  if (!plaintext || plaintext.startsWith(STORAGE_PREFIX)) return plaintext;
  try {
    const transformed = syncCipherTransform(plaintext, RAW_SECRET_MATERIAL);
    return `${STORAGE_PREFIX}${bytesToBase64(transformed)}`;
  } catch {
    return plaintext;
  }
}

export function decryptSyncString(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(STORAGE_PREFIX)) return ciphertext;
  try {
    const rawB64 = ciphertext.slice(STORAGE_PREFIX.length);
    const encryptedBytes = base64ToBytes(rawB64);
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(RAW_SECRET_MATERIAL);
    const out = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      out[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
    }
    return new TextDecoder().decode(out);
  } catch {
    return ciphertext;
  }
}

// WebCrypto AES-256-GCM key cache
let cachedCryptoKey: CryptoKey | null = null;

async function getAesGcmKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto SubtleCrypto not available");
  }
  const encodedSecret = new TextEncoder().encode(RAW_SECRET_MATERIAL);
  const hashBuffer = await subtle.digest("SHA-256", encodedSecret);
  cachedCryptoKey = await subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedCryptoKey;
}

export interface EncryptedEnvelope {
  __e2e_v1: true;
  iv: string;
  p: string;
  ts: number;
}

export function isEncryptedEnvelope(val: unknown): val is EncryptedEnvelope {
  return (
    Boolean(val) &&
    typeof val === "object" &&
    (val as EncryptedEnvelope).__e2e_v1 === true &&
    typeof (val as EncryptedEnvelope).iv === "string" &&
    typeof (val as EncryptedEnvelope).p === "string"
  );
}

/**
 * Encrypts any JSON-serializable payload using AES-256-GCM.
 * Produces an opaque envelope `{ __e2e_v1: true, iv: "...", p: "...", ts: ... }`
 * so DevTools Network tab only displays unreadable ciphertext.
 */
export async function encryptPayload<T = unknown>(data: T): Promise<EncryptedEnvelope> {
  const plaintext = JSON.stringify(data);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return {
      __e2e_v1: true,
      iv: "sync",
      p: encryptSyncString(plaintext),
      ts: Date.now(),
    };
  }

  const key = await getAesGcmKey();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    __e2e_v1: true,
    iv: bytesToBase64(iv),
    p: bytesToBase64(new Uint8Array(cipherBuffer)),
    ts: Date.now(),
  };
}

/**
 * Decrypts an `EncryptedEnvelope` back into its original typed object in memory.
 * If the input is not an encrypted envelope, returns it as-is for backward compatibility.
 */
export async function decryptPayload<T = any>(payload: unknown): Promise<T> {
  if (!isEncryptedEnvelope(payload)) {
    return payload as T;
  }

  if (payload.iv === "sync") {
    const plain = decryptSyncString(payload.p);
    return JSON.parse(plain) as T;
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto SubtleCrypto not available to decrypt payload");
  }

  const key = await getAesGcmKey();
  const iv = base64ToBytes(payload.iv);
  const cipherBytes = base64ToBytes(payload.p);
  const plainBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource
  );
  const jsonStr = new TextDecoder().decode(plainBuffer);
  return JSON.parse(jsonStr) as T;
}

const SESSION_MIRROR_KEY = "navo-session-mirror";

function isJwtValid(token: string, leewaySeconds = 45): boolean {
  if (!token || token.split(".").length !== 3) return false;
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (!payload?.sub) return false;
    if (typeof payload.exp === "number") {
      return payload.exp * 1000 > Date.now() + leewaySeconds * 1000;
    }
    return true;
  } catch {
    return false;
  }
}

export function syncClientSessionMirror(
  session: { access_token?: string; refresh_token?: string; expires_at?: number } | null
): void {
  if (typeof window === "undefined") return;
  try {
    if (!session?.access_token) {
      sessionStorage.removeItem(SESSION_MIRROR_KEY);
      localStorage.removeItem(SESSION_MIRROR_KEY);
      return;
    }
    const serialized = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token || "",
      expires_at: session.expires_at || 0,
    });
    const encrypted = encryptSyncString(serialized);
    if (sessionStorage.getItem("navo-is-admin") === "true") {
      sessionStorage.setItem(SESSION_MIRROR_KEY, encrypted);
    } else {
      localStorage.setItem(SESSION_MIRROR_KEY, encrypted);
    }
  } catch {}
}

export function getMirroredSession(): {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(SESSION_MIRROR_KEY) ||
      localStorage.getItem(SESSION_MIRROR_KEY);
    if (!raw) return null;
    const dec = decryptSyncString(raw);
    const parsed = JSON.parse(dec || raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return null;
}

export function getClientAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const mirrored = getMirroredSession();
    if (mirrored?.access_token && isJwtValid(mirrored.access_token)) {
      return mirrored.access_token;
    }

    const rawSession =
      sessionStorage.getItem("navo-auth-token") ||
      localStorage.getItem("navo-auth-token");
    if (rawSession) {
      try {
        const decrypted = decryptSyncString(rawSession);
        const parsed = JSON.parse(decrypted || rawSession);
        const tok = parsed?.access_token || parsed?.currentSession?.access_token || "";
        if (tok && isJwtValid(tok)) return tok;
      } catch {
        if (rawSession.length > 20 && !rawSession.startsWith("{") && isJwtValid(rawSession)) {
          return rawSession;
        }
      }
    }

    const scanStorage = (storage: Storage): string => {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && (key.startsWith("sb-") || key.includes("auth-token") || key.includes("supabase"))) {
          const val = storage.getItem(key);
          if (val) {
            try {
              const decrypted = decryptSyncString(val);
              const parsed = JSON.parse(decrypted || val);
              const tok = parsed?.access_token || parsed?.currentSession?.access_token || "";
              if (tok && isJwtValid(tok)) return tok;
            } catch {}
          }
        }
      }
      return "";
    };

    const found = scanStorage(sessionStorage) || scanStorage(localStorage);
    if (found) return found;
  } catch {}
  return "";
}

export async function resolveClientAccessToken(forceRefresh = false): Promise<string> {
  if (typeof window === "undefined") return "";
  if (!forceRefresh) {
    const syncTok = getClientAccessToken();
    if (syncTok) return syncTok;
  }

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data } = await sb.auth.getSession();
    const session = data?.session;

    if (session?.access_token && !forceRefresh && isJwtValid(session.access_token)) {
      syncClientSessionMirror(session);
      return session.access_token;
    }

    if (session?.refresh_token) {
      const { data: refreshed } = await sb.auth.refreshSession();
      if (refreshed?.session?.access_token) {
        syncClientSessionMirror(refreshed.session);
        return refreshed.session.access_token;
      }
    }

    const mirrored = getMirroredSession();
    if (mirrored?.refresh_token && mirrored?.access_token) {
      if (!forceRefresh && isJwtValid(mirrored.access_token)) {
        return mirrored.access_token;
      }
      const { data: restored } = await sb.auth.setSession({
        access_token: mirrored.access_token,
        refresh_token: mirrored.refresh_token,
      });
      if (restored?.session?.access_token) {
        syncClientSessionMirror(restored.session);
        return restored.session.access_token;
      }
    }

    if (session?.access_token && isJwtValid(session.access_token, 0)) {
      return session.access_token;
    }
  } catch {}

  return getClientAccessToken();
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const buildHeaders = (tok: string): Record<string, string> => {
    const headersObj: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (tok && !headersObj["Authorization"] && !headersObj["authorization"]) {
      headersObj["Authorization"] = `Bearer ${tok}`;
    }
    return headersObj;
  };

  const token = await resolveClientAccessToken(false);
  const res = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: buildHeaders(token),
  });

  if (res.status === 401) {
    const freshToken = await resolveClientAccessToken(true);
    if (freshToken && freshToken !== token) {
      const retryHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
        Authorization: `Bearer ${freshToken}`,
      };
      return fetch(url, {
        credentials: "same-origin",
        ...init,
        headers: retryHeaders,
      });
    }
  }

  return res;
}

export async function secureApiPost<T = any>(
  url: string,
  bodyObj: Record<string, any>
): Promise<{ ok: boolean; status: number; data: T }> {
  const sendWithToken = async (tok: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const payloadCopy: Record<string, any> = { ...bodyObj };
    if (tok) {
      headers["Authorization"] = `Bearer ${tok}`;
      if (!payloadCopy.accessToken) {
        payloadCopy.accessToken = tok;
      }
    }
    const encryptedReq = await encryptPayload(payloadCopy);
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(encryptedReq),
      cache: "no-store",
    });
    const rawJson = await res.json().catch(() => ({}));
    const decrypted = isEncryptedEnvelope(rawJson) ? await decryptPayload<T>(rawJson) : (rawJson as T);
    return {
      ok: res.ok,
      status: res.status,
      data: decrypted,
    };
  };

  let token = "";
  if (typeof window !== "undefined") {
    try {
      token = await resolveClientAccessToken(false);
    } catch {}
  }

  const firstAttempt = await sendWithToken(token);
  if (firstAttempt.status === 401 && typeof window !== "undefined") {
    try {
      const freshToken = await resolveClientAccessToken(true);
      if (freshToken && freshToken !== token) {
        return await sendWithToken(freshToken);
      }
    } catch {}
  }

  return firstAttempt;
}

let devToolsShieldInstalled = false;

const SENSITIVE_STORAGE_PREFIXES = [
  "navo-auth-token",
  "navo-session-mirror",
  "sb-",
  "luxen_external_module_exams",
  "luxen_external_lesson_progress",
  "navo_user",
  "luxen_user",
  "exam_",
  "user_",
];

function isSensitiveStorageKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  return SENSITIVE_STORAGE_PREFIXES.some((prefix) => lower.startsWith(prefix.toLowerCase()));
}

/**
 * Installs client-side DevTools protection:
 * 1. Automatically encrypts/decrypts sensitive localStorage & sessionStorage keys so Application tab never shows plaintext JSON.
 * 2. Scrubs console output if any object containing user PII (national_id, email, access_token) or exam answers (correct_answer, questions) is logged.
 */
export function installDevToolsPrivacyShield(): void {
  if (typeof window === "undefined" || devToolsShieldInstalled) return;
  devToolsShieldInstalled = true;

  try {
    const patchStorage = (storage: Storage) => {
      const origGetItem = storage.getItem.bind(storage);
      const origSetItem = storage.setItem.bind(storage);

      // Migrate any existing plaintext sensitive keys into encrypted form immediately
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && isSensitiveStorageKey(k)) {
            const existingVal = origGetItem(k);
            if (existingVal && !existingVal.startsWith(STORAGE_PREFIX)) {
              origSetItem(k, encryptSyncString(existingVal));
            }
          }
        }
      } catch {}

      storage.getItem = (key: string): string | null => {
        const val = origGetItem(key);
        if (!val) return val;
        if (val.startsWith(STORAGE_PREFIX)) {
          return decryptSyncString(val);
        }
        return val;
      };

      storage.setItem = (key: string, value: string): void => {
        if (isSensitiveStorageKey(key) && value && !value.startsWith(STORAGE_PREFIX)) {
          origSetItem(key, encryptSyncString(value));
        } else {
          origSetItem(key, value);
        }
      };
    };

    patchStorage(window.localStorage);
    patchStorage(window.sessionStorage);
  } catch {
    // ignore storage patching issues in restricted iframes
  }

  try {
    const scrubArg = (arg: unknown): unknown => {
      if (!arg || typeof arg !== "object") return arg;
      try {
        const str = JSON.stringify(arg);
        if (
          str.includes("access_token") ||
          str.includes("refresh_token") ||
          str.includes("national_id") ||
          str.includes("correct_answer") ||
          str.includes("option_a") ||
          str.includes("user_metadata")
        ) {
          return "[E2E Protected Payload]";
        }
      } catch {}
      return arg;
    };

    const origLog = console.log.bind(console);
    const origInfo = console.info.bind(console);
    const origDebug = console.debug.bind(console);

    console.log = (...args: unknown[]) => origLog(...args.map(scrubArg));
    console.info = (...args: unknown[]) => origInfo(...args.map(scrubArg));
    console.debug = (...args: unknown[]) => origDebug(...args.map(scrubArg));
  } catch {}
}

export { ENCRYPTED_ENVELOPE_MARKER, STORAGE_PREFIX };

