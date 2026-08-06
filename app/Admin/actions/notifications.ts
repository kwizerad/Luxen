"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/lib/database.types";

interface SendNotificationInput {
  title: string;
  message: string;
  type?: string;
  priority?: "urgent" | "normal" | "low";
  target_user_id?: string;
  target_role?: "all" | "student" | "admin";
  action_url?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  expires_at?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const role = user.user_metadata?.role || user.user_metadata?.["role"];
  const email = user.email || "";
  if (role !== "Admin" && email.toLowerCase() !== "navo@admin.jn") {
    throw new Error("Admin access required");
  }
  return user;
}

export async function sendNotificationToUser(
  targetUserId: string,
  input: Omit<SendNotificationInput, "target_role" | "target_user_id">
) {
  const adminUser = await requireAdmin();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("notifications")
    .insert({
      target_user_id: targetUserId,
      title: input.title,
      message: input.message,
      type: input.type || "info",
      priority: input.priority || "normal",
      sender_id: adminUser.id,
      sender_name: adminUser.user_metadata?.full_name || adminUser.email,
      action_url: input.action_url,
      related_entity_type: input.related_entity_type,
      related_entity_id: input.related_entity_id,
      expires_at: input.expires_at,
      data: {},
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, notification: data };
}

export async function sendNotificationToRole(
  targetRole: "all" | "student" | "admin",
  input: Omit<SendNotificationInput, "target_role" | "target_user_id">
) {
  const adminUser = await requireAdmin();
  const adminSupabase = createAdminClient();

  if (targetRole === "all") {
    const { data, error } = await adminSupabase
      .from("notifications")
      .insert({
        target_role: "all",
        title: input.title,
        message: input.message,
        type: input.type || "info",
        priority: input.priority || "normal",
        sender_id: adminUser.id,
        sender_name: adminUser.user_metadata?.full_name || adminUser.email,
        action_url: input.action_url,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
        expires_at: input.expires_at,
        data: {},
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, count: 1, notification: data };
  }

  // For role-specific broadcasts, create a single row with target_role.
  // The client filters by role; this avoids duplicating messages.
  const { data, error } = await adminSupabase
    .from("notifications")
    .insert({
      target_role: targetRole,
      title: input.title,
      message: input.message,
      type: input.type || "info",
      priority: input.priority || "normal",
      sender_id: adminUser.id,
      sender_name: adminUser.user_metadata?.full_name || adminUser.email,
      action_url: input.action_url,
      related_entity_type: input.related_entity_type,
      related_entity_id: input.related_entity_id,
      expires_at: input.expires_at,
      data: {},
    })
    .select()
    .single();

  if (error) throw error;

  // Count recipients for feedback
  const { count } = await adminSupabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", targetRole === "student" ? "Student" : "Admin");

  return { success: true, count: count || 0, notification: data };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      {
        notification_id: notificationId,
        user_id: userId,
      },
      { onConflict: "notification_id,user_id" }
    );

  if (error) throw error;
  return { success: true };
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = createAdminClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id")
    .or(`target_user_id.eq.${userId},target_role.eq.all`)
    .or("expires_at.is.null,expires_at.gt.now()");

  if (!notifications || notifications.length === 0) {
    return { success: true, marked_count: 0 };
  }

  const readRecords = notifications.map((n: { id: string }) => ({
    notification_id: n.id,
    user_id: userId,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(readRecords, { onConflict: "notification_id,user_id" });

  if (error) throw error;

  return { success: true, marked_count: notifications.length };
}

export async function deleteNotification(notificationId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
  return { success: true };
}

export async function sendNotificationToMultipleUsers(
  userIds: string[],
  input: Omit<SendNotificationInput, "target_role" | "target_user_id">
) {
  const adminUser = await requireAdmin();
  const adminSupabase = createAdminClient();

  if (!userIds.length) {
    throw new Error("At least one recipient is required");
  }

  const rows = userIds.map((userId) => ({
    target_user_id: userId,
    title: input.title,
    message: input.message,
    type: input.type || "info",
    priority: input.priority || "normal",
    sender_id: adminUser.id,
    sender_name: adminUser.user_metadata?.full_name || adminUser.email,
    action_url: input.action_url,
    related_entity_type: input.related_entity_type,
    related_entity_id: input.related_entity_id,
    expires_at: input.expires_at,
    data: {},
  }));

  const { data, error } = await adminSupabase
    .from("notifications")
    .insert(rows)
    .select();

  if (error) throw error;
  return { success: true, count: data?.length || userIds.length };
}

export async function getStudentsForNotification() {
  const supabase = await createClient();
  await requireAdmin();
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("user_profiles")
    .select("id, email, full_name, username")
    .eq("role", "Student")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
