import { createBrowserClient } from "@supabase/ssr";
import {
  decryptPayload,
  decryptSyncString,
  encryptPayload,
  encryptSyncString,
  isEncryptedEnvelope,
} from "@/lib/e2e-crypto";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

const ADMIN_FLAG_KEY = "navo-is-admin";
const AUTH_TOKEN_KEY = "navo-auth-token";

// Sensitive PostgREST tables & endpoints that must always be E2E encrypted over the wire
const E2E_PROTECTED_PATHS = [
  "/rest/v1/user_profiles",
  "/rest/v1/exam_questions",
  "/rest/v1/exam_attempts",
  "/rest/v1/exam_categories",
  "/rest/v1/exam_settings",
  "/rest/v1/exam_challenges",
  "/rest/v1/exam_retake_requests",
  "/rest/v1/user_exam_limits",
  "/rest/v1/module_exam_questions",
  "/rest/v1/module_exam_attempts",
  "/rest/v1/module_exam_settings",
  "/rest/v1/national_id_records",
  "/rest/v1/driver_profiles",
  "/rest/v1/user_devices",
];

function shouldEncryptSupabaseRequest(urlStr: string): {
  shouldProxy: boolean;
  path: string;
  search: string;
} {
  try {
    const parsed = new URL(urlStr);
    const matchesProtected = E2E_PROTECTED_PATHS.some((p) => parsed.pathname.startsWith(p));
    return {
      shouldProxy: matchesProtected,
      path: parsed.pathname,
      search: parsed.search,
    };
  } catch {
    return { shouldProxy: false, path: "", search: "" };
  }
}

async function e2eSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (typeof window !== "undefined") {
    const { shouldProxy, path, search } = shouldEncryptSupabaseRequest(urlStr);
    if (shouldProxy) {
      try {
        const method = init?.method || (input instanceof Request ? input.method : "GET");
        const headersObj: Record<string, string> = {};

        const copyHeaders = (h?: HeadersInit) => {
          if (!h) return;
          if (h instanceof Headers) {
            h.forEach((v, k) => {
              headersObj[k] = v;
            });
          } else if (Array.isArray(h)) {
            for (const [k, v] of h) headersObj[k] = v;
          } else {
            Object.assign(headersObj, h);
          }
        };

        if (input instanceof Request) {
          copyHeaders(input.headers);
        }
        copyHeaders(init?.headers);

        let bodyText: string | undefined;
        if (init?.body && typeof init.body === "string") {
          bodyText = init.body;
        }

        const encryptedReq = await encryptPayload({
          action: "rest_proxy",
          payload: {
            path,
            search,
            method,
            headers: headersObj,
            bodyText,
          },
        });

        const proxyRes = await window.fetch("/api/e2e", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(encryptedReq),
          cache: "no-store",
        });

        if (proxyRes.ok) {
          const rawJson = await proxyRes.json();
          if (isEncryptedEnvelope(rawJson)) {
            const decrypted = await decryptPayload<{
              status: number;
              statusText: string;
              headers: Record<string, string>;
              bodyText: string;
            }>(rawJson);

            return new Response(decrypted.bodyText, {
              status: decrypted.status || 200,
              statusText: decrypted.statusText || "OK",
              headers: decrypted.headers || { "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        // Fallback to standard fetch if offline or proxy unreachable
      }
    }
  }

  return fetch(input, init);
}

const customStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
    if (!raw) return null;
    return decryptSyncString(raw);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    const encrypted = encryptSyncString(value);
    if (sessionStorage.getItem(ADMIN_FLAG_KEY) === "true") {
      sessionStorage.setItem(key, encrypted);
    } else {
      localStorage.setItem(key, encrypted);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  return true;
}

export function createClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-key";
  clientInstance = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: typeof window !== "undefined" ? customStorage : undefined,
      storageKey: AUTH_TOKEN_KEY,
    },
    global: {
      fetch: e2eSupabaseFetch,
    },
    cookieOptions: {
      name: AUTH_TOKEN_KEY,
      priority: "high",
      sameSite: "lax",
      secure: typeof window !== "undefined" ? window.location.protocol === "https:" : false,
    },
  });

  return clientInstance;
}

export function setAdminSessionFlag(isAdmin: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (isAdmin) {
      sessionStorage.setItem(ADMIN_FLAG_KEY, "true");
    } else {
      sessionStorage.removeItem(ADMIN_FLAG_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

