import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canWrite } from "@/lib/permissions";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    // Check write permission for students
    if (!canWrite(user, "students")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { userId } = params;

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Prevent deleting other admins
    const { data: targetUser } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetUser?.role === "Admin") {
      return NextResponse.json({ error: "Cannot delete admin users" }, { status: 400 });
    }

    // Delete user from auth using admin client (service role key)
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Auth delete error:", authError);
      return NextResponse.json({ error: "Failed to delete user from auth" }, { status: 500 });
    }

    // Delete user from database
    const { error: dbError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.error("DB delete error:", dbError);
      return NextResponse.json({ error: "Failed to delete user from database" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params;
    const { banned, role } = await request.json();

    // Prevent banning yourself
    if (userId === user.id && banned === true) {
      return NextResponse.json({ error: "Cannot ban yourself" }, { status: 400 });
    }

    // Update user
    const updateData: any = {};
    if (typeof banned === "boolean") {
      updateData.banned = banned;
    }
    if (role) {
      updateData.role = role;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Update user error:", error);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
