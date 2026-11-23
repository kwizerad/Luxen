import { NextRequest, NextResponse } from "next/server";
import { createClient, getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalAdminClient, EXTERNAL_EXAM_CATEGORY_ID, isExternalModuleId } from "@/lib/supabase/external";
import { isAdmin, isPrimaryAdmin } from "@/lib/permissions";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

function isExternalExamCategoryId(categoryId?: string | null): boolean {
  if (!categoryId) return false;
  return categoryId === EXTERNAL_EXAM_CATEGORY_ID || categoryId.startsWith("ext-exam-");
}
import { translateTextSnippets, type TargetLanguage } from "@/lib/ai/tiptap-translator";
import { decryptPayload, encryptPayload, isEncryptedEnvelope } from "@/lib/e2e-crypto";
import { CACHE_KEYS, getCached } from "@/lib/server-cache";
import { isWithinAvailabilityWindow } from "@/lib/exam-settings";
import {
  getBuiltinFallbackQuestions,
  normalizeExamQuestion,
  sanitizeImageUrl,
  seededShuffleArray,
} from "@/lib/exam-question-utils";
import crypto from "crypto";
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

async function translateQuestionBatch<
  T extends {
    id: string;
    question?: string | null;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
    explanation?: string | null;
  }
>(
  adminSb: ReturnType<typeof createAdminClient>,
  questions: T[],
  language?: string | null,
  sourceLanguage?: string | null
): Promise<T[]> {
  const targetLang = resolveTargetLang(language);
  const srcLang = sourceLanguage ? resolveTargetLang(sourceLanguage) : "Kinyarwanda";
  if ((targetLang === srcLang && !sourceLanguage) || questions.length === 0) {
    return questions;
  }
  if (targetLang === srcLang) {
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
        cachedMap.set(row.entity_id, { hash: row.content_hash, data: row.cached_data });
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
      expl: string;
    }[] = [];

    const result = questions.map((q) => ({ ...q }));

    for (let i = 0; i < result.length; i++) {
      const q = result[i];
      const qText = String(q.question || "").trim();
      const optA = String(q.option_a || "").trim();
      const optB = String(q.option_b || "").trim();
      const optC = String(q.option_c || "").trim();
      const optD = String(q.option_d || "").trim();
      const expl = String(q.explanation || "").trim();
      const combined = `${qText}||${optA}||${optB}||${optC}||${optD}||${expl}`;
      const hash = crypto.createHash("md5").update(combined).digest("hex");
      const cached = cachedMap.get(`q_trans_${q.id}`);

      if (cached && cached.hash === hash && cached.data) {
        if (cached.data.question) q.question = cached.data.question;
        if (cached.data.option_a) q.option_a = cached.data.option_a;
        if (cached.data.option_b) q.option_b = cached.data.option_b;
        if (cached.data.option_c) q.option_c = cached.data.option_c;
        if (cached.data.option_d) q.option_d = cached.data.option_d;
        if (cached.data.explanation) q.explanation = cached.data.explanation;
      } else {
        toTranslate.push({ qIdx: i, qId: q.id, hash, qText, optA, optB, optC, optD, expl });
      }
    }

    if (toTranslate.length > 0) {
      const snippets: { id: number; text: string }[] = [];
      for (let idx = 0; idx < toTranslate.length; idx++) {
        const item = toTranslate[idx];
        const base = idx * 6;
        if (item.qText) snippets.push({ id: base + 0, text: item.qText });
        if (item.optA) snippets.push({ id: base + 1, text: item.optA });
        if (item.optB) snippets.push({ id: base + 2, text: item.optB });
        if (item.optC) snippets.push({ id: base + 3, text: item.optC });
        if (item.optD) snippets.push({ id: base + 4, text: item.optD });
        if (item.expl) snippets.push({ id: base + 5, text: item.expl });
      }

      const translatedMap = await Promise.race([
        translateTextSnippets(snippets, srcLang, targetLang, {
          batchSize: 30,
          concurrency: 3,
          timeoutMs: 10000,
          maxRetries: 1,
          skipRetryMissed: true,
        }),
        new Promise<Map<number, string>>((resolve) =>
          setTimeout(() => resolve(new Map()), 11000)
        ),
      ]).catch(() => new Map<number, string>());
      const nowStr = new Date().toISOString();
      const upserts = [];

      for (let idx = 0; idx < toTranslate.length; idx++) {
        const item = toTranslate[idx];
        const base = idx * 6;
        const tQ = translatedMap.get(base + 0) || item.qText;
        const tA = translatedMap.get(base + 1) || item.optA;
        const tB = translatedMap.get(base + 2) || item.optB;
        const tC = translatedMap.get(base + 3) || item.optC;
        const tD = translatedMap.get(base + 4) || item.optD;
        const tE = translatedMap.get(base + 5) || item.expl;

        const targetObj = result[item.qIdx];
        if (tQ) targetObj.question = tQ;
        if (tA) targetObj.option_a = tA;
        if (tB) targetObj.option_b = tB;
        if (tC) targetObj.option_c = tC;
        if (tD) targetObj.option_d = tD;
        if (tE) targetObj.explanation = tE;

        // Only cache translations generated from the canonical Kinyarwanda source
        if (srcLang === "Kinyarwanda") {
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
              explanation: tE || undefined,
              updatedAt: nowStr,
            },
            updated_at: nowStr,
          });
        }
      }

      if (upserts.length > 0) {
        await adminSb
          .from("course_ai_cache")
          .upsert(upserts, { onConflict: "entity_id,target_language,feature_type" })
          .then(() => {}, () => {});
      }
    }

    return result;
  } catch (err) {
    console.warn("Question translation fallback:", err);
    return questions;
  }
}

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
    const rawBody = await req.json();
    const body = isEncryptedEnvelope(rawBody) ? await decryptPayload(rawBody) : rawBody;
    const { action, language } = body || {};

    const user = await getAuthUserFromRequest(req, body?.accessToken);
    const isSubmissionAction = action === "submit_exam" || action === "submit_module_exam";

    if (!user && !isSubmissionAction) {
      return secureJsonResponse(
        { error: "Authentication required to access exam questions." },
        401
      );
    }

    const adminSb = createAdminClient();
    const extSb = await getExternalAdminClient();

    if (action === "translate_questions" && Array.isArray(body.questions)) {
      const inputQuestions = body.questions as Array<Record<string, any>>;
      const questionIds = inputQuestions.map((q) => String(q.id || "")).filter(Boolean);
      const canonicalById = new Map<string, { item: Record<string, any>; sourceLang: TargetLanguage }>();

      if (extSb && questionIds.length > 0) {
        try {
          const { data: extRows } = await extSb
            .from("questions")
            .select("*")
            .in("id", questionIds);
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
              sourceLang: "Kinyarwanda",
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
          } else {
            dbSourced.push(merged);
          }
        } else {
          fallbackSourced.push(q);
        }
      });

      const [tDb, tBuiltin, tFallback] = await Promise.all([
        dbSourced.length > 0
          ? translateQuestionBatch(adminSb, dbSourced, language, "Kinyarwanda")
          : Promise.resolve([]),
        builtinEnglishSourced.length > 0
          ? translateQuestionBatch(adminSb, builtinEnglishSourced, language, "English")
          : Promise.resolve([]),
        fallbackSourced.length > 0
          ? translateQuestionBatch(
              adminSb,
              fallbackSourced,
              language,
              body.sourceLanguage || "Kinyarwanda"
            )
          : Promise.resolve([]),
      ]);

      const mergedOut = [...tDb, ...tBuiltin, ...tFallback].sort(
        (a, b) => (orderIndex.get(String(a.id)) ?? 0) - (orderIndex.get(String(b.id)) ?? 0)
      );
      return secureJsonResponse({ questions: mergedOut });
    }

    const getCachedSystemConfigMap = async () => {
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
    };

    const getCachedExternalQuestions = async (): Promise<any[]> => {
      if (!extSb) return [];
      return getCached(CACHE_KEYS.EXTERNAL_QUESTIONS_POOL, 120_000, async () => {
        const { data: qData, error: qErr } = await extSb
          .from("questions")
          .select("*")
          .order("question_numbers", { ascending: true, nullsFirst: false })
          .order("id", { ascending: true });
        if (qErr) {
          console.warn("[ExamAPI] External questions query error:", qErr.message);
          return [];
        }
        return Array.isArray(qData) ? qData : [];
      }).catch((err) => {
        console.warn("[ExamAPI] External questions fetch exception:", err);
        return [];
      });
    };

    const configMap = await getCachedSystemConfigMap();

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
    // 0. GET ALL EXTERNAL QUESTIONS FOR ADMIN / MANAGEMENT
    // ------------------------------------------------------------------------
    if (action === "get_external_questions") {
      if (!user) {
        return secureJsonResponse({ error: "Unauthorized" }, 401);
      }
      const email = (user.email || "").toLowerCase();
      let isAdminUser =
        email === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
        isPrimaryAdmin(user as any) ||
        isAdmin(user as any);
      if (!isAdminUser) {
        const { data: profile } = await adminSb
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role && String(profile.role).toLowerCase() === "admin") {
          isAdminUser = true;
        }
      }
      if (!isAdminUser) {
        return secureJsonResponse({ error: "Admin authorization required" }, 403);
      }

      const allExtQuestions = await getCachedExternalQuestions();

      let formattedPool: any[] = [];
      if (allExtQuestions.length > 0) {
        formattedPool = allExtQuestions.map((q: any, idx: number) => {
          const choices = parseExternalChoices(q.choice);
          const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
          return normalizeExamQuestion(
            {
              id: String(q.id),
              category_id: body.categoryId || EXTERNAL_EXAM_CATEGORY_ID,
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
            idx
          );
        });
      } else {
        const { data: primaryQ } = await adminSb
          .from("exam_questions")
          .select("*")
          .order("id", { ascending: true });
        formattedPool = (primaryQ || []).map((q: any, idx: number) => normalizeExamQuestion(q, idx));
      }

      return secureJsonResponse({ questions: formattedPool });
    }

    // ------------------------------------------------------------------------
    // 1. TAKE STANDALONE / GROUP MOCK EXAM FROM EXTERNAL QUESTIONS
    // ------------------------------------------------------------------------
    if (action === "take_exam") {
      const { categoryId, challengeId } = body;
      let durationMinutes = Number(configMap.get("external_exam_duration_minutes")) || 20;
      let questionCount = Number(configMap.get("external_exam_question_count")) || 20;
      let sortingMode = "RANDOM";
      let passingPercentage = Number(configMap.get("universal_passing_percentage")) || 60;
      let availableFrom = null;
      let availableTo = null;

      const targetCatId = categoryId || EXTERNAL_EXAM_CATEGORY_ID;
      const [dbSettingsRes, allExtQuestions] = await Promise.all([
        (async () => {
          const { data } = await adminSb
            .from("exam_settings")
            .select("*")
            .eq("category_id", targetCatId)
            .maybeSingle();
          if (data || !isExternalExamCategoryId(targetCatId)) return data;
          const { data: fb } = await adminSb
            .from("exam_settings")
            .select("*")
            .eq("category_id", EXTERNAL_EXAM_CATEGORY_ID)
            .maybeSingle();
          return fb;
        })(),
        getCachedExternalQuestions(),
      ]);

      const catPassingOverride = Number(
        configMap.get(`exam_category_passing_percentage_${targetCatId}`) ??
          (isExternalExamCategoryId(targetCatId)
            ? configMap.get(`exam_category_passing_percentage_${EXTERNAL_EXAM_CATEGORY_ID}`)
            : undefined)
      );
      if (Number.isFinite(catPassingOverride) && catPassingOverride >= 1 && catPassingOverride <= 100) {
        passingPercentage = catPassingOverride;
      }

      const dbSettings = dbSettingsRes;
      if (dbSettings) {
        if (dbSettings.question_count != null) questionCount = dbSettings.question_count;
        if (dbSettings.duration_minutes != null) durationMinutes = dbSettings.duration_minutes;
        if (dbSettings.sorting_mode != null) sortingMode = dbSettings.sorting_mode;
        if (dbSettings.passing_percentage != null) passingPercentage = dbSettings.passing_percentage;
        availableFrom = dbSettings.available_from;
        availableTo = dbSettings.available_to;
      }

      if (!challengeId && !isWithinAvailabilityWindow(new Date(), availableFrom, availableTo)) {
        return secureJsonResponse(
          { error: "Exam is not available at this time." },
          403
        );
      }

      let formattedPool: any[] = [];

      if (allExtQuestions.length > 0) {
        formattedPool = allExtQuestions.map((q: any, idx: number) => {
          const choices = parseExternalChoices(q.choice);
          const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
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
      } else {
        // Fallback to primary database exam_questions table
        const { data: primaryQ } = await adminSb
          .from("exam_questions")
          .select("*")
          .order("id", { ascending: true });

        if (primaryQ && primaryQ.length > 0) {
          formattedPool = primaryQ.map((q: any, idx: number) =>
            normalizeExamQuestion({ ...q, category_id: targetCatId }, idx, targetCatId)
          );
        }
      }

      if (formattedPool.length === 0) {
        formattedPool = getBuiltinFallbackQuestions(targetCatId, questionCount);
      }

      const hasImg = (img: any) => typeof img === "string" && img.trim().length > 0 && img.trim() !== "null" && img.trim() !== "undefined";
      const typedQuestions = formattedPool;
      const withPic = typedQuestions.filter((q) => hasImg(q.question_image));
      const textOnly = typedQuestions.filter((q) => !hasImg(q.question_image));

      const doShuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

      let picked: typeof formattedPool = [];
      if (sortingMode === "TEXT_ONLY") {
        const primary = doShuffle(textOnly);
        picked = primary.slice(0, questionCount);
        if (picked.length < questionCount) {
          const remainder = doShuffle(withPic).slice(0, questionCount - picked.length);
          picked = [...picked, ...remainder];
        }
      } else if (sortingMode === "WITH_PICTURE") {
        const primary = doShuffle(withPic);
        picked = primary.slice(0, questionCount);
        if (picked.length < questionCount) {
          const remainder = doShuffle(textOnly).slice(0, questionCount - picked.length);
          picked = [...picked, ...remainder];
        }
      } else if (sortingMode === "MIXED_50") {
        const half = Math.floor(questionCount / 2);
        const p1 = doShuffle(withPic).slice(0, half);
        const p2 = doShuffle(textOnly).slice(0, questionCount - p1.length);
        picked = doShuffle([...p1, ...p2]).slice(0, questionCount);
        if (picked.length < questionCount) {
          const usedIds = new Set(picked.map((p) => p.id));
          const remainder = doShuffle(typedQuestions.filter((q) => !usedIds.has(q.id))).slice(0, questionCount - picked.length);
          picked = [...picked, ...remainder];
        }
      } else {
        picked = doShuffle(typedQuestions).slice(0, questionCount);
      }

      let selectedQuestions = picked;

      let effectiveLanguage = language;

      // Support shared question order and shared language for group challenges
      if (challengeId) {
        let challengeData: any = null;
        let canPersistQuestionIds = true;
        const { data: cWithLang, error: cErr } = await adminSb
          .from("exam_challenges")
          .select("id, question_ids, language")
          .eq("id", challengeId)
          .maybeSingle();

        if (cErr && (cErr.code === "42703" || /language|question_ids/i.test(cErr.message || ""))) {
          const { data: cOnlyQIds, error: cErr2 } = await adminSb
            .from("exam_challenges")
            .select("id, question_ids")
            .eq("id", challengeId)
            .maybeSingle();
          if (cErr2 && (cErr2.code === "42703" || /question_ids/i.test(cErr2.message || ""))) {
            canPersistQuestionIds = false;
            const { data: cMinimal } = await adminSb
              .from("exam_challenges")
              .select("*")
              .eq("id", challengeId)
              .maybeSingle();
            challengeData = cMinimal;
          } else {
            challengeData = cOnlyQIds;
          }
        } else {
          challengeData = cWithLang;
        }

        if (challengeData?.language) {
          effectiveLanguage = challengeData.language;
        }

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
        } else if (canPersistQuestionIds) {
          const selectedIds = selectedQuestions.map((q) => q.id);
          await adminSb
            .from("exam_challenges")
            .update({ question_ids: selectedIds })
            .eq("id", challengeId)
            .then(() => {}, () => {});
        } else {
          // Deterministic seeded selection so all participants receive identical questions
          selectedQuestions = seededShuffleArray(formattedPool, challengeId).slice(0, questionCount);
        }
      }

      // Translate questions into requested UI/challenge language if needed
      const translatedSelected = await translateQuestionBatch(adminSb, selectedQuestions, effectiveLanguage);

      // Strip correct_answer before sending to client and enforce strict shape
      const safeQuestions = translatedSelected.map((item, idx) => {
        const { correct_answer: _c, explanation: _e, ...rest } = normalizeExamQuestion(item, idx, targetCatId);
        return rest;
      });

      return secureJsonResponse({
        categoryId: categoryId || EXTERNAL_EXAM_CATEGORY_ID,
        settings: {
          question_count: safeQuestions.length || questionCount,
          duration_minutes: durationMinutes,
          sorting_mode: sortingMode,
          passing_percentage: passingPercentage,
          available_from: availableFrom,
          available_to: availableTo,
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
      const nonFallbackIds = questionIds.filter((id) => !String(id).startsWith("fallback-"));
      const extQuestions =
        extSb && nonFallbackIds.length > 0
          ? (
              await extSb
                .from("questions")
                .select("id, choice_answer")
                .in("id", nonFallbackIds)
            ).data
          : [];

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

      if (correctByQuestionId.size < questionIds.length) {
        const missingUuidIds = questionIds.filter((id) => !correctByQuestionId.has(id) && isUUID(id));
        if (missingUuidIds.length > 0) {
          const { data: primaryQ } = await adminSb
            .from("exam_questions")
            .select("id, correct_answer, explanation")
            .in("id", missingUuidIds);
          for (const q of primaryQ || []) {
            if (q.correct_answer) {
              correctByQuestionId.set(String(q.id), q.correct_answer as any);
              questionDetails[String(q.id)] = {
                correct_answer: q.correct_answer,
                explanation: q.explanation || undefined,
              };
            }
          }
        }
      }

      if (correctByQuestionId.size < questionIds.length) {
        for (const fb of getBuiltinFallbackQuestions("fallback", 20)) {
          if (!correctByQuestionId.has(fb.id)) {
            correctByQuestionId.set(fb.id, fb.correct_answer as "A" | "B" | "C" | "D");
            questionDetails[fb.id] = {
              correct_answer: fb.correct_answer,
              explanation: fb.explanation,
            };
          }
        }
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

      const catId = attemptData.category_id || EXTERNAL_EXAM_CATEGORY_ID;
      const configuredTitle = configMap.get("external_exam_title");
      const catName =
        attemptData.category_name ||
        (!configuredTitle ||
        configuredTitle === "Navo's Mock Exam (External DB)" ||
        configuredTitle === "Navo's Mock Exam (External Question Bank)"
          ? "Rwanda PVS Exam"
          : configuredTitle);

      const now = new Date().toISOString();
      const userId = user?.id;
      const isValidUser = Boolean(userId && isUUID(userId));

      const browserAttempt = {
        id: `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: isValidUser ? userId : "guest",
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
        created_at: now,
      };

      // Query fresh persistence toggle directly (bypassing 60s cache)
      let saveIndividual = configMap.get("save_individual_exams_enabled") !== "false";
      let saveGroup = configMap.get("save_group_exams_enabled") !== "false";
      try {
        const { data: freshRows } = await adminSb
          .from("system_config")
          .select("key, value")
          .in("key", ["save_individual_exams_enabled", "save_group_exams_enabled"]);
        for (const r of freshRows || []) {
          if (r.key === "save_individual_exams_enabled") {
            saveIndividual = String(r.value).toLowerCase() !== "false";
          } else if (r.key === "save_group_exams_enabled") {
            saveGroup = String(r.value).toLowerCase() !== "false";
          }
        }
      } catch {}

      const shouldSave = attemptData?.is_group_challenge ? saveGroup : saveIndividual;

      return secureJsonResponse({
        success: true,
        attempt: browserAttempt,
        questionDetails,
        should_save: shouldSave,
        is_saved: false,
        storage: "browser",
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
        Number(courseOverride?.durationMinutes) ||
        (examType === "final" ? 45 : examType === "midterm" ? 30 : Number(quizSettings.globalDurationMinutes) || 20);
      const questionCount =
        Number(courseOverride?.questionCount) ||
        (examType === "final" ? 50 : examType === "midterm" ? 30 : Number(quizSettings.globalQuestionCount) || 20);

      const allCachedExt = await getCachedExternalQuestions();
      let pool =
        examType === "module" && rawChapterId
          ? allCachedExt.filter((q: any) => String(q.chapter_id || "") === rawChapterId)
          : allCachedExt;

      // If a specific chapter has 0 questions, gracefully fall back to the full external pool
      if (pool.length === 0) {
        pool = allCachedExt;
      }

      let formatted = pool.map((q: any, idx: number) => {
        const choices = parseExternalChoices(q.choice);
        const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
        return normalizeExamQuestion(
          {
            id: String(q.id),
            module_id: moduleId || rawChapterId,
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
            order_index: idx,
            is_published: true,
            created_at: q.created_at || new Date().toISOString(),
            updated_at: q.updated_at || new Date().toISOString(),
          },
          idx
        );
      });

      if (formatted.length === 0) {
        const { data: primaryModQ } = await adminSb
          .from("module_exam_questions")
          .select("*")
          .limit(60);
        if (primaryModQ && primaryModQ.length > 0) {
          formatted = primaryModQ.map((q: any, idx: number) => normalizeExamQuestion(q, idx));
        }
      }

      if (formatted.length === 0) {
        formatted = getBuiltinFallbackQuestions(moduleId || "ext-module", questionCount).map((q, idx) => ({
          ...q,
          module_id: moduleId || rawChapterId,
          order_index: idx,
          is_published: true,
          updated_at: q.created_at,
        })) as any[];
      }

      const shuffled = [...formatted].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));
      const translatedSelected = (await translateQuestionBatch(adminSb, selected, language)).map(
        (q, idx) => normalizeExamQuestion(q, idx)
      );

      return secureJsonResponse({
        settings: {
          id: `ext-settings-${rawChapterId || examType}`,
          module_id: moduleId || rawChapterId,
          question_count: translatedSelected.length,
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
        questions: translatedSelected,
      });
    }

    // ------------------------------------------------------------------------
    // 4. SUBMIT MODULE QUIZ FOR EXTERNAL COURSE (BROWSER STORAGE)
    // ------------------------------------------------------------------------
    if (action === "submit_module_exam") {
      const { attemptData } = body;
      const now = new Date().toISOString();

      const isExtMod = isExternalModuleId(attemptData?.module_id);
      const userId = user?.id;
      const isValidUser = Boolean(userId && isUUID(userId));

      const browserModAttempt = {
        id: `browser-mod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: isValidUser ? userId : "guest",
        module_id: attemptData.module_id,
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
        created_at: now,
      };

      return secureJsonResponse({
        success: true,
        attempt: browserModAttempt,
        is_saved: false,
        storage: "browser",
      });
    }

    return secureJsonResponse({ error: "Unsupported action" }, 400);
  } catch (error: any) {
    return secureJsonResponse(
      { error: error?.message || "Failed to process external exam action" },
      500
    );
  }
}
