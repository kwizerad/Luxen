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
    const role = searchParams.get("role");
    const driverId = searchParams.get("driver_id");
    const studentId = searchParams.get("student_id");

    let query = supabase
      .from("driver_applications")
      .select("*, driver_plans(*), drivers(*), students:student_id(id, full_name, username, avatar_url)");

    if (driverId) {
      query = query.eq("driver_id", driverId);
    } else if (studentId) {
      query = query.eq("student_id", studentId);
    } else {
      const userRole = role || user.user_metadata?.role;
      if (userRole === "Driver") {
        query = query.eq("driver_id", user.id);
      } else {
        query = query.eq("student_id", user.id);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ applications: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch applications.";
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
    const { driver_id, plan_id, duration_type, duration_count, total_price, student_note } = body;

    if (!driver_id || !duration_type) {
      return NextResponse.json(
        { error: "Driver ID and duration type are required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("driver_applications")
      .select("id")
      .eq("driver_id", driver_id)
      .eq("student_id", user.id)
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active application with this driver" },
        { status: 400 }
      );
    }

    const { data: app, error } = await supabase
      .from("driver_applications")
      .insert([{
        driver_id,
        student_id: user.id,
        plan_id,
        duration_type,
        duration_count: duration_count || 1,
        total_price,
        student_note,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ application: app, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create application.";
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
    const { application_id, status, driver_note } = body;

    if (!application_id || !status) {
      return NextResponse.json(
        { error: "Application ID and status are required" },
        { status: 400 }
      );
    }

    const { data: app, error } = await supabase
      .from("driver_applications")
      .update({
        status,
        driver_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application_id)
      .eq("driver_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ application: app, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
