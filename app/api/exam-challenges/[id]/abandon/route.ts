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

    // Mark user participation as abandoned
    const { data: updated, error } = await adminClient
      .from("exam_challenge_participants")
      .update({
        status: "abandoned",
        completed_at: new Date().toISOString(),
      })
      .eq("challenge_id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Check if all joined participants have finished (completed or abandoned)
    const { data: participants } = await adminClient
      .from("exam_challenge_participants")
      .select("status")
      .eq("challenge_id", params.id)
      .in("status", ["joined", "ready", "in_progress", "completed", "abandoned"]);

    if (participants && participants.length > 0) {
      const allFinished = participants.every((p) => p.status === "completed" || p.status === "abandoned");
      if (allFinished) {
        await adminClient
          .from("exam_challenges")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", params.id);
      }
    }

    return NextResponse.json({ participant: updated, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record exam abandonment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
