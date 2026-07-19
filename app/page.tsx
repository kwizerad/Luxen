"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { GoogleOneTap } from "@/components/google-one-tap";
import { useLanguage } from "@/lib/language-context";
import { useAuthModals } from "@/lib/auth-modals-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Rocket, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";

export default function Home() {
  const { t } = useLanguage();
  const { openLogin, openSignUp } = useAuthModals();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if user is admin
        if (isAdmin(session.user)) {
          // Admin users can stay on index page or go to admin panel
          // For now, let them stay on index page
          return;
        } else {
          // Non-admin users go to dashboard
          router.push("/dashboard");
        }
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {t("home")}
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t("welcome")} {t("navo")}
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              {t("welcome.description")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="default" onClick={openLogin}>{t("signIn")}</Button>
              <Button size="default" variant="outline" onClick={openSignUp}>{t("signUp")}</Button>
            </div>
            <div className="flex justify-center pt-2">
              <GoogleOneTap />
            </div>
          </div>

          <div className="grid gap-3">
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {t("secure")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">{t("secure.description")}</CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="h-4 w-4 text-primary" />
                  {t("fast")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">{t("fast.description")}</CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("simple")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">{t("simple.description")}</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
