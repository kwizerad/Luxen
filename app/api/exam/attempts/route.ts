import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { ExamAttempt, ExamAnswer } from "@/lib/database.types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const attemptId = searchParams.get("attemptId");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If requesting specific attempt
    if (attemptId) {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("id", attemptId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Users can only see their own attempts, admins can see all
      if (attempt.user_id !== user.id) {
        const { isAdmin } = await import("@/lib/permissions");
        if (!isAdmin(user)) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }

      return NextResponse.json({ attempt });
    }

    // If requesting user's attempts
    if (userId) {
      // Users can only see their own attempts, admins can see all
      if (userId !== user.id) {
        const { isAdmin } = await import("@/lib/permissions");
        if (!isAdmin(user)) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }

      const { data: attempts, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ attempts });
    }

    // If no specific request, return current user's attempts
    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      category_id,
      category_name,
      total_questions,
      answers,
      duration_seconds,
    } = body;

    if (!category_id || !category_name || !total_questions || !answers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate score
    let correctAnswers = 0;
    const processedAnswers: ExamAnswer[] = answers.map((ans: any) => ({
      question_id: ans.question_id,
      selected_answer: ans.selected_answer,
      is_correct: ans.is_correct || false,
      time_spent_seconds: ans.time_spent_seconds,
    }));

    processedAnswers.forEach((ans) => {
      if (ans.is_correct) correctAnswers++;
    });

    const scorePercentage = Math.round((correctAnswers / total_questions) * 100);

    const { data, error } = await supabase
      .from("exam_attempts")
      .insert([{
        user_id: user.id,
        category_id,
        category_name,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds,
        total_questions,
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        answers: processedAnswers,
        status: 'completed',
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempt: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
