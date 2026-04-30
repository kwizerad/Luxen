import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPrimaryAdmin, isAdmin, canViewStudents, hasReadWriteStudentAccess, PRIMARY_ADMIN_EMAIL } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "students";
    
    // Check if user is authenticated and is an admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Admin access required"
      }, { status: 403 });
    }

    // Check if user has permission to view students
    if (type === "students" && !canViewStudents(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - You don't have permission to view students"
      }, { status: 403 });
    }

    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your environment variables."
      }, { status: 500 });
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

    const allUsers = data.users || [];
    
    // Filter based on type
    let filteredUsers;
    if (type === "admins") {
      // Only primary admin can list other admins
      if (!isPrimaryAdmin(user)) {
        return NextResponse.json({
          success: false,
          error: "Unauthorized - Only primary admin can view other admins"
        }, { status: 403 });
      }
      // Return all admins (including primary)
      filteredUsers = allUsers.filter((u: any) => 
        u.user_metadata?.role === "Admin" || u.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
      );
    } else {
      // Return only students (exclude admins)
      filteredUsers = allUsers.filter((u: any) => 
        u.user_metadata?.role !== "Admin" && u.email?.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      users: filteredUsers
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch users"
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    
    // Check if user is authenticated and is the primary admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || !isPrimaryAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Only primary admin can delete users"
      }, { status: 403 });
    }
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "User ID is required"
      }, { status: 400 });
    }
    
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set"
      }, { status: 500 });
    }
    
    const supabase = createAdminClient();
    
    // Cannot delete primary admin
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: "Cannot delete primary admin"
      }, { status: 400 });
    }
    
    // Delete user
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete user"
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, banned } = body;
    
    // Check if user is authenticated and is an admin
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (!user || !isAdmin(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - Admin access required"
      }, { status: 403 });
    }

    // Check if user has read-write access to students (or is primary admin)
    if (!isPrimaryAdmin(user) && !hasReadWriteStudentAccess(user)) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized - You don't have permission to modify students"
      }, { status: 403 });
    }
    
    if (!userId || banned === undefined) {
      return NextResponse.json({
        success: false,
        error: "User ID and banned status are required"
      }, { status: 400 });
    }
    
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set"
      }, { status: 500 });
    }
    
    const supabase = createAdminClient();
    
    // Cannot ban primary admin
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user?.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({
        success: false,
        error: "Cannot ban primary admin"
      }, { status: 400 });
    }
    
    // Update user metadata with banned status
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...userData?.user?.user_metadata,
        banned: banned,
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
      message: banned ? "User banned successfully" : "User unbanned successfully"
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to update user"
    }, { status: 500 });
  }
}
