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

    // Check if user is admin
    const { data: userData } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userIds, ban } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
    }

    if (typeof ban !== "boolean") {
      return NextResponse.json({ error: "Invalid ban status" }, { status: 400 });
    }

    // Prevent banning yourself
    if (userIds.includes(user.id)) {
      return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
    }

    // Update users ban status
    const { error } = await supabase
      .from("user_profiles")
      .update({ banned: ban })
      .in("id", userIds);

    if (error) {
      console.error("Bulk ban error:", error);
      return NextResponse.json({ error: "Failed to update users" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: userIds.length, banned: ban });
  } catch (error) {
    console.error("Bulk ban error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
