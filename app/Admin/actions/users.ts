"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "./_shared";
import type { UserProfile } from "@/lib/database.types";

const ONLINE_THRESHOLD_MINUTES = 5;

function isOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff >= 0 && diff <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

export interface UserWithStatus extends UserProfile {
  is_online: boolean;
}

export async function getAllUsers(): Promise<UserWithStatus[]> {
  const supabase = await createClient();
  await requireAdmin();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllUsers error:", error);
    throw new Error("Failed to load users");
  }

  return (profiles || []).map((u) => ({
    ...u,
    is_online: isOnline(u.last_seen),
  }));
}

export interface UserStats {
  totalUsers: number;
  students: number;
  administrators: number;
  onlineUsers: number;
  suspendedUsers: number;
  pendingVerification: number;
  newUsersThisWeek: number;
}

export async function getUserStats(): Promise<UserStats> {
  const supabase = await createClient();
  await requireAdmin();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("role, last_seen, banned, created_at");

  if (error) {
    console.error("getUserStats error:", error);
    throw new Error("Failed to load user statistics");
  }

  const list = profiles || [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    totalUsers: list.length,
    students: list.filter((u) => u.role === "Student").length,
    administrators: list.filter((u) => u.role === "Admin").length,
    onlineUsers: list.filter((u) => isOnline(u.last_seen)).length,
    suspendedUsers: list.filter((u) => u.banned).length,
    pendingVerification: 0, // placeholder until auth.users confirmed_at is wired in
    newUsersThisWeek: list.filter(
      (u) => u.created_at && new Date(u.created_at) >= oneWeekAgo
    ).length,
  };
}

export interface GrowthPoint {
  date: string;
  count: number;
}

export async function getUserGrowth(days = 30): Promise<GrowthPoint[]> {
  const supabase = await createClient();
  await requireAdmin();

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getUserGrowth error:", error);
    throw new Error("Failed to load user growth");
  }

  const list = profiles || [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    map.set(d.toISOString().split("T")[0], 0);
  }

  for (const p of list) {
    if (!p.created_at) continue;
    const date = new Date(p.created_at).toISOString().split("T")[0];
    if (map.has(date)) {
      map.set(date, (map.get(date) || 0) + 1);
    }
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export interface UserActivityItem {
  id: string;
  type: "login" | "exam" | "module" | "lesson" | "suspension" | "account";
  title: string;
  description: string;
  created_at: string;
}

export async function getUserActivity(userId: string): Promise<UserActivityItem[]> {
  const supabase = await createClient();
  await requireAdmin();

  const [examAttempts, moduleAttempts, lessonProgress] = await Promise.all([
    supabase
      .from("exam_attempts")
      .select("id, category_name, status, started_at, completed_at, score_percentage")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("module_exam_attempts")
      .select("id, module_title, exam_type, status, started_at, completed_at, score_percentage")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("student_lesson_progress")
      .select("id, completed, completed_at, created_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const activity: UserActivityItem[] = [];

  if (!examAttempts.error) {
    for (const a of examAttempts.data || []) {
      activity.push({
        id: `exam-${a.id}`,
        type: "exam",
        title: a.category_name || "Exam",
        description: `${a.status}${a.score_percentage != null ? ` • ${a.score_percentage}%` : ""}`,
        created_at: a.completed_at || a.started_at,
      });
    }
  }

  if (!moduleAttempts.error) {
    for (const a of moduleAttempts.data || []) {
      activity.push({
        id: `module-exam-${a.id}`,
        type: "module",
        title: a.module_title || `${a.exam_type} exam`,
        description: `${a.status}${a.score_percentage != null ? ` • ${a.score_percentage}%` : ""}`,
        created_at: a.completed_at || a.started_at,
      });
    }
  }

  if (!lessonProgress.error) {
    for (const l of lessonProgress.data || []) {
      activity.push({
        id: `lesson-${l.id}`,
        type: "lesson",
        title: "Lesson completed",
        description: "",
        created_at: l.completed_at || l.created_at,
      });
    }
  }

  return activity
    .filter((a) => a.created_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50);
}

export interface UserProgressSummary {
  id: string;
  moduleTitle: string;
  lessonsCompleted: number;
  totalLessons: number;
  examPassed: boolean;
  examAttempts: number;
  bestScore?: number | null;
  timeSpentSeconds: number;
  exceededTimeSeconds: number;
  completedAt?: string | null;
}

export interface UserLessonProgressDetail {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  completed: boolean;
  timeSpentSeconds: number;
  exceededTimeSeconds: number;
  completedAt?: string | null;
}

export async function getStudentProgressSummary(userId: string): Promise<UserProgressSummary[]> {
  const supabase = await createClient();
  await requireAdmin();

  const { data: moduleProgress, error } = await supabase
    .from("student_module_progress")
    .select("*, course_modules(title)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getStudentProgressSummary error:", error);
    return [];
  }

  return (moduleProgress || []).map((p) => ({
    id: p.id,
    moduleTitle: (p.course_modules as { title?: string })?.title || "Module",
    lessonsCompleted: p.lessons_completed,
    totalLessons: p.total_lessons,
    examPassed: p.exam_passed,
    examAttempts: p.exam_attempts,
    bestScore: p.best_score,
    timeSpentSeconds: p.time_spent_seconds || 0,
    exceededTimeSeconds: p.exceeded_time_seconds || 0,
    completedAt: p.completed_at || null,
  }));
}

export async function getStudentLessonProgressDetail(userId: string): Promise<UserLessonProgressDetail[]> {
  const supabase = await createClient();
  await requireAdmin();

  const { data: lessonProgress, error } = await supabase
    .from("student_lesson_progress")
    .select("*, course_lessons(title), course_modules(title)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getStudentLessonProgressDetail error:", error);
    return [];
  }

  return (lessonProgress || []).map((p) => ({
    lessonId: p.lesson_id,
    lessonTitle: (p.course_lessons as { title?: string })?.title || "Lesson",
    moduleId: p.module_id,
    moduleTitle: (p.course_modules as { title?: string })?.title || "Module",
    completed: p.completed,
    timeSpentSeconds: p.time_spent_seconds || 0,
    exceededTimeSeconds: p.exceeded_time_seconds || 0,
    completedAt: p.completed_at || null,
  }));
}

export interface NationalIdRecord {
  id: number;
  national_id: string;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserNationalIdRecords(userId: string): Promise<NationalIdRecord[]> {
  const supabase = await createClient();
  await requireAdmin();

  const { data, error } = await supabase
    .from("national_id_records")
    .select("id, national_id, user_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getUserNationalIdRecords error:", error);
    return [];
  }

  return data || [];
}
