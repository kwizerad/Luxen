import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { attemptId } = params;

    // Get the attempt with questions
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (error) {
      console.error("Failed to fetch exam attempt:", error);
      return NextResponse.json({ error: "Failed to fetch exam attempt" }, { status: 500 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Attempt details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
