"use client";

import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface GoogleOneTapProps {
  /**
   * Whether One Tap is active on this page. Set to false on pages where the
   * prompt should never appear (e.g. authenticated-only routes).
   */
  enabled?: boolean;
  /**
   * If true, always attempt to show the prompt on mount, ignoring the
   * client-side dismissal cooldown, and retry after transient Google skips.
   * Use on landing pages where the prompt should always appear for visitors.
   */
  alwaysPrompt?: boolean;
}

/**
 * Google One Tap prompt manager.
 *
 * This component renders nothing visible by default; Google injects the prompt
 * itself. During the sign-in flow it displays a lightweight overlay with a
 * loading spinner so users receive clear feedback while the credential is
 * exchanged for a Supabase session.
 */
export function GoogleOneTap({ enabled = true, alwaysPrompt = false }: GoogleOneTapProps) {
  const { signInWithGoogle, isLoading } = useGoogleAuth();

  useGoogleOneTap({
    onCredential: signInWithGoogle,
    enabled,
    alwaysPrompt,
    retryOnSkip: alwaysPrompt,
    promptDelayMs: 1500,
  });

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
          aria-busy="true"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-xl border"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              Signing you in...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
