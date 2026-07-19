import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// GET all lessons (admin only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("module_id");

    let query = adminSupabase.from("course_lessons").select("*");

    if (moduleId) {
      query = query.eq("module_id", moduleId);
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ lessons: data });
  } catch (error: any) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons", details: error.message },
      { status: 500 }
    );
  }
}

// POST create new lesson (admin only)
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
    const { module_id, title, content, title_translations, content_translations, content_type, media_url, image_url, order_index, is_published } = body;

    // Content is required for text and mixed types, but not for image-only, video, or document
    const requiresContent = content_type === 'text' || content_type === 'mixed';
    if (!module_id || !title || (requiresContent && !content)) {
      return NextResponse.json(
        { error: requiresContent ? "module_id, title, and content are required" : "module_id and title are required" },
        { status: 400 }
      );
    }

    // Get the highest order_index for this module if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingLessons } = await adminSupabase
        .from("course_lessons")
        .select("order_index")
        .eq("module_id", module_id)
        .order("order_index", { ascending: false })
        .limit(1);

      finalOrderIndex = existingLessons && existingLessons.length > 0
        ? existingLessons[0].order_index + 1
        : 0;
    }

    const { data, error } = await adminSupabase
      .from("course_lessons")
      .insert([{
        module_id,
        title,
        content: content || '',
        title_translations: title_translations || {},
        content_translations: content_translations || {},
        content_type: content_type || 'text',
        media_url: media_url || null,
        image_url: image_url || null,
        order_index: finalOrderIndex,
        is_published: is_published || false,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lesson: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "Failed to create lesson", details: error.message },
      { status: 500 }
    );
  }
}
