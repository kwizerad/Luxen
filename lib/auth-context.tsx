"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { isAdmin } from "@/lib/permissions";

interface User {
  id: string;
  email: string;
  user_metadata: {
    role?: string;
    [key: string]: any;
  };
}

interface Session {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const supabase = createClient();
      const [userResult, sessionResult] = await Promise.all([
        getCurrentUser(),
        supabase.auth.getSession(),
      ]);
      setUser(userResult as User | null);
      setSession(sessionResult.data.session as Session | null);
    } catch (error: any) {
      // Suppress lock errors - they're internal Supabase timing issues
      if (error?.message?.includes("lock") || error?.message?.includes("Lock")) {
        console.warn("Supabase auth lock error (non-critical):", error.message);
        // Don't set user to null on lock errors - keep existing state
        return;
      }
      console.error("Auth context error:", error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    refreshUser();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: string,
      session: { user: User | null; access_token?: string; refresh_token?: string; expires_at?: number } | null
    ) => {
      setUser(session?.user ?? null);
      setSession(session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      } : null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Destroy admin session when the admin leaves the page (close/refresh/external nav)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading || !user) return;

    const currentUser = { id: user.id, email: user.email, user_metadata: user.user_metadata };
    if (!isAdmin(currentUser as any)) return;

    const clearAuthCookies = () => {
      const prefix = "navo-auth-token";
      document.cookie
        .split("; ")
        .map((cookie) => cookie.split("=")[0])
        .filter((name) => name.startsWith(prefix))
        .forEach((name) => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
    };

    const sendAdminSignOut = () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/admin-signout", JSON.stringify({}));
      }
    };

    // Real, synchronous page close/refresh — always safe to sign out immediately.
    const handleBeforeUnload = () => {
      sendAdminSignOut();
      clearAuthCookies();
    };

    // Fallback for mobile browsers where `beforeunload` is unreliable.
    // Losing focus / switching tabs / backgrounding the app also fires
    // `visibilitychange` (and sometimes `pagehide` with persisted=true),
    // so we debounce and only sign out if the page stays hidden for a
    // sustained period — a strong signal the user actually left/closed it
    // rather than briefly switching tabs or apps.
    const HIDDEN_SIGNOUT_DELAY_MS = 60_000;
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHiddenTimer = () => {
      if (hiddenTimer) {
        clearTimeout(hiddenTimer);
        hiddenTimer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearHiddenTimer();
        hiddenTimer = setTimeout(() => {
          if (document.visibilityState === "hidden") {
            sendAdminSignOut();
            clearAuthCookies();
          }
        }, HIDDEN_SIGNOUT_DELAY_MS);
      } else {
        clearHiddenTimer();
      }
    };

    // NOTE: We intentionally do NOT sign out on `pagehide`. On many mobile
    // browsers `pagehide` fires with `persisted=false` when the app is
    // simply backgrounded/tab-switched away from — not just on real close —
    // which caused admins to be logged out just by losing focus.

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearHiddenTimer();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
