"use client";

import { useEffect, useState } from "react";
import { SettingsViewSkeleton } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/client";
import UserSettings from "@/components/user-settings";
import { useBrandingConfig } from "@/lib/branding-config";
import Image from "next/image";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Sliders } from "lucide-react";
import { spaCache } from "@/lib/spa-cache";

export interface SettingsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function SettingsView({ navigate }: SettingsViewProps) {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  
  const cachedUser = spaCache.get<any>("spa_settings_user") || authUser;
  const [user, setUser] = useState<any>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      setUser(user);
      spaCache.set("spa_settings_user", user);
      setLoading(false);
    };

    loadUser();
  }, []);

  if (loading) {
    return <SettingsViewSkeleton />;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("back") || t("backToHome") || "Back"}</span>
          </button>
          <span className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase hidden sm:inline-block">
            telemetry · preferences & security
          </span>
        </div>

        <div>
          <div className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase">
            system preferences · account configuration
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-100">
            {t("personalSettings") || "Personal Settings"}
          </h1>
          <p className="mt-1 text-xs text-zinc-400 font-mono">
            {t("updateProfileDesc") || "Manage your account profile, security credentials, appearance, and language options."}
          </p>
        </div>
      </div>

      {/* Bento Container for Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:p-6 backdrop-blur-xs">
        <UserSettings
          showPasswordChange={true}
          showUsernameChange={true}
          user={user}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser);
            spaCache.set("spa_settings_user", updatedUser);
          }}
        />
      </div>
    </div>
  );
}
