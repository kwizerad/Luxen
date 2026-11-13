"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  BookOpen,
  FileText,
  Car,
  Users,
  BarChart3,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { AgoraIcon } from "@/components/ui/agora-icon";
import { useServiceVisibilityManager } from "@/hooks/useServiceVisibilityManager";

export interface OSDockProps {
  activeView: string;
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

interface DockItem {
  id: string;
  view: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string | number;
}

export function OSDock({ activeView, navigate, onOpenSpotlight }: OSDockProps) {
  const { t } = useLanguage();
  const { isServicesPageEnabled } = useServiceVisibilityManager();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExamActive, setIsExamActive] = useState<boolean>(false);

  const checkExamState = () => {
    if (typeof window === "undefined") return;
    setIsExamActive(sessionStorage.getItem("exam-active") === "true");
  };

  useEffect(() => {
    checkExamState();
    window.addEventListener("exam-state-change", checkExamState);
    window.addEventListener("storage", checkExamState);
    return () => {
      window.removeEventListener("exam-state-change", checkExamState);
      window.removeEventListener("storage", checkExamState);
    };
  }, []);

  const isExamSessionActive = isExamActive;

  if (isExamSessionActive) {
    return null;
  }

  const getLabel = (key: string, fallback: string) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  const allItems: DockItem[] = [
    {
      id: "home",
      view: "home",
      title: getLabel("desktop", "Desktop Workspace"),
      icon: Compass,
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "course",
      view: "course",
      title: getLabel("courses", getLabel("courseStudioNav", "Courses")),
      icon: BookOpen,
      color: "from-emerald-500 to-teal-600",
    },
    {
      id: "exams",
      view: "exams",
      title: getLabel("examCenter", "Exam Center"),
      icon: FileText,
      color: "from-amber-500 to-orange-600",
    },
    {
      id: "agora",
      view: "classmates",
      title: "Agora",
      icon: AgoraIcon,
      color: "from-indigo-600 via-purple-600 to-cyan-600",
    },
    {
      id: "services",
      view: "services",
      title: getLabel("services", "Services"),
      icon: Car,
      color: "from-purple-500 to-pink-600",
    },
    {
      id: "results",
      view: "results",
      title: getLabel("resultsAnalytics", "Performance"),
      icon: BarChart3,
      color: "from-rose-500 to-red-600",
    },
    {
      id: "settings",
      view: "settings",
      title: getLabel("systemPreferences", "Preferences"),
      icon: Settings,
      color: "from-zinc-500 to-zinc-700",
    },
  ];

  const items = allItems.filter((item) => {
    if (item.id === "services" && !isServicesPageEnabled) return false;
    return true;
  });

  return (
    <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-[75] max-w-[calc(100vw-0.5rem)] select-none pointer-events-auto">
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 24, stiffness: 300 }}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1 sm:py-2 rounded-xl sm:rounded-2xl bg-card/85 dark:bg-black/85 backdrop-blur-2xl border border-border/60 dark:border-white/10 shadow-none max-w-full overflow-x-auto scrollbar-none"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === item.view ||
            (item.view === "exams" && activeView === "exam") ||
            (item.view === "course" &&
              (activeView === "traffic-rules" || activeView === "terminal"));

          return (
            <div
              key={item.id}
              className="relative flex flex-col items-center shrink-0"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Tooltip Label (Desktop only) */}
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: -8, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="hidden sm:block absolute -top-7 px-2.5 py-1 rounded-md bg-popover dark:bg-zinc-950/95 text-popover-foreground dark:text-white font-sans text-[11px] font-medium shadow-none border border-border/60 dark:border-white/10 whitespace-nowrap pointer-events-none"
                  >
                    {item.title}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* App Icon Button */}
              <motion.button
                type="button"
                aria-label={item.title}
                disabled={isExamSessionActive}
                onClick={(e) => {
                  if (isExamSessionActive || (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true")) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  if (isActive && item.view !== "home") {
                    navigate("home");
                  } else {
                    navigate(item.view);
                  }
                }}
                whileHover={isExamSessionActive ? undefined : { scale: 1.14, y: -3 }}
                whileTap={isExamSessionActive ? undefined : { scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer bg-gradient-to-br ${item.color} text-white shadow-none ${
                  isExamSessionActive ? "opacity-20 pointer-events-none cursor-not-allowed" : ""
                }`}
              >
                <div className="absolute inset-0 rounded-lg sm:rounded-xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                <Icon className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] drop-shadow-sm" />

                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-background shadow-none">
                    {item.badge}
                  </span>
                )}
              </motion.button>

              {/* Active Indicator Dot */}
              <div
                className={`w-1 h-1 rounded-full mt-0.5 sm:mt-1 transition-all ${
                  isActive
                    ? "bg-primary dark:bg-white scale-110"
                    : "bg-transparent scale-0"
                }`}
              />
            </div>
          );
        })}

        {/* Divider */}
        <div className="w-px h-4 sm:h-7 bg-border/60 dark:bg-white/15 mx-0.5 shrink-0" />

        {/* Quick Spotlight Icon */}
        <div
          className="relative flex flex-col items-center shrink-0"
          onMouseEnter={() => setHoveredId("spotlight")}
          onMouseLeave={() => setHoveredId(null)}
        >
          <AnimatePresence>
            {hoveredId === "spotlight" && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: -8, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                className="hidden sm:block absolute -top-7 px-2.5 py-1 rounded-md bg-popover dark:bg-zinc-950/95 text-popover-foreground dark:text-white font-sans text-[11px] font-medium shadow-none border border-border/60 dark:border-white/10 whitespace-nowrap pointer-events-none"
              >
                Spotlight Search (⌘K)
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            aria-label="Spotlight Search"
            disabled={isExamSessionActive}
            onClick={(e) => {
              if (isExamSessionActive || (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true")) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onOpenSpotlight();
            }}
            whileHover={isExamSessionActive ? undefined : { scale: 1.14, y: -3 }}
            whileTap={isExamSessionActive ? undefined : { scale: 0.92 }}
            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer bg-muted/70 hover:bg-muted dark:bg-white/10 dark:hover:bg-white/15 text-foreground dark:text-zinc-200 border border-border/60 dark:border-white/10 shadow-none ${
              isExamSessionActive ? "opacity-20 pointer-events-none cursor-not-allowed" : ""
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400" />
          </motion.button>
          <div className="w-1 h-1 mt-0.5 sm:mt-1 opacity-0" />
        </div>
      </motion.nav>
    </div>
  );
}
