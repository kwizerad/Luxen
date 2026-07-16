import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

export async function DELETE(request: NextRequest, { params }: { params: { attemptId?: string } }) {
  try {
    const attemptId = params?.attemptId;

    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError) {
      console.error("Auth error while deleting exam attempt:", authError);
      return NextResponse.json({ error: "Authentication failed", details: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: attempt, error: fetchError } = await adminSupabase
      .from("exam_attempts")
      .select("id, user_id")
      .eq("id", attemptId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch exam attempt before delete:", fetchError);
      return NextResponse.json({ error: "Failed to fetch exam attempt", details: fetchError.message }, { status: 500 });
    }

    if (!attempt) {
      return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
    }

    if (attempt.user_id !== user.id && !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error: deleteError } = await adminSupabase
      .from("exam_attempts")
      .delete()
      .eq("id", attemptId);

    if (deleteError) {
      console.error("Failed to delete exam attempt with admin client:", deleteError);
      return NextResponse.json({ error: "Failed to delete exam attempt", details: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Unexpected error deleting exam attempt:", error);
    return NextResponse.json(
      {
        error: "Failed to delete exam attempt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
