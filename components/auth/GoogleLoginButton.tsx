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

        // Wait for useGoogleOneTap to call initialize() with the nonce +
        // callback before rendering the button. renderButton() uses the
        // configuration from the last initialize() call, so if we render
        // before initialize() the button won't trigger the credential
        // callback. This also ensures the nonce is properly set up.
        await waitForGisInitialized();
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
