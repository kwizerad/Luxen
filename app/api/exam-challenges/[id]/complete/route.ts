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

    const body = await request.json();
    const { exam_attempt_id } = body;

    if (!exam_attempt_id) {
      return NextResponse.json({ error: "Exam attempt ID is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: updated, error } = await adminClient
      .from("exam_challenge_participants")
      .update({
        status: "completed",
        exam_attempt_id,
        completed_at: new Date().toISOString(),
      })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    const { data: participants } = await adminClient
      .from("exam_challenge_participants")
      .select("status")
      .eq("challenge_id", params.id)
      .in("status", ["joined", "ready", "completed"]);

    if (participants && participants.length > 0) {
      const allCompleted = participants.every((p) => p.status === "completed");
      if (allCompleted) {
        await adminClient
          .from("exam_challenges")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", params.id);
      }
    }

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete challenge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

