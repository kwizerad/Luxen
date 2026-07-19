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
import { ShieldCheck, Rocket, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";
import Image from "next/image";

export default function Home() {
  const { t } = useLanguage();
  const { openLogin, openSignUp } = useAuthModals();
  const { config } = useBrandingConfig();
  const router = useRouter();
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);

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
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      
      {/* Floating Header */}
      {showFloatingHeader && (
        <div className="fixed top-4 left-4 z-50 bg-background/90 backdrop-blur-md border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md relative">
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
      
      <main className="container mx-auto px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {t("home")}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              {t("welcome")} {t("navo")}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {t("welcome.description")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={openLogin}>{t("signIn")}</Button>
              <Button size="lg" variant="outline" onClick={openSignUp}>{t("signUp")}</Button>
            </div>
            <div className="flex justify-center pt-2">
              <GoogleOneTap />
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {t("secure")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t("secure.description")}</CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  {t("fast")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{t("fast.description")}</CardDescription>
              </CardContent>
            </Card>
            <Card className="border border-border bg-secondary/80 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
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
