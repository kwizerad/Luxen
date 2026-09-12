"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
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
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, User, LogIn, Moon, Sun, Globe, Check, Download, Home, Shield, BookOpen, FileText, Users, Car } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { isAdmin } from "@/lib/permissions";

type Language = "English" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "French", label: "Français", flag: "🇫🇷" },
  { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼" },
];

export function FloatingSettings() {
  const { user, loading } = useAuth();
  const { openLogin, openSignUp } = useAuthModals();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, availableLanguages } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { isInstallable, isInstalled, promptInstall } = usePwaInstall();

  const languageToCode: Record<string, string> = {
    English: "en",
    Kinyarwanda: "rw",
    French: "fr",
  };

  const [isExamActive, setIsExamActive] = useState(false);
  const currentTheme = theme ?? "light";

  useEffect(() => {
    const checkExamActive = () => {
      const isActive =
        sessionStorage.getItem("exam-active") === "true" &&
        (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard/exam"));
      setIsExamActive(isActive);
    };
    checkExamActive();
    window.addEventListener("exam-state-change", checkExamActive);
    window.addEventListener("storage", checkExamActive);
    return () => {
      window.removeEventListener("exam-state-change", checkExamActive);
      window.removeEventListener("storage", checkExamActive);
    };
  }, [pathname]);

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
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { theme: newTheme } });
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    }
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { language: languageToCode[newLanguage] || "en" } });
      } catch (error) {
        console.error("Failed to save language:", error);
      }
    }
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const avatarUrl =
    (user as any)?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.google_avatar_url ||
    user?.user_metadata?.picture;

  const getRoleLabel = () => {
    const role = user?.user_metadata?.role?.toLowerCase();
    if (role === "admin") return t("admin");
    if (role === "driver") return t("driver");
    return t("student");
  };

  const getRoleIcon = () => {
    const role = user?.user_metadata?.role?.toLowerCase();
    if (role === "admin") return <Shield className="h-3 w-3" />;
    if (role === "driver") return <Car className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  const userIsAdmin = user ? isAdmin(user) : false;

  const handleNavigateToDashboard = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chat-active");
      sessionStorage.removeItem("student-chat-active");
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("chat-state-change"));
      window.dispatchEvent(new CustomEvent("student-chat-state-change"));
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }

    if (userIsAdmin) {
      router.push("/Admin");
    } else {
      if (pathname === "/dashboard") {
        window.location.hash = "#home";
        window.dispatchEvent(new CustomEvent("navo-hash-route-change", { detail: { view: "home" } }));
      } else {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("intended-dashboard-view", "home");
          } catch {}
        }
        router.push("/dashboard#home");
      }
    }
  };

  const handleNavigateToSettings = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chat-active");
      sessionStorage.removeItem("student-chat-active");
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("chat-state-change"));
      window.dispatchEvent(new CustomEvent("student-chat-state-change"));
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }

    if (userIsAdmin) {
      router.push("/Admin/settings");
    } else {
      if (pathname === "/dashboard") {
        window.location.hash = "#settings";
        window.dispatchEvent(new CustomEvent("navo-hash-route-change", { detail: { view: "settings" } }));
      } else {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("intended-dashboard-view", "settings");
          } catch {}
        }
        router.push("/dashboard#settings");
      }
    }
  };

  if (isExamActive || pathname === "/dashboard/exam" || pathname?.startsWith("/dashboard/exam")) {
    return null;
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="glass"
            size="icon"
            className="h-12 w-12 rounded-full border border-border/20 shadow-glass dark:shadow-glass-dark bg-card/70 backdrop-blur-[20px] text-foreground hover:shadow-glow dark:hover:shadow-glow-dark hover:-translate-y-0.5 transition-all"
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">{t("settings")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64" style={{ direction: "ltr" }}>
          {/* User info header */}
          {user && (
            <>
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{getDisplayName()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getRoleIcon()}
                      <span>{getRoleLabel()}</span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          {!user && !loading && (
            <>
              <div className="space-y-1 px-4 py-3">
                <p className="text-sm font-semibold">{t("welcome")}</p>
                <p className="text-xs text-muted-foreground">{t("customizeYourExperience")}</p>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Theme Selector */}
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

          {/* Language Selector */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer [&>svg:last-child]:rotate-180">
              <Globe className="mr-2 h-4 w-4" />
              {t("language")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent sideOffset={8}>
              {availableLanguages.map((lang) => (
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

          {/* Install App */}
          {!isInstalled && isInstallable && (
            <DropdownMenuItem onClick={promptInstall} className="cursor-pointer">
              <Download className="mr-2 h-4 w-4" />
              {t("installApp")}
            </DropdownMenuItem>
          )}

          {!isInstalled && isInstallable && <DropdownMenuSeparator />}

          {user ? (
            <>
              {/* Quick navigation */}
              <DropdownMenuItem onClick={handleNavigateToDashboard} className="cursor-pointer">
                <Home className="mr-2 h-4 w-4" />
                {userIsAdmin ? t("adminDashboard") : t("dashboard")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNavigateToSettings} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {t("settings")}
              </DropdownMenuItem>

              {/* Admin quick links */}
              {userIsAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/Admin/exams")} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4" />
                    {t("examManagementNav") || "Exams"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/Admin/users")} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    {t("users")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/Admin/course")} className="cursor-pointer">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t("courseManagementNav") || "Course"}
                  </DropdownMenuItem>
                </>
              )}

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
