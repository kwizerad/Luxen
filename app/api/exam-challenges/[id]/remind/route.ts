import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin-client";

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
      return NextResponse.json({ error: "Only the creator can remind participants" }, { status: 403 });
    }

    const body = await request.json();
    const { participant_id } = body;

    if (!participant_id) {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }

    const { data: participant } = await supabase
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

    const { error: remindError } = await supabase
      .from("exam_challenge_participants")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", participant_id);

    if (remindError) throw remindError;

    const adminClient = createAdminClient();

    const { data: existingConv } = await adminClient
      .from("chat_conversations")
      .select("id")
      .or(`and(driver_id.eq.${user.id},student_id.eq.${participant.user_id}),and(driver_id.eq.${participant.user_id},student_id.eq.${user.id})`)
      .maybeSingle();

    let conversationId = existingConv?.id;

    if (!conversationId) {
      const { data: newConv } = await adminClient
        .from("chat_conversations")
        .insert([{ driver_id: user.id, student_id: participant.user_id }])
        .select()
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      await adminClient.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: `Reminder: Please get ready for the group exam challenge: ${challenge.category_name}`,
      });

      await adminClient
        .from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remind participant.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
