"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import Link from "next/link";

export function FloatingHeader({ adminMode = false }: { adminMode?: boolean } = {}) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const [isExamActive, setIsExamActive] = useState(false);

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

    const handleExamStateChange = () => {
      checkExamActive();
    };

    window.addEventListener("exam-state-change", handleExamStateChange);
    window.addEventListener("storage", handleExamStateChange);

    return () => {
      window.removeEventListener("exam-state-change", handleExamStateChange);
      window.removeEventListener("storage", handleExamStateChange);
    };
  }, [pathname]);

  const isExamPage = !adminMode && (pathname?.startsWith("/dashboard/exam") || pathname === "/exam" || pathname?.startsWith("/exam/"));

  if (isExamActive || isExamPage) {
    return null;
  }

  if (!user && !authLoading) {
    return null;
  }

  const homeHref = adminMode ? "/Admin" : "/dashboard";

  return (
    <>
      {/* Action buttons — right side */}
      <div
        className={`fixed top-2 md:top-4 ${isRTL ? "left-2 md:left-4" : "right-2 md:right-4"} z-50 flex items-center gap-1.5 md:gap-2 transition-all duration-300`}
      >
        {/* Notifications */}
        <div className="premium-glass-panel border rounded-full transition-all relative">
          <NotificationsDropdown />
        </div>

        {/* User settings / profile */}
        <div className="premium-glass-panel border rounded-full overflow-hidden transition-all">
          <FloatingUserSettings user={user} adminMode={adminMode} />
        </div>
      </div>
    </>
  );
}
