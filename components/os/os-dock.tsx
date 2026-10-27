"use client";

import { useRef, useState } from "react";
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getLabel = (key: string, fallback: string) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  const items: DockItem[] = [
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
      id: "driver-hub",
      view: "driver-hub",
      title: getLabel("services", getLabel("driverHub", "Services")),
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

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[75] select-none pointer-events-auto">
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 24, stiffness: 300 }}
        className="flex items-center gap-2 sm:gap-2.5 px-3 py-2 rounded-2xl bg-card/85 dark:bg-black/85 backdrop-blur-2xl border border-border/60 dark:border-white/10 shadow-none"
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
              className="relative flex flex-col items-center"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Tooltip Label */}
              <AnimatePresence>
                {hoveredId === item.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: -8, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-7 px-2.5 py-1 rounded-md bg-popover dark:bg-zinc-950/95 text-popover-foreground dark:text-white font-sans text-[11px] font-medium shadow-none border border-border/60 dark:border-white/10 whitespace-nowrap pointer-events-none"
                  >
                    {item.title}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* App Icon Button */}
              <motion.button
                type="button"
                onClick={() => navigate(item.view)}
                whileHover={{ scale: 1.18, y: -4 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer bg-gradient-to-br ${item.color} text-white shadow-none`}
              >
                <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                <Icon className="w-5 h-5 drop-shadow-sm" />

                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-background shadow-none">
                    {item.badge}
                  </span>
                )}
              </motion.button>

              {/* Active Indicator Dot */}
              <div
                className={`w-1 h-1 rounded-full mt-1 transition-all ${
                  isActive
                    ? "bg-primary dark:bg-white scale-125"
                    : "bg-transparent scale-0"
                }`}
              />
            </div>
          );
        })}

        {/* Divider */}
        <div className="w-px h-8 bg-border/60 dark:bg-white/15 mx-0.5" />

        {/* Quick Spotlight Icon */}
        <div
          className="relative flex flex-col items-center"
          onMouseEnter={() => setHoveredId("spotlight")}
          onMouseLeave={() => setHoveredId(null)}
        >
          <AnimatePresence>
            {hoveredId === "spotlight" && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                animate={{ opacity: 1, y: -8, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                className="absolute -top-7 px-2.5 py-1 rounded-md bg-popover dark:bg-zinc-950/95 text-popover-foreground dark:text-white font-sans text-[11px] font-medium shadow-none border border-border/60 dark:border-white/10 whitespace-nowrap pointer-events-none"
              >
                Spotlight Search (⌘K)
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={onOpenSpotlight}
            whileHover={{ scale: 1.18, y: -4 }}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center cursor-pointer bg-muted/70 hover:bg-muted dark:bg-white/10 dark:hover:bg-white/15 text-foreground dark:text-zinc-200 border border-border/60 dark:border-white/10 shadow-none"
          >
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </motion.button>
          <div className="w-1 h-1 mt-1 opacity-0" />
        </div>
      </motion.nav>
    </div>
  );
}
