import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);

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

    if (challenge.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can remind participants" }, { status: 403 });
    }

    const body = await request.json();
    const { participant_id } = body;

    if (!participant_id) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    const { data: participant } = await adminClient
      .from("exam_challenge_participants")
      .select("*")
      .eq("id", participant_id)
      .maybeSingle();

    if (!participant || participant.challenge_id !== params.id) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (participant.status !== "joined") {
      return NextResponse.json({ error: "Only joined (not ready) participants can be reminded" }, { status: 400 });
    }

    const { error: remindError } = await adminClient
      .from("exam_challenge_participants")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", participant_id);

    if (remindError) throw remindError;

    try {
      await adminClient.from("notifications").insert({
        target_user_id: participant.user_id,
        type: "exam_challenge_invite",
        title: "Group Exam Reminder",
        message: `Your classmate is waiting for you in the "${challenge.category_name}" group exam.`,
        data: {
          sender_id: user.id,
          challenge_id: challenge.id,
          category_name: challenge.category_name,
        },
        sender_id: user.id,
        action_url: `/dashboard#exam?challenge_id=${encodeURIComponent(challenge.id)}`,
      });
    } catch (notifErr) {
      console.error("Failed to insert remind notification:", notifErr);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remind participant.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
