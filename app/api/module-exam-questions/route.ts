import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// GET all module exam questions (admin only)
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

    let query = adminSupabase.from("module_exam_questions").select("*");

    if (moduleId) {
      query = query.eq("module_id", moduleId);
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ questions: data });
  } catch (error: any) {
    console.error("Error fetching module exam questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch module exam questions", details: error.message },
      { status: 500 }
    );
  }
}

// POST create new module exam question (admin only)
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
      question,
      question_image,
      option_a,
      option_a_image,
      option_b,
      option_b_image,
      option_c,
      option_c_image,
      option_d,
      option_d_image,
      correct_answer,
      explanation,
      order_index,
      is_published
    } = body;

    if (!module_id || !correct_answer) {
      return NextResponse.json(
        { error: "module_id and correct_answer are required" },
        { status: 400 }
      );
    }

    // Validate that question has at least text OR image
    if ((!question || question.trim() === "") && (!question_image || question_image.trim() === "")) {
      return NextResponse.json(
        { error: "Question must have either text or an image" },
        { status: 400 }
      );
    }

    // Validate that each option has at least text OR image
    const validateOption = (text: string | undefined, image: string | undefined, optionName: string) => {
      if ((!text || text.trim() === "") && (!image || image.trim() === "")) {
        return `${optionName} must have either text or an image`;
      }
      return null;
    };

    const optionErrors = [
      validateOption(option_a, option_a_image, "Option A"),
      validateOption(option_b, option_b_image, "Option B"),
      validateOption(option_c, option_c_image, "Option C"),
      validateOption(option_d, option_d_image, "Option D"),
    ].filter(Boolean);

    if (optionErrors.length > 0) {
      return NextResponse.json(
        { error: optionErrors.join(", ") },
        { status: 400 }
      );
    }

    // Get the highest order_index for this module if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingQuestions } = await adminSupabase
        .from("module_exam_questions")
        .select("order_index")
        .eq("module_id", module_id)
        .order("order_index", { ascending: false })
        .limit(1);

      finalOrderIndex = existingQuestions && existingQuestions.length > 0
        ? existingQuestions[0].order_index + 1
        : 0;
    }

    const { data, error } = await adminSupabase
      .from("module_exam_questions")
      .insert([{
        module_id,
        question: question || null,
        question_image: question_image || null,
        option_a: option_a || null,
        option_a_image: option_a_image || null,
        option_b: option_b || null,
        option_b_image: option_b_image || null,
        option_c: option_c || null,
        option_c_image: option_c_image || null,
        option_d: option_d || null,
        option_d_image: option_d_image || null,
        correct_answer,
        explanation: explanation || null,
        order_index: finalOrderIndex,
        is_published: is_published || false,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating module exam question:", error);
    return NextResponse.json(
      { error: "Failed to create module exam question", details: error.message },
      { status: 500 }
    );
  }
}
