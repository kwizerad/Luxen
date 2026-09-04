import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driver_id");
    const studentId = searchParams.get("student_id");

    let query = supabase.from("training_logs").select("*");

    if (driverId) {
      query = query.eq("driver_id", driverId);
    } else if (studentId) {
      query = query.eq("student_id", studentId);
    } else {
      const role = user.user_metadata?.role;
      if (role === "Driver") {
        query = query.eq("driver_id", user.id);
      } else {
        query = query.eq("student_id", user.id);
      }
    }

    const { data, error } = await query.order("session_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch training logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      student_id,
      booking_id,
      session_date,
      start_time,
      end_time,
      duration_minutes,
      skills_practiced,
      location,
      notes,
      rating,
    } = body;

    if (!student_id || !session_date) {
      return NextResponse.json(
        { error: "Student ID and session date are required" },
        { status: 400 }
      );
    }

    const { data: log, error } = await supabase
      .from("training_logs")
      .insert([{
        driver_id: user.id,
        student_id,
        booking_id,
        session_date,
        start_time,
        end_time,
        duration_minutes,
        skills_practiced,
        location,
        notes,
        rating,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create training log.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { log_id, ...updateData } = body;

    if (!log_id) {
      return NextResponse.json({ error: "Log ID is required" }, { status: 400 });
    }

    const { data: log, error } = await supabase
      .from("training_logs")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", log_id)
      .eq("driver_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update training log.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
