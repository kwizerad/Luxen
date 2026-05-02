import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdmin, canAddQuestions, hasReadWriteQuestionAccess } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is admin
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    
    let query = supabase.from("exam_questions").select("*");
    
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    
    const { data: questions, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Refresh session to ensure it's valid
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return NextResponse.json({ error: "Session expired. Please refresh and try again." }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized. You must be an admin to add questions." }, { status: 403 });
    }

    // Check if user can add questions
    if (!canAddQuestions(user)) {
      return NextResponse.json({ error: "You don't have permission to add questions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      category_id,
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
    } = body;

    // Validate required fields
    if (!category_id || !correct_answer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that question has at least text OR image
    if ((!question || question.trim() === "") && (!question_image || question_image.trim() === "")) {
      return NextResponse.json({ error: "Question must have either text or an image" }, { status: 400 });
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
      return NextResponse.json({ error: optionErrors.join("; ") }, { status: 400 });
    }

    if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
      return NextResponse.json({ error: "Invalid correct answer" }, { status: 400 });
    }

    // Check for duplicate question - same text and all options must match
    const normalizedQuestion = question?.trim().toLowerCase() || "";
    const { data: existingQuestions, error: checkError } = await supabase
      .from("exam_questions")
      .select("id, question, option_a, option_b, option_c, option_d")
      .eq("category_id", category_id)
      .ilike("question", normalizedQuestion);

    if (checkError) {
      return NextResponse.json({ error: "Error checking for duplicates" }, { status: 500 });
    }

    // Check if any existing question has the exact same text and all matching options
    const isDuplicate = existingQuestions?.some((q) => {
      const normalize = (str: string | null | undefined) => (str?.trim().toLowerCase() || "");
      const questionTextMatch = normalize(q.question) === normalizedQuestion;
      const optionAMatch = normalize(q.option_a) === normalize(option_a);
      const optionBMatch = normalize(q.option_b) === normalize(option_b);
      const optionCMatch = normalize(q.option_c) === normalize(option_c);
      const optionDMatch = normalize(q.option_d) === normalize(option_d);

      return questionTextMatch && optionAMatch && optionBMatch && optionCMatch && optionDMatch;
    });

    if (isDuplicate) {
      return NextResponse.json(
        { error: "A question with the same text and identical options already exists in this category" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("exam_questions")
      .insert([{
        category_id,
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
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if user has read-write access to questions
    if (!hasReadWriteQuestionAccess(user)) {
      return NextResponse.json({ error: "You don't have permission to edit questions" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_questions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if user has read-write access to questions
    if (!hasReadWriteQuestionAccess(user)) {
      return NextResponse.json({ error: "You don't have permission to delete questions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("exam_questions")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
