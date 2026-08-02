"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
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

        // Wait a bit more for session to be fully propagated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify session is still valid before redirecting
        const { data: { session: verifySession } } = await supabase.auth.getSession();
        if (!verifySession) {
          console.error("Session lost before redirect");
          router.push("/auth/error?error=Session verification failed");
          return;
        }
        
        // Redirect based on role - use window.location for full page load
        if (isPrimaryAdmin(user) || role === "Admin") {
          console.log("Redirecting to /Admin");
          window.location.href = "/Admin";
        } else {
          console.log("Redirecting to /dashboard");
          window.location.href = "/dashboard";
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
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md p-8 space-y-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-md p-8 space-y-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
