"use client";

import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { useLanguage } from "@/lib/language-context";

export default function Page() {
  const { t } = useLanguage();

  return (
    <main className="flex items-center justify-center p-4 h-screen">
      <div className="w-full max-w-5xl text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Welcome to {t("navo")}
        </h1>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <LoginForm />
          <SignUpForm />
        </div>
      </div>
    </main>
  );
}
