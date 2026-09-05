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

    const { data: participant } = await supabase
      .from("exam_challenge_participants")
      .select("status")
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: "You are not a participant" }, { status: 403 });
    }

    if (participant.status !== "joined") {
      return NextResponse.json({ error: "Only joined participants can ready up" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("exam_challenge_participants")
      .update({ status: "ready", ready_at: new Date().toISOString() })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ready up.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
