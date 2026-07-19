import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (userIds.includes(user.id)) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Delete users from auth (one by one since bulk delete is not available)
    for (const userId of userIds) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        console.error("Auth delete error for user:", userId, authError);
      }
    }

    // Delete users from database
    const { error: dbError } = await supabase
      .from("user_profiles")
      .delete()
      .in("id", userIds);

    if (dbError) {
      console.error("DB delete error:", dbError);
      return NextResponse.json({ error: "Failed to delete users from database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: userIds.length });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
