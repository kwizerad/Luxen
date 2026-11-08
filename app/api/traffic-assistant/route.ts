import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getGazetteArticles, GazetteArticle } from "@/lib/gazette-data";
import {
  detectQueryLanguage,
  searchSimilarityFallback,
  SupportedLanguage,
  AssistantAnswerResult,
} from "@/lib/search-similarity";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Tokenize and normalize query text for keyword matching
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

function scoreRelevance(queryTokens: Set<string>, targetText: string): number {
  if (queryTokens.size === 0 || !targetText) return 0;
  const targetLower = targetText.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (targetLower.includes(token)) {
      score += 1;
    }
  }
  return score;
}

export async function POST(req: NextRequest) {
  let query = "";
  let requestedLang: SupportedLanguage | undefined;

  try {
    const body = await req.json();
    query = String(body.query || "").trim();
    if (body.language && ["rw", "en", "fr"].includes(body.language)) {
      requestedLang = body.language as SupportedLanguage;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const lang: SupportedLanguage = requestedLang || detectQueryLanguage(query);
  const queryTokens = tokenize(query);

  // 1. Fetch official Gazette articles (uploaded from authentic PDF)
  const allGazetteArticles = await getGazetteArticles();
  const relevantGazette = allGazetteArticles
    .filter((a) => a.language === lang || a.language === "all" || a.language === "en")
    .map((art) => {
      const score = scoreRelevance(
        queryTokens,
        `${art.articleNumber} ${art.title} ${art.content} ${(art.keyTakeaways || []).join(" ")}`
      );
      return { art, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.art);

  const adminSb = createAdminClient();
  let sampleQuestions: AssistantAnswerResult["sampleQuestions"] = [];
  let matchedLessons: AssistantAnswerResult["matchedLessons"] = [];

  // 2. Query and score Course Lessons
  try {
    const { data: lData } = await adminSb
      .from("course_lessons")
      .select("id, title, content")
      .limit(40);

    if (lData && lData.length > 0) {
      const scoredLessons = lData.map((l: any) => {
        const score = scoreRelevance(queryTokens, `${l.title} ${l.content || ""}`);
        return { l, score };
      });
      scoredLessons.sort((a, b) => b.score - a.score);

      matchedLessons = scoredLessons.slice(0, 3).map((x) => ({
        id: String(x.l.id),
        title: x.l.title || "Lesson",
        summary: x.l.content
          ? x.l.content.slice(0, 160).replace(/<[^>]*>/g, "").trim() + "..."
          : "Official road safety lesson material.",
      }));
    }
  } catch (err) {
    console.warn("Could not fetch course lessons for traffic assistant:", err);
  }

  // 3. Query and score Exam Questions
  try {
    const { data: qData } = await adminSb
      .from("exam_questions")
      .select("id, question, options, correct_answer, explanation")
      .limit(60);

    if (qData && qData.length > 0) {
      const scoredQuestions = qData.map((q: any) => {
        const optsText = Array.isArray(q.options) ? q.options.join(" ") : "";
        const score = scoreRelevance(queryTokens, `${q.question} ${optsText} ${q.explanation || ""}`);
        return { q, score };
      });
      scoredQuestions.sort((a, b) => b.score - a.score);

      sampleQuestions = scoredQuestions.slice(0, 3).map((x) => {
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
          explanation: x.q.explanation || "",
        };
      });
    }
  } catch (err) {
    console.warn("Could not fetch exam questions for traffic assistant:", err);
  }

  // 4. Verify Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful fallback to similarity engine
    const fallbackResult = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallbackResult);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const hasGazette = relevantGazette.length > 0;
    const topGazette = relevantGazette.slice(0, 5);

    const gazetteContext = hasGazette
      ? topGazette
          .map(
            (g) =>
              `[${g.articleNumber}: ${g.title}]\nDecree Reference: ${g.decreeRef}\nContent:\n${g.content}\nKey Takeaways: ${(g.keyTakeaways || []).join("; ")}`
          )
          .join("\n\n---\n\n")
      : "No official Gazette articles uploaded in database yet.";

    const coursesContext = matchedLessons.length > 0
      ? matchedLessons.map((l, i) => `Lesson ${i + 1}: ${l.title} - ${l.summary}`).join("\n")
      : "Standard Rwanda traffic education curriculum.";

    const examsContext = sampleQuestions.length > 0
      ? sampleQuestions
          .map(
            (q, i) =>
              `Exam Question ${i + 1}: ${q.question} (Correct Answer: ${q.correctAnswer}${q.explanation ? ` - Explanation: ${q.explanation}` : ""})`
          )
          .join("\n")
      : "Standard Rwanda Police driver provisional exam syllabus.";

    const languageInstructions = {
      rw: "Subiza mu Kinyarwanda cyiza kandi gisobanutse cyane. Koresha amagambo y'amategeko y'umuhanda mu Rwanda (amasangano, uburenganzira bwo gutambuka, icyapa cy'integuza, umuvuduko ntarengwa). Sobanura neza hashingiwe ku masomo n'ibizamini, kandi niba hari ingingo y'igazeti ivuge mu buryo bweruye.",
      fr: "Répondez impérativement en Français soigné, clair et pédagogique. Utilisez la terminologie officielle du Code de la route rwandais. Expliquez clairement en vous appuyant sur le cours et les questions d'examen, et citez précisément l'article du Journal Officiel.",
      en: "Respond strictly in clear, authoritative, and educational English. Use official Rwandan Road Traffic Code terminology. Provide an easy-to-understand explanation grounded in the course syllabus and exam test questions, explicitly citing the matching Article from the Official Gazette of Rwanda.",
    };

    const prompt = `You are Navo's Official Rwanda Traffic Regulations Expert & Search Assistant.
The user is searching or asking: "${query}"

Target Language: ${lang.toUpperCase()}
Language Instruction: ${languageInstructions[lang]}

GROUNDING DATA AVAILABLE:
==================================================
OFFICIAL GAZETTE ARTICLES:
${gazetteContext}

COURSE CURRICULUM LESSONS:
${coursesContext}

RELEVANT EXAM QUESTIONS:
${examsContext}
==================================================

INSTRUCTIONS:
1. Provide a comprehensive, clear, and direct answer (3-5 sentences) explaining the rule, who has priority / what action to take, and why. Use the course lessons and exam question insights to make the answer educational and prevent common mistakes.
2. If Gazette articles are provided above: Identify the single most relevant article and cite its article number (e.g. "Ingingo ya 28" or "Article 28"), title, decree reference (e.g. "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002"), the exact excerpt, and 2-3 key takeaways.
3. If no Gazette articles are provided yet: Provide the direct answer grounded in the Rwanda road traffic course lessons and exam questions, and leave "citedArticle" as null.

OUTPUT FORMAT:
Return STRICT valid JSON with the schema:
{
  "directAnswer": "Direct, clear explanation in ${lang.toUpperCase()}...",
  "citedArticle": {
    "articleNumber": "Article number or Ingingo ya...",
    "title": "Article title",
    "decreeRef": "Official Presidential Order reference",
    "excerpt": "Key legal excerpt from that article",
    "keyTakeaways": ["Rule 1", "Rule 2"]
  } // OR null if no gazette articles exist in context
}`;

    const generatePromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI generation timeout")), 8000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const text = response.text || "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = null;
      }
    }

    if (parsed && parsed.directAnswer) {
      let gazetteList: AssistantAnswerResult["gazetteArticles"] = [];

      if (parsed.citedArticle && parsed.citedArticle.articleNumber) {
        gazetteList = [
          {
            id: "ai-cited-1",
            articleNumber: parsed.citedArticle.articleNumber || "Article 28",
            title: parsed.citedArticle.title || "Traffic Regulations",
            decreeRef: parsed.citedArticle.decreeRef || "Presidential Order No 85/01",
            excerpt: parsed.citedArticle.excerpt || "",
            keyTakeaways: Array.isArray(parsed.citedArticle.keyTakeaways)
              ? parsed.citedArticle.keyTakeaways
              : [],
          },
        ];
      } else if (hasGazette && topGazette.length > 0) {
        gazetteList = topGazette.slice(0, 1).map((g) => ({
          id: g.id,
          articleNumber: g.articleNumber,
          title: g.title,
          decreeRef: g.decreeRef,
          excerpt: g.content.slice(0, 300) + (g.content.length > 300 ? "..." : ""),
          keyTakeaways: g.keyTakeaways,
        }));
      }

      const result: AssistantAnswerResult = {
        language: lang,
        directAnswer: parsed.directAnswer,
        source: "ai_grounded",
        gazetteArticles: gazetteList,
        matchedLessons,
        sampleQuestions,
      };

      return NextResponse.json(result);
    }

    // If parsing was unsuccessful, run similarity fallback
    const fallback = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.warn("Traffic assistant error or quota fallback:", error?.message || error);
    const fallback = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallback);
  }
}
