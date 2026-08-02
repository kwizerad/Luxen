import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let action: "update" | "offline" = "update";
    try {
      const body = await request.json();
      if (body?.action === "offline") action = "offline";
    } catch {
      // No body or invalid JSON — default to "update"
    }

    if (action === "offline") {
      const { error } = await supabase
        .from("user_profiles")
        .update({ last_seen: null })
        .eq("id", user.id);

      if (error) {
        console.error("Failed to set offline:", error);
      }
    } else {
      const { error } = await supabase
        .from("user_profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        console.error("Failed to update last activity:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Track activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
