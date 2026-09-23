import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const adminClient = createAdminClient();

    // Get challenge
    const { data: challenge } = await adminClient
      .from("exam_challenges")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    // Get all participants with their exam attempts
    const { data: rawParticipants, error: participantsError } = await adminClient
      .from("exam_challenge_participants")
      .select(`
        user_id,
        status,
        exam_attempt_id,
        completed_at
      `)
      .eq("challenge_id", params.id);

    if (participantsError) throw participantsError;

    // Deduplicate participants by user_id
    const participantsMap = new Map<string, any>();
    for (const p of rawParticipants || []) {
      const existing = participantsMap.get(p.user_id);
      if (!existing || (p.status === "completed" && existing.status !== "completed") || (p.exam_attempt_id && !existing.exam_attempt_id)) {
        participantsMap.set(p.user_id, p);
      }
    }
    const participants = Array.from(participantsMap.values());

    // Get profiles
    const userIds = Array.from(new Set([
      ...(participants || []).map((p) => p.user_id),
      challenge.creator_id,
    ]));

    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from("user_profiles")
        .select("id, full_name, first_name, last_name, username, avatar_url")
        .in("id", userIds);
      for (const p of profiles || []) {
        const firstName =
          p.first_name ||
          (p.full_name ? p.full_name.trim().split(/\s+/)[0] : p.username || "User");
        profileMap[p.id] = {
          ...p,
          first_name: firstName,
        };
      }
    }

    // Get exam attempts for those who completed or have an attempt ID
    const attemptIds = (participants || [])
      .filter((p) => p.exam_attempt_id)
      .map((p) => p.exam_attempt_id);

    let attemptMap: Record<string, any> = {};
    if (attemptIds.length > 0) {
      const { data: attempts } = await adminClient
        .from("exam_attempts")
        .select("id, user_id, correct_answers, total_questions, duration_seconds, score_percentage, answers, status, completed_at")
        .in("id", attemptIds);
      for (const a of attempts || []) {
        attemptMap[a.id] = a;
      }
    }

    // Fallback: If a participant has completed status or no attempt mapped yet, check if there's an attempt for them
    for (const p of participants || []) {
      if (!p.exam_attempt_id || !attemptMap[p.exam_attempt_id]) {
        try {
          const { data: fallbackAttempts } = await adminClient
            .from("exam_attempts")
            .select("id, user_id, correct_answers, total_questions, duration_seconds, score_percentage, answers, status, completed_at")
            .eq("user_id", p.user_id)
            .eq("category_id", challenge.category_id)
            .gte("created_at", new Date(new Date(challenge.created_at).getTime() - 60000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1);

          if (fallbackAttempts && fallbackAttempts.length > 0) {
            const fbAttempt = fallbackAttempts[0];
            attemptMap[fbAttempt.id] = fbAttempt;
            if (!p.exam_attempt_id) {
              p.exam_attempt_id = fbAttempt.id;
            }
          }
        } catch {
          // ignore fallback error
        }
      }
    }

    // Fetch all historical completed attempts for participants to compute trend indicators
    let userAttemptsMap: Record<string, any[]> = {};
    if (userIds.length > 0) {
      try {
        const { data: allHistory } = await adminClient
          .from("exam_attempts")
          .select("id, user_id, score_percentage, correct_answers, total_questions, status, completed_at")
          .in("user_id", userIds)
          .eq("status", "completed");

        for (const att of allHistory || []) {
          if (!userAttemptsMap[att.user_id]) userAttemptsMap[att.user_id] = [];
          userAttemptsMap[att.user_id].push(att);
        }
      } catch {
        // ignore history error
      }
    }

    // Build leaderboard with tie-breaking:
    // 1. Highest score / percentage first (e.g. 25% > 15%, 5/20 > 3/20)
    // 2. Fastest duration seconds (lower is better)
    // 3. Completed first vs in-progress / abandoned
    // 4. Completed at timestamp ascending
    const leaderboard = (participants || [])
      .map((p) => {
        const attempt = p.exam_attempt_id ? attemptMap[p.exam_attempt_id] : null;
        const profile = profileMap[p.user_id] || null;
        const totalQuestions = attempt?.total_questions ?? 20;
        const correctAnswers = attempt?.correct_answers ?? null;
        const calculatedPct =
          attempt?.score_percentage !== undefined && attempt?.score_percentage !== null
            ? attempt.score_percentage
            : correctAnswers !== null && totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : null;

        const isCompleted = p.status === "completed" || attempt?.status === "completed";
        const history = userAttemptsMap[p.user_id] || [];
        const totalAttempts = history.length;

        let trend: "up" | "down" | "neutral" | null = null;
        let trendDiff = 0;
        let averageScore: number | null = null;

        if (totalAttempts > 1 && calculatedPct !== null) {
          const sumScores = history.reduce((acc, h) => acc + (h.score_percentage ?? 0), 0);
          averageScore = Math.round(sumScores / totalAttempts);
          trendDiff = calculatedPct - averageScore;
          if (trendDiff > 0) trend = "up";
          else if (trendDiff < 0) trend = "down";
          else trend = "neutral";
        } else if (totalAttempts === 1 && calculatedPct !== null) {
          averageScore = calculatedPct;
        }

        return {
          user_id: p.user_id,
          full_name: profile?.full_name || profile?.username || "Unknown",
          first_name: profile?.first_name || (profile?.full_name ? profile.full_name.trim().split(/\s+/)[0] : profile?.username || "User"),
          username: profile?.username || "",
          avatar_url: profile?.avatar_url || null,
          status: isCompleted ? "completed" : p.status,
          score: correctAnswers,
          score_percentage: calculatedPct,
          total_questions: totalQuestions,
          duration_seconds: attempt?.duration_seconds ?? null,
          answers: attempt?.answers ?? [],
          completed: isCompleted,
          completed_at: p.completed_at || attempt?.completed_at || null,
          trend,
          trend_diff: trendDiff,
          average_score: averageScore,
          total_attempts: totalAttempts,
        };
      })
      .sort((a, b) => {
        // Participants with a finished score vs those without
        const aHasScore = a.score !== null && a.score_percentage !== null;
        const bHasScore = b.score !== null && b.score_percentage !== null;

        if (aHasScore && !bHasScore) return -1;
        if (!aHasScore && bHasScore) return 1;

        if (aHasScore && bHasScore) {
          // 1. Higher score/percentage wins
          const aScore = a.score_percentage ?? a.score ?? 0;
          const bScore = b.score_percentage ?? b.score ?? 0;
          if (bScore !== aScore) return bScore - aScore;

          // Also check raw marks count
          if (b.score !== null && a.score !== null && b.score !== a.score) {
            return b.score - a.score;
          }

          // 2. Tie-break by fastest duration (smaller duration is better)
          if (a.duration_seconds !== null && b.duration_seconds !== null) {
            if (a.duration_seconds !== b.duration_seconds) {
              return a.duration_seconds - b.duration_seconds;
            }
          }

          // 3. Tie-break by earlier completion timestamp
          if (a.completed_at && b.completed_at) {
            return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
          }
        }

        // Completed vs not completed
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;

        return 0;
      });

    return NextResponse.json({
      challenge: {
        ...challenge,
        creator_profile: profileMap[challenge.creator_id] || null,
      },
      leaderboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch challenge results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
