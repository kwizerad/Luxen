"use client";

import { useState, useEffect } from "react";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { AnimatePresence } from "framer-motion";
import { NavoOSLoading } from "@/components/auth/navo-os-loading";

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
 * Google One Tap prompt manager with Navo OS Loading animation.
 */
export function GoogleOneTap({
  enabled = true,
  alwaysPrompt = true,
  showExplanationBadge: _showExplanationBadge = true,
}: GoogleOneTapProps) {
  const { signInWithGoogle, isLoading } = useGoogleAuth();
  const [_isPromptActive, setIsPromptActive] = useState(false);

  useGoogleOneTap({
    onCredential: signInWithGoogle,
    enabled,
    alwaysPrompt,
    promptDelayMs: 100,
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

  return (
    <AnimatePresence>
      {isLoading && <NavoOSLoading />}
    </AnimatePresence>
  );
}
