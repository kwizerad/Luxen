import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setParticipantChallengeScore, setParticipantSharePreference } from "@/lib/group-exam-privacy";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { exam_attempt_id, share_results, score_summary } = body;

    if (!exam_attempt_id) {
      return NextResponse.json({ error: "Exam attempt ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const isBrowserOnlyAttempt =
      typeof exam_attempt_id === "string" &&
      (exam_attempt_id.startsWith("temp-") || exam_attempt_id.startsWith("browser-"));

    if (typeof share_results === "boolean") {
      await setParticipantSharePreference(adminClient, params.id, user.id, share_results);
    }

    if (score_summary && typeof score_summary === "object") {
      await setParticipantChallengeScore(adminClient, params.id, user.id, {
        correct_answers: Number(score_summary.correct_answers) || 0,
        total_questions: Number(score_summary.total_questions) || 20,
        score_percentage: Number(score_summary.score_percentage) || 0,
        duration_seconds: Number(score_summary.duration_seconds) || 0,
        status: String(score_summary.status || "completed"),
        completed_at: new Date().toISOString(),
      });
    }

    const { data: updated, error } = await adminClient
      .from("exam_challenge_participants")
      .update({
        status: "completed",
        ...(isBrowserOnlyAttempt ? {} : { exam_attempt_id }),
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

