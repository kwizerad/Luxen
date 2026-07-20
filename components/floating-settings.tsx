"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAuthModals } from "@/lib/auth-modals-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut, User, LogIn, Moon, Sun, Globe, Check, Download } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isAdmin } from "@/lib/permissions";

type Language = "English" | "Arabic" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr" | "ar";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "Arabic", label: "العربية", flag: "🇸🇦" },
  { value: "French", label: "Français", flag: "🇫🇷" },
  { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼" },
];

export function FloatingSettings() {
  const { user, loading } = useAuth();
  const { openLogin, openSignUp } = useAuthModals();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Convert full language name to code for storage
  const languageToCode: Record<Language, LanguageCode> = {
    English: "en",
    Kinyarwanda: "rw",
    French: "fr",
    Arabic: "ar"
  };

  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    // Save to user metadata if logged in
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { theme: newTheme }
        });
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    }
  };

  const handleLanguageChange = async (newLanguage: Language) => {
    setLanguage(newLanguage);

    // Save to user metadata if logged in (store as language code)
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { language: languageToCode[newLanguage] }
        });
      } catch (error) {
        console.error("Failed to save language:", error);
      }
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-50 hidden md:block">
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button
            variant="glass"
            size="icon"
            className="h-12 w-12 rounded-full border border-border/20 shadow-glass dark:shadow-glass-dark bg-card/70 backdrop-blur-[20px] text-foreground hover:shadow-glow dark:hover:shadow-glow-dark hover:-translate-y-0.5 transition-all"
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64" style={{ direction: "ltr" }}>
          <div className="space-y-2 px-4 py-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : user ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {t(user.user_metadata?.role?.toLowerCase() || "student")}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t("welcome")}</p>
                <p className="text-xs text-muted-foreground">{t("customizeYourExperience")}</p>
              </div>
            )}
          </div>
          <DropdownMenuSeparator />

          {/* Theme Selector - Available to all users */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer [&>svg:last-child]:rotate-180">
              {theme === "dark" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              {t("theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8}>
              <DropdownMenuItem onClick={() => handleThemeChange("light")} className={theme === "light" ? "bg-accent" : ""}>
                <Sun className="mr-2 h-4 w-4" />
                {t("light")}
                {theme === "light" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleThemeChange("dark")} className={theme === "dark" ? "bg-accent" : ""}>
                <Moon className="mr-2 h-4 w-4" />
                {t("dark")}
                {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Language Selector - Available to all users */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer [&>svg:last-child]:rotate-180">
              <Globe className="mr-2 h-4 w-4" />
              {t("language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8}>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={language === lang.value ? "bg-accent" : ""}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.label}
                  {language === lang.value && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Install App Button - Available when app is installable */}
          {!isInstalled && isInstallable && (
            <DropdownMenuItem onClick={promptInstall} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              {t("installApp")}
            </DropdownMenuItem>
          )}

          {!isInstalled && isInstallable && <DropdownMenuSeparator />}

          {user ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (isAdmin(user)) {
                    window.location.href = "/Admin";
                  } else {
                    window.location.href = "/dashboard";
                  }
                }}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                {t("dashboard")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (isAdmin(user)) {
                    window.location.href = "/Admin/settings";
                  } else {
                    window.location.href = "/dashboard/settings";
                  }
                }}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={openLogin} className="cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" />
                {t("signIn")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openSignUp} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                {t("createAccount")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
