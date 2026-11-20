"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Compass,
  BookOpen,
  FileText,
  Car,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { getDashboardData, type ContinueLearningData } from "@/app/dashboard/actions/course";
import { OSWallpaper } from "./os-wallpaper";
import { AgoraIcon } from "@/components/ui/agora-icon";
import { OSContextMenu } from "./os-context-menu";
import { useServiceVisibilityManager } from "@/hooks/useServiceVisibilityManager";
import { usePendingFriendRequests } from "@/hooks/usePendingFriendRequests";

interface OSDesktopViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

export function OSDesktopView({ navigate, onOpenSpotlight }: OSDesktopViewProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";
  const { isServicesPageEnabled } = useServiceVisibilityManager();
  const pendingFriendRequests = usePendingFriendRequests();
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await getDashboardData(user?.id);
        if (isMounted) {
          setContinueData(data.continueLearning);
        }
      } catch (err) {
        console.error("Failed to load OS dashboard data:", err);
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

  const allDesktopIcons = [
    {
      id: "course",
      title: getTitle("courses", getTitle("courseStudioNav", "Courses")),
      icon: BookOpen,
      action: () => navigate("course"),
      gradient: "from-emerald-500 to-teal-700",
      badge: continueData ? (isRw ? "Birakora" : isFr ? "Actif" : "Active") : undefined,
    },
    {
      id: "exams",
      title: getTitle("examCenter", "Exams"),
      icon: FileText,
      action: () => navigate("exams"),
      gradient: "from-amber-500 to-orange-700",
    },
    {
      id: "agora",
      title: "Agora",
      icon: AgoraIcon,
      action: () => navigate("classmates"),
      gradient: "from-indigo-600 via-purple-600 to-cyan-600",
      counterBadge:
        pendingFriendRequests > 0
          ? pendingFriendRequests > 99
            ? "99+"
            : String(pendingFriendRequests)
          : undefined,
    },
    {
      id: "signs",
      title: getTitle("trafficSignsCatalog", "Road Signs"),
      icon: Compass,
      action: () => navigate("course", { module: "signs" }),
      gradient: "from-blue-500 to-indigo-700",
    },
    {
      id: "services",
      title: getTitle("services", "Services"),
      icon: Car,
      action: () => navigate("services"),
      gradient: "from-purple-500 to-pink-700",
    },
    {
      id: "results",
      title: getTitle("resultsAnalytics", "Performance"),
      icon: BarChart3,
      action: () => navigate("results"),
      gradient: "from-rose-500 to-red-700",
    },
    {
      id: "settings",
      title: getTitle("systemPreferences", "Preferences"),
      icon: Settings,
      action: () => navigate("settings"),
      gradient: "from-zinc-500 to-zinc-800",
    },
  ];

  // Hide features disabled/toggled off by Admin (e.g. Services)
  const desktopIcons = allDesktopIcons.filter((app) => {
    if (app.id === "services" && !isServicesPageEnabled) return false;
    return true;
  });

  return (
    <OSContextMenu navigate={navigate} onOpenSpotlight={onOpenSpotlight}>
      <div className="relative w-full h-full flex-1 p-3 sm:p-5 lg:p-6 flex flex-col justify-start select-none overflow-hidden min-h-0">
        {/* High-Aesthetic Luminous OS Wallpaper */}
        <OSWallpaper />

        <div className="max-w-5xl mx-auto w-full pt-2 sm:pt-4">
          {/* Desktop Applications Grid */}
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-3 sm:gap-6 p-0.5 sm:p-1">
              {desktopIcons.map((app) => {
                const Icon = app.icon;
                return (
                  <motion.div
                    key={app.id}
                    whileHover={{ scale: 1.06, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={app.action}
                    className="group flex flex-col items-center text-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-transparent transition-all cursor-pointer border-0 shadow-none"
                  >
                    <div className="relative mb-1.5 sm:mb-2">
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${app.gradient} text-white flex items-center justify-center transition-all shadow-md group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-emerald-500/25`}
                      >
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>

                      {"counterBadge" in app && app.counterBadge ? (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 text-[10px] font-bold font-mono rounded-full bg-rose-500 text-white shadow-sm ring-2 ring-background flex items-center justify-center tabular-nums">
                          {app.counterBadge}
                        </span>
                      ) : app.badge ? (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-full bg-emerald-500 text-white shadow-sm">
                          {app.badge}
                        </span>
                      ) : null}
                    </div>

                    <span className="font-semibold text-[11px] sm:text-sm text-foreground tracking-tight group-hover:text-primary transition-colors drop-shadow-xs leading-tight">
                      {app.title}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </OSContextMenu>
  );
}
