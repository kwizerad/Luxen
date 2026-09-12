"use client";

import { createClient } from "./client";
import type {
  Driver,
  DriverPlan,
  DriverApplication,
  DriverBooking,
  TrainingLog,
  ExamRequestPayment,
  DriverRating,
  UserReport,
  ReportComment,
  ChatConversation,
  ChatMessage,
  DurationType,
  ApplicationStatus,
  BookingStatus,
  ExamRequestType,
  ReportType,
  ReportStatus,
  ReportAction,
  SchedulingMode,
} from "@/lib/database.types";

async function getAuthUser() {
  const supabase = createClient();
  try {
    const result = await supabase.auth.getUser();
    return result.data.user;
  } catch (error: any) {
    if (error?.message?.includes("lock") || error?.message?.includes("Lock")) {
      throw new Error("Auth temporarily unavailable, please try again");
    }
    throw error;
  }
}

// ============================================================================
// DRIVER PROFILE QUERIES
// ============================================================================

export async function getActiveDrivers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("is_active", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { drivers: (data || []) as Driver[] };
}

export async function getDriverById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return { driver: data as Driver };
}

export async function getDriverByUserId(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return { driver: data as Driver | null };
}

export async function createDriverProfile(data: Partial<Driver>) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: driver, error } = await supabase
    .from("drivers")
    .insert([{ ...data, id: user.id, email: user.email }])
    .select()
    .single();

  if (error) throw error;

  await supabase.auth.updateUser({ data: { role: "Driver" } });

  return { driver: driver as Driver };
}

export async function updateDriverProfile(id: string, data: Partial<Driver>) {
  const supabase = createClient();
  const { data: driver, error } = await supabase
    .from("drivers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { driver: driver as Driver };
}

export async function getAllDrivers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { drivers: (data || []) as Driver[] };
}

// ============================================================================
// DRIVER PLANS QUERIES
// ============================================================================

export async function getDriverPlans(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_plans")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { plans: (data || []) as DriverPlan[] };
}

