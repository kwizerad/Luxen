import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { translateTextSnippets, type TargetLanguage } from "@/lib/ai/tiptap-translator";

export function resolveTargetLang(language?: string | null): TargetLanguage {
  const l = String(language || "").trim().toLowerCase();
  if (l === "en" || l === "english" || l.includes("english")) return "English";
  if (
    l === "fr" ||
    l === "french" ||
    l === "français" ||
    l === "francais" ||
    l.includes("french") ||
    l.includes("français")
  ) {
    return "French";
  }
  return "Kinyarwanda";
}

function normalizeComparable(val?: string | null): string {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasSubstantialWords(val?: string | null): boolean {
  const s = String(val || "").trim();
  if (s.length < 8) return false;
  const alphaWords = s.match(/[a-zA-ZÀ-ÿ]{3,}/g);
  return Boolean(alphaWords && alphaWords.length >= 2);
}

/**
 * Heuristic detector for exam questions across Kinyarwanda, French, and English.
 * Defaults to "Kinyarwanda" when ambiguous since the primary question bank is authored in Kinyarwanda.
 */
export function detectQuestionSourceLang(q: {
  question?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
}): TargetLanguage {
  const combined = [
    q.question,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!combined.trim()) return "Kinyarwanda";

  const rwMatches =
    combined.match(
      /\b(umuyobozi|ikinyabiziga|ibinyabiziga|umuhanda|imihanda|ibyapa|icyapa|amategeko|igisubizo|ikibazo|cyangwa|kugira|muhanda|umuvuduko|amatara|abanyamaguru|gutambuka|kunyuranaho|uruhushya|yego|oya|gusa|rimwe|buri|igihe|imodoka|inyuma|imbere|iburyo|ibumoso|ahabugenewe|ihuriro|uruziga|uburenganzira|agomba|bagomba|bibuza|bitegeka|ntarengwa|ubugenzuzi|ibisobanuro|ibibazo|mu|ku|yo|byo|ryo|cya|nta|ari|ko)\b/g
    )?.length || 0;

  const frWordMatches =
    combined.match(
      /\b(quel|quelle|quels|quelles|dans|pour|avec|sur|une|des|les|est|sont|panneau|panneaux|véhicule|vehicule|conducteur|route|chaussée|chaussee|priorité|priorite|vitesse|feux|dépassement|depassement|piétons|pietons|carrefour|giratoire|permis|oui|non|aucun|aucune|jamais|toujours|seulement|entre|avant|après|apres|droite|gauche)\b/g
    )?.length || 0;
  const frAccentMatches = combined.match(/[àâçéèêëîïôùûüÿœ]/g)?.length || 0;
  const frScore = frWordMatches * 2 + (frAccentMatches >= 2 ? 2 : 0);

  const enScore =
    (combined.match(
      /\b(what|which|when|where|who|should|must|vehicle|vehicles|driver|drivers|road|sign|signs|traffic|speed|limit|right|left|pedestrian|crossing|roundabout|overtaking|license|permit|yes|no|none|always|never|only|following|between|before|after|lights|when|while|the|and|for|with|must)\b/g
    )?.length || 0) * 2;

  const rwScore = rwMatches * 2;

  if (rwScore >= enScore && rwScore >= frScore && rwScore > 0) {
    return "Kinyarwanda";
  }
  if (frScore > rwScore && frScore >= enScore && frScore >= 4) {
    return "French";
  }
  if (enScore > rwScore && enScore > frScore && enScore >= 4) {
    return "English";
  }
  return "Kinyarwanda";
}

interface QuestionTextItem {
  qIdx: number;
  qId: string;
  srcLang: TargetLanguage;
  hash: string;
  qText: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  expl: string;
}

/**
 * Detects previously poisoned cache entries where untranslated Kinyarwanda source text
 * was mistakenly stored under target_language = "English" or "French".
 */
function isPoisonedOrUntranslatedCache(
  cachedData: Record<string, any> | null | undefined,
  source: Pick<QuestionTextItem, "srcLang" | "qText" | "optA" | "optB" | "optC" | "optD">,
  targetLang: TargetLanguage
): boolean {
  if (!cachedData || typeof cachedData !== "object") return true;
  if (targetLang === source.srcLang) return false;

  const cachedQ = normalizeComparable(cachedData.question);
  const srcQ = normalizeComparable(source.qText);

  if (srcQ.length > 5 && (!cachedQ || cachedQ === srcQ)) {
    return true;
  }

  const pairs: Array<[string, string]> = [
    [String(cachedData.option_a || ""), source.optA],
    [String(cachedData.option_b || ""), source.optB],
    [String(cachedData.option_c || ""), source.optC],
    [String(cachedData.option_d || ""), source.optD],
  ];

  let substantialOpts = 0;
  let identicalSubstantialOpts = 0;
  for (const [cachedOpt, srcOpt] of pairs) {
    if (hasSubstantialWords(srcOpt)) {
      substantialOpts++;
      if (normalizeComparable(cachedOpt) === normalizeComparable(srcOpt)) {
        identicalSubstantialOpts++;
      }
    }
  }

  if (substantialOpts >= 2 && identicalSubstantialOpts === substantialOpts) {
    return true;
  }

  if (source.srcLang === "Kinyarwanda" && targetLang !== "Kinyarwanda") {
    const detectedCachedLang = detectQuestionSourceLang({
      question: cachedData.question,
      option_a: cachedData.option_a,
      option_b: cachedData.option_b,
      option_c: cachedData.option_c,
      option_d: cachedData.option_d,
    });
    if (detectedCachedLang === "Kinyarwanda" && cachedQ === srcQ) {
      return true;
    }
  }

  return false;
}

function isGenuineTranslationForCache(
  item: QuestionTextItem,
  translatedMap: Map<number, string>,
  base: number,
  targetLang: TargetLanguage
): boolean {
  if (item.srcLang === targetLang) return false;

  const hasQ = item.qText.length > 0;
  const gotQ = translatedMap.get(base + 0);

  if (hasQ) {
    if (!gotQ || !gotQ.trim()) return false;
    if (item.qText.length > 5 && normalizeComparable(gotQ) === normalizeComparable(item.qText)) {
      return false;
    }
  }

  const optPairs: Array<[number, string]> = [
    [1, item.optA],
    [2, item.optB],
    [3, item.optC],
    [4, item.optD],
  ];

  let substantialCount = 0;
  let changedSubstantialCount = 0;
  for (const [offset, srcOpt] of optPairs) {
    if (hasSubstantialWords(srcOpt)) {
      substantialCount++;
      const gotOpt = translatedMap.get(base + offset);
      if (gotOpt && normalizeComparable(gotOpt) !== normalizeComparable(srcOpt)) {
        changedSubstantialCount++;
      }
    }
  }

  if (substantialCount >= 2 && changedSubstantialCount === 0) {
    return false;
  }

  return true;
}

async function runQuestionTranslation<
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
  adminSb: SupabaseClient,
  questions: T[],
  language?: string | null,
  sourceLanguage?: string | null,
  maxUncachedSync?: number
): Promise<{ questions: T[]; pendingIds: string[] }> {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { questions, pendingIds: [] };
  }

  const targetLang = resolveTargetLang(language);
  const explicitSourceLang =
    sourceLanguage && sourceLanguage !== "auto"
      ? resolveTargetLang(sourceLanguage)
      : null;

  if (explicitSourceLang && explicitSourceLang === targetLang) {
    return { questions, pendingIds: [] };
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

    const uncachedItems: QuestionTextItem[] = [];
    const result = questions.map((q) => ({ ...q }));

    for (let i = 0; i < result.length; i++) {
      const q = result[i];
      const srcLang = explicitSourceLang || detectQuestionSourceLang(q);
      if (srcLang === targetLang) {
        continue;
      }

      const qText = String(q.question || "").trim();
      const optA = String(q.option_a || "").trim();
      const optB = String(q.option_b || "").trim();
      const optC = String(q.option_c || "").trim();
      const optD = String(q.option_d || "").trim();
      const expl = String(q.explanation || "").trim();
      const combined = `${qText}||${optA}||${optB}||${optC}||${optD}||${expl}`;
      const hash = crypto.createHash("md5").update(combined).digest("hex");
      const cached = cachedMap.get(`q_trans_${q.id}`);

      if (
        cached &&
        cached.hash === hash &&
        cached.data &&
        !isPoisonedOrUntranslatedCache(
          cached.data,
          { srcLang, qText, optA, optB, optC, optD },
          targetLang
        )
      ) {
        if (cached.data.question) q.question = cached.data.question;
        if (cached.data.option_a) q.option_a = cached.data.option_a;
        if (cached.data.option_b) q.option_b = cached.data.option_b;
        if (cached.data.option_c) q.option_c = cached.data.option_c;
        if (cached.data.option_d) q.option_d = cached.data.option_d;
        if (cached.data.explanation) q.explanation = cached.data.explanation;
      } else {
        uncachedItems.push({
          qIdx: i,
          qId: q.id,
          srcLang,
          hash,
          qText,
          optA,
          optB,
          optC,
          optD,
          expl,
        });
      }
    }

    const syncLimit =
      typeof maxUncachedSync === "number" && maxUncachedSync > 0
        ? maxUncachedSync
        : uncachedItems.length;

    const syncItems = uncachedItems.slice(0, syncLimit);
    const pendingIds = uncachedItems.slice(syncLimit).map((item) => String(item.qId));

    const toTranslateBySource = new Map<TargetLanguage, QuestionTextItem[]>();
    for (const item of syncItems) {
      const list = toTranslateBySource.get(item.srcLang) || [];
      list.push(item);
      toTranslateBySource.set(item.srcLang, list);
    }

    const nowStr = new Date().toISOString();
    const upserts: any[] = [];

    for (const [srcLang, groupItems] of toTranslateBySource.entries()) {
      if (groupItems.length === 0) continue;

      const snippets: { id: number; text: string }[] = [];
      for (let idx = 0; idx < groupItems.length; idx++) {
        const item = groupItems[idx];
        const base = idx * 6;
        if (item.qText) snippets.push({ id: base + 0, text: item.qText });
        if (item.optA) snippets.push({ id: base + 1, text: item.optA });
        if (item.optB) snippets.push({ id: base + 2, text: item.optB });
        if (item.optC) snippets.push({ id: base + 3, text: item.optC });
        if (item.optD) snippets.push({ id: base + 4, text: item.optD });
        if (item.expl) snippets.push({ id: base + 5, text: item.expl });
      }

      if (snippets.length === 0) continue;

      const translatedMap = await translateTextSnippets(
        snippets,
        srcLang,
        targetLang,
        {
          batchSize: 30,
          concurrency: 5,
          timeoutMs: 25000,
          maxRetries: 2,
          skipRetryMissed: false,
          omitUnmappedFallback: true,
          bestEffort: true,
        }
      ).catch((err) => {
        console.warn("[ExamTranslator] Snippet batch error:", err);
        return new Map<number, string>();
      });

      for (let idx = 0; idx < groupItems.length; idx++) {
        const item = groupItems[idx];
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

        if (isGenuineTranslationForCache(item, translatedMap, base, targetLang)) {
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
              sourceLang: item.srcLang,
              translationVersion: 2,
              updatedAt: nowStr,
            },
            updated_at: nowStr,
          });
        }
      }
    }

    if (upserts.length > 0) {
      await adminSb
        .from("course_ai_cache")
        .upsert(upserts, { onConflict: "entity_id,target_language,feature_type" })
        .then(() => {}, () => {});
    }

    return { questions: result, pendingIds };
  } catch (err) {
    console.warn("[ExamTranslator] Question translation fallback:", err);
    return { questions, pendingIds: [] };
  }
}

export async function translateQuestionBatch<
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
  adminSb: SupabaseClient,
  questions: T[],
  language?: string | null,
  sourceLanguage?: string | null
): Promise<T[]> {
  const res = await runQuestionTranslation(adminSb, questions, language, sourceLanguage);
  return res.questions;
}

export async function translateQuestionBatchProgressive<
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
  adminSb: SupabaseClient,
  questions: T[],
  language?: string | null,
  sourceLanguage?: string | null,
  maxUncachedSync = 4
): Promise<{ questions: T[]; pendingIds: string[] }> {
  return runQuestionTranslation(adminSb, questions, language, sourceLanguage, maxUncachedSync);
}
