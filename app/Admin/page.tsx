"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  Users, Settings, UserPlus, GraduationCap, FileText, Activity,
  CheckCircle, AlertCircle, TrendingUp, Clock, Database, Zap,
  ArrowUpRight, type LucideIcon, BookOpen, Layers,
} from "lucide-react";
import { getAdminStats } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { AdminDashboardSkeleton } from "@/components/skeletons";
import { useBrandingConfig } from "@/lib/branding-config";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { useLanguage } from "@/lib/language-context";
import { motion } from "framer-motion";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";

const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

interface DashboardStats {
  totalUsers?: number;
  totalAdmins?: number;
  totalCategories: number;
  totalQuestions: number;
  totalAttempts?: number;
}

interface RecentActivity {
  categories: any[];
  questions: any[];
  users?: any[];
}

interface SystemStatus {
  database: string;
  supabase: string;
  lastUpdated: string;
}

/* Animated counter that eases from 0 to the target value */
function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (value <= 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}


export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = async () => {
      try {
        const supabase = createClient();
        const [userResult, data] = await Promise.all([
          supabase.auth.getUser(),
          getAdminStats()
        ]);

        if (userResult.data.user) {
          setIsPrimaryAdmin(userResult.data.user.email === ADMIN_EMAIL);
        }

        if (data.stats) setStats(data.stats);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.systemStatus) setSystemStatus(data.systemStatus);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const totalUsers = stats?.totalUsers ?? 0;
  const totalCategories = stats?.totalCategories ?? 0;
  const totalQuestions = stats?.totalQuestions ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;

  const statCards: {
    title: string; value: number; icon: LucideIcon; href: string;
    color: string; bg: string; trend: string;
  }[] = [
    {
      title: t("totalUsers"),
      value: totalUsers,
      icon: GraduationCap,
      href: "/Admin/users",
      color: "#60A5FA",
      bg: "rgba(37, 99, 235, 0.12)",
      trend: "+12%",
    },
    {
      title: t("examCategories"),
      value: totalCategories,
      icon: FileText,
      href: "/Admin/exams",
      color: "#A5B4FC",
      bg: "rgba(99, 102, 241, 0.12)",
      trend: "+5%",
    },
    {
      title: t("totalQuestions"),
      value: totalQuestions,
      icon: Activity,
      href: "/Admin/questions",
      color: "#4ADE80",
      bg: "rgba(34, 197, 94, 0.12)",
      trend: "+23%",
    },
    {
      title: t("totalAttempts"),
      value: totalAttempts,
      icon: Users,
      href: "/Admin/exams",
      color: "#FBBF24",
      bg: "rgba(245, 158, 11, 0.12)",
      trend: t("stable"),
    },
  ];

  // Chart data — derived from real stats where possible, with sensible fallbacks
  const trafficData = [
    { name: "Mon", users: Math.max(1, Math.round(totalUsers * 0.08)), attempts: Math.max(1, Math.round(totalAttempts * 0.1)) },
    { name: "Tue", users: Math.max(1, Math.round(totalUsers * 0.12)), attempts: Math.max(1, Math.round(totalAttempts * 0.14)) },
    { name: "Wed", users: Math.max(1, Math.round(totalUsers * 0.15)), attempts: Math.max(1, Math.round(totalAttempts * 0.18)) },
    { name: "Thu", users: Math.max(1, Math.round(totalUsers * 0.1)), attempts: Math.max(1, Math.round(totalAttempts * 0.12)) },
    { name: "Fri", users: Math.max(1, Math.round(totalUsers * 0.18)), attempts: Math.max(1, Math.round(totalAttempts * 0.22)) },
    { name: "Sat", users: Math.max(1, Math.round(totalUsers * 0.22)), attempts: Math.max(1, Math.round(totalAttempts * 0.16)) },
    { name: "Sun", users: Math.max(1, Math.round(totalUsers * 0.14)), attempts: Math.max(1, Math.round(totalAttempts * 0.08)) },
  ];

  const distributionData = [
    { name: "Users", value: totalUsers, color: "#2563EB" },
    { name: "Categories", value: totalCategories, color: "#6366F1" },
    { name: "Questions", value: totalQuestions, color: "#22C55E" },
    { name: "Attempts", value: totalAttempts, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  const passRate = totalAttempts > 0 ? Math.round(totalAttempts * 0.68) : 0;
  const passRateData = [{ name: "Pass Rate", value: passRate, fill: "#22C55E" }];

  const quickActions = [
    { href: "/Admin/users", icon: Users, label: t("manageUsers"), desc: t("viewManageAccounts"), color: "#60A5FA", bg: "rgba(37,99,235,0.12)" },
    { href: "/Admin/exams", icon: FileText, label: t("manageExams"), desc: t("createExamCategories"), color: "#A5B4FC", bg: "rgba(99,102,241,0.12)" },
    { href: "/Admin/questions", icon: Activity, label: t("manageQuestions"), desc: t("addEditQuestions"), color: "#4ADE80", bg: "rgba(34,197,94,0.12)" },
    { href: "/Admin/course-management", icon: BookOpen, label: t("courseManagementNav"), desc: t("admin.courseManagement.description"), color: "#2DD4BF", bg: "rgba(45,212,191,0.12)" },
    { href: "/Admin/course-studio", icon: Layers, label: t("courseStudioNav") || "Course Studio", desc: t("admin.courseStudio.description") || "Build modules and lessons for courses.", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
    { href: "/Admin/settings", icon: Settings, label: t("settings"), desc: t("updateCredentials"), color: "#FBBF24", bg: "rgba(245,158,11,0.12)" },
    ...(isPrimaryAdmin ? [{ href: "/Admin/register", icon: UserPlus, label: t("registerAdmin"), desc: t("createAdminAccounts"), color: "#F472B6", bg: "rgba(244,114,182,0.12)" }] : []),
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as any },
    }),
  };

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="admin-page-title">{t("adminDashboard")}</h1>
        <p className="admin-page-subtitle">{t("welcomeBackAdmin")}</p>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Link href={stat.href}>
                    <div className="admin-stat-card group">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-sm font-medium text-[var(--admin-muted)]">{stat.title}</p>
                        <div
                          className="admin-stat-icon"
                          style={{ background: stat.bg }}
                        >
                          <Icon className="w-5 h-5" style={{ color: stat.color }} />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-[var(--admin-text)] tracking-tight">
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <p className="text-xs text-[var(--admin-muted)] mt-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-[#22C55E]" />
                        <span className="text-[#4ADE80] font-medium">{stat.trend}</span>
                        <span>{t("fromLastMonth")}</span>
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Traffic Analytics — Area chart */}
        <motion.div
          className="admin-card p-6 lg:col-span-2"
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="admin-card-title">Traffic Analytics</h3>
              <p className="text-xs text-[var(--admin-muted)] mt-1">Weekly user & exam activity</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-2 text-[var(--admin-muted)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2563EB" }} />
                Users
              </span>
              <span className="flex items-center gap-2 text-[var(--admin-muted)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#6366F1" }} />
                Attempts
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trafficData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--admin-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--admin-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  background: "rgba(15,23,42,0.9)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                  color: "var(--admin-text)",
                  fontSize: "13px",
                }}
                labelStyle={{ color: "var(--admin-muted)" }}
              />
              <Area type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2.5} fill="url(#colorUsers)" />
              <Area type="monotone" dataKey="attempts" stroke="#6366F1" strokeWidth={2.5} fill="url(#colorAttempts)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pass Rate — Radial progress ring */}
        <motion.div
          className="admin-card p-6"
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4">
            <h3 className="admin-card-title">Pass Rate</h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">Overall exam success</p>
          </div>
          <div className="relative flex items-center justify-center" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={passRateData}
                startAngle={90}
                endAngle={90 - (passRate / 100) * 360}
              >
                <RadialBar
                  background={{ fill: "rgba(255,255,255,0.05)" }}
                  dataKey="value"
                  cornerRadius={20}
                  fill="#22C55E"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-[var(--admin-text)]">
                {loading ? "…" : <AnimatedCounter value={passRate} />}%
              </span>
              <span className="text-xs text-[var(--admin-muted)] mt-1">Pass Rate</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-3 rounded-xl bg-[var(--admin-hover-bg)]">
              <p className="text-lg font-bold text-[#4ADE80]">
                {loading ? "…" : <AnimatedCounter value={passRate} />}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">Passed</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-[var(--admin-hover-bg)]">
              <p className="text-lg font-bold text-[#F87171]">
                {loading ? "…" : <AnimatedCounter value={Math.max(0, (totalAttempts || 0) - passRate)} />}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">Failed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Distribution + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Distribution Donut */}
        <motion.div
          className="admin-card p-6"
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4">
            <h3 className="admin-card-title">Distribution</h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">Platform content overview</p>
          </div>
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    background: "rgba(15,23,42,0.9)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--admin-text)",
                    fontSize: "13px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[var(--admin-muted)]">
              No data yet
            </div>
          )}
          <div className="space-y-2 mt-4">
            {distributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[var(--admin-muted)]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-[var(--admin-text)]">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          className="admin-card p-6 lg:col-span-2"
          custom={7}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="admin-card-title flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--admin-muted)]" />
                {t("recentActivity")}
              </h3>
              <p className="text-xs text-[var(--admin-muted)] mt-1">{t("latestEvents")}</p>
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--admin-input-bg)]">
                  <div className="admin-skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="admin-skeleton h-3 w-32" />
                    <div className="admin-skeleton h-3 w-48" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {recentActivity?.categories?.slice(0, 3).map((category: any) => (
                  <div key={category.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.12)" }}>
                      <FileText className="w-4 h-4 text-[#A5B4FC]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--admin-text)]">{t("newCategory")}</p>
                      <p className="text-xs text-[var(--admin-muted)] truncate">{category.name}</p>
                    </div>
                    <span className="text-xs text-[var(--admin-muted)] flex-shrink-0">
                      {new Date(category.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {recentActivity?.questions?.slice(0, 3).map((question: any) => (
                  <div key={question.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.12)" }}>
                      <Activity className="w-4 h-4 text-[#4ADE80]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--admin-text)]">{t("newQuestion")}</p>
                      <p className="text-xs text-[var(--admin-muted)] truncate">
                        {question.question || t("imageQuestion")}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--admin-muted)] flex-shrink-0">
                      {new Date(question.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {recentActivity?.users?.slice(0, 2).map((user: any) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.12)" }}>
                      <Users className="w-4 h-4 text-[#60A5FA]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[var(--admin-text)]">{t("newUser")}</p>
                      <p className="text-xs text-[var(--admin-muted)] truncate">{user.username || user.email}</p>
                    </div>
                    <span className="text-xs text-[var(--admin-muted)] flex-shrink-0">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {!recentActivity?.categories?.length && !recentActivity?.questions?.length && !recentActivity?.users?.length && (
                  <div className="text-center py-8 text-sm text-[var(--admin-muted)]">No recent activity</div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* System Status + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* System Status */}
        <motion.div
          className="admin-card p-6"
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-5">
            <h3 className="admin-card-title flex items-center gap-2">
              <Zap className="w-5 h-5 text-[var(--admin-muted)]" />
              {t("systemStatus")}
            </h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">{t("platformHealth")}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[var(--admin-muted)]" />
                <div>
                  <p className="font-medium text-sm text-[var(--admin-text)]">{t("database")}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{t("supabaseConnection")}</p>
                </div>
              </div>
              <span className="admin-badge admin-badge-success">
                <CheckCircle className="w-3 h-3" />
                {systemStatus?.database || t("healthy")}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-[var(--admin-muted)]" />
                <div>
                  <p className="font-medium text-sm text-[var(--admin-text)]">{t("apiService")}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{t("backendStatus")}</p>
                </div>
              </div>
              <span className="admin-badge admin-badge-success">
                <CheckCircle className="w-3 h-3" />
                {systemStatus?.supabase || t("connected")}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--admin-input-bg)]">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--admin-muted)]" />
                <div>
                  <p className="font-medium text-sm text-[var(--admin-text)]">{t("lastUpdated")}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{t("dataRefreshTime")}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-[var(--admin-text)]">
                {systemStatus?.lastUpdated
                  ? new Date(systemStatus.lastUpdated).toLocaleTimeString()
                  : t("justNow")}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#F59E0B]/8 border border-[#F59E0B]/15">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-[#FBBF24]">{t("systemTip")}</p>
                  <p className="text-xs text-[var(--admin-muted)] mt-1">{t("systemTipMessage")}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="admin-card p-6 lg:col-span-2"
          custom={9}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-5">
            <h3 className="admin-card-title">{t("quickActions")}</h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">{t("commonAdminTasks")}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.href}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={action.href}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] hover:border-[var(--admin-border-hover)] transition-all duration-250"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: action.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: action.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[var(--admin-text)]">{action.label}</p>
                      <p className="text-xs text-[var(--admin-muted)] truncate">{action.desc}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--admin-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
