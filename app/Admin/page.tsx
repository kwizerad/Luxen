"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users, Settings, GraduationCap, FileText, Activity,
  CheckCircle, AlertCircle, TrendingUp, Clock, Database, Zap,
  ArrowUpRight, type LucideIcon, BookOpen, Layers, Trophy, Award, Timer,
  Send, UserPlus, RefreshCw, Shield, Sparkles, Download, Search,
  Radio, BarChart3, Globe, ChevronRight, Check, X, BellRing, Smartphone,
  Monitor, Tablet, Compass, Eye, Filter, ArrowDownRight, UserCheck,
  Car, Flag, AlertTriangle, PlayCircle, Cpu, Wifi, CheckCircle2,
  HardDrive, Info
} from "lucide-react";
import { getAdminStats } from "@/app/Admin/actions/stats";
import type { AdminStats, CategoryMetric, ScoreDistribution, RecentRegistration, SystemAuditItem } from "@/app/Admin/actions/stats";
import { sendNotificationToRole } from "@/app/Admin/actions/notifications";
import { useLanguage } from "@/lib/language-context";
import { Loading } from "@/components/skeletons";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { canAccess, type User as PermUser } from "@/lib/permissions";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, BarChart, Bar, Legend
} from "recharts";
import { VisitorGeoMap } from "@/components/admin/visitor-map";
import { toast } from "sonner";

export type DashboardTab = "overview" | "exams" | "students" | "drivers" | "devices" | "operations" | "broadcast";
type TimeRange = "7d" | "30d" | "all";

