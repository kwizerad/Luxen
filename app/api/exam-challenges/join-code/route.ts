import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUUID } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawCode = String(body?.code || "")
      .trim()
      .replace(/^NAVO-/i, "")
      .toLowerCase();

    if (!rawCode || rawCode.length < 6) {
      return NextResponse.json(
        { error: "Please enter a valid 8-character room code or invite ID." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    let challenge: any = null;

    if (isUUID(rawCode)) {
      const { data } = await adminClient
        .from("exam_challenges")
        .select("*")
        .eq("id", rawCode)
        .maybeSingle();
      challenge = data;
    } else {
      const { data: candidates } = await adminClient
        .from("exam_challenges")
        .select("*")
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false })
        .limit(100);

      challenge = (candidates || []).find((c: any) =>
        String(c.id || "")
          .toLowerCase()
          .replace(/-/g, "")
          .startsWith(rawCode.replace(/-/g, ""))
      );
    }

    if (!challenge) {
      return NextResponse.json(
        { error: "No active group exam room found for that code." },
        { status: 404 }
      );
    }

    if (challenge.status === "completed" || challenge.status === "cancelled") {
      return NextResponse.json(
        { error: "This group exam room has already ended." },
        { status: 400 }
      );
    }

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
    } catch {}

    const now = Date.now();
    const referenceTime = challenge.started_at
      ? new Date(challenge.started_at).getTime()
      : challenge.created_at
      ? new Date(challenge.created_at).getTime()
      : now;

    if (now - referenceTime > joinWindowSeconds * 1000) {
      return NextResponse.json(
        { error: "The joining window for this group exam has expired." },
        { status: 400 }
      );
    }

    const { data: existingParticipant } = await adminClient
      .from("exam_challenge_participants")
      .select("id, status")
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      existingParticipant &&
      (existingParticipant.status === "abandoned" ||
        existingParticipant.status === "completed")
    ) {
      return NextResponse.json(
        { error: "You have already completed or left this exam session." },
        { status: 403 }
      );
    }

    if (existingParticipant) {
      await adminClient
        .from("exam_challenge_participants")
        .update({ status: existingParticipant.status === "ready" ? "ready" : "joined" })
        .eq("challenge_id", challenge.id)
        .eq("user_id", user.id);
    } else {
      const { error: insertErr } = await adminClient
        .from("exam_challenge_participants")
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          status: "joined",
        });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      challenge,
      status: "success",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to join room by code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
