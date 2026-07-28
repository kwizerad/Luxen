"use client";

import { useEffect } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useActivityTracker() {
  useEffect(() => {
    const supabase = createClient();
    let isAuthenticated = false;

    const trackActivity = async () => {
      if (!isAuthenticated) return;
      try {
        await fetch("/api/users/track-activity", {
          method: "POST",
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
      if (isAuthenticated) await trackActivity();
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      isAuthenticated = Boolean(session);
    });

    // Track activity on user interactions
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(trackActivity, 5000); // Track every 5 seconds of activity
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Also track periodically every 30 seconds
    const intervalId = setInterval(trackActivity, 30000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      authListener.subscription.unsubscribe();
    };
  }, []);
}
