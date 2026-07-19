import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// PATCH update module exam question (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
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

    const { data, error } = await adminSupabase
      .from("module_exam_questions")
      .update({
        question: question !== undefined ? question : undefined,
        question_image: question_image !== undefined ? question_image : undefined,
        option_a: option_a !== undefined ? option_a : undefined,
        option_a_image: option_a_image !== undefined ? option_a_image : undefined,
        option_b: option_b !== undefined ? option_b : undefined,
        option_b_image: option_b_image !== undefined ? option_b_image : undefined,
        option_c: option_c !== undefined ? option_c : undefined,
        option_c_image: option_c_image !== undefined ? option_c_image : undefined,
        option_d: option_d !== undefined ? option_d : undefined,
        option_d_image: option_d_image !== undefined ? option_d_image : undefined,
        correct_answer: correct_answer !== undefined ? correct_answer : undefined,
        explanation: explanation !== undefined ? explanation : undefined,
        order_index: order_index !== undefined ? order_index : undefined,
        is_published: is_published !== undefined ? is_published : undefined,
        updated_by: user.id,
      })
      .eq("id", questionId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ question: data });
  } catch (error: any) {
    console.error("Error updating module exam question:", error);
    return NextResponse.json(
      { error: "Failed to update module exam question", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE module exam question (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
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
      .from("module_exam_questions")
      .delete()
      .eq("id", questionId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting module exam question:", error);
    return NextResponse.json(
      { error: "Failed to delete module exam question", details: error.message },
      { status: 500 }
    );
  }
}
