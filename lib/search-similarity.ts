import { GazetteArticle, getGazetteArticles } from "./gazette-data";
import { createAdminClient } from "./supabase/admin";

export type SupportedLanguage = "rw" | "en" | "fr";

/**
 * Detect language of query based on distinctive vocabulary markers.
 */
export function detectQueryLanguage(query: string, fallback: SupportedLanguage = "rw"): SupportedLanguage {
  const text = (query || "").toLowerCase();

  // Kinyarwanda markers
  const rwPatterns = [
    /\b(umuhanda|ibinyabiziga|imodoka|ikinyabiziga|ibyapa|integuza|ibibuzwa|ibitegeka)\b/,
    /\b(gutambuka|amasangano|uruziga|rond-point|umuvuduko|ntarengwa|ihazabu|agateganyo)\b/,
    /\b(kunyuranaho|guhagarara|ikizamini|ibizamini|ingingo|amategeko|polisi|uburenganzira)\b/,
    /\b(kuki|ryari|hehe|iki|biri|ndetse|kandi|nta|niba|igihe|byose|buri|wese)\b/,
    /\b(mu|ku|ya|bya|cy'|ry'|rw'|bw'|n'|abanyamaguru|abashoferi)\b/
  ];

  // French markers
  const frPatterns = [
    /\b(priorité|droite|gauche|carrefour|rond-point|giratoire|vitesse|limite|agglomération)\b/,
    /\b(dépassement|dépasser|panneau|panneaux|danger|interdiction|obligation|indication)\b/,
    /\b(véhicule|véhicules|permis|provisoire|examen|code|route|amende|circulation)\b/,
    /\b(le|la|les|un|une|des|qui|que|dans|sur|pour|avec|sans|est|sont|aux)\b/
  ];

  // English markers
  const enPatterns = [
    /\b(right|way|priority|intersection|roundabout|speed|limit|urban|built-up)\b/,
    /\b(overtake|overtaking|prohibited|road|sign|signs|warning|mandatory|regulatory)\b/,
    /\b(traffic|driver|driving|license|provisional|police|fine|penalty|pedestrian)\b/,
    /\b(what|when|where|which|who|how|does|can|should|is|are|the|for|with)\b/
  ];

  let rwScore = 0;
  let frScore = 0;
  let enScore = 0;

  for (const p of rwPatterns) {
    if (p.test(text)) rwScore += 2;
  }
  for (const p of frPatterns) {
    if (p.test(text)) frScore += 2;
  }
  for (const p of enPatterns) {
    if (p.test(text)) enScore += 2;
  }

  if (rwScore > frScore && rwScore > enScore) return "rw";
  if (frScore > rwScore && frScore > enScore) return "fr";
  if (enScore > rwScore && enScore > frScore) return "en";

  return fallback;
}

/**
 * Tokenize and normalize text for string similarity
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Compute Jaccard / Overlap similarity score between query tokens and document tokens
 */
function computeSimilarity(queryTokens: Set<string>, docTokens: Set<string>): number {
  if (queryTokens.size === 0 || docTokens.size === 0) return 0;
  let matches = 0;
  for (const q of queryTokens) {
    if (docTokens.has(q)) {
      matches += 1;
    } else {
      // Partial prefix/substring match
      for (const d of docTokens) {
        if (d.startsWith(q) || q.startsWith(d)) {
          matches += 0.5;
          break;
        }
      }
    }
  }
  return matches / Math.sqrt(queryTokens.size * docTokens.size);
}

export interface AssistantAnswerResult {
  language: SupportedLanguage;
  directAnswer: string;
  source: "ai_grounded" | "similarity_fallback";
  gazetteArticles: Array<{
    id: string;
    articleNumber: string;
    title: string;
    decreeRef: string;
    excerpt: string;
    keyTakeaways: string[];
  }>;
  matchedLessons: Array<{
    id: string;
    title: string;
    moduleTitle?: string;
    summary: string;
  }>;
  sampleQuestions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

/**
 * Fallback similarity search engine that executes when AI quota is reached or offline.
 * Queries indexed Gazette articles, course lessons, and exam questions to build an authoritative response.
 */
export async function searchSimilarityFallback(
  query: string,
  preferredLang?: SupportedLanguage
): Promise<AssistantAnswerResult> {
  const lang = preferredLang || detectQueryLanguage(query);
  const queryTokens = tokenize(query);

  const adminSb = createAdminClient();

  // 1. Fetch & score Gazette articles
  const allArticles = await getGazetteArticles();
  const scoredArticles = allArticles.map((art) => {
    const isLangMatch = art.language === lang || art.language === "all";
    const docTokens = tokenize(
      `${art.articleNumber} ${art.title} ${art.content} ${(art.keyTakeaways || []).join(" ")}`
    );
    let score = computeSimilarity(queryTokens, docTokens);
    if (isLangMatch) score *= 1.35; // Boost language match
    return { art, score };
  });

  scoredArticles.sort((a, b) => b.score - a.score);
  const topArticles = scoredArticles.filter((x) => x.score > 0.05).slice(0, 2);
  const bestArticle = topArticles.length > 0
    ? topArticles[0].art
    : (allArticles.find((a) => a.language === lang) || allArticles[0] || null);

  // 2. Query matching Course Lessons
  let matchedLessons: AssistantAnswerResult["matchedLessons"] = [];
  try {
    const { data: lessons } = await adminSb
      .from("course_lessons")
      .select("id, title, content, module_id")
      .limit(30);

    if (lessons && lessons.length > 0) {
      const scoredLessons = lessons.map((l: any) => {
        const docTokens = tokenize(`${l.title} ${l.content || ""}`);
        const score = computeSimilarity(queryTokens, docTokens);
        return { l, score };
      });
      scoredLessons.sort((a, b) => b.score - a.score);
      matchedLessons = scoredLessons
        .filter((x) => x.score > 0.05)
        .slice(0, 3)
        .map((x) => ({
          id: String(x.l.id),
          title: x.l.title || "Lesson",
          summary: x.l.content ? x.l.content.slice(0, 140).replace(/<[^>]*>/g, "") + "..." : "Official traffic study guide and regulation breakdown.",
        }));
    }
  } catch {}

  // 3. Query matching Exam Questions
  let sampleQuestions: AssistantAnswerResult["sampleQuestions"] = [];
  try {
    const { data: questions } = await adminSb
      .from("exam_questions")
      .select("id, question, options, correct_answer, explanation")
      .limit(50);

    if (questions && questions.length > 0) {
      const scoredQuestions = questions.map((q: any) => {
        const optsText = Array.isArray(q.options) ? q.options.join(" ") : "";
        const docTokens = tokenize(`${q.question} ${optsText} ${q.explanation || ""}`);
        const score = computeSimilarity(queryTokens, docTokens);
        return { q, score };
      });
      scoredQuestions.sort((a, b) => b.score - a.score);
      sampleQuestions = scoredQuestions
        .slice(0, 3)
        .map((x) => {
          const opts = Array.isArray(x.q.options)
            ? x.q.options
            : typeof x.q.options === "string"
            ? JSON.parse(x.q.options || "[]")
            : [];
          return {
            id: String(x.q.id),
            question: x.q.question,
            options: opts,
            correctAnswer: String(x.q.correct_answer || ""),
            explanation: x.q.explanation || (lang === "rw" ? "Hakurikijwe amategeko y'umuhanda mu Rwanda." : "Based on official Rwanda Road Traffic Regulations."),
          };
        });
    }
  } catch {}

  // 4. Construct direct answer in the appropriate language
  let directAnswer = "";
  if (bestArticle) {
    if (lang === "rw") {
      directAnswer = `Hakurikijwe amategeko agenga umuhanda mu Rwanda (${bestArticle.articleNumber}): ${bestArticle.title}. ${bestArticle.keyTakeaways[0] || ""} ${bestArticle.keyTakeaways[1] || ""}`;
    } else if (lang === "fr") {
      directAnswer = `Conformément au Code de la route rwandais (${bestArticle.articleNumber}) : ${bestArticle.title}. ${bestArticle.keyTakeaways[0] || ""} ${bestArticle.keyTakeaways[1] || ""}`;
    } else {
      directAnswer = `According to official Rwanda Road Traffic Regulations (${bestArticle.articleNumber}): ${bestArticle.title}. ${bestArticle.keyTakeaways[0] || ""} ${bestArticle.keyTakeaways[1] || ""}`;
    }
  } else if (matchedLessons.length > 0 || sampleQuestions.length > 0) {
    // Gazette awaiting upload: use curriculum courses and exam questions
    if (lang === "rw") {
      const lessonTitle = matchedLessons[0]?.title || "Amasomo y'umuhanda";
      const qContext = sampleQuestions[0]?.question ? ` Urugero rw'ikibazo: "${sampleQuestions[0].question}"` : "";
      directAnswer = `Hakurikijwe porogaramu y'amasomo y'amategeko y'umuhanda mu Rwanda (${lessonTitle}): ${matchedLessons[0]?.summary || "Amabwiriza y'umuhanda ateganya kubahiriza ibimenyetso n'uburenganzira bwo gutambuka."}${qContext}`;
    } else if (lang === "fr") {
      const lessonTitle = matchedLessons[0]?.title || "Programme du Code de la route";
      const qContext = sampleQuestions[0]?.question ? ` Exemple de question d'examen : "${sampleQuestions[0].question}"` : "";
      directAnswer = `Conformément au programme officiel du Code de la route rwandais (${lessonTitle}) : ${matchedLessons[0]?.summary || "Les règles de circulation imposent le respect de la signalisation et des priorités."}${qContext}`;
    } else {
      const lessonTitle = matchedLessons[0]?.title || "Official Highway Code Curriculum";
      const qContext = sampleQuestions[0]?.question ? ` Exam question reference: "${sampleQuestions[0].question}"` : "";
      directAnswer = `According to the official Rwanda Highway Code curriculum (${lessonTitle}): ${matchedLessons[0]?.summary || "Standard road regulations require drivers to observe posted signs and right-of-way rules."}${qContext}`;
    }
  } else {
    if (lang === "rw") {
      directAnswer = "Amategeko y'umuhanda mu Rwanda asaba abashoferi bose kubahiriza amabwiriza n'ibyapa by'umuhanda no kwirinda impanuka.";
    } else if (lang === "fr") {
      directAnswer = "Le Code de la route rwandais exige que tous les conducteurs respectent la signalisation routière et conduisent avec prudence.";
    } else {
      directAnswer = "Rwanda road traffic regulations require all drivers to adhere to official traffic signs, speed limits, and priority rules.";
    }
  }

  const gazetteResults = topArticles.length > 0
    ? topArticles.map((t) => ({
        id: t.art.id,
        articleNumber: t.art.articleNumber,
        title: t.art.title,
        decreeRef: t.art.decreeRef,
        excerpt: t.art.content.slice(0, 300) + (t.art.content.length > 300 ? "..." : ""),
        keyTakeaways: t.art.keyTakeaways,
      }))
    : bestArticle
    ? [
        {
          id: bestArticle.id,
          articleNumber: bestArticle.articleNumber,
          title: bestArticle.title,
          decreeRef: bestArticle.decreeRef,
          excerpt: bestArticle.content.slice(0, 300) + (bestArticle.content.length > 300 ? "..." : ""),
          keyTakeaways: bestArticle.keyTakeaways,
        },
      ]
    : [];

  return {
    language: lang,
    directAnswer,
    source: "similarity_fallback",
    gazetteArticles: gazetteResults,
    matchedLessons,
    sampleQuestions,
  };
}
