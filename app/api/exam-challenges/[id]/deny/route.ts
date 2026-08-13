import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: updated, error } = await supabase
      .from("exam_challenge_participants")
      .update({ status: "rejected" })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to deny challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
