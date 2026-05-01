"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/language-context";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return <Button onClick={logout}>{t("logout")}</Button>;
}
