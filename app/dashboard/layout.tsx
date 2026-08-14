"use client";

import { useEffect, useState } from "react";
import { DashboardLayoutSkeleton } from "@/components/skeletons";
import { useRouter, usePathname } from "next/navigation";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { DockNav } from "@/components/dock-nav";
import { FloatingHeader } from "@/components/floating-header";
import { useLanguage } from "@/lib/language-context";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useLoginRecorder } from "@/hooks/use-login-recorder";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const [isExamActive, setIsExamActive] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);

  // Check if exam is active (to hide dock nav during exam)
  useEffect(() => {
    const checkExamActive = () => {
      setIsExamActive(sessionStorage.getItem('exam-active') === 'true');
    };
    checkExamActive();
    const handleExamStateChange = () => checkExamActive();
    window.addEventListener('exam-state-change', handleExamStateChange);
    window.addEventListener('storage', handleExamStateChange);
    return () => {
      window.removeEventListener('exam-state-change', handleExamStateChange);
      window.removeEventListener('storage', handleExamStateChange);
    };
  }, []);

  // Check if chat is active (to hide dock nav during chat on small devices)
  useEffect(() => {
    const checkChatActive = () => {
      setIsChatActive(sessionStorage.getItem('chat-active') === 'true');
    };
    checkChatActive();
    const handleChatStateChange = () => checkChatActive();
    window.addEventListener('chat-state-change', handleChatStateChange);
    return () => {
      window.removeEventListener('chat-state-change', handleChatStateChange);
    };
  }, []);

  // Prevent back button from leaving the dashboard to the landing page or exiting the site.
  // Push a buffer history state so there is always an extra entry to absorb the back press.
  // On popstate: if still on /dashboard, re-push the buffer; if leaving, redirect back.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/dashboard") return;

    window.history.pushState({ navBuffer: true }, "", window.location.href);

    const handlePopState = () => {
      if (window.location.pathname === "/dashboard") {
        // Re-push buffer to absorb future back presses
        window.history.pushState({ navBuffer: true }, "", window.location.href);
        // Ensure the hash router picks up the current hash
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        // Redirect back to dashboard, preserving any hash
        router.replace("/dashboard" + window.location.hash);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname, router]);

  // Track user activity for real-time online status
  useActivityTracker();
  useLoginRecorder();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    if (isPrimaryAdmin(user)) {
      router.push("/Admin");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <div className="bg-transparent" dir={isRTL ? "rtl" : "ltr"}>
      <FloatingHeader />

      {/* Main Content */}
      <main className="min-w-0 pt-14 md:pt-16">
        {children}
      </main>

      {/* Bottom Navigation (hidden during active exam, or on mobile during chat) */}
      {!isExamActive && <DockNav hideOnMobile={isChatActive} />}
    </div>
  );
}
