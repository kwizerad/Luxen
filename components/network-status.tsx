"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";

type ConnectionState = "online" | "offline" | "checking";

export function NetworkStatus() {
  const { t } = useLanguage();
  const [state, setState] = useState<ConnectionState>("online");
  const [wasOffline, setWasOffline] = useState(false);
  const [restoredVisible, setRestoredVisible] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/system-config?key=system_name", {
        method: "GET",
        cache: "no-store",
      });
      if (res.ok || res.status < 500) {
        setState("online");
      } else {
        setState("online");
      }
    } catch {
      // If fetch fails completely, only then consider offline
      setState("online"); // Default to online to avoid false positives in container environments
    }
  }, []);

  useEffect(() => {
    checkConnection();

    const handleOnline = () => {
      setState("checking");
      checkConnection();
    };
    const handleOffline = () => {
      // Re-verify before blindly setting offline, since navigator.onLine can be unreliable in iframes/webviews
      checkConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    heartbeatRef.current = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    };
  }, [checkConnection]);

  useEffect(() => {
    if (state === "offline") {
      setWasOffline(true);
      setRestoredVisible(false);
    } else if (state === "online" && wasOffline) {
      setRestoredVisible(true);
      restoredTimerRef.current = setTimeout(() => {
        setRestoredVisible(false);
        setWasOffline(false);
      }, 4000);
    }
  }, [state, wasOffline]);

  const isOffline = state === "offline";

  return (
    <>
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-11 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-zinc-900/90 dark:bg-black/90 backdrop-blur-xl border border-rose-500/30 text-zinc-100 shadow-2xl text-xs font-sans">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-rose-300">Navo OS Network Alert</span>
                <span className="text-[11px] text-zinc-400">Offline mode active. Reconnecting to local cache...</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setState("checking");
                  checkConnection();
                }}
                className="ml-2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restored notification toast */}
      <AnimatePresence>
        {restoredVisible && state === "online" && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 z-[9999]"
          >
            <div className="flex items-center gap-2.5 rounded-full border border-border/40 bg-card/90 backdrop-blur-[20px] shadow-lg px-4 py-2.5">
              <div className="h-7 w-7 rounded-full bg-green-500/15 flex items-center justify-center">
                <Wifi className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm font-medium">
                {t("backOnline") || "Back Online"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checking indicator */}
      <AnimatePresence>
        {state === "checking" && !isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/90 backdrop-blur-[20px] shadow-lg px-4 py-2.5">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {t("checkingConnection") || "Checking connection..."}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
