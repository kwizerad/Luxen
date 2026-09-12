"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";

export interface CategoryMetric {
  id: string;
  name: string;
  questionCount: number;
  attemptCount: number;
  passRate: number;
  averageScore: number;
  durationMinutes: number;
}

export interface ScoreDistribution {
  tier: string;
  label: string;
  range: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentRegistration {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  is_online: boolean;
  provision_verified?: boolean;
}

export interface SystemAuditItem {
  id: string;
  type: "exam_completed" | "user_joined" | "question_added" | "category_created" | "course_updated";
  title: string;
  subtitle: string;
  timestamp: string;
  badge?: string;
  badgeType?: "success" | "warning" | "info" | "neutral";
}

export interface AdminStats {
  stats: {
    totalUsers: number;
    totalAdmins: number;
    totalStudents: number;
    totalDrivers: number;
    onlineUsers: number;
    totalCategories: number;
    totalQuestions: number;
    totalAttempts: number;
    inProgressAttempts: number;
    passedAttempts: number;
    failedAttempts: number;
    averageScore: number;
    passRate: number;
    newStudentsThisWeek: number;
    totalCourses: number;
    totalModules: number;
    pendingReports: number;
  };
  recentActivity: {
    categories: unknown[];
    questions: unknown[];
    users?: unknown[];
  };
  weeklyActivity: {
    day: string;
    users: number;
    attempts: number;
  }[];
  weeklyRegistrations: {
    day: string;
    date: string;
    fullDate: string;
    students: number;
    totalUsers: number;
  }[];
  monthlyActivity: {
    date: string;
    users: number;
    attempts: number;
  }[];
  scoreDistribution: ScoreDistribution[];
  categoryMetrics: CategoryMetric[];
  topPerformers: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    avg_score: number;
    total_attempts: number;
  }[];
  recentAttempts: {
    id: string;
    user_id: string;
    category_name: string;
    score_percentage: number;
    status: string;
    started_at: string;
    duration_seconds: number;
    username: string | null;
    full_name: string | null;
    email: string | null;
  }[];
  recentRegistrations: RecentRegistration[];
  auditStream: SystemAuditItem[];
  systemStatus: {
    database: string;
    supabase: string;
    latencyMs: number;
    lastUpdated: string;
  };
}

function handleError(error: unknown): { success: false; error: string } {
  if (error instanceof Error) return { success: false, error: error.message };
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; error?: string; details?: string };
    if (e.message) return { success: false, error: e.message };
    if (e.error) return { success: false, error: e.error };
    if (e.details) return { success: false, error: e.details };
  }
  return { success: false, error: String(error) };
}

