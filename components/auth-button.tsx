"use client";

import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import { useAuthModals } from "@/lib/auth-modals-context";
import { useLanguage } from "@/lib/language-context";
import { useEffect, useState } from "react";

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { openLogin, openSignUp } = useAuthModals();
  const { t } = useLanguage();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

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
