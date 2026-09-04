import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const adminClient = createAdminClient();

    const { data: challenge } = await adminClient
      .from("exam_challenges")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Verify user is either creator or a participant
    const isCreator = challenge.creator_id === user.id;
    if (!isCreator) {
      const { data: participant } = await adminClient
        .from("exam_challenge_participants")
        .select("status")
        .eq("challenge_id", params.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!participant || (participant.status !== "joined" && participant.status !== "ready")) {
        return NextResponse.json({ error: "Only participants in the room can start" }, { status: 403 });
      }
    }

    // Set started_at only if it hasn't been set yet
    const startedAt = challenge.started_at || new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("exam_challenges")
      .update({ status: "active", started_at: startedAt })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    // Also mark the current user's participant status as in_progress
    await adminClient
      .from("exam_challenge_participants")
      .update({ status: "in_progress" })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .in("status", ["joined", "ready"]);

    return NextResponse.json({ challenge: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

