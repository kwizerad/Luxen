import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalAdminClient, EXTERNAL_EXAM_CATEGORY_ID, isExternalModuleId } from "@/lib/supabase/external";

export const dynamic = "force-dynamic";

const DEFAULT_EXAM_SETTINGS = {
  question_count: 20,
  duration_minutes: 20,
  sorting_mode: "random",
  passing_percentage: 70,
  available_from: null as string | null,
  available_to: null as string | null,
};

function mapExternalChoiceToLetter(idx: number): "A" | "B" | "C" | "D" {
  if (idx === 1) return "B";
  if (idx === 2) return "C";
  if (idx === 3) return "D";
  return "A";
}

function parseExternalChoices(choice: any): string[] {
  if (Array.isArray(choice)) {
    return choice.map((c) => String(c ?? ""));
  }
  if (typeof choice === "string") {
    try {
      const parsed = JSON.parse(choice);
      if (Array.isArray(parsed)) return parsed.map((c) => String(c ?? ""));
    } catch {}
    return [choice];
  }
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const adminSb = createAdminClient();
    const extSb = await getExternalAdminClient();

    if (!extSb) {
      return NextResponse.json(
        { error: "External Supabase database is not configured." },
        { status: 500 }
      );
    }

    // Load external config from system_config
    const { data: configRows } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", [
        "external_exam_published",
        "external_exam_title",
        "external_exam_duration_minutes",
        "external_exam_question_count",
        "external_course_published",
        "external_course_quiz_settings",
      ]);

    const configMap = new Map<string, string>();
    for (const row of configRows || []) {
      if (row.key && row.value !== undefined && row.value !== null) {
        configMap.set(String(row.key), String(row.value));
      }
    }

    let quizSettings: {
      globalDurationMinutes: number;
      globalQuestionCount: number;
      perCourse: Record<string, { durationMinutes?: number; questionCount?: number }>;
    } = {
      globalDurationMinutes: 20,
      globalQuestionCount: 20,
      perCourse: {},
    };

    const rawQuizSettings = configMap.get("external_course_quiz_settings");
    if (rawQuizSettings) {
      try {
        const parsed = JSON.parse(rawQuizSettings);
        if (parsed && typeof parsed === "object") {
          quizSettings = {
            globalDurationMinutes: Number(parsed.globalDurationMinutes) || 20,
            globalQuestionCount: Number(parsed.globalQuestionCount) || 20,
            perCourse: parsed.perCourse && typeof parsed.perCourse === "object" ? parsed.perCourse : {},
          };
        }
      } catch {}
    }

    // ------------------------------------------------------------------------
    // 1. TAKE STANDALONE / GROUP MOCK EXAM FROM EXTERNAL QUESTIONS
    // ------------------------------------------------------------------------
    if (action === "take_exam") {
      const { categoryId, challengeId } = body;
      const durationMinutes = Number(configMap.get("external_exam_duration_minutes")) || 20;
      const questionCount = Number(configMap.get("external_exam_question_count")) || 20;

      const { data: allExtQuestions, error: qErr } = await extSb
        .from("questions")
        .select("*")
        .order("question_numbers", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });

      if (qErr) throw qErr;

      const formattedPool = (allExtQuestions || []).map((q: any) => {
        const choices = parseExternalChoices(q.choice);
        const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
        return {
          id: String(q.id),
          category_id: categoryId || EXTERNAL_EXAM_CATEGORY_ID,
          question: String(q.title || ""),
          question_image: q.image || null,
          option_a: choices[0] || "Option A",
          option_a_image: null,
          option_b: choices[1] || "Option B",
          option_b_image: null,
          option_c: choices[2] || "Option C",
          option_c_image: null,
          option_d: choices[3] || "Option D",
          option_d_image: null,
          correct_answer: mapExternalChoiceToLetter(ansIdx),
          explanation: null,
          created_at: q.created_at || new Date().toISOString(),
        };
      });

      let selectedQuestions = formattedPool;

      // Support shared question order for group challenges
      if (challengeId) {
        const { data: challengeData } = await adminSb
          .from("exam_challenges")
          .select("id, question_ids")
          .eq("id", challengeId)
          .maybeSingle();

        if (
          challengeData?.question_ids &&
          Array.isArray(challengeData.question_ids) &&
          challengeData.question_ids.length > 0
        ) {
          const byId = new Map(formattedPool.map((q) => [q.id, q]));
          const ordered = challengeData.question_ids
            .map((id: string) => byId.get(id))
            .filter(Boolean) as typeof formattedPool;
          if (ordered.length > 0) {
            selectedQuestions = ordered;
          }
        } else {
          const shuffled = [...formattedPool].sort(() => Math.random() - 0.5);
          selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
          const selectedIds = selectedQuestions.map((q) => q.id);
          await adminSb
            .from("exam_challenges")
            .update({ question_ids: selectedIds })
            .eq("id", challengeId);
        }
      } else {
        const shuffled = [...formattedPool].sort(() => Math.random() - 0.5);
        selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
      }

      // Strip correct_answer before sending to client
      const safeQuestions = selectedQuestions.map(({ correct_answer, explanation, ...rest }) => rest);

      return NextResponse.json({
        categoryId: categoryId || EXTERNAL_EXAM_CATEGORY_ID,
        settings: {
          ...DEFAULT_EXAM_SETTINGS,
          duration_minutes: durationMinutes,
          question_count: questionCount,
        },
        questions: safeQuestions,
        serverTime: new Date().toISOString(),
      });
    }

    // ------------------------------------------------------------------------
    // 2. SUBMIT STANDALONE / GROUP MOCK EXAM FROM EXTERNAL QUESTIONS
    // ------------------------------------------------------------------------
    if (action === "submit_exam") {
      const { attemptData } = body;
      const rawAnswers: Array<{
        question_id: string;
        selected_answer: "A" | "B" | "C" | "D" | null;
        time_spent_seconds: number;
      }> = Array.isArray(attemptData?.answers) ? attemptData.answers : [];

      const questionIds = rawAnswers.map((a) => a.question_id).filter(Boolean);
      const { data: extQuestions } = await extSb
        .from("questions")
        .select("id, choice_answer")
        .in("id", questionIds.length > 0 ? questionIds : ["__none__"]);

      const correctByQuestionId = new Map<string, "A" | "B" | "C" | "D">();
      const questionDetails: Record<string, { correct_answer: string; explanation?: string }> = {};

      for (const q of extQuestions || []) {
        const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
        const letter = mapExternalChoiceToLetter(ansIdx);
        correctByQuestionId.set(String(q.id), letter);
        questionDetails[String(q.id)] = {
          correct_answer: letter,
          explanation: undefined,
        };
      }

      const gradedAnswers = rawAnswers.map((a) => {
        const realCorrect = correctByQuestionId.get(a.question_id);
        const isCorrect =
          Boolean(realCorrect) && Boolean(a.selected_answer) && a.selected_answer === realCorrect;
        return {
          question_id: a.question_id,
          selected_answer: a.selected_answer,
          is_correct: isCorrect,
          time_spent_seconds: a.time_spent_seconds,
        };
      });

      const totalQuestions = Number(attemptData.total_questions) || gradedAnswers.length || 20;
      const correctAnswers = gradedAnswers.filter((a) => a.is_correct).length;
      const scorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      // Ensure external exam category row exists in exam_categories so FK constraint passes
      const catId = attemptData.category_id || EXTERNAL_EXAM_CATEGORY_ID;
      const catName =
        attemptData.category_name ||
        configMap.get("external_exam_title") ||
        "Navo's Mock Exam (External Question Bank)";

      await adminSb.from("exam_categories").upsert(
        {
          id: catId,
          name: catName,
          is_published: configMap.get("external_exam_published") === "true",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      const now = new Date().toISOString();
      const { data: insertedAttempt, error: insertErr } = await adminSb
        .from("exam_attempts")
        .insert({
          user_id: user.id,
          category_id: catId,
          category_name: catName,
          started_at: new Date(Date.now() - (Number(attemptData.duration_seconds) || 0) * 1000).toISOString(),
          completed_at: attemptData.status === "abandoned" ? null : now,
          duration_seconds: Number(attemptData.duration_seconds) || 0,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          score_percentage: scorePercentage,
          answers: gradedAnswers,
          status: attemptData.status || "completed",
          submission_reason: attemptData.submission_reason || "manual",
          violation_summary: attemptData.violation_summary || null,
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({
        success: true,
        attempt: insertedAttempt,
        questionDetails,
      });
    }

    // ------------------------------------------------------------------------
    // 3. TAKE MODULE / MIDTERM / FINAL QUIZ FOR EXTERNAL COURSE
    // ------------------------------------------------------------------------
    if (action === "take_module_exam") {
      const { moduleId, examType = "module" } = body;

      const rawChapterId = String(moduleId || "").replace(/^ext-mod-/, "");
      const courseOverride = quizSettings.perCourse?.[rawChapterId];
      const durationMinutes =
        Number(courseOverride?.durationMinutes) || Number(quizSettings.globalDurationMinutes) || 20;
      const questionCount =
        Number(courseOverride?.questionCount) || Number(quizSettings.globalQuestionCount) || 20;

      let qQuery = extSb
        .from("questions")
        .select("*")
        .order("question_numbers", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });

      if (examType === "module" && rawChapterId) {
        qQuery = qQuery.eq("chapter_id", rawChapterId);
      }

      const { data: rawQuestions, error: qErr } = await qQuery;
      if (qErr) throw qErr;

      let pool = rawQuestions || [];
      // If a specific chapter has fewer questions than requested or 0, fallback to all questions if empty
      if (pool.length === 0) {
        const { data: fallbackQ } = await extSb.from("questions").select("*").limit(100);
        pool = fallbackQ || [];
      }

      const formatted = pool.map((q: any, idx: number) => {
        const choices = parseExternalChoices(q.choice);
        const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
        return {
          id: String(q.id),
          module_id: moduleId || rawChapterId,
          question: String(q.title || ""),
          question_image: q.image || null,
          option_a: choices[0] || "Option A",
          option_a_image: null,
          option_b: choices[1] || "Option B",
          option_b_image: null,
          option_c: choices[2] || "Option C",
          option_c_image: null,
          option_d: choices[3] || "Option D",
          option_d_image: null,
          correct_answer: mapExternalChoiceToLetter(ansIdx),
          explanation: null,
          order_index: idx,
          is_published: true,
          created_at: q.created_at || new Date().toISOString(),
          updated_at: q.updated_at || new Date().toISOString(),
        };
      });

      const shuffled = [...formatted].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

      return NextResponse.json({
        settings: {
          id: `ext-settings-${rawChapterId || examType}`,
          module_id: moduleId || rawChapterId,
          question_count: selected.length,
          duration_minutes: durationMinutes,
          passing_percentage: 70,
          randomize_questions: true,
          randomize_answers: false,
          allow_review: true,
          show_results_immediately: true,
          show_explanations: true,
          max_attempts: 10,
          retake_limit: 10,
          status: "published",
        },
        questions: selected,
      });
    }

    // ------------------------------------------------------------------------
    // 4. SUBMIT MODULE QUIZ FOR EXTERNAL COURSE
    // ------------------------------------------------------------------------
    if (action === "submit_module_exam") {
      const { attemptData } = body;
      const now = new Date().toISOString();

      // Note: module_exam_attempts has a foreign key to course_modules(id) when module_id is non-null.
      // For external course modules, we store module_id: null and preserve the external module ID inside module_title or metadata,
      // AND we also record completion in user_profiles/system_config or return the attempt cleanly.
      const isExtMod = isExternalModuleId(attemptData?.module_id);

      const { data: inserted, error: insErr } = await adminSb
        .from("module_exam_attempts")
        .insert({
          user_id: user.id,
          module_id: isExtMod ? null : attemptData.module_id,
          module_title: attemptData.module_title || (isExtMod ? `External Module (${attemptData.module_id})` : null),
          exam_type: attemptData.exam_type || "module",
          started_at: new Date(Date.now() - (Number(attemptData.duration_seconds) || 0) * 1000).toISOString(),
          completed_at: now,
          duration_seconds: Number(attemptData.duration_seconds) || 0,
          total_questions: Number(attemptData.total_questions) || 0,
          correct_answers: Number(attemptData.correct_answers) || 0,
          score_percentage: Number(attemptData.score_percentage) || 0,
          passed: Boolean(attemptData.passed),
          answers: Array.isArray(attemptData.answers) ? attemptData.answers : [],
          status: attemptData.status || "completed",
        })
        .select("*")
        .single();

      if (insErr) throw insErr;

      return NextResponse.json({
        success: true,
        attempt: {
          ...inserted,
          module_id: attemptData.module_id,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/external-courses/exam error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process external exam action" },
      { status: 500 }
    );
  }
}
