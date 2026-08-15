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

    // Get challenge
    const { data: challenge } = await supabase
      .from("exam_challenges")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Get all participants with their exam attempts
    const { data: participants, error: participantsError } = await supabase
      .from("exam_challenge_participants")
      .select(`
        user_id,
        status,
        exam_attempt_id,
        completed_at
      `)
      .eq("challenge_id", params.id);

    if (participantsError) throw participantsError;

    // Get profiles
    const userIds = (participants || []).map((p) => p.user_id);
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);
      for (const p of profiles || []) {
        profileMap[p.id] = p;
      }
    }

    // Get exam attempts for those who completed
    const attemptIds = (participants || [])
      .filter((p) => p.exam_attempt_id)
      .map((p) => p.exam_attempt_id);

    let attemptMap: Record<string, any> = {};
    if (attemptIds.length > 0) {
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("id, correct_answers, total_questions, duration_seconds, status")
        .in("id", attemptIds);
      for (const a of attempts || []) {
        attemptMap[a.id] = a;
      }
    }

    // Build leaderboard
    const leaderboard = (participants || [])
      .map((p) => {
        const attempt = p.exam_attempt_id ? attemptMap[p.exam_attempt_id] : null;
        const profile = profileMap[p.user_id] || null;
        return {
          user_id: p.user_id,
          full_name: profile?.full_name || profile?.username || "Unknown",
          username: profile?.username || "",
          avatar_url: profile?.avatar_url || null,
          status: p.status,
          score: attempt?.correct_answers ?? null,
          total_questions: attempt?.total_questions ?? null,
          duration_seconds: attempt?.duration_seconds ?? null,
          completed: p.status === "completed",
        };
      })
      .sort((a, b) => {
        // Completed first, then by score descending
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        if (a.score !== null && b.score !== null) return b.score - a.score;
        if (a.score !== null) return -1;
        if (b.score !== null) return 1;
        return 0;
      });

    return NextResponse.json({
      challenge,
      leaderboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch challenge results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
