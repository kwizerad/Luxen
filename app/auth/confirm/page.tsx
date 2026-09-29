"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleConfirm = async () => {
      const supabase = createClient();
      
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const next = searchParams.get("next") ?? "/";

      if (token_hash && type) {
        try {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type,
            token_hash,
          });
          
          if (!verifyError) {
            // redirect user to specified redirect URL or root of app
            router.push(next);
          } else {
            // redirect the user to an error page with some instructions
            router.push(`/auth/error?error=${encodeURIComponent(verifyError.message)}`);
          }
        } catch (err: any) {
          router.push(`/auth/error?error=${encodeURIComponent(err.message || "Verification failed")}`);
        }
      } else {
        // redirect the user to an error page with some instructions
        router.push("/auth/error?error=No token hash or type provided");
      }
    };

    handleConfirm();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md p-8 space-y-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <Card className="w-full max-w-md p-8 space-y-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
