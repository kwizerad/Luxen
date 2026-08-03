import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const userIsAdmin = isAdmin(user);

    const orConditions = [
      `target_user_id.eq.${user.id}`,
      "target_role.eq.all",
      ...(userIsAdmin ? ["target_role.eq.admin"] : ["target_role.eq.student"]),
    ];

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`or(${orConditions.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const { data: readStatuses, error: readError } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", user.id)
      .in(
        "notification_id",
        notifications?.map((n: { id: string }) => n.id) || []
      );

    if (readError) {
      console.error("Error fetching read statuses:", readError);
    }

    const readIds = new Set(readStatuses?.map((r) => r.notification_id) || []);

    const enriched =
      notifications?.map((n: { id: string } & Record<string, unknown>) => ({
        ...n,
        is_read: readIds.has(n.id),
      })) || [];

    return NextResponse.json({
      notifications: enriched,
      unread_count: enriched.filter((n: { is_read: boolean }) => !n.is_read).length,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      type = "info",
      title,
      message,
      data: notificationData,
      target_user_id,
      target_role = target_user_id ? undefined : "all",
      priority = "normal",
      action_url,
      related_entity_type,
      related_entity_id,
      expires_at,
    } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build a single notification row (broadcasts use target_role)
    const insertData: Record<string, unknown> = {
      type,
      title,
      message,
      data: notificationData || {},
      sender_id: user.id,
      sender_name: user.user_metadata?.full_name || user.email,
      priority,
      action_url,
      related_entity_type,
      related_entity_id,
      expires_at,
    };

    if (target_user_id) {
      insertData.target_user_id = target_user_id;
    } else {
      insertData.target_role = target_role;
    }

    const { data: notification, error } = await adminSupabase
      .from("notifications")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}