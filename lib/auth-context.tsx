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

    const handleBeforeUnload = () => {
      sendAdminSignOut();
      clearAuthCookies();
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      sendAdminSignOut();
      clearAuthCookies();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
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
