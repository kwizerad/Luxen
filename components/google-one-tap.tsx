"use client";

import { useEffect, useState, useRef } from "react";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function GoogleOneTapContent() {
  const [showCard, setShowCard] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      const supabase = createClient();

      // Sign in with the Google ID token
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential!,
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        toast.error("Failed to sign in with Google");
        return;
      }

      if (authData.user) {
        toast.success("Successfully signed in with Google!");
        setShowCard(false);
        setIsAuthenticated(true);
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Failed to sign in with Google");
    }
  };

  const handleGoogleLoginError = () => {
    toast.error("Google login failed");
  };

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      // Check if the card was previously dismissed (persisted in localStorage)
      const wasDismissed = localStorage.getItem('google-one-tap-dismissed') === 'true';
      setDismissed(wasDismissed);

      // Only show the card if not authenticated and not dismissed
      if (!session && !wasDismissed) {
        const timer = setTimeout(() => {
          setShowCard(true);
        }, 2000);

        return () => clearTimeout(timer);
      }
    };

    checkAuth();
  }, []);

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (showCard) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [showCard]);

  const handleDismiss = () => {
    setShowCard(false);
    setDismissed(true);
    // Persist dismissal in localStorage so it never comes back
    localStorage.setItem('google-one-tap-dismissed', 'true');
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {showCard && (
        <div
          ref={cardRef}
          className="fixed z-50 top-4 right-4 w-[280px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-300 google-one-tap-card"
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Sign in with Google</span>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-3 w-3 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-700 font-medium">
                  Continue with Google
                </p>
                <p className="text-[10px] text-gray-500">
                  Sign in to access your account
                </p>
              </div>
            </div>

            <div className="google-login-button">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                type="standard"
                theme="outline"
                size="medium"
                text="continue_with"
                shape="rectangular"
                width="100%"
                useOneTap={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-3 pb-3">
            <p className="text-[10px] text-gray-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function GoogleOneTap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleOneTapContent />
    </GoogleOAuthProvider>
  );
}