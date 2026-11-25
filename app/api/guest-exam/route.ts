import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getExternalAdminClient,
  EXTERNAL_EXAM_CATEGORY_ID,
} from "@/lib/supabase/external";
import type { TargetLanguage } from "@/lib/ai/tiptap-translator";
import {
  resolveTargetLang,
  translateQuestionBatch,
  translateQuestionBatchProgressive,
} from "@/lib/ai/exam-translator";
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
import { CACHE_KEYS, getCached } from "@/lib/server-cache";
import { isWithinAvailabilityWindow, normalizeCanonicalExamLanguage } from "@/lib/exam-settings";
import {
  getBuiltinFallbackQuestions,
  normalizeExamQuestion,
  sanitizeImageUrl,
} from "@/lib/exam-question-utils";
import { isUUID } from "@/lib/utils";

async function getGuestConfigMap(adminSb: ReturnType<typeof createAdminClient>) {
  const rows = await getCached(CACHE_KEYS.SYSTEM_CONFIG_ALL, 60_000, async () => {
    const { data } = await adminSb.from("system_config").select("key, value").order("key");
    return data || [];
  }).catch(() => []);
  const map = new Map<string, string>();
  for (const row of rows || []) {
    if (row.key && row.value !== undefined && row.value !== null) {
      map.set(String(row.key), String(row.value));
    }
  }
  return map;
}

export const dynamic = "force-dynamic";

