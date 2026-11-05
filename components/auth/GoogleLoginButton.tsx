"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  loadGoogleIdentityScript,
  waitForGisInitialized,
  GOOGLE_CLIENT_ID,
} from "@/lib/auth/google";

type GoogleButtonTheme = "outline" | "filled_blue" | "filled_black";
type GoogleButtonSize = "large" | "medium" | "small";
type GoogleButtonText = "signin_with" | "signup_with" | "continue_with";
type GoogleButtonShape = "rectangular" | "pill" | "circle" | "square";

interface GoogleLoginButtonProps {
  /**
   * Theme of the rendered Google button.
   * @default "outline"
   */
  theme?: GoogleButtonTheme;
  /**
   * Size of the rendered Google button.
   * @default "large"
   */
  size?: GoogleButtonSize;
  /**
   * Text shown inside the button.
   * @default "continue_with"
   */
  text?: GoogleButtonText;
  /**
   * Shape of the rendered button.
   * @default "rectangular"
   */
  shape?: GoogleButtonShape;
  /**
   * Width of the button in CSS units (e.g. "100%" or 320).
   * @default "100%"
   */
  width?: string | number;
  /**
   * Optional click handler for analytics. GIS still handles the actual login.
   */
  onClick?: () => void;
  /**
   * Optional locale override (e.g. "en").
   */
  locale?: string;
  /**
   * Additional CSS classes for the wrapping element.
   */
  className?: string;
}

/**
 * Renders the official Google Sign-In button using Google Identity Services.
 *
 * The button is rendered inside a container div once the GIS script has loaded.
 * It can be used anywhere a Google button is needed while keeping the styling
 * consistent with Google's brand guidelines.
 */
export function GoogleLoginButton({
  theme = "outline",
  size = "large",
  text = "continue_with",
  shape = "rectangular",
  width = "100%",
  onClick,
  locale,
  className = "",
}: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const render = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !containerRef.current) return;

        // Wait for GIS initialization (from useGoogleOneTap or self-initialize).
        // If One Tap has already called initialize(), waitForGisInitialized resolves immediately.
        // Otherwise, if not initialized within 800ms, initialize directly with a fresh nonce.
        let isInit = false;
        const initPromise = waitForGisInitialized().then(() => { isInit = true; });
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 800));
        await Promise.race([initPromise, timeoutPromise]);

        if (cancelled || !containerRef.current) return;

        if (!isInit && window.google?.accounts?.id) {
          const rawNonce = crypto.randomUUID();
          const nonceBytes = new TextEncoder().encode(rawNonce);
          const hashBuffer = await crypto.subtle.digest("SHA-256", nonceBytes);
          const hashedNonce = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: { credential?: string }) => {
              if (response?.credential) {
                // Forward credential and rawNonce to global signInWithGoogleToken
                import("@/lib/auth/supabaseGoogle").then(({ signInWithGoogleToken, syncGoogleUserProfile }) => {
                  signInWithGoogleToken(response.credential!, rawNonce)
                    .then(({ user, error }) => {
                      if (error) {
                        console.error("[GoogleLoginButton] ID token exchange error:", error);
                        return;
                      }
                      if (user) {
                        syncGoogleUserProfile(user).then(({ redirectPath }) => {
                          window.location.href = redirectPath;
                        });
                      }
                    });
                });
              }
            },
            auto_select: false,
            cancel_on_tap_outside: false,
            context: "signin",
            ux_mode: "popup",
            nonce: hashedNonce,
            use_fedcm_for_prompt: false,
            itp_support: true,
          });
        }

        if (cancelled || !containerRef.current) return;

        window.google!.accounts.id.renderButton(containerRef.current, {
          theme,
          size,
          text,
          shape,
          width,
          locale,
          click_listener: onClick,
        });

        setIsLoading(false);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to render Google button"
          );
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [theme, size, text, shape, width, locale, onClick]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/50"
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </motion.div>
      )}
      <div
        ref={containerRef}
        aria-label="Sign in with Google"
        className="min-h-[40px] w-full"
      />
    </div>
  );
}
