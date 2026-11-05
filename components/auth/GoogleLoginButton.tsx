"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import {
  loadGoogleIdentityScript,
  GOOGLE_CLIENT_ID,
} from "@/lib/auth/google";

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
 * Guarantees:
 * 1. Never displays "Continue as [Name]" or user email/avatar inside the form.
 * 2. Renders as a single un-nested button (no cover inside cover).
 * 3. Triggers Google Identity Services authentication seamlessly on click.
 */
export function GoogleLoginButton({
  text = "continue_with",
  onClick,
  className = "",
  label: customLabel,
}: GoogleLoginButtonProps) {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const hiddenGisRef = useRef<HTMLDivElement>(null);

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

  // Mount hidden GIS button as offscreen trigger target
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === "undefined") return;

    let cancelled = false;

    const setupHiddenGis = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !hiddenGisRef.current) return;

        const rawNonce = crypto.randomUUID();
        const nonceBytes = new TextEncoder().encode(rawNonce);
        const hashBuffer = await crypto.subtle.digest("SHA-256", nonceBytes);
        const hashedNonce = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        window.google?.accounts?.id?.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (response?.credential) {
              setIsLoading(true);
              const { signInWithGoogleToken, syncGoogleUserProfile } = await import(
                "@/lib/auth/supabaseGoogle"
              );
              const { user, error } = await signInWithGoogleToken(
                response.credential,
                rawNonce
              );
              if (error) {
                toast.error(error.message || "Google Authentication failed");
                setIsLoading(false);
                return;
              }
              if (user) {
                const { redirectPath } = await syncGoogleUserProfile(user);
                window.location.href = redirectPath;
              }
            } else {
              setIsLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
          ux_mode: "popup",
          nonce: hashedNonce,
          use_fedcm_for_prompt: false,
          itp_support: true,
        });

        if (hiddenGisRef.current) {
          hiddenGisRef.current.innerHTML = "";
          window.google?.accounts?.id?.renderButton(hiddenGisRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: text,
          });
        }
      } catch {
        // Ignore fallback init errors
      }
    };

    setupHiddenGis();

    return () => {
      cancelled = true;
    };
  }, [text]);

  const handleClick = async () => {
    onClick?.();
    setIsLoading(true);

    try {
      // 1. Attempt to click GIS button rendered in offscreen target
      if (hiddenGisRef.current) {
        const gisIframeOrBtn = hiddenGisRef.current.querySelector(
          'div[role="button"], iframe'
        ) as HTMLElement | null;
        if (gisIframeOrBtn) {
          gisIframeOrBtn.click();
          setTimeout(() => setIsLoading(false), 2000);
          return;
        }
      }

      // 2. Direct GIS prompt fallback
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification) => {
          setIsLoading(false);
          if (
            notification.isNotDisplayed?.() ||
            notification.isSkippedMoment?.()
          ) {
            toast.error("Please allow popups to sign in with Google.");
          }
        });
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Off-screen hidden GIS target to capture official Google OAuth tokens */}
      <div
        ref={hiddenGisRef}
        aria-hidden="true"
        className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
      />

      {/* Pristine, custom Navo OS Google Button (No user avatar, no "Continue as Kwizera", no cover-in-cover!) */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full h-10 sm:h-11 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-800/90 hover:bg-slate-50 dark:hover:bg-zinc-800 text-foreground dark:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-2xs hover:border-emerald-500/40 active:scale-[0.99] ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
        ) : (
          <GoogleIcon className="w-4 h-4 shrink-0" />
        )}
        <span>{buttonText}</span>
      </button>
    </>
  );
}
