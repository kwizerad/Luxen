"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, Palette, ImageIcon, Settings2, Shield, Globe, LayoutList, ClipboardList, ChevronRight, Monitor, Volume2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import UserSettings from "@/components/user-settings";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { BrandingCustomizer } from "@/components/branding-customizer";
import { SystemConfigSettings } from "@/components/system-config";
import { TTSManagementCard } from "@/components/admin/tts-management-card";
import { Loader2 } from "lucide-react";
import { ADMIN_CREDENTIALS } from "@/lib/admin-config";
import Link from "next/link";
import Image from "next/image";
import { useBrandingConfig } from "@/lib/branding-config";
import { useThemeConfig } from "@/lib/theme-config";
import { useLanguage } from "@/lib/language-context";
import { canRead, canWrite, type User as PermUser } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSettingsPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const { setIsAdmin: setThemeIsAdmin } = useThemeConfig();
  const { setIsAdmin: setBrandingIsAdmin } = useBrandingConfig();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [hasSettingsPerm, setHasSettingsPerm] = useState(true);
  const [activeTab, setActiveTab] = useState("account");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const loadUser = async () => {
      const user = await (await import("@/lib/auth-utils")).getCurrentUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const permUser = user as PermUser;
      const { isStrictlyStudentEmail } = await import("@/lib/permissions");
      if (isStrictlyStudentEmail(user.email)) {
        router.replace("/dashboard");
        return;
      }
      const isUserPrimary =
        user.email?.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
      const isUserAdmin =
        isUserPrimary ||
        user.role?.toLowerCase() === "admin" ||
        user.user_metadata?.role?.toLowerCase() === "admin";

      if (!isUserAdmin) {
        router.replace("/dashboard");
        return;
      }

      // Set admin flag for both theme and branding config only after confirming admin status
      setThemeIsAdmin(true);
      setBrandingIsAdmin(true);

      setUser(user);

      const canReadSettings = canRead(permUser, "settings");
      setHasSettingsPerm(canReadSettings);
      setReadOnly(!canWrite(permUser, "settings"));
      if (!canReadSettings) {
        setActiveTab("account");
      } else if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab");
        if (tabParam && ["account", "appearance", "exam", "languages", "tts", "services"].includes(tabParam)) {
          setActiveTab(tabParam);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [setThemeIsAdmin, setBrandingIsAdmin, router]);

  if (loading) {
    return null;
  }

  const settingsSections = hasSettingsPerm
    ? [
        { id: "account", label: t("account") || "Account", icon: <User className="h-4 w-4" /> },
        { id: "appearance", label: t("appearance") || "Appearance", icon: <Palette className="h-4 w-4" /> },
        { id: "exam", label: t("examSettings") || "Exam Settings", icon: <ClipboardList className="h-4 w-4" /> },
        { id: "languages", label: t("languages") || "Languages", icon: <Globe className="h-4 w-4" /> },
        { id: "tts", label: "Text-to-Speech (TTS)", icon: <Volume2 className="h-4 w-4" /> },
        { id: "services", label: t("servicesSettings") || "Services", icon: <LayoutList className="h-4 w-4" /> },
      ]
    : [
        { id: "account", label: t("account") || "Account", icon: <User className="h-4 w-4" /> },
      ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Executive Settings Header */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                {t("settings") || "Platform Configuration & Branding"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                System SPA
              </span>
              {readOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              {t("manageAdminAccountBrandAppearance")}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile tab selector */}
      <div className="md:hidden">
        <div className="flex gap-1.5 overflow-x-auto p-1.5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] scrollbar-none">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              data-tab={section.id}
              onClick={() => setActiveTab(section.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === section.id
                  ? "bg-[var(--admin-accent)] text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[270px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="admin-card p-3 sticky top-20 space-y-1 border border-[var(--admin-border)]">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
              Settings Modules
            </p>
            {settingsSections.map((section) => (
              <button
                key={section.id}
                data-tab={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === section.id
                    ? "bg-[var(--admin-accent)] text-white shadow-sm shadow-[var(--admin-accent)]/25"
                    : "text-[var(--admin-muted)] hover:bg-[var(--admin-hover-bg)] hover:text-[var(--admin-text)]"
                }`}
              >
                {section.icon}
                <span className="flex-1 text-left">{section.label}</span>
                {activeTab === section.id && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </aside>

        {/* Content area */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === "account" && (
                <>
                  <div className="admin-card p-6 sm:p-7 border border-[var(--admin-border)] space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-[var(--admin-border)]">
                      <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--admin-text)]">{t("accountOverview")}</h3>
                        <p className="text-xs text-[var(--admin-muted)]">{t("accountOverviewDescription")}</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-1">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                          {t("email")}
                        </Label>
                        <div className="text-sm font-bold text-[var(--admin-text)] truncate">
                          {user?.email || "—"}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-1">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                          {t("role")}
                        </Label>
                        <div>
                          <span className="inline-flex items-center rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                            {user?.user_metadata?.role || t("admin")}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] space-y-1">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                          {t("joined")}
                        </Label>
                        <div className="text-sm font-bold text-[var(--admin-text)]">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t("unknown")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-card p-6 sm:p-7 border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[var(--admin-border)]">
                      <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">
                        <Settings2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--admin-text)]">{t("profileSettings")}</h3>
                        <p className="text-xs text-[var(--admin-muted)]">{t("profileSettingsDescription")}</p>
                      </div>
                    </div>
                    <UserSettings user={user} showPasswordChange={true} mode="admin" />
                  </div>
                </>
              )}

              {hasSettingsPerm && activeTab === "appearance" && !readOnly && (
                <>
                  <div className="admin-card p-6 sm:p-7 border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[var(--admin-border)]">
                      <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--admin-text)]">{t("themeCustomization")}</h3>
                        <p className="text-xs text-[var(--admin-muted)]">{t("themeCustomizationDescription")}</p>
                      </div>
                    </div>
                    <ThemeCustomizer />
                  </div>

                  <div className="admin-card p-6 sm:p-7 border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-[var(--admin-border)]">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[var(--admin-text)]">{t("brandingSettings")}</h3>
                        <p className="text-xs text-[var(--admin-muted)]">{t("brandingSettingsDescription")}</p>
                      </div>
                    </div>
                    <BrandingCustomizer />
                  </div>
                </>
              )}

              {hasSettingsPerm && activeTab === "appearance" && readOnly && (
                <div className="admin-card py-14 text-center border border-[var(--admin-border)]">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-amber-400/50" />
                  <p className="text-sm font-semibold text-[var(--admin-text)]">
                    {t("readOnlyAccess") || "You have read-only access to settings."}
                  </p>
                </div>
              )}

              {hasSettingsPerm && activeTab === "exam" && <SystemConfigSettings filter="exam" />}

              {hasSettingsPerm && activeTab === "languages" && <SystemConfigSettings filter="languages" />}

              {hasSettingsPerm && activeTab === "tts" && <TTSManagementCard />}

              {hasSettingsPerm && activeTab === "services" && <SystemConfigSettings filter="services" />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
