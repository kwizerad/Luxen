"use client";

import { useEffect, useState } from "react";
import { SettingsViewSkeleton } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import UserSettings from "@/components/user-settings";
import { useBrandingConfig } from "@/lib/branding-config";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";

export interface SettingsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function SettingsView({ navigate }: SettingsViewProps) {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);
      setLoading(false);
    };

    loadUser();
  }, []);

  if (loading) {
    return <SettingsViewSkeleton />;
  }

  return (
    <div className="bg-transparent flex justify-center">
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => navigate("home")}
          className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden relative">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={config.systemName} fill unoptimized className="object-cover" sizes="32px" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </button>
      </div>

      <main className="student-page-narrow student-page-no-nav w-full">
        <div className="student-page-header">
          <div>
            <h1 className="student-page-title">{t("personalSettings")}</h1>
            <p className="student-page-description">{t("updateProfileDesc")}</p>
          </div>
        </div>
        <Card className="rounded-[14px] sm:rounded-[24px]">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <UserSettings
              showPasswordChange={true}
              showUsernameChange={true}
              user={user}
              onUserUpdate={(updatedUser) => setUser(updatedUser)}
            />
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