async function secureJsonResponse(data: unknown, status = 200) {
  const encrypted = await encryptPayload(data);
  return NextResponse.json(encrypted, { status });
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
    const targetLang = resolveTargetLang(searchParams.get("language"));
    const adminSb = createAdminClient();
    const [quota, configMap] = await Promise.all([
      getGuestExamQuota(req, deviceId),
      getGuestConfigMap(adminSb),
    ]);

    const standaloneEnabled =
      String(configMap.get("standalone_exam_enabled") ?? "true").toLowerCase() !==
      "false";
    const guestFreeExamEnabled =
      String(configMap.get("guest_free_exam_enabled") ?? "true").toLowerCase() !==
      "false";

    const rawTitle = configMap.get("external_exam_title") || "";
    const isDefaultTitle =
      !rawTitle ||
      rawTitle === "Rwanda PVS Exam" ||
      rawTitle.startsWith("Navo's Mock Exam") ||
      rawTitle === "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda";
    const localizedDefaultTitle =
      targetLang === "French"
        ? "Examen Blanc Officiel du Code de la Route"
        : targetLang === "English"
        ? "Official Traffic Rules & Road Signs Mock Exam"
        : "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda";

    const res = NextResponse.json({
      standaloneEnabled,
      guestFreeExamEnabled,
      quota: {
        usedCount: quota.usedCount,
        remainingCount: quota.remainingCount,
        maxAllowed: quota.maxAllowed,
        exhausted: quota.exhausted,
        resetValue: quota.resetValue,
        resetUnit: quota.resetUnit,
        resetsDaily: quota.resetUnit === "days" && quota.resetValue === 1,
        resetAt: quota.resetAt,
        resetInSeconds: quota.resetInSeconds,
      },
      examMeta: {
        categoryId: EXTERNAL_EXAM_CATEGORY_ID,
        title: isDefaultTitle ? localizedDefaultTitle : rawTitle,
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
    const configMap = await getGuestConfigMap(adminSb);

    const standaloneEnabled =
      String(configMap.get("standalone_exam_enabled") ?? "true").toLowerCase() !==
      "false";
    const guestFreeExamEnabled =
      String(configMap.get("guest_free_exam_enabled") ?? "true").toLowerCase() !==
      "false";

    // ------------------------------------------------------------------------
    // 0. TRANSLATE COMPLETED EXAM QUESTIONS FOR POST-EXAM REVIEW LANGUAGE SWITCH
    // ------------------------------------------------------------------------
    if (action === "translate_questions" && Array.isArray(body?.questions)) {
      const inputQuestions = body.questions as Array<Record<string, any>>;
      const questionIds = inputQuestions.map((q) => String(q.id || "")).filter(Boolean);
      const numericIds = questionIds.filter((id) => /^\d+$/.test(id));
      const extSb = await getExternalAdminClient();
      const canonicalById = new Map<string, { item: Record<string, any>; sourceLang: TargetLanguage | "auto" }>();

      if (extSb && numericIds.length > 0) {
        try {
          const { data: extRows } = await extSb
            .from("questions")
            .select("*")
            .in("id", numericIds);
          for (const row of extRows || []) {
            const choices = parseExternalChoices(row.choice);
            canonicalById.set(String(row.id), {
              sourceLang: "Kinyarwanda",
              item: {
                question: String(row.title || ""),
                option_a: choices[0] || "Option A",
                option_b: choices[1] || "Option B",
                option_c: choices[2] || "Option C",
                option_d: choices[3] || "Option D",
              },
            });
          }
        } catch {}
      }

      const missingIds = questionIds.filter((id) => !canonicalById.has(id));
      if (missingIds.length > 0) {
        const uuidIds = missingIds.filter((id) => isUUID(id));
        if (uuidIds.length > 0) {
          const { data: primaryRows } = await adminSb
            .from("exam_questions")
            .select("id, question, option_a, option_b, option_c, option_d, explanation")
            .in("id", uuidIds);
          for (const row of primaryRows || []) {
            canonicalById.set(String(row.id), {
              sourceLang: "auto",
              item: {
                question: row.question,
                option_a: row.option_a,
                option_b: row.option_b,
                option_c: row.option_c,
                option_d: row.option_d,
                explanation: row.explanation,
              },
            });
          }
        }
        const builtinFallback = getBuiltinFallbackQuestions("fallback", 20);
        for (const fb of builtinFallback) {
          if (!canonicalById.has(String(fb.id))) {
            canonicalById.set(String(fb.id), {
              sourceLang: "English",
              item: fb,
            });
          }
        }
      }

      const dbSourced: any[] = [];
      const primaryAutoSourced: any[] = [];
      const fallbackSourced: any[] = [];
      const builtinEnglishSourced: any[] = [];
      const orderIndex = new Map<string, number>();

      inputQuestions.forEach((q, idx) => {
        const idStr = String(q.id || `q-${idx}`);
        orderIndex.set(idStr, idx);
        const canonical = canonicalById.get(idStr);
        if (canonical) {
          const merged = {
            ...q,
            question: canonical.item.question ?? q.question,
            option_a: canonical.item.option_a ?? q.option_a,
            option_b: canonical.item.option_b ?? q.option_b,
            option_c: canonical.item.option_c ?? q.option_c,
            option_d: canonical.item.option_d ?? q.option_d,
            explanation: canonical.item.explanation ?? q.explanation,
          };
          if (canonical.sourceLang === "English") {
            builtinEnglishSourced.push(merged);
          } else if (canonical.sourceLang === "auto") {
            primaryAutoSourced.push(merged);
          } else {
            dbSourced.push(merged);
          }
        } else {
          fallbackSourced.push(q);
        }
      });

      const [tDb, tPrimary, tBuiltin, tFallback] = await Promise.all([
        dbSourced.length > 0
          ? translateQuestionBatch(adminSb, dbSourced, language, "Kinyarwanda")
          : Promise.resolve([]),
        primaryAutoSourced.length > 0
          ? translateQuestionBatch(adminSb, primaryAutoSourced, language, "auto")
          : Promise.resolve([]),
        builtinEnglishSourced.length > 0
          ? translateQuestionBatch(adminSb, builtinEnglishSourced, language, "English")
          : Promise.resolve([]),
        fallbackSourced.length > 0
          ? translateQuestionBatch(
              adminSb,
              fallbackSourced,
              language,
              "auto"
            )
          : Promise.resolve([]),
      ]);

      const mergedOut = [...tDb, ...tPrimary, ...tBuiltin, ...tFallback].sort(
        (a, b) => (orderIndex.get(String(a.id)) ?? 0) - (orderIndex.get(String(b.id)) ?? 0)
      );
      return secureJsonResponse({ questions: mergedOut });
    }

    // ------------------------------------------------------------------------
    // 1. START GUEST EXAM (Daily 3-exam limit for guests; no auth needed)
    // ------------------------------------------------------------------------
    if (action === "start") {
      const targetLang = resolveTargetLang(language);

      if (!guestFreeExamEnabled) {
        return secureJsonResponse(
          {
            error: "FREE_EXAM_DISABLED",
          },
          403
        );
      }

      if (!standaloneEnabled) {
        const pausedMsg =
          targetLang === "French"
            ? "Les examens blancs sont temporairement suspendus par l'administration."
            : targetLang === "Kinyarwanda"
            ? "Ibizamini by'imyitozo byahagaritswe by'agateganyo n'ubuyobozi."
            : "Practice exams are temporarily paused by the administrator.";
        return secureJsonResponse(
          {
            error: "EXAMS_PAUSED",
            message: pausedMsg,
          },
          403
        );
      }

      const currentQuota = await getGuestExamQuota(req, deviceId);
      if (currentQuota.exhausted) {
        const unitEn =
          currentQuota.resetUnit === "hours"
            ? currentQuota.resetValue === 1
              ? "hour"
              : "hours"
            : currentQuota.resetValue === 1
            ? "day"
            : "days";
        const unitFr =
          currentQuota.resetUnit === "hours"
            ? currentQuota.resetValue === 1
              ? "heure"
              : "heures"
            : currentQuota.resetValue === 1
            ? "jour"
            : "jours";
        const rwWindow =
          currentQuota.resetUnit === "hours"
            ? `mu masaha ${currentQuota.resetValue}`
            : currentQuota.resetValue === 1
            ? "ku munsi"
            : `mu minsi ${currentQuota.resetValue}`;

        const limitMsg =
          targetLang === "French"
            ? `Vous avez utilisé vos ${currentQuota.maxAllowed} examen(s) gratuit(s) autorisé(s) par ${currentQuota.resetValue} ${unitFr}. Inscrivez-vous gratuitement pour enregistrer vos progrès et continuer sans limite.`
            : targetLang === "Kinyarwanda"
            ? `Wasoje ibizamini by'ubuntu ${currentQuota.maxAllowed} wemerewe ${rwWindow}. Wiyandikishe ku buntu kugira ngo ubike amateka yawe kandi ukomeze kwimenyereza igihe cyose.`
            : `You have completed your ${currentQuota.maxAllowed} free practice exam${currentQuota.maxAllowed === 1 ? "" : "s"} per ${currentQuota.resetValue} ${unitEn}. Sign up for free to save your results and continue practicing anytime.`;
        const res = await secureJsonResponse(
          {
            error: "LIMIT_REACHED",
            message: limitMsg,
            quota: {
              usedCount: currentQuota.usedCount,
              remainingCount: 0,
              maxAllowed: currentQuota.maxAllowed,
              exhausted: true,
              resetValue: currentQuota.resetValue,
              resetUnit: currentQuota.resetUnit,
              resetsDaily:
                currentQuota.resetUnit === "days" &&
                currentQuota.resetValue === 1,
              resetAt: currentQuota.resetAt,
              resetInSeconds: currentQuota.resetInSeconds,
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
      let passingPercentage =
        Number(configMap.get("universal_passing_percentage")) || 60;
      let availableFrom: string | null = null;
      let availableTo: string | null = null;

      const targetCatId = body?.categoryId || EXTERNAL_EXAM_CATEGORY_ID;
      const [{ data: dbSettings }, extSb] = await Promise.all([
        adminSb
          .from("exam_settings")
          .select("*")
          .eq("category_id", targetCatId)
          .maybeSingle(),
        getExternalAdminClient(),
      ]);

      const catPassingOverride = Number(
        configMap.get(`exam_category_passing_percentage_${targetCatId}`) ??
          configMap.get(`exam_category_passing_percentage_${EXTERNAL_EXAM_CATEGORY_ID}`)
      );
      if (Number.isFinite(catPassingOverride) && catPassingOverride >= 1 && catPassingOverride <= 100) {
        passingPercentage = catPassingOverride;
      }

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

      if (!isWithinAvailabilityWindow(new Date(), availableFrom, availableTo)) {
        return secureJsonResponse(
          { error: "Exam is not available at this time." },
          403
        );
      }

      let formattedPool: any[] = [];
      let sourceOrigin: "external" | "auto" = "external";

      if (targetCatId !== EXTERNAL_EXAM_CATEGORY_ID && isUUID(targetCatId)) {
        const { data: catQ } = await adminSb
          .from("exam_questions")
          .select("*")
          .eq("category_id", targetCatId)
          .order("id", { ascending: true });
        if (catQ && catQ.length > 0) {
          sourceOrigin = "auto";
          formattedPool = catQ.map((q: any, idx: number) =>
            normalizeExamQuestion({ ...q, category_id: targetCatId }, idx, targetCatId)
          );
        }
      }

      if (formattedPool.length === 0 && extSb) {
        try {
          const qData = await getCached(CACHE_KEYS.EXTERNAL_QUESTIONS_POOL, 120_000, async () => {
            const { data, error: qErr } = await extSb
              .from("questions")
              .select("*")
              .order("question_numbers", { ascending: true, nullsFirst: false })
              .order("id", { ascending: true });
            if (qErr) return [];
            return Array.isArray(data) ? data : [];
          });

          if (qData.length > 0) {
            sourceOrigin = "external";
            formattedPool = qData.map((q: any, idx: number) => {
              const choices = parseExternalChoices(q.choice);
              const ansIdx =
                typeof q.choice_answer === "number"
                  ? q.choice_answer
                  : Number(q.choice_answer) || 0;
              return normalizeExamQuestion(
                {
                  id: String(q.id),
                  category_id: targetCatId,
                  question: String(q.title || ""),
                  question_image: sanitizeImageUrl(q.image),
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
                },
                idx,
                targetCatId
              );
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
          sourceOrigin = "auto";
          formattedPool = primaryQ.map((q: any, idx: number) =>
            normalizeExamQuestion({ ...q, category_id: targetCatId }, idx, targetCatId)
          );
        }
      }

      if (formattedPool.length === 0) {
        sourceOrigin = "auto";
        formattedPool = getBuiltinFallbackQuestions(targetCatId, questionCount);
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

      const srcOriginLang = sourceOrigin === "external" ? "Kinyarwanda" : "auto";
      let translatedSelected = picked;
      let pendingTranslationIds: string[] = [];

      if (Boolean(body?.progressive)) {
        const progRes = await translateQuestionBatchProgressive(
          adminSb,
          picked,
          language,
          srcOriginLang,
          4
        );
        translatedSelected = progRes.questions;
        pendingTranslationIds = progRes.pendingIds;
      } else {
        translatedSelected = await translateQuestionBatch(
          adminSb,
          picked,
          language,
          srcOriginLang
        );
      }

      // Strip correct answers before sending to guest client and normalize shape
      const safeQuestions = translatedSelected.map((item, idx) => {
        const { correct_answer: _c, explanation: _e, ...rest } = normalizeExamQuestion(
          item,
          idx,
          targetCatId
        );
        return rest;
      });

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
        pendingTranslationIds,
        quota: {
          usedCount: updatedQuota.usedCount,
          remainingCount: updatedQuota.remainingCount,
          maxAllowed: updatedQuota.maxAllowed,
          exhausted: updatedQuota.exhausted,
          resetValue: updatedQuota.resetValue,
          resetUnit: updatedQuota.resetUnit,
          resetsDaily:
            updatedQuota.resetUnit === "days" && updatedQuota.resetValue === 1,
          resetAt: updatedQuota.resetAt,
          resetInSeconds: updatedQuota.resetInSeconds,
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

      const targetLang = resolveTargetLang(language);
      const examLanguage = normalizeCanonicalExamLanguage(
        attemptData?.exam_language || targetLang || language
      );
      const catId = attemptData?.category_id || EXTERNAL_EXAM_CATEGORY_ID;

      const now = new Date().toISOString();
      const transientAttempt = {
        id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: "guest",
        category_id: catId,
        category_name: examLanguage,
        exam_language: examLanguage,
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
          resetValue: quota.resetValue,
          resetUnit: quota.resetUnit,
          resetsDaily: quota.resetUnit === "days" && quota.resetValue === 1,
          resetAt: quota.resetAt,
          resetInSeconds: quota.resetInSeconds,
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
      const examLanguage = normalizeCanonicalExamLanguage(
        attemptData?.exam_language || body?.language
      );

      const now = new Date().toISOString();
      const browserAttempt = {
        id: `browser-guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: user.id,
        category_id: catId,
        category_name: examLanguage,
        exam_language: examLanguage,
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
        created_at: now,
      };

      return secureJsonResponse({
        success: true,
        is_saved: false,
        should_save: saveIndividualEnabled,
        storage: "browser",
        attempt: browserAttempt,
        questionDetails,
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
