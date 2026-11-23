import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  setParticipantSharePreference,
  touchChallengeUpdatedAt,
} from "@/lib/group-exam-privacy";

async function handleVisibilityUpdate(
  request: NextRequest,
  challengeId: string
) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.share_results !== "boolean") {
      return NextResponse.json(
        { error: "share_results must be a boolean" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: challenge } = await adminClient
      .from("exam_challenges")
      .select("id, creator_id")
      .eq("id", challengeId)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const { data: participant } = await adminClient
      .from("exam_challenge_participants")
      .select("id, user_id")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!participant && challenge.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: only challenge participants can update their visibility" },
        { status: 403 }
      );
    }

    await setParticipantSharePreference(
      adminClient,
      challengeId,
      user.id,
      body.share_results
    );
    await touchChallengeUpdatedAt(adminClient, challengeId);

    return NextResponse.json({
      success: true,
      challenge_id: challengeId,
      user_id: user.id,
      share_results: body.share_results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update result visibility.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleVisibilityUpdate(request, params.id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleVisibilityUpdate(request, params.id);
}
