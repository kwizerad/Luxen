import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";
import type { CourseLanguageCourse } from "@/lib/database.types";

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
    const { data: languages, error } = await adminSupabase
      .from("course_languages")
      .select("*")
      .order("order_index");

    if (error) throw error;
    return NextResponse.json({ languages });
  } catch (error: any) {
    console.error("Error fetching course languages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { language, is_published } = body;

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();
    const { data: languageCourse, error } = await adminSupabase
      .from("course_languages")
      .insert({
        language,
        title: language, // Use language name as title initially
        is_published: is_published || false,
        order_index: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ language: languageCourse }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating course language:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
