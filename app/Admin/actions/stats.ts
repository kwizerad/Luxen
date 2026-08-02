"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";

export interface AdminStats {
  stats: {
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
  systemStatus: {
    database: string;
    supabase: string;
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

export async function getAdminStats(): Promise<ActionResult<AdminStats>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    // --- Basic counts ---
    const [categoryCount, questionCount, attemptsCount] = await Promise.all([
      supabase.from("exam_categories").select("*", { count: "exact", head: true }),
      supabase.from("exam_questions").select("*", { count: "exact", head: true }),
      supabase.from("exam_attempts").select("*", { count: "exact", head: true }),
    ]);

    // --- User counts ---
    const { data: userProfiles } = await supabase
      .from("user_profiles")
      .select("role");
    const allUsers = userProfiles || [];
    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter((u: { role: string }) => u.role === "Admin").length;
    const totalStudents = allUsers.filter((u: { role: string }) => u.role === "Student").length;

    // --- Exam performance (real pass rate + average score) ---
    const { data: completedAttempts } = await supabase
      .from("exam_attempts")
      .select("score_percentage, status")
      .eq("status", "completed");

    const completed = completedAttempts || [];
    const passed = completed.filter((a: { score_percentage: number }) => a.score_percentage >= 50).length;
    const failed = completed.length - passed;
    const averageScore = completed.length > 0
      ? Math.round(completed.reduce((sum: number, a: { score_percentage: number }) => sum + a.score_percentage, 0) / completed.length)
      : 0;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    // --- Recent activity ---
    const [recentCategories, recentQuestions, recentUsers] = await Promise.all([
      supabase.from("exam_categories").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("exam_questions").select("*, exam_categories(name)").order("created_at", { ascending: false }).limit(5),
      supabase.from("user_profiles").select("id, username, email, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    // --- Weekly activity (last 7 days) ---
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    const { data: weekAttempts } = await supabase
      .from("exam_attempts")
      .select("started_at")
      .gte("started_at", weekStart.toISOString());

    const { data: weekUsers } = await supabase
      .from("user_profiles")
      .select("created_at")
      .gte("created_at", weekStart.toISOString());

    const weeklyActivity: { day: string; users: number; attempts: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayName = dayNames[day.getDay()];

      const userCount = (weekUsers || []).filter((u: { created_at: string }) => {
        const d = new Date(u.created_at);
        return d >= day && d < dayEnd;
      }).length;

      const attemptCount = (weekAttempts || []).filter((a: { started_at: string }) => {
        const d = new Date(a.started_at);
        return d >= day && d < dayEnd;
      }).length;

      weeklyActivity.push({ day: dayName, users: userCount, attempts: attemptCount });
    }

    // --- Top performers (students with highest avg score, min 3 attempts) ---
    const { data: topPerformerAttempts } = await supabase
      .from("exam_attempts")
      .select("user_id, score_percentage")
      .eq("status", "completed");

    const performerMap = new Map<string, { total: number; sum: number }>();
    for (const a of topPerformerAttempts || []) {
      const entry = performerMap.get(a.user_id) || { total: 0, sum: 0 };
      entry.total += 1;
      entry.sum += a.score_percentage;
      performerMap.set(a.user_id, entry);
    }

    const topPerformerIds = [...performerMap.entries()]
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => (b[1].sum / b[1].total) - (a[1].sum / a[1].total))
      .slice(0, 5)
      .map(([id]) => id);

    let topPerformers: AdminStats["topPerformers"] = [];
    if (topPerformerIds.length > 0) {
      const { data: performerProfiles } = await supabase
        .from("user_profiles")
        .select("id, username, full_name, email, avatar_url")
        .in("id", topPerformerIds);

      const profileMap = new Map((performerProfiles || []).map((p: { id: string }) => [p.id, p]));
      topPerformers = topPerformerIds.map((id) => {
        const profile = profileMap.get(id) as { id: string; username: string | null; full_name: string | null; email: string | null; avatar_url: string | null } | undefined;
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

    // --- Recent exam attempts with user info ---
    const { data: recentAttemptRows } = await supabase
      .from("exam_attempts")
      .select("id, user_id, category_name, score_percentage, status, started_at, duration_seconds")
      .order("started_at", { ascending: false })
      .limit(10);

    let recentAttempts: AdminStats["recentAttempts"] = [];
    if (recentAttemptRows && recentAttemptRows.length > 0) {
      const recentUserIds = [...new Set(recentAttemptRows.map((a: { user_id: string }) => a.user_id))];
      const { data: recentUserProfiles } = await supabase
        .from("user_profiles")
        .select("id, username, full_name, email")
        .in("id", recentUserIds);

      const recentProfileMap = new Map((recentUserProfiles || []).map((p: { id: string }) => [p.id, p]));
      recentAttempts = recentAttemptRows.map((a: { id: string; user_id: string; category_name: string; score_percentage: number; status: string; started_at: string; duration_seconds: number }) => {
        const profile = recentProfileMap.get(a.user_id) as { username: string | null; full_name: string | null; email: string | null } | undefined;
        return {
          ...a,
          username: profile?.username || null,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
        };
      });
    }

    const systemStatus = {
      database: "healthy",
      supabase: "connected",
      lastUpdated: new Date().toISOString(),
    };

    return {
      success: true,
      data: {
        stats: {
          totalUsers,
          totalAdmins,
          totalStudents,
          totalCategories: categoryCount.count || 0,
          totalQuestions: questionCount.count || 0,
          totalAttempts: attemptsCount.count || 0,
          passedAttempts: passed,
          failedAttempts: failed,
          averageScore,
          passRate,
        },
        recentActivity: {
          categories: recentCategories.data || [],
          questions: recentQuestions.data || [],
          users: recentUsers.data || [],
        },
        weeklyActivity,
        topPerformers,
        recentAttempts,
        systemStatus,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}
