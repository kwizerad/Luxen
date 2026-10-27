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

import { OSSystemBar } from "@/components/os/os-system-bar";
import { OSDock } from "@/components/os/os-dock";
import { OSSpotlight } from "@/components/os/os-spotlight";
import { OSWallpaper } from "@/components/os/os-wallpaper";
import { useHashRouter } from "@/hooks/use-hash-router";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { isRTL } = useLanguage();
  const { config } = useBrandingConfig();
  const { view: activeView, navigate } = useHashRouter();

  const [isExamActive, setIsExamActive] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isFullBleedView, setIsFullBleedView] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // Check if current route is a full-bleed chat/classmates view
  useEffect(() => {
    const syncFullBleed = () => {
      if (typeof window === "undefined") return;
      const rawHash = window.location.hash.replace(/^#/, "").split("?")[0];
      const active = rawHash || "home";
      setIsFullBleedView(
        pathname === "/dashboard" &&
          (active === "classmates" || active === "chat/conversation")
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

  // Allow guest and student preview access without redirecting to old landing page
  const isExamInProgress = isExamActive;

  return (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col bg-slate-50/50 dark:bg-[#08090c] text-foreground overflow-x-hidden selection:bg-emerald-500/30"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* High-aesthetic OS Desktop Wallpaper */}
      <OSWallpaper />

      <GlobalGroupExamInvite />

      {/* OS Top Global Menu Bar */}
      {!isExamInProgress && (
        <OSSystemBar
          activeView={activeView}
          navigate={navigate}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
        />
      )}

      {/* Main OS Stage / Desktop */}
      <main
        className={`flex-1 w-full min-w-0 flex flex-col ${
          isExamInProgress || isFullBleedView
            ? "pt-0 pb-0"
            : "pt-9 pb-20 lg:pb-24 px-2 sm:px-4"
        }`}
      >
        {children}
      </main>

      {/* Bottom Floating OS Dock */}
      {!isExamInProgress && !isChatActive && (
        <OSDock
          activeView={activeView}
          navigate={navigate}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
        />
      )}

      {/* Global Spotlight Search Overlay (⌘K) */}
      <OSSpotlight
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        navigate={navigate}
      />
    </div>
  );
}
