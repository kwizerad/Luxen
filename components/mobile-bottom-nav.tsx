"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Trophy, Settings, Home, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useNavAutohideEnabled } from "@/lib/use-nav-autohide";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileBottomNavProps {
  hide?: boolean;
}

export function MobileBottomNav({ hide = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isExamActive, setIsExamActive] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const autohideEnabled = useNavAutohideEnabled();

  // Check if exam is active
  useEffect(() => {
    const checkExamActive = () => {
      const isActive = sessionStorage.getItem('exam-active') === 'true';
      setIsExamActive(isActive);
    };

    checkExamActive();

    const handleExamStateChange = () => {
      checkExamActive();
    };

    window.addEventListener('exam-state-change', handleExamStateChange);
    window.addEventListener('storage', handleExamStateChange);

    return () => {
      window.removeEventListener('exam-state-change', handleExamStateChange);
      window.removeEventListener('storage', handleExamStateChange);
    };
  }, []);

  // Cursor-proximity auto-hide (large screens only, respects user preference).
  // Navbar hides after inactivity and reappears when the cursor
  // approaches the bottom of the viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If autohide is disabled, always show the navbar
    if (!autohideEnabled) {
      setNavVisible(true);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const REVEAL_ZONE = 100; // px from bottom that reveals the navbar
    const HIDE_DELAY = 2500; // ms of inactivity before hiding

    const scheduleHide = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (window.innerWidth >= 1024) setNavVisible(false);
      }, HIDE_DELAY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) {
        setNavVisible(true);
        return;
      }

      const nearBottom = e.clientY > window.innerHeight - REVEAL_ZONE;
      if (nearBottom) {
        setNavVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
      } else {
        scheduleHide();
      }
    };

    const handleMouseLeave = () => {
      if (window.innerWidth >= 1024) scheduleHide();
    };

    // Keep navbar visible when resized to small screen; reschedule on large
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        if (hideTimer) clearTimeout(hideTimer);
        setNavVisible(true);
      } else {
        scheduleHide();
      }
    };

    if (window.innerWidth >= 1024) scheduleHide();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [autohideEnabled]);

  const navItems: NavItem[] = [
    { href: "/dashboard", labelKey: "home", icon: LayoutDashboard },
    { href: "/dashboard/course", labelKey: "courses", icon: BookOpen },
    { href: "/dashboard/exam", labelKey: "takeExam", icon: FileText },
    { href: "/userExam", labelKey: "results", icon: Trophy },
    { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
  ];

  if (hide) return null;

  // Hide during any active exam
  if (isExamActive) return null;

  // Helper to check if a nav item is active (works with nested routes)
  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") {
      // Dashboard is only active on exact match
      return pathname === href;
    }
    // Other routes are active if pathname starts with the href
    return pathname.startsWith(href);
  };

  return (
    <>
    {/* Thin indicator line shown when navbar is hidden (autohide) */}
    {!navVisible && autohideEnabled && (
      <div
        className="fixed bottom-1.5 left-3 right-3 z-40 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2 h-1 rounded-full bg-primary transition-opacity duration-300"
        style={{ boxShadow: "0 0 12px 2px hsl(var(--primary) / 0.8), 0 0 24px 6px hsl(var(--primary) / 0.4)" }}
        aria-hidden="true"
      />
    )}
    <div
      className={`fixed bottom-3 left-3 right-3 z-50 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2 transition-all duration-300 ${
        navVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-[120%] opacity-0 pointer-events-none"
      }`}
    >
      {/* Glassmorphism container */}
      <div className="premium-glass-panel student-nav-pill border rounded-[20px] h-14 overflow-hidden shadow-lg">
        <div className="grid grid-cols-5 h-full">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item.href);
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "student-nav-btn flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative rounded-xl mx-1 my-1",
                  isActive && "student-nav-active font-semibold"
                )}
                aria-label={t(item.labelKey)}
                aria-current={isActive ? "page" : undefined}
              >
                <div className={cn(
                  "student-nav-icon-wrap p-1.5 rounded-full transition-all duration-200"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "scale-105"
                )}>
                  {t(item.labelKey)}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
