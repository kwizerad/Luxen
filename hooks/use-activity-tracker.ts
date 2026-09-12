"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useActivityTracker() {
  useEffect(() => {
    const supabase = createClient();
    let isAuthenticated = false;

    const trackActivity = async (action: "update" | "offline" = "update") => {
      if (action === "update" && !isAuthenticated) return;
      try {
        await fetch("/api/users/track-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      } catch {
        // Silently fail - this is non-critical
      }
    };

    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      isAuthenticated = Boolean(session);
      if (isAuthenticated) await trackActivity("update");
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      isAuthenticated = Boolean(session);
      if (event === "SIGNED_OUT") {
        trackActivity("offline");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) trackActivity("update");
      }
    });

    // Track activity on user interactions
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => trackActivity("update"), 5000);
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Also track periodically every 30 seconds
    const intervalId = setInterval(() => trackActivity("update"), 30000);

    // Mark offline when page is closed/unloaded
    const handleBeforeUnload = () => {
      trackActivity("offline");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      authListener.subscription.unsubscribe();
    };
  }, []);
}
