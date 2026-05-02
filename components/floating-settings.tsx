"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
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
import { Settings, LogOut, User, LogIn, Moon, Sun, Monitor, Globe, Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type Language = "English" | "Arabic" | "Kinyarwanda" | "French";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "Arabic", label: "العربية", flag: "🇸🇦" },
  { value: "French", label: "Français", flag: "🇫🇷" },
  { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼" },
];

export function FloatingSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { openLogin, openSignUp } = useAuthModals();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Failed to load user for floating settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full border shadow-lg shadow-black/10 bg-background text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
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
            <DropdownMenuSubTrigger className="cursor-pointer">
              {theme === "light" ? <Sun className="mr-2 h-4 w-4" /> : theme === "dark" ? <Moon className="mr-2 h-4 w-4" /> : <Monitor className="mr-2 h-4 w-4" />}
              {t("theme")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("light")} className={theme === "light" ? "bg-accent" : ""}>
                <Sun className="mr-2 h-4 w-4" />
                {t("light")}
                {theme === "light" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className={theme === "dark" ? "bg-accent" : ""}>
                <Moon className="mr-2 h-4 w-4" />
                {t("dark")}
                {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className={theme === "system" ? "bg-accent" : ""}>
                <Monitor className="mr-2 h-4 w-4" />
                {t("system")}
                {theme === "system" && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Language Selector - Available to all users */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Globe className="mr-2 h-4 w-4" />
              {t("language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
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

          {user ? (
            <>
              <DropdownMenuItem
                onClick={() => window.location.href = "/dashboard"}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                {t("dashboard")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.location.href = "/user/settings"}
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
