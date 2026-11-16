"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { resetLandingLanguageForAdminLogout } from "@/lib/auth-utils";

export function LogoutButton() {
  const { t } = useLanguage();

  const logout = async () => {
    const isAdminSession =
      typeof window !== "undefined" &&
      (window.location.pathname.toLowerCase().startsWith("/admin") ||
        sessionStorage.getItem("navo-is-admin") === "true");

    if (isAdminSession) {
      resetLandingLanguageForAdminLogout();
      fetch("/api/admin-signout", { method: "POST" }).catch(() => {});
    } else if (typeof window !== "undefined") {
      sessionStorage.removeItem("navo-is-admin");
      sessionStorage.removeItem("navo-auth-token");
      localStorage.removeItem("navo-auth-token");
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return <Button onClick={logout}>{t("logout")}</Button>;
}
