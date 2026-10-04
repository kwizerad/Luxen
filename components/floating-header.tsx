"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Home,
  BookOpen,
  GraduationCap,
  Users,
  Car,
  Trophy,
  Settings,
  LayoutDashboard,
  FileText,
  BarChart3,
} from "lucide-react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLearningLanguages } from "@/hooks/use-learning-languages";
import {
  isStandaloneExamEnabled,
  getCachedStandaloneExamEnabled,
  getCachedServicesConfig,
  getSyncServicesConfig,
} from "@/lib/feature-flags";
import { canRead, isPrimaryAdmin, type User as PermUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  view?: string;
  isActive: boolean;
}

export function FloatingHeader({ adminMode = false }: { adminMode?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, isRTL, language: interfaceLanguage } = useLanguage();
  const { config } = useBrandingConfig();
  const { enabledLanguages, loading: loadingLangs } = useLearningLanguages();

  const [isExamActive, setIsExamActive] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [imgError, setImgError] = useState(false);

  // Feature flags & course publication states
  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(() => {
    const cached = getCachedStandaloneExamEnabled();
    return cached !== null ? cached : true;
  });
  const [servicesPageEnabled, setServicesPageEnabled] = useState<boolean>(() => {
    const cached = getSyncServicesConfig();
    return cached ? cached.pageEnabled : true;
  });
  const [publishedCourseLanguages, setPublishedCourseLanguages] = useState<Set<string>>(
    () => new Set(["English", "Kinyarwanda", "French"])
  );

  useEffect(() => {
    setImgError(false);
  }, [config.logoUrl]);

  // Load feature flags and published courses
  const refreshConditions = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const [examEnabled, servicesCfg] = await Promise.all([
        isStandaloneExamEnabled().catch(() => true),
        getCachedServicesConfig().catch(() => ({ pageEnabled: true, services: {} })),
      ]);
      setStandaloneExamEnabled(examEnabled);
      setServicesPageEnabled(servicesCfg.pageEnabled);

      const supabase = createClient();
      const { data: courses } = await supabase
        .from("courses")
        .select("language, status")
        .eq("status", "published");

      if (courses) {
        setPublishedCourseLanguages(new Set(courses.map((c: any) => c.language)));
      }
    } catch {
      // ignore fallback errors
    }
  }, []);

  useEffect(() => {
    refreshConditions();

    const handleConfigChange = () => {
      refreshConditions();
    };
    window.addEventListener("system-config-updated", handleConfigChange);
    window.addEventListener("focus", handleConfigChange);
    return () => {
      window.removeEventListener("system-config-updated", handleConfigChange);
      window.removeEventListener("focus", handleConfigChange);
    };
  }, [refreshConditions, interfaceLanguage]);

  const syncNavigationState = useCallback(() => {
    if (typeof window === "undefined") return;
    const examActive =
      sessionStorage.getItem("exam-active") === "true" ||
      pathname === "/dashboard/exam" ||
      Boolean(pathname?.startsWith("/dashboard/exam"));
    setIsExamActive(examActive);

    const chatActive =
      sessionStorage.getItem("chat-active") === "true" ||
      sessionStorage.getItem("student-chat-active") === "true";
    setIsChatActive(chatActive);

    const rawHash = window.location.hash.replace(/^#/, "").split("?")[0];
    setCurrentView(rawHash || "home");
  }, [pathname]);

  useEffect(() => {
    syncNavigationState();

    window.addEventListener("exam-state-change", syncNavigationState);
    window.addEventListener("chat-state-change", syncNavigationState);
    window.addEventListener("student-chat-state-change", syncNavigationState);
    window.addEventListener("storage", syncNavigationState);
    window.addEventListener("hashchange", syncNavigationState);
    window.addEventListener("popstate", syncNavigationState);
    window.addEventListener("navo-hash-route-change", syncNavigationState);

    return () => {
      window.removeEventListener("exam-state-change", syncNavigationState);
      window.removeEventListener("chat-state-change", syncNavigationState);
      window.removeEventListener("student-chat-state-change", syncNavigationState);
      window.removeEventListener("storage", syncNavigationState);
      window.removeEventListener("hashchange", syncNavigationState);
      window.removeEventListener("popstate", syncNavigationState);
      window.removeEventListener("navo-hash-route-change", syncNavigationState);
    };
  }, [pathname, syncNavigationState]);

  const handleStudentNavigate = useCallback(
    (targetView: string) => {
      if (typeof window !== "undefined") {
        // Block navigation if exam is active
        if (sessionStorage.getItem("exam-active") === "true") {
          return;
        }
        sessionStorage.removeItem("chat-active");
        sessionStorage.removeItem("student-chat-active");
        window.dispatchEvent(new CustomEvent("chat-state-change"));
        window.dispatchEvent(new CustomEvent("student-chat-state-change"));
      }

      if (pathname === "/dashboard") {
        window.location.hash = `#${targetView}`;
        setCurrentView(targetView);
        window.dispatchEvent(
          new CustomEvent("navo-hash-route-change", { detail: { view: targetView } })
        );
      } else {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("intended-dashboard-view", targetView);
          } catch {}
        }
        router.push(`/dashboard#${targetView}`);
      }
    },
    [pathname, router]
  );

  // Determine whether the Course tab should be visible for the current language
  const isCourseVisible = useMemo(() => {
    const lang = interfaceLanguage || "English";
    const isLangEnabledByAdmin = loadingLangs
      ? true
      : enabledLanguages.includes(lang as any);
    const isCoursePublishedInLang = publishedCourseLanguages.has(lang);
    return isLangEnabledByAdmin && isCoursePublishedInLang;
  }, [interfaceLanguage, loadingLangs, enabledLanguages, publishedCourseLanguages]);

  if (isExamActive) {
    return null;
  }

  if (!user && !authLoading) {
    return null;
  }

  const allStudentNavItems: (NavItem & { visible: boolean })[] = [
    {
      id: "course",
      label: t("course") || t("theoryCourse") || "Course",
      icon: BookOpen,
      view: "course",
      isActive: pathname === "/dashboard" && currentView === "course",
      visible: isCourseVisible,
    },
    {
      id: "exam",
      label: t("exams") || t("takeExam") || "Exams",
      icon: GraduationCap,
      view: "exam",
      isActive:
        pathname === "/dashboard" &&
        (currentView === "exam" ||
          currentView === "exams" ||
          currentView === "services/live-exam" ||
          currentView === "services/group-exam"),
      visible: standaloneExamEnabled,
    },
    {
      id: "classmates",
      label: t("classmates") || "Classmates",
      icon: Users,
      view: "classmates",
      isActive:
        pathname === "/dashboard" &&
        (currentView === "classmates" ||
          currentView === "chat" ||
          currentView === "chat/conversation" ||
          currentView === "classmates/group-results"),
      visible: true,
    },
    {
      id: "home",
      label: t("home") || "Home",
      icon: Home,
      view: "home",
      isActive: pathname === "/dashboard" && (currentView === "home" || !currentView),
      visible: true,
    },
    {
      id: "services",
      label: t("services") || "Services",
      icon: Car,
      view: "services",
      isActive:
        pathname === "/dashboard" &&
        (currentView === "services" ||
          currentView === "services/drivers" ||
          currentView === "services/driver-detail" ||
          currentView === "services/request-code" ||
          currentView === "driver-hub" ||
          currentView.startsWith("driver-panel") ||
          currentView === "my-training"),
      visible: servicesPageEnabled,
    },
    {
      id: "results",
      label: t("results") || t("examHistory") || "Results",
      icon: Trophy,
      view: "results",
      isActive: pathname === "/dashboard" && currentView === "results",
      visible: true,
    },
  ];

  const permUser = user as PermUser | null;
  const userIsPrimary = isPrimaryAdmin(permUser);

  const allAdminNavItems: (NavItem & { visible: boolean })[] = [
    {
      id: "admin-home",
      label: t("dashboard") || "Dashboard",
      icon: LayoutDashboard,
      href: "/Admin",
      isActive: pathname === "/Admin",
      visible: true,
    },
    {
      id: "admin-course",
      label: t("course") || "Course",
      icon: BookOpen,
      href: "/Admin/course",
      isActive: Boolean(pathname?.startsWith("/Admin/course")),
      visible:
        userIsPrimary ||
        canRead(permUser, "courseManagement") ||
        canRead(permUser, "courseStudio"),
    },
    {
      id: "admin-exams",
      label: t("exams") || "Exams",
      icon: FileText,
      href: "/Admin/exams",
      isActive: Boolean(
        pathname?.startsWith("/Admin/exams") ||
          pathname?.startsWith("/Admin/questions") ||
          pathname?.startsWith("/Admin/retake-requests")
      ),
      visible: userIsPrimary || canRead(permUser, "exams"),
    },
    {
      id: "admin-users",
      label: t("users") || "Users",
      icon: Users,
      href: "/Admin/users",
      isActive: Boolean(pathname?.startsWith("/Admin/users")),
      visible: userIsPrimary || canRead(permUser, "students"),
    },
    {
      id: "admin-drivers",
      label: t("drivers") || "Drivers",
      icon: Car,
      href: "/Admin/drivers",
      isActive: Boolean(pathname?.startsWith("/Admin/drivers")),
      visible: userIsPrimary || canRead(permUser, "drivers"),
    },
    {
      id: "admin-reports",
      label: t("reports") || "Reports",
      icon: BarChart3,
      href: "/Admin/reports",
      isActive: Boolean(
        pathname?.startsWith("/Admin/reports") ||
          pathname?.startsWith("/Admin/audit") ||
          pathname?.startsWith("/Admin/notifications")
      ),
      visible: userIsPrimary || canRead(permUser, "notifications"),
    },
    {
      id: "admin-settings",
      label: t("settings") || "Settings",
      icon: Settings,
      href: "/Admin/settings",
      isActive: Boolean(pathname?.startsWith("/Admin/settings")),
      visible: userIsPrimary || canRead(permUser, "settings"),
    },
  ];

  const navItems = (adminMode ? allAdminNavItems : allStudentNavItems).filter(
    (item) => item.visible
  );
  const activeIdPrefix = adminMode ? "admin" : "student";

  return (
    <>
      {/* Desktop / Tablet Top Header Bar — Hidden on Small Devices (< md) so mobile only has bottom fixed nav */}
      <header
        dir={isRTL ? "rtl" : "ltr"}
        aria-hidden={isExamActive}
        className={`hidden md:block premium-glass-panel sticky top-0 z-50 w-full border-b transition-opacity ${
          isExamActive ? "pointer-events-none opacity-0 invisible select-none" : ""
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 gap-3">
          {/* Left: System Logo & Name */}
          <div className="flex items-center shrink-0">
            {adminMode ? (
              <Link href="/Admin" className="flex items-center space-x-2.5 group">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative shrink-0">
                  {config.logoUrl && !imgError ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.systemName || "Logo"}
                      fill
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="36px"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold text-sm">
                      {config.logoText || config.systemName?.charAt(0) || "N"}
                    </span>
                  )}
                </div>
                <span className="font-bold text-xl tracking-tight text-foreground">
                  {config.systemName || "Navo"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                disabled={isExamActive}
                onClick={() => handleStudentNavigate("home")}
                className="flex items-center space-x-2.5 text-left group cursor-pointer disabled:pointer-events-none"
              >
                <div className="w-8 h-8 md:w-9 md:h-9 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative shrink-0">
                  {config.logoUrl && !imgError ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.systemName || "Logo"}
                      fill
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="36px"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold text-sm">
                      {config.logoText || config.systemName?.charAt(0) || "N"}
                    </span>
                  )}
                </div>
                <span className="font-bold text-xl tracking-tight text-foreground">
                  {config.systemName || "Navo"}
                </span>
              </button>
            )}
          </div>

          {/* Center: Desktop / Tablet Navigation Links */}
          <nav
            aria-label="Main Navigation"
            className="flex items-center gap-1 lg:gap-1.5 overflow-x-auto no-scrollbar py-1"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  {item.isActive && (
                    <motion.span
                      layoutId={`${activeIdPrefix}-desktop-nav-pill`}
                      className="absolute inset-0 rounded-xl bg-primary/15 border border-primary/30 shadow-xs"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 shrink-0 transition-colors ${
                      item.isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span
                    className={`relative z-10 text-xs lg:text-sm whitespace-nowrap transition-colors ${
                      item.isActive
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              );

              if (adminMode && item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group relative flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-xl transition-all hover:bg-muted/60"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isExamActive}
                  onClick={() => item.view && handleStudentNavigate(item.view)}
                  className="group relative flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-xl transition-all hover:bg-muted/60 cursor-pointer disabled:pointer-events-none"
                >
                  {content}
                </button>
              );
            })}
          </nav>

          {/* Right: Notifications & User Profile / Settings */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="rounded-full transition-all relative">
              <NotificationsDropdown />
            </div>
            <div className="rounded-full overflow-hidden transition-all">
              <FloatingUserSettings user={user} adminMode={adminMode} />
            </div>
          </div>
        </div>
      </header>

      {/* Small Devices Fixed Bottom Navigation Bar (Includes Nav Items + Notifications + User Menu) */}
      {!isChatActive && !isExamActive && (
        <nav
          aria-label="Mobile Bottom Navigation"
          aria-hidden={isExamActive}
          dir={isRTL ? "rtl" : "ltr"}
          className={`fixed bottom-0 left-0 right-0 z-50 md:hidden premium-glass-panel border-t pb-[env(safe-area-inset-bottom)] transition-opacity ${
            isExamActive ? "pointer-events-none opacity-0 invisible select-none" : ""
          }`}
        >
          <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const mobileContent = (
                <>
                  {item.isActive && (
                    <motion.span
                      layoutId={`${activeIdPrefix}-mobile-nav-indicator`}
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div
                    className={`flex items-center justify-center w-8 h-7 rounded-full transition-colors ${
                      item.isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </div>
                  <span
                    className={`text-[10px] leading-tight truncate max-w-[54px] transition-colors ${
                      item.isActive
                        ? "font-semibold text-primary"
                        : "font-medium text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              );

              if (adminMode && item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full py-1 min-w-0"
                  >
                    {mobileContent}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isExamActive}
                  onClick={() => item.view && handleStudentNavigate(item.view)}
                  className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full py-1 min-w-0 cursor-pointer disabled:pointer-events-none"
                >
                  {mobileContent}
                </button>
              );
            })}

            {/* Mobile Notifications & User Profile in Bottom Bar */}
            <div className="flex items-center gap-1 pl-1 pr-1.5 border-l border-border/50 h-10 shrink-0">
              <div className="flex items-center justify-center">
                <NotificationsDropdown />
              </div>
              <div className="flex items-center justify-center">
                <FloatingUserSettings user={user} onMobile adminMode={adminMode} />
              </div>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
