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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
      return;
    }

    try {
      const supabase = createClient();
      const start = Date.now();
      await supabase.from("system_config").select("key").limit(1).maybeSingle();
      const elapsed = Date.now() - start;

      if (elapsed > 8000) {
        setState("offline");
        return;
      }
      setState("online");
    } catch {
      setState("offline");
    }
  }, []);

  useEffect(() => {
    checkConnection();

    const handleOnline = () => {
      setState("checking");
      checkConnection();
    };
    const handleOffline = () => setState("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    heartbeatRef.current = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      } else {
        setState("offline");
      }
    }, 15000);

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
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 z-[9999]"
          >
            <div className="flex items-center gap-2.5 rounded-full border border-destructive/20 bg-destructive/10 backdrop-blur-[20px] shadow-lg px-4 py-2.5">
              <WifiOff className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                {t("noInternetConnection") || "Offline"}
              </span>
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
