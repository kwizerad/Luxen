import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface UserActionItem {
  id: string;
  category:
    | "exam"
    | "lesson"
    | "module"
    | "challenge"
    | "booking"
    | "application"
    | "report"
    | "payment"
    | "login"
    | "security"
    | "social"
    | "training";
  title: string;
  subtitle?: string;
  status?: string;
  score?: number | null;
  durationSeconds?: number | null;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
}

export interface UserFullReportSummary {
  totalActionsCount: number;
  examsTaken: number;
  examsPassed: number;
  examsFailed: number;
  examPassRate: number;
  totalStudyTimeSeconds: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  challengesJoined: number;
  challengesWon: number;
  bookingsCount: number;
  reportsSubmitted: number;
  totalLogins: number;
  knownDevicesCount: number;
  firstActiveDate: string | null;
  lastActiveDate: string | null;
}

export interface UserFullReportResponse {
  user: {
    id: string;
    email?: string | null;
    username?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    gender?: string | null;
    birthdate?: string | null;
    nationality?: string | null;
    phone?: string | null;
    national_id?: string | null;
    avatar_url?: string | null;
    role?: string | null;
    banned?: boolean;
    created_at?: string | null;
    last_seen?: string | null;
  };
  summary: UserFullReportSummary;
  nationalIdRecords: any[];
  actionsTimeline: UserActionItem[];
  actionsByCategory: {
    exams: UserActionItem[];
    lessons: UserActionItem[];
    challenges: UserActionItem[];
    bookings: UserActionItem[];
    reports: UserActionItem[];
    logins: UserActionItem[];
    security: UserActionItem[];
  };
  devices: any[];
  loginHistory: any[];
  moduleProgress: any[];
  lessonProgress: any[];
  auditLogs: any[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || searchParams.get("user_id");
    const nationalId = searchParams.get("nationalId") || searchParams.get("national_id");

    if (!userId && !nationalId) {
      return NextResponse.json(
        { error: "A valid userId or nationalId is required to generate the user report." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch user profile
    let userProfile: any = null;
    if (userId && !userId.startsWith("manual-") && !userId.startsWith("national-id-")) {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        userProfile = data;
      }
    }

    if (!userProfile && nationalId) {
      const cleanId = String(nationalId).replace(/\D/g, "").slice(0, 16);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("national_id", cleanId)
        .maybeSingle();

      if (!error && data) {
        userProfile = data;
      }
    }

    const resolvedUserId = userProfile?.id || (userId?.startsWith("manual-") || userId?.startsWith("national-id-") ? null : userId);
    const resolvedNationalId = userProfile?.national_id || nationalId || null;

    // 2. Concurrently fetch all activity across every table
    const [
      nationalIdRecsRes,
      examAttemptsRes,
      moduleExamAttemptsRes,
      lessonProgressRes,
      moduleProgressRes,
      challengesRes,
      bookingsRes,
      applicationsRes,
      ratingsRes,
      trainingLogsRes,
      reportsRes,
      retakeRequestsRes,
      loginsRes,
      devicesRes,
      auditLogsRes,
      chatMessagesRes,
      classmatesRes,
    ] = await Promise.allSettled([
      // National ID records
      resolvedUserId || resolvedNationalId
        ? supabase
            .from("national_id_records")
            .select("*")
            .or(
              [
                resolvedUserId ? `user_id.eq.${resolvedUserId}` : null,
                resolvedUserId ? `verified_user_id.eq.${resolvedUserId}` : null,
                resolvedNationalId ? `national_id.eq.${resolvedNationalId}` : null,
              ]
                .filter(Boolean)
                .join(",")
            )
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Exam attempts
      resolvedUserId
        ? supabase
            .from("exam_attempts")
            .select("id, category_name, exam_id, score_percentage, status, started_at, completed_at, total_questions, correct_answers, time_spent_seconds, metadata")
            .eq("user_id", resolvedUserId)
            .order("started_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),

      // Module exam attempts
      resolvedUserId
        ? supabase
            .from("module_exam_attempts")
            .select("id, module_id, module_title, exam_type, score_percentage, status, started_at, completed_at, total_questions, correct_answers, time_spent_seconds")
            .eq("user_id", resolvedUserId)
            .order("started_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),

      // Student lesson progress
      resolvedUserId
        ? supabase
            .from("student_lesson_progress")
            .select("*, course_lessons(title), course_modules(title)")
            .eq("user_id", resolvedUserId)
            .order("updated_at", { ascending: false })
            .limit(150)
        : Promise.resolve({ data: [] }),

      // Student module progress
      resolvedUserId
        ? supabase
            .from("student_module_progress")
            .select("*, course_modules(title)")
            .eq("user_id", resolvedUserId)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Challenge participants
      resolvedUserId
        ? supabase
            .from("exam_challenge_participants")
            .select("*, exam_challenges(title, category_name, room_code, status, max_participants, winner_id, created_at)")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),

      // Driver bookings
      resolvedUserId
        ? supabase
            .from("driver_bookings")
            .select("*, drivers(full_name, phone_number, vehicle_type)")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),

      // Driver applications
      resolvedUserId
        ? supabase
            .from("driver_applications")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Driver ratings given
      resolvedUserId
        ? supabase
            .from("driver_ratings")
            .select("*, drivers(full_name)")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Training logs
      resolvedUserId
        ? supabase
            .from("training_logs")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // User reports submitted
      resolvedUserId
        ? supabase
            .from("user_reports")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Retake requests
      resolvedUserId
        ? supabase
            .from("exam_retake_requests")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Login history
      resolvedUserId
        ? supabase
            .from("login_history")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("login_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),

      // User devices
      resolvedUserId
        ? supabase
            .from("user_devices")
            .select("*")
            .eq("user_id", resolvedUserId)
            .order("last_used_at", { ascending: false })
        : Promise.resolve({ data: [] }),

      // Audit logs & Security events
      resolvedUserId
        ? supabase
            .from("admin_audit_logs")
            .select("*")
            .or(`target_user_id.eq.${resolvedUserId},details.ilike.%${resolvedUserId}%`)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),

      // Chat messages sent
      resolvedUserId
        ? supabase
            .from("chat_messages")
            .select("id, conversation_id, content, created_at")
            .eq("sender_id", resolvedUserId)
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] }),

      // Classmate requests
      resolvedUserId
        ? supabase
            .from("classmate_requests")
            .select("*")
            .or(`requester_id.eq.${resolvedUserId},receiver_id.eq.${resolvedUserId}`)
            .order("created_at", { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] }),
    ]);

    const nationalIdRecords = nationalIdRecsRes.status === "fulfilled" ? nationalIdRecsRes.value.data || [] : [];
    const examAttempts = examAttemptsRes.status === "fulfilled" ? examAttemptsRes.value.data || [] : [];
    const moduleExamAttempts = moduleExamAttemptsRes.status === "fulfilled" ? moduleExamAttemptsRes.value.data || [] : [];
    const lessonProgress = lessonProgressRes.status === "fulfilled" ? lessonProgressRes.value.data || [] : [];
    const moduleProgress = moduleProgressRes.status === "fulfilled" ? moduleProgressRes.value.data || [] : [];
    const challenges = challengesRes.status === "fulfilled" ? challengesRes.value.data || [] : [];
    const bookings = bookingsRes.status === "fulfilled" ? bookingsRes.value.data || [] : [];
    const applications = applicationsRes.status === "fulfilled" ? applicationsRes.value.data || [] : [];
    const ratings = ratingsRes.status === "fulfilled" ? ratingsRes.value.data || [] : [];
    const trainingLogs = trainingLogsRes.status === "fulfilled" ? trainingLogsRes.value.data || [] : [];
    const reports = reportsRes.status === "fulfilled" ? reportsRes.value.data || [] : [];
    const retakeRequests = retakeRequestsRes.status === "fulfilled" ? retakeRequestsRes.value.data || [] : [];
    const loginHistory = loginsRes.status === "fulfilled" ? loginsRes.value.data || [] : [];
    const devices = devicesRes.status === "fulfilled" ? devicesRes.value.data || [] : [];
    const auditLogs = auditLogsRes.status === "fulfilled" ? auditLogsRes.value.data || [] : [];
    const chatMessages = chatMessagesRes.status === "fulfilled" ? chatMessagesRes.value.data || [] : [];
    const classmateRequests = classmatesRes.status === "fulfilled" ? classmatesRes.value.data || [] : [];

    // 3. Assemble Unified Actions Timeline
    const actions: UserActionItem[] = [];

    // Category Exam Attempts
    for (const a of examAttempts) {
      const isPassed = a.status === "passed" || (a.score_percentage != null && a.score_percentage >= 60);
      actions.push({
        id: `exam-${a.id}`,
        category: "exam",
        title: `Standard Quiz: ${a.category_name || "General Driving Exam"}`,
        subtitle: `${a.correct_answers || 0}/${a.total_questions || 20} correct • ${a.score_percentage != null ? `${a.score_percentage}%` : ""}`,
        status: isPassed ? "PASSED" : a.status === "in_progress" ? "IN PROGRESS" : "FAILED",
        score: a.score_percentage,
        durationSeconds: a.time_spent_seconds,
        metadata: {
          categoryName: a.category_name,
          examId: a.exam_id,
          totalQuestions: a.total_questions,
          correctAnswers: a.correct_answers,
        },
        timestamp: a.completed_at || a.started_at,
      });
    }

    // Module Exam Attempts
    for (const m of moduleExamAttempts) {
      const isPassed = m.status === "passed" || (m.score_percentage != null && m.score_percentage >= 60);
      actions.push({
        id: `mod-exam-${m.id}`,
        category: "exam",
        title: `Module Exam: ${m.module_title || m.exam_type || "Module Assessment"}`,
        subtitle: `${m.correct_answers || 0}/${m.total_questions || 20} correct • ${m.score_percentage != null ? `${m.score_percentage}%` : ""}`,
        status: isPassed ? "PASSED" : m.status === "in_progress" ? "IN PROGRESS" : "FAILED",
        score: m.score_percentage,
        durationSeconds: m.time_spent_seconds,
        metadata: {
          moduleId: m.module_id,
          moduleTitle: m.module_title,
          examType: m.exam_type,
        },
        timestamp: m.completed_at || m.started_at,
      });
    }

    // Lesson Progress & Completions
    for (const lp of lessonProgress) {
      const lessonTitle = (lp.course_lessons as { title?: string })?.title || "Lesson";
      const modTitle = (lp.course_modules as { title?: string })?.title || "Course Module";
      actions.push({
        id: `lesson-${lp.id}`,
        category: "lesson",
        title: lp.completed ? `Completed Lesson: ${lessonTitle}` : `Studied Lesson: ${lessonTitle}`,
        subtitle: `Module: ${modTitle} • Time spent: ${Math.round((lp.time_spent_seconds || 0) / 60)} mins`,
        status: lp.completed ? "COMPLETED" : "STUDYING",
        durationSeconds: lp.time_spent_seconds,
        metadata: {
          lessonId: lp.lesson_id,
          lessonTitle,
          moduleId: lp.module_id,
          moduleTitle: modTitle,
          exceededTimeSeconds: lp.exceeded_time_seconds,
        },
        timestamp: lp.completed_at || lp.updated_at || lp.created_at,
      });
    }

    // Challenge Battles
    for (const c of challenges) {
      const challengeObj = c.exam_challenges as any;
      const isWinner = challengeObj?.winner_id === resolvedUserId || c.is_winner;
      actions.push({
        id: `challenge-${c.id}`,
        category: "challenge",
        title: `Live Exam Battle: ${challengeObj?.title || challengeObj?.category_name || "Multiplayer Challenge"}`,
        subtitle: `Room: ${challengeObj?.room_code || "Battle"} • Score: ${c.score || 0} pts • Rank #${c.rank || 1}`,
        status: isWinner ? "VICTORY" : c.status === "completed" ? "FINISHED" : "PARTICIPATING",
        score: c.score,
        metadata: {
          challengeId: c.challenge_id,
          roomCode: challengeObj?.room_code,
          rank: c.rank,
          score: c.score,
          isWinner,
        },
        timestamp: c.completed_at || c.created_at,
      });
    }

    // Driving Bookings
    for (const b of bookings) {
      const driverObj = b.drivers as any;
      actions.push({
        id: `booking-${b.id}`,
        category: "booking",
        title: `Driving Instructor Booking with ${driverObj?.full_name || "Certified Instructor"}`,
        subtitle: `Date: ${b.session_date || "Scheduled"} • Time: ${b.start_time || "N/A"} (${b.duration_hours || 1}h) • Loc: ${b.pickup_location || "Kigali"}`,
        status: (b.status || "PENDING").toUpperCase(),
        metadata: {
          driverName: driverObj?.full_name,
          vehicleType: driverObj?.vehicle_type,
          sessionDate: b.session_date,
          pickupLocation: b.pickup_location,
          totalPrice: b.total_price,
        },
        timestamp: b.created_at,
      });
    }

    // Driver Applications
    for (const app of applications) {
      actions.push({
        id: `driver-app-${app.id}`,
        category: "application",
        title: `Submitted Driving Instructor Application`,
        subtitle: `License: ${app.license_number || "Verified"} • Experience: ${app.years_experience || 0} yrs • Vehicle: ${app.vehicle_type || "Car"}`,
        status: (app.status || "PENDING").toUpperCase(),
        metadata: app,
        timestamp: app.created_at,
      });
    }

    // Driver Ratings
    for (const r of ratings) {
      actions.push({
        id: `rating-${r.id}`,
        category: "booking",
        title: `Submitted Instructor Review: ${r.rating || 5} Stars`,
        subtitle: r.comment || r.review || "Session feedback provided",
        status: "REVIEWED",
        score: r.rating,
        metadata: r,
        timestamp: r.created_at,
      });
    }

    // Training Logs
    for (const tl of trainingLogs) {
      actions.push({
        id: `training-log-${tl.id}`,
        category: "training",
        title: `Logged Practical Training Session`,
        subtitle: `Topics: ${tl.topics_covered || tl.notes || "In-car road training session"}`,
        status: (tl.status || "COMPLETED").toUpperCase(),
        metadata: tl,
        timestamp: tl.created_at || tl.date,
      });
    }

    // User Reports & Issues
    for (const rep of reports) {
      actions.push({
        id: `report-${rep.id}`,
        category: "report",
        title: `Submitted Issue Report: ${rep.title || rep.category || "Exam Question Issue"}`,
        subtitle: rep.description ? (rep.description.length > 80 ? `${rep.description.slice(0, 80)}...` : rep.description) : undefined,
        status: (rep.status || "OPEN").toUpperCase(),
        metadata: rep,
        timestamp: rep.created_at,
      });
    }

    // Retake Requests
    for (const retake of retakeRequests) {
      actions.push({
        id: `retake-${retake.id}`,
        category: "payment",
        title: `Requested Exam Retake Code`,
        subtitle: `Category: ${retake.category_name || "Driving Category"} • Reason: ${retake.reason || "Preparation"}`,
        status: (retake.status || "REQUESTED").toUpperCase(),
        metadata: retake,
        timestamp: retake.created_at,
      });
    }

    // Logins & Device Sessions
    for (const log of loginHistory) {
      const devName = log.device_name || `${log.browser || "Web Browser"} on ${log.os || "Device"}`;
      actions.push({
        id: `login-${log.id}`,
        category: "login",
        title: `Account Login: ${devName}`,
        subtitle: `IP: ${log.ip_address || "Hidden"} • Location: ${[log.city, log.country].filter(Boolean).join(", ") || "Rwanda"}`,
        status: "SUCCESSFUL",
        ipAddress: log.ip_address,
        deviceInfo: devName,
        metadata: log,
        timestamp: log.login_at || log.created_at,
      });
    }

    // Audit Logs for this User
    for (const audit of auditLogs) {
      actions.push({
        id: `audit-${audit.id}`,
        category: "security",
        title: `Security/Admin Event: ${audit.action || "User Status Modified"}`,
        subtitle: audit.details || (audit.admin_email ? `By Admin: ${audit.admin_email}` : undefined),
        status: "AUDITED",
        metadata: audit,
        timestamp: audit.created_at || audit.timestamp,
      });
    }

    // Chat messages
    for (const chat of chatMessages) {
      actions.push({
        id: `chat-${chat.id}`,
        category: "social",
        title: `Sent Chat Message in Community`,
        subtitle: chat.content ? (chat.content.length > 60 ? `${chat.content.slice(0, 60)}...` : chat.content) : undefined,
        status: "DELIVERED",
        timestamp: chat.created_at,
      });
    }

    // Classmate Requests
    for (const req of classmateRequests) {
      const isSender = req.requester_id === resolvedUserId;
      actions.push({
        id: `classmate-${req.id}`,
        category: "social",
        title: isSender ? `Sent Classmate Connection Request` : `Received Classmate Connection Request`,
        subtitle: `Status: ${req.status || "pending"}`,
        status: (req.status || "PENDING").toUpperCase(),
        timestamp: req.created_at,
      });
    }

    // Sort all actions descending by timestamp
    actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 4. Compute Summary KPIs
    const allExams = [...examAttempts, ...moduleExamAttempts];
    const totalExams = allExams.length;
    const passedExams = allExams.filter((e) => e.status === "passed" || (e.score_percentage != null && e.score_percentage >= 60)).length;
    const failedExams = totalExams - passedExams;
    const examPassRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

    const totalStudyTimeSeconds =
      lessonProgress.reduce((sum: number, lp: any) => sum + (lp.time_spent_seconds || 0), 0) +
      moduleProgress.reduce((sum: number, mp: any) => sum + (mp.time_spent_seconds || 0), 0);

    const lessonsCompletedCount = lessonProgress.filter((l: any) => l.completed).length;
    const modulesCompletedCount = moduleProgress.filter((m: any) => m.exam_passed || m.lessons_completed >= m.total_lessons).length;

    const challengesWonCount = challenges.filter(
      (c: any) => c.is_winner || (c.exam_challenges as any)?.winner_id === resolvedUserId
    ).length;

    const firstActive = actions.length > 0 ? actions[actions.length - 1].timestamp : userProfile?.created_at || null;
    const lastActive = actions.length > 0 ? actions[0].timestamp : userProfile?.last_seen || null;

    const summary: UserFullReportSummary = {
      totalActionsCount: actions.length,
      examsTaken: totalExams,
      examsPassed: passedExams,
      examsFailed: failedExams,
      examPassRate,
      totalStudyTimeSeconds,
      lessonsCompleted: lessonsCompletedCount,
      modulesCompleted: modulesCompletedCount,
      challengesJoined: challenges.length,
      challengesWon: challengesWonCount,
      bookingsCount: bookings.length,
      reportsSubmitted: reports.length,
      totalLogins: loginHistory.length,
      knownDevicesCount: devices.length,
      firstActiveDate: firstActive,
      lastActiveDate: lastActive,
    };

    const responseData: UserFullReportResponse = {
      user: {
        id: resolvedUserId || "unknown",
        email: userProfile?.email || null,
        username: userProfile?.username || null,
        full_name: userProfile?.full_name || null,
        first_name: userProfile?.first_name || null,
        last_name: userProfile?.last_name || null,
        gender: userProfile?.gender || null,
        birthdate: userProfile?.birthdate || null,
        nationality: userProfile?.nationality || "Rwandan",
        phone: userProfile?.phone || null,
        national_id: resolvedNationalId,
        avatar_url: userProfile?.avatar_url || null,
        role: userProfile?.role || "Student",
        banned: userProfile?.banned || false,
        created_at: userProfile?.created_at || null,
        last_seen: userProfile?.last_seen || null,
      },
      summary,
      nationalIdRecords,
      actionsTimeline: actions,
      actionsByCategory: {
        exams: actions.filter((a) => a.category === "exam"),
        lessons: actions.filter((a) => a.category === "lesson" || a.category === "module"),
        challenges: actions.filter((a) => a.category === "challenge"),
        bookings: actions.filter((a) => a.category === "booking"),
        reports: actions.filter((a) => a.category === "report"),
        logins: actions.filter((a) => a.category === "login"),
        security: actions.filter((a) => a.category === "security"),
      },
      devices,
      loginHistory,
      moduleProgress,
      lessonProgress,
      auditLogs,
    };

    return NextResponse.json({
      status: "success",
      data: responseData,
    });
  } catch (error: any) {
    console.error("Error generating user full report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate user full action report." },
      { status: 500 }
    );
  }
}
