import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

const ADMIN_FLAG_KEY = "navo-is-admin";
const AUTH_TOKEN_KEY = "navo-auth-token";

const customStorage = {
  getItem: (key: string): string | null => {
    // Check sessionStorage first (admin sessions), then localStorage (student sessions)
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    // Admin sessions go to sessionStorage (cleared on tab close)
    // Student sessions go to localStorage (persist across sessions)
    if (sessionStorage.getItem(ADMIN_FLAG_KEY) === "true") {
      sessionStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

export function createClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';
  clientInstance = createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        flowType: "implicit",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: AUTH_TOKEN_KEY,
        storage: customStorage,
      },
      cookieOptions: {
        name: AUTH_TOKEN_KEY,
        priority: "high",
        sameSite: "lax",
        secure: false,
      },
    }
  );

  return clientInstance;
}

export function setAdminSessionFlag(isAdmin: boolean) {
  if (isAdmin) {
    sessionStorage.setItem(ADMIN_FLAG_KEY, "true");
    // Migrate existing token from localStorage to sessionStorage
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } else {
    sessionStorage.removeItem(ADMIN_FLAG_KEY);
    // Migrate back to localStorage if needed
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
}
