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

    const { data: challenge } = await supabase
      .from("exam_challenges")
      .select("status")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.status !== "pending") {
      return NextResponse.json({ error: "Cannot join after challenge has started" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("exam_challenge_participants")
      .update({ status: "joined" })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
