"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "./notifications-dropdown";
import { FloatingUserSettings } from "./floating-user-settings";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export function FloatingHeader() {
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
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className={`flex items-center ${isRTL ? 'justify-start' : 'justify-end'} gap-2`}>
          {/* Notifications */}
          <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
            <NotificationsDropdown />
          </div>

          {/* User Settings */}
          <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
            <FloatingUserSettings user={user} onMobile />
          </div>
        </div>
      </div>

      {/* Desktop Header - Top Right/Left based on RTL */}
      <div className={`hidden md:flex fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 items-center gap-3`}>
        {/* Notifications */}
        <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
          <NotificationsDropdown />
        </div>

        {/* User Settings */}
        <div className="bg-background/95 backdrop-blur-sm border rounded-full shadow-lg">
          <FloatingUserSettings user={user} />
        </div>
      </div>
    </>
  );
}
