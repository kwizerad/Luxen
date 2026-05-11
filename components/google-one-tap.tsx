"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

// Generate a cryptographically secure nonce
const generateNonce = () => {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

// FedCM-compatible notification type
interface PromptNotification {
  getMomentType: () => 'display' | 'skipped' | 'dismissed' | 'displayed';
  isNotShown?: () => boolean; // Deprecated but kept for backwards compatibility
  isSkippedMoment?: () => boolean; // Deprecated but kept for backwards compatibility
  getDismissedReason?: () => string;
}

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
            nonce?: string;
          }) => void;
          prompt: (callback?: (notification: PromptNotification) => void) => void;
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
  const [shouldRender, setShouldRender] = useState(false);
  const nonceRef = useRef<string>("");

  // Filter out non-critical GSI console errors
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalError = console.error;
      console.error = (...args) => {
        const message = args[0];
        if (typeof message === 'string' && 
            (message.includes('[GSI_LOGGER]: Check credential status returns invalid response') ||
             message.includes('GSI_LOGGER'))) {
          // Suppress these non-critical GSI logger messages
          return;
        }
        originalError.apply(console, args);
      };

      return () => {
        console.error = originalError;
      };
    }
  }, []);

  // Load Google Identity Services script and wait for it to initialize
  useEffect(() => {
    if (disabled || user || typeof window === "undefined") return;

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript && window.google) {
      setScriptLoaded(true);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    let pollInterval: NodeJS.Timeout | null = null;

    const checkGoogleReady = () => {
      if (window.google?.accounts?.id) {
        console.log("Google Identity Services initialized");
        setScriptLoaded(true);
        if (pollInterval) clearInterval(pollInterval);
        return true;
      }
      return false;
    };

    const loadScript = () => {
      // Remove existing script if present but not working
      const existing = document.getElementById("google-identity-script");
      if (existing) existing.remove();

      const script = document.createElement("script");
      script.id = "google-identity-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log("Google Identity Services script loaded");
        // Poll for google object to be ready (it takes time to initialize)
        let pollCount = 0;
        const maxPolls = 50; // 5 seconds total (100ms * 50)
        
        pollInterval = setInterval(() => {
          pollCount++;
          if (checkGoogleReady()) {
            return;
          }
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval!);
            console.warn("Google Identity Services failed to initialize after polling");
            setScriptLoaded(false);
          }
        }, 100);
      };
      
      script.onerror = () => {
        retryCount++;
        if (retryCount <= maxRetries) {
          console.warn(`Google Identity Services failed to load, retrying (${retryCount}/${maxRetries})`);
          setTimeout(loadScript, 1500 * retryCount);
        } else {
          console.warn("Google Identity Services unavailable - One Tap sign-in disabled");
          setScriptLoaded(false);
        }
      };
      
      document.head.appendChild(script);
    };

    loadScript();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
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
        // No nonce passed - should work if token has no nonce
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

    // Initialize Google One Tap without nonce
    // This prevents Google from including a nonce in the ID token
    window.google?.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      context: "signin",
      use_fedcm_for_prompt: false, // Disable FedCM to fix nonce issues
    });

    // Show the One Tap prompt with FedCM support
    window.google?.accounts.id.prompt((notification) => {
      try {
        // Use getMomentType() for FedCM compatibility
        const momentType = notification?.getMomentType?.() ?? 'unknown';
        
        // Handle different prompt moments (FedCM compatible)
        switch (momentType) {
          case 'display':
            // One Tap is being displayed - no action needed
            break;
          case 'skipped':
            console.log("Google One Tap skipped by user");
            break;
          case 'dismissed':
            console.log("Google One Tap dismissed");
            break;
          default:
            // Log for debugging but don't rely on deprecated methods
            if (process.env.NODE_ENV === 'development') {
              console.log("Google One Tap moment:", momentType);
            }
        }
      } catch (error) {
        // Silently handle errors - One Tap is optional
        if (process.env.NODE_ENV === 'development') {
          console.debug("Google One Tap notification:", error);
        }
      }
    });

    return () => {
      // Cancel any pending prompts on unmount
      window.google?.accounts.id.cancel();
    };
  }, [scriptLoaded, disabled, user, router]);

  // Check if we should render (after all hooks have run)
  useEffect(() => {
    setShouldRender(!disabled && !user);
  }, [disabled, user]);

  // Don't render anything if user is logged in or disabled
  if (!shouldRender) return null;

  return null;
}
