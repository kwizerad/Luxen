import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notification } from "@/lib/database.types";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('Fetching notifications for user:', user.id);

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Query notifications where target_user_id matches current user OR target_role applies
    let query = supabase
      .from("notifications")
      .select("*")
      .or(`target_user_id.eq.${user.id},target_role.eq.all`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }

    console.log('Notifications fetched:', notifications?.length || 0);

    return NextResponse.json({ 
      notifications: notifications || [],
      unread_count: notifications?.filter(n => !n.is_read).length || 0
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
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, data: notificationData, target_user_id, target_role } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log('Creating notification:', { type, title, target_role, target_user_id });

    // If target_role is 'student', get all students and create individual notifications
    if (target_role === 'student') {
      // Get all users from user_profiles table instead of auth
      const { data: profiles, error: profilesError } = await adminSupabase
        .from("user_profiles")
        .select("user_id, role")
        .eq("role", "student");
      
      if (profilesError) {
        console.error("Error fetching students:", profilesError);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
      }

      console.log(`Creating notifications for ${profiles?.length || 0} students`);

      // Create notification for each student
      const notifications = [];
      for (const profile of profiles || []) {
        const { data: notification, error } = await adminSupabase
          .from("notifications")
          .insert({
            target_user_id: profile.user_id,
            type,
            title,
            message,
            data: notificationData || {},
            sender_id: user.id,
            sender_name: user.user_metadata?.full_name || user.email,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating notification for user:", profile.user_id, error);
        } else {
          notifications.push(notification);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Created ${notifications.length} notifications`,
        count: notifications.length 
      }, { status: 201 });
    }

    // If target_user_id is provided, create notification for specific user
    if (target_user_id) {
      const { data: notification, error } = await adminSupabase
        .from("notifications")
        .insert({
          target_user_id,
          type,
          title,
          message,
          data: notificationData || {},
          sender_id: user.id,
          sender_name: user.user_metadata?.full_name || user.email,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ notification }, { status: 201 });
    }

    // Otherwise, create notification for the current user
    const { data: notification, error } = await adminSupabase
      .from("notifications")
      .insert({
        target_user_id: user.id,
        type,
        title,
        message,
        data: notificationData || {},
        sender_id: user.id,
        sender_name: user.user_metadata?.full_name || user.email,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}