"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export function FloatingHeader({ adminMode = false }: { adminMode?: boolean } = {}) {
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const pathname = usePathname();
  const [isExamActive, setIsExamActive] = useState(false);

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

  // Don't render during active exam
  if (isExamActive) {
    return null;
  }

  // Don't render if no user
  if (!user && !authLoading) {
    return null;
  }

  return (
    <div
      className={`fixed top-2 md:top-4 ${isRTL ? "left-2 md:left-4" : "right-2 md:right-4"} z-50 flex items-center gap-2`}
    >
      <div className="premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark">
        <NotificationsDropdown />
      </div>

      <div className="premium-glass-panel border rounded-full overflow-hidden transition-all hover:shadow-glow dark:hover:shadow-glow-dark">
        <FloatingUserSettings user={user} adminMode={adminMode} />
      </div>
    </div>
  );
}
