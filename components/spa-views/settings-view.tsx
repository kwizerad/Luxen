"use client";

import { useEffect, useState } from "react";
import { SettingsViewSkeleton } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/client";
import UserSettings from "@/components/user-settings";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { spaCache } from "@/lib/spa-cache";

import { studentCache } from "@/lib/student-cache";

export interface SettingsViewProps {
  navigate?: (view: string, params?: Record<string, string>) => void;
}

export function SettingsView(_props: SettingsViewProps) {
  const { t } = useLanguage();
  const { user: authUser } = useAuth();

  const cacheKey = authUser?.id ? `settings_user_${authUser.id}` : "spa_settings_user";
  const cachedUser =
    (authUser?.id
      ? studentCache.getHot<any>(cacheKey, { tier: "private", userId: authUser.id })
      : null) ||
    spaCache.get<any>(cacheKey) ||
    authUser;
  const [user, setUser] = useState<any>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    const loadUser = async () => {
      if (authUser?.id) {
        const persisted = await studentCache.read<any>(cacheKey, {
          tier: "private",
          userId: authUser.id,
          maxAgeMs: 10 * 60 * 1000,
        });
        if (active && persisted?.data) {
          setUser(persisted.data);
          setLoading(false);
        }
      }

      const supabase = createClient();
      const { data: { user: freshUser } } = await supabase.auth.getUser();

      if (!active || !freshUser) return;

      setUser(freshUser);
      spaCache.set(`settings_user_${freshUser.id}`, freshUser);
      void studentCache.write(`settings_user_${freshUser.id}`, freshUser, {
        tier: "private",
        userId: freshUser.id,
        category: "profile",
      });
      setLoading(false);
    };

    loadUser();
    return () => {
      active = false;
    };
  }, [authUser?.id, cacheKey]);

  if (loading) {
    return <SettingsViewSkeleton />;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div>
        <div className="text-[11px] font-mono tracking-wider text-muted-foreground dark:text-zinc-400 lowercase">
          system preferences · account configuration
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground dark:text-zinc-100">
          {t("personalSettings") || "Personal Settings"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400 font-mono">
          {t("updateProfileDesc") || "Manage your account profile, security credentials, appearance, and language options."}
        </p>
      </div>

      {/* Bento Container for Settings */}
      <div className="rounded-2xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/40 p-4 sm:p-6 shadow-xs">
        <UserSettings
          showPasswordChange={true}
          showUsernameChange={true}
          user={user}
          onUserUpdate={(updatedUser) => {
            setUser(updatedUser);
            const targetId = updatedUser?.id || authUser?.id;
            spaCache.set(targetId ? `settings_user_${targetId}` : "spa_settings_user", updatedUser);
            if (targetId) {
              void studentCache.write(`settings_user_${targetId}`, updatedUser, {
                tier: "private",
                userId: targetId,
                category: "profile",
              });
            }
          }}
        />
      </div>
    </div>
  );
}
