import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getExternalAdminClient,
  EXTERNAL_EXAM_CATEGORY_ID,
} from "@/lib/supabase/external";
import {
  translateTextSnippets,
  type TargetLanguage,
} from "@/lib/ai/tiptap-translator";
import {
  decryptPayload,
  encryptPayload,
  isEncryptedEnvelope,
} from "@/lib/e2e-crypto";
import {
  attachGuestQuotaCookie,
  getGuestExamQuota,
  incrementGuestExamQuota,
} from "@/lib/guest-exam-limit";
import { isUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function secureJsonResponse(data: unknown, status = 200) {
  const encrypted = await encryptPayload(data);
  return NextResponse.json(encrypted, { status });
}

function resolveTargetLang(language?: string | null): TargetLanguage {
  const l = String(language || "").toLowerCase();
  if (l === "en" || l === "english") return "English";
  if (l === "fr" || l === "french" || l === "français") return "French";
  return "Kinyarwanda";
}

function mapExternalChoiceToLetter(idx: number): "A" | "B" | "C" | "D" {
  if (idx === 1) return "B";
  if (idx === 2) return "C";
  if (idx === 3) return "D";
  return "A";
}

function parseExternalChoices(choice: unknown): string[] {
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

async function translateQuestionBatch<
  T extends {
    id: string;
    question?: string | null;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
  }
>(
  adminSb: ReturnType<typeof createAdminClient>,
  questions: T[],
  language?: string | null
): Promise<T[]> {
  const targetLang = resolveTargetLang(language);
  if (targetLang === "Kinyarwanda" || questions.length === 0) {
    return questions;
  }

  try {
    const entityIds = questions.map((q) => `q_trans_${q.id}`);
    const { data: cachedRows } = await adminSb
      .from("course_ai_cache")
      .select("entity_id, content_hash, cached_data")
      .in("entity_id", entityIds)
      .eq("target_language", targetLang)
      .eq("feature_type", "question_translation");

    const cachedMap = new Map<string, { hash: string; data: any }>();
    for (const row of cachedRows || []) {
      if (row.cached_data) {
        cachedMap.set(row.entity_id, {
          hash: row.content_hash,
          data: row.cached_data,
        });
      }
    }

    const toTranslate: {
      qIdx: number;
      qId: string;
      hash: string;
      qText: string;
      optA: string;
      optB: string;
      optC: string;
      optD: string;
    }[] = [];

    const result = questions.map((q) => ({ ...q }));

    for (let i = 0; i < result.length; i++) {
      const q = result[i];
      const qText = String(q.question || "").trim();
      const optA = String(q.option_a || "").trim();
      const optB = String(q.option_b || "").trim();
      const optC = String(q.option_c || "").trim();
      const optD = String(q.option_d || "").trim();
      const combined = `${qText}||${optA}||${optB}||${optC}||${optD}`;
      const hash = crypto.createHash("md5").update(combined).digest("hex");
      const cached = cachedMap.get(`q_trans_${q.id}`);

      if (cached && cached.hash === hash && cached.data) {
        if (cached.data.question) q.question = cached.data.question;
        if (cached.data.option_a) q.option_a = cached.data.option_a;
        if (cached.data.option_b) q.option_b = cached.data.option_b;
        if (cached.data.option_c) q.option_c = cached.data.option_c;
        if (cached.data.option_d) q.option_d = cached.data.option_d;
      } else {
        toTranslate.push({
          qIdx: i,
          qId: q.id,
          hash,
          qText,
          optA,
          optB,
          optC,
          optD,
        });
      }
    }

    if (toTranslate.length > 0) {
      const snippets: { id: number; text: string }[] = [];
      for (let idx = 0; idx < toTranslate.length; idx++) {
        const item = toTranslate[idx];
        const base = idx * 5;
        if (item.qText) snippets.push({ id: base + 0, text: item.qText });
        if (item.optA) snippets.push({ id: base + 1, text: item.optA });
        if (item.optB) snippets.push({ id: base + 2, text: item.optB });
        if (item.optC) snippets.push({ id: base + 3, text: item.optC });
        if (item.optD) snippets.push({ id: base + 4, text: item.optD });
      }

      const translatedMap = await translateTextSnippets(
        snippets,
        "Kinyarwanda",
        targetLang
      );
      const nowStr = new Date().toISOString();
      const upserts = [];

      for (let idx = 0; idx < toTranslate.length; idx++) {
        const item = toTranslate[idx];
        const base = idx * 5;
        const tQ = translatedMap.get(base + 0) || item.qText;
        const tA = translatedMap.get(base + 1) || item.optA;
        const tB = translatedMap.get(base + 2) || item.optB;
        const tC = translatedMap.get(base + 3) || item.optC;
        const tD = translatedMap.get(base + 4) || item.optD;

        const targetObj = result[item.qIdx];
        if (tQ) targetObj.question = tQ;
        if (tA) targetObj.option_a = tA;
        if (tB) targetObj.option_b = tB;
        if (tC) targetObj.option_c = tC;
        if (tD) targetObj.option_d = tD;

        upserts.push({
          entity_id: `q_trans_${item.qId}`,
          target_language: targetLang,
          feature_type: "question_translation",
          content_hash: item.hash,
          cached_data: {
            question: tQ,
            option_a: tA,
            option_b: tB,
            option_c: tC,
            option_d: tD,
            updatedAt: nowStr,
          },
          updated_at: nowStr,
        });
      }

      if (upserts.length > 0) {
        await adminSb
          .from("course_ai_cache")
          .upsert(upserts, {
            onConflict: "entity_id,target_language,feature_type",
          })
          .then(() => {}, () => {});
      }
    }

    return result;
  } catch (err) {
    console.warn("[GuestExam] Translation fallback:", err);
    return questions;
  }
}

async function gradeAnswersServerSide(
  adminSb: ReturnType<typeof createAdminClient>,
  questionIds: string[],
  rawAnswers: Array<{
    question_id: string;
    selected_answer: "A" | "B" | "C" | "D" | null;
    time_spent_seconds?: number;
  }>
) {
  const extSb = await getExternalAdminClient();
  const correctByQuestionId = new Map<string, "A" | "B" | "C" | "D">();
  const questionDetails: Record<
    string,
    { correct_answer: string; explanation?: string }
  > = {};

  if (extSb && questionIds.length > 0) {
    try {
      const { data: extQuestions } = await extSb
        .from("questions")
        .select("id, choice_answer")
        .in("id", questionIds);

      for (const q of extQuestions || []) {
        const ansIdx =
          typeof q.choice_answer === "number"
            ? q.choice_answer
            : Number(q.choice_answer) || 0;
        const letter = mapExternalChoiceToLetter(ansIdx);
        correctByQuestionId.set(String(q.id), letter);
        questionDetails[String(q.id)] = {
          correct_answer: letter,
          explanation: undefined,
        };
      }
    } catch (extErr) {
      console.warn("[GuestExam] External grading lookup fallback:", extErr);
    }
  }

  if (correctByQuestionId.size < questionIds.length) {
    const missingIds = questionIds.filter(
      (id) => id && !correctByQuestionId.has(id)
    );
    if (missingIds.length > 0) {
      const { data: primaryQ } = await adminSb
        .from("exam_questions")
        .select("id, correct_answer, explanation")
        .in("id", missingIds);

      for (const q of primaryQ || []) {
        if (q.correct_answer) {
          correctByQuestionId.set(String(q.id), q.correct_answer as "A" | "B" | "C" | "D");
          questionDetails[String(q.id)] = {
            correct_answer: q.correct_answer,
            explanation: q.explanation || undefined,
          };
        }
      }
    }
  }

  const gradedAnswers = rawAnswers.map((a) => {
    const realCorrect = correctByQuestionId.get(a.question_id);
    const isCorrect =
      Boolean(realCorrect) &&
      Boolean(a.selected_answer) &&
      a.selected_answer === realCorrect;
    return {
      question_id: a.question_id,
      selected_answer: a.selected_answer,
      is_correct: isCorrect,
      time_spent_seconds: Number(a.time_spent_seconds) || 0,
    };
  });

  return { gradedAnswers, questionDetails };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    const quota = await getGuestExamQuota(req, deviceId);

    const adminSb = createAdminClient();
    const { data: configRows } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", [
        "standalone_exam_enabled",
        "external_exam_title",
        "external_exam_duration_minutes",
        "external_exam_question_count",
      ]);

    const configMap = new Map<string, string>();
    for (const row of configRows || []) {
      if (row.key && row.value !== undefined && row.value !== null) {
        configMap.set(String(row.key), String(row.value));
      }
    }

    const standaloneEnabled =
      String(configMap.get("standalone_exam_enabled") ?? "true").toLowerCase() !==
      "false";

    const res = NextResponse.json({
      standaloneEnabled,
      quota: {
        usedCount: quota.usedCount,
        remainingCount: quota.remainingCount,
        maxAllowed: quota.maxAllowed,
        exhausted: quota.exhausted,
      },
      examMeta: {
        categoryId: EXTERNAL_EXAM_CATEGORY_ID,
        title:
          configMap.get("external_exam_title") ||
          "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda",
        durationMinutes:
          Number(configMap.get("external_exam_duration_minutes")) || 20,
        questionCount:
          Number(configMap.get("external_exam_question_count")) || 20,
      },
    });
    return attachGuestQuotaCookie(res, quota);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to inspect guest exam status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const body = isEncryptedEnvelope(rawBody)
      ? await decryptPayload(rawBody)
      : rawBody;
    const { action, language, deviceId } = body || {};

    const adminSb = createAdminClient();

    // Load Admin exam configuration toggles
    const { data: configRows } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", [
        "standalone_exam_enabled",
        "save_individual_exams_enabled",
        "external_exam_published",
        "external_exam_title",
        "external_exam_duration_minutes",
        "external_exam_question_count",
      ]);

    const configMap = new Map<string, string>();
    for (const row of configRows || []) {
      if (row.key && row.value !== undefined && row.value !== null) {
        configMap.set(String(row.key), String(row.value));
      }
    }

    const standaloneEnabled =
      String(configMap.get("standalone_exam_enabled") ?? "true").toLowerCase() !==
      "false";

    // ------------------------------------------------------------------------
    // 1. START GUEST EXAM (Strict 3-exam limit per IP & Device; no auth needed)
    // ------------------------------------------------------------------------
    if (action === "start") {
      if (!standaloneEnabled) {
        return secureJsonResponse(
          {
            error: "EXAMS_PAUSED",
            message:
              "Practice exams are temporarily paused by the administrator.",
          },
          403
        );
      }

      const currentQuota = await getGuestExamQuota(req, deviceId);
      if (currentQuota.exhausted) {
        const res = await secureJsonResponse(
          {
            error: "LIMIT_REACHED",
            message:
              "Free guest exam limit reached (3/3). Please sign up for free to continue taking exams.",
            quota: {
              usedCount: currentQuota.usedCount,
              remainingCount: 0,
              maxAllowed: currentQuota.maxAllowed,
              exhausted: true,
            },
          },
          429
        );
        return attachGuestQuotaCookie(res, currentQuota);
      }

      let durationMinutes =
        Number(configMap.get("external_exam_duration_minutes")) || 20;
      let questionCount =
        Number(configMap.get("external_exam_question_count")) || 20;
      let sortingMode = "RANDOM";
      let passingPercentage = 70;
      let availableFrom: string | null = null;
      let availableTo: string | null = null;

      const targetCatId = body?.categoryId || EXTERNAL_EXAM_CATEGORY_ID;
      const { data: dbSettings } = await adminSb
        .from("exam_settings")
        .select("*")
        .eq("category_id", targetCatId)
        .maybeSingle();

      if (dbSettings) {
        if (dbSettings.question_count != null)
          questionCount = dbSettings.question_count;
        if (dbSettings.duration_minutes != null)
          durationMinutes = dbSettings.duration_minutes;
        if (dbSettings.sorting_mode != null)
          sortingMode = dbSettings.sorting_mode;
        if (dbSettings.passing_percentage != null)
          passingPercentage = dbSettings.passing_percentage;
        availableFrom = dbSettings.available_from;
        availableTo = dbSettings.available_to;
      }

      const extSb = await getExternalAdminClient();
      let formattedPool: any[] = [];

      if (extSb) {
        try {
          const { data: qData, error: qErr } = await extSb
            .from("questions")
            .select("*")
            .order("question_numbers", { ascending: true, nullsFirst: false })
            .order("id", { ascending: true });

          if (!qErr && Array.isArray(qData) && qData.length > 0) {
            formattedPool = qData.map((q: any) => {
              const choices = parseExternalChoices(q.choice);
              const ansIdx =
                typeof q.choice_answer === "number"
                  ? q.choice_answer
                  : Number(q.choice_answer) || 0;
              return {
                id: String(q.id),
                category_id: targetCatId,
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
          }
        } catch (extErr) {
          console.warn("[GuestExam] External question lookup fallback:", extErr);
        }
      }

      if (formattedPool.length === 0) {
        const { data: primaryQ } = await adminSb
          .from("exam_questions")
          .select("*")
          .order("id", { ascending: true });
        if (primaryQ && primaryQ.length > 0) {
          formattedPool = primaryQ.map((q: any) => ({
            ...q,
            category_id: targetCatId,
          }));
        }
      }

      if (formattedPool.length === 0) {
        return secureJsonResponse(
          { error: "No exam questions are currently available." },
          500
        );
      }

      const hasImg = (img: unknown) =>
        typeof img === "string" &&
        img.trim().length > 0 &&
        img.trim() !== "null" &&
        img.trim() !== "undefined";
      const withPic = formattedPool.filter((q) => hasImg(q.question_image));
      const textOnly = formattedPool.filter((q) => !hasImg(q.question_image));
      const doShuffle = <T>(arr: T[]): T[] =>
        [...arr].sort(() => Math.random() - 0.5);

      let picked: typeof formattedPool = [];
      if (sortingMode === "TEXT_ONLY") {
        picked = doShuffle(textOnly).slice(0, questionCount);
        if (picked.length < questionCount) {
          picked = [
            ...picked,
            ...doShuffle(withPic).slice(0, questionCount - picked.length),
          ];
        }
      } else if (sortingMode === "WITH_PICTURE") {
        picked = doShuffle(withPic).slice(0, questionCount);
        if (picked.length < questionCount) {
          picked = [
            ...picked,
            ...doShuffle(textOnly).slice(0, questionCount - picked.length),
          ];
        }
      } else if (sortingMode === "MIXED_50") {
        const half = Math.floor(questionCount / 2);
        const p1 = doShuffle(withPic).slice(0, half);
        const p2 = doShuffle(textOnly).slice(0, questionCount - p1.length);
        picked = doShuffle([...p1, ...p2]).slice(0, questionCount);
        if (picked.length < questionCount) {
          const usedIds = new Set(picked.map((p) => p.id));
          const rem = doShuffle(
            formattedPool.filter((q) => !usedIds.has(q.id))
          ).slice(0, questionCount - picked.length);
          picked = [...picked, ...rem];
        }
      } else {
        picked = doShuffle(formattedPool).slice(0, questionCount);
      }

      const translatedSelected = await translateQuestionBatch(
        adminSb,
        picked,
        language
      );

      // Strip correct answers before sending to guest client
      const safeQuestions = translatedSelected.map(
        ({ correct_answer, explanation, ...rest }) => rest
      );

      // Consume 1 guest exam quota slot on IP + Device
      const updatedQuota = await incrementGuestExamQuota(req, deviceId);

      const res = await secureJsonResponse({
        categoryId: targetCatId,
        settings: {
          question_count: safeQuestions.length,
          duration_minutes: durationMinutes,
          sorting_mode: sortingMode,
          passing_percentage: passingPercentage,
          available_from: availableFrom,
          available_to: availableTo,
        },
        questions: safeQuestions,
        quota: {
          usedCount: updatedQuota.usedCount,
          remainingCount: updatedQuota.remainingCount,
          maxAllowed: updatedQuota.maxAllowed,
          exhausted: updatedQuota.exhausted,
        },
        serverTime: new Date().toISOString(),
      });
      return attachGuestQuotaCookie(res, updatedQuota);
    }

    // ------------------------------------------------------------------------
    // 2. SUBMIT GUEST EXAM (Grades server-side; NEVER saves history)
    // ------------------------------------------------------------------------
    if (action === "submit") {
      const { attemptData } = body || {};
      const rawAnswers: Array<{
        question_id: string;
        selected_answer: "A" | "B" | "C" | "D" | null;
        time_spent_seconds?: number;
      }> = Array.isArray(attemptData?.answers) ? attemptData.answers : [];

      const questionIds = rawAnswers.map((a) => a.question_id).filter(Boolean);
      const { gradedAnswers, questionDetails } = await gradeAnswersServerSide(
        adminSb,
        questionIds,
        rawAnswers
      );

      const totalQuestions =
        Number(attemptData?.total_questions) || gradedAnswers.length || 20;
      const correctAnswers = gradedAnswers.filter((a) => a.is_correct).length;
      const scorePercentage =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const durationSeconds = Number(attemptData?.duration_seconds) || 0;

      const catId = attemptData?.category_id || EXTERNAL_EXAM_CATEGORY_ID;
      const catName =
        attemptData?.category_name ||
        configMap.get("external_exam_title") ||
        "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda";

      const now = new Date().toISOString();
      const transientAttempt = {
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: "guest",
        category_id: catId,
        category_name: catName,
        started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        completed_at: attemptData?.status === "abandoned" ? null : now,
        duration_seconds: durationSeconds,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        score_percentage: scorePercentage,
        answers: gradedAnswers,
        status: attemptData?.status || "completed",
        submission_reason: attemptData?.submission_reason || "manual",
        violation_summary: attemptData?.violation_summary || null,
      };

      const quota = await getGuestExamQuota(req, deviceId);

      const res = await secureJsonResponse({
        success: true,
        is_saved: false,
        attempt: transientAttempt,
        questionDetails,
        quota: {
          usedCount: quota.usedCount,
          remainingCount: quota.remainingCount,
          maxAllowed: quota.maxAllowed,
          exhausted: quota.exhausted,
        },
      });
      return attachGuestQuotaCookie(res, quota);
    }

    // ------------------------------------------------------------------------
    // 3. CLAIM & SAVE PENDING GUEST EXAM AFTER LOGIN / REGISTER
    // ------------------------------------------------------------------------
    if (action === "claim") {
      const supabase = await createClient();
      let {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const authHeader = req.headers.get("authorization");
        const bearerToken =
          authHeader?.replace(/^bearer\s+/i, "").trim() || body?.accessToken;
        if (bearerToken) {
          try {
            const {
              data: { user: bearerUser },
            } = await adminSb.auth.getUser(bearerToken);
            if (bearerUser) user = bearerUser;
          } catch {}
        }
      }

      if (!user || !isUUID(user.id)) {
        return secureJsonResponse(
          { error: "Authentication required to save exam history." },
          401
        );
      }

      const saveIndividualEnabled =
        String(
          configMap.get("save_individual_exams_enabled") ?? "true"
        ).toLowerCase() !== "false";

      if (!saveIndividualEnabled) {
        return secureJsonResponse({
          success: true,
          is_saved: false,
          skippedByAdminPolicy: true,
        });
      }

      const { attemptData } = body || {};
      const rawAnswers: Array<{
        question_id: string;
        selected_answer: "A" | "B" | "C" | "D" | null;
        time_spent_seconds?: number;
      }> = Array.isArray(attemptData?.answers) ? attemptData.answers : [];

      if (rawAnswers.length === 0) {
        return secureJsonResponse(
          { error: "No exam answers found to save." },
          400
        );
      }

      const questionIds = rawAnswers.map((a) => a.question_id).filter(Boolean);
      const { gradedAnswers } = await gradeAnswersServerSide(
        adminSb,
        questionIds,
        rawAnswers
      );

      const totalQuestions =
        Number(attemptData?.total_questions) || gradedAnswers.length || 20;
      const correctAnswers = gradedAnswers.filter((a) => a.is_correct).length;
      const scorePercentage =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;
      const durationSeconds = Number(attemptData?.duration_seconds) || 0;
      const catId = attemptData?.category_id || EXTERNAL_EXAM_CATEGORY_ID;
      const catName =
        attemptData?.category_name ||
        configMap.get("external_exam_title") ||
        "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda";

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
          started_at: new Date(
            Date.now() - durationSeconds * 1000
          ).toISOString(),
          completed_at: attemptData?.status === "abandoned" ? null : now,
          duration_seconds: durationSeconds,
          total_questions: totalQuestions,
          correct_answers: correctAnswers,
          score_percentage: scorePercentage,
          answers: gradedAnswers,
          status: attemptData?.status || "completed",
          submission_reason: attemptData?.submission_reason || "manual",
          violation_summary: attemptData?.violation_summary || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        return secureJsonResponse(
          { error: insertErr.message || "Failed to save exam attempt" },
          500
        );
      }

      return secureJsonResponse({
        success: true,
        is_saved: true,
        attempt: insertedAttempt,
      });
    }

    return secureJsonResponse({ error: "Unsupported action" }, 400);
  } catch (error: any) {
    return secureJsonResponse(
      { error: error?.message || "Failed to process guest exam request" },
      500
    );
  }
}
