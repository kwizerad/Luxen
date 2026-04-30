import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPrimaryAdmin, DEFAULT_PERMISSIONS } from "@/lib/permissions";

const PRIMARY_ADMIN_EMAIL = "Navo@admin.jn";

export async function POST(request: Request) {
  try {
    // Check if user is authenticated and is the primary admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || !isPrimaryAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Only primary admin can create new admins"
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      email, 
      password, 
      username, 
      gender, 
      require_password_change,
      permissions 
    } = body;

    if (!email || !password || !username) {
      return NextResponse.json({
        success: false,
        error: "Email, password, and username are required"
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.find((u: any) => u.email === email);

    if (adminExists) {
      return NextResponse.json({
        success: false,
        error: "A user with this email already exists"
      }, { status: 400 });
    }

    // Create new admin user with permissions
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "Admin",
        username: username,
        gender: gender || "male",
        require_password_change: require_password_change || false,
        permissions: permissions || DEFAULT_PERMISSIONS,
      }
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        email,
        role: "Admin",
        username,
        gender: gender || "male",
        require_password_change: require_password_change || false,
        permissions: permissions || DEFAULT_PERMISSIONS,
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to create admin user"
    }, { status: 500 });
  }
}
