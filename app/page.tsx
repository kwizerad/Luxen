"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Rocket, Sparkles } from "lucide-react";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
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
              <Link href="/auth/login">
                <Button size="lg">{t("signIn")}</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button variant="outline" size="lg">{t("createAccount")}</Button>
              </Link>
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
