"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.909 3.154-1.908 4.154-1.229 1.229-3.146 2.568-6.932 2.568-5.94 0-10.638-4.806-10.638-10.746s4.698-10.746 10.638-10.746c3.23 0 5.58 1.278 7.23 2.82l2.322-2.322C18.91 1.293 15.93 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c3.75 0 6.58-1.23 8.81-3.56 2.31-2.31 3.03-5.55 3.03-8.23 0-.79-.06-1.54-.18-2.25H12.48z" />
  </svg>
);

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function SignUpForm({
  className,
  onSuccess,
  onSwitchToLogin,
  ...props
}: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            gender: gender,
          },
        },
      });
      if (error) throw error;
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: "google") => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-card backdrop-blur-0">
        <CardHeader>
          <CardTitle className="text-2xl">{t("signUp")}</CardTitle>
          <CardDescription>{t("createAccount")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleSocialSignUp("google")}
                disabled={isLoading}
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t("orContinueWithEmail")}
                </span>
              </div>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">{t("password")}</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gender">{t("gender")}</Label>
                <select
                  id="gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">{t("selectGender")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("creatingAccount") : t("signUp")}
              </Button>
              </div>
            </form>

            <div className="text-center text-sm">
              {t("alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="underline underline-offset-4"
              >
                {t("login")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
