import { createClient } from "@/lib/supabase/server";
import { canRead } from "@/lib/permissions";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    // Check read permission for students
    if (!canRead(user, "students")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get all users
    const { data: users, error } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Export error:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Convert to CSV
    const headers = ["ID", "Email", "Username", "First Name", "Last Name", "Full Name", "Role", "Gender", "Nationality", "Birthdate", "Banned", "Created At"];
    const csvRows = [headers.join(",")];

    users.forEach((u: any) => {
      const row = [
        u.id,
        u.email || "",
        u.username || "",
        u.first_name || "",
        u.last_name || "",
        u.full_name || "",
        u.role || "",
        u.gender || "",
        u.nationality || "",
        u.birthdate || "",
        u.banned ? "Yes" : "No",
        u.created_at || "",
      ];
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });

    const csvContent = csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
