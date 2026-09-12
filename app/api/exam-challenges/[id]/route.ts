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

    const { data: challenge, error } = await adminClient
      .from("exam_challenges")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const { data: rawParticipants } = await adminClient
      .from("exam_challenge_participants")
      .select("*")
      .eq("challenge_id", params.id);

    // Deduplicate participants by user_id, favoring completed or highest attempt
    const participantsMap = new Map<string, any>();
    for (const p of rawParticipants || []) {
      const existing = participantsMap.get(p.user_id);
      if (!existing || (p.status === "completed" && existing.status !== "completed") || (p.exam_attempt_id && !existing.exam_attempt_id)) {
        participantsMap.set(p.user_id, p);
      }
    }
    const participants = Array.from(participantsMap.values());

    const allUserIds = new Set<string>();
    for (const p of participants || []) allUserIds.add(p.user_id);
    allUserIds.add(challenge.creator_id);

    let profileMap: Record<string, any> = {};
    if (allUserIds.size > 0) {
      const { data: profiles } = await adminClient
        .from("user_profiles")
        .select("id, full_name, first_name, last_name, username, avatar_url, last_seen")
        .in("id", Array.from(allUserIds));
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

    const completedAttemptIds = (participants || [])
      .filter((p) => p.exam_attempt_id)
      .map((p) => p.exam_attempt_id);

    let attemptMap: Record<string, any> = {};
    if (completedAttemptIds.length > 0) {
      const { data: attempts } = await adminClient
        .from("exam_attempts")
        .select("*")
        .in("id", completedAttemptIds);
      for (const a of attempts || []) {
        attemptMap[a.id] = a;
      }
    }

    // Fallback: If a participant has no mapped attempt yet, query their latest attempt for this challenge/category
    for (const p of participants || []) {
      if (!p.exam_attempt_id || !attemptMap[p.exam_attempt_id]) {
        try {
          const { data: fallbackAttempts } = await adminClient
            .from("exam_attempts")
            .select("*")
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
    if (allUserIds.size > 0) {
      try {
        const { data: allHistory } = await adminClient
          .from("exam_attempts")
          .select("id, user_id, score_percentage, correct_answers, total_questions, status, completed_at")
          .in("user_id", Array.from(allUserIds))
          .eq("status", "completed");

        for (const att of allHistory || []) {
          if (!userAttemptsMap[att.user_id]) userAttemptsMap[att.user_id] = [];
          userAttemptsMap[att.user_id].push(att);
        }
      } catch {
        // ignore history error
      }
    }

    const enrichedParticipants = (participants || []).map((p) => {
      const attempt = p.exam_attempt_id ? attemptMap[p.exam_attempt_id] || null : null;
      const profile = profileMap[p.user_id] || null;
      const history = userAttemptsMap[p.user_id] || [];
      const totalAttempts = history.length;

      const currentScorePct =
        attempt?.score_percentage !== undefined && attempt?.score_percentage !== null
          ? attempt.score_percentage
          : attempt?.correct_answers !== null && attempt?.total_questions
          ? Math.round((attempt.correct_answers / attempt.total_questions) * 100)
          : null;

      let trend: "up" | "down" | "neutral" | null = null;
      let trendDiff = 0;
      let averageScore: number | null = null;

      if (totalAttempts > 1 && currentScorePct !== null) {
        const sumScores = history.reduce((acc, h) => acc + (h.score_percentage ?? 0), 0);
        averageScore = Math.round(sumScores / totalAttempts);
        trendDiff = currentScorePct - averageScore;
        if (trendDiff > 0) trend = "up";
        else if (trendDiff < 0) trend = "down";
        else trend = "neutral";
      } else if (totalAttempts === 1 && currentScorePct !== null) {
        averageScore = currentScorePct;
      }

      return {
        ...p,
        profile,
        exam_attempt: attempt,
        trend,
        trend_diff: trendDiff,
        average_score: averageScore,
        total_attempts: totalAttempts,
      };
    });

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

export async function DELETE(
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
      .select("creator_id, status")
      .eq("id", params.id)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can cancel" }, { status: 403 });
    }

    if (challenge.status === "active" || challenge.status === "completed") {
      return NextResponse.json({ error: "Cannot cancel an active or completed challenge" }, { status: 400 });
    }

    // Delete participants first (foreign key), then the challenge
    await adminClient
      .from("exam_challenge_participants")
      .delete()
      .eq("challenge_id", params.id);

    await adminClient
      .from("exam_challenges")
      .delete()
      .eq("id", params.id);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
