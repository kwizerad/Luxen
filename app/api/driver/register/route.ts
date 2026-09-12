import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      full_name,
      phone,
      training_location,
      training_address,
      bio,
      vehicle_type,
      license_number,
      years_experience,
      certifications,
      languages_spoken,
      specialties,
      training_approach,
      scheduling_mode,
      cancel_enabled,
      cancel_window_minutes,
      price_per_day,
      price_per_week,
      price_per_month,
    } = body;

    if (!training_location || !vehicle_type) {
      return NextResponse.json(
        { error: "Training location and vehicle type are required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You are already registered as a driver" },
        { status: 400 }
      );
    }

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert([{
        id: user.id,
        email: user.email,
        full_name: full_name || user.user_metadata?.full_name || "",
        phone,
        training_location,
        training_address,
        bio,
        vehicle_type,
        license_number,
        years_experience,
        certifications,
        languages_spoken: languages_spoken || [],
        specialties: specialties || [],
        training_approach,
        scheduling_mode: scheduling_mode || "queue",
        cancel_enabled: cancel_enabled ?? true,
        cancel_window_minutes: cancel_window_minutes ?? 30,
        price_per_day,
        price_per_week,
        price_per_month,
        is_active: true,
        is_approved: true,
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.auth.updateUser({
      data: { role: "Driver" },
    });

    await supabase
      .from("user_profiles")
      .update({ role: "Driver" })
      .eq("id", user.id);

    return NextResponse.json({ driver, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register driver.";
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

    const { data: driver, error } = await supabase
      .from("drivers")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ driver, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update driver profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