export async function getActiveDriverPlans(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_plans")
    .select("*")
    .eq("driver_id", driverId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { plans: (data || []) as DriverPlan[] };
}

export async function createDriverPlan(data: Omit<DriverPlan, "id" | "created_at" | "updated_at">) {
  const supabase = createClient();
  const { data: plan, error } = await supabase
    .from("driver_plans")
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return { plan: plan as DriverPlan };
}

export async function updateDriverPlan(id: string, data: Partial<DriverPlan>) {
  const supabase = createClient();
  const { data: plan, error } = await supabase
    .from("driver_plans")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { plan: plan as DriverPlan };
}

export async function deleteDriverPlan(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("driver_plans").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}

// ============================================================================
// DRIVER APPLICATIONS QUERIES
// ============================================================================

export async function getDriverApplications(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_applications")
    .select("*, driver_plans(*)")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { applications: data || [] };
}

export async function getStudentApplications(studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_applications")
    .select("*, driver_plans(*), drivers(*)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { applications: data || [] };
}

export async function createApplication(data: {
  driver_id: string;
  plan_id?: string;
  duration_type: DurationType;
  duration_count: number;
  total_price?: number;
  student_note?: string;
}) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: app, error } = await supabase
    .from("driver_applications")
    .insert([{ ...data, student_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { application: app as DriverApplication };
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  driverNote?: string
) {
  const supabase = createClient();
  const { data: app, error } = await supabase
    .from("driver_applications")
    .update({ status, driver_note: driverNote, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { application: app as DriverApplication };
}

// ============================================================================
// DRIVER BOOKINGS QUERIES
// ============================================================================

export async function getDriverBookings(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_bookings")
    .select("*")
    .eq("driver_id", driverId)
    .order("booking_date", { ascending: true });

  if (error) throw error;
  return { bookings: (data || []) as DriverBooking[] };
}

export async function getStudentBookings(studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_bookings")
    .select("*, drivers(*)")
    .eq("student_id", studentId)
    .order("booking_date", { ascending: true });

  if (error) throw error;
  return { bookings: data || [] };
}

export async function createBooking(data: {
  driver_id: string;
  application_id?: string;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  queue_position?: number;
}) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: booking, error } = await supabase
    .from("driver_bookings")
    .insert([{ ...data, student_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { booking: booking as DriverBooking };
}

export async function cancelBooking(bookingId: string) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: booking, error } = await supabase
    .from("driver_bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  return { booking: booking as DriverBooking };
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const supabase = createClient();
  const { data: booking, error } = await supabase
    .from("driver_bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  return { booking: booking as DriverBooking };
}

// ============================================================================
// TRAINING LOGS QUERIES
// ============================================================================

export async function getTrainingLogs(driverId?: string, studentId?: string) {
  const supabase = createClient();
  let query = supabase.from("training_logs").select("*");

  if (driverId) query = query.eq("driver_id", driverId);
  if (studentId) query = query.eq("student_id", studentId);

  const { data, error } = await query.order("session_date", { ascending: false });

  if (error) throw error;
  return { logs: (data || []) as TrainingLog[] };
}

export async function getStudentTrainingLogs(studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*, drivers(*)")
    .eq("student_id", studentId)
    .order("session_date", { ascending: false });

  if (error) throw error;
  return { logs: data || [] };
}

export async function createTrainingLog(data: {
  student_id: string;
  booking_id?: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  skills_practiced?: string;
  location?: string;
  notes?: string;
  rating?: number;
}) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: log, error } = await supabase
    .from("training_logs")
    .insert([{ ...data, driver_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { log: log as TrainingLog };
}

export async function updateTrainingLog(id: string, data: Partial<TrainingLog>) {
  const supabase = createClient();
  const { data: log, error } = await supabase
    .from("training_logs")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return { log: log as TrainingLog };
}

// ============================================================================
// EXAM REQUEST PAYMENTS QUERIES
// ============================================================================

export async function getExamRequestPayments(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("exam_request_payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { payments: (data || []) as ExamRequestPayment[] };
}

export async function createExamRequestPayment(data: {
  exam_type: ExamRequestType;
  national_id: string;
  amount: number;
  irembo_verified?: boolean;
  irembo_response?: Record<string, unknown>;
}) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: payment, error } = await supabase
    .from("exam_request_payments")
    .insert([{ ...data, user_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { payment: payment as ExamRequestPayment };
}

// ============================================================================
// DRIVER RATINGS QUERIES
// ============================================================================

export async function getDriverRatings(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_ratings")
    .select("*, reporter:student_id(id, full_name, username, avatar_url)")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { ratings: data || [] };
}

export async function getDriverAverageRating(driverId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_ratings")
    .select("rating")
    .eq("driver_id", driverId);

  if (error) throw error;

  const ratings = (data || []).map((r: any) => r.rating);
  const count = ratings.length;
  const average = count > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / count : 0;

  return { average: Math.round(average * 10) / 10, count };
}

export async function createOrUpdateRating(driverId: string, rating: number, review?: string) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("driver_ratings")
    .select("id")
    .eq("driver_id", driverId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("driver_ratings")
      .update({ rating, review, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return { rating: updated as DriverRating };
  }

  const { data: created, error } = await supabase
    .from("driver_ratings")
    .insert([{ driver_id: driverId, student_id: user.id, rating, review }])
    .select()
    .single();
  if (error) throw error;
  return { rating: created as DriverRating };
}

export async function getStudentRatingForDriver(driverId: string, studentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("driver_ratings")
    .select("*")
    .eq("driver_id", driverId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;
  return { rating: data as DriverRating | null };
}

// ============================================================================
// USER REPORTS QUERIES
// ============================================================================

export async function getUserReports(userId: string) {
  const supabase = createClient();
  const { data: filed, error: filedError } = await supabase
    .from("user_reports")
    .select("*, reported:reported_id(id, full_name, username, avatar_url)")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  if (filedError) throw filedError;

  const { data: against, error: againstError } = await supabase
    .from("user_reports")
    .select("*, reporter:reporter_id(id, full_name, username, avatar_url)")
    .eq("reported_id", userId)
    .order("created_at", { ascending: false });

  if (againstError) throw againstError;

  return { filed: filed || [], against: against || [] };
}

export async function createReport(data: {
  reported_id: string;
  report_type: ReportType;
  description: string;
}) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: report, error } = await supabase
    .from("user_reports")
    .insert([{ ...data, reporter_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { report: report as UserReport };
}

export async function getAllReports() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_reports")
    .select("*, reporter:reporter_id(id, full_name, username, avatar_url), reported:reported_id(id, full_name, username, avatar_url)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return { reports: data || [] };
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNote?: string,
  actionTaken?: ReportAction
) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    admin_id: user.id,
  };
  if (adminNote !== undefined) updateData.admin_note = adminNote;
  if (actionTaken !== undefined) updateData.action_taken = actionTaken;

  const { data: report, error } = await supabase
    .from("user_reports")
    .update(updateData)
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;

  if (actionTaken === "warning") {
    await supabase
      .from("user_profiles")
      .update({ warned: true, warned_at: new Date().toISOString() })
      .eq("id", report.reported_id);
  } else if (actionTaken === "suspension") {
    await supabase
      .from("user_profiles")
      .update({ banned: true })
      .eq("id", report.reported_id);
  }

  return { report: report as UserReport };
}

// ============================================================================
// REPORT COMMENTS QUERIES
// ============================================================================

export async function getReportComments(reportId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("report_comments")
    .select("*, user:user_id(id, full_name, username, avatar_url)")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return { comments: (data || []) as (ReportComment & { user?: any })[] };
}

export async function createReportComment(reportId: string, comment: string, isAdmin: boolean = false) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: created, error } = await supabase
    .from("report_comments")
    .insert([{ report_id: reportId, user_id: user.id, comment, is_admin: isAdmin }])
    .select()
    .single();

  if (error) throw error;
  return { comment: created as ReportComment };
}

// ============================================================================
// CHAT QUERIES
// ============================================================================

export async function getOrCreateConversation(driverId: string) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("driver_id", driverId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    return { conversation: existing as ChatConversation };
  }

  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert([{ driver_id: driverId, student_id: user.id }])
    .select()
    .single();

  if (error) throw error;
  return { conversation: created as ChatConversation };
}

export async function getConversations() {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: asDriver, error: driverErr } = await supabase
    .from("chat_conversations")
    .select("*, student:student_id(id, full_name, username, avatar_url)")
    .eq("driver_id", user.id)
    .order("last_message_at", { ascending: false });

  if (driverErr) throw driverErr;

  const { data: asStudent, error: studentErr } = await supabase
    .from("chat_conversations")
    .select("*, driver:driver_id(id, full_name, username, avatar_url)")
    .eq("student_id", user.id)
    .order("last_message_at", { ascending: false });

  if (studentErr) throw studentErr;

  const all = [
    ...(asDriver || []).map((c: any) => ({ ...c, other_party: c.student, role: "driver" })),
    ...(asStudent || []).map((c: any) => ({ ...c, other_party: c.driver, role: "student" })),
  ].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const conversationsWithUnread = await Promise.all(
    all.map(async (conv: any) => {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      const { data: lastMsg } = await supabase
        .from("chat_messages")
        .select("message, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...conv,
        unread_count: count || 0,
        last_message: lastMsg?.message || null,
        last_message_time: lastMsg?.created_at || conv.last_message_at,
      };
    })
  );

  return { conversations: conversationsWithUnread };
}

export async function getChatMessages(conversationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) throw error;
  return { messages: (data || []) as ChatMessage[] };
}

export async function sendChatMessage(conversationId: string, message: string) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: msg, error: msgError } = await supabase
    .from("chat_messages")
    .insert([{ conversation_id: conversationId, sender_id: user.id, message }])
    .select()
    .single();

  if (msgError) throw msgError;

  await supabase
    .from("chat_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return { message: msg as ChatMessage };
}

export async function markMessagesRead(conversationId: string) {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("chat_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) throw error;
  return { success: true };
}

export async function getUnreadChatCount() {
  const supabase = createClient();
  const user = await getAuthUser();
  if (!user) return { count: 0 };

  const { data: asDriver } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("driver_id", user.id);

  const { data: asStudent } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("student_id", user.id);

  const conversationIds = [
    ...(asDriver || []).map((c: any) => c.id),
    ...(asStudent || []).map((c: any) => c.id),
  ];

  if (conversationIds.length === 0) return { count: 0 };

  const { count, error } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) return { count: 0 };
  return { count: count || 0 };
}
