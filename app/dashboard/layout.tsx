"use client";

import { useEffect, useState } from "react";
import { DashboardLayoutSkeleton } from "@/components/skeletons";
import { useRouter, usePathname } from "next/navigation";
import { isPrimaryAdmin } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { FloatingHeader } from "@/components/floating-header";
import { useLanguage } from "@/lib/language-context";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useLoginRecorder } from "@/hooks/use-login-recorder";
import { GlobalGroupExamInvite } from "@/components/global-group-exam-invite";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const [isExamActive, setIsExamActive] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isFullBleedView, setIsFullBleedView] = useState(false);

  // Check if current route is a full-bleed chat/classmates view
  useEffect(() => {
    const syncFullBleed = () => {
      if (typeof window === "undefined") return;
      const rawHash = window.location.hash.replace(/^#/, "").split("?")[0];
      const activeView = rawHash || "home";
      setIsFullBleedView(
        pathname === "/dashboard" &&
          (activeView === "classmates" || activeView === "chat/conversation")
      );
    };
    syncFullBleed();
    window.addEventListener("hashchange", syncFullBleed);
    window.addEventListener("popstate", syncFullBleed);
    window.addEventListener("navo-hash-route-change", syncFullBleed);
    return () => {
      window.removeEventListener("hashchange", syncFullBleed);
      window.removeEventListener("popstate", syncFullBleed);
      window.removeEventListener("navo-hash-route-change", syncFullBleed);
    };
  }, [pathname]);

  // Check if exam is active (to hide dock nav and headers during active exam)
  useEffect(() => {
    const checkExamActive = () => {
      const isExam = sessionStorage.getItem("exam-active") === "true";
      setIsExamActive(isExam);
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

  // Check if chat is active (to hide dock nav during chat on small devices)
  useEffect(() => {
    const checkChatActive = () => {
      const isChatting =
        sessionStorage.getItem("chat-active") === "true" ||
        sessionStorage.getItem("student-chat-active") === "true";
      setIsChatActive(isChatting);
    };
    checkChatActive();
    const handleChatStateChange = () => checkChatActive();
    window.addEventListener("chat-state-change", handleChatStateChange);
    window.addEventListener("student-chat-state-change", handleChatStateChange);
    window.addEventListener("storage", handleChatStateChange);
    return () => {
      window.removeEventListener("chat-state-change", handleChatStateChange);
      window.removeEventListener("student-chat-state-change", handleChatStateChange);
      window.removeEventListener("storage", handleChatStateChange);
    };
  }, []);

  // Track user activity for real-time online status
  useActivityTracker();
  useLoginRecorder();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/");
      return;
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return <DashboardLayoutSkeleton />;
  }

  // Only hide header and dock nav during an active exam (in session)
  const isExamInProgress = isExamActive;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-transparent overflow-x-clip" dir={isRTL ? "rtl" : "ltr"}>
      <GlobalGroupExamInvite />
      <FloatingHeader />

      {/* Main Content */}
      <main
        className={`flex-1 w-full min-w-0 ${
          isExamInProgress || isFullBleedView
            ? "pt-0 pb-0"
            : "pt-4 sm:pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
