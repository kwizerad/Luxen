"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  signInWithGoogleToken,
  syncGoogleUserProfile,
} from "@/lib/auth/supabaseGoogle";
import { useLanguage } from "@/lib/language-context";

export interface UseGoogleAuthOptions {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function useGoogleAuth(options: UseGoogleAuthOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const processingRef = useRef(false);

  const signInWithGoogle = useCallback(
    async (credential: string, nonce: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await signInWithGoogleToken(credential, nonce);

        if (result.error) {
          throw result.error;
        }

        if (!result.user) {
          throw new Error(t("noSessionFound") || "No user returned from Google sign in");
        }

        const { redirectPath, isNewUser } = await syncGoogleUserProfile(result.user);

        // Refresh the global auth context so the rest of the app sees the new session.
        await refreshUser();

        toast.success(
          isNewUser
            ? t("googleSignInSuccess") || "Account created successfully"
            : t("welcomeBack") || "Welcome back!",
          { duration: 3000 }
        );

        options.onSuccess?.();
        router.push(redirectPath);
      } catch (err: unknown) {
        const rawMessage = err instanceof Error ? err.message : String(err);

        // Map internal errors to user-friendly messages.
        let friendlyMessage =
          t("googleSignInFailed") || "Failed to sign in with Google";

        if (rawMessage.toLowerCase().includes("token")) {
          friendlyMessage = t("sessionVerificationFailed") || "Invalid or expired sign-in token";
        } else if (rawMessage.toLowerCase().includes("network")) {
          friendlyMessage =
            t("errorSomethingWentWrong") || "Network error. Please try again.";
        } else if (rawMessage.toLowerCase().includes("popup")) {
          friendlyMessage = "Popup was blocked. Please allow popups and try again.";
        }

        setError(friendlyMessage);
        toast.error(friendlyMessage);
        options.onError?.(friendlyMessage);
      } finally {
        setIsLoading(false);
        processingRef.current = false;
      }
    },
    [options, refreshUser, router, t]
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signInWithGoogle,
    isLoading,
    error,
    resetError,
  };
}
