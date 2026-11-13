import { GazetteArticle, getGazetteArticles } from "./gazette-data";
import { createAdminClient } from "./supabase/admin";
import { getExternalAdminClient } from "./supabase/external";

export type SupportedLanguage = "rw" | "en" | "fr";

export interface DetectedLanguageInfo {
  uiLang: SupportedLanguage;
  languageName: string;
  isNonCoreLanguage: boolean;
}

export interface SearchableLesson {
  id: string;
  title: string;
  moduleTitle?: string;
  rawText: string;
  summary: string;
  source: "primary" | "external";
}

export interface SearchableQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  correctOptionText: string;
  explanation: string;
  source: "primary" | "external";
}

export interface AssistantAnswerResult {
  language: SupportedLanguage;
  detectedLanguageName?: string;
  requiresAuthForFullAccess?: boolean;
  similarityScore?: number;
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
    similarityPercent?: number;
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
 * Cross-lingual concept dictionary (RW / EN / FR / SW) so a browser search
 * in any language still matches Kinyarwanda, English, and French records in the DB.
 */
const MULTILINGUAL_CONCEPT_GROUPS: string[][] = [
  ["roundabout", "amasangano", "azunguruka", "uruziga", "rond", "point", "giratoire", "mzunguko", "rotonda", "kreisverkehr"],
  ["priority", "uburenganzira", "gutambuka", "mbere", "priorite", "right", "way", "iburyo", "droite", "ibumoso", "gauche", "kipaumbele"],
  ["speed", "umuvuduko", "ntarengwa", "vitesse", "limite", "limit", "mwendo", "kasi", "velocidad", "tempo"],
  ["urban", "town", "city", "built", "nsisiro", "umujyi", "imijyi", "migi", "agglomeration", "mjini", "urbana"],
  ["overtake", "overtaking", "kunyuranaho", "unyuranaho", "depassement", "depasser", "kupita", "adelantar"],
  ["sign", "signs", "icyapa", "ibyapa", "ibimenyetso", "panneau", "panneaux", "signalisation", "alama", "senal"],
  ["warning", "danger", "integuza", "mpandeshatu", "triangle", "avertissement", "tahadhari", "peligro"],
  ["prohibited", "prohibitory", "ibibuzwa", "bibujijwe", "birabujijwe", "interdiction", "interdit", "marufuku", "prohibido"],
  ["mandatory", "ibitegeka", "bitegetswe", "obligation", "obligatoire", "lazima", "obligatorio"],
  ["parking", "stop", "guhagarara", "guparika", "stationnement", "arret", "arreter", "maegesho", "estacionar"],
  ["pedestrian", "pedestrians", "umunyamaguru", "abanyamaguru", "pieton", "pietons", "mtembea", "peaton"],
  ["alcohol", "drunk", "drink", "ibisindisha", "wasinze", "inzoga", "alcool", "ivresse", "pombe", "ulevi"],
  ["penalty", "penalties", "fine", "fines", "ihazabu", "igihano", "ibihano", "amende", "amendes", "sanction", "faini", "multa"],
  ["license", "permit", "provisional", "uruhushya", "agateganyo", "burundu", "permis", "provisoire", "definitif", "leseni", "licencia"],
  ["trailer", "makuzungu", "romoroki", "ikiromoroki", "remorque", "gikurura", "towing"],
  ["motorcycle", "moto", "helmet", "ipikipiki", "ingofero", "casque", "motocyclette", "pikipiki"],
  ["lights", "headlights", "itara", "amatara", "feu", "feux", "lumiere", "phare", "taa", "luces"],
  ["brake", "brakes", "feri", "guhagarika", "frein", "freins", "freinage", "breki", "freno"],
  ["horn", "ihoni", "impuruza", "klaxon", "avertisseur", "sonore", "honi"],
  ["weight", "mass", "uburemere", "poids", "masse", "tonnes", "toni", "kg", "peso"],
  ["length", "width", "height", "uburebure", "ubugari", "ubuhagarike", "longueur", "largeur", "hauteur", "metero", "meter", "metres"],
  ["intersection", "junction", "amasangano", "carrefour", "croisement", "njia", "panda", "cruce"],
  ["vehicle", "vehicles", "ikinyabiziga", "ibinyabiziga", "imodoka", "vehicule", "vehicules", "car", "voiture", "gari"],
  ["driver", "driving", "umushoferi", "abashoferi", "umuyobozi", "gutwara", "conducteur", "conduire", "dereva", "conductor"],
  ["accident", "breakdown", "impanuka", "ingorane", "panne", "ajali", "accidente"],
  ["distance", "intera", "umwanya", "distance", "umbali", "distancia"],
  ["seatbelt", "belt", "umukandara", "ceinture", "securite", "mkanda", "cinturon"],
  ["law", "article", "ingingo", "itegeko", "amategeko", "iteka", "perezida", "loi", "code", "route", "sheria", "ley"],
  ["police", "polisi", "police", "umupolisi", "polisi"],
];

const TOKEN_TO_CONCEPTS = new Map<string, string[]>();
for (const group of MULTILINGUAL_CONCEPT_GROUPS) {
  for (const term of group) {
    TOKEN_TO_CONCEPTS.set(term, group);
  }
}

export function detectAnyLanguage(query: string, fallback: SupportedLanguage = "rw"): DetectedLanguageInfo {
  const text = (query || "").toLowerCase();

  // Check Swahili markers
  const swPatterns = [
    /\b(ni nini|sheria za|barabara|gari|dereva|mwendo|kasi|leseni|mzunguko|alama za|mtembea|faini|kwa miguu|kupita|breki)\b/,
  ];
  // Check Spanish markers
  const esPatterns = [
    /\b(qué|cual|cuál|velocidad|rotonda|señal|tráfico|conducir|licencia|multa|peatón|carretera)\b/,
  ];
  // Check German markers
  const dePatterns = [
    /\b(was ist|geschwindigkeit|vorfahrt|verkehr|führerschein|straße|überholen|bußgeld)\b/,
  ];

  // Kinyarwanda markers
  const rwPatterns = [
    /\b(umuhanda|ibinyabiziga|imodoka|ikinyabiziga|ibyapa|icyapa|integuza|ibibuzwa|ibitegeka)\b/,
    /\b(gutambuka|amasangano|uruziga|umuvuduko|ntarengwa|ihazabu|agateganyo|burundu)\b/,
    /\b(kunyuranaho|guhagarara|ikizamini|ibizamini|ingingo|amategeko|polisi|uburenganzira)\b/,
    /\b(kuki|ryari|hehe|iki|biri|ndetse|kandi|nta|niba|igihe|byose|buri|wese|nde|uwuhe|izihe)\b/,
    /\b(mu|ku|ya|bya|abanyamaguru|abashoferi|umushoferi|romoroki|makuzungu|mpandeshatu)\b/,
  ];

  // French markers
  const frPatterns = [
    /\b(priorité|priorite|droite|gauche|carrefour|rond-point|giratoire|vitesse|limite|agglomération|agglomeration)\b/,
    /\b(dépassement|depassement|dépasser|depasser|panneau|panneaux|danger|interdiction|obligation|indication)\b/,
    /\b(véhicule|vehicule|véhicules|permis|provisoire|examen|code|route|amende|circulation|stationnement)\b/,
    /\b(qui|que|quoi|quand|comment|pourquoi|dans|sur|pour|avec|sans|est|sont|aux|quelle|quels)\b/,
  ];

  // English markers
  const enPatterns = [
    /\b(right|way|priority|intersection|roundabout|speed|limit|urban|built-up)\b/,
    /\b(overtake|overtaking|prohibited|road|sign|signs|warning|mandatory|regulatory)\b/,
    /\b(traffic|driver|driving|license|licence|provisional|police|fine|penalty|pedestrian|parking)\b/,
    /\b(what|when|where|which|who|how|why|does|can|should|is|are|the|for|with|mean|means)\b/,
  ];

  let rwScore = 0;
  let frScore = 0;
  let enScore = 0;
  let swScore = 0;
  let esScore = 0;
  let deScore = 0;

  for (const p of rwPatterns) if (p.test(text)) rwScore += 2;
  for (const p of frPatterns) if (p.test(text)) frScore += 2;
  for (const p of enPatterns) if (p.test(text)) enScore += 2;
  for (const p of swPatterns) if (p.test(text)) swScore += 3;
  for (const p of esPatterns) if (p.test(text)) esScore += 3;
  for (const p of dePatterns) if (p.test(text)) deScore += 3;

  if (swScore > rwScore && swScore > frScore && swScore > enScore) {
    return { uiLang: "en", languageName: "Swahili (Kiswahili)", isNonCoreLanguage: true };
  }
  if (esScore > rwScore && esScore > frScore && esScore > enScore) {
    return { uiLang: "en", languageName: "Spanish (Español)", isNonCoreLanguage: true };
  }
  if (deScore > rwScore && deScore > frScore && deScore > enScore) {
    return { uiLang: "en", languageName: "German (Deutsch)", isNonCoreLanguage: true };
  }

  if (rwScore > frScore && rwScore > enScore) {
    return { uiLang: "rw", languageName: "Kinyarwanda", isNonCoreLanguage: false };
  }
  if (frScore > rwScore && frScore > enScore) {
    return { uiLang: "fr", languageName: "French", isNonCoreLanguage: false };
  }
  if (enScore > rwScore && enScore > frScore) {
    return { uiLang: "en", languageName: "English", isNonCoreLanguage: false };
  }

  // Fallback check for non-Latin scripts (Arabic, Chinese, Japanese, Korean, Hindi, Cyrillic, etc.)
  if (/[^\u0000-\u024F\s\d.,!?;:'"()\-–—/%]/.test(query)) {
    return { uiLang: "en", languageName: "the user's exact input language", isNonCoreLanguage: true };
  }

  const label = fallback === "fr" ? "French" : fallback === "en" ? "English" : "Kinyarwanda";
  return { uiLang: fallback, languageName: label, isNonCoreLanguage: false };
}

/**
 * Backward-compatible language detector for core 3 languages
 */
export function detectQueryLanguage(query: string, fallback: SupportedLanguage = "rw"): SupportedLanguage {
  return detectAnyLanguage(query, fallback).uiLang;
}

function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Tokenize and normalize text (handling Kinyarwanda contractions like y', cy', ry', n', kw').
 */
export function tokenizeText(text: string): Set<string> {
  const normalized = stripDiacritics((text || "").toLowerCase())
    .replace(/\b([a-z]{1,3})['’]([a-z]{2,})/g, "$2")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’\[\]<>]/g, " ");

  const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "what", "when", "where", "who", "how",
    "les", "des", "une", "pour", "avec", "dans", "qui", "que", "est", "sont",
    "mu", "ku", "ya", "wa", "na", "ni", "ba", "za", "rya", "cya", "bya", "ari", "icyo",
  ]);

  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return new Set(words);
}

function expandWithConcepts(tokens: Set<string>): Set<string> {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const group = TOKEN_TO_CONCEPTS.get(t);
    if (group) {
      for (const synonym of group) {
        expanded.add(synonym);
      }
    }
  }
  return expanded;
}

function buildTrigrams(text: string): Set<string> {
  const clean = stripDiacritics(text.toLowerCase()).replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const grams = new Set<string>();
  if (clean.length < 3) return grams;
  for (let i = 0; i <= clean.length - 3; i++) {
    grams.add(clean.slice(i, i + 3));
  }
  return grams;
}

/**
 * Compute hybrid similarity (exact token overlap + multilingual concept expansion + prefix/stem + trigram similarity)
 */
export function computeHybridSimilarity(
  queryText: string,
  queryTokens: Set<string>,
  expandedQueryTokens: Set<string>,
  queryTrigrams: Set<string>,
  docText: string
): number {
  if (!docText) return 0;
  const docTokens = tokenizeText(docText);
  if (docTokens.size === 0 || queryTokens.size === 0) return 0;

  let directMatches = 0;
  for (const q of queryTokens) {
    if (docTokens.has(q)) {
      directMatches += 1;
    } else {
      for (const d of docTokens) {
        if ((d.length >= 4 && q.length >= 4) && (d.startsWith(q.slice(0, 4)) || q.startsWith(d.slice(0, 4)))) {
          directMatches += 0.55;
          break;
        }
      }
    }
  }

  let conceptMatches = 0;
  for (const q of expandedQueryTokens) {
    if (docTokens.has(q)) {
      conceptMatches += 0.7;
    }
  }

  const directScore = directMatches / Math.sqrt(queryTokens.size * Math.min(docTokens.size, 40));
  const conceptScore = conceptMatches / Math.sqrt(Math.max(1, expandedQueryTokens.size) * Math.min(docTokens.size, 40));

  // Character trigram Jaccard overlap for fuzzy / cross-dialect resilience
  let trigramScore = 0;
  if (queryTrigrams.size > 0) {
    const docTrigrams = buildTrigrams(docText.slice(0, 400));
    let triHit = 0;
    for (const g of queryTrigrams) {
      if (docTrigrams.has(g)) triHit++;
    }
    const union = queryTrigrams.size + docTrigrams.size - triHit;
    if (union > 0) trigramScore = triHit / union;
  }

  // Exact substring phrase boost
  const cleanQ = stripDiacritics(queryText.toLowerCase()).trim();
  const cleanDoc = stripDiacritics(docText.toLowerCase());
  const phraseBonus = cleanQ.length >= 5 && cleanDoc.includes(cleanQ) ? 0.45 : 0;

  return Math.min(1, directScore * 0.55 + conceptScore * 0.35 + trigramScore * 0.35 + phraseBonus);
}

function stripHtml(html: string): string {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function mapLetterToOption(
  letter: string,
  opts: string[]
): string {
  const upper = String(letter || "").trim().toUpperCase();
  if (upper === "A" || upper === "0" || upper === "1") return opts[0] || "";
  if (upper === "B" || upper === "2") return opts[1] || "";
  if (upper === "C" || upper === "3") return opts[2] || "";
  if (upper === "D" || upper === "4") return opts[3] || "";
  return opts.find((o) => o && o.toLowerCase() === upper.toLowerCase()) || upper;
}

interface SearchableCorpus {
  lessons: SearchableLesson[];
  questions: SearchableQuestion[];
  cachedAt: number;
}

let corpusCache: SearchableCorpus | null = null;
const CORPUS_TTL_MS = 60_000;

/**
 * Loads searchable courses/lessons and question knowledge from BOTH primary and external DBs.
 * Results are kept server-side for similarity answering.
 */
export async function getSearchableCorpus(): Promise<SearchableCorpus> {
  const now = Date.now();
  if (corpusCache && now - corpusCache.cachedAt < CORPUS_TTL_MS) {
    return corpusCache;
  }

  const adminSb = createAdminClient();
  const lessonsList: SearchableLesson[] = [];
  const questionsList: SearchableQuestion[] = [];

  // 1. Primary DB: course_modules + course_lessons + exam_questions
  try {
    const [modRes, lesRes, qRes] = await Promise.all([
      adminSb.from("course_modules").select("id, title").is("deleted_at", null),
      adminSb.from("course_lessons").select("id, title, content, module_id").is("deleted_at", null).limit(500),
      adminSb
        .from("exam_questions")
        .select("id, question, option_a, option_b, option_c, option_d, correct_answer, explanation")
        .limit(1000),
    ]);

    const moduleTitleMap = new Map<string, string>();
    for (const m of modRes.data || []) {
      moduleTitleMap.set(String(m.id), String(m.title || ""));
    }

    for (const l of lesRes.data || []) {
      const plain = stripHtml(l.content || "");
      const title = String(l.title || "Isomo");
      lessonsList.push({
        id: String(l.id),
        title,
        moduleTitle: moduleTitleMap.get(String(l.module_id)) || undefined,
        rawText: `${title}. ${plain}`,
        summary: plain ? plain.slice(0, 180) + (plain.length > 180 ? "..." : "") : title,
        source: "primary",
      });
    }

    for (const q of qRes.data || []) {
      const opts = [q.option_a, q.option_b, q.option_c, q.option_d]
        .filter((x) => typeof x === "string" && x.trim().length > 0)
        .map((x) => String(x).trim());
      const correctLetter = String(q.correct_answer || "").trim();
      const correctOptionText = mapLetterToOption(correctLetter, opts);
      questionsList.push({
        id: String(q.id),
        question: String(q.question || ""),
        options: opts,
        correctAnswer: correctLetter,
        correctOptionText,
        explanation: String(q.explanation || ""),
        source: "primary",
      });
    }
  } catch (err) {
    console.warn("[search-similarity] Primary DB load warning:", err);
  }

  // 2. External DB: chapters + sections + lessons + questions
  try {
    const extSb = await getExternalAdminClient();
    if (extSb) {
      const [chapRes, secRes, extLesRes, extQRes] = await Promise.all([
        extSb.from("chapters").select("id, title"),
        extSb.from("sections").select("id, title, chapter_id"),
        extSb.from("lessons").select("id, title, section_id").limit(600),
        extSb.from("questions").select("id, title, choice, choice_answer").limit(1000),
      ]);

      const chapterMap = new Map<string, string>();
      for (const c of chapRes.data || []) {
        chapterMap.set(String(c.id), String(c.title || ""));
      }

      const sectionToChapter = new Map<string, string>();
      for (const s of secRes.data || []) {
        sectionToChapter.set(String(s.id), chapterMap.get(String(s.chapter_id)) || String(s.title || ""));
      }

      for (const l of extLesRes.data || []) {
        const fullText = stripHtml(String(l.title || ""));
        if (!fullText) continue;
        const firstLine = fullText.split(/[.:]/)[0]?.trim() || fullText;
        const shortTitle = firstLine.length > 85 ? firstLine.slice(0, 82) + "..." : firstLine;
        const modTitle = sectionToChapter.get(String(l.section_id)) || undefined;
        lessonsList.push({
          id: `ext-${l.id}`,
          title: shortTitle,
          moduleTitle: modTitle,
          rawText: fullText,
          summary: fullText.slice(0, 190) + (fullText.length > 190 ? "..." : ""),
          source: "external",
        });
      }

      for (const q of extQRes.data || []) {
        let opts: string[] = [];
        if (Array.isArray(q.choice)) {
          opts = q.choice.map((c: any) => String(c ?? "").trim()).filter(Boolean);
        } else if (typeof q.choice === "string") {
          try {
            const parsed = JSON.parse(q.choice);
            if (Array.isArray(parsed)) {
              opts = parsed.map((c: any) => String(c ?? "").trim()).filter(Boolean);
            }
          } catch {}
        }
        const ansIdx = typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0;
        const letter = ansIdx === 1 ? "B" : ansIdx === 2 ? "C" : ansIdx === 3 ? "D" : "A";
        const correctOptionText = opts[ansIdx] || opts[0] || letter;
        questionsList.push({
          id: `ext-q-${q.id}`,
          question: String(q.title || ""),
          options: opts,
          correctAnswer: letter,
          correctOptionText,
          explanation: "",
          source: "external",
        });
      }
    }
  } catch (err) {
    console.warn("[search-similarity] External DB load warning:", err);
  }

  corpusCache = { lessons: lessonsList, questions: questionsList, cachedAt: now };
  return corpusCache;
}

export interface ScoredSearchMatches {
  langInfo: DetectedLanguageInfo;
  topGazette: Array<{ art: GazetteArticle; score: number }>;
  topLessons: Array<{ lesson: SearchableLesson; score: number }>;
  topQuestions: Array<{ question: SearchableQuestion; score: number }>;
  bestSimilarityPercent: number;
}

export async function findTopMatchesForQuery(
  query: string,
  forcedLang?: SupportedLanguage
): Promise<ScoredSearchMatches> {
  const detected = detectAnyLanguage(query, forcedLang || "rw");
  const langInfo: DetectedLanguageInfo = forcedLang
    ? {
        uiLang: forcedLang,
        languageName: forcedLang === "fr" ? "French" : forcedLang === "en" ? "English" : "Kinyarwanda",
        isNonCoreLanguage: false,
      }
    : detected;

  const queryTokens = tokenizeText(query);
  const expandedTokens = expandWithConcepts(queryTokens);
  const queryTrigrams = buildTrigrams(query);

  const [allArticles, corpus] = await Promise.all([
    getGazetteArticles(),
    getSearchableCorpus(),
  ]);

  const scoredGazette = allArticles
    .map((art) => {
      const score = computeHybridSimilarity(
        query,
        queryTokens,
        expandedTokens,
        queryTrigrams,
        `${art.articleNumber} ${art.title} ${art.content} ${(art.keyTakeaways || []).join(" ")}`
      );
      const langBoost = art.language === langInfo.uiLang || art.language === "all" ? 1.15 : 1;
      return { art, score: Math.min(1, score * langBoost) };
    })
    .filter((x) => x.score > 0.06)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const scoredLessons = corpus.lessons
    .map((lesson) => ({
      lesson,
      score: computeHybridSimilarity(
        query,
        queryTokens,
        expandedTokens,
        queryTrigrams,
        `${lesson.moduleTitle || ""} ${lesson.rawText}`
      ),
    }))
    .filter((x) => x.score > 0.06)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const scoredQuestions = corpus.questions
    .map((question) => ({
      question,
      score: computeHybridSimilarity(
        query,
        queryTokens,
        expandedTokens,
        queryTrigrams,
        `${question.question} ${question.correctOptionText} ${question.options.join(" ")} ${question.explanation}`
      ),
    }))
    .filter((x) => x.score > 0.07)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const maxRaw = Math.max(
    scoredGazette[0]?.score || 0,
    scoredLessons[0]?.score || 0,
    scoredQuestions[0]?.score || 0
  );
  const bestSimilarityPercent = maxRaw > 0 ? Math.min(99, Math.max(28, Math.round(maxRaw * 100))) : 0;

  return {
    langInfo,
    topGazette: scoredGazette,
    topLessons: scoredLessons,
    topQuestions: scoredQuestions,
    bestSimilarityPercent,
  };
}

/**
 * Fallback similarity search engine that executes when AI quota is reached or offline.
 * Builds a clear grounded answer from Gazette articles, course lessons, and DB Q&As.
 */
export async function searchSimilarityFallback(
  query: string,
  preferredLang?: SupportedLanguage,
  options?: { isAuthenticated?: boolean; precomputed?: ScoredSearchMatches }
): Promise<AssistantAnswerResult> {
  const matches = options?.precomputed || (await findTopMatchesForQuery(query, preferredLang));
  const lang = matches.langInfo.uiLang;
  const isAuthenticated = Boolean(options?.isAuthenticated);

  const bestArticle = matches.topGazette[0]?.art || null;
  const bestLesson = matches.topLessons[0]?.lesson || null;
  const bestQuestion = matches.topQuestions[0]?.question || null;

  let directAnswer = "";

  if (bestArticle && (matches.topGazette[0]?.score || 0) >= (matches.topQuestions[0]?.score || 0)) {
    const takeaway = [bestArticle.keyTakeaways?.[0], bestArticle.keyTakeaways?.[1]].filter(Boolean).join(" ");
    if (lang === "fr") {
      directAnswer = `Selon le Code de la route du Rwanda (${bestArticle.articleNumber}) : ${bestArticle.title}. ${takeaway || bestArticle.content.slice(0, 220)}`;
    } else if (lang === "en") {
      directAnswer = `According to Rwanda Road Traffic Regulations (${bestArticle.articleNumber}): ${bestArticle.title}. ${takeaway || bestArticle.content.slice(0, 220)}`;
    } else {
      directAnswer = `Hakurikijwe amategeko y'umuhanda mu Rwanda (${bestArticle.articleNumber}): ${bestArticle.title}. ${takeaway || bestArticle.content.slice(0, 220)}`;
    }
  } else if (bestQuestion || bestLesson) {
    const lessonPart = bestLesson
      ? `${bestLesson.moduleTitle ? `[${bestLesson.moduleTitle}] ` : ""}${bestLesson.rawText.slice(0, 240)}`
      : "";
    const qaPart = bestQuestion
      ? bestQuestion.correctOptionText
        ? `${bestQuestion.question} — Igisubizo nyakuri: ${bestQuestion.correctOptionText}${bestQuestion.explanation ? ` (${bestQuestion.explanation})` : "."}`
        : bestQuestion.question
      : "";

    if (lang === "fr") {
      const qaFr = bestQuestion?.correctOptionText
        ? `Référence d'examen similaire : « ${bestQuestion.question} » → Réponse correcte : ${bestQuestion.correctOptionText}.`
        : "";
      directAnswer = [
        lessonPart ? `D'après le cours officiel Navo (${bestLesson?.moduleTitle || "Code de la route"}) : ${bestLesson?.summary}` : "",
        qaFr,
      ]
        .filter(Boolean)
        .join(" ");
    } else if (lang === "en") {
      const qaEn = bestQuestion?.correctOptionText
        ? `Closest database rule match: "${bestQuestion.question}" — Verified answer: ${bestQuestion.correctOptionText}.`
        : "";
      directAnswer = [
        lessonPart ? `From Navo traffic course (${bestLesson?.moduleTitle || "Highway Code"}): ${bestLesson?.summary}` : "",
        qaEn,
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      directAnswer = [
        lessonPart ? `Hakurikijwe isomo riri muri sisitemu ya Navo: ${lessonPart}` : "",
        qaPart ? `Ikibazo gisa n'icyo wabajije: ${qaPart}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }
  } else {
    if (lang === "fr") {
      directAnswer =
        "Aucune correspondance exacte n'a été trouvée pour ces mots-clés. Essayez de reformuler votre question avec des termes précis du Code de la route (ex: rond-point, vitesse, dépassement, priorité, panneaux).";
    } else if (lang === "en") {
      directAnswer =
        "No close match was found in the course database for those terms. Try rephrasing with key traffic concepts such as roundabout priority, speed limit, overtaking, road signs, or parking.";
    } else {
      directAnswer =
        "Nta gisubizo gihura neza cyabonetse ku magambo wanditse. Gerageza kubaza ukoresheje amagambo yumvikana nk'amasangano azunguruka, umuvuduko ntarengwa, kunyuranaho, ibyapa cyangwa guhagarara.";
    }
  }

  return {
    language: lang,
    detectedLanguageName: matches.langInfo.languageName,
    requiresAuthForFullAccess: !isAuthenticated,
    similarityScore: matches.bestSimilarityPercent,
    directAnswer: directAnswer.trim(),
    source: "similarity_fallback",
    gazetteArticles: matches.topGazette.slice(0, 2).map(({ art }) => ({
      id: art.id,
      articleNumber: art.articleNumber,
      title: art.title,
      decreeRef: art.decreeRef,
      excerpt: art.content.slice(0, 300) + (art.content.length > 300 ? "..." : ""),
      keyTakeaways: art.keyTakeaways,
    })),
    matchedLessons: matches.topLessons.slice(0, 3).map(({ lesson, score }) => ({
      id: lesson.id,
      title: lesson.title,
      moduleTitle: lesson.moduleTitle,
      summary: lesson.summary,
      similarityPercent: Math.min(99, Math.max(25, Math.round(score * 100))),
    })),
    // Protect full Q&A bank from unauthenticated scraping; only return practice Q&A items when authenticated
    sampleQuestions: isAuthenticated
      ? matches.topQuestions.slice(0, 3).map(({ question }) => ({
          id: question.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation:
            question.explanation ||
            (lang === "rw"
              ? "Hakurikijwe amategeko y'umuhanda mu Rwanda."
              : "Based on official Rwanda Road Traffic Regulations."),
        }))
      : [],
  };
}
