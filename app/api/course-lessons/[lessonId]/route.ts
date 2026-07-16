import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// PATCH update lesson (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
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
    const { title, content, content_type, media_url, order_index, is_published } = body;

    const { data, error } = await adminSupabase
      .from("course_lessons")
      .update({
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        content_type: content_type !== undefined ? content_type : undefined,
        media_url: media_url !== undefined ? media_url : undefined,
        order_index: order_index !== undefined ? order_index : undefined,
        is_published: is_published !== undefined ? is_published : undefined,
        updated_by: user.id,
      })
      .eq("id", params.lessonId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lesson: data });
  } catch (error: any) {
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "Failed to update lesson", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE lesson (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
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

    const { error } = await adminSupabase
      .from("course_lessons")
      .delete()
      .eq("id", params.lessonId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson", details: error.message },
      { status: 500 }
    );
  }
}
