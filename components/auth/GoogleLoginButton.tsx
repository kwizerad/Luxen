"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
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
   * Theme override of the rendered Google button.
   * If omitted, automatically reacts to the current Navo OS theme (dark: "filled_black", light: "outline").
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
   * Width of the button in CSS units or pixels.
   * @default "100%"
   */
  width?: string | number;
  /**
   * Optional click handler for analytics or telemetry. GIS still handles authentication.
   */
  onClick?: () => void;
  /**
   * Optional locale override (e.g. "en", "fr").
   */
  locale?: string;
  /**
   * Additional CSS classes for the wrapping element.
   */
  className?: string;
}

/**
 * Renders the official Google Sign-In button tailored for Navo OS.
 *
 * Enhancements:
 * 1. Automatically reacts to light/dark theme switches in real-time ("filled_black" for dark, "outline" for light).
 * 2. Stabilizes the button width so it stays full-width (300px+) even when an active Google account
 *    is detected ("Continue as [Name]") without shrinking or decreasing width.
 * 3. Navo OS glassmorphism wrapper with emerald accent hover borders and smooth rounded corners.
 * 4. In-tab authentication with direct Google ID token verification into Supabase.
 */
export function GoogleLoginButton({
  theme: themeOverride,
  size = "large",
  text = "continue_with",
  shape = "rectangular",
  width = "100%",
  onClick,
  locale,
  className = "",
}: GoogleLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(300);

  // Detect theme from next-themes and fallback to document element
  const { theme: currentTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return resolvedTheme === "dark" || currentTheme === "dark";
  });

  // Keep dark mode state in sync with DOM changes
  useEffect(() => {
    const updateDarkMode = () => {
      const darkActive =
        document.documentElement.classList.contains("dark") ||
        resolvedTheme === "dark" ||
        currentTheme === "dark";
      setIsDark(darkActive);
    };

    updateDarkMode();

    // Observe class attribute changes on <html>
    const observer = new MutationObserver(() => {
      updateDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [resolvedTheme, currentTheme]);

  // Determine effective Google GIS button theme
  const effectiveTheme: GoogleButtonTheme =
    themeOverride ?? (isDark ? "filled_black" : "outline");

  // Measure container width and clamp to Google's accepted range (200 - 400)
  const measureWidth = useCallback(() => {
    if (!wrapperRef.current) return 300;
    const parent = wrapperRef.current.parentElement || wrapperRef.current;
    const measured = parent.clientWidth || 300;
    // GIS requires an integer between 200 and 400
    const clamped = Math.min(400, Math.max(200, Math.floor(measured)));
    setContainerWidth(clamped);
    return clamped;
  }, []);

  useEffect(() => {
    measureWidth();

    if (typeof window !== "undefined" && window.ResizeObserver && wrapperRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        measureWidth();
      });
      resizeObserver.observe(wrapperRef.current);
      if (wrapperRef.current.parentElement) {
        resizeObserver.observe(wrapperRef.current.parentElement);
      }
      return () => resizeObserver.disconnect();
    }
  }, [measureWidth]);

  // Render Google Identity Services button
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

        // Ensure GIS is initialized
        let isInit = false;
        const initPromise = waitForGisInitialized().then(() => {
          isInit = true;
        });
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
                import("@/lib/auth/supabaseGoogle").then(
                  ({ signInWithGoogleToken, syncGoogleUserProfile }) => {
                    signInWithGoogleToken(response.credential!, rawNonce).then(
                      ({ user, error: signInError }) => {
                        if (signInError) {
                          console.error("[GoogleLoginButton] ID token exchange error:", signInError);
                          return;
                        }
                        if (user) {
                          syncGoogleUserProfile(user).then(({ redirectPath }) => {
                            window.location.href = redirectPath;
                          });
                        }
                      }
                    );
                  }
                );
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

        // Clear previous render to prevent duplicate buttons on theme switch
        containerRef.current.innerHTML = "";

        // Determine numerical width for Google GIS API
        const targetNumericWidth =
          typeof width === "number"
            ? Math.min(400, Math.max(200, Math.floor(width)))
            : containerWidth;

        window.google!.accounts.id.renderButton(containerRef.current, {
          theme: effectiveTheme,
          size,
          text,
          shape,
          width: targetNumericWidth,
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
  }, [
    effectiveTheme,
    size,
    text,
    shape,
    width,
    containerWidth,
    locale,
    onClick,
  ]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive text-center w-full"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`navo-google-btn-wrapper relative w-full flex items-center justify-center transition-all duration-200 ${className}`}
    >
      {/* Outer Navo OS frame styling that adapts cleanly to light and dark theme */}
      <div
        className={`relative w-full min-h-[40px] rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200 border shadow-xs ${
          isDark
            ? "bg-[#131314] border-zinc-800/80 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
            : "bg-white border-slate-200/90 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
        }`}
      >
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-xs z-10"
          >
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
          </motion.div>
        )}

        {/* GIS rendered container with full-width enforcement */}
        <div
          ref={containerRef}
          aria-label="Sign in with Google"
          className="navo-google-btn-container w-full min-h-[40px] flex items-center justify-center [&_iframe]:!w-full [&_iframe]:!min-w-full [&_iframe]:!rounded-xl"
        />
      </div>
    </div>
  );
}
