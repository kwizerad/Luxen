"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, ActionResult } from "./_shared";
import { isStrictlyStudentEmail } from "@/lib/permissions";

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

export interface RetakeRequestItem {
  id: string;
  user_id: string;
  student_name: string;
  student_email: string | null;
  category_id: string | null;
  category_name: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
  admin_note?: string | null;
}

export interface PendingReportItem {
  id: string;
  report_type: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_name: string;
}

export interface AtRiskLearner {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  avg_score: number;
  total_attempts: number;
  failed_attempts: number;
  last_attempt_at: string;
}

export interface CourseModuleMetric {
  id: string;
  title: string;
  courseTitle: string;
  lessonCount: number;
  completedLessonsCount: number;
  isPublished: boolean;
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
    totalLessons: number;
    completedLessonProgress: number;
    pendingReports: number;
    pendingRetakeRequests: number;
    unverifiedUsers: number;
    suspendedUsers: number;
    atRiskCount: number;
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
  courseModuleMetrics: CourseModuleMetric[];
  retakeRequests: RetakeRequestItem[];
  pendingReportsList: PendingReportItem[];
  atRiskLearners: AtRiskLearner[];
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
  recentRegistrations: (RecentRegistration & {
    banned?: boolean;
    attempt_count?: number;
    avg_score?: number | null;
  })[];
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
const STATS_CACHE_TTL_MS = 8 * 1000; // 8s fast server-side cache
let cachedStatsResult: AdminStats | null = null;
let cachedStatsTimestamp = 0;

function invalidateStatsCache() {
  cachedStatsResult = null;
  cachedStatsTimestamp = 0;
}

export async function getAdminStats(forceRefresh = false): Promise<ActionResult<AdminStats>> {
  try {
    await requireAdmin();

    if (
      !forceRefresh &&
      cachedStatsResult &&
      Date.now() - cachedStatsTimestamp < STATS_CACHE_TTL_MS
    ) {
      return { success: true, data: cachedStatsResult };
    }

    const supabase = createAdminClient();
    const startTime = Date.now();

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const safeQuery = async <T,>(promise: PromiseLike<{ data: T | null; error?: any }>): Promise<T | null> => {
      try {
        const res = await promise;
        return res.data ?? null;
      } catch {
        return null;
      }
    };

    // Execute ALL database queries in a single parallel Promise.all batch (1 round-trip instead of 14 sequential round-trips)
    const [
      userProfiles,
      allCategories,
      allQuestions,
      attemptsCountRes,
      inProgressCountRes,
      completedAttempts,
      recentAttemptRows,
      monthAttempts,
      retakeRows,
      reportRows,
      coursesData,
      modulesData,
      lessonsData,
      progressData,
    ] = await Promise.all([
      safeQuery(
        supabase
          .from("user_profiles")
          .select(
            "id, role, username, full_name, first_name, last_name, email, avatar_url, last_seen, created_at, provision_verified, national_id, banned"
          )
          .order("created_at", { ascending: false })
      ),
      safeQuery(
        supabase
          .from("exam_categories")
          .select("id, name, duration_minutes, created_at")
          .order("name", { ascending: true })
      ),
      safeQuery(
        supabase
          .from("exam_questions")
          .select("id, category_id, question, created_at, exam_categories(name)")
          .order("created_at", { ascending: false })
      ),
      supabase.from("exam_attempts").select("*", { count: "exact", head: true }),
      supabase.from("exam_attempts").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
      safeQuery(
        supabase
          .from("exam_attempts")
          .select("id, user_id, category_id, category_name, score_percentage, status, started_at, duration_seconds")
          .eq("status", "completed")
      ),
      safeQuery(
        supabase
          .from("exam_attempts")
          .select("id, user_id, category_name, score_percentage, status, started_at, duration_seconds")
          .order("started_at", { ascending: false })
          .limit(25)
      ),
      safeQuery(
        supabase
          .from("exam_attempts")
          .select("started_at")
          .gte("started_at", thirtyDaysAgoIso)
      ),
      safeQuery(
        supabase
          .from("exam_retake_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25)
      ),
      safeQuery(
        supabase
          .from("user_reports")
          .select("id, report_type, description, status, created_at, reporter_id, reported_user_id")
          .order("created_at", { ascending: false })
          .limit(20)
      ),
      safeQuery(supabase.from("course_language_courses").select("id, title, language_code")),
      safeQuery(
        supabase
          .from("course_modules")
          .select("id, course_id, title, is_published, order_index")
          .order("order_index", { ascending: true })
      ),
      safeQuery(supabase.from("course_lessons").select("id, module_id")),
      safeQuery(supabase.from("student_lesson_progress").select("id, module_id, completed").eq("completed", true)),
    ]);

    const allUsers = (userProfiles || []).map((u: any) => ({
      ...u,
      role: isStrictlyStudentEmail(u.email) ? "Student" : u.role,
    }));
    const profileMap = new Map(allUsers.map((p: any) => [p.id, p]));

    // Helper to resolve the best human-readable student name directly from in-memory profileMap
    const resolveStudentDisplayName = (
      userId: string
    ): {
      fullName: string | null;
      username: string | null;
      email: string | null;
      avatarUrl: string | null;
      displayName: string;
    } => {
      const profile = profileMap.get(userId);
      const nationalId = profile?.national_id;

      const profileFullName = profile?.full_name?.trim();
      const profileCombinedName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
      const username = profile?.username?.trim() || null;
      const email = profile?.email?.trim() || null;
      const avatarUrl = profile?.avatar_url || null;

      let displayName = profileFullName || profileCombinedName || username;

      if (!displayName && email) {
        const local = email.split("@")[0];
        const formatted = local
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
          .trim();
        displayName = formatted && formatted.length > 1 ? formatted : email;
      }

      if (!displayName && nationalId) {
        displayName = `Student (ID: ${nationalId})`;
      }

      if (!displayName && userId) {
        displayName = `Student #${userId.slice(0, 6)}`;
      }

      const finalName = profileFullName || profileCombinedName || displayName || null;

      return {
        fullName: finalName,
        username,
        email,
        avatarUrl,
        displayName: displayName || "Student",
      };
    };

    const now = Date.now();
    const totalUsers = allUsers.length;
    const totalAdmins = allUsers.filter((u) => u.role === "Admin").length;
    const totalStudents = allUsers.filter((u) => !u.role || u.role.toLowerCase() === "student").length;
    const totalDrivers = allUsers.filter((u) => u.role === "Driver").length;
    const onlineUsers = allUsers.filter((u) => u.last_seen && now - new Date(u.last_seen).getTime() <= ONLINE_WINDOW_MS).length;
    const unverifiedUsers = allUsers.filter((u) => (!u.role || u.role.toLowerCase() === "student") && !u.provision_verified).length;
    const suspendedUsers = allUsers.filter((u) => Boolean((u as any).banned)).length;

    // 3. Completed Attempts & Score Distribution
    const completed = completedAttempts || [];
    const passed = completed.filter((a: any) => a.score_percentage >= 50).length;
    const failed = completed.length - passed;
    const averageScore = completed.length > 0
      ? Math.round(completed.reduce((sum: number, a: any) => sum + a.score_percentage, 0) / completed.length)
      : 0;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    // Build per-user attempt stats map
    const userAttemptStats = new Map<string, { total: number; failed: number; sum: number; lastAt: string }>();
    for (const a of completed) {
      if (!a.user_id) continue;
      const cur = userAttemptStats.get(a.user_id) || { total: 0, failed: 0, sum: 0, lastAt: a.started_at };
      cur.total += 1;
      if (a.score_percentage < 50) cur.failed += 1;
      cur.sum += a.score_percentage;
      if (new Date(a.started_at) > new Date(cur.lastAt)) {
        cur.lastAt = a.started_at;
      }
      userAttemptStats.set(a.user_id, cur);
    }

    const recentRegistrations = allUsers.slice(0, 35).map((u) => {
      const resolved = resolveStudentDisplayName(u.id);
      const uStats = userAttemptStats.get(u.id);
      return {
        id: u.id,
        username: u.username || resolved.username,
        full_name: resolved.fullName || resolved.displayName,
        email: u.email || resolved.email,
        avatar_url: u.avatar_url || resolved.avatarUrl,
        role: u.role || "Student",
        created_at: u.created_at,
        is_online: !!(u.last_seen && now - new Date(u.last_seen).getTime() <= ONLINE_WINDOW_MS),
        provision_verified: u.provision_verified || false,
        banned: Boolean((u as any).banned),
        attempt_count: uStats?.total || 0,
        avg_score: uStats && uStats.total > 0 ? Math.round(uStats.sum / uStats.total) : null,
      };
    });

    // Score Brackets Distribution
    const tierFail = completed.filter((a: any) => a.score_percentage < 50).length;
    const tierFair = completed.filter((a: any) => a.score_percentage >= 50 && a.score_percentage < 70).length;
    const tierGood = completed.filter((a: any) => a.score_percentage >= 70 && a.score_percentage < 85).length;
    const tierExcellent = completed.filter((a: any) => a.score_percentage >= 85).length;
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

    // 4. Category Performance Metrics (computed from already fetched allCategories & allQuestions)
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

    const categoryMetrics: CategoryMetric[] = (allCategories || []).map((cat: any) => {
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

    // 5. Recent Activity (computed in-memory from already fetched arrays)
    const recentCategoriesList = [...(allCategories || [])]
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
    const recentQuestionsList = (allQuestions || []).slice(0, 5);
    const recentUsersList = allUsers.slice(0, 5).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      created_at: u.created_at,
    }));

    // 6. Weekly & 30-Day Activity Trends (computed in-memory)
    const monthUsers = allUsers.filter((u) => u.created_at && u.created_at >= thirtyDaysAgoIso);

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

      const dayUsers = monthUsers.filter((u) => {
        const d = new Date(u.created_at);
        return d >= day && d < dayEnd;
      });

      const userCount = dayUsers.length;
      const studentCount = dayUsers.filter((u) => !u.role || u.role.toLowerCase() === "student").length;
      newStudentsThisWeek += studentCount;

      const attemptCount = (monthAttempts || []).filter((a: any) => {
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

      const userCount = monthUsers.filter((u) => {
        const d = new Date(u.created_at);
        return d >= day && d < dayEnd;
      }).length;

      const attemptCount = (monthAttempts || []).filter((a: any) => {
        const d = new Date(a.started_at);
        return d >= day && d < dayEnd;
      }).length;

      monthlyActivity.push({ date: label, users: userCount, attempts: attemptCount });
    }

    // 7. Top Performers (Highest average score, min 2 attempts) & At-Risk Learners
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
      topPerformers = topPerformerIds.map((id) => {
        const resolved = resolveStudentDisplayName(id);
        const stats = performerMap.get(id)!;
        return {
          id,
          username: resolved.username,
          full_name: resolved.fullName || resolved.displayName,
          email: resolved.email,
          avatar_url: resolved.avatarUrl,
          avg_score: Math.round(stats.sum / stats.total),
          total_attempts: stats.total,
        };
      });
    }

    const atRiskLearners: AtRiskLearner[] = [...userAttemptStats.entries()]
      .filter(([, v]) => v.failed >= 1 && Math.round(v.sum / v.total) < 50)
      .sort((a, b) => (a[1].sum / a[1].total) - (b[1].sum / b[1].total))
      .slice(0, 12)
      .map(([id, v]) => {
        const resolved = resolveStudentDisplayName(id);
        return {
          id,
          full_name: resolved.fullName || resolved.displayName,
          email: resolved.email,
          avatar_url: resolved.avatarUrl,
          avg_score: Math.round(v.sum / v.total),
          total_attempts: v.total,
          failed_attempts: v.failed,
          last_attempt_at: v.lastAt,
        };
      });

    // 7b. Retake Requests, Incident Reports, and Course Curriculum Telemetry
    const catNameMap = new Map((allCategories || []).map((c: any) => [c.id, c.name]));
    const retakeRequests: RetakeRequestItem[] = (retakeRows || []).map((r: any) => {
      const resolved = resolveStudentDisplayName(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        student_name: resolved.fullName || resolved.displayName,
        student_email: resolved.email,
        category_id: r.category_id || null,
        category_name: r.category_name || (r.category_id ? catNameMap.get(r.category_id) : null) || "General Exam",
        reason: r.reason || null,
        status: r.status || "pending",
        created_at: r.created_at,
        admin_note: r.admin_note || null,
      };
    });
    const pendingRetakeRequests = retakeRequests.filter((r) => r.status === "pending").length;

    const pendingReportsList: PendingReportItem[] = (reportRows || []).map((r: any) => {
      const reporter = resolveStudentDisplayName(r.reporter_id);
      const reported = resolveStudentDisplayName(r.reported_user_id);
      return {
        id: r.id,
        report_type: r.report_type || "general",
        description: r.description || null,
        status: r.status || "pending",
        created_at: r.created_at,
        reporter_name: reporter.displayName,
        reported_name: reported.displayName,
      };
    });
    const pendingReportsCount = pendingReportsList.filter((r) => r.status === "pending" || r.status === "reviewing").length;

    const courseMap = new Map((coursesData || []).map((c: any) => [c.id, c.title || c.language_code || "Course"]));
    const totalLessons = (lessonsData || []).length;
    const completedLessonProgress = (progressData || []).length;

    const modLessonCount = new Map<string, number>();
    for (const l of lessonsData || []) {
      if ((l as any).module_id) modLessonCount.set((l as any).module_id, (modLessonCount.get((l as any).module_id) || 0) + 1);
    }
    const modCompletedCount = new Map<string, number>();
    for (const p of progressData || []) {
      if ((p as any).module_id) modCompletedCount.set((p as any).module_id, (modCompletedCount.get((p as any).module_id) || 0) + 1);
    }

    const courseModuleMetrics: CourseModuleMetric[] = (modulesData || []).slice(0, 12).map((m: any) => ({
      id: m.id,
      title: m.title || "Module",
      courseTitle: courseMap.get(m.course_id) || "Driving Course",
      lessonCount: modLessonCount.get(m.id) || 0,
      completedLessonsCount: modCompletedCount.get(m.id) || 0,
      isPublished: m.is_published !== false,
    }));

    // 8. Recent Exam Attempts
    const recentAttempts: AdminStats["recentAttempts"] = (recentAttemptRows || []).map((a: any) => {
      const resolved = resolveStudentDisplayName(a.user_id);
      return {
        ...a,
        username: resolved.username,
        full_name: resolved.fullName || resolved.displayName,
        email: resolved.email,
      };
    });

    // 9. Composite System Audit Stream
    const auditStream: SystemAuditItem[] = [];

    // Add recent attempts to stream
    for (const a of (recentAttemptRows || []).slice(0, 5)) {
      const resolved = resolveStudentDisplayName((a as any).user_id);
      const name = resolved.displayName;
      auditStream.push({
        id: `att-${(a as any).id}`,
        type: "exam_completed",
        title: `${name} ${(a as any).status === "completed" ? "completed" : "started"} ${(a as any).category_name || "Exam"}`,
        subtitle: `Scored ${(a as any).score_percentage}% • ${(a as any).duration_seconds > 0 ? `${Math.round((a as any).duration_seconds / 60)} mins` : "In progress"}`,
        timestamp: (a as any).started_at,
        badge: (a as any).score_percentage >= 50 ? `${(a as any).score_percentage}% PASS` : `${(a as any).score_percentage}% FAIL`,
        badgeType: (a as any).score_percentage >= 80 ? "success" : (a as any).score_percentage >= 50 ? "warning" : "neutral",
      });
    }

    // Add recent users to stream
    for (const u of (allUsers || []).slice(0, 4)) {
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

    const payload: AdminStats = {
      stats: {
        totalUsers,
        totalAdmins,
        totalStudents,
        totalDrivers,
        onlineUsers,
        totalCategories: (allCategories || []).length,
        totalQuestions: (allQuestions || []).length,
        totalAttempts: attemptsCountRes.count || 0,
        inProgressAttempts: inProgressCountRes.count || 0,
        passedAttempts: passed,
        failedAttempts: failed,
        averageScore,
        passRate,
        newStudentsThisWeek,
        totalCourses: (coursesData || []).length,
        totalModules: (modulesData || []).length,
        totalLessons,
        completedLessonProgress,
        pendingReports: pendingReportsCount,
        pendingRetakeRequests,
        unverifiedUsers,
        suspendedUsers,
        atRiskCount: atRiskLearners.length,
      },
      recentActivity: {
        categories: recentCategoriesList,
        questions: recentQuestionsList,
        users: recentUsersList,
      },
      weeklyActivity,
      weeklyRegistrations,
      monthlyActivity,
      scoreDistribution,
      categoryMetrics,
      courseModuleMetrics,
      retakeRequests,
      pendingReportsList,
      atRiskLearners,
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
    };

    cachedStatsResult = payload;
    cachedStatsTimestamp = Date.now();

    return {
      success: true,
      data: payload,
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function resolveRetakeRequestAction(
  requestId: string,
  decision: "approved" | "denied",
  adminNote?: string
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();

    const { data: reqRow, error: fetchErr } = await supabase
      .from("exam_retake_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !reqRow) {
      throw new Error("Retake request not found");
    }

    const { error } = await supabase
      .from("exam_retake_requests")
      .update({
        status: decision,
        admin_id: admin.id,
        admin_note: adminNote || (decision === "approved" ? "Approved by administrator" : "Declined by administrator"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    invalidateStatsCache();

    // Notify student automatically
    if (reqRow.user_id) {
      await supabase.from("notifications").insert({
        target_user_id: reqRow.user_id,
        title: decision === "approved" ? "Exam Retake Request Approved" : "Exam Retake Request Update",
        message:
          decision === "approved"
            ? `Your retake request has been approved! ${adminNote ? `Note: ${adminNote}` : "You may now start a new exam attempt."}`
            : `Your exam retake request was reviewed and declined. ${adminNote ? `Reason: ${adminNote}` : ""}`,
        type: decision === "approved" ? "success" : "warning",
        priority: "normal",
        sender_id: admin.id,
        sender_name: admin.email || "Admin",
        data: {},
      });
    }

    return { success: true, data: { id: requestId, status: decision } };
  } catch (error) {
    return handleError(error);
  }
}

export async function resolveUserReportAction(
  reportId: string,
  status: "reviewing" | "resolved" | "dismissed"
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("user_reports")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) throw error;
    invalidateStatsCache();
    return { success: true, data: { id: reportId, status } };
  } catch (error) {
    return handleError(error);
  }
}

export async function toggleUserVerificationAction(
  userId: string,
  verified: boolean
): Promise<ActionResult<{ id: string; verified: boolean }>> {
  try {
    const admin = await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("user_profiles")
      .update({
        provision_verified: verified,
      })
      .eq("id", userId);

    if (error) throw error;
    invalidateStatsCache();

    if (verified) {
      await supabase.from("notifications").insert({
        target_user_id: userId,
        title: "Account Verified",
        message: "Your student profile has been verified by an administrator.",
        type: "success",
        priority: "normal",
        sender_id: admin.id,
        sender_name: admin.email || "Admin",
        data: {},
      });
    }

    return { success: true, data: { id: userId, verified } };
  } catch (error) {
    return handleError(error);
  }
}

export async function toggleUserSuspensionAction(
  userId: string,
  banned: boolean
): Promise<ActionResult<{ id: string; banned: boolean }>> {
  try {
    await requireAdmin();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("user_profiles")
      .update({
        banned,
      })
      .eq("id", userId);

    if (error) throw error;
    invalidateStatsCache();
    return { success: true, data: { id: userId, banned } };
  } catch (error) {
    return handleError(error);
  }
}

