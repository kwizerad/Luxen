import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = createAdminClient();
    
    // Check if admin already exists - prevent access if already set up
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const adminExists = existingUser.users.find(u => u.email === "Navo@admin.jn");
    
    if (adminExists) {
      return NextResponse.json({ 
        success: false, 
        message: "Admin user already exists. Setup is disabled for security reasons." 
      }, { status: 403 });
    }

    // Create admin user using admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: "Navo@admin.jn",
      password: "adminjohn",
      email_confirm: true,
      user_metadata: {
        role: "Admin",
        username: "NavoAdmin"
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
        email: "Navo@admin.jn",
        role: "Admin"
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
