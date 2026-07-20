"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  GOOGLE_CLIENT_ID,
  loadGoogleIdentityScript,
  recordOneTapDismissed,
  isOneTapDismissed,
  removeGoogleIdentityScript,
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
}: UseGoogleOneTapOptions) {
  const { user, loading: authLoading } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const onCredentialRef = useRef(onCredential);
  const promptShownRef = useRef(false);

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
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
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

  // Final cleanup: cancel any visible prompt and remove the injected script.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      removeGoogleIdentityScript();
    };
  }, []);

  // Show One Tap once the script is ready and the user is confirmed unauthenticated.
  useEffect(() => {
    if (!enabled || !googleReady || authLoading || user) return;
    if (typeof window === "undefined") return;
    if (isOneTapDismissed() || promptShownRef.current) return;

    const timer = setTimeout(() => {
      if (promptShownRef.current || user) return;

      window.google!.accounts.id.prompt((notification) => {
        if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
          recordOneTapDismissed();
        }
      });

      promptShownRef.current = true;
      setIsPrompting(true);
    }, promptDelayMs);

    return () => clearTimeout(timer);
  }, [enabled, googleReady, authLoading, user, promptDelayMs]);

  // Cancel the prompt as soon as the user authenticates.
  useEffect(() => {
    if (user && typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
      setIsPrompting(false);
    }
  }, [user]);

  return { scriptLoaded: googleReady, scriptError, isPrompting };
}
