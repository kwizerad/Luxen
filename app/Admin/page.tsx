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
  HardDrive, Info, Mail, ShieldAlert, Command, MessageSquare, Ban,
  RotateCcw, ExternalLink, FileSpreadsheet, HelpCircle, Sliders,
  Megaphone, ClipboardCheck, FileCheck
} from "lucide-react";
import {
  getAdminStats,
  resolveRetakeRequestAction,
  resolveUserReportAction,
  toggleUserVerificationAction,
  toggleUserSuspensionAction,
} from "@/app/Admin/actions/stats";
import type {
  AdminStats,
  CategoryMetric,
  ScoreDistribution,
  RecentRegistration,
  SystemAuditItem,
  RetakeRequestItem,
  PendingReportItem,
  AtRiskLearner,
  CourseModuleMetric,
} from "@/app/Admin/actions/stats";
import { sendNotificationToRole, sendNotificationToUser } from "@/app/Admin/actions/notifications";
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
import { DashboardWidget } from "@/components/admin/dashboard-widget";
import { WeeklyReportSchedulerCard } from "@/components/admin/weekly-report-scheduler-card";
import { AdminAuditLogViewer } from "@/components/admin/admin-audit-log-viewer";
import { AdminAuditReportModal } from "@/components/admin/admin-audit-report-modal";
import { toast } from "sonner";

