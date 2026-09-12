"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { User, Settings, Download, LogOut, Menu, Home, Plus, Moon, Sun, Monitor, Globe, Check, Smartphone, Shield, BookOpen, FileText, Users, Car, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/language-context";
import { isAdmin } from "@/lib/permissions";

type Language = "English" | "Kinyarwanda" | "French";
type LanguageCode = "en" | "rw" | "fr";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "French", label: "Français", flag: "🇫🇷" },
  { value: "Kinyarwanda", label: "Kinyarwanda", flag: "🇷🇼" },
];

const languageToCode: Record<Language, LanguageCode> = {
  English: "en",
  Kinyarwanda: "rw",
  French: "fr",
};

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface FloatingUserSettingsProps {
  user: any;
  onMobile?: boolean;
  adminMode?: boolean;
}

export function FloatingUserSettings({ user, onMobile = false, adminMode = false }: FloatingUserSettingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t, availableLanguages } = useLanguage();

  useEffect(() => {
    const checkExamActive = () => {
      if (!pathname?.startsWith("/dashboard/exam")) {
        setIsExamActive(false);
        return;
      }
      const isActive = sessionStorage.getItem("exam-active") === "true";
      setIsExamActive(isActive);
    };

    checkExamActive();

    const handleExamStateChange = () => checkExamActive();
    window.addEventListener("exam-state-change", handleExamStateChange);
    window.addEventListener("storage", handleExamStateChange);

    return () => {
      window.removeEventListener("exam-state-change", handleExamStateChange);
      window.removeEventListener("storage", handleExamStateChange);
    };
  }, [pathname]);

  const getDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email || "User";
  };

  const avatarUrl =
    (user as any)?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.google_avatar_url ||
    user?.user_metadata?.picture;

  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('To install: Tap the share button in Safari, then select "Add to Home Screen"');
    } else {
      alert('To install: Look for the install icon in your browser\'s address bar');
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);

    if (user) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({
          data: { language: languageToCode[newLanguage as Language] || "en" }
        });
      } catch (error) {
        console.error("Failed to save language:", error);
      }
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (user) {
      try {
        const supabase = createClient();
        supabase.auth.updateUser({ data: { theme: newTheme } });
      } catch (error) {
        console.error("Failed to save theme:", error);
      }
    }
  };

  const handleNavigateToDashboard = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("chat-active");
      sessionStorage.removeItem("student-chat-active");
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("chat-state-change"));
      window.dispatchEvent(new CustomEvent("student-chat-state-change"));
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }

    if (adminMode) {
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

    if (adminMode) {
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

  const renderDropdownContent = () => (
    <>
      {/* User info header */}
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

      {/* Quick navigation */}
      <DropdownMenuItem onClick={handleNavigateToDashboard} className="cursor-pointer">
        <Home className="mr-2 h-4 w-4" />
        {adminMode ? t("adminDashboard") : t("dashboard")}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleNavigateToSettings} className="cursor-pointer">
        <Settings className="mr-2 h-4 w-4" />
        {t("settings")}
      </DropdownMenuItem>

      {/* Admin quick links */}
      {adminMode && (
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

      {/* Install App */}
      {!isInstalled && (
        <DropdownMenuItem onClick={handleInstallApp} className="cursor-pointer">
          <Smartphone className="mr-2 h-4 w-4" />
          {t("installApp") || "Install App"}
        </DropdownMenuItem>
      )}

      {/* Theme toggle */}
      <DropdownMenuItem onClick={handleThemeToggle} className="cursor-pointer">
        {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
        {theme === "light" ? t("darkMode") || "Dark Mode" : t("lightMode") || "Light Mode"}
      </DropdownMenuItem>

      {/* Language Selector — hidden in admin mode */}
      {!adminMode && (
        <>
          <DropdownMenuSeparator />
          {availableLanguages.map((lang) => (
            <DropdownMenuItem
              key={lang.value}
              onClick={() => handleLanguageChange(lang.value)}
              className={language === lang.value ? "bg-accent/60" : ""}
            >
              <span className="mr-2">{lang.flag}</span>
              {lang.label}
              {language === lang.value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
        <LogOut className="mr-2 h-4 w-4" />
        {t("logout")}
      </DropdownMenuItem>
    </>
  );

  if (
    isExamActive ||
    pathname === "/dashboard/exam" ||
    pathname?.startsWith("/dashboard/exam")
  ) {
    return null;
  }

  if (onMobile) {
    return (
      <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 hover:bg-transparent">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
              <AvatarFallback className="text-xs font-semibold">{getInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {renderDropdownContent()}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 hover:bg-transparent">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={getDisplayName()} />}
              <AvatarFallback className="text-xs font-semibold">{getInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {renderDropdownContent()}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