const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export async function getAdminStats(): Promise<ActionResult<AdminStats>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const startTime = Date.now();

    // 1. Core Counts in Parallel
    const [categoryCount, questionCount, attemptsCount, inProgressCount, coursesCount, modulesCount] = await Promise.all([
      supabase.from("exam_categories").select("*", { count: "exact", head: true }),
      supabase.from("exam_questions").select("*", { count: "exact", head: true }),
      supabase.from("exam_attempts").select("*", { count: "exact", head: true }),
      supabase.from("exam_attempts").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("course_language_courses").select("*", { count: "exact", head: true }),
      supabase.from("course_modules").select("*", { count: "exact", head: true }),
    ]);

    // 2. User Profiles Analysis
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("id, role, username, full_name, email, avatar_url, last_seen, created_at, provision_verified")
      .order("created_at", { ascending: false });

    const allUsers = userProfiles || [];
    const now = Date.now();
    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter((u) => u.role === "Admin").length;
    const totalStudents = allUsers.filter((u) => !u.role || u.role.toLowerCase() === "student").length;
    const totalDrivers = allUsers.filter((u) => u.role === "Driver").length;
    const onlineUsers = allUsers.filter((u) => u.last_seen && now - new Date(u.last_seen).getTime() <= ONLINE_WINDOW_MS).length;

    const recentRegistrations: RecentRegistration[] = allUsers.slice(0, 8).map((u) => ({
      id: u.id,
      username: u.username || null,
      full_name: u.full_name || null,
      email: u.email || null,
      avatar_url: u.avatar_url || null,
      role: u.role || "Student",
      created_at: u.created_at,
      is_online: !!(u.last_seen && now - new Date(u.last_seen).getTime() <= ONLINE_WINDOW_MS),
      provision_verified: u.provision_verified || false,
    }));

    // 3. Completed Attempts & Score Distribution
    const { data: completedAttempts } = await supabase
      .from("exam_attempts")
      .select("id, user_id, category_id, category_name, score_percentage, status, started_at, duration_seconds")
      .eq("status", "completed");

    const completed = completedAttempts || [];
    const passed = completed.filter((a) => a.score_percentage >= 50).length;
    const failed = completed.length - passed;
    const averageScore = completed.length > 0
      ? Math.round(completed.reduce((sum, a) => sum + a.score_percentage, 0) / completed.length)
      : 0;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    // Score Brackets Distribution
    const tierFail = completed.filter((a) => a.score_percentage < 50).length;
    const tierFair = completed.filter((a) => a.score_percentage >= 50 && a.score_percentage < 70).length;
    const tierGood = completed.filter((a) => a.score_percentage >= 70 && a.score_percentage < 85).length;
    const tierExcellent = completed.filter((a) => a.score_percentage >= 85).length;
    const totalDist = completed.length || 1;

    const scoreDistribution: ScoreDistribution[] = [
      {
        tier: "fail",
        label: "Needs Improvement",
        range: "< 50%",
        count: tierFail,
        percentage: Math.round((tierFail / totalDist) * 100),
        color: "#F87171",
      },
      {
        tier: "fair",
        label: "Pass (Basic)",
        range: "50% - 69%",
        count: tierFair,
        percentage: Math.round((tierFair / totalDist) * 100),
        color: "#FBBF24",
      },
      {
        tier: "good",
        label: "Proficient",
        range: "70% - 84%",
        count: tierGood,
        percentage: Math.round((tierGood / totalDist) * 100),
        color: "#60A5FA",
      },
      {
        tier: "excellent",
        label: "Mastery",
        range: "85% - 100%",
        count: tierExcellent,
        percentage: Math.round((tierExcellent / totalDist) * 100),
        color: "#4ADE80",
      },
    ];

    // 4. Category Performance Metrics
    const { data: allCategories } = await supabase
      .from("exam_categories")
      .select("id, name, duration_minutes, created_at")
      .order("name", { ascending: true });

    const { data: allQuestions } = await supabase
      .from("exam_questions")
      .select("id, category_id");

    const categoryQuestionCounts = new Map<string, number>();
    for (const q of allQuestions || []) {
      if (q.category_id) {
        categoryQuestionCounts.set(q.category_id, (categoryQuestionCounts.get(q.category_id) || 0) + 1);
      }
    }

    const categoryMetricsMap = new Map<string, { attempts: number; passed: number; scoreSum: number }>();
    for (const a of completed) {
      const catKey = a.category_id || a.category_name;
      if (!catKey) continue;
      const cur = categoryMetricsMap.get(catKey) || { attempts: 0, passed: 0, scoreSum: 0 };
      cur.attempts += 1;
      if (a.score_percentage >= 50) cur.passed += 1;
      cur.scoreSum += a.score_percentage;
      categoryMetricsMap.set(catKey, cur);
    }

    const categoryMetrics: CategoryMetric[] = (allCategories || []).map((cat) => {
      const stats = categoryMetricsMap.get(cat.id) || categoryMetricsMap.get(cat.name) || { attempts: 0, passed: 0, scoreSum: 0 };
      const qCount = categoryQuestionCounts.get(cat.id) || 0;
      return {
        id: cat.id,
        name: cat.name,
        questionCount: qCount,
        attemptCount: stats.attempts,
        passRate: stats.attempts > 0 ? Math.round((stats.passed / stats.attempts) * 100) : 0,
        averageScore: stats.attempts > 0 ? Math.round(stats.scoreSum / stats.attempts) : 0,
        durationMinutes: cat.duration_minutes || 20,
      };
    }).sort((a, b) => b.attemptCount - a.attemptCount);

    // 5. Recent Activity Queries
    const [recentCategories, recentQuestions, recentUsers] = await Promise.all([
      supabase.from("exam_categories").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("exam_questions").select("*, exam_categories(name)").order("created_at", { ascending: false }).limit(5),
      supabase.from("user_profiles").select("id, username, email, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    // 6. Weekly & 30-Day Activity Trends
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const { data: monthAttempts } = await supabase
      .from("exam_attempts")
      .select("started_at")
      .gte("started_at", thirtyDaysAgo.toISOString());

    const { data: monthUsers } = await supabase
      .from("user_profiles")
      .select("created_at, role")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Build 7-day breakdown
    const weeklyActivity: { day: string; users: number; attempts: number }[] = [];
    const weeklyRegistrations: { day: string; date: string; fullDate: string; students: number; totalUsers: number }[] = [];
    let newStudentsThisWeek = 0;

    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayName = dayNames[day.getDay()];
      const dateStr = `${day.getMonth() + 1}/${day.getDate()}`;
      const fullDateStr = day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      const dayUsers = (monthUsers || []).filter((u) => {
        const d = new Date(u.created_at);
        return d >= day && d < dayEnd;
      });

      const userCount = dayUsers.length;
      const studentCount = dayUsers.filter((u) => !u.role || u.role.toLowerCase() === "student").length;
      newStudentsThisWeek += studentCount;

      const attemptCount = (monthAttempts || []).filter((a) => {
        const d = new Date(a.started_at);
        return d >= day && d < dayEnd;
      }).length;

      weeklyActivity.push({ day: dayName, users: userCount, attempts: attemptCount });
      weeklyRegistrations.push({
        day: dayName,
        date: dateStr,
        fullDate: fullDateStr,
        students: studentCount,
        totalUsers: userCount,
      });
    }

    // Build 30-day activity trend
    const monthlyActivity: { date: string; users: number; attempts: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const label = `${day.getMonth() + 1}/${day.getDate()}`;

      const userCount = (monthUsers || []).filter((u) => {
        const d = new Date(u.created_at);
        return d >= day && d < dayEnd;
      }).length;

      const attemptCount = (monthAttempts || []).filter((a) => {
        const d = new Date(a.started_at);
        return d >= day && d < dayEnd;
      }).length;

      monthlyActivity.push({ date: label, users: userCount, attempts: attemptCount });
    }

    // 7. Top Performers (Highest average score, min 2 attempts)
    const performerMap = new Map<string, { total: number; sum: number }>();
    for (const a of completed) {
      if (!a.user_id) continue;
      const entry = performerMap.get(a.user_id) || { total: 0, sum: 0 };
      entry.total += 1;
      entry.sum += a.score_percentage;
      performerMap.set(a.user_id, entry);
    }

    const topPerformerIds = [...performerMap.entries()]
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (b[1].sum / b[1].total) - (a[1].sum / a[1].total))
      .slice(0, 5)
      .map(([id]) => id);

    let topPerformers: AdminStats["topPerformers"] = [];
    if (topPerformerIds.length > 0) {
      const profileMap = new Map((allUsers || []).map((p) => [p.id, p]));
      topPerformers = topPerformerIds.map((id) => {
        const profile = profileMap.get(id);
        const stats = performerMap.get(id)!;
        return {
          id,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          avg_score: Math.round(stats.sum / stats.total),
          total_attempts: stats.total,
        };
      });
    }

    // 8. Recent Exam Attempts
    const { data: recentAttemptRows } = await supabase
      .from("exam_attempts")
      .select("id, user_id, category_name, score_percentage, status, started_at, duration_seconds")
      .order("started_at", { ascending: false })
      .limit(10);

    const profileMap = new Map((allUsers || []).map((p) => [p.id, p]));
    const recentAttempts: AdminStats["recentAttempts"] = (recentAttemptRows || []).map((a) => {
      const profile = profileMap.get(a.user_id);
      return {
        ...a,
        username: profile?.username || null,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
      };
    });

    // 9. Composite System Audit Stream
    const auditStream: SystemAuditItem[] = [];

    // Add recent attempts to stream
    for (const a of (recentAttemptRows || []).slice(0, 4)) {
      const profile = profileMap.get(a.user_id);
      const name = profile?.full_name || profile?.username || "Student";
      auditStream.push({
        id: `att-${a.id}`,
        type: "exam_completed",
        title: `${name} ${a.status === "completed" ? "completed" : "started"} ${a.category_name || "Exam"}`,
        subtitle: `Scored ${a.score_percentage}% • ${a.duration_seconds > 0 ? `${Math.round(a.duration_seconds / 60)} mins` : "In progress"}`,
        timestamp: a.started_at,
        badge: a.score_percentage >= 50 ? `${a.score_percentage}% PASS` : `${a.score_percentage}% FAIL`,
        badgeType: a.score_percentage >= 80 ? "success" : a.score_percentage >= 50 ? "warning" : "neutral",
      });
    }

    // Add recent users to stream
    for (const u of (allUsers || []).slice(0, 3)) {
      auditStream.push({
        id: `usr-${u.id}`,
        type: "user_joined",
        title: `New user registration: ${u.full_name || u.username || u.email || "New User"}`,
        subtitle: `Role: ${u.role || "Student"} • Provision: ${u.provision_verified ? "Verified" : "Standard"}`,
        timestamp: u.created_at,
        badge: u.role || "Student",
        badgeType: "info",
      });
    }

    // Sort audit stream chronologically
    auditStream.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      data: {
        stats: {
          totalUsers,
          totalAdmins,
          totalStudents,
          totalDrivers,
          onlineUsers,
          totalCategories: categoryCount.count || 0,
          totalQuestions: questionCount.count || 0,
          totalAttempts: attemptsCount.count || 0,
          inProgressAttempts: inProgressCount.count || 0,
          passedAttempts: passed,
          failedAttempts: failed,
          averageScore,
          passRate,
          newStudentsThisWeek,
          totalCourses: coursesCount.count || 0,
          totalModules: modulesCount.count || 0,
          pendingReports: 0,
        },
        recentActivity: {
          categories: recentCategories.data || [],
          questions: recentQuestions.data || [],
          users: recentUsers.data || [],
        },
        weeklyActivity,
        weeklyRegistrations,
        monthlyActivity,
        scoreDistribution,
        categoryMetrics,
        topPerformers,
        recentAttempts,
        recentRegistrations,
        auditStream,
        systemStatus: {
          database: "healthy",
          supabase: "connected",
          latencyMs,
          lastUpdated: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    return handleError(error);
  }
}

