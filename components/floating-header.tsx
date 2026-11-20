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
  Scale,
  LogOut,
} from "lucide-react";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { useNavigationVisibility } from "@/hooks/use-navigation-visibility";
import { useAdminSpa } from "@/lib/admin-spa-router";
import { createClient } from "@/lib/supabase/client";
import { resetLandingLanguageForAdminLogout } from "@/lib/auth-utils";
import { purgePrivateStudentCache } from "@/lib/student-cache";
import { spaCache } from "@/lib/spa-cache";
import { usePendingFriendRequests } from "@/hooks/usePendingFriendRequests";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  view?: string;
  isActive: boolean;
  badge?: number;
}

export function FloatingHeader({ adminMode = false }: { adminMode?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const { filterNavItems } = useNavigationVisibility(adminMode);
  const { view: adminSpaView, pathname: adminSpaPathname, navigateAdmin } = useAdminSpa();
  const pendingFriendRequests = usePendingFriendRequests();

  const [isExamActive, setIsExamActive] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [config.logoUrl]);

  const syncNavigationState = useCallback(() => {
    if (typeof window === "undefined") return;

    const rawHash = window.location.hash.replace(/^#/, "").split("?")[0];
    const activeView = rawHash || "home";
    setCurrentView(activeView);

    // If the user is on a non-exam dashboard view (e.g. home, classmates, services, results, settings),
    // ensure any stale exam-active flag from an interrupted session is cleared so the bottom nav persists.
    const isExamCapableView =
      activeView === "exam" ||
      activeView === "exams" ||
      activeView === "course";

    if (
      pathname === "/dashboard" &&
      !isExamCapableView &&
      sessionStorage.getItem("exam-active") === "true"
    ) {
      sessionStorage.removeItem("exam-active");
    }

    const examActive = sessionStorage.getItem("exam-active") === "true";
    setIsExamActive(examActive);

    const chatActive =
      sessionStorage.getItem("chat-active") === "true" ||
      sessionStorage.getItem("student-chat-active") === "true";
    setIsChatActive(chatActive);
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

  const handleMobileAdminLogout = useCallback(async () => {
    try {
      resetLandingLanguageForAdminLogout();
      spaCache.clear();
      await purgePrivateStudentCache().catch(() => {});
      const supabase = createClient();
      await supabase.auth.signOut();
      fetch("/api/admin-signout", { method: "POST" }).catch(() => {});
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  if (!user && !authLoading) {
    return null;
  }

  const allStudentNavItems: NavItem[] = [
    {
      id: "course",
      label: t("course") || t("theoryCourse") || "Course",
      icon: BookOpen,
      view: "course",
      isActive: pathname === "/dashboard" && currentView === "course",
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
    },
    {
      id: "classmates",
      label: t("chat") || "Chat",
      icon: Users,
      view: "classmates",
      badge: pendingFriendRequests,
      isActive:
        pathname === "/dashboard" &&
        (currentView === "classmates" ||
          currentView === "chat" ||
          currentView === "chat/conversation" ||
          currentView === "classmates/group-results"),
    },
    {
      id: "home",
      label: t("home") || "Home",
      icon: Home,
      view: "home",
      isActive: pathname === "/dashboard" && (currentView === "home" || !currentView),
    },
    {
      id: "services",
      label: t("services") || "Services",
      icon: Car,
      view: "services",
      isActive:
        pathname === "/dashboard" &&
        (currentView === "services" ||
          currentView === "services/request-code"),
    },
    {
      id: "results",
      label: t("results") || t("examHistory") || "Results",
      icon: Trophy,
      view: "results",
      isActive: pathname === "/dashboard" && currentView === "results",
    },
  ];

  const activeAdminPath = adminMode ? (adminSpaPathname || pathname || "/Admin") : pathname;

  const allAdminNavItems: NavItem[] = [
    {
      id: "admin-course",
      label: t("course") || "Course",
      icon: BookOpen,
      href: "/Admin/course",
      isActive:
        adminSpaView === "course" ||
        adminSpaView === "course-studio" ||
        adminSpaView === "course-management" ||
        Boolean(activeAdminPath?.startsWith("/Admin/course")),
    },
    {
      id: "admin-exams",
      label: t("exams") || "Exams",
      icon: FileText,
      href: "/Admin/exams",
      isActive:
        adminSpaView === "exams" ||
        adminSpaView === "questions" ||
        adminSpaView === "retake-requests" ||
        Boolean(
          activeAdminPath?.startsWith("/Admin/exams") ||
            activeAdminPath?.startsWith("/Admin/questions") ||
            activeAdminPath?.startsWith("/Admin/retake-requests")
        ),
    },
    {
      id: "admin-users",
      label: t("users") || "Users",
      icon: Users,
      href: "/Admin/users",
      isActive:
        adminSpaView === "users" || Boolean(activeAdminPath?.startsWith("/Admin/users")),
    },
    {
      id: "admin-home",
      label: t("dashboard") || "Dashboard",
      icon: LayoutDashboard,
      href: "/Admin",
      isActive: adminSpaView === "dashboard" && activeAdminPath === "/Admin",
    },
    {
      id: "admin-reports",
      label: t("reports") || "Reports",
      icon: BarChart3,
      href: "/Admin/reports",
      isActive:
        adminSpaView === "reports" ||
        adminSpaView === "audit" ||
        adminSpaView === "notifications" ||
        Boolean(
          activeAdminPath?.startsWith("/Admin/reports") ||
            activeAdminPath?.startsWith("/Admin/audit") ||
            activeAdminPath?.startsWith("/Admin/notifications")
        ),
    },
    {
      id: "admin-gazette",
      label: "Gazette",
      icon: Scale,
      href: "/Admin/gazette",
      isActive:
        adminSpaView === "gazette" || Boolean(activeAdminPath?.startsWith("/Admin/gazette")),
    },
  ];

  const navItems = filterNavItems(adminMode ? allAdminNavItems : allStudentNavItems);
  const activeIdPrefix = adminMode ? "admin" : "student";
  const homeIdx = navItems.findIndex(
    (item) => item.id === "home" || item.id === "admin-home"
  );
  const leftCount = homeIdx >= 0 ? homeIdx : 0;
  const rightCount = homeIdx >= 0 ? navItems.length - 1 - homeIdx : 0;
  // When an even number of items is visible (e.g. Course is hidden leaving 6 items),
  // add an invisible flex spacer on the shorter side so the Home / Dashboard button
  // remains at the exact geometric center of the navigation bar.
  const padLeft = Math.max(0, rightCount - leftCount);
  const padRight = Math.max(0, leftCount - rightCount);

  const isExamSessionActive =
    isExamActive ||
    (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true");

  if (isExamSessionActive) {
    return null;
  }

  return (
    <>
      {/* Top Header Bar:
          Fixed at the top so it never disappears during scroll on any device size. */}
      <header
        dir={isRTL ? "rtl" : "ltr"}
        aria-hidden={isExamActive}
        className={`app-top-header-bar ${
          isExamActive
            ? "hidden pointer-events-none opacity-0 invisible select-none"
            : "block"
        } fixed top-0 left-0 right-0 z-[60] w-full bg-white/95 dark:bg-[#0a0a0e]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 transition-all duration-200 shadow-xs`}
      >
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 gap-3">
          {/* Left: System Logo & Name */}
          <div className="flex items-center shrink-0">
            {adminMode ? (
              <Link href="/Admin" className="flex items-center space-x-2.5 group">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative shrink-0">
                  {config.logoUrl && !imgError ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.systemName || "Logo"}
                      fill
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 36px"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold text-xs sm:text-sm">
                      {config.logoText || config.systemName?.charAt(0) || "N"}
                    </span>
                  )}
                </div>
                <span className="font-bold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
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
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-primary rounded-full flex items-center justify-center overflow-hidden shadow-md shadow-primary/25 relative shrink-0">
                  {config.logoUrl && !imgError ? (
                    <Image
                      src={config.logoUrl}
                      alt={config.systemName || "Logo"}
                      fill
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="object-cover"
                      sizes="(max-width: 640px) 28px, (max-width: 768px) 32px, 36px"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="text-primary-foreground font-bold text-xs sm:text-sm">
                      {config.logoText || config.systemName?.charAt(0) || "N"}
                    </span>
                  )}
                </div>
                <span className="font-bold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
                  {config.systemName || "Navo"}
                </span>
              </button>
            )}
          </div>

          {/* Center: Desktop Navigation Links (lg: / 1024px+ only) */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 lg:gap-1.5 overflow-x-auto no-scrollbar py-1"
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
                        ? "text-primary font-bold"
                        : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                    }`}
                  />
                  <span
                    className={`relative z-10 text-xs lg:text-sm whitespace-nowrap transition-colors ${
                      item.isActive
                        ? "font-bold text-primary"
                        : "font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="relative z-10 ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none tabular-nums">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </>
              );

              if (adminMode && item.href) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateAdmin(item.href!)}
                    className="group relative flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-xl transition-all hover:bg-muted/60 cursor-pointer"
                  >
                    {content}
                  </button>
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

          {/* Right: Floating Settings — Notifications, Mobile Admin Logout, & User Profile Picture Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {adminMode && (
              <button
                type="button"
                onClick={handleMobileAdminLogout}
                title={t("logout") || "Logout"}
                aria-label={t("logout") || "Logout"}
                className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 cursor-pointer transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden min-[360px]:inline">{t("logout") || "Logout"}</span>
              </button>
            )}
            <div className="rounded-full transition-all relative">
              <NotificationsDropdown />
            </div>
            <div className="rounded-full overflow-hidden transition-all">
              <FloatingUserSettings user={user} adminMode={adminMode} />
            </div>
          </div>
        </div>
      </header>



      {/* Mobile & Tablet (< 1024px / lg:hidden) Fixed Bottom Navigation Bar (Nav Items Only) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        aria-hidden={isExamActive}
        dir={isRTL ? "rtl" : "ltr"}
        className={`fixed bottom-0 left-0 right-0 z-[60] lg:hidden bg-white/95 dark:bg-[#0a0a0e]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 pb-[max(0.25rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
          isExamActive
            ? "hidden pointer-events-none opacity-0 invisible translate-y-full select-none"
            : "block opacity-100 visible translate-y-0"
        }`}
      >
        <div className="flex flex-row justify-around items-center h-16 px-1.5 max-w-2xl mx-auto">
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
                      : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <span
                  className={`text-[10px] leading-tight truncate max-w-[54px] transition-colors ${
                    item.isActive
                      ? "font-bold text-primary"
                      : "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                </span>
              </>
            );

            if (adminMode && item.href) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateAdmin(item.href!)}
                  className="group relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full py-1 min-w-0 cursor-pointer"
                >
                  {mobileContent}
                </button>
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
        </div>
      </nav>
    </>
  );
}
