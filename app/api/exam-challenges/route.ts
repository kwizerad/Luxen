import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerOpportunisticExamCleanup } from "@/lib/exam-cleanup";

export async function GET(request: NextRequest) {
  try {
    triggerOpportunisticExamCleanup();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-update expired pending & active challenges to ensure they leave ongoing status while preserving history
    const adminClient = createAdminClient();
    try {
      const now = Date.now();
      // 1. Any active challenge older than 30 minutes is expired / completed
      const activeCutoff = new Date(now - 30 * 60 * 1000).toISOString();
      await adminClient
        .from("exam_challenges")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("status", "active")
        .lt("created_at", activeCutoff);

      // 2. Any pending challenge older than 2 minutes where no one took the exam is cancelled
      const pendingCutoff = new Date(now - 2 * 60 * 1000).toISOString();
      await adminClient
        .from("exam_challenges")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("status", "pending")
        .lt("created_at", pendingCutoff);
    } catch (cleanupErr) {
      console.error("Failed to auto-update stale challenges status:", cleanupErr);
    }

    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get("with_user");

    let challengeIds: string[] = [];

    if (withUserId) {
      const { data: myParticipations } = await adminClient
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      const myChallengeIds = (myParticipations || []).map((p) => p.challenge_id);

      const { data: createdChallenges } = await adminClient
        .from("exam_challenges")
        .select("id")
        .eq("creator_id", user.id);

      const createdIds = (createdChallenges || []).map((c) => c.id);

      const allMyIds = new Set([...myChallengeIds, ...createdIds]);
      if (allMyIds.size === 0) {
        return NextResponse.json({ challenges: [] });
      }

      const { data: otherParticipations } = await adminClient
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", withUserId)
        .in("challenge_id", Array.from(allMyIds));

      const otherChallengeIds = new Set((otherParticipations || []).map((p) => p.challenge_id));

      const { data: otherCreated } = await adminClient
        .from("exam_challenges")
        .select("id")
        .eq("creator_id", withUserId)
        .in("id", Array.from(allMyIds));

      (otherCreated || []).forEach((c) => otherChallengeIds.add(c.id));

      challengeIds = Array.from(otherChallengeIds);
    } else {
      const { data: myParticipations } = await adminClient
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      const { data: createdChallenges } = await adminClient
        .from("exam_challenges")
        .select("id")
        .eq("creator_id", user.id);

      challengeIds = [
        ...(myParticipations || []).map((p) => p.challenge_id),
        ...(createdChallenges || []).map((c) => c.id),
      ];
    }

    if (challengeIds.length === 0) {
      return NextResponse.json({ challenges: [] });
    }

    const { data: challenges, error } = await adminClient
      .from("exam_challenges")
      .select("*")
      .in("id", challengeIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: participants } = await adminClient
      .from("exam_challenge_participants")
      .select("*")
      .in("challenge_id", challengeIds);

    // Collect all exam_attempt_ids
    const attemptIds = (participants || [])
      .map((p) => p.exam_attempt_id)
      .filter(Boolean);

    let attemptMap: Record<string, any> = {};
    if (attemptIds.length > 0) {
      const { data: attempts } = await adminClient
        .from("exam_attempts")
        .select("id, score_percentage, correct_answers, total_questions, status, created_at, completed_at, duration_seconds")
        .in("id", attemptIds);
      for (const a of attempts || []) {
        const score = a.correct_answers ?? 0;
        const total = a.total_questions || 20;
        const pct = a.score_percentage ?? (total > 0 ? Math.round((score / total) * 100) : 0);
        attemptMap[a.id] = {
          ...a,
          score,
          is_passed: pct >= 50,
          percentage: pct,
        };
      }
    }

    const participantMap: Record<string, any[]> = {};
    for (const p of participants || []) {
      if (!participantMap[p.challenge_id]) participantMap[p.challenge_id] = [];
      participantMap[p.challenge_id].push({
        ...p,
        exam_attempt: p.exam_attempt_id ? attemptMap[p.exam_attempt_id] || null : null,
      });
    }

    const allUserIds = new Set<string>();
    for (const ps of Object.values(participantMap)) {
      for (const p of ps) allUserIds.add(p.user_id);
    }
    for (const c of challenges || []) allUserIds.add(c.creator_id);

    let profileMap: Record<string, any> = {};
    if (allUserIds.size > 0) {
      const { data: profiles } = await adminClient
        .from("user_profiles")
        .select("id, full_name, username, avatar_url, last_seen")
        .in("id", Array.from(allUserIds));
      for (const p of profiles || []) {
        profileMap[p.id] = p;
      }
    }

    const enriched = (challenges || []).map((c) => ({
      ...c,
      participants: (participantMap[c.id] || []).map((p: any) => ({
        ...p,
        profile: profileMap[p.user_id] || null,
      })),
      creator_profile: profileMap[c.creator_id] || null,
    }));

    return NextResponse.json({ challenges: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam challenges.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category_id, category_name, invite_user_ids } = body;

    if (!category_id || !category_name) {
      return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 });
    }

    // Filter out duplicates and exclude creator's own user ID to prevent self-invitation
    const cleanInviteUserIds = Array.from(
      new Set(
        (Array.isArray(invite_user_ids) ? invite_user_ids : [])
          .filter((id): id is string => typeof id === "string" && id.trim() !== "" && id !== user.id)
      )
    );

    if (cleanInviteUserIds.length === 0) {
      return NextResponse.json({ error: "At least one classmate or friend must be invited (cannot invite yourself)" }, { status: 400 });
    }

    const { data: category } = await supabase
      .from("exam_categories")
      .select("id")
      .eq("id", category_id)
      .maybeSingle();

    if (!category) {
      return NextResponse.json({ error: "Invalid exam category" }, { status: 400 });
    }

    const { data: myProfile } = await supabase
      .from("user_profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const creatorName = myProfile?.full_name || myProfile?.username || "A friend";

    const adminClient = createAdminClient();

    // Verify each invitee exists in the system
    for (const inviteeId of cleanInviteUserIds) {
      const { data: inviteeProfile } = await adminClient
        .from("user_profiles")
        .select("id")
        .eq("id", inviteeId)
        .maybeSingle();

      if (!inviteeProfile) {
        return NextResponse.json({ error: "One or more invited users could not be found" }, { status: 404 });
      }
    }

    const { data: challenge, error: challengeError } = await adminClient
      .from("exam_challenges")
      .insert([{
        creator_id: user.id,
        category_id,
        category_name,
        status: "pending",
      }])
      .select()
      .single();

    if (challengeError) throw new Error(challengeError.message || "Failed to create challenge");

    const participants = [
      { challenge_id: challenge.id, user_id: user.id, status: "ready", ready_at: new Date().toISOString() },
      ...cleanInviteUserIds.map((id: string) => ({
        challenge_id: challenge.id,
        user_id: id,
        status: "pending",
      })),
    ];

    const { error: participantError } = await adminClient
      .from("exam_challenge_participants")
      .insert(participants);

    if (participantError) throw new Error(participantError.message || "Failed to add participants");

    for (const inviteeId of cleanInviteUserIds) {
      try {
        await adminClient.from("notifications").insert({
          target_user_id: inviteeId,
          type: "exam_challenge_invite",
          title: "Group Exam Invite",
          message: `${creatorName} invited you to the "${category_name}" group exam.`,
          data: {
            sender_id: user.id,
            sender_name: creatorName,
            challenge_id: challenge.id,
            category_name,
          },
          sender_id: user.id,
          sender_name: creatorName,
          action_url: "/dashboard#classmates",
        });
      } catch (notifError) {
        console.error("Failed to insert notification for", inviteeId, notifError);
      }

      try {
        const { data: existingConv } = await adminClient
          .from("chat_conversations")
          .select("id")
          .or(`and(driver_id.eq.${user.id},student_id.eq.${inviteeId}),and(driver_id.eq.${inviteeId},student_id.eq.${user.id})`)
          .maybeSingle();

        let conversationId = existingConv?.id;

        if (!conversationId) {
          const { data: newConv } = await adminClient
            .from("chat_conversations")
            .insert([{ driver_id: user.id, student_id: inviteeId }])
            .select()
            .single();
          conversationId = newConv?.id;
        }

        if (conversationId) {
          await adminClient.from("chat_messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: `🏆 ${creatorName} invited you to take the "${category_name}" exam together.`,
          });

          await adminClient
            .from("chat_conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversationId);
        }
      } catch (chatError) {
        console.error("Failed to send chat message to", inviteeId, chatError);
      }
    }

    return NextResponse.json({ challenge, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
