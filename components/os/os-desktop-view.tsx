"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  BookOpen,
  FileText,
  Car,
  BarChart3,
  Settings,
  ShieldCheck,
  X,
  Bell,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { getDashboardData, type ContinueLearningData, type DashboardStats } from "@/app/dashboard/actions/course";
import { OSWallpaper } from "./os-wallpaper";
import { AgoraIcon } from "@/components/ui/agora-icon";
import { OSContextMenu } from "./os-context-menu";
import { getNotifications, markNotificationAsRead, type Notification } from "@/lib/notifications";
import { useServiceVisibilityManager } from "@/hooks/useServiceVisibilityManager";

interface OSDesktopViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

export function OSDesktopView({ navigate, onOpenSpotlight }: OSDesktopViewProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isServicesPageEnabled } = useServiceVisibilityManager();
  const [loading, setLoading] = useState(true);
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Single Admin Notice Widget state
  const [adminNotification, setAdminNotification] = useState<Notification | null>(null);
  const [dismissedNotifId, setDismissedNotifId] = useState<string | null>(null);

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

  // Fetch admin broadcasts / announcements for student
  useEffect(() => {
    let isMounted = true;
    async function fetchAdminNotifs() {
      try {
        const { notifications } = await getNotifications(false, 15);
        if (isMounted && notifications && notifications.length > 0) {
          const activeNotice =
            notifications.find(
              (n) =>
                n.target_role === "all" ||
                n.target_role === "student" ||
                n.type === "admin_broadcast" ||
                n.type === "announcement" ||
                n.priority === "urgent"
            ) || notifications[0];
          setAdminNotification(activeNotice || null);
        }
      } catch (err) {
        console.error("Failed to fetch admin notifications:", err);
      }
    }

    fetchAdminNotifs();
    window.addEventListener("notifications-updated", fetchAdminNotifs);
    return () => {
      isMounted = false;
      window.removeEventListener("notifications-updated", fetchAdminNotifs);
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
      badge: continueData ? "Active" : undefined,
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 max-w-7xl mx-auto w-full items-start transition-all duration-300 pt-2 sm:pt-4">
          {/* Left: Desktop Applications Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-5 sm:gap-7 p-1">
              {desktopIcons.map((app) => {
                const Icon = app.icon;
                return (
                  <motion.div
                    key={app.id}
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={app.action}
                    className="group flex flex-col items-center text-center p-2 rounded-2xl bg-transparent transition-all cursor-pointer border-0 shadow-none"
                  >
                    <div className="relative mb-2">
                      <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${app.gradient} text-white flex items-center justify-center transition-all shadow-md group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-emerald-500/25`}
                      >
                        <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>

                      {app.badge && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded-full bg-emerald-500 text-white shadow-sm">
                          {app.badge}
                        </span>
                      )}
                    </div>

                    <span className="font-semibold text-xs sm:text-sm text-foreground tracking-tight group-hover:text-primary transition-colors drop-shadow-xs">
                      {app.title}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Single Official Admin Broadcast / System Notice Widget */}
          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {adminNotification && dismissedNotifId !== adminNotification.id ? (
                <motion.div
                  key={adminNotification.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  className="relative p-5 rounded-2xl border border-amber-500/40 dark:border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 backdrop-blur-xl shadow-none space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>{adminNotification.priority === "urgent" ? "Urgent Admin Notice" : "Admin Announcement"}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setDismissedNotifId(adminNotification.id);
                        try {
                          await markNotificationAsRead(adminNotification.id);
                        } catch {}
                      }}
                      title="Dismiss notification"
                      className="p-1 rounded-lg text-amber-700/60 dark:text-amber-300/60 hover:text-amber-900 dark:hover:text-amber-100 hover:bg-amber-500/20 transition-colors cursor-pointer shadow-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground dark:text-white">
                      {adminNotification.title}
                    </h4>
                    <p className="text-xs text-muted-foreground dark:text-zinc-300 leading-relaxed">
                      {adminNotification.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-300/80 font-mono">
                    <span>From: {adminNotification.sender_name || "Administration"}</span>
                    <span>{new Date(adminNotification.created_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 rounded-2xl border border-border/40 dark:border-white/10 bg-card/60 dark:bg-zinc-900/40 backdrop-blur-xl text-center space-y-2 shadow-none"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-semibold text-xs text-foreground dark:text-zinc-200">
                    System Announcements
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    No active administrative notices. Broadcast messages sent by admins will appear here instantly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </OSContextMenu>
  );
}
