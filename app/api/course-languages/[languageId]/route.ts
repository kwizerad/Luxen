import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ languageId: string }> }
) {
  try {
    const { languageId } = await params;
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

    const body = await request.json();
    const { language, is_published } = body;

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();
    const { data: languageCourse, error } = await adminSupabase
      .from("course_languages")
      .update({
        is_published,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", languageId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ language: languageCourse });
  } catch (error: any) {
    console.error("Error updating course language:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ languageId: string }> }
) {
  try {
    const { languageId } = await params;
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
      .from("course_languages")
      .delete()
      .eq("id", languageId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting course language:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
