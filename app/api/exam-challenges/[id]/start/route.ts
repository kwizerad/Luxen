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
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can start" }, { status: 403 });
    }

    const { data: updated, error } = await supabase
      .from("exam_challenges")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ challenge: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
