import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/permissions";

// Get notifications for current user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's role from user metadata
    const userRole = user.user_metadata?.role || "student";
    const isUserAdmin = isAdmin(user);

    // Build query for notifications targeted to this user
    let query = supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.eq.${user.id},target_role.eq.all`);

    // Add role-specific targeting
    if (userRole !== "Admin" && userRole !== "Teacher") {
      query = query.or("target_role.eq.student");
    }
    if (isUserAdmin) {
      query = query.or("target_role.eq.admin");
    }
    if (userRole === "Teacher") {
      query = query.or("target_role.eq.teacher");
    }

    // Filter out expired notifications
    query = query.or("expires_at.is.null,expires_at.gt.now()");

    // Order by newest first
    query = query.order("created_at", { ascending: false });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get read status for each notification
    const { data: readStatuses, error: readError } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id)
      .in("notification_id", notifications?.map(n => n.id) || []);

    if (readError) {
      console.error("Error fetching read statuses:", readError);
    }

    const readNotificationIds = new Set(readStatuses?.map(r => r.notification_id) || []);

    // Mark notifications as read/unread
    const notificationsWithReadStatus = notifications?.map(n => ({
      ...n,
      is_read: readNotificationIds.has(n.id),
    })) || [];

    // Filter unread only if requested
    const result = unreadOnly
      ? notificationsWithReadStatus.filter(n => !n.is_read)
      : notificationsWithReadStatus;

    return NextResponse.json({
      notifications: result,
      unread_count: notificationsWithReadStatus.filter(n => !n.is_read).length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a new notification (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create notifications
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      message,
      type = "info",
      target_role = "all",
      target_user_id,
      expires_at,
      related_entity_type,
      related_entity_id,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    // Validate target_role
    const validRoles = ["all", "student", "admin", "teacher"];
    if (!validRoles.includes(target_role)) {
      return NextResponse.json(
        { error: `target_role must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Insert notification
    const { data, error } = await supabase
      .from("notifications")
      .insert([{
        title,
        message,
        type,
        target_role,
        target_user_id,
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email,
        expires_at,
        related_entity_type,
        related_entity_id,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification created successfully",
      notification: data,
    });
  } catch (error: any) {
    console.error("Error in POST /api/notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Mark notification as read
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");
    const markAllRead = searchParams.get("markAllRead") === "true";

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (markAllRead) {
      // Get all unread notifications for this user
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .or(`target_user_id.eq.${user.id},target_role.eq.all`)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (!notifications || notifications.length === 0) {
        return NextResponse.json({ success: true, marked_count: 0 });
      }

      // Insert read records for all
      const readRecords = notifications.map(n => ({
        notification_id: n.id,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("notification_reads")
        .upsert(readRecords, { onConflict: "notification_id,user_id" });

      if (error) {
        console.error("Error marking all as read:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        marked_count: notifications.length,
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required or use markAllRead=true" },
        { status: 400 }
      );
    }

    // Mark single notification as read
    const { error } = await supabase
      .from("notification_reads")
      .upsert({
        notification_id: notificationId,
        user_id: user.id,
      }, { onConflict: "notification_id,user_id" });

    if (error) {
      console.error("Error marking notification as read:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    console.error("Error in PUT /api/notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete notification (admin only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("notificationId");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete notifications
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) {
      console.error("Error deleting notification:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
