import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// GET module exam settings (admin only)
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

    if (!moduleId) {
      return NextResponse.json({ error: "module_id is required" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("module_exam_settings")
      .select("*")
      .eq("module_id", moduleId)
      .maybeSingle();

    if (error) throw error;

    // Return default settings if none exist
    if (!data) {
      return NextResponse.json({
        settings: {
          question_count: 20,
          duration_minutes: 20,
          passing_score: 70,
          randomize_questions: true,
          randomize_answers: true,
          max_attempts: 3,
        }
      });
    }

    return NextResponse.json({ settings: data });
  } catch (error: any) {
    console.error("Error fetching module exam settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch module exam settings", details: error.message },
      { status: 500 }
    );
  }
}

// POST or UPSERT module exam settings (admin only)
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
    const {
      module_id,
      question_count,
      duration_minutes,
      passing_score,
      randomize_questions,
      randomize_answers,
      max_attempts
    } = body;

    if (!module_id) {
      return NextResponse.json({ error: "module_id is required" }, { status: 400 });
    }

    if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
      return NextResponse.json({ error: "question_count must be between 1 and 200" }, { status: 400 });
    }

    if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
      return NextResponse.json({ error: "duration_minutes must be between 1 and 300" }, { status: 400 });
    }

    if (!Number.isFinite(passing_score) || passing_score < 0 || passing_score > 100) {
      return NextResponse.json({ error: "passing_score must be between 0 and 100" }, { status: 400 });
    }

    if (!Number.isFinite(max_attempts) || max_attempts < 1 || max_attempts > 10) {
      return NextResponse.json({ error: "max_attempts must be between 1 and 10" }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from("module_exam_settings")
      .upsert([{
        module_id,
        question_count: question_count || 20,
        duration_minutes: duration_minutes || 20,
        passing_score: passing_score || 70,
        randomize_questions: randomize_questions !== undefined ? randomize_questions : true,
        randomize_answers: randomize_answers !== undefined ? randomize_answers : true,
        max_attempts: max_attempts || 3,
        updated_by: user.id,
      }], { onConflict: "module_id" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error saving module exam settings:", error);
    return NextResponse.json(
      { error: "Failed to save module exam settings", details: error.message },
      { status: 500 }
    );
  }
}
