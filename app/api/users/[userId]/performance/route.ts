import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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

    // Get user's exam attempts
    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch exam attempts:", error);
      return NextResponse.json({ error: "Failed to fetch exam attempts" }, { status: 500 });
    }

    return NextResponse.json({ attempts: attempts || [] });
  } catch (error) {
    console.error("Performance data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
