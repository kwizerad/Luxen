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
   * Called with the Google credential (JWT ID token) and the raw nonce used
   * to initialize the prompt when the user completes One Tap. The nonce must
   * be forwarded to Supabase's signInWithIdToken so Supabase can verify it
   * matches the nonce claim Google embedded in the token.
   */
  onCredential: (credential: string, nonce: string) => void;
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
 *
 * Note: With FedCM enabled, skip-moment notifications are no longer reliable,
 * so retry-on-skip is not supported. Only user dismissals are tracked.
 */
export function useGoogleOneTap({
  onCredential,
  enabled = true,
  promptDelayMs = 1200,
  alwaysPrompt = false,
}: UseGoogleOneTapOptions) {
  const { user, loading: authLoading } = useAuth();
  const [googleReady, setGoogleReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const onCredentialRef = useRef(onCredential);
  // Raw nonce generated for this initialization. Google receives the
  // SHA-256 hash of this value via `initialize({ nonce })` and embeds the
  // hash in the issued ID token. Supabase receives the raw value via
  // signInWithIdToken({ nonce }) and hashes it itself to compare. We keep
  // the raw value here so we can forward it through the credential callback.
  const rawNonceRef = useRef<string>("");

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

        // Generate a fresh nonce for this initialization. crypto.randomUUID
        // is available in all browsers that support FedCM (Chrome 117+).
        const rawNonce = crypto.randomUUID();
        rawNonceRef.current = rawNonce;

        // Hash the nonce with SHA-256 and hex-encode it for Google.
        // Google embeds this hash verbatim in the ID token's `nonce` claim.
        // Supabase's GoTrue computes SHA-256(rawNonce) and encodes it as
        // lowercase hex (fmt.Sprintf("%x", ...)) to compare, so we must use
        // the same hex encoding here — NOT base64url.
        const nonceBytes = new TextEncoder().encode(rawNonce);
        const hashBuffer = await crypto.subtle.digest("SHA-256", nonceBytes);
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) {
              onCredentialRef.current(response.credential, rawNonceRef.current);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
          context: "signin",
          ux_mode: "popup",
          // Forward the hashed nonce so Google includes it in the ID token.
          nonce: hashedNonce,
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

    const schedulePrompt = (delayMs: number) => {
      timer = setTimeout(() => {
        if (cancelled || user) return;

        // With FedCM enabled, only isDismissedMoment() is reliably called.
        // isSkippedMoment() may still fire but without a reason, and
        // isDisplayMoment() is no longer called at all. We keep the callback
        // solely to record user dismissals for our cooldown.
        window.google!.accounts.id.prompt((notification) => {
          if (cancelled) return;

          if (notification.isDismissedMoment()) {
            // Real user dismissal — record our cooldown so other pages
            // (and this page on a later visit) respect it.
            recordOneTapDismissed();
            setIsPrompting(false);
            return;
          }

          setIsPrompting(false);
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
