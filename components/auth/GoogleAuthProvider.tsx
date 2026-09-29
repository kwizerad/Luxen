"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  GOOGLE_CLIENT_ID,
  loadGoogleIdentityScript,
} from "@/lib/auth/google";

interface GoogleAuthContextType {
  /**
   * True once the Google Identity Services script has loaded and the API is available.
   */
  isReady: boolean;
  /**
   * Any error encountered while loading the GIS script.
   */
  error: string | null;
  /**
   * Trigger the GIS script to load eagerly. Normally called automatically on mount.
   */
  load: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(
  undefined
);

interface GoogleAuthProviderProps {
  children: ReactNode;
  /**
   * If true, the provider will not load the GIS script automatically.
   * Consumers can call `load()` manually when needed.
   */
  lazy?: boolean;
}

/**
 * Global provider for Google Identity Services.
 *
 * Eagerly loads the GIS script (unless `lazy` is set) and exposes a ready state
 * that components can consume. This keeps the script loading deduplicated and
 * centralized while remaining SSR-safe.
 */
export function GoogleAuthProvider({
  children,
  lazy = false,
}: GoogleAuthProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }
    if (typeof window === "undefined") return;

    try {
      await loadGoogleIdentityScript();
      setIsReady(true);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load Google Identity Services"
      );
    }
  }, []);

  useEffect(() => {
    if (lazy) return;
    load();

    return () => {
      // Only cancel the prompt; do not remove the GIS script. Removing the
      // script on every unmount races with React Strict Mode's
      // mount→unmount→remount cycle in dev and can leave
      // `window.google.accounts.id` undefined on remount. The script is a
      // singleton that is safe to keep for the page lifetime.
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [lazy, load]);

  return (
    <GoogleAuthContext.Provider value={{ isReady, error, load }}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function useGoogleAuthContext() {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error(
      "useGoogleAuthContext must be used within a GoogleAuthProvider"
    );
  }
  return context;
}
