import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageExamSettings } from "@/lib/permissions";
import { normalizeExamSettings } from "@/lib/exam-settings";
import type { ExamQuestionSortingMode } from "@/lib/database.types";

function isSortingMode(v: unknown): v is ExamQuestionSortingMode {
  return v === "RANDOM" || v === "TEXT_ONLY" || v === "WITH_PICTURE" || v === "MIXED_50";
}

function isMissingExamSettingsTableError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find the table") ||
    m.includes("schema cache")
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Users can read settings (to start an exam), admins can read+write.
    const { data, error } = await supabase
      .from("exam_settings")
      .select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to")
      .eq("category_id", categoryId)
      .maybeSingle();

    // If table doesn't exist yet or row missing, still return defaults.
    if (error && !isMissingExamSettingsTableError(String(error.message || ""))) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      categoryId,
      settings: normalizeExamSettings(data ?? undefined),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !canManageExamSettings(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const categoryId = body?.categoryId as string | undefined;
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const question_count = Number(body?.question_count);
    const duration_minutes = Number(body?.duration_minutes);
    const sorting_mode = body?.sorting_mode as unknown;
    const available_from = (body?.available_from ?? null) as string | null;
    const available_to = (body?.available_to ?? null) as string | null;

    if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
      return NextResponse.json({ error: "question_count must be between 1 and 200" }, { status: 400 });
    }
    if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
      return NextResponse.json({ error: "duration_minutes must be between 1 and 300" }, { status: 400 });
    }
    if (!isSortingMode(sorting_mode)) {
      return NextResponse.json({ error: "Invalid sorting_mode" }, { status: 400 });
    }

    // Upsert by category_id
    const { data, error } = await supabase
      .from("exam_settings")
      .upsert([{
        category_id: categoryId,
        question_count,
        duration_minutes,
        sorting_mode,
        available_from,
        available_to,
        updated_by: user.id,
      }], { onConflict: "category_id" })
      .select("category_id,question_count,duration_minutes,sorting_mode,available_from,available_to")
      .single();

    if (error) {
      if (isMissingExamSettingsTableError(String(error.message || ""))) {
        return NextResponse.json({
          error: "Missing database table exam_settings. Create it in Supabase first.",
        }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      categoryId,
      settings: normalizeExamSettings(data),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

