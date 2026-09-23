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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] pointer-events-none"
          >
            {/* Blur overlay */}
            <div className="absolute inset-0 backdrop-blur-md bg-black/30" />

            {/* Centered message */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <div className="pointer-events-auto max-w-md w-full rounded-[24px] border border-border/40 bg-card/90 backdrop-blur-[20px] shadow-2xl p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <WifiOff className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold mb-2">
                  {t("noInternetConnection") || "No Internet Connection"}
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  {t("noInternetDescription") ||
                    "You appear to be offline. Please check your internet connection and try again. The page will automatically restore once the connection is back."}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setState("checking");
                      checkConnection();
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("tryAgain") || "Try Again"}
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("reloadPage") || "Reload Page"}
                  </Button>
                </div>
              </div>
            </motion.div>
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
