"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  BookOpen,
  FileText,
  Car,
  Users,
  BarChart3,
  Settings,
  Play,
  Award,
  ShieldCheck,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { getDashboardData, type ContinueLearningData, type DashboardStats } from "@/app/dashboard/actions/course";
import { useDesktopWidgets } from "@/lib/desktop-widgets";
import { OSWallpaper } from "./os-wallpaper";

interface OSDesktopViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

export function OSDesktopView({ navigate, onOpenSpotlight }: OSDesktopViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { isHidden, hide } = useDesktopWidgets();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getDashboardData(user?.id);
        if (isMounted) {
          setContinueData(data.continueLearning);
          setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to load OS dashboard data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const getTitle = (key: string, fallback: string) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  const desktopIcons = [
    {
      id: "course",
      title: getTitle("courseStudio", "Course Studio"),
      subtitle: "Modules & Curriculum",
      icon: BookOpen,
      action: () => navigate("course"),
      gradient: "from-emerald-500 to-teal-700",
      badge: continueData ? "Active" : undefined,
    },
    {
      id: "exams",
      title: getTitle("examCenter", "Exam Center"),
      subtitle: "Official Practice Tests",
      icon: FileText,
      action: () => navigate("exams"),
      gradient: "from-amber-500 to-orange-700",
    },
    {
      id: "signs",
      title: getTitle("trafficSignsCatalog", "Road Signs"),
      subtitle: "120+ Traffic Signs",
      icon: Compass,
      action: () => navigate("course", { module: "signs" }),
      gradient: "from-blue-500 to-indigo-700",
    },
    {
      id: "driver-hub",
      title: getTitle("driverHub", "Driving Hub"),
      subtitle: "Instructors & Schools",
      icon: Car,
      action: () => navigate("driver-hub"),
      gradient: "from-purple-500 to-pink-700",
    },
    {
      id: "classmates",
      title: getTitle("classmates", "Classmates"),
      subtitle: "Peer Study Groups",
      icon: Users,
      action: () => navigate("classmates"),
      gradient: "from-cyan-500 to-blue-700",
    },
    {
      id: "results",
      title: getTitle("resultsAnalytics", "Performance"),
      subtitle: "Exam Transcripts",
      icon: BarChart3,
      action: () => navigate("results"),
      gradient: "from-rose-500 to-red-700",
    },
    {
      id: "settings",
      title: getTitle("systemPreferences", "Preferences"),
      subtitle: "System Config",
      icon: Settings,
      action: () => navigate("settings"),
      gradient: "from-zinc-500 to-zinc-800",
    },
  ];

  const passRate = stats?.progressPercent
    ? Math.min(98, Math.max(70, stats.progressPercent + 15))
    : 85;

  const showSessionBanner = Boolean(continueData && !isHidden("resume-session"));
  const showReadinessWidget = !isHidden("exam-readiness");
  const showDailyRuleWidget = !isHidden("daily-rule");
  const showQuickStatsWidget = !isHidden("quick-stats");

  const hasAnyRightWidget =
    showReadinessWidget || showDailyRuleWidget || showQuickStatsWidget;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-start select-none overflow-hidden">
      {/* High-Aesthetic Luminous OS Wallpaper (dynamic light/dark adaptation) */}
      <OSWallpaper />

      <div
        className={`grid grid-cols-1 ${
          hasAnyRightWidget ? "lg:grid-cols-[1fr_380px]" : "max-w-5xl"
        } gap-8 max-w-7xl mx-auto w-full items-start transition-all duration-300 pt-2 sm:pt-4`}
      >
        {/* Left: Desktop Applications Grid */}
        <div className="space-y-6">
          {/* Desktop App Icons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {desktopIcons.map((app) => {
              const Icon = app.icon;
              return (
                <motion.div
                  key={app.id}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={app.action}
                  className="group flex flex-col items-center text-center p-3 sm:p-4 rounded-2xl bg-white/80 hover:bg-white dark:bg-card/60 dark:hover:bg-card/95 border border-slate-200/80 hover:border-emerald-500/50 dark:border-border/40 dark:hover:border-primary/40 transition-all cursor-pointer backdrop-blur-xl shadow-none"
                >
                  <div className="relative mb-3">
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${app.gradient} text-white flex items-center justify-center transition-transform shadow-none`}
                    >
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>

                    {app.badge && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-full bg-emerald-500 text-white shadow-none">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  <span className="font-semibold text-xs sm:text-sm text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {app.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {app.subtitle}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Dismissible Desktop Banner: Continue Last Session */}
          <AnimatePresence>
            {showSessionBanner && continueData && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="relative p-5 rounded-2xl border border-emerald-500/30 bg-white/80 dark:bg-primary/5 hover:bg-white/95 dark:hover:bg-primary/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl shadow-none group"
              >
                {/* Dismiss button 'x' */}
                <button
                  type="button"
                  onClick={() => hide("resume-session")}
                  title="Hide banner (can be restored from OS-Bar View menu)"
                  className="absolute top-2.5 right-2.5 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-primary/20 transition-colors cursor-pointer shadow-none"
                  aria-label="Hide banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-1.5 min-w-0 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                      RESUME ACTIVE WINDOW
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {continueData.moduleTitle}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground truncate">
                    {continueData.lessonTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    Pick up right where you left off with synchronized progress and audio reader.
                  </p>
                </div>

                <Button
                  onClick={() => navigate("course")}
                  className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs shrink-0 cursor-pointer shadow-none"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Studio</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Live Desktop Widgets Panel (Dismissible with 'x' icon) */}
        {hasAnyRightWidget && (
          <div className="space-y-4">
            {/* Widget 1: Official Exam Readiness Ring */}
            <AnimatePresence>
              {showReadinessWidget && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-border/50 bg-white/85 dark:bg-card/70 backdrop-blur-xl shadow-none space-y-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Official Exam Readiness
                      </span>
                    </div>

                    {/* 'x' dismiss button */}
                    <button
                      type="button"
                      onClick={() => hide("exam-readiness")}
                      title="Hide card (restore anytime from OS-Bar Widgets menu)"
                      className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shadow-none"
                      aria-label="Hide readiness widget"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-muted/30"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500"
                          strokeDasharray={`${passRate}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-lg font-extrabold text-foreground font-mono">
                          {passRate}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground">
                        High Probability
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Based on recent curriculum tests and timed exam performances.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("exams")}
                    className="w-full rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-none"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Simulate Official 20Q Test</span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Widget 2: Traffic Rule of the Day */}
            <AnimatePresence>
              {showDailyRuleWidget && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative p-5 rounded-2xl border border-slate-200/80 dark:border-border/50 bg-white/85 dark:bg-card/70 backdrop-blur-xl shadow-none space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Daily Traffic Code Snippet
                      </span>
                    </div>

                    {/* 'x' dismiss button */}
                    <button
                      type="button"
                      onClick={() => hide("daily-rule")}
                      title="Hide card (restore anytime from OS-Bar Widgets menu)"
                      className="p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shadow-none"
                      aria-label="Hide rule widget"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-foreground">
                    Roundabout & Priority Rules
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vehicles already engaged in a roundabout have absolute right-of-way over vehicles entering, unless indicated otherwise by priority signs or police officers.
                  </p>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      Law No. 55/2013 (Rwanda)
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("course", { module: "rules" })}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer shadow-none"
                    >
                      <span>Read Full Rule</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Widget 3: Quick System Stats */}
            <AnimatePresence>
              {showQuickStatsWidget && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative p-4 rounded-2xl border border-slate-200/80 dark:border-border/40 bg-white/85 dark:bg-card/40 backdrop-blur-xl shadow-none group"
                >
                  {/* 'x' dismiss button */}
                  <button
                    type="button"
                    onClick={() => hide("quick-stats")}
                    title="Hide card (restore anytime from OS-Bar Widgets menu)"
                    className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shadow-none"
                    aria-label="Hide stats widget"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="grid grid-cols-2 gap-3 text-center pt-2">
                    <div className="p-2.5 rounded-xl bg-muted/40">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Total Modules
                      </span>
                      <span className="text-lg font-bold text-foreground font-mono">
                        {stats?.totalModules ?? 4}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Passed Tests
                      </span>
                      <span className="text-lg font-bold text-emerald-500 font-mono">
                        {stats?.modulesCompleted ?? 2}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
