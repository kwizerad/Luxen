"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, Palette, ImageIcon, Settings2, Shield, Globe, LayoutList, ClipboardList, ChevronRight, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import UserSettings from "@/components/user-settings";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { BrandingCustomizer } from "@/components/branding-customizer";
import { SystemConfigSettings } from "@/components/system-config";
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
  const [activeTab, setActiveTab] = useState("account");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Set admin flag for both theme and branding config
    setThemeIsAdmin(true);
    setBrandingIsAdmin(true);
    
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log("Admin settings user:", {
          email: user.email,
          expected: ADMIN_CREDENTIALS.email,
          matches: user.email === ADMIN_CREDENTIALS.email,
          role: user.user_metadata?.role,
        });
      }

      setUser(user);

      const permUser = user as PermUser;
      if (!canRead(permUser, "settings")) {
        router.replace("/Admin");
        return;
      }
      setReadOnly(!canWrite(permUser, "settings"));
      setLoading(false);
    };

    loadUser();
  }, [setThemeIsAdmin, setBrandingIsAdmin, router]);

  if (loading) {
    return null;
  }

  const settingsSections = [
    { id: "account", label: t("account") || "Account", icon: <User className="h-4 w-4" /> },
    { id: "appearance", label: t("appearance") || "Appearance", icon: <Palette className="h-4 w-4" /> },
    { id: "exam", label: t("examSettings") || "Exam Settings", icon: <ClipboardList className="h-4 w-4" /> },
    { id: "languages", label: t("languages") || "Languages", icon: <Globe className="h-4 w-4" /> },
    { id: "services", label: t("servicesSettings") || "Services", icon: <LayoutList className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Floating Navo Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 bg-card/70 backdrop-blur-[20px] border border-border/20 rounded-full shadow-glass dark:shadow-glass-dark p-2">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={config.systemName} width={32} height={32} unoptimized className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{config.logoText || "N"}</span>
            )}
          </div>
          <span className="text-sm font-medium pr-1">{config.systemName}</span>
        </Link>
      </div>

      <div className="min-h-screen bg-transparent py-6 sm:py-8">
        <main className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              {t("settings")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {t("manageAdminAccountBrandAppearance")}
            </p>
          </div>

          {/* Mobile tab selector */}
          <div className="md:hidden mb-6">
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === section.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
            {/* Desktop sidebar */}
            <aside className="hidden md:block">
              <div className="sticky top-6 space-y-1">
                {settingsSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      activeTab === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
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
                      <Card className="border border-border rounded-[24px] bg-card shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            {t("accountOverview")}
                          </CardTitle>
                          <CardDescription>{t("accountOverviewDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid gap-2">
                            <Label className="text-sm text-muted-foreground">{t("email")}</Label>
                            <div className="rounded-2xl border border-border bg-secondary p-3.5 text-sm font-medium">
                              {user?.email || "—"}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-sm text-muted-foreground">{t("role")}</Label>
                            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary w-fit">
                              {user?.user_metadata?.role || t("admin")}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-sm text-muted-foreground">{t("joined")}</Label>
                            <div className="rounded-2xl border border-border bg-secondary p-3.5 text-sm">
                              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t("unknown")}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-border rounded-[24px] bg-card shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-primary" />
                            {t("profileSettings")}
                          </CardTitle>
                          <CardDescription>{t("profileSettingsDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <UserSettings user={user} showPasswordChange={true} mode="admin" />
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {activeTab === "appearance" && !readOnly && (
                    <>
                      <Card className="border border-border rounded-[24px] bg-card shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            {t("themeCustomization")}
                          </CardTitle>
                          <CardDescription>{t("themeCustomizationDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ThemeCustomizer />
                        </CardContent>
                      </Card>

                      <Card className="border border-border rounded-[24px] bg-card shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            {t("brandingSettings")}
                          </CardTitle>
                          <CardDescription>{t("brandingSettingsDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <BrandingCustomizer />
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {activeTab === "appearance" && readOnly && (
                    <Card className="border border-border rounded-[24px] bg-card shadow-sm">
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        {t("readOnlyAccess") || "You have read-only access to settings."}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === "exam" && <SystemConfigSettings filter="exam" />}

                  {activeTab === "languages" && <SystemConfigSettings filter="languages" />}

                  {activeTab === "services" && <SystemConfigSettings filter="services" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
