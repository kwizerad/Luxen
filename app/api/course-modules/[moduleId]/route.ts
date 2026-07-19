import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// PATCH update module (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
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
    const { title, description, title_translations, description_translations, order_index, is_published } = body;

    const { data, error } = await adminSupabase
      .from("course_modules")
      .update({
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        title_translations: title_translations !== undefined ? title_translations : undefined,
        description_translations: description_translations !== undefined ? description_translations : undefined,
        order_index: order_index !== undefined ? order_index : undefined,
        is_published: is_published !== undefined ? is_published : undefined,
        updated_by: user.id,
      })
      .eq("id", moduleId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ module: data });
  } catch (error: any) {
    console.error("Error updating module:", error);
    return NextResponse.json(
      { error: "Failed to update module", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE module (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params;
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
      .from("course_modules")
      .delete()
      .eq("id", moduleId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting module:", error);
    return NextResponse.json(
      { error: "Failed to delete module", details: error.message },
      { status: 500 }
    );
  }
}
