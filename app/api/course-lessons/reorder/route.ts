import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// POST reorder lessons (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user. Prefer the Authorization header token sent by the client,
    // and fall back to the cookie-based session.
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const { data: { user }, error: authError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();

    const body = await request.json();
    const { lessons } = body;

    if (!Array.isArray(lessons)) {
      return NextResponse.json({ error: "lessons must be an array" }, { status: 400 });
    }

    // Update each lesson's order_index
    const updates = lessons.map((lesson: { id: string; order_index: number }) =>
      adminSupabase
        .from("course_lessons")
        .update({ order_index: lesson.order_index, updated_by: user.id })
        .eq("id", lesson.id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reordering lessons:", error);
    return NextResponse.json(
      { error: "Failed to reorder lessons", details: error.message },
      { status: 500 }
    );
  }
}