export type DashboardTab =
  | "overview"
  | "triage"
  | "exams"
  | "courses"
  | "students"
  | "drivers"
  | "reports"
  | "audit"
  | "devices"
  | "operations"
  | "broadcast";
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

  // Course & Exam System Audit Report Modal State
  const [auditReportOpen, setAuditReportOpen] = useState(false);

  // Command Palette (Cmd+K) State
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  // Direct User Message Modal State
  const [directMessageTarget, setDirectMessageTarget] = useState<{
    id: string;
    name: string;
    email?: string | null;
  } | null>(null);
  const [directMsgTitle, setDirectMsgTitle] = useState("");
  const [directMsgBody, setDirectMsgBody] = useState("");
  const [directMsgPriority, setDirectMsgPriority] = useState<"urgent" | "normal" | "low">("normal");
  const [sendingDirectMsg, setSendingDirectMsg] = useState(false);

  // Filter States for Exams & Students Tabs
  const [attemptStatusFilter, setAttemptStatusFilter] = useState<"all" | "completed" | "in_progress" | "passed" | "failed">("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "Student" | "Driver" | "Admin">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "online" | "verified" | "unverified" | "suspended">("all");
  const [retakeFilter, setRetakeFilter] = useState<"all" | "pending" | "approved" | "denied">("pending");
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  // Global Keyboard Shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      const user = await (await import("@/lib/auth-utils")).getCurrentUser();
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
            id: `evt-exam-${newRow?.id || Date.now()}`,
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
            id: `evt-usr-${newRow?.id || Date.now()}`,
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
            id: `evt-vis-${newRow?.id || Date.now()}`,
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
            id: `evt-notif-${newRow?.id || Date.now()}`,
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
  const totalLessons = stats?.totalLessons ?? 0;
  const completedLessonProgress = stats?.completedLessonProgress ?? 0;
  const pendingReports = stats?.pendingReports ?? 0;
  const pendingRetakeRequests = stats?.pendingRetakeRequests ?? 0;
  const unverifiedUsers = stats?.unverifiedUsers ?? 0;
  const suspendedUsers = stats?.suspendedUsers ?? 0;
  const atRiskCount = stats?.atRiskCount ?? 0;
  const totalActionItems = pendingRetakeRequests + pendingReports + atRiskCount;
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

  // Filtered categories & attempts based on Search query and Status Filters
  const filteredCategories = useMemo(() => {
    const list = statsData?.categoryMetrics || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [statsData?.categoryMetrics, searchQuery]);

  const filteredAttempts = useMemo(() => {
    let list = statsData?.recentAttempts || [];
    if (attemptStatusFilter === "completed") {
      list = list.filter((a) => a.status === "completed");
    } else if (attemptStatusFilter === "in_progress") {
      list = list.filter((a) => a.status === "in_progress");
    } else if (attemptStatusFilter === "passed") {
      list = list.filter((a) => a.status === "completed" && a.score_percentage >= 50);
    } else if (attemptStatusFilter === "failed") {
      list = list.filter((a) => a.status === "completed" && a.score_percentage < 50);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (a) =>
        (a.category_name && a.category_name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [statsData?.recentAttempts, searchQuery, attemptStatusFilter]);

  const filteredUsers = useMemo(() => {
    let list = statsData?.recentRegistrations || [];
    if (userRoleFilter !== "all") {
      list = list.filter((u) => (u.role || "Student").toLowerCase() === userRoleFilter.toLowerCase());
    }
    if (userStatusFilter === "online") {
      list = list.filter((u) => u.is_online);
    } else if (userStatusFilter === "verified") {
      list = list.filter((u) => u.provision_verified);
    } else if (userStatusFilter === "unverified") {
      list = list.filter((u) => !u.provision_verified);
    } else if (userStatusFilter === "suspended") {
      list = list.filter((u) => u.banned);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (u) =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [statsData?.recentRegistrations, userRoleFilter, userStatusFilter, searchQuery]);

  const filteredRetakeRequests = useMemo(() => {
    const list = statsData?.retakeRequests || [];
    if (retakeFilter === "all") return list;
    return list.filter((r) => r.status === retakeFilter);
  }, [statsData?.retakeRequests, retakeFilter]);

  // Handle Retake Request Approval / Denial
  const handleResolveRetake = async (requestId: string, decision: "approved" | "denied") => {
    setProcessingActionId(requestId);
    try {
      const res = await resolveRetakeRequestAction(requestId, decision);
      if (!res.success) {
        toast.error(res.error || "Failed to update retake request");
        return;
      }
      toast.success(`Retake request ${decision === "approved" ? "approved & student notified" : "declined"}`);
      loadData(false);
    } catch (err: any) {
      toast.error(err.message || "Error updating retake request");
    } finally {
      setProcessingActionId(null);
    }
  };

  // Handle User Report Resolution
  const handleResolveReport = async (reportId: string, status: "reviewing" | "resolved" | "dismissed") => {
    setProcessingActionId(reportId);
    try {
      const res = await resolveUserReportAction(reportId, status);
      if (!res.success) {
        toast.error(res.error || "Failed to update report status");
        return;
      }
      toast.success(`Report marked as ${status}`);
      loadData(false);
    } catch (err: any) {
      toast.error(err.message || "Error updating report");
    } finally {
      setProcessingActionId(null);
    }
  };

  // Handle Toggle User Verification
  const handleToggleVerifyUser = async (userId: string, currentVerified: boolean) => {
    setProcessingActionId(`verify-${userId}`);
    try {
      const res = await toggleUserVerificationAction(userId, !currentVerified);
      if (!res.success) {
        toast.error(res.error || "Failed to update verification");
        return;
      }
      toast.success(!currentVerified ? "Account verified & student notified" : "Verification removed");
      loadData(false);
    } catch (err: any) {
      toast.error(err.message || "Error updating verification");
    } finally {
      setProcessingActionId(null);
    }
  };

  // Handle Toggle User Suspension
  const handleToggleSuspendUser = async (userId: string, currentBanned: boolean) => {
    setProcessingActionId(`ban-${userId}`);
    try {
      const res = await toggleUserSuspensionAction(userId, !currentBanned);
      if (!res.success) {
        toast.error(res.error || "Failed to update account status");
        return;
      }
      toast.success(!currentBanned ? "User account suspended" : "User account restored");
      loadData(false);
    } catch (err: any) {
      toast.error(err.message || "Error updating account status");
    } finally {
      setProcessingActionId(null);
    }
  };

  // Handle Direct User Message Send
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMessageTarget || !directMsgTitle.trim() || !directMsgBody.trim()) {
      toast.error("Please provide both title and message");
      return;
    }
    setSendingDirectMsg(true);
    try {
      await sendNotificationToUser(directMessageTarget.id, {
        title: directMsgTitle.trim(),
        message: directMsgBody.trim(),
        type: "info",
        priority: directMsgPriority,
      });
      toast.success(`Direct notification sent to ${directMessageTarget.name}`);
      setDirectMessageTarget(null);
      setDirectMsgTitle("");
      setDirectMsgBody("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSendingDirectMsg(false);
    }
  };

  // CSV Export Helpers
  const handleExportAttemptsCSV = () => {
    const rows = statsData?.recentAttempts || [];
    const headers = ["Attempt ID", "Student Name", "Email", "Category", "Status", "Score (%)", "Duration (sec)", "Started At"];
    const csvLines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.id}"`,
          `"${(r.full_name || r.username || "Student").replace(/"/g, '""')}"`,
          `"${(r.email || "").replace(/"/g, '""')}"`,
          `"${(r.category_name || "Exam").replace(/"/g, '""')}"`,
          `"${r.status}"`,
          r.score_percentage,
          r.duration_seconds || 0,
          `"${r.started_at}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxen-exam-attempts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exam attempts exported to CSV");
    setExportOpen(false);
  };

  const handleExportUsersCSV = () => {
    const rows = statsData?.recentRegistrations || [];
    const headers = ["User ID", "Full Name", "Email", "Role", "Online", "Verified", "Suspended", "Exam Attempts", "Avg Score (%)", "Joined Date"];
    const csvLines = [
      headers.join(","),
      ...rows.map((u) =>
        [
          `"${u.id}"`,
          `"${(u.full_name || u.username || "User").replace(/"/g, '""')}"`,
          `"${(u.email || "").replace(/"/g, '""')}"`,
          `"${u.role || "Student"}"`,
          u.is_online ? "Yes" : "No",
          u.provision_verified ? "Yes" : "No",
          u.banned ? "Yes" : "No",
          u.attempt_count ?? 0,
          u.avg_score ?? "",
          `"${u.created_at}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luxen-users-roster-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Users roster exported to CSV");
    setExportOpen(false);
  };

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
          {/* Command Palette Trigger (Cmd+K) */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-all"
            title="Open Command Palette (Ctrl+K / Cmd+K)"
          >
            <Command className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Quick Jump</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/20 border border-[var(--admin-border)] text-[var(--admin-muted)]">
              ⌘K
            </kbd>
          </button>

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

          {/* Action Center Triage Button */}
          <button
            onClick={() => handleTabChange("triage")}
            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all active:scale-95 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Action Center</span>
            {totalActionItems > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-amber-500 text-black font-mono tabular-nums text-[10px] font-bold">
                {totalActionItems}
              </span>
            )}
          </button>

          {/* System Audit Report Button */}
          <button
            onClick={() => setAuditReportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Audit System</span>
          </button>

          {/* Quick Broadcast Button */}
          <button
            onClick={() => setBroadcastOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast</span>
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
            { id: "overview", label: "Overview & Growth", icon: BarChart3, badge: 0 },
            { id: "triage", label: "Action Center", icon: AlertTriangle, badge: totalActionItems },
            { id: "exams", label: "Exam Telemetry", icon: Activity, badge: inProgressAttempts },
            { id: "courses", label: "Curriculum & Courses", icon: BookOpen, badge: 0 },
            { id: "students", label: "Students & Users", icon: GraduationCap, badge: unverifiedUsers },
            { id: "drivers", label: "Fleet & Drivers", icon: Car, badge: pendingReports },
            { id: "reports", label: "Weekly Reports", icon: Mail, badge: 0 },
            { id: "audit", label: "Admin Audit", icon: ShieldAlert, badge: 0 },
            { id: "devices", label: "Device & Geo Map", icon: Tablet, badge: 0 },
            { id: "operations", label: "Operations & Health", icon: Zap, badge: 0 },
            { id: "broadcast", label: "Broadcast Center", icon: Send, badge: 0 },
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
                {tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-[var(--admin-input-bg)] text-amber-400"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
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
            placeholder="Filter current view..."
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
            {/* Priority Admin Triage Alert Strip (When items need attention) */}
            {(pendingRetakeRequests > 0 || pendingReports > 0 || atRiskCount > 0 || unverifiedUsers > 0) && (
              <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/25 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--admin-text)]">
                      Administrative Decisions & Triage Queue
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--admin-muted)] mt-0.5 font-mono tabular-nums">
                      <span>{pendingRetakeRequests} Pending Retake Requests</span>
                      <span aria-hidden="true">·</span>
                      <span>{pendingReports} Open Incident Reports</span>
                      <span aria-hidden="true">·</span>
                      <span>{atRiskCount} At-Risk Learners (&lt;50% avg)</span>
                      <span aria-hidden="true">·</span>
                      <span>{unverifiedUsers} Unverified Accounts</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleTabChange("triage")}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-all cursor-pointer"
                  >
                    Review & Resolve Queue
                  </button>
                  <button
                    onClick={() => handleTabChange("students")}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] transition-all cursor-pointer"
                  >
                    Inspect Users
                  </button>
                </div>
              </div>
            )}

            {/* Executive Workspace Quick-Launch Dock */}
            <div className="admin-card p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--admin-text)]">Admin Workspaces & Control Modules</h3>
                  <p className="text-xs text-[var(--admin-muted)]">Direct access to dedicated management studios across the platform</p>
                </div>
                <button
                  onClick={() => setCommandOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <span>Command Launcher (⌘K)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {[
                  {
                    title: "Course Studio",
                    meta: `${totalCourses} courses · ${totalModules} modules`,
                    href: "/Admin/course",
                    icon: BookOpen,
                    accent: "text-emerald-400 bg-emerald-500/10",
                  },
                  {
                    title: "Exams & Rules",
                    meta: `${totalCategories} categories`,
                    href: "/Admin/exams",
                    icon: FileText,
                    accent: "text-indigo-400 bg-indigo-500/10",
                  },
                  {
                    title: "Question Bank",
                    meta: `${totalQuestions} questions`,
                    href: "/Admin/questions",
                    icon: HelpCircle,
                    accent: "text-purple-400 bg-purple-500/10",
                  },
                  {
                    title: "User Workspace",
                    meta: `${totalUsers} accounts`,
                    href: "/Admin/users",
                    icon: Users,
                    accent: "text-sky-400 bg-sky-500/10",
                  },
                  {
                    title: "Drivers & Fleet",
                    meta: `${totalDrivers} drivers`,
                    href: "/Admin/drivers",
                    icon: Car,
                    accent: "text-teal-400 bg-teal-500/10",
                  },
                  {
                    title: "Incident Reports",
                    meta: `${pendingReports} open`,
                    href: "/Admin/reports",
                    icon: Flag,
                    accent: "text-rose-400 bg-rose-500/10",
                  },
                  {
                    title: "Notifications",
                    meta: "Push & History",
                    href: "/Admin/notifications",
                    icon: BellRing,
                    accent: "text-amber-400 bg-amber-500/10",
                  },
                  {
                    title: "System Settings",
                    meta: "Theme & Config",
                    href: "/Admin/settings",
                    icon: Sliders,
                    accent: "text-pink-400 bg-pink-500/10",
                  },
                ].map((ws) => {
                  const WsIcon = ws.icon;
                  return (
                    <Link
                      key={ws.href}
                      href={ws.href}
                      className="p-3 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] hover:border-indigo-500/40 transition-all group flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ws.accent}`}>
                          <WsIcon className="w-4 h-4" />
                        </div>
                        <ExternalLink className="w-3 h-3 text-[var(--admin-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--admin-text)] truncate">{ws.title}</div>
                        <div className="text-[11px] text-[var(--admin-muted)] truncate font-mono tabular-nums">{ws.meta}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
            {/* Live Realtime Ticker Feed */}
            <AnimatePresence mode="wait">
              {realtimeEvents.length > 0 && (
                <motion.div
                  key={realtimeEvents[0].id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs"
                >
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Realtime Database Row Counts Widget */}
            <DashboardWidget
              initialExamAttemptsCount={totalAttempts}
              initialUserProfilesCount={totalUsers}
              initialStudentsCount={totalStudents}
              initialDriversCount={totalDrivers}
              initialAdminsCount={totalAdmins}
              realtimeEventCount={realtimeEventCount}
            />

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

        {/* TAB: ACTION CENTER & TRIAGE QUEUE */}
        {activeTab === "triage" && (
          <motion.div
            key="triage"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Summary Triage Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="admin-card p-5 space-y-1.5">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Pending Retake Requests</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-amber-400">{pendingRetakeRequests}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Students awaiting approval</div>
              </div>
              <div className="admin-card p-5 space-y-1.5">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Open Incident Reports</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-rose-400">{pendingReports}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Pending or under review</div>
              </div>
              <div className="admin-card p-5 space-y-1.5">
                <div className="text-xs text-[var(--admin-muted)] font-medium">At-Risk Learners (&lt;50%)</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-orange-400">{atRiskCount}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Need coaching or study tips</div>
              </div>
              <div className="admin-card p-5 space-y-1.5">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Unverified Students</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-sky-400">{unverifiedUsers}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Awaiting profile verification</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Exam Retake Approvals Queue */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Exam Retake Requests</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Approve or decline student requests for additional exam attempts</p>
                  </div>
                  <div className="flex items-center p-1 rounded-lg bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs">
                    {(["pending", "approved", "denied", "all"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setRetakeFilter(st)}
                        className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                          retakeFilter === st
                            ? "bg-[var(--admin-hover-bg)] text-[var(--admin-text)] font-semibold shadow-sm"
                            : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-[var(--admin-border)] max-h-[380px] overflow-y-auto">
                  {filteredRetakeRequests.length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--admin-muted)]">
                      No {retakeFilter === "all" ? "" : retakeFilter} exam retake requests found.
                    </div>
                  ) : (
                    filteredRetakeRequests.map((req) => (
                      <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-[var(--admin-text)] truncate">{req.student_name}</span>
                            <span aria-hidden="true" className="text-[var(--admin-muted)]">·</span>
                            <span className="text-indigo-400 font-medium truncate">{req.category_name}</span>
                          </div>
                          {req.reason && (
                            <p className="text-xs text-[var(--admin-muted)] line-clamp-2">
                              Reason: &ldquo;{req.reason}&rdquo;
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-[var(--admin-muted)] font-mono tabular-nums">
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                            <span aria-hidden="true">·</span>
                            <span className={
                              req.status === "approved"
                                ? "text-emerald-400 font-semibold"
                                : req.status === "denied"
                                ? "text-rose-400 font-semibold"
                                : "text-amber-400 font-semibold"
                            }>
                              Status: {req.status}
                            </span>
                          </div>
                        </div>

                        {req.status === "pending" && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleResolveRetake(req.id, "approved")}
                              disabled={processingActionId === req.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleResolveRetake(req.id, "denied")}
                              disabled={processingActionId === req.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-rose-500/20 border border-[var(--admin-border)] text-rose-400 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Open Incident & Driver Reports Queue */}
              <div className="admin-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Incident & Conduct Reports</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Triage user and driver reports directly or inspect full threads</p>
                  </div>
                  <Link
                    href="/Admin/reports"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>All Reports</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-[var(--admin-border)] max-h-[380px] overflow-y-auto">
                  {(statsData?.pendingReportsList || []).length === 0 ? (
                    <div className="py-10 text-center text-xs text-[var(--admin-muted)]">
                      No user or driver reports filed. Clean operational state.
                    </div>
                  ) : (
                    (statsData?.pendingReportsList || []).map((rep) => (
                      <div key={rep.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-[var(--admin-text)] truncate">Reported: {rep.reported_name}</span>
                            <span aria-hidden="true" className="text-[var(--admin-muted)]">·</span>
                            <span className="text-rose-400 font-medium capitalize">{rep.report_type}</span>
                          </div>
                          {rep.description && (
                            <p className="text-xs text-[var(--admin-muted)] line-clamp-2">{rep.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-[var(--admin-muted)]">
                            <span>Filed by {rep.reporter_name}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{new Date(rep.created_at).toLocaleDateString()}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize font-semibold text-amber-400">{rep.status}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {rep.status !== "resolved" && (
                            <button
                              onClick={() => handleResolveReport(rep.id, "resolved")}
                              disabled={processingActionId === rep.id}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          {rep.status === "pending" && (
                            <button
                              onClick={() => handleResolveReport(rep.id, "reviewing")}
                              disabled={processingActionId === rep.id}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Reviewing
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 3. At-Risk / Struggling Learners Detection & Coaching */}
            <div className="admin-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[var(--admin-text)]">At-Risk Learners & Remedial Coaching</h3>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Students with failed exam attempts and average score below 50% — send targeted study guidance in one click
                  </p>
                </div>
                <Link
                  href="/Admin/users"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Open User Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(statsData?.atRiskLearners || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--admin-muted)]">
                  All active exam-taking students are currently averaging 50% or above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(statsData?.atRiskLearners || []).map((learner) => (
                    <div
                      key={learner.id}
                      className="p-4 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--admin-text)] truncate">{learner.full_name}</div>
                          <div className="text-[11px] text-[var(--admin-muted)] truncate">{learner.email || "Student Account"}</div>
                        </div>
                        <span className="text-sm font-bold font-mono tabular-nums text-rose-400 shrink-0">
                          {learner.avg_score}% avg
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[var(--admin-muted)] font-mono tabular-nums">
                        <span>{learner.failed_attempts} failed / {learner.total_attempts} total</span>
                        <span>Last: {new Date(learner.last_attempt_at).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setDirectMessageTarget({
                              id: learner.id,
                              name: learner.full_name,
                              email: learner.email,
                            });
                            setDirectMsgTitle("Study Support & Exam Preparation Tips");
                            setDirectMsgBody(
                              `Hi ${learner.full_name}, we noticed you've been practicing hard on your driving exams. Review the Traffic Signs and Road Priority modules in the Course section before your next attempt — you've got this!`
                            );
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send Study Tip</span>
                        </button>
                        <Link
                          href="/Admin/users"
                          className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[var(--admin-card-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)]"
                        >
                          Inspect
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB: CURRICULUM & COURSES */}
        {activeTab === "courses" && (
          <motion.div
            key="courses"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text)]">Curriculum & Course Studio Intelligence</h3>
                <p className="text-xs text-[var(--admin-muted)]">
                  Multilingual driving courses, module structures, and student lesson completions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/Admin/course"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Course Studio</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="admin-card p-5 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Language Courses</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[var(--admin-text)]">{totalCourses}</div>
                <div className="text-[11px] text-emerald-400 font-medium">Active Curriculum Tracks</div>
              </div>
              <div className="admin-card p-5 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Course Modules</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[var(--admin-text)]">{totalModules}</div>
                <div className="text-[11px] text-indigo-400 font-medium">Structured Chapters</div>
              </div>
              <div className="admin-card p-5 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Total Lessons</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[var(--admin-text)]">{totalLessons}</div>
                <div className="text-[11px] text-sky-400 font-medium">Published Learning Units</div>
              </div>
              <div className="admin-card p-5 space-y-1">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Student Lesson Completions</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400">{completedLessonProgress}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Verified Study Progress</div>
              </div>
            </div>

            <div className="admin-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--admin-text)]">Module Breakdown & Completion Velocity</h3>
                  <p className="text-xs text-[var(--admin-muted)]">Lesson distribution and learner completions across course modules</p>
                </div>
                <Link
                  href="/Admin/course"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>Edit Modules</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(statsData?.courseModuleMetrics || []).length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--admin-muted)]">
                  No course modules found. Open Course Studio to create or import modules.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(statsData?.courseModuleMetrics || []).map((mod) => (
                    <div
                      key={mod.id}
                      className="p-4 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-[11px] text-indigo-400 font-medium truncate">{mod.courseTitle}</div>
                        <h4 className="text-sm font-bold text-[var(--admin-text)] line-clamp-1 mt-0.5">{mod.title}</h4>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--admin-muted)] font-mono tabular-nums pt-2 border-t border-[var(--admin-border)]">
                        <span>{mod.lessonCount} lessons</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-semibold">{mod.completedLessonsCount} completions</span>
                        <span aria-hidden="true">·</span>
                        <span>{mod.isPublished ? "Published" : "Draft"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportAttemptsCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Attempts CSV</span>
                </button>
                <Link
                  href="/Admin/questions"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)]"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Question Bank ({totalQuestions})</span>
                </Link>
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
                    <span className={`text-[11px] font-bold font-mono tabular-nums ${
                      cat.passRate >= 70 ? "text-emerald-400" : cat.passRate >= 50 ? "text-amber-400" : "text-rose-400"
                    }`}>
                      {cat.passRate}% Pass
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 text-center bg-[var(--admin-input-bg)] rounded-xl font-mono tabular-nums">
                    <div>
                      <div className="text-sm font-bold text-[var(--admin-text)]">{cat.questionCount}</div>
                      <div className="text-[10px] font-sans text-[var(--admin-muted)]">Questions</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[var(--admin-text)]">{cat.attemptCount}</div>
                      <div className="text-[10px] font-sans text-[var(--admin-muted)]">Attempts</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-indigo-400">{cat.averageScore}%</div>
                      <div className="text-[10px] font-sans text-[var(--admin-muted)]">Avg Score</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--admin-muted)] pt-1">
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3" /> {cat.durationMinutes} min
                      {cat.questionCount < 15 && (
                        <span className="ml-1 text-amber-400 font-sans">· Low Qs</span>
                      )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-[var(--admin-text)]">Recent Live Exam Attempts</h3>
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "completed", label: "Completed" },
                      { id: "in_progress", label: "In Progress" },
                      { id: "passed", label: "Passed (≥50%)" },
                      { id: "failed", label: "Failed (<50%)" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setAttemptStatusFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                        attemptStatusFilter === f.id
                          ? "bg-[var(--admin-hover-bg)] text-[var(--admin-text)] font-semibold shadow-sm"
                          : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
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
                      <th className="pb-2.5 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {filteredAttempts.map((a) => {
                      const studentName = a.full_name || a.username || (a.email ? a.email.split("@")[0] : (a.user_id ? `Student (${a.user_id.slice(0, 6)})` : "Student"));
                      const initial = (studentName || "S")[0].toUpperCase();
                      return (
                        <tr key={a.id} className="hover:bg-[var(--admin-hover-bg)]">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[var(--admin-text)] truncate">
                                  {studentName}
                                </div>
                                {a.email && (
                                  <div className="text-[11px] text-[var(--admin-muted)] truncate">
                                    {a.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-[var(--admin-muted)]">{a.category_name || "Exam"}</td>
                          <td className="py-3">
                            <span className={`font-semibold text-[11px] ${
                              a.status === "completed" ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3 font-bold font-mono tabular-nums">
                            <span className={a.score_percentage >= 50 ? "text-emerald-400" : "text-rose-400"}>
                              {a.score_percentage}%
                            </span>
                          </td>
                          <td className="py-3 text-[var(--admin-muted)] font-mono tabular-nums">
                            {a.duration_seconds > 0 ? `${Math.round(a.duration_seconds / 60)}m` : "-"}
                          </td>
                          <td className="py-3 text-[var(--admin-muted)] font-mono tabular-nums">
                            {new Date(a.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 text-right">
                            {a.user_id && (
                              <button
                                onClick={() => {
                                  setDirectMessageTarget({
                                    id: a.user_id,
                                    name: studentName,
                                    email: a.email,
                                  });
                                  setDirectMsgTitle(`Regarding your ${a.category_name || "Exam"} attempt`);
                                  setDirectMsgBody(
                                    a.score_percentage >= 50
                                      ? `Congratulations on scoring ${a.score_percentage}% on ${a.category_name || "your exam"}! Keep up the great progress.`
                                      : `Hi ${studentName}, we noticed you scored ${a.score_percentage}% on ${a.category_name || "your recent exam"}. Let us know if you need help reviewing any questions.`
                                  );
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                              >
                                Message
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: WEEKLY EXAM REPORTS SCHEDULER */}
        {activeTab === "reports" && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <WeeklyReportSchedulerCard />
          </motion.div>
        )}

        {/* TAB: ADMIN AUDIT LEDGER & SECONDARY ADMIN TRACKER */}
        {activeTab === "audit" && (
          <motion.div
            key="audit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <AdminAuditLogViewer />
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--admin-text)]">Student & User Roster Controls</h3>
                <p className="text-xs text-[var(--admin-muted)]">
                  Live user registry, exam performance, real-time presence, and 1-click verification or suspension
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Role Filter */}
                <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                  {(
                    [
                      { id: "all", label: "All Roles" },
                      { id: "Student", label: "Students" },
                      { id: "Driver", label: "Drivers" },
                      { id: "Admin", label: "Admins" },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setUserRoleFilter(r.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        userRoleFilter === r.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                  {(
                    [
                      { id: "all", label: "All Status" },
                      { id: "online", label: "Online" },
                      { id: "verified", label: "Verified" },
                      { id: "unverified", label: "Unverified" },
                      { id: "suspended", label: "Suspended" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setUserStatusFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        userStatusFilter === s.id
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportUsersCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <Link
                  href="/Admin/users"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Full Directory ({totalUsers})</span>
                </Link>
              </div>
            </div>

            <div className="admin-card p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                      <th className="pb-2.5 font-semibold">User Identity</th>
                      <th className="pb-2.5 font-semibold">Role</th>
                      <th className="pb-2.5 font-semibold">Exam Performance</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                      <th className="pb-2.5 font-semibold">Verification</th>
                      <th className="pb-2.5 font-semibold text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => {
                        const displayName = u.full_name || u.username || u.email || "User";
                        return (
                          <tr key={u.id} className="hover:bg-[var(--admin-hover-bg)] transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                                  {displayName[0].toUpperCase()}
                                  {u.is_online && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[var(--admin-card-bg)]" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[var(--admin-text)]">{displayName}</span>
                                    {u.banned && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-extrabold uppercase">
                                        Suspended
                                      </span>
                                    )}
                                  </div>
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
                              {u.attempt_count && u.attempt_count > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[var(--admin-text)] tabular-nums">
                                    {u.attempt_count} {u.attempt_count === 1 ? "exam" : "exams"}
                                  </span>
                                  {u.avg_score !== null && u.avg_score !== undefined && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                                      u.avg_score >= 60
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-amber-500/15 text-amber-400"
                                    }`}>
                                      {u.avg_score}% avg
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-[var(--admin-muted)]">No exams yet</span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col">
                                {u.is_online ? (
                                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                                  </span>
                                ) : (
                                  <span className="text-[var(--admin-muted)] text-[11px]">Offline</span>
                                )}
                                <span className="text-[10px] text-[var(--admin-muted)] tabular-nums">
                                  Joined {new Date(u.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              {u.provision_verified ? (
                                <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                </span>
                              ) : (
                                <span className="text-amber-400 text-[11px] font-medium">Unverified</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setDirectMessageTarget({
                                      id: u.id,
                                      name: displayName,
                                      email: u.email || "",
                                    });
                                    setDirectMsgTitle("Message from Luxen Administration");
                                    setDirectMsgBody(`Hello ${displayName.split(" ")[0]}, `);
                                  }}
                                  title="Send Direct Notification"
                                  className="p-1.5 rounded-lg bg-[var(--admin-input-bg)] hover:bg-indigo-500/15 text-[var(--admin-muted)] hover:text-indigo-400 border border-[var(--admin-border)] transition-all"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleVerifyUser(u.id, Boolean(u.provision_verified))}
                                  disabled={processingActionId === `verify-${u.id}`}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${
                                    u.provision_verified
                                      ? "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-amber-400"
                                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                  }`}
                                >
                                  {u.provision_verified ? "Unverify" : "Verify"}
                                </button>
                                {u.role !== "Admin" && (
                                  <button
                                    onClick={() => handleToggleSuspendUser(u.id, Boolean(u.banned))}
                                    disabled={processingActionId === `ban-${u.id}`}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-50 ${
                                      u.banned
                                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                                        : "bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-600 hover:text-white"
                                    }`}
                                  >
                                    {u.banned ? "Reinstate" : "Suspend"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[var(--admin-muted)]">
                          No user accounts match your filter criteria.
                        </td>
                      </tr>
                    )}
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
                <button
                  onClick={() => setActiveTab("triage")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Triage Queue ({pendingReports})</span>
                </button>
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
                  <span>Safety Reports ({pendingReports})</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Total Registered Drivers</div>
                <div className="text-2xl font-bold text-[var(--admin-text)] tabular-nums">{totalDrivers}</div>
                <div className="text-[11px] text-teal-400 font-semibold">Active Fleet Roster</div>
              </div>
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Driver Verification Rate</div>
                <div className="text-2xl font-bold text-emerald-400 tabular-nums">100%</div>
                <div className="text-[11px] text-[var(--admin-muted)]">All driver accounts verified</div>
              </div>
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Unverified Platform Users</div>
                <div className="text-2xl font-bold text-amber-400 tabular-nums">{unverifiedUsers}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">Awaiting profile verification</div>
              </div>
              <div className="admin-card p-5 space-y-2">
                <div className="text-xs text-[var(--admin-muted)] font-medium">Open Safety Reports</div>
                <div className="text-2xl font-bold text-rose-400 tabular-nums">{pendingReports}</div>
                <div className="text-[11px] text-[var(--admin-muted)]">{suspendedUsers} suspended accounts</div>
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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </div>
              </div>

              <div className="divide-y divide-[var(--admin-border)] overflow-hidden">
                <AnimatePresence initial={false}>
                  {realtimeEvents.map((evt) => (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: 50, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -30, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="py-3 flex items-center justify-between gap-3 text-xs bg-indigo-500/[0.03] hover:bg-indigo-500/[0.08] px-2 rounded-xl transition-colors my-1 border border-indigo-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          evt.badgeType === "success"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : evt.badgeType === "warning"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-indigo-500/15 text-indigo-400"
                        }`}>
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--admin-text)] flex items-center gap-2">
                            <span>{evt.title}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                          <div className="text-[11px] text-[var(--admin-muted)]">{evt.details}</div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          evt.badgeType === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : evt.badgeType === "warning"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}>
                          {evt.source}
                        </span>
                        <div className="text-[10px] text-[var(--admin-muted)]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="admin-card !rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[var(--admin-border)] transform-gpu"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. EXPORT TELEMETRY & REPORTS CENTER MODAL */}
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="admin-card !rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[var(--admin-border)] transform-gpu"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--admin-text)]">Export Data & Reports Center</h3>
                    <p className="text-xs text-[var(--admin-muted)]">Download structured CSV spreadsheets or executive JSON snapshots</p>
                  </div>
                </div>
                <button
                  onClick={() => setExportOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--admin-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-input-bg)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <button
                  onClick={handleExportAttemptsCSV}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--admin-text)] group-hover:text-indigo-400 transition-colors">
                        Exam Attempts Telemetry (.CSV)
                      </p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Spreadsheet of recent student exam sessions, scores, pass/fail status, and timestamps
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[var(--admin-muted)] group-hover:text-indigo-400 shrink-0" />
                </button>

                <button
                  onClick={handleExportUsersCSV}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--admin-text)] group-hover:text-cyan-400 transition-colors">
                        Registered Users & Performance Roster (.CSV)
                      </p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        User directory with roles, verification state, exam count, average score, and online presence
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[var(--admin-muted)] group-hover:text-cyan-400 shrink-0" />
                </button>

                <button
                  onClick={handleExportSnapshot}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--admin-text)] group-hover:text-emerald-400 transition-colors">
                        Full Executive Telemetry Snapshot (.JSON)
                      </p>
                      <p className="text-[11px] text-[var(--admin-muted)]">
                        Complete machine-readable backup of KPIs, category breakdowns, module metrics, and audit logs
                      </p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-[var(--admin-muted)] group-hover:text-emerald-400 shrink-0" />
                </button>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setExportOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. DIRECT USER NOTIFICATION MODAL */}
      <AnimatePresence>
        {directMessageTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[115] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="admin-card !rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-[var(--admin-border)] transform-gpu"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--admin-text)]">Direct User Notification</h3>
                    <p className="text-xs text-[var(--admin-muted)] truncate max-w-[240px]">
                      To: {directMessageTarget.name} {directMessageTarget.email ? `(${directMessageTarget.email})` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDirectMessageTarget(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--admin-muted)] hover:text-[var(--admin-text)] bg-[var(--admin-input-bg)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendDirectMessage} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Subject / Title</label>
                  <input
                    type="text"
                    value={directMsgTitle}
                    onChange={(e) => setDirectMsgTitle(e.target.value)}
                    placeholder="e.g., Academic Support & Exam Guidance"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--admin-muted)] block mb-1.5">Personal Message</label>
                  <textarea
                    value={directMsgBody}
                    onChange={(e) => setDirectMsgBody(e.target.value)}
                    placeholder="Write a direct message to this user..."
                    rows={4}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setDirectMessageTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingDirectMsg}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all disabled:opacity-50"
                  >
                    {sendingDirectMsg ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Notification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. COMMAND PALETTE MODAL (Cmd+K / Ctrl+K) */}
      <AnimatePresence>
        {commandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setCommandOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120] flex items-start justify-center pt-[10vh] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ type: "spring", damping: 28, stiffness: 360, mass: 0.7 }}
              onClick={(e) => e.stopPropagation()}
              className="admin-card !rounded-[24px] max-w-xl w-full overflow-hidden shadow-2xl border border-[var(--admin-border)] transform-gpu"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                <Command className="w-4 h-4 text-indigo-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Type a command, workspace, student name, or exam category..."
                  className="w-full bg-transparent text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none"
                />
                {commandQuery && (
                  <button
                    onClick={() => setCommandQuery("")}
                    className="text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                  >
                    Clear
                  </button>
                )}
                <kbd className="px-2 py-0.5 rounded bg-[var(--admin-card-bg)] border border-[var(--admin-border)] text-[10px] font-bold text-[var(--admin-muted)]">
                  ESC
                </kbd>
              </div>

              <div className="max-h-[380px] overflow-y-auto p-3 space-y-4 custom-scrollbar">
                {/* Quick Actions */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                    Quick Administrative Commands
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        label: `Open Action Center & Approvals (${totalActionItems} pending)`,
                        sub: "Approve exam retakes, resolve reports, message at-risk learners",
                        icon: Sparkles,
                        color: "text-amber-400",
                        onClick: () => {
                          setActiveTab("triage");
                          setCommandOpen(false);
                        },
                      },
                      {
                        label: "Broadcast Platform Announcement",
                        sub: "Send instant notification to all students or staff",
                        icon: Megaphone,
                        color: "text-indigo-400",
                        onClick: () => {
                          setCommandOpen(false);
                          setBroadcastOpen(true);
                        },
                      },
                      {
                        label: "Run System Audit & Integrity Report",
                        sub: "Inspect course, question bank, and exam alignment",
                        icon: ClipboardCheck,
                        color: "text-emerald-400",
                        onClick: () => {
                          setCommandOpen(false);
                          setAuditReportOpen(true);
                        },
                      },
                      {
                        label: "Export Telemetry & CSV Spreadsheets",
                        sub: "Download exam attempts CSV, user roster CSV, or JSON snapshot",
                        icon: Download,
                        color: "text-cyan-400",
                        onClick: () => {
                          setCommandOpen(false);
                          setExportOpen(true);
                        },
                      },
                      {
                        label: "Force Sync Live Telemetry",
                        sub: "Refresh all real-time metrics immediately",
                        icon: RefreshCw,
                        color: "text-purple-400",
                        onClick: () => {
                          setCommandOpen(false);
                          loadData(true);
                        },
                      },
                    ]
                      .filter(
                        (item) =>
                          !commandQuery.trim() ||
                          item.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
                          item.sub.toLowerCase().includes(commandQuery.toLowerCase())
                      )
                      .map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={idx}
                            onClick={item.onClick}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--admin-hover-bg)] transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--admin-text)] truncate">{item.label}</p>
                                <p className="text-[11px] text-[var(--admin-muted)] truncate">{item.sub}</p>
                              </div>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--admin-muted)] group-hover:text-[var(--admin-text)] shrink-0" />
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Admin Workspaces */}
                <div>
                  <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                    Admin Workspaces
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {[
                      { label: "Course Studio", href: "/Admin/courses", icon: BookOpen },
                      { label: "Exam Categories", href: "/Admin/Categories", icon: Layers },
                      { label: "Question Bank", href: "/Admin/Questions", icon: HelpCircle },
                      { label: "Users & Roles", href: "/Admin/users", icon: Users },
                      { label: "Driver Fleet", href: "/Admin/drivers", icon: Car },
                      { label: "Retake Requests", href: "/Admin/retake-requests", icon: FileCheck },
                      { label: "Safety Reports", href: "/Admin/reports", icon: ShieldAlert },
                      { label: "Platform Settings", href: "/Admin/settings", icon: Settings },
                    ]
                      .filter(
                        (w) =>
                          !commandQuery.trim() ||
                          w.label.toLowerCase().includes(commandQuery.toLowerCase())
                      )
                      .map((w) => {
                        const Icon = w.icon;
                        return (
                          <Link
                            key={w.href}
                            href={w.href}
                            onClick={() => setCommandOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--admin-hover-bg)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-semibold text-[var(--admin-text)]">{w.label}</span>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--admin-muted)] group-hover:text-indigo-400" />
                          </Link>
                        );
                      })}
                  </div>
                </div>

                {/* Matching Users if Query Typed */}
                {commandQuery.trim().length > 1 && (
                  <div>
                    <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                      Matching Users
                    </p>
                    <div className="space-y-1">
                      {(statsData?.recentRegistrations ?? [])
                        .filter((u) => {
                          const name = u.full_name || u.username || u.email || "";
                          return (
                            name.toLowerCase().includes(commandQuery.toLowerCase()) ||
                            (u.email || "").toLowerCase().includes(commandQuery.toLowerCase())
                          );
                        })
                        .slice(0, 5)
                        .map((u) => {
                          const displayName = u.full_name || u.username || u.email || "User";
                          return (
                            <div
                              key={u.id}
                              className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--admin-text)] truncate">{displayName}</p>
                                <p className="text-[11px] text-[var(--admin-muted)] truncate">
                                  {u.email || "No email"} · {u.role}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setCommandOpen(false);
                                    setDirectMessageTarget({ id: u.id, name: displayName, email: u.email || "" });
                                    setDirectMsgTitle("Message from Luxen Administration");
                                    setDirectMsgBody(`Hello ${displayName.split(" ")[0]}, `);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 text-[10px] font-bold"
                                >
                                  Message
                                </button>
                                <button
                                  onClick={() => {
                                    setCommandOpen(false);
                                    setSearchQuery(displayName);
                                    setActiveTab("students");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--admin-card-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] text-[10px] font-bold"
                                >
                                  Inspect
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. COURSE & EXAM SYSTEM AUDIT REPORT MODAL */}
      <AdminAuditReportModal
        isOpen={auditReportOpen}
        onClose={() => setAuditReportOpen(false)}
      />
    </div>
  );
}
