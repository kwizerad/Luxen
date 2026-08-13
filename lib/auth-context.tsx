"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient, setAdminSessionFlag } from "@/lib/supabase/client";
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

    // Safety timeout: if auth hasn't resolved in 5s, stop blocking the UI
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((
      _event: string,
      session: { user: User | null; access_token?: string; refresh_token?: string; expires_at?: number } | null
    ) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setSession(session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      } : null);
      setLoading(false);

      // Set admin session flag so auth token is stored in sessionStorage (cleared on tab close)
      if (sessionUser && isAdmin(sessionUser as any)) {
        setAdminSessionFlag(true);
      } else if (sessionUser) {
        setAdminSessionFlag(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // When user is resolved, set the admin session flag for storage routing
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading || !user) return;
    if (isAdmin(user as any)) {
      setAdminSessionFlag(true);
    } else {
      setAdminSessionFlag(false);
    }
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
