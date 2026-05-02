import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/permissions";

// Get exam limits for a user (or all users if admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If userId provided, check permissions
    if (userId) {
      // Only admins can view other users' limits
      if (userId !== user.id && !isAdmin(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { data: limit, error } = await supabase
        .from("user_exam_limits")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get today's attempts count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: attemptsToday, error: countError } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("started_at", today.toISOString())
        .lt("started_at", tomorrow.toISOString());

      if (countError) {
        console.error("Error counting attempts:", countError);
      }

      const dailyLimit = limit?.daily_limit ?? 5;
      const remaining = Math.max(0, dailyLimit - (attemptsToday || 0));

      return NextResponse.json({
        user_id: userId,
        daily_limit: dailyLimit,
        attempts_today: attemptsToday || 0,
        remaining_attempts: remaining,
        limit_exists: !!limit,
      });
    }

    // If no userId and admin, return all limits
    if (isAdmin(user)) {
      const { data: limits, error } = await supabase
        .from("user_exam_limits")
        .select("*");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ limits: limits || [] });
    }

    // Return current user's limit
    const { data: limit, error } = await supabase
      .from("user_exam_limits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get today's attempts count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count: attemptsToday, error: countError } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", today.toISOString())
      .lt("started_at", tomorrow.toISOString());

    const dailyLimit = limit?.daily_limit ?? 5;
    const remaining = Math.max(0, dailyLimit - (attemptsToday || 0));

    return NextResponse.json({
      user_id: user.id,
      daily_limit: dailyLimit,
      attempts_today: attemptsToday || 0,
      remaining_attempts: remaining,
      limit_exists: !!limit,
    });
  } catch (error: any) {
    console.error("Error in GET /api/exam/limits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Set or update exam limit for a user (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can set limits
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, daily_limit } = body;

    if (!user_id || typeof daily_limit !== "number") {
      return NextResponse.json(
        { error: "user_id and daily_limit are required" },
        { status: 400 }
      );
    }

    if (daily_limit < 1 || daily_limit > 100) {
      return NextResponse.json(
        { error: "daily_limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Upsert the limit (insert or update)
    const { data, error } = await supabase
      .from("user_exam_limits")
      .upsert({
        user_id,
        daily_limit,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error setting exam limit:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Exam limit updated successfully",
      limit: data,
    });
  } catch (error: any) {
    console.error("Error in POST /api/exam/limits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete exam limit (reset to default, admin only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete limits
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_exam_limits")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting exam limit:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Exam limit removed. User will use default limit (5).",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/exam/limits:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
