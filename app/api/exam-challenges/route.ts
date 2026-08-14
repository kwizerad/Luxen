import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get("with_user");

    let challengeIds: string[] = [];

    if (withUserId) {
      const { data: myParticipations } = await supabase
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      const myChallengeIds = (myParticipations || []).map((p) => p.challenge_id);

      const { data: createdChallenges } = await supabase
        .from("exam_challenges")
        .select("id")
        .eq("creator_id", user.id);

      const createdIds = (createdChallenges || []).map((c) => c.id);

      const allMyIds = new Set([...myChallengeIds, ...createdIds]);
      if (allMyIds.size === 0) {
        return NextResponse.json({ challenges: [] });
      }

      const { data: otherParticipations } = await supabase
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", withUserId)
        .in("challenge_id", Array.from(allMyIds));

      const otherChallengeIds = new Set((otherParticipations || []).map((p) => p.challenge_id));

      const { data: otherCreated } = await supabase
        .from("exam_challenges")
        .select("id")
        .eq("creator_id", withUserId)
        .in("id", Array.from(allMyIds));

      (otherCreated || []).forEach((c) => otherChallengeIds.add(c.id));

      challengeIds = Array.from(otherChallengeIds);
    } else {
      const { data: myParticipations } = await supabase
        .from("exam_challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);

      const { data: createdChallenges } = await supabase
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

    const { data: challenges, error } = await supabase
      .from("exam_challenges")
      .select("*")
      .in("id", challengeIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: participants } = await supabase
      .from("exam_challenge_participants")
      .select("*")
      .in("challenge_id", challengeIds);

    const participantMap: Record<string, any[]> = {};
    for (const p of participants || []) {
      if (!participantMap[p.challenge_id]) participantMap[p.challenge_id] = [];
      participantMap[p.challenge_id].push(p);
    }

    const allUserIds = new Set<string>();
    for (const ps of Object.values(participantMap)) {
      for (const p of ps) allUserIds.add(p.user_id);
    }
    for (const c of challenges || []) allUserIds.add(c.creator_id);

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

    if (!invite_user_ids || !Array.isArray(invite_user_ids) || invite_user_ids.length === 0) {
      return NextResponse.json({ error: "At least one friend must be invited" }, { status: 400 });
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

    for (const inviteeId of invite_user_ids) {
      const { data: friendship } = await supabase
        .from("classmate_requests")
        .select("id")
        .eq("status", "accepted")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${inviteeId}),and(sender_id.eq.${inviteeId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (!friendship) {
        return NextResponse.json({ error: "Only friends can be invited" }, { status: 403 });
      }
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("exam_challenges")
      .insert([{
        creator_id: user.id,
        category_id,
        category_name,
        status: "pending",
      }])
      .select()
      .single();

    if (challengeError) throw challengeError;

    const participants = [
      { challenge_id: challenge.id, user_id: user.id, status: "ready", ready_at: new Date().toISOString() },
      ...invite_user_ids.map((id: string) => ({
        challenge_id: challenge.id,
        user_id: id,
        status: "pending",
      })),
    ];

    const { error: participantError } = await supabase
      .from("exam_challenge_participants")
      .insert(participants);

    if (participantError) throw participantError;

    const adminClient = createAdminClient();

    for (const inviteeId of invite_user_ids) {
      await adminClient.from("notifications").insert({
        target_user_id: inviteeId,
        type: "exam_challenge_invite",
        title: "Group Exam Invitation",
        message: `Your friend ${creatorName} wishes to take an exam together with you: ${category_name}. Check your Classmates chat to join!`,
        data: {
          sender_id: user.id,
          sender_name: creatorName,
          challenge_id: challenge.id,
          category_name,
        },
        action_url: "/dashboard#classmates",
      });

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
          message: `Your friend ${creatorName} wishes to take an exam together with you: ${category_name}. Check the challenge card above to join!`,
        });

        await adminClient
          .from("chat_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    }

    return NextResponse.json({ challenge, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create exam challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
