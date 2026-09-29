import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPrimaryAdmin } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  let body: { national_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const nationalId = body.national_id;
  if (!nationalId || nationalId.length !== 16) {
    return NextResponse.json(
      { error: "Invalid National ID. Must be 16 digits." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    // Check if user is an admin / primary admin
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isUserAdmin =
      isPrimaryAdmin(user) ||
      userProfile?.role === "Admin" ||
      userProfile?.role === "admin" ||
      user.email === "kwizeradiementwari@gmail.com" ||
      user.email === "navo@admin.jn";

    if (isUserAdmin) {
      // Admins checking IDs should not link them to their personal profile
      const { saveNationalIdRecord } = await import("@/lib/live-exam/save-record");
      await saveNationalIdRecord(nationalId, user.id, { isVerified: false });
      return NextResponse.json({ success: true, message: "ID recorded without linking to admin account." });
    }

    // Check if this national ID is already used by another user
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("national_id", nationalId)
      .neq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "This National ID is already registered to another account." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ national_id: nationalId })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to save national ID." },
        { status: 500 }
      );
    }

    // Save and link in national_id_records as verified without duplication
    const { saveNationalIdRecord } = await import("@/lib/live-exam/save-record");
    await saveNationalIdRecord(nationalId, user.id, { isVerified: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
