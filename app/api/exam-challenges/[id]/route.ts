import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: challenge, error } = await supabase
      .from("exam_challenges")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const { data: participants } = await supabase
      .from("exam_challenge_participants")
      .select("*")
      .eq("challenge_id", params.id);

    const allUserIds = new Set<string>();
    for (const p of participants || []) allUserIds.add(p.user_id);
    allUserIds.add(challenge.creator_id);

    let profileMap: Record<string, any> = {};
    if (allUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username, avatar_url, last_seen")
        .in("id", Array.from(allUserIds));
      for (const p of profiles || []) {
        profileMap[p.id] = p;
      }
    }

    const completedAttemptIds = (participants || [])
      .filter((p) => p.status === "completed" && p.exam_attempt_id)
      .map((p) => p.exam_attempt_id);

    let attemptMap: Record<string, any> = {};
    if (completedAttemptIds.length > 0) {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("*")
        .in("id", completedAttemptIds);
      for (const a of attempts || []) {
        attemptMap[a.id] = a;
      }
    }

    const enrichedParticipants = (participants || []).map((p) => ({
      ...p,
      profile: profileMap[p.user_id] || null,
      exam_attempt: p.exam_attempt_id ? attemptMap[p.exam_attempt_id] || null : null,
    }));

    return NextResponse.json({
      challenge: {
        ...challenge,
        creator_profile: profileMap[challenge.creator_id] || null,
      },
      participants: enrichedParticipants,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
