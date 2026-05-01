import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Check if admin already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const adminExists = existingUser.users.find(u => u.email === "Navo@admin.jn");
    
    return NextResponse.json({ 
      adminExists: !!adminExists 
    });
  } catch (error) {
    return NextResponse.json({ 
      adminExists: true, // Fail safe - assume admin exists on error
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
