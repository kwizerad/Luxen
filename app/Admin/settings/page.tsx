"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, User, Palette, ImageIcon } from "lucide-react";
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

export default function AdminSettingsPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const { setIsAdmin: setThemeIsAdmin } = useThemeConfig();
  const { setIsAdmin: setBrandingIsAdmin } = useBrandingConfig();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
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
      
      <div className="min-h-screen bg-transparent py-8">
        <main className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t("settings")}</h1>
              <p className="text-muted-foreground mt-1">
                {t("manageAdminAccountBrandAppearance")}
              </p>
            </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr] mt-8">
          <div className="space-y-6">
            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>{t("accountOverview")}</CardTitle>
                <CardDescription>{t("accountOverviewDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">{t("email")}</Label>
                  <div className="rounded-3xl border border-border bg-secondary p-4 text-sm font-medium">
                    {user?.email || "—"}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">{t("role")}</Label>
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                    {user?.user_metadata?.role || t("admin")}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm text-muted-foreground">{t("joined")}</Label>
                  <div className="rounded-3xl border border-border bg-secondary p-4 text-sm">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : t("unknown")}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle>{t("profileSettings")}</CardTitle>
                <CardDescription>{t("profileSettingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <UserSettings user={user} showPasswordChange={true} mode="admin" />
              </CardContent>
            </Card>

            <SystemConfigSettings />
          </div>

          {!readOnly && (
            <div className="space-y-6">
              <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{t("themeCustomization")}</CardTitle>
                  <CardDescription>{t("themeCustomizationDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ThemeCustomizer />
                </CardContent>
              </Card>

              <Card className="border border-border rounded-[32px] bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{t("brandingSettings")}</CardTitle>
                  <CardDescription>{t("brandingSettingsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <BrandingCustomizer />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      </div>
    </>
  );
}
