import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if user is authenticated and is an admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || user.user_metadata?.role !== "Admin") {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Admin access required"
      }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    // Get all users from Supabase Auth
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Filter to only return students (exclude admins)
    const allUsers = data.users || [];
    const studentUsers = allUsers.filter((u: any) => 
      u.user_metadata?.role !== "Admin"
    );

    return NextResponse.json({
      success: true,
      users: studentUsers
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch users"
    }, { status: 500 });
  }
}
