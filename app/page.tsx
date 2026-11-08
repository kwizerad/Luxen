"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mail, ShieldCheck, UserPlus, LogIn, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth-utils";
import { OSSystemBar } from "@/components/os/os-system-bar";
import { OSDesktopView } from "@/components/os/os-desktop-view";
import { OSDock } from "@/components/os/os-dock";
import { OSSpotlight } from "@/components/os/os-spotlight";
import { OSContextMenu } from "@/components/os/os-context-menu";
import { OSWallpaper } from "@/components/os/os-wallpaper";
import { useLanguage } from "@/lib/language-context";
import { formatLocalizedDate } from "@/lib/date-utils";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";
import { AuthModalsContainer } from "@/components/auth-modals-container";
import { useAuthModals } from "@/lib/auth-modals-context";
import { useAuth } from "@/lib/auth-context";
import { GoogleOneTap } from "@/components/google-one-tap";

export default function Home() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { openLogin, openSignUp } = useAuthModals();
  const [userData, setUserData] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authStep, setAuthStep] = useState<"initial" | "login" | "register">("initial");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // Live Clock & Date localized with authentic Kinyarwanda calendar terms
  const [timeStr, setTimeStr] = useState("12:00 PM");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
      setDateStr(formatLocalizedDate(now, language));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const triggerLoginSuccess = (userObj?: any) => {
    if (userObj) setUserData(userObj);
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsLoggingIn(false);
    }, 800);
  };

  const handleNavigate = (view: string, params?: Record<string, string>) => {
    if (params) {
      const q = new URLSearchParams(params).toString();
      router.push(`/dashboard#${view}${q ? `?${q}` : ""}`);
    } else {
      router.push(`/dashboard#${view}`);
    }
  };

  // Effective authenticated user (from AuthProvider or immediate login trigger)
  const activeUser = authUser || userData;
  const isAuthenticated = Boolean(activeUser);

  // 1. Immediate Lightweight #050816 Dark Loading Screen while Auth Resolves
  if (authLoading && !activeUser) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050816] text-white select-none">
        <div className="flex flex-col items-center space-y-5">
          {/* Glowing App Badge */}
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-2xl text-emerald-400 shadow-lg shadow-emerald-500/10 animate-pulse">
              N
            </div>
          </div>
          {/* Animated Ring Spinner */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <span className="text-[11px] font-mono tracking-widest text-emerald-400/80 uppercase">
              Navo OS
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logging In Transition Screen
  if (isLoggingIn) {
    const nameToDisplay =
      activeUser?.user_metadata?.full_name ||
      activeUser?.email?.split("@")[0] ||
      "Student Account";

    return (
      <div className="relative min-h-[100dvh] w-full bg-[#050816] flex flex-col items-center justify-center text-white select-none overflow-hidden px-4 transition-colors">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md -z-10" />

        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center space-y-6 text-center z-10"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-400 via-teal-600 to-emerald-800 p-1 ring-4 ring-emerald-500/20 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold overflow-hidden">
              {nameToDisplay.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {nameToDisplay}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-400 font-medium tracking-wide">
              Welcome back / Murakaza neza
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-7 h-7 rounded-full border-3 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <span className="text-xs text-zinc-300 font-mono tracking-wider">
              Launching Workspace...
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Windows 11 Lock Screen & Authentic Navo OS Auth Options
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between select-none overflow-x-hidden px-4 sm:px-6 py-8 sm:py-12 bg-slate-50 dark:bg-zinc-950 transition-colors">
        <AuthModalsContainer />
        <GoogleOneTap alwaysPrompt />

        {/* Immersive Wallpaper Background (Adapts to Light / Dark Theme) */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),rgba(241,245,249,0.98))] dark:bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.2),rgba(9,9,11,0.97))] bg-cover bg-center" />
        <div className="absolute inset-0 -z-10 bg-slate-100/50 dark:bg-black/50 backdrop-blur-[4px]" />

        {/* Top / Center: Responsive Lockscreen Clock */}
        <div className="mt-12 sm:mt-16 flex flex-col items-center text-center space-y-1 z-10 w-full">
          <motion.h1
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-light tracking-tight text-foreground dark:text-white font-sans"
          >
            {timeStr}
          </motion.h1>
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-lg font-medium text-muted-foreground dark:text-zinc-200"
          >
            {dateStr}
          </motion.p>
        </div>

        {/* Center Card: Win11 Authentication Hub with Authentic LoginForm & SignUpForm */}
        <div className="my-auto w-full max-w-sm sm:max-w-md flex flex-col items-center z-10 px-2 py-4">
          <AnimatePresence mode="wait">
            {authStep === "initial" && (
              <motion.div
                key="initial"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="flex flex-col items-center space-y-4 w-full"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-700 p-1 ring-4 ring-emerald-500/20 dark:ring-white/15 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-none">
                  N
                </div>
                <div className="text-center space-y-0.5">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-white">
                    {language === "Kinyarwanda" || language === "rw"
                      ? "Konti y'Umunyeshuri"
                      : language === "French" || language === "fr"
                      ? "Compte Étudiant"
                      : t("studentAccount") || "Student Account"}
                  </h2>
                  <p className="text-xs text-muted-foreground dark:text-zinc-300">
                    {language === "Kinyarwanda" || language === "rw"
                      ? "Amategeko y'Umuhanda n'Ibizami by'Agateganyo mu Rwanda"
                      : language === "French" || language === "fr"
                      ? "Permis Provisoire & Code de la Route au Rwanda"
                      : t("rwandaDrivingExamSub") || "Rwanda Driving Theory & Police Provisional Exam"}
                  </p>
                </div>

                <Button
                  onClick={() => setAuthStep("login")}
                  className="mt-3 px-7 py-3 rounded-2xl bg-card/80 hover:bg-card text-foreground dark:bg-white/15 dark:hover:bg-white/25 dark:text-white backdrop-blur-xl border border-border/70 dark:border-white/20 font-semibold text-xs sm:text-sm transition-all cursor-pointer gap-2 shadow-none focus:ring-0 active:scale-98"
                >
                  <span>
                    {language === "Kinyarwanda" || language === "rw"
                      ? "Komeza"
                      : language === "French" || language === "fr"
                      ? "Continuer"
                      : t("continueBtn") || "Continue"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* AUTHENTIC LOGIN FORM (Includes National ID 16-Digit verification challenge + Google + Email) */}
            {authStep === "login" && (
              <motion.div
                key="login"
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                className="w-full rounded-3xl border border-border/80 dark:border-white/15 bg-card/95 dark:bg-zinc-900/95 text-card-foreground dark:text-white backdrop-blur-2xl p-5 sm:p-7 shadow-none"
              >
                <LoginForm
                  onSuccess={() => triggerLoginSuccess()}
                  onSwitchToSignUp={() => setAuthStep("register")}
                  onBack={() => setAuthStep("initial")}
                />
              </motion.div>
            )}

            {/* AUTHENTIC SIGN UP FORM (Includes National ID 16-Digit registration + verification + password creation) */}
            {authStep === "register" && (
              <motion.div
                key="register"
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                className="w-full rounded-3xl border border-border/80 dark:border-white/15 bg-card/95 dark:bg-zinc-900/95 text-card-foreground dark:text-white backdrop-blur-2xl p-5 sm:p-7 shadow-none"
              >
                <SignUpForm
                  onSuccess={() => triggerLoginSuccess()}
                  onSwitchToLogin={() => setAuthStep("login")}
                  onBack={() => setAuthStep("initial")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer: Direct Clickable Language Buttons (NO TEXT, NO DROPDOWN) */}
        <div className="z-15 flex flex-wrap items-center justify-center gap-2 py-3 px-2">
          <button
            type="button"
            onClick={() => setLanguage("Kinyarwanda")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-none ${
              language === "Kinyarwanda"
                ? "bg-emerald-600 text-white border-emerald-500 font-semibold"
                : "bg-card/70 hover:bg-card text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 border-border/70 dark:border-white/15"
            }`}
          >
            <span>🇷🇼</span>
            <span>Ikinyarwanda</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage("English")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-none ${
              language === "English"
                ? "bg-emerald-600 text-white border-emerald-500 font-semibold"
                : "bg-card/70 hover:bg-card text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 border-border/70 dark:border-white/15"
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage("French")}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-none ${
              language === "French"
                ? "bg-emerald-600 text-white border-emerald-500 font-semibold"
                : "bg-card/70 hover:bg-card text-foreground dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 border-border/70 dark:border-white/15"
            }`}
          >
            <span>🇫🇷</span>
            <span>Français</span>
          </button>
        </div>
      </div>
    );
  }

  // Authenticated: Render Navo OS Desktop
  return (
    <OSContextMenu navigate={handleNavigate} onOpenSpotlight={() => setIsSpotlightOpen(true)}>
      <div className="relative min-h-screen w-full flex flex-col bg-cover bg-center bg-no-repeat text-foreground overflow-x-hidden selection:bg-emerald-500/30">
        <AuthModalsContainer />

        {/* OS Top Global Menu Bar */}
        <OSSystemBar
          activeView="home"
          navigate={handleNavigate}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
        />

        {/* Main OS Stage / Desktop */}
        <main className="flex-1 w-full min-w-0 flex flex-col pt-9 pb-20 lg:pb-24 px-2 sm:px-4">
          <OSDesktopView
            navigate={handleNavigate}
            onOpenSpotlight={() => setIsSpotlightOpen(true)}
          />
        </main>

        {/* Bottom Floating OS Dock */}
        <OSDock
          activeView="home"
          navigate={handleNavigate}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
        />

        {/* Global Spotlight Search Overlay (⌘K) */}
        <OSSpotlight
          isOpen={isSpotlightOpen}
          onClose={() => setIsSpotlightOpen(false)}
          navigate={handleNavigate}
        />
      </div>
    </OSContextMenu>
  );
}
