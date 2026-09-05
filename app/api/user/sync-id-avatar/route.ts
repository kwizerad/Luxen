import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCitizenFullDetails } from "@/lib/live-exam/irembo";
import { isPrimaryAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Never sync citizen ID avatars for admins or primary admins
    if (
      isPrimaryAdmin(user) ||
      user.email === "kwizeradiementwari@gmail.com" ||
      user.email === "navo@admin.jn"
    ) {
      return NextResponse.json({ avatar_url: null, message: "Admins do not sync citizen ID avatar" });
    }

    const adminClient = createAdminClient();

    // Check existing profile
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("id, national_id, avatar_url, email, full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "Admin" || profile?.role === "admin") {
      return NextResponse.json({ avatar_url: null, message: "Admins do not sync citizen ID avatar" });
    }

    // If profile already has an avatar, return it
    if (profile?.avatar_url) {
      return NextResponse.json({ avatar_url: profile.avatar_url });
    }

    // Determine national ID from profile, user_metadata, or synthetic email
    let cleanId = (profile?.national_id || user.user_metadata?.national_id || "").trim().replace(/\D/g, "");
    if (!cleanId && user.email?.includes("@nid.rw")) {
      cleanId = user.email.split("@")[0].replace(/\D/g, "");
    }

    if (!cleanId || cleanId.length !== 16) {
      return NextResponse.json({ avatar_url: null, message: "No 16-digit national ID found" });
    }

    // Fetch official details from Irembo / NIDA
    const citizenDoc = await fetchCitizenFullDetails(cleanId).catch(() => null);

    if (citizenDoc?.photoUrl) {
      // Persist to user_profiles
      await adminClient
        .from("user_profiles")
        .update({
          avatar_url: citizenDoc.photoUrl,
          national_id: cleanId,
          ...(citizenDoc.fullName && !profile?.full_name ? { full_name: citizenDoc.fullName } : {}),
        })
        .eq("id", user.id);

      return NextResponse.json({
        avatar_url: citizenDoc.photoUrl,
        full_name: citizenDoc.fullName || profile?.full_name || null,
      });
    }

    return NextResponse.json({ avatar_url: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync avatar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
