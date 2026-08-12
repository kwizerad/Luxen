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
import { ShieldCheck, Rocket, Sparkles, Trophy, List } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";
import { isProductionModeEnabled } from "@/lib/supabase/queries";
import Image from "next/image";

export default function Home() {
  const { t } = useLanguage();
  const { openLogin, openSignUp } = useAuthModals();
  const { config } = useBrandingConfig();
  const router = useRouter();
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const [productionMode, setProductionMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void isProductionModeEnabled().then(setProductionMode);
  }, []);

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

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingHeader(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <SiteHeader />
      
      {/* Floating Header */}
      {showFloatingHeader && (
        <div className="fixed top-4 left-4 z-50 bg-card/75 backdrop-blur-[24px] border border-border/20 rounded-[18px] shadow-glass dark:shadow-glass-dark px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative">
              {config.logoUrl ? (
                <Image 
                  src={config.logoUrl} 
                  alt={config.systemName} 
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              ) : (
                <span className="text-primary-foreground font-bold text-sm">{config.logoText}</span>
              )}
            </div>
            <span className="font-bold text-lg tracking-tight">{config.systemName}</span>
          </Link>
        </div>
      )}
      
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
              {productionMode ? t("productionModeWelcome") : t("welcome.description")}
            </p>
            <div className="flex flex-wrap gap-4">
              {productionMode ? (
                <>
                  <Button size="lg" onClick={() => router.push("/dashboard/exam")}>
                    <Trophy className="mr-2 h-4 w-4" />
                    {t("takeExam")}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => router.push("/results")}>
                    <List className="mr-2 h-4 w-4" />
                    {t("liveExamResults")}
                  </Button>
                </>
              ) : null}
              <Button size="lg" variant={productionMode ? "outline" : "default"} onClick={openLogin}>{t("signIn")}</Button>
              <Button size="lg" variant="outline" onClick={openSignUp}>{t("signUp")}</Button>
            </div>
            <div className="flex justify-center pt-2">
              <GoogleOneTap alwaysPrompt />
            </div>
          </div>

          {!productionMode && (
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
                      <Sparkles className="h-5 w-5 text-primary-readable" />
                    </div>
                    {t("simple")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t("simple.description")}</CardDescription>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