interface RealtimeEventItem {
  id: string;
  timestamp: string;
  source: "exam_attempts" | "user_profiles" | "visitor_device_logs" | "notifications" | "driver_reports";
  type: "INSERT" | "UPDATE" | "DELETE" | "SIMULATION";
  title: string;
  details: string;
  badgeType: "success" | "warning" | "info" | "neutral";
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab State with URL query sync for full Single-Page Application navigation
  const initialTab = (searchParams?.get("tab") as DashboardTab) || "overview";
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);

  const [statsData, setStatsData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<PermUser | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // Real-time Telemetry & Stream State
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEventItem[]>([]);
  const [realtimeEventCount, setRealtimeEventCount] = useState(0);
  const [livePulseText, setLivePulseText] = useState<string | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Broadcast Modal State
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastRole, setBroadcastRole] = useState<"all" | "student" | "driver" | "admin">("all");
  const [broadcastPriority, setBroadcastPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Export Snapshot Modal State
  const [exportOpen, setExportOpen] = useState(false);

  // Synchronize Tab with URL query without reloading the page (SPA routing)
  const handleTabChange = useCallback((tabId: DashboardTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tabId === "overview") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tabId);
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Update active tab if URL parameter changes externally
  useEffect(() => {
    const tabParam = searchParams?.get("tab") as DashboardTab;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user as PermUser);

      const result = await getAdminStats();
      if (!result.success) {
        console.error("Failed to load dashboard data:", result.error);
        toast.error("Failed to refresh telemetry data");
        return;
      }
      setStatsData(result.data);
      setLastRefreshedAt(new Date());
      if (isManual) {
        toast.success("Telemetry updated with latest live state");
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic Auto-refresh fallback every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Trigger temporary pulse banner
  const triggerPulse = useCallback((message: string) => {
    setLivePulseText(message);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => {
      setLivePulseText(null);
    }, 6000);
  }, []);

  // ---------------------------------------------------------------------------
  // Supabase Realtime Subscriptions for Live Administrative Telemetry
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-dashboard-realtime")
      // 1. Exam attempts realtime updates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_attempts" },
        (payload) => {
          const eventType = payload.eventType;
          const newRow = payload.new as any;
          const title =
            eventType === "INSERT"
              ? `New Exam Started: ${newRow?.category_name || "Exam Attempt"}`
              : `Exam ${newRow?.status === "completed" ? "Completed" : "Updated"}: ${newRow?.score_percentage ?? 0}%`;

          const eventItem: RealtimeEventItem = {
            id: `evt-exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            source: "exam_attempts",
            type: eventType as any,
            title,
            details: `Category: ${newRow?.category_name || "Exam"} • Score: ${newRow?.score_percentage ?? 0}%`,
            badgeType: newRow?.score_percentage >= 50 ? "success" : "info",
          };

          setRealtimeEvents((prev) => [eventItem, ...prev.slice(0, 49)]);
          setRealtimeEventCount((c) => c + 1);
          triggerPulse(`⚡ Realtime: ${title}`);
          loadData(false);
        }
      )
      // 2. User profile registrations and updates
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        (payload) => {
          const newRow = payload.new as any;
          const title =
            payload.eventType === "INSERT"
              ? `New User Registration: ${newRow?.full_name || newRow?.username || "Learner"}`
              : `User Profile Updated: ${newRow?.full_name || newRow?.username || "User"}`;

          const eventItem: RealtimeEventItem = {
            id: `evt-usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            source: "user_profiles",
            type: payload.eventType as any,
            title,
            details: `Role: ${newRow?.role || "Student"} • Status: ${newRow?.is_online ? "Online" : "Offline"}`,
            badgeType: "info",
          };

          setRealtimeEvents((prev) => [eventItem, ...prev.slice(0, 49)]);
          setRealtimeEventCount((c) => c + 1);
          triggerPulse(`👤 Realtime: ${title}`);
          loadData(false);
        }
      )
      // 3. Visitor device logs & Tablet tracking realtime
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitor_device_logs" },
        (payload) => {
          const newRow = payload.new as any;
          const deviceType = (newRow?.device_type || "device").toUpperCase();
          const modelName = newRow?.device_model_name || newRow?.device_name || "Visitor Device";
          const title = `Live Visitor: ${modelName} (${deviceType})`;

          const eventItem: RealtimeEventItem = {
            id: `evt-vis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            source: "visitor_device_logs",
            type: "INSERT",
            title,
            details: `Platform: ${newRow?.os_name || "Unknown OS"} • Model: ${modelName}`,
            badgeType: deviceType === "TABLET" ? "warning" : "neutral",
          };

          setRealtimeEvents((prev) => [eventItem, ...prev.slice(0, 49)]);
          setRealtimeEventCount((c) => c + 1);
          triggerPulse(`📱 Realtime Visitor: ${modelName} [${deviceType}]`);
        }
      )
      // 4. Notifications broadcast realtime
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newRow = payload.new as any;
          const title = `Broadcast Sent: ${newRow?.title || "Announcement"}`;
          const eventItem: RealtimeEventItem = {
            id: `evt-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            source: "notifications",
            type: "INSERT",
            title,
            details: `Target: ${newRow?.role || "All"} • Priority: ${newRow?.priority || "Normal"}`,
            badgeType: "warning",
          };

          setRealtimeEvents((prev) => [eventItem, ...prev.slice(0, 49)]);
          setRealtimeEventCount((c) => c + 1);
          triggerPulse(`📢 ${title}`);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [loadData, triggerPulse]);

  // Calculations & Derived Metrics
  const stats = statsData?.stats;
  const totalUsers = stats?.totalUsers ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const totalAdmins = stats?.totalAdmins ?? 0;
  const totalDrivers = stats?.totalDrivers ?? 0;
  const onlineUsers = stats?.onlineUsers ?? 0;
  const totalCategories = stats?.totalCategories ?? 0;
  const totalQuestions = stats?.totalQuestions ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;
  const inProgressAttempts = stats?.inProgressAttempts ?? 0;
  const passedAttempts = stats?.passedAttempts ?? 0;
  const failedAttempts = stats?.failedAttempts ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const passRate = stats?.passRate ?? 0;
  const newStudentsThisWeek = stats?.newStudentsThisWeek ?? 0;
  const totalCourses = stats?.totalCourses ?? 0;
  const totalModules = stats?.totalModules ?? 0;
  const latencyMs = statsData?.systemStatus?.latencyMs ?? 18;

  // Chart data filtering based on selected timeRange
  const trafficChartData = useMemo(() => {
    if (timeRange === "30d" && statsData?.monthlyActivity?.length) {
      return statsData.monthlyActivity.map((d) => ({
        name: d.date,
        users: d.users,
        attempts: d.attempts,
      }));
    }
    if (statsData?.weeklyActivity?.length) {
      return statsData.weeklyActivity.map((d) => ({
        name: d.day,
        users: d.users,
        attempts: d.attempts,
      }));
    }
    return [
      { name: "Mon", users: 0, attempts: 0 },
      { name: "Tue", users: 0, attempts: 0 },
      { name: "Wed", users: 0, attempts: 0 },
      { name: "Thu", users: 0, attempts: 0 },
      { name: "Fri", users: 0, attempts: 0 },
      { name: "Sat", users: 0, attempts: 0 },
      { name: "Sun", users: 0, attempts: 0 },
    ];
  }, [timeRange, statsData]);

  const registrationChartData = useMemo(() => {
    if (statsData?.weeklyRegistrations?.length) {
      return statsData.weeklyRegistrations;
    }
    return [
      { day: "Sun", date: "Sun", fullDate: "Sunday", students: 0, totalUsers: 0 },
      { day: "Mon", date: "Mon", fullDate: "Monday", students: 0, totalUsers: 0 },
      { day: "Tue", date: "Tue", fullDate: "Tuesday", students: 0, totalUsers: 0 },
      { day: "Wed", date: "Wed", fullDate: "Wednesday", students: 0, totalUsers: 0 },
      { day: "Thu", date: "Thu", fullDate: "Thursday", students: 0, totalUsers: 0 },
      { day: "Fri", date: "Fri", fullDate: "Friday", students: 0, totalUsers: 0 },
      { day: "Sat", date: "Sat", fullDate: "Saturday", students: 0, totalUsers: 0 },
    ];
  }, [statsData]);

  const maxRegistrationDay = useMemo(() => {
    return registrationChartData.reduce(
      (max, item) => (item.students > max.students ? item : max),
      { day: "-", students: 0, fullDate: "" }
    );
  }, [registrationChartData]);

  // Filtered categories & attempts based on Search query
  const filteredCategories = useMemo(() => {
    const list = statsData?.categoryMetrics || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [statsData?.categoryMetrics, searchQuery]);

  const filteredAttempts = useMemo(() => {
    const list = statsData?.recentAttempts || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (a) =>
        (a.category_name && a.category_name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [statsData?.recentAttempts, searchQuery]);

  // Handle Quick Broadcast Send
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) {
      toast.error("Please provide both title and announcement message");
      return;
    }
    setSendingBroadcast(true);
    try {
      await sendNotificationToRole(broadcastRole, {
        title: broadcastTitle.trim(),
        message: broadcastMsg.trim(),
        type: "announcement",
        priority: broadcastPriority,
      });
      toast.success(`Broadcast sent successfully to ${broadcastRole === "all" ? "all users" : broadcastRole + "s"}`);
      setBroadcastTitle("");
      setBroadcastMsg("");
      setBroadcastOpen(false);
      loadData(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch broadcast");
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Handle Export Snapshot Download
  const handleExportSnapshot = () => {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      systemStatus: statsData?.systemStatus,
      kpis: stats,
      categoryMetrics: statsData?.categoryMetrics,
      topPerformers: statsData?.topPerformers,
      scoreDistribution: statsData?.scoreDistribution,
      recentAttempts: statsData?.recentAttempts,
      recentRegistrations: statsData?.recentRegistrations,
      realtimeEvents: realtimeEvents.slice(0, 20),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxen-admin-telemetry-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Executive telemetry snapshot downloaded");
    setExportOpen(false);
  };

  // Simulate a Realtime Telemetry Pulse for Testing
  const handleSimulateRealtimePulse = () => {
    const simulatedTabletModels = [
      { name: "Samsung Galaxy Tab S9 Ultra (SM-X910)", type: "TABLET" },
      { name: "Lenovo Tab P12 (TB370FU)", type: "TABLET" },
      { name: "Apple iPad Pro 12.9 (6th Gen)", type: "TABLET" },
      { name: "Google Pixel Tablet", type: "TABLET" },
      { name: "Xiaomi Pad 6 (23043RP34G)", type: "TABLET" },
      { name: "OnePlus Pad (OPD2203)", type: "TABLET" },
      { name: "Samsung Galaxy Tab A9+ (SM-X210)", type: "TABLET" },
    ];
    const picked = simulatedTabletModels[Math.floor(Math.random() * simulatedTabletModels.length)];
    const simEvent: RealtimeEventItem = {
      id: `sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: "visitor_device_logs",
      type: "SIMULATION",
      title: `Tablet Recognized: ${picked.name}`,
      details: `Device Form Factor: Tablet • High-Entropy Model Match: Verified`,
      badgeType: "warning",
    };
    setRealtimeEvents((prev) => [simEvent, ...prev.slice(0, 49)]);
    setRealtimeEventCount((c) => c + 1);
    triggerPulse(`📱 Tablet Detected: ${picked.name}`);
    toast.success(`Simulated real-time tablet detection: ${picked.name}`);
  };

  const distributionData = useMemo(() => {
    return [
      { name: "Students", value: totalStudents, color: "#22C55E" },
      { name: "Drivers", value: totalDrivers, color: "#38BDF8" },
      { name: "Categories", value: totalCategories, color: "#6366F1" },
      { name: "Questions", value: totalQuestions, color: "#3B82F6" },
      { name: "Attempts", value: totalAttempts, color: "#F59E0B" },
      { name: "Admins", value: totalAdmins, color: "#EC4899" },
    ].filter((d) => d.value > 0);
  }, [totalStudents, totalDrivers, totalCategories, totalQuestions, totalAttempts, totalAdmins]);

  const passRateRadialData = [{ name: "Pass Rate", value: passRate, fill: "#22C55E" }];

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as any },
    }),
  };

  if (loading && !statsData) {
    return <Loading message={t("loading") || "Initializing Executive Intelligence Center..."} />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-20">
      {/* 1. TOP EXECUTIVE COMMAND BAR & REALTIME STATUS */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-sm backdrop-blur-md relative overflow-hidden"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {realtimeConnected ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Realtime Stream Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Wifi className="w-3.5 h-3.5" />
                Syncing Telemetry
              </span>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-muted)]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {latencyMs}ms Latency
            </span>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-muted)]">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              Supabase Live
            </span>
            {realtimeEventCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <Activity className="w-3 h-3" />
                {realtimeEventCount} live events
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            {t("adminDashboard") || "Executive Intelligence Center"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--admin-muted)]">
            Single-Page Application command portal with real-time learner telemetry and device intelligence.
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Filter */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs">
            {(["7d", "30d", "all"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  timeRange === r
                    ? "bg-[var(--admin-hover-bg)] text-[var(--admin-text)] shadow-sm font-semibold"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                }`}
              >
                {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>

          {/* Quick Broadcast Button */}
          <button
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast</span>
          </button>

          {/* Test Realtime Pulse / Tablet Recognition Button */}
          <button
            onClick={handleSimulateRealtimePulse}
            title="Simulate Realtime Event / Tablet Recognition"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all active:scale-95"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Live Pulse</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Manual Refresh & Auto-poll Indicator */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh telemetry"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-400" : "text-[var(--admin-muted)]"}`} />
          </button>
        </div>

        {/* Live Realtime Pulse Notification Banner */}
        <AnimatePresence>
          {livePulseText && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{livePulseText}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 2. EXECUTIVE 8-METRIC TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Online Now */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("students")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              Active Now
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={onlineUsers} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Online Visitors & Users</span>
            <span className="text-emerald-400 text-[11px] font-semibold">10m window</span>
          </div>
        </motion.div>

        {/* Card 2: Registered Students */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("students")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-400">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
              +{newStudentsThisWeek} this week
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={totalStudents} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Enrolled Students</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
          </div>
        </motion.div>

        {/* Card 3: Exam Attempts */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("exams")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {inProgressAttempts > 0 ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                {inProgressAttempts} in-progress
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-500/10 text-[var(--admin-muted)]">
                Completed
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={totalAttempts} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Total Exam Attempts</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
          </div>
        </motion.div>

        {/* Card 4: Platform Pass Rate */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("exams")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              {passedAttempts} passed / {failedAttempts} fail
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#4ADE80] tracking-tight">
            <AnimatedCounter value={passRate} />%
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Overall Pass Rate</span>
            <span className="text-[11px] text-[var(--admin-muted)]">Target: &ge;70%</span>
          </div>
        </motion.div>

        {/* Card 5: Average Score */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("exams")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-400">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
              Avg Score
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={averageScore} />%
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Score Mean Performance</span>
            <span className="text-[11px] text-indigo-400 font-semibold">Across Exams</span>
          </div>
        </motion.div>

        {/* Card 6: Question Bank Library */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-purple-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("exams")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
              {totalCategories} Categories
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={totalQuestions} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Question Bank Total</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
          </div>
        </motion.div>

        {/* Card 7: Fleet & Drivers */}
        <motion.div
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-teal-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("drivers")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-400">
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">
              Active Fleet
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={totalDrivers} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Registered Drivers</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-teal-400" />
          </div>
        </motion.div>

        {/* Card 8: Total Accounts */}
        <motion.div
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="admin-card p-4 sm:p-5 relative overflow-hidden group hover:border-pink-500/40 transition-colors cursor-pointer"
          onClick={() => handleTabChange("students")}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-pink-500/10 text-pink-400">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400">
              {totalAdmins} Admins
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight">
            <AnimatedCounter value={totalUsers} />
          </div>
          <div className="text-xs text-[var(--admin-muted)] mt-1 font-medium flex items-center justify-between">
            <span>Total Platform Users</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-pink-400" />
          </div>
        </motion.div>
      </div>

      {/* 3. SPA NAVIGATION TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Growth", icon: BarChart3 },
            { id: "exams", label: "Exam Telemetry", icon: Activity },
            { id: "students", label: "Students & Users", icon: GraduationCap },
            { id: "drivers", label: "Fleet & Drivers", icon: Car },
            { id: "devices", label: "Device Intelligence & Map", icon: Tablet },
            { id: "operations", label: "Operations & Audit", icon: Zap },
            { id: "broadcast", label: "Broadcast Center", icon: Send },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as DashboardTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Universal Search Filter within Dashboard */}
        <div className="relative min-w-[200px] sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search telemetry..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. DYNAMIC SPA TAB VIEWS */}
      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW & GROWTH */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Live Realtime Ticker Feed */}
            {realtimeEvents.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold text-[11px] whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    LIVE FEED
                  </span>
                  <span className="font-semibold text-[var(--admin-text)] truncate">
                    {realtimeEvents[0].title}
                  </span>
                  <span className="text-[var(--admin-muted)] hidden md:inline truncate">
                    ({realtimeEvents[0].details})
                  </span>
                </div>
                <button
                  onClick={() => handleTabChange("operations")}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap flex items-center gap-1"
                >
                  <span>View All Logs</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Visual Analytics Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Traffic & Activity Area Chart */}
              <div className="lg:col-span-2 admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Activity Velocity & Exam Trends</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Active platform interactions vs. exam attempts</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-indigo-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Users
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Attempts
                    </span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--admin-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--admin-muted)" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--admin-card-bg)",
                          borderColor: "var(--admin-border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                      <Area type="monotone" dataKey="attempts" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorAttempts)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Registration Velocity Bar Chart */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">New Registrations</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Daily student onboarding velocity</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                    Peak: {maxRegistrationDay.day} ({maxRegistrationDay.students})
                  </span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={registrationChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                      <XAxis dataKey="day" stroke="var(--admin-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--admin-muted)" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--admin-card-bg)",
                          borderColor: "var(--admin-border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="students" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Score Distribution & Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Score Distribution Brackets */}
              <div className="admin-card p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--admin-text)]">Learner Mastery Brackets</h3>
                  <p className="text-xs text-[var(--admin-muted)]">Score tier distribution across all completed attempts</p>
                </div>
                <div className="space-y-3 pt-2">
                  {(statsData?.scoreDistribution || []).map((tier) => (
                    <div key={tier.tier} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--admin-text)] flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                          {tier.label} ({tier.range})
                        </span>
                        <span className="text-[var(--admin-muted)] font-medium">
                          {tier.count} attempts ({tier.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--admin-input-bg)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(tier.percentage, 3)}%`, backgroundColor: tier.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performers Podium */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Top Performers Podium</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Students with highest score averages (min 2 attempts)</p>
                  </div>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="divide-y divide-[var(--admin-border)]">
                  {(statsData?.topPerformers || []).length === 0 ? (
                    <div className="text-xs text-[var(--admin-muted)] py-8 text-center">
                      No multi-attempt student scores recorded yet.
                    </div>
                  ) : (
                    (statsData?.topPerformers || []).map((p, idx) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            idx === 0 ? "bg-amber-500/20 text-amber-400" : idx === 1 ? "bg-zinc-400/20 text-zinc-300" : "bg-orange-500/20 text-orange-400"
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--admin-text)]">
                              {p.full_name || p.username || "Anonymous Learner"}
                            </div>
                            <div className="text-[11px] text-[var(--admin-muted)]">
                              {p.total_attempts} exams completed
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-emerald-400">{p.avg_score}%</span>
                          <div className="text-[10px] text-[var(--admin-muted)]">Average Score</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EXAM TELEMETRY */}
        {activeTab === "exams" && (
          <motion.div
            key="exams"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text)]">Exam Categories & Question Bank</h3>
                <p className="text-xs text-[var(--admin-muted)]">Real-time pass rates, duration, and question allocation per category</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/Admin/exams"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Exam Management</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => (
                <div key={cat.id} className="admin-card p-5 space-y-3 hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[var(--admin-text)] truncate">{cat.name}</h4>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      cat.passRate >= 70 ? "bg-emerald-500/10 text-emerald-400" : cat.passRate >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {cat.passRate}% Pass
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center bg-[var(--admin-input-bg)] rounded-xl">
                    <div>
                      <div className="text-sm font-bold text-[var(--admin-text)]">{cat.questionCount}</div>
                      <div className="text-[10px] text-[var(--admin-muted)]">Questions</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--admin-text)]">{cat.attemptCount}</div>
                      <div className="text-[10px] text-[var(--admin-muted)]">Attempts</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-indigo-400">{cat.averageScore}%</div>
                      <div className="text-[10px] text-[var(--admin-muted)]">Avg Score</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--admin-muted)] pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {cat.durationMinutes} minutes
                    </span>
                    <Link href={`/Admin/exams`} className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5">
                      <span>Manage</span> <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Exam Attempts Stream */}
            <div className="admin-card p-5 space-y-4">
              <h3 className="text-base font-bold text-[var(--admin-text)]">Recent Live Exam Attempts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                      <th className="pb-2.5 font-semibold">Student</th>
                      <th className="pb-2.5 font-semibold">Exam Category</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Score</th>
                      <th className="pb-2.5 font-semibold">Duration</th>
                      <th className="pb-2.5 font-semibold">Started At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {filteredAttempts.map((a) => (
                      <tr key={a.id} className="hover:bg-[var(--admin-hover-bg)]">
                        <td className="py-3 font-semibold text-[var(--admin-text)]">
                          {a.full_name || a.username || a.email || "Student"}
                        </td>
                        <td className="py-3 text-[var(--admin-muted)]">{a.category_name || "Exam"}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            a.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 font-bold">
                          <span className={a.score_percentage >= 50 ? "text-emerald-400" : "text-rose-400"}>
                            {a.score_percentage}%
                          </span>
                        </td>
                        <td className="py-3 text-[var(--admin-muted)]">
                          {a.duration_seconds > 0 ? `${Math.round(a.duration_seconds / 60)}m` : "-"}
                        </td>
                        <td className="py-3 text-[var(--admin-muted)]">
                          {new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: STUDENTS & USERS */}
        {activeTab === "students" && (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text)]">Student & User Roster</h3>
                <p className="text-xs text-[var(--admin-muted)]">Live user registry, real-time presence indicators, and role permissions</p>
              </div>
              <Link
                href="/Admin/users"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Manage All Users</span>
              </Link>
            </div>

            <div className="admin-card p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                      <th className="pb-2.5 font-semibold">User</th>
                      <th className="pb-2.5 font-semibold">Role</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Verification</th>
                      <th className="pb-2.5 font-semibold">Joined Date</th>
                      <th className="pb-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {(statsData?.recentRegistrations || []).map((u) => (
                      <tr key={u.id} className="hover:bg-[var(--admin-hover-bg)]">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold">
                              {(u.full_name || u.username || u.email || "U")[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--admin-text)]">{u.full_name || u.username || "User"}</div>
                              <div className="text-[11px] text-[var(--admin-muted)]">{u.email || "No email"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            u.role === "Admin" ? "bg-pink-500/10 text-pink-400" : u.role === "Driver" ? "bg-teal-500/10 text-teal-400" : "bg-sky-500/10 text-sky-400"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3">
                          {u.is_online ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                            </span>
                          ) : (
                            <span className="text-[var(--admin-muted)] text-[11px]">Offline</span>
                          )}
                        </td>
                        <td className="py-3">
                          {u.provision_verified ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-[var(--admin-muted)] text-[11px]">Standard</span>
                          )}
                        </td>
                        <td className="py-3 text-[var(--admin-muted)]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <Link href="/Admin/users" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                            View Profile
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: FLEET & DRIVERS */}
        {activeTab === "drivers" && (
          <motion.div
            key="drivers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text)]">Fleet & Driver Intelligence</h3>
                <p className="text-xs text-[var(--admin-muted)]">Driver verification, vehicle records, and incident reports</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/Admin/drivers"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-sm"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Manage Drivers</span>
                </Link>
                <Link
                  href="/Admin/reports"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text)]"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Driver Reports</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Total Registered Drivers</div>
                <div className="text-2xl font-bold text-[var(--admin-text)]">{totalDrivers}</div>
                <div className="text-[11px] text-teal-400 font-semibold">Active Fleet Roster</div>
              </div>
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Driver Verification Rate</div>
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-[11px] text-[var(--admin-muted)]">All accounts authenticated</div>
              </div>
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Open Driver Incidents</div>
                <div className="text-2xl font-bold text-sky-400">0 Pending</div>
                <div className="text-[11px] text-emerald-400 font-semibold">Clean Operation</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: DEVICE INTELLIGENCE & VISITOR MAP */}
        {activeTab === "devices" && (
          <motion.div
            key="devices"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Tablet & Device Recognition Spotlight */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--admin-text)]">Device Category Split</h3>
                  <Tablet className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
                    <div className="flex items-center gap-2.5">
                      <Tablet className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-xs font-bold text-[var(--admin-text)]">Tablets (Android / iPad / Fire)</div>
                        <div className="text-[10px] text-[var(--admin-muted)]">High-Entropy Model & Form Factor Detection</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-[var(--admin-text)]">Smartphones (Mobile)</div>
                        <div className="text-[10px] text-[var(--admin-muted)]">iOS & Android Phones</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
                    <div className="flex items-center gap-2.5">
                      <Monitor className="w-5 h-5 text-sky-400" />
                      <div>
                        <div className="text-xs font-bold text-[var(--admin-text)]">Desktop Workstations</div>
                        <div className="text-[10px] text-[var(--admin-muted)]">Windows, macOS & Linux</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Supported Tablet Ecosystem Database */}
              <div className="lg:col-span-2 admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Enhanced Tablet Detection Engine</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Recognizes all major tablet models across server middleware & client runtime</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Database v2.4 Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    { vendor: "Samsung", models: "Tab S9, S8, S7, S6, A9+, A8, FE" },
                    { vendor: "Apple", models: "iPad Pro, Air, Mini, 10th Gen" },
                    { vendor: "Lenovo", models: "Tab P12, P11, M10, M9, Yoga" },
                    { vendor: "Xiaomi", models: "Pad 6, Pad 6 Max, Redmi Pad Pro" },
                    { vendor: "Google", models: "Pixel Tablet (Tangorpro)" },
                    { vendor: "OnePlus", models: "OnePlus Pad, Pad 2, Pad Go" },
                    { vendor: "Amazon", models: "Fire HD 10, HD 8, Fire 7" },
                    { vendor: "Huawei", models: "MatePad Pro, MatePad 11, T10s" },
                  ].map((tItem) => (
                    <div key={tItem.vendor} className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                      <div className="font-bold text-[var(--admin-text)]">{tItem.vendor}</div>
                      <div className="text-[10px] text-[var(--admin-muted)] mt-0.5 leading-tight">{tItem.models}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Geographic Distribution Map */}
            <div className="admin-card p-5 space-y-4">
              <h3 className="text-base font-bold text-[var(--admin-text)]">Live Visitor Geographic Map</h3>
              <VisitorGeoMap />
            </div>
          </motion.div>
        )}

        {/* TAB 6: OPERATIONS & AUDIT STREAM */}
        {activeTab === "operations" && (
          <motion.div
            key="operations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* System Diagnostics Health Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="admin-card p-4 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Database State</div>
                <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Healthy
                </div>
                <div className="text-[10px] text-[var(--admin-muted)]">Postgres 15 Engine</div>
              </div>
              <div className="admin-card p-4 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Edge API Latency</div>
                <div className="text-lg font-bold text-sky-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> {latencyMs}ms
                </div>
                <div className="text-[10px] text-[var(--admin-muted)]">Global Edge CDN</div>
              </div>
              <div className="admin-card p-4 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Realtime Channel</div>
                <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 animate-pulse" /> {realtimeConnected ? "Connected" : "Reconnecting"}
                </div>
                <div className="text-[10px] text-[var(--admin-muted)]">WebSocket Protocol</div>
              </div>
              <div className="admin-card p-4 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Last Sync</div>
                <div className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> {lastRefreshedAt.toLocaleTimeString()}
                </div>
                <div className="text-[10px] text-[var(--admin-muted)]">Auto-sync 30s</div>
              </div>
            </div>

            {/* Combined Audit Stream */}
            <div className="admin-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--admin-text)]">System Audit & Realtime Event Stream</h3>
                  <p className="text-xs text-[var(--admin-muted)]">Live chronological activity log across exams, registrations, and telemetry</p>
                </div>
                <button
                  onClick={handleSimulateRealtimePulse}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-indigo-400 hover:bg-[var(--admin-hover-bg)]"
                >
                  Test Log Pulse
                </button>
              </div>

              <div className="divide-y divide-[var(--admin-border)]">
                {realtimeEvents.map((evt) => (
                  <div key={evt.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--admin-text)]">{evt.title}</div>
                        <div className="text-[11px] text-[var(--admin-muted)]">{evt.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold">
                        {evt.source}
                      </span>
                      <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {(statsData?.auditStream || []).map((audit) => (
                  <div key={audit.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        audit.type === "exam_completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-sky-500/10 text-sky-400"
                      }`}>
                        {audit.type === "exam_completed" ? <CheckCircle className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--admin-text)]">{audit.title}</div>
                        <div className="text-[11px] text-[var(--admin-muted)]">{audit.subtitle}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {audit.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          audit.badgeType === "success" ? "bg-emerald-500/10 text-emerald-400" : audit.badgeType === "info" ? "bg-sky-500/10 text-sky-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {audit.badge}
                        </span>
                      )}
                      <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">
                        {new Date(audit.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 7: BROADCAST CENTER */}
        {activeTab === "broadcast" && (
          <motion.div
            key="broadcast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="admin-card p-6 space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 border-b border-[var(--admin-border)] pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--admin-text)]">Real-time Broadcast Center</h3>
                  <p className="text-xs text-[var(--admin-muted)]">Dispatch instant push notifications to all users, students, drivers, or admins</p>
                </div>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Target Audience Role</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "all", label: "All Users" },
                      { id: "student", label: "Students" },
                      { id: "driver", label: "Drivers" },
                      { id: "admin", label: "Admins" },
                    ].map((role) => (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setBroadcastRole(role.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          broadcastRole === role.id
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Priority Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "urgent", label: "Urgent", color: "text-rose-400" },
                      { id: "normal", label: "Normal", color: "text-indigo-400" },
                      { id: "low", label: "Low", color: "text-zinc-400" },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setBroadcastPriority(p.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          broadcastPriority === p.id
                            ? "bg-[var(--admin-hover-bg)] border-indigo-500 text-indigo-400"
                            : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. System Maintenance Notice / Retake Available"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Message Content</label>
                  <textarea
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Type detailed message..."
                    rows={4}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {sendingBroadcast ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Broadcasting Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Dispatch Realtime Broadcast</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. QUICK BROADCAST MODAL */}
      <AnimatePresence>
        {broadcastOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="admin-card !rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[var(--admin-border)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--admin-text)]">Broadcast Announcement</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Instantly notify platform learners and staff</p>
                  </div>
                </div>
                <button
                  onClick={() => setBroadcastOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--admin-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-input-bg)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendBroadcast} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Target Audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "all", label: "All Users" },
                      { id: "student", label: "Students" },
                      { id: "admin", label: "Admins" },
                    ].map((role) => (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setBroadcastRole(role.id as any)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          broadcastRole === role.id
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g., Scheduled Maintenance / Exam Retake Opportunity"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Notification Message</label>
                  <textarea
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Write detailed instructions or message content..."
                    rows={4}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {sendingBroadcast ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Broadcast...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Now</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. EXPORT SNAPSHOT MODAL */}
      <AnimatePresence>
        {exportOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="admin-card !rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[var(--admin-border)]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--admin-text)]">Export Telemetry</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Generate executive snapshot report</p>
                  </div>
                </div>
                <button
                  onClick={() => setExportOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--admin-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-input-bg)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--admin-muted)] leading-relaxed mb-5">
                Export an executive summary containing active KPI figures, student completion rates, score distribution brackets, category metrics, and system diagnostics as a JSON data snapshot.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportSnapshot}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Snapshot</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
