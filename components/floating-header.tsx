"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { isAdmin } from "@/lib/permissions";
import { Home, LayoutDashboard, Bell } from "lucide-react";
import Link from "next/link";

export function FloatingHeader({ adminMode = false }: { adminMode?: boolean } = {}) {
  const { user, loading: authLoading } = useAuth();
  const { isRTL, t } = useLanguage();
  const { config } = useBrandingConfig();
  const pathname = usePathname();
  const [isExamActive, setIsExamActive] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const checkExamActive = () => {
      const isActive = sessionStorage.getItem('exam-active') === 'true';
      setIsExamActive(isActive);
    };

    checkExamActive();

    const handleExamStateChange = () => {
      checkExamActive();
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('exam-state-change', handleExamStateChange);
    window.addEventListener('storage', handleExamStateChange);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('exam-state-change', handleExamStateChange);
      window.removeEventListener('storage', handleExamStateChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (isExamActive) {
    return null;
  }

  if (!user && !authLoading) {
    return null;
  }

  const homeHref = adminMode ? "/Admin" : "/dashboard";
  const dashboardLabel = adminMode ? t("adminDashboard") : t("dashboard");

  return (
    <>
      {/* Brand logo — left side */}
      <Link
        href={homeHref}
        className={`fixed top-2 md:top-4 ${isRTL ? "right-2 md:right-4" : "left-2 md:left-4"} z-50 flex items-center gap-2 premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark px-3 py-1.5 group ${isScrolled ? "scale-95 md:scale-100" : "scale-100"}`}
      >
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden shrink-0">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold">{config.logoText || "N"}</span>
          )}
        </div>
        <span className="text-xs font-semibold tracking-tight whitespace-nowrap max-w-[120px] truncate group-hover:text-primary transition-colors">
          {config.systemName}
        </span>
      </Link>

      {/* Action buttons — right side */}
      <div
        className={`fixed top-2 md:top-4 ${isRTL ? "left-2 md:left-4" : "right-2 md:right-4"} z-50 flex items-center gap-1.5 md:gap-2 transition-all duration-300 ${isScrolled ? "scale-95 md:scale-100" : "scale-100"}`}
      >
        {/* Quick home/dashboard link */}
        <Link
          href={homeHref}
          className={`premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark flex items-center justify-center h-9 w-9 md:h-10 md:w-10 shrink-0 group`}
          title={dashboardLabel}
        >
          <LayoutDashboard className="h-4 w-4 md:h-[18px] md:w-[18px] text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>

        {/* Notifications */}
        <div className="premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark">
          <NotificationsDropdown />
        </div>

        {/* User settings / profile */}
        <div className="premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark">
          <FloatingUserSettings user={user} adminMode={adminMode} />
        </div>
      </div>
    </>
  );
}
