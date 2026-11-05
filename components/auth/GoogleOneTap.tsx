"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldCheck, Check, Sparkles, Lock } from "lucide-react";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";

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
  /**
   * Optional custom position override for the explanation badge.
   */
  showExplanationBadge?: boolean;
}

/**
 * Google One Tap prompt manager with Navo Branding and Authentication explainer.
 *
 * Provides custom CSS container handling and a clear, user-friendly overlay
 * explaining the direct, secure 1-click Google authentication without any
 * redirects through third-party domains.
 */
export function GoogleOneTap({
  enabled = true,
  alwaysPrompt = false,
  showExplanationBadge = true,
}: GoogleOneTapProps) {
  const { signInWithGoogle, isLoading } = useGoogleAuth();
  const { config } = useBrandingConfig();
  const { t, language } = useLanguage();
  const [isPromptActive, setIsPromptActive] = useState(false);

  const { isPrompting } = useGoogleOneTap({
    onCredential: signInWithGoogle,
    enabled,
    alwaysPrompt,
    promptDelayMs: 500,
  });

  // Listen to Google One Tap display & dismissal custom events
  useEffect(() => {
    const onDisplayed = () => setIsPromptActive(true);
    const onDismissed = () => setIsPromptActive(false);

    window.addEventListener("google-one-tap-displayed", onDisplayed);
    window.addEventListener("google-one-tap-dismissed", onDismissed);

    return () => {
      window.removeEventListener("google-one-tap-displayed", onDisplayed);
      window.removeEventListener("google-one-tap-dismissed", onDismissed);
    };
  }, []);

  const isRw = language === "rw";
  const isFr = language === "fr";

  const explainerTitle = isRw
    ? "Injira muri Navo mu kanya gato"
    : isFr
    ? "Connexion instantanée à Navo"
    : "Instant 1-Click Sign In to Navo";

  const explainerDesc = isRw
    ? "Koresha konti yawe ya Google kugira ngo winjire muri Navo nta kuyoberezwa ahandi."
    : isFr
    ? "Utilisez votre compte Google pour accéder directement à Navo sans redirection."
    : "Use your Google Account for direct authentication with Navo. Zero third-party redirects.";

  const loadingTitle = isRw
    ? "Kwinjira muri Navo..."
    : isFr
    ? "Connexion à Navo..."
    : "Authenticating with Navo...";

  const loadingDesc = isRw
    ? "Turimo kugenzura konti yawe ya Google..."
    : isFr
    ? "Vérification sécurisée de votre compte Google..."
    : "Directly verifying your Google ID token with Navo...";

  return (
    <>
      {/* Subtle, non-intrusive Navo Brand Helper Banner when One Tap is open */}
      <AnimatePresence>
        {showExplanationBadge && (isPrompting || isPromptActive) && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-3 right-3 sm:right-6 z-[9999] max-w-sm pointer-events-none select-none hidden sm:flex items-center gap-3 p-3 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-emerald-500/30 dark:border-emerald-500/25 shadow-xl backdrop-blur-xl"
            role="status"
            aria-live="polite"
          >
            <div className="relative flex items-center justify-center shrink-0">
              {config.logoUrl ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-emerald-500/30 flex items-center justify-center bg-black/5 dark:bg-white/5">
                  <Image
                    src={config.logoUrl}
                    alt="Navo"
                    width={36}
                    height={36}
                    className="object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                  {config.logoText || "N"}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-background">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>

            <div className="space-y-0.5 text-left pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground dark:text-white">
                  {explainerTitle}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Navo
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {explainerDesc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Loading & Verification Overlay during ID Token Exchange */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
            aria-busy="true"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-sm w-full gap-4 rounded-3xl bg-card/95 dark:bg-zinc-900/95 p-7 shadow-2xl border border-emerald-500/25 dark:border-emerald-500/20 backdrop-blur-2xl"
            >
              {/* Brand Logo Header */}
              <div className="relative flex items-center justify-center">
                {config.logoUrl ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 flex items-center justify-center bg-black/5 dark:bg-white/5 p-1">
                    <Image
                      src={config.logoUrl}
                      alt="Navo"
                      width={64}
                      height={64}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                    {config.logoText || "N"}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-card shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Title & Authentic Navo Direct Sign-In Messaging */}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground dark:text-white">
                  {loadingTitle}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {loadingDesc}
                </p>
              </div>

              {/* Spinner & Security Assurance */}
              <div className="flex items-center gap-2 pt-1">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Direct Navo Authentication
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
