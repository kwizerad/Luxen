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
      .select("status, created_at, started_at, creator_id")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.status === "completed" || challenge.status === "cancelled") {
      return NextResponse.json({ error: "Exam challenge is no longer available" }, { status: 400 });
    }

    // Fetch configured join window setting from system_config (default: 120 seconds / 2 minutes)
    let joinWindowSeconds = 120;
    try {
      const { data: configRow } = await adminClient
        .from("system_config")
        .select("value")
        .eq("key", "group_exam_join_window_seconds")
        .maybeSingle();
      if (configRow?.value) {
        const parsed = parseInt(configRow.value, 10);
        if (!isNaN(parsed) && parsed > 0) {
          joinWindowSeconds = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch group_exam_join_window_seconds config, using fallback:", e);
    }

    // Check expiration against either started_at or created_at
    const now = Date.now();
    const referenceTime = challenge.started_at
      ? new Date(challenge.started_at).getTime()
      : challenge.created_at
      ? new Date(challenge.created_at).getTime()
      : now;

    if (now - referenceTime > joinWindowSeconds * 1000) {
      return NextResponse.json({
        error: "The joining window for this group exam has expired",
        join_window_seconds: joinWindowSeconds,
      }, { status: 400 });
    }

    // Check if participant record exists
    const { data: existingParticipant } = await adminClient
      .from("exam_challenge_participants")
      .select("id, status")
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    // Prevent re-entry if the student previously abandoned or completed the attempt
    if (existingParticipant && (existingParticipant.status === "abandoned" || existingParticipant.status === "completed")) {
      return NextResponse.json({
        error: "You have already completed or abandoned this exam attempt. Re-entry is not permitted.",
      }, { status: 403 });
    }

    let updated;
    if (existingParticipant) {
      const { data, error } = await adminClient
        .from("exam_challenge_participants")
        .update({ status: "joined" })
        .eq("challenge_id", params.id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      updated = data;
    } else {
      const { data, error } = await adminClient
        .from("exam_challenge_participants")
        .insert({
          challenge_id: params.id,
          user_id: user.id,
          status: "joined",
        })
        .select()
        .single();
      if (error) throw error;
      updated = data;
    }

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

