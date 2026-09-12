"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseDeviceInfo } from "@/lib/device/client-detection";
import { fetchClientPublicIp } from "@/lib/device/client-ip";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const LAST_RECORDED_TIME_KEY = "navo:last-login-recorded-time";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useLoginRecorder() {
  const isRecordingRef = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    const recordLogin = async (forced = false) => {
      if (isRecordingRef.current) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        const lastRecorded = parseInt(sessionStorage.getItem(LAST_RECORDED_TIME_KEY) || "0", 10);
        const isExpired = Date.now() - lastRecorded > REFRESH_INTERVAL_MS;

        if (!forced && !isExpired && lastRecorded > 0) {
          return;
        }

        isRecordingRef.current = true;

        const [deviceInfo, clientIp] = await Promise.all([
          parseDeviceInfo(),
          fetchClientPublicIp(),
        ]);

        const authProvider = session.user.app_metadata?.provider || "email";

        const res = await fetch("/api/record-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            device: deviceInfo,
            loginResult: "success",
            sessionId: session.access_token,
            authProvider,
            clientIp: clientIp || undefined,
          }),
        });

        if (res.ok) {
          sessionStorage.setItem(LAST_RECORDED_TIME_KEY, String(Date.now()));
        }
      } catch {
        // silently fail - login recording is non-critical
      } finally {
        isRecordingRef.current = false;
      }
    };

    recordLogin();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
          recordLogin(true);
        }
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem(LAST_RECORDED_TIME_KEY);
        }
      }
    );

    // Periodic heartbeat to keep last_seen and active sessions updated
    const interval = setInterval(() => {
      recordLogin();
    }, REFRESH_INTERVAL_MS);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [pathname]);
}


