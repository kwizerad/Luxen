"use client";

import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/lib/language-context";
import { LoginModal } from "@/components/login-modal";
import { SignUpModal } from "@/components/sign-up-modal";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex items-center justify-center p-4 flex-1">
        <div className="w-full max-w-5xl text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to {t("navo")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("welcome.description")}
          </p>
          <div className="flex gap-4 justify-center">
            <LoginModal size="lg" />
            <SignUpModal size="lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
