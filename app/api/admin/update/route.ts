import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPrimaryAdmin } from "@/lib/permissions";

const PRIMARY_ADMIN_EMAIL = "Navo@admin.jn";

export async function PUT(request: Request) {
  try {
    // Check if user is authenticated and is the primary admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || !isPrimaryAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Only primary admin can update permissions"
      }, { status: 403 });
    }

    const body = await request.json();
    const { adminId, email, username, gender, permissions } = body;

    if (!adminId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if trying to update primary admin
    const { data: targetAdmin } = await supabase.auth.admin.getUserById(adminId);
    if (targetAdmin.user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Cannot modify primary admin" }, { status: 403 });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== targetAdmin.user?.email) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.find((u: any) => u.email === email && u.id !== adminId);
      if (emailExists) {
        return NextResponse.json({ success: false, error: "Email already in use" }, { status: 400 });
      }
    }

    // Update user metadata with new info and permissions
    const updateData: any = {
      user_metadata: {
        ...targetAdmin.user?.user_metadata,
        username: username || targetAdmin.user?.user_metadata?.username,
        gender: gender || targetAdmin.user?.user_metadata?.gender,
      },
    };

    if (permissions) {
      updateData.user_metadata.permissions = permissions;
    }

    // Update email if provided
    if (email && email !== targetAdmin.user?.email) {
      updateData.email = email;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(adminId, updateData);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to update admin" }, { status: 500 });
  }
}
