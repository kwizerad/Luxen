import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeExamSettings, isWithinAvailabilityWindow, questionHasAnyImage, shuffle } from "@/lib/exam-settings";
import type { ExamQuestion, ExamQuestionSortingMode } from "@/lib/database.types";

function isMissingExamSettingsTableError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("schema cache")
  );
}

function pickQuestions(
  all: ExamQuestion[],
  count: number,
  mode: ExamQuestionSortingMode,
): ExamQuestion[] {
  const withPic = all.filter(questionHasAnyImage);
  const textOnly = all.filter((q) => !questionHasAnyImage(q));

  if (mode === "TEXT_ONLY") return shuffle(textOnly).slice(0, count);
  if (mode === "WITH_PICTURE") return shuffle(withPic).slice(0, count);
  if (mode === "MIXED_50") {
    const half = Math.floor(count / 2);
    const first = shuffle(withPic).slice(0, half);
    const second = shuffle(textOnly).slice(0, count - first.length);
    return shuffle([...first, ...second]).slice(0, count);
  }
  // RANDOM
  return shuffle(all).slice(0, count);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) return NextResponse.json({ error: "categoryId is required" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check daily exam limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get user's daily limit
    const { data: userLimit, error: limitError } = await supabase
      .from("user_exam_limits")
      .select("daily_limit")
      .eq("user_id", user.id)
      .single();

    if (limitError && limitError.code !== "PGRST116") {
      console.error("Error fetching user limit:", limitError);
    }

    const dailyLimit = userLimit?.daily_limit ?? 5;

    // Count today's attempts
    const { count: attemptsToday, error: countError } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", today.toISOString())
      .lt("started_at", tomorrow.toISOString());

    if (countError) {
      console.error("Error counting attempts:", countError);
    }

    const attemptsCount = attemptsToday || 0;

    if (attemptsCount >= dailyLimit) {
      return NextResponse.json({
        error: `Daily exam limit reached. You can take ${dailyLimit} exam(s) per day. Please try again tomorrow.`,
        daily_limit: dailyLimit,
        attempts_today: attemptsCount,
        remaining_attempts: 0,
      }, { status: 429 });
    }

    // Load settings (defaults if missing)
    const { data: rawSettings, error: settingsError } = await supabase
      .from("exam_settings")
      .select("question_count,duration_minutes,sorting_mode,available_from,available_to")
      .eq("category_id", categoryId)
      .maybeSingle();

    if (settingsError && !isMissingExamSettingsTableError(String(settingsError.message || ""))) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const settings = normalizeExamSettings(rawSettings ?? undefined);
    const now = new Date();
    if (!isWithinAvailabilityWindow(now, settings.available_from, settings.available_to)) {
      return NextResponse.json({ error: "Exam is not available at this time." }, { status: 403 });
    }

    const { data: questions, error: qError } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("category_id", categoryId);

    if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });

    const picked = pickQuestions((questions ?? []) as ExamQuestion[], settings.question_count, settings.sorting_mode);

    return NextResponse.json({
      categoryId,
      settings,
      totalAvailable: (questions ?? []).length,
      questions: picked,
      serverTime: now.toISOString(),
      daily_limit: dailyLimit,
      attempts_today: attemptsCount,
      remaining_attempts: dailyLimit - attemptsCount - 1, // -1 for current exam
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

