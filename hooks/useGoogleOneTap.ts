"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  GOOGLE_CLIENT_ID,
  loadGoogleIdentityScript,
  recordOneTapDismissed,
  isOneTapDismissed,
} from "@/lib/auth/google";

export interface UseGoogleOneTapOptions {
  /**
   * Called with the Google credential (JWT ID token) when the user completes One Tap.
   */
  onCredential: (credential: string) => void;
  /**
   * Disable One Tap entirely (e.g. on authenticated-only pages).
   */
  enabled?: boolean;
  /**
   * Delay before prompting, in milliseconds. Allows the page to settle first.
   */
  promptDelayMs?: number;
  /**
   * If true, always attempt to show the prompt on mount, ignoring the
   * client-side dismissal cooldown. Google's own internal cooldown still
   * applies. Use on landing pages where the prompt should always appear.
   */
  alwaysPrompt?: boolean;
  /**
   * When true, retry the prompt after Google skips it (e.g. transient
   * unavailability or warm-up). Up to `maxRetries` times with
   * `retryDelayMs` between attempts.
   */
  retryOnSkip?: boolean;
  /**
   * Maximum number of retry attempts after a skip. Default 3.
   */
  maxRetries?: number;
  /**
   * Delay between retry attempts in milliseconds. Default 2000.
   */
  retryDelayMs?: number;
}

/**
 * Hook that initializes and manages the Google One Tap prompt lifecycle.
 *
 * - Loads the GIS script once.
 * - Initializes One Tap with the application callback.
 * - Prompts only when the user is not authenticated and has not recently
 *   dismissed the prompt.
 * - Cancels the prompt on unmount or when the user becomes authenticated.
 * - Respects Google's cooldown and dismissal behavior.
 */
export function useGoogleOneTap({
  onCredential,
  enabled = true,
  promptDelayMs = 1200,
  alwaysPrompt = false,
  retryOnSkip = false,
  maxRetries = 3,
  retryDelayMs = 2000,
}: UseGoogleOneTapOptions) {
  const { user, loading: authLoading } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const onCredentialRef = useRef(onCredential);

  // Keep the callback fresh without re-triggering script initialization.
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  // Initialize Google Identity Services once when enabled.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!GOOGLE_CLIENT_ID) {
      setScriptError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled) return;

        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onCredentialRef.current(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
          context: "signin",
          ux_mode: "popup",
          // Opt into FedCM (Federated Credential Management). Google is making
          // FedCM mandatory for One Tap; without this the gsi/status endpoint
          // can return 403 and the prompt may not appear.
          use_fedcm_for_prompt: true,
        });

        if (!cancelled) {
          setGoogleReady(true);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setScriptError(
            err instanceof Error ? err.message : "Failed to load Google Identity Services"
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Final cleanup: cancel any visible prompt. We intentionally do NOT remove
  // the GIS script here — removing it on every unmount races with React Strict
  // Mode's mount→unmount→remount cycle in dev and can leave
  // `window.google.accounts.id` undefined on remount, preventing the prompt.
  // The script is a singleton that is safe to keep for the page lifetime.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  // Show One Tap once the script is ready and the user is confirmed unauthenticated.
  useEffect(() => {
    if (!enabled || !googleReady || authLoading || user) return;
    if (typeof window === "undefined") return;
    // In alwaysPrompt mode we ignore our own cooldown; Google's internal
    // cooldown still applies and will surface as a skip moment.
    if (!alwaysPrompt && isOneTapDismissed()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let retryCount = 0;

    const schedulePrompt = (delayMs: number) => {
      timer = setTimeout(() => {
        if (cancelled || user) return;

        window.google!.accounts.id.prompt((notification) => {
          if (cancelled) return;

          if (notification.isDismissedMoment()) {
            // Real user dismissal — record our cooldown so other pages
            // (and this page on a later visit) respect it.
            recordOneTapDismissed();
            setIsPrompting(false);
            return;
          }

          // Skipped by Google (transient). Optionally retry; Google's own
          // cooldown will continue to skip if it's not ready.
          if (
            notification.isSkippedMoment() &&
            retryOnSkip &&
            retryCount < maxRetries
          ) {
            retryCount += 1;
            schedulePrompt(retryDelayMs);
          } else {
            setIsPrompting(false);
          }
        });

        setIsPrompting(true);
      }, delayMs);
    };

    schedulePrompt(promptDelayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    enabled,
    googleReady,
    authLoading,
    user,
    promptDelayMs,
    alwaysPrompt,
    retryOnSkip,
    maxRetries,
    retryDelayMs,
  ]);

  // Cancel the prompt as soon as the user authenticates.
  useEffect(() => {
    if (user && typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
      setIsPrompting(false);
    }
  }, [user]);

  return { scriptLoaded: googleReady, scriptError, isPrompting };
}
