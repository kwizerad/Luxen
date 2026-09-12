"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { GoogleOneTap } from "@/components/google-one-tap";
import { useLanguage } from "@/lib/language-context";
import { useAuthModals } from "@/lib/auth-modals-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Rocket, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";

export default function Home() {
  const { t } = useLanguage();
  const { openLogin, openSignUp } = useAuthModals();
  const { config } = useBrandingConfig();
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
          router.replace("/dashboard");
        }
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <SiteHeader />
      
      <main className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-6 animate-fade-in-up">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-readable border border-primary/20">
              {t("home")}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {t("welcome")} <span className="text-primary-readable">{t("navo")}</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
              {t("welcome.description")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={openLogin}>{t("signIn")}</Button>
              <Button size="lg" variant="outline" onClick={openSignUp}>{t("signUp")}</Button>
            </div>
            <div className="flex justify-center pt-2">
              <GoogleOneTap alwaysPrompt />
            </div>
          </div>

          <div className="grid gap-4">
              <Card className="border-border/20 bg-card/50 backdrop-blur-[20px] animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-[12px] bg-primary/10">
                      <ShieldCheck className="h-5 w-5 text-primary-readable" />
                    </div>
                    {t("secure")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("secure.description")}</CardDescription>
                </CardContent>
              </Card>
              <Card className="border-border/20 bg-card/50 backdrop-blur-[20px] animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-[12px] bg-primary/10">
                      <Rocket className="h-5 w-5 text-primary-readable" />
                    </div>
                    {t("fast")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("fast.description")}</CardDescription>
                </CardContent>
              </Card>
              <Card className="border-border/20 bg-card/50 backdrop-blur-[20px] animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-[12px] bg-primary/10">
                      <Zap className="h-5 w-5 text-primary-readable" />
                    </div>
                    {t("simple")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("simple.description")}</CardDescription>
                </CardContent>
              </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
