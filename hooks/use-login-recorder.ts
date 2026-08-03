"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseDeviceInfo } from "@/lib/device/client-detection";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const RECORDED_KEY = "navo:login-recorded";

export function useLoginRecorder() {
  useEffect(() => {
    const supabase = createClient();

    const recordLogin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (sessionStorage.getItem(RECORDED_KEY)) return;

      const deviceInfo = parseDeviceInfo();
      const authProvider = session.user.app_metadata?.provider || "email";

      try {
        const res = await fetch("/api/record-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device: deviceInfo,
            loginResult: "success",
            sessionId: session.access_token,
            authProvider,
          }),
        });
        if (res.ok) {
          sessionStorage.setItem(RECORDED_KEY, "1");
        }
      } catch {
        // silently fail - login recording is non-critical
      }
    };

    recordLogin();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_IN" && session?.user) {
        sessionStorage.removeItem(RECORDED_KEY);
        recordLogin();
      }
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(RECORDED_KEY);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
}
