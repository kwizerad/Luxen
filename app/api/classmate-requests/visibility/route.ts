import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const isPublic = body.is_public;

    if (typeof isPublic !== "boolean") {
      return NextResponse.json({ error: "is_public must be a boolean" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("user_profiles")
      .update({ is_public: isPublic })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update visibility:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_public: isPublic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
