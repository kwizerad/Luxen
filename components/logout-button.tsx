"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { resetLandingLanguageForAdminLogout } from "@/lib/auth-utils";
import { purgePrivateStudentCache } from "@/lib/student-cache";
import { spaCache } from "@/lib/spa-cache";

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

    spaCache.clear();
    await purgePrivateStudentCache().catch(() => {});
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return <Button onClick={logout}>{t("logout")}</Button>;
}
