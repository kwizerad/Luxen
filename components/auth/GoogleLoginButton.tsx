"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { GOOGLE_CLIENT_ID, loadGoogleIdentityScript } from "@/lib/auth/google";

interface GoogleLoginButtonProps {
  /**
   * Text style variant.
   * @default "continue_with"
   */
  text?: "signin_with" | "signup_with" | "continue_with";
  /**
   * Optional button size.
   */
  size?: "large" | "medium" | "small";
  /**
   * Optional button shape.
   */
  shape?: "rectangular" | "pill" | "circle" | "square";
  /**
   * Optional theme override.
   */
  theme?: "outline" | "filled_blue" | "filled_black";
  /**
   * Optional width string/number.
   */
  width?: string | number;
  /**
   * Optional click handler for analytics/events.
   */
  onClick?: () => void;
  /**
   * Additional CSS classes.
   */
  className?: string;
  /**
   * Custom label string override.
   */
  label?: string;
}

/**
 * Official Google 'G' multicolored logo SVG.
 */
export function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Custom Google Sign-In button component for Navo OS.
 *
 * Direct Google Identity Services (GIS) authentication:
 * 1. Authenticates directly on the Navo page tab using Google ID tokens (`signInWithIdToken`).
 * 2. Eliminates redirects through third-party Supabase domains (`mdjvgffzfdxjjnfrrnor.supabase.co`).
 * 3. Never displays "Continue as [Name]" inside the button or card covers.
 */
export function GoogleLoginButton({
  text = "continue_with",
  onClick,
  className = "",
  label: customLabel,
}: GoogleLoginButtonProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle, isLoading: isAuthLoading } = useGoogleAuth();
  const hiddenGisRef = useRef<HTMLDivElement | null>(null);
  const rawNonceRef = useRef<string>("");

  const isRw = language === "rw" || language === "Kinyarwanda";
  const isFr = language === "fr" || language === "French";

  let defaultText = "Continue with Google";
  if (text === "signup_with") {
    defaultText = isRw ? "Iyandikishe na Google" : isFr ? "S'inscrire avec Google" : "Sign up with Google";
  } else if (text === "signin_with") {
    defaultText = isRw ? "Injira na Google" : isFr ? "Se connecter avec Google" : "Sign in with Google";
  } else {
    defaultText = isRw ? "Komeza na Google" : isFr ? "Continuer avec Google" : "Continue with Google";
  }

  const buttonText = customLabel || defaultText;

  // Mount hidden GIS button if GOOGLE_CLIENT_ID exists
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === "undefined") return;

    let cancelled = false;

    const setupGis = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !window.google?.accounts?.id || !hiddenGisRef.current) return;

        const rawNonce = crypto.randomUUID();
        rawNonceRef.current = rawNonce;

        const nonceBytes = new TextEncoder().encode(rawNonce);
        const hashBuffer = await crypto.subtle.digest("SHA-256", nonceBytes);
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (response?.credential) {
              setIsLoading(true);
              await signInWithGoogle(response.credential, rawNonceRef.current);
              setIsLoading(false);
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

        // Render hidden official GIS button into hidden ref for direct popup trigger
        window.google.accounts.id.renderButton(hiddenGisRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 250,
        });
      } catch {
        // Ignore initialization errors
      }
    };

    void setupGis();

    return () => {
      cancelled = true;
    };
  }, [signInWithGoogle]);

  const fallbackToSupabaseOAuth = async () => {
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("[GoogleLoginButton] OAuth error:", error);
        toast.error(error.message || "Failed to sign in with Google");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("[GoogleLoginButton] OAuth exception:", err);
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    onClick?.();
    setIsLoading(true);

    try {
      // 1. Try Google Identity Services (GIS) direct popup / in-page prompt first (No redirect to supabase.co!)
      if (GOOGLE_CLIENT_ID && typeof window !== "undefined" && window.google?.accounts?.id) {
        // Clear Google's client suppression cookie so prompt always displays
        try {
          document.cookie = "g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        } catch {}

        // Try triggering GIS prompt directly
        window.google.accounts.id.prompt((notification) => {
          if (notification.isDisplayed?.()) {
            setIsLoading(false);
            return;
          }

          // If prompt was skipped or not displayed, try clicking the hidden rendered GIS iframe button
          if (
            (notification.isNotDisplayed?.() || notification.isSkippedMoment?.() || notification.isDismissedMoment?.()) &&
            hiddenGisRef.current
          ) {
            const gisIframeButton = hiddenGisRef.current.querySelector<HTMLElement>("div[role='button'], iframe, button");
            if (gisIframeButton) {
              gisIframeButton.click();
              setIsLoading(false);
              return;
            }
          }

          // Fallback to Supabase OAuth if GIS is completely blocked
          void fallbackToSupabaseOAuth();
        });

        // Safety timeout to reset loading spinner if user dismisses without callback
        setTimeout(() => {
          setIsLoading(false);
        }, 4000);
        return;
      }

      // 2. Fallback to Supabase OAuth if GIS is unavailable
      await fallbackToSupabaseOAuth();
    } catch (err) {
      console.error("[GoogleLoginButton] Login exception:", err);
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isAuthLoading}
        className={`w-full h-10 sm:h-11 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 text-foreground dark:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs hover:border-emerald-500/40 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading || isAuthLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
        ) : (
          <GoogleIcon className="w-4 h-4 shrink-0" />
        )}
        <span>{buttonText}</span>
      </button>

      {/* Hidden rendered Google GIS button for direct popup click without domain redirect */}
      <div
        ref={hiddenGisRef}
        aria-hidden="true"
        className="hidden pointer-events-none opacity-0 w-0 h-0 overflow-hidden absolute -top-[9999px] -left-[9999px]"
      />
    </>
  );
}
