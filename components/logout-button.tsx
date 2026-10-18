"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
        localStorage.removeItem("navo-is-admin");
        localStorage.removeItem("navo-auth-token");
        document.body.classList.remove("admin-portal-active", "exam-in-progress");
      } catch {}
      window.location.href = "/";
    }
  };

  return <Button onClick={logout}>{t("logout")}</Button>;
}
