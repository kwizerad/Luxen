import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptPayload, encryptPayload, isEncryptedEnvelope } from "@/lib/e2e-crypto";
import { normalizeCanonicalExamLanguage } from "@/lib/exam-settings";
import { getBuiltinFallbackQuestions } from "@/lib/exam-question-utils";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import { isUUID } from "@/lib/utils";
import type { ExamAnswer } from "@/lib/database.types";

export const dynamic = "force-dynamic";

async function secureJsonResponse(data: unknown, status = 200) {
  const encrypted = await encryptPayload(data);
  return NextResponse.json(encrypted, { status });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body = isEncryptedEnvelope(rawBody) ? await decryptPayload(rawBody) : rawBody;
    const attemptData = body?.attemptData || body || {};

    const {
      category_id,
      category_name,
      total_questions,
      answers,
      duration_seconds = 0,
      status = "completed",
      submission_reason = "manual",
      violation_summary = null,
      is_group_challenge = false,
      exam_language,
    } = attemptData;

    if (!category_id || !total_questions || !Array.isArray(answers)) {
      return secureJsonResponse({ error: "Missing required fields" }, 400);
    }

    const user = await getAuthUserFromRequest(req, body?.accessToken);
    if (!user?.id || !isUUID(user.id)) {
      return secureJsonResponse({ error: "Authentication required" }, 401);
    }
    const adminSb = createAdminClient();

    const resolvedExamLang = normalizeCanonicalExamLanguage(exam_language || body?.language);

    const questionIds: string[] = answers
      .map((ans: any) => String(ans?.question_id || ""))
      .filter(Boolean);
    const uuidQuestionIds = questionIds.filter((id) => isUUID(id));

    const answerKey = new Map<string, { correct_answer: string; explanation?: string }>();
    if (uuidQuestionIds.length > 0) {
      const { data: rows } = await adminSb
        .from("exam_questions")
        .select("id, correct_answer, explanation")
        .in("id", uuidQuestionIds);
      for (const q of rows || []) {
        answerKey.set(String(q.id), {
          correct_answer: q.correct_answer,
          explanation: q.explanation ?? undefined,
        });
      }
    }

    for (const fb of getBuiltinFallbackQuestions("fallback", 20)) {
      if (!answerKey.has(fb.id)) {
        answerKey.set(fb.id, {
          correct_answer: fb.correct_answer,
          explanation: fb.explanation,
        });
      }
    }

    let correctAnswers = 0;
    const gradedAnswers: ExamAnswer[] = answers.map((ans: any) => {
      const qId = String(ans?.question_id || "");
      const selected = ans?.selected_answer ?? null;
      const real = answerKey.get(qId)?.correct_answer;
      const isCorrect = Boolean(real) && Boolean(selected) && selected === real;
      if (isCorrect) correctAnswers++;
      return {
        question_id: qId,
        selected_answer: selected,
        is_correct: isCorrect,
        time_spent_seconds: Number(ans?.time_spent_seconds) || 0,
      };
    });

    const totalNum = Math.max(1, Number(total_questions) || gradedAnswers.length || 20);
    const scorePercentage = Math.round((correctAnswers / totalNum) * 100);
    const questionDetails: Record<string, { correct_answer: string; explanation?: string }> = {};
    answerKey.forEach((value, id) => {
      questionDetails[id] = {
        correct_answer: value.correct_answer,
        explanation: value.explanation,
      };
    });

    // Check fresh admin persistence toggles
    let saveIndividual = true;
    let saveGroup = true;
    try {
      const { data: cfgRows } = await adminSb
        .from("system_config")
        .select("key, value")
        .in("key", ["save_individual_exams_enabled", "save_group_exams_enabled"]);
      for (const r of cfgRows || []) {
        if (r.key === "save_individual_exams_enabled") {
          saveIndividual = String(r.value).toLowerCase() !== "false";
        } else if (r.key === "save_group_exams_enabled") {
          saveGroup = String(r.value).toLowerCase() !== "false";
        }
      }
    } catch {}

    const shouldSaveToDb = Boolean(is_group_challenge ? saveGroup : saveIndividual);
    const isValidUser = Boolean(user?.id && isUUID(user.id));
    const nowIso = new Date().toISOString();
    const startedAtIso = new Date(
      Date.now() - Math.max(0, Number(duration_seconds) || 0) * 1000
    ).toISOString();

    if (shouldSaveToDb && isValidUser && user) {
      let validCategoryId = isUUID(String(category_id))
        ? String(category_id)
        : EXTERNAL_EXAM_CATEGORY_ID;

      try {
        const { data: existingCat } = await adminSb
          .from("exam_categories")
          .select("id")
          .eq("id", validCategoryId)
          .maybeSingle();

        if (!existingCat) {
          const { error: upsertCatErr } = await adminSb
            .from("exam_categories")
            .upsert(
              {
                id: validCategoryId,
                name: String(category_name || "Official Exam"),
                description: "Driving Exam",
              },
              { onConflict: "id", ignoreDuplicates: true }
            );
          if (upsertCatErr) {
            const { data: anyCat } = await adminSb
              .from("exam_categories")
              .select("id")
              .limit(1)
              .maybeSingle();
            if (anyCat?.id) validCategoryId = anyCat.id;
          }
        }

        const { data: inserted, error: insertErr } = await adminSb
          .from("exam_attempts")
          .insert({
            user_id: user.id,
            category_id: validCategoryId,
            category_name: resolvedExamLang,
            started_at: startedAtIso,
            completed_at: status === "abandoned" ? null : nowIso,
            duration_seconds: Math.max(0, Number(duration_seconds) || 0),
            total_questions: totalNum,
            correct_answers: correctAnswers,
            score_percentage: scorePercentage,
            answers: gradedAnswers,
            status,
            submission_reason: submission_reason || "manual",
            violation_summary: violation_summary || null,
            soft_deleted: false,
          })
          .select()
          .single();

        if (!insertErr && inserted) {
          return secureJsonResponse({
            success: true,
            attempt: {
              ...inserted,
              exam_language: resolvedExamLang,
            },
            questionDetails,
            should_save: true,
            is_saved: true,
            storage: "database+browser",
          });
        }
        if (insertErr) {
          console.error("[exam-attempts POST] DB insert failed, falling back to browser:", insertErr.message);
        }
      } catch (dbErr) {
        console.error("[exam-attempts POST] DB persistence exception:", dbErr);
      }
    }

    const browserAttempt = {
      id: `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: isValidUser && user ? user.id : "guest",
      category_id: String(category_id),
      category_name: resolvedExamLang,
      exam_language: resolvedExamLang,
      started_at: startedAtIso,
      completed_at: status === "abandoned" ? null : nowIso,
      duration_seconds: Math.max(0, Number(duration_seconds) || 0),
      total_questions: totalNum,
      correct_answers: correctAnswers,
      score_percentage: scorePercentage,
      answers: gradedAnswers,
      status,
      submission_reason: submission_reason || "manual",
      violation_summary: violation_summary || null,
      created_at: nowIso,
    };

    return secureJsonResponse({
      success: true,
      attempt: browserAttempt,
      questionDetails,
      should_save: shouldSaveToDb,
      is_saved: false,
      storage: "browser",
    });
  } catch (error: any) {
    return secureJsonResponse(
      { error: error?.message || "Failed to submit exam attempt" },
      500
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body = isEncryptedEnvelope(rawBody) ? await decryptPayload(rawBody) : rawBody;
    const attemptId = String(body?.attemptId || "").trim();
    const rawLanguage = body?.language;

    if (!isUUID(attemptId) || !rawLanguage) {
      return secureJsonResponse({ error: "Invalid attemptId or language" }, 400);
    }

    const user = await getAuthUserFromRequest(req, body?.accessToken);
    if (!user?.id || !isUUID(user.id)) {
      return secureJsonResponse({ error: "Authentication required" }, 401);
    }

    const resolvedLang = normalizeCanonicalExamLanguage(String(rawLanguage));
    const adminSb = createAdminClient();

    const { data, error } = await adminSb
      .from("exam_attempts")
      .update({ category_name: resolvedLang })
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .select("id, category_name")
      .maybeSingle();

    if (error) {
      return secureJsonResponse({ error: error.message }, 500);
    }

    return secureJsonResponse({
      success: true,
      attemptId,
      language: resolvedLang,
      updated: Boolean(data),
    });
  } catch (error: any) {
    return secureJsonResponse(
      { error: error?.message || "Failed to update exam attempt language" },
      500
    );
  }
}
