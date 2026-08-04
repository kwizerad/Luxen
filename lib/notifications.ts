"use client";

import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/permissions";

const supabase = createClient();

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "urgent" | "normal" | "low";
  created_at: string;
  is_read: boolean;
  sender_name?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  target_user_id?: string;
  target_role?: string;
}

async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getNotifications(unreadOnly = false, limit = 50) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const userIsAdmin = isAdmin(user);

  const orConditions = [
    `target_user_id.eq.${user.id}`,
    "target_role.eq.all",
    ...(userIsAdmin ? ["target_role.eq.admin"] : ["target_role.eq.student"]),
  ];

  const targetFilter = orConditions.join(",");

  let query = supabase
    .from("notifications")
    .select("*")
    .or(targetFilter)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: notifications, error } = await query;
  if (error) throw error;

  let readIds = new Set<string>();

  if (notifications && notifications.length > 0) {
    const { data: readStatuses, error: readError } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id)
      .in(
        "notification_id",
        notifications.map((n: { id: string }) => n.id)
      );

    if (readError) {
      console.error("Error fetching read statuses:", readError);
    }

    readIds = new Set<string>(readStatuses?.map((r: { notification_id: string }) => r.notification_id) || []);
  }

  const withReadStatus =
    notifications?.map((n: { id: string } & Record<string, unknown>) => ({
      ...n,
      is_read: readIds.has(n.id),
    })) || [];

  const result = unreadOnly
    ? withReadStatus.filter((n: { is_read: boolean }) => !n.is_read)
    : withReadStatus;

  return {
    notifications: result as Notification[],
    unread_count: withReadStatus.filter((n: { is_read: boolean }) => !n.is_read).length,
  };
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      {
        notification_id: notificationId,
        user_id: user.id,
      },
      { onConflict: "notification_id,user_id" }
    );

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id")
    .or(`target_user_id.eq.${user.id},target_role.eq.all`);

  if (!notifications || notifications.length === 0) {
    return { success: true, marked_count: 0 };
  }

  const readRecords = notifications.map((n: { id: string }) => ({
    notification_id: n.id,
    user_id: user.id,
  }));

  const { error } = await supabase
    .from("notification_reads")
    .upsert(readRecords, { onConflict: "notification_id,user_id" });

  if (error) throw error;

  return { success: true, marked_count: notifications.length };
}

export async function deleteNotification(notificationId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  if (!isAdmin(user)) throw new Error("Admin access required");

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}
