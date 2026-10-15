import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalAdminClient, EXTERNAL_EXAM_CATEGORY_ID, isExternalModuleId, isExternalExamCategoryId } from "@/lib/supabase/external";
import { translateTextSnippets, type TargetLanguage } from "@/lib/ai/tiptap-translator";
import { decryptPayload, encryptPayload, isEncryptedEnvelope } from "@/lib/e2e-crypto";
import crypto from "crypto";

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
        toTranslate.push({ qIdx: i, qId: q.id, hash, qText, optA, optB, optC, optD });
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

      const translatedMap = await translateTextSnippets(snippets, "Kinyarwanda", targetLang);
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return secureJsonResponse({ error: "Unauthorized" }, 401);
    }

    const rawBody = await req.json();
    const body = isEncryptedEnvelope(rawBody) ? await decryptPayload(rawBody) : rawBody;
    const { action, language } = body || {};

    const adminSb = createAdminClient();

    if (action === "translate_questions" && Array.isArray(body.questions)) {
      const translated = await translateQuestionBatch(adminSb, body.questions, language);
      return secureJsonResponse({ questions: translated });
    }

    const extSb = await getExternalAdminClient();

    if (!extSb) {
      return secureJsonResponse(
        { error: "External Supabase database is not configured." },
        500
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
      let durationMinutes = Number(configMap.get("external_exam_duration_minutes")) || 20;
      let questionCount = Number(configMap.get("external_exam_question_count")) || 20;
      let sortingMode = "RANDOM";
      let passingPercentage = 70;
      let availableFrom = null;
      let availableTo = null;

      const targetCatId = categoryId || EXTERNAL_EXAM_CATEGORY_ID;
      let { data: dbSettings } = await adminSb
        .from("exam_settings")
        .select("*")
        .eq("category_id", targetCatId)
        .maybeSingle();

      if (!dbSettings && isExternalExamCategoryId(targetCatId)) {
        const { data: fallbackSettings } = await adminSb
          .from("exam_settings")
          .select("*")
          .eq("category_id", EXTERNAL_EXAM_CATEGORY_ID)
          .maybeSingle();
        dbSettings = fallbackSettings;
      }

      if (dbSettings) {
        if (dbSettings.question_count != null) questionCount = dbSettings.question_count;
        if (dbSettings.duration_minutes != null) durationMinutes = dbSettings.duration_minutes;
        if (dbSettings.sorting_mode != null) sortingMode = dbSettings.sorting_mode;
        if (dbSettings.passing_percentage != null) passingPercentage = dbSettings.passing_percentage;
        availableFrom = dbSettings.available_from;
        availableTo = dbSettings.available_to;
      }

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
          const selectedIds = selectedQuestions.map((q) => q.id);
          await adminSb
            .from("exam_challenges")
            .update({ question_ids: selectedIds })
            .eq("id", challengeId);
        }
      }

      // Translate questions into requested UI language if needed
      const translatedSelected = await translateQuestionBatch(adminSb, selectedQuestions, language);

      // Strip correct_answer before sending to client
      const safeQuestions = translatedSelected.map(({ correct_answer, explanation, ...rest }) => rest);

      return secureJsonResponse({
        categoryId: categoryId || EXTERNAL_EXAM_CATEGORY_ID,
        settings: {
          question_count: questionCount,
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

      return secureJsonResponse({
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
      const translatedSelected = await translateQuestionBatch(adminSb, selected, language);

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

      return secureJsonResponse({
        success: true,
        attempt: {
          ...inserted,
          module_id: attemptData.module_id,
        },
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
