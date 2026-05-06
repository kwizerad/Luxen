"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (callback?: (notification: {
            isNotShown: () => boolean;
            isSkippedMoment: () => boolean;
            getMomentType: () => string;
          }) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  disabled?: boolean;
}

export function GoogleOneTap({ disabled = false }: GoogleOneTapProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    if (disabled || user || typeof window === "undefined") return;

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    let retryCount = 0;
    const maxRetries = 2;

    const loadScript = () => {
      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => {
        retryCount++;
        if (retryCount <= maxRetries) {
          console.warn(`Google Identity Services failed to load, retrying (${retryCount}/${maxRetries})`);
          setTimeout(loadScript, 1000 * retryCount);
        } else {
          console.warn("Google Identity Services unavailable - One Tap sign-in disabled");
          setScriptLoaded(false);
        }
      };
      document.body.appendChild(script);
    };

    loadScript();

    return () => {
      // Don't remove script on unmount to avoid reloading issues
    };
  }, [disabled, user]);

  // Initialize Google One Tap when script is loaded
  useEffect(() => {
    if (!scriptLoaded || disabled || user) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("Google One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID not set");
      return;
    }

    if (typeof window.google === "undefined") {
      console.warn("Google Identity Services not available");
      return;
    }

    const handleCredentialResponse = async (response: { credential: string }) => {
      try {
        const supabase = createClient();

        // Sign in with Google ID token using Supabase
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });

        if (error) {
          console.error("Supabase sign in error:", error);
          toast.error(error.message || "Failed to sign in with Google");
          return;
        }

        if (data.user) {
          toast.success("Signed in successfully!");

          // Check user role and redirect
          const role = data.user.user_metadata?.role;
          const isPrimary = data.user.email === process.env.NEXT_PUBLIC_PRIMARY_ADMIN_EMAIL;

          if (isPrimary || role === "Admin") {
            router.push("/Admin");
          } else {
            router.push("/dashboard");
          }

          router.refresh();
        }
      } catch (error) {
        console.error("Google One Tap sign in error:", error);
        toast.error("An error occurred during sign in");
      }
    };

    // Initialize Google One Tap
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      use_fedcm_for_prompt: true, // Use FedCM for better privacy
    });

    // Show the One Tap prompt
    window.google?.accounts.id.prompt((notification) => {
      if (notification.isNotShown() || notification.isSkippedMoment()) {
        console.log("Google One Tap not shown:", notification.getMomentType());
      }
    });

    return () => {
      // Cancel any pending prompts on unmount
      window.google?.accounts.id.cancel();
    };
  }, [scriptLoaded, disabled, user, router]);

  // Don't render anything if user is logged in or disabled
  if (user || disabled) return null;

  return null;
}
