"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        console.error("OAuth provider error:", errorParam, errorDescription);
        router.push(`/auth/error?error=${encodeURIComponent(errorDescription || errorParam)}`);
        return;
      }

      try {
        // Wait for Supabase to process session from URL (implicit flow)
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.push("/auth/error?error=No session found");
          return;
        }

        const user = session.user;
        let role = user.user_metadata?.role;

        // Set default role for new OAuth users
        if (!role) {
          const metadata: Record<string, unknown> = { role: "Student" };
          
          const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
          if (avatarUrl) metadata.avatar_url = avatarUrl;
          
          const fullName = user.user_metadata?.full_name;
          if (fullName) {
            metadata.full_name = fullName;
            const parts = fullName.split(' ');
            metadata.first_name = parts[0] || '';
            metadata.last_name = parts.slice(1).join(' ') || '';
          }
          
          if (user.user_metadata?.given_name) metadata.first_name = user.user_metadata.given_name;
          if (user.user_metadata?.family_name) metadata.last_name = user.user_metadata.family_name;
          if (user.user_metadata?.gender) metadata.gender = user.user_metadata.gender;
          if (user.user_metadata?.nationality || user.user_metadata?.country) {
            metadata.nationality = user.user_metadata.nationality || user.user_metadata.country;
          }
          if (user.user_metadata?.birthdate || user.user_metadata?.birthday) {
            metadata.birthdate = user.user_metadata.birthdate || user.user_metadata.birthday;
          }
          
          await supabase.auth.updateUser({ data: metadata });
          role = "Student";
        }

        // Redirect based on role
        if (isPrimaryAdmin(user) || role === "Admin") {
          router.push("/Admin");
        } else {
          router.push("/dashboard");
        }
      } catch (err: unknown) {
        console.error("OAuth callback error:", err);
        const message = err instanceof Error ? err.message : "Authentication failed";
        router.push(`/auth/error?error=${encodeURIComponent(message)}`);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
