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

    const body = await request.json();
    const { exam_attempt_id } = body;

    if (!exam_attempt_id) {
      return NextResponse.json({ error: "Exam attempt ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const isTransientAttempt = typeof exam_attempt_id === "string" && exam_attempt_id.startsWith("temp-");

    const { data: updated, error } = await adminClient
      .from("exam_challenge_participants")
      .update({
        status: "completed",
        ...(isTransientAttempt ? {} : { exam_attempt_id }),
        completed_at: new Date().toISOString(),
      })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    const { data: allParticipants } = await adminClient
      .from("exam_challenge_participants")
      .select("user_id, status, exam_attempt_id")
      .eq("challenge_id", params.id);

    const activeParticipants = (allParticipants || []).filter((p) =>
      ["joined", "ready", "in_progress", "completed"].includes(p.status)
    );

    let activeTakersCount = 0;
    if (activeParticipants.length > 0) {
      const allCompleted = activeParticipants.every((p) => p.status === "completed");
      if (allCompleted) {
        await adminClient
          .from("exam_challenges")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", params.id);
      }
      activeTakersCount = activeParticipants.filter(
        (p) => p.status === "completed" || p.status === "in_progress" || p.status === "joined" || p.status === "ready" || Boolean(p.exam_attempt_id)
      ).length;
    }

    const attemptedParticipantsCount = (allParticipants || []).filter(
      (p) => p.status === "completed" || p.status === "in_progress" || Boolean(p.exam_attempt_id)
    ).length;

    const isSoloAttempt = activeTakersCount <= 1 && attemptedParticipantsCount <= 1;

    return NextResponse.json({
      participant: updated,
      status: "success",
      is_solo_attempt: isSoloAttempt,
      attempted_count: attemptedParticipantsCount,
      active_takers_count: activeTakersCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

