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

    let query = supabase
      .from("driver_bookings")
      .select("*, drivers(*), students:student_id(id, full_name, username, avatar_url)");

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

    const { data, error } = await query.order("booking_date", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch bookings.";
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
    const { driver_id, application_id, booking_date, start_time, end_time } = body;

    if (!driver_id || !booking_date) {
      return NextResponse.json(
        { error: "Driver ID and booking date are required" },
        { status: 400 }
      );
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("scheduling_mode, cancel_enabled, cancel_window_minutes")
      .eq("id", driver_id)
      .single();

    let queuePosition = null;

    if (driver?.scheduling_mode === "queue") {
      const { count } = await supabase
        .from("driver_bookings")
        .select("*", { count: "exact", head: true })
        .eq("driver_id", driver_id)
        .eq("booking_date", booking_date)
        .eq("status", "booked");

      queuePosition = (count || 0) + 1;
    }

    const { data: booking, error } = await supabase
      .from("driver_bookings")
      .insert([{
        driver_id,
        student_id: user.id,
        application_id,
        booking_date,
        start_time,
        end_time,
        queue_position: queuePosition,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ booking, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create booking.";
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
    const { booking_id, action } = body;

    if (!booking_id || !action) {
      return NextResponse.json(
        { error: "Booking ID and action are required" },
        { status: 400 }
      );
    }

    if (action === "cancel") {
      const { data: booking } = await supabase
        .from("driver_bookings")
        .select("*, drivers(cancel_enabled, cancel_window_minutes)")
        .eq("id", booking_id)
        .single();

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const driver = booking.drivers;
      if (driver?.cancel_enabled === false) {
        return NextResponse.json(
          { error: "Cancellation is not enabled for this driver" },
          { status: 400 }
        );
      }

      const cancelWindow = driver?.cancel_window_minutes || 30;
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time || "00:00"}`);
      const now = new Date();
      const diffMinutes = (bookingDateTime.getTime() - now.getTime()) / 60000;

      if (diffMinutes < cancelWindow) {
        return NextResponse.json(
          { error: `Cancellation window has passed. Must cancel at least ${cancelWindow} minutes before the booking.` },
          { status: 400 }
        );
      }

      const { data: updated, error } = await supabase
        .from("driver_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        })
        .eq("id", booking_id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ booking: updated, status: "success" });
    }

    if (action === "complete" || action === "no_show") {
      const status = action === "complete" ? "completed" : "no_show";

      const { data: updated, error } = await supabase
        .from("driver_bookings")
        .update({ status })
        .eq("id", booking_id)
        .eq("driver_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ booking: updated, status: "success" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
