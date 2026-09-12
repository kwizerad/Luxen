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
    const challengeId = params.id;

    // Fetch challenge
    const { data: challenge } = await adminClient
      .from("exam_challenges")
      .select("id, creator_id, category_name, created_at, status")
      .eq("id", challengeId)
      .maybeSingle();

    if (!challenge) {
      return NextResponse.json({ status: "already_removed" });
    }

    // Only pending challenges where no one has completed or started
    if (challenge.status === "completed") {
      return NextResponse.json({ error: "Cannot delete completed challenge" }, { status: 400 });
    }

    // Fetch participants
    const { data: participants } = await adminClient
      .from("exam_challenge_participants")
      .select("user_id, status, exam_attempt_id, score")
      .eq("challenge_id", challengeId);

    const hasActiveTakers = (participants || []).some(
      (p) => p.status === "in_progress" || p.status === "completed" || p.score !== null || p.exam_attempt_id !== null
    );

    const doneAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ")";

    // If no one took the exam, delete it and leave notifications
    if (!hasActiveTakers) {
      const allUserIds = Array.from(
        new Set([
          challenge.creator_id,
          ...(participants || []).map((p) => p.user_id),
        ].filter(Boolean))
      );

      if (allUserIds.length > 0) {
        const notifRows = allUserIds.map((uid) => ({
          target_user_id: uid,
          type: "warning",
          title: "Group Exam Cancelled",
          message: `The group exam for "${challenge.category_name || "Driving Knowledge"}" was automatically cancelled and removed because no one took or joined the exam before the waiting time expired. Done at ${doneAt}.`,
          data: {
            challenge_id: challenge.id,
            category_name: challenge.category_name,
            action: "auto_deleted_expired_exam",
            done_at: doneAt,
          },
          sender_name: "System",
          action_url: "/dashboard#classmates",
        }));

        await adminClient.from("notifications").insert(notifRows);
      }

      await adminClient
        .from("exam_challenge_participants")
        .delete()
        .eq("challenge_id", challengeId);

      await adminClient
        .from("exam_challenges")
        .delete()
        .eq("id", challengeId);

      return NextResponse.json({
        status: "deleted",
        message: `Challenge removed and notification created. Done at ${doneAt}`,
        doneAt,
      });
    }

    return NextResponse.json({ status: "has_active_takers", message: "Challenge has participants taking the exam" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to expire challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
