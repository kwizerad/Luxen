"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleResendVerification = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setMessage("Verification email sent successfully!");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Check your email to confirm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You&apos;ve successfully signed up. Please check your email to
                confirm your account before signing in.
              </p>
              
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter your email to resend"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                <Button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
                {message && (
                  <p className={`text-sm ${message.includes("success") ? "text-green-500" : "text-red-500"}`}>
                    {message}
                  </p>
                )}
              </div>

              <Button
                onClick={() => router.push("/")}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
