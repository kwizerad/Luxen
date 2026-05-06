"use client";

import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";
import { useAuth } from "@/lib/auth-context";
import { useAuthModals } from "@/lib/auth-modals-context";
import { useLanguage } from "@/lib/language-context";

export function AuthButton() {
  const { user, loading } = useAuth();
  const { openLogin, openSignUp } = useAuthModals();
  const { t } = useLanguage();

  if (loading) {
    return <div className="w-20 h-8" />;
  }

  return user ? (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" onClick={() => window.location.href = "/dashboard"}>
        {t("dashboard")}
      </Button>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button size="sm" onClick={openLogin}>{t("signIn")}</Button>
      <Button size="sm" variant="outline" onClick={openSignUp}>{t("createAccount")}</Button>
    </div>
  );
}
