import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      email,
      password,
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
      price_per_day,
      price_per_week,
      price_per_month,
    } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Create the auth user with Driver role
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      user_metadata: {
        role: "Driver",
        full_name,
        username: full_name.replace(/\s+/g, "").toLowerCase(),
      },
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Insert the driver profile row
    const { error: driverError } = await adminClient.from("drivers").insert({
      id: newUserId,
      full_name,
      phone,
      email: email.trim().toLowerCase(),
      training_location,
      training_address,
      bio,
      vehicle_type,
      license_number,
      years_experience: years_experience ? parseInt(years_experience) : null,
      certifications,
      languages_spoken: languages_spoken || null,
      specialties: specialties || null,
      training_approach,
      scheduling_mode: scheduling_mode || "queue",
      price_per_day: price_per_day ? parseFloat(price_per_day) : null,
      price_per_week: price_per_week ? parseFloat(price_per_week) : null,
      price_per_month: price_per_month ? parseFloat(price_per_month) : null,
      is_active: true,
      is_approved: true,
    });

    if (driverError) {
      // Rollback: delete the auth user if driver insert fails
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: `Failed to create driver profile: ${driverError.message}` },
        { status: 500 }
      );
    }

    // 3. Sync user_profiles entry
    await adminClient.from("user_profiles").upsert({
      id: newUserId,
      full_name,
      username: full_name.replace(/\s+/g, "").toLowerCase(),
      role: "Driver",
    }, { onConflict: "id" });

    return NextResponse.json(
      { success: true, driver_id: newUserId, message: "Driver registered successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error registering driver:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
