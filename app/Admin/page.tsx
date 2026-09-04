"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users, Settings, GraduationCap, FileText, Activity,
  CheckCircle, AlertCircle, TrendingUp, Clock, Database, Zap,
  ArrowUpRight, type LucideIcon, BookOpen, Layers, Trophy, Award, Timer,
  Send,
} from "lucide-react";
import { getAdminStats } from "@/app/Admin/actions/stats";
import type { AdminStats } from "@/app/Admin/actions/stats";
import { useBrandingConfig } from "@/lib/branding-config";
import { useLanguage } from "@/lib/language-context";
import { Loading } from "@/components/skeletons";
import { AnimatedCounter } from "@/components/animated-counter";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { canAccess, type User as PermUser } from "@/lib/permissions";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from "recharts";

interface DashboardStats {
  totalUsers?: number;
  totalAdmins?: number;
  totalStudents?: number;
  totalCategories: number;
  totalQuestions: number;
  totalAttempts?: number;
  passedAttempts?: number;
  failedAttempts?: number;
  averageScore?: number;
  passRate?: number;
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

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<AdminStats["weeklyActivity"]>([]);
  const [topPerformers, setTopPerformers] = useState<AdminStats["topPerformers"]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AdminStats["recentAttempts"]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<PermUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user as PermUser);

        const result = await getAdminStats();
        if (!result.success) {
          console.error("Failed to load dashboard data:", result.error);
          return;
        }
        const data = result.data;
        if (data.stats) setStats(data.stats);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.systemStatus) setSystemStatus(data.systemStatus);
        if (data.weeklyActivity) setWeeklyActivity(data.weeklyActivity);
        if (data.topPerformers) setTopPerformers(data.topPerformers);
        if (data.recentAttempts) setRecentAttempts(data.recentAttempts);
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
  const passedAttempts = stats?.passedAttempts ?? 0;
  const failedAttempts = stats?.failedAttempts ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const passRate = stats?.passRate ?? 0;

  const statCards: {
    title: string; value: number; icon: LucideIcon; href: string;
    color: string; bg: string; trend: string;
  }[] = [
    {
      title: t("totalUsers"),
      value: totalUsers,
      icon: GraduationCap,
      href: "/Admin/users",
      color: "#22C55E",
      bg: "rgba(34, 197, 94, 0.12)",
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
      href: "/Admin/exams",
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
  ].filter((card) => {
    if (card.href === "/Admin/users") return canAccess(currentUser, "students");
    if (card.href === "/Admin/exams") return canAccess(currentUser, "exams");
    return true;
  });

  // Chart data — real weekly activity from the server
  const trafficData = weeklyActivity.length > 0
    ? weeklyActivity.map((d) => ({ name: d.day, users: d.users, attempts: d.attempts }))
    : [
        { name: "Mon", users: 0, attempts: 0 },
        { name: "Tue", users: 0, attempts: 0 },
        { name: "Wed", users: 0, attempts: 0 },
        { name: "Thu", users: 0, attempts: 0 },
        { name: "Fri", users: 0, attempts: 0 },
        { name: "Sat", users: 0, attempts: 0 },
        { name: "Sun", users: 0, attempts: 0 },
      ];

  const distributionData = [
    { name: "Users", value: totalUsers, color: "#2563EB" },
    { name: "Categories", value: totalCategories, color: "#6366F1" },
    { name: "Questions", value: totalQuestions, color: "#22C55E" },
    { name: "Attempts", value: totalAttempts, color: "#F59E0B" },
  ].filter(d => d.value > 0);

  const passRateData = [{ name: "Pass Rate", value: passRate, fill: "#22C55E" }];

  const allQuickActions = [
    { href: "/Admin/users", icon: Users, label: t("manageUsers"), desc: t("viewManageAccounts"), color: "#60A5FA", bg: "rgba(37,99,235,0.12)", perm: "students" as const },
    { href: "/Admin/exams", icon: FileText, label: t("manageExams"), desc: t("createExamCategories"), color: "#A5B4FC", bg: "rgba(99,102,241,0.12)", perm: "exams" as const },
    { href: "/Admin/exams", icon: Activity, label: t("manageQuestions"), desc: t("addEditQuestions"), color: "#4ADE80", bg: "rgba(34,197,94,0.12)", perm: "exams" as const },
    { href: "/Admin/course?tab=management", icon: BookOpen, label: t("courseManagementNav") || "Course Management", desc: t("admin.courseManagement.description") || "Overview of courses and their status.", color: "#2DD4BF", bg: "rgba(45,212,191,0.12)", perm: "courseManagement" as const },
    { href: "/Admin/course?tab=studio", icon: Layers, label: t("courseStudioNav") || "Course Studio", desc: t("admin.courseStudio.description") || "Build modules and lessons for courses.", color: "#A78BFA", bg: "rgba(167,139,250,0.12)", perm: "courseStudio" as const },
    { href: "/Admin/notifications", icon: Send, label: t("notifications") || "Notifications", desc: t("sendNotificationsToUsers") || "Send in-app notifications to users.", color: "#F472B6", bg: "rgba(244,114,182,0.12)", perm: "notifications" as const },
    { href: "/Admin/settings", icon: Settings, label: t("settings"), desc: t("updateCredentials"), color: "#FBBF24", bg: "rgba(245,158,11,0.12)", perm: "settings" as const },
  ];

  const quickActions = allQuickActions.filter((action) => action.perm === "settings" || canAccess(currentUser, action.perm));

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as any },
    }),
  };

  if (loading) {
    return <Loading message={t("loading") || "Loading..."} />;
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
      <div className="grid grid-cols-4 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-5 w-full">
        {statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="min-w-0"
                >
                  <Link href={stat.href} className="block h-full">
                    <div className="admin-stat-card group !p-2 sm:!p-6 !rounded-xl sm:!rounded-[20px] h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-1.5 sm:mb-4 gap-1">
                        <p className="text-[9px] sm:text-sm font-medium text-[var(--admin-muted)] truncate">{stat.title}</p>
                        <div
                          className="admin-stat-icon !w-5 !h-5 sm:!w-11 sm:!h-11 !rounded-md sm:!rounded-[14px] shrink-0"
                          style={{ background: stat.bg }}
                        >
                          <Icon className="w-3 h-3 sm:w-5 sm:h-5" style={{ color: stat.color }} />
                        </div>
                      </div>
                      <div className="text-sm sm:text-3xl font-bold text-[var(--admin-text)] tracking-tight truncate">
                        <AnimatedCounter value={stat.value} />
                      </div>
                      <p className="hidden sm:flex text-xs text-[var(--admin-muted)] mt-2 items-center gap-1.5">
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
                {loading ? "…" : <AnimatedCounter value={passedAttempts} />}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">Passed</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-[var(--admin-hover-bg)]">
              <p className="text-lg font-bold text-[#F87171]">
                {loading ? "…" : <AnimatedCounter value={failedAttempts} />}
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
              <div className="text-center py-8 text-[var(--admin-muted)]">{t("loading") || "Loading..."}</div>
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

      {/* Student Performance */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Average Score + Pass Rate Summary */}
        <motion.div
          className="admin-card p-6"
          custom={8}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4">
            <h3 className="admin-card-title flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--admin-muted)]" />
              Student Performance
            </h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">Overall exam metrics</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[var(--admin-input-bg)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--admin-muted)]">Average Score</span>
                <Trophy className="w-4 h-4 text-[#FBBF24]" />
              </div>
              <p className="text-3xl font-bold text-[var(--admin-text)]">
                {loading ? "…" : <AnimatedCounter value={averageScore} />}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--admin-input-bg)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[var(--admin-muted)]">Pass Rate</span>
                <CheckCircle className="w-4 h-4 text-[#4ADE80]" />
              </div>
              <p className="text-3xl font-bold text-[#4ADE80]">
                {loading ? "…" : <AnimatedCounter value={passRate} />}%
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] text-center">
                <p className="text-xl font-bold text-[var(--admin-text)]">
                  {loading ? "…" : <AnimatedCounter value={passedAttempts} />}
                </p>
                <p className="text-[11px] text-[var(--admin-muted)]">Passed</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] text-center">
                <p className="text-xl font-bold text-[var(--admin-text)]">
                  {loading ? "…" : <AnimatedCounter value={failedAttempts} />}
                </p>
                <p className="text-[11px] text-[var(--admin-muted)]">Failed</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          className="admin-card p-6 lg:col-span-2"
          custom={9}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="admin-card-title flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FBBF24]" />
                Top Performers
              </h3>
              <p className="text-xs text-[var(--admin-muted)] mt-1">Students with highest average scores (min 3 attempts)</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-[var(--admin-muted)]">{t("loading") || "Loading..."}</div>
          ) : topPerformers.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--admin-muted)]">No performance data yet</div>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{
                    background: index === 0 ? "rgba(251,191,36,0.15)" : index === 1 ? "rgba(165,180,252,0.15)" : index === 2 ? "rgba(217,119,6,0.15)" : "rgba(255,255,255,0.05)",
                    color: index === 0 ? "#FBBF24" : index === 1 ? "#A5B4FC" : index === 2 ? "#D97706" : "var(--admin-muted)",
                  }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--admin-text)] truncate">
                      {performer.full_name || performer.username || performer.email}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">{performer.total_attempts} attempts</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-[#4ADE80]">{performer.avg_score}%</p>
                    <p className="text-[11px] text-[var(--admin-muted)]">avg score</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Exam Attempts */}
      <motion.div
        className="admin-card p-6"
        custom={10}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="admin-card-title flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--admin-muted)]" />
              Recent Exam Attempts
            </h3>
            <p className="text-xs text-[var(--admin-muted)] mt-1">Latest student exam activity</p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-[var(--admin-muted)]">{t("loading") || "Loading..."}</div>
        ) : recentAttempts.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--admin-muted)]">No exam attempts yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--admin-muted)] border-b border-[var(--admin-border)]">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Exam</th>
                  <th className="pb-3 pr-4 font-medium">Score</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt) => {
                  const formatDuration = (secs: number) => {
                    const m = Math.floor(secs / 60);
                    const s = secs % 60;
                    return m > 0 ? `${m}m ${s}s` : `${s}s`;
                  };
                  return (
                    <tr key={attempt.id} className="border-b border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)] transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-[var(--admin-text)]">
                          {attempt.full_name || attempt.username || attempt.email || "Unknown"}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-[var(--admin-muted)]">{attempt.category_name}</td>
                      <td className="py-3 pr-4">
                        <span className={`font-bold ${attempt.score_percentage >= 80 ? "text-[#4ADE80]" : attempt.score_percentage >= 50 ? "text-[#FBBF24]" : "text-[#F87171]"}`}>
                          {attempt.score_percentage}%
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`admin-badge ${attempt.status === "completed" ? "admin-badge-success" : attempt.status === "in_progress" ? "admin-badge-warning" : "admin-badge-danger"}`}>
                          {attempt.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--admin-muted)]">
                        {new Date(attempt.started_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-[var(--admin-muted)]">
                        {formatDuration(attempt.duration_seconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* System Status + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* System Status */}
        <motion.div
          className="admin-card p-6"
          custom={11}
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
          custom={12}
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
