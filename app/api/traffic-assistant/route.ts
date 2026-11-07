import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getGazetteArticles } from "@/lib/gazette-data";
import {
  detectQueryLanguage,
  searchSimilarityFallback,
  SupportedLanguage,
  AssistantAnswerResult,
} from "@/lib/search-similarity";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

  // First, retrieve Gazette articles and database context
  const gazetteArticles = await getGazetteArticles();
  const relevantGazette = gazetteArticles.filter(
    (a) => a.language === lang || a.language === "all" || a.language === "en"
  );

  const adminSb = createAdminClient();
  let sampleQuestions: AssistantAnswerResult["sampleQuestions"] = [];
  let matchedLessons: AssistantAnswerResult["matchedLessons"] = [];

  try {
    const { data: qData } = await adminSb
      .from("exam_questions")
      .select("id, question, options, correct_answer, explanation")
      .limit(20);

    if (qData) {
      sampleQuestions = qData.slice(0, 3).map((q: any) => {
        const opts = Array.isArray(q.options)
          ? q.options
          : typeof q.options === "string"
          ? JSON.parse(q.options || "[]")
          : [];
        return {
          id: String(q.id),
          question: q.question,
          options: opts,
          correctAnswer: String(q.correct_answer || ""),
          explanation: q.explanation || "",
        };
      });
    }
  } catch {}

  try {
    const { data: lData } = await adminSb
      .from("course_lessons")
      .select("id, title, content")
      .limit(10);

    if (lData) {
      matchedLessons = lData.slice(0, 3).map((l: any) => ({
        id: String(l.id),
        title: l.title || "Lesson",
        summary: l.content
          ? l.content.slice(0, 150).replace(/<[^>]*>/g, "") + "..."
          : "Official traffic regulation lesson.",
      }));
    }
  } catch {}

  // Check if GEMINI_API_KEY is available
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful fallback to similarity engine
    const fallbackResult = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallbackResult);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const gazetteContext = relevantGazette
      .slice(0, 6)
      .map(
        (g) =>
          `[${g.articleNumber}: ${g.title}]\nDecree: ${g.decreeRef}\nContent: ${g.content}\nTakeaways: ${(g.keyTakeaways || []).join(", ")}`
      )
      .join("\n\n");

    const languageInstructions = {
      rw: "Subiza mu Kinyarwanda cyiza kandi gisobanutse. Koresha amagambo n'inyito zikoreshwa mu mategeko y'umuhanda mu Rwanda (urugero: amasangano, icyapa cy'integuza, guha inzira ibituruka iburyo, umuvuduko ntarengwa). Vuga neza ingingo y'iteka rya Perezida irebana n'icyo kibazo.",
      fr: "Répondez impérativement en Français soigné et clair. Utilisez le vocabulaire officiel du Code de la route rwandais (priorité à droite, sens giratoire, agglomération, dépassement, limitation de vitesse). Citez l'article précis du décret présidentiel No 85/01.",
      en: "Respond strictly in clear, authoritative English. Use the official terminology of Rwanda Road Traffic regulations (right of way, roundabout, built-up areas, overtaking, speed limits). Explicitly cite the matching Article from Presidential Order No 85/01.",
    };

    const prompt = `You are Navo's Official Rwanda Traffic Regulations Expert & Search Assistant.
The user is searching or asking: "${query}"

Target Language: ${lang.toUpperCase()}
Language Instruction: ${languageInstructions[lang]}

Relevant Official Gazette of Rwanda context:
${gazetteContext}

Task:
1. Provide a direct, authoritative, and concise answer to the user's traffic query in ${lang.toUpperCase()}. Keep it between 2 to 4 sentences.
2. Identify the single best matching article number from the Official Gazette (e.g. "Ingingo ya 28" / "Article 28") and its decree reference.
3. List 2 to 3 concise key legal takeaways/rules related to this query.

Return your response in STRICT valid JSON format with the following keys:
{
  "directAnswer": "The direct answer in the requested language...",
  "citedArticle": {
    "articleNumber": "Article number or Ingingo ya...",
    "title": "Article title",
    "decreeRef": "Official Presidential Order reference",
    "excerpt": "Key legal excerpt from that article",
    "keyTakeaways": ["Rule 1", "Rule 2"]
  }
}`;

    const generatePromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI generation timeout")), 6000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const text = response.text || "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If JSON parsing fails, regex extract or fallback
      parsed = null;
    }

    if (parsed && parsed.directAnswer) {
      const result: AssistantAnswerResult = {
        language: lang,
        directAnswer: parsed.directAnswer,
        source: "ai_grounded",
        gazetteArticles: parsed.citedArticle
          ? [
              {
                id: "ai-cited-1",
                articleNumber: parsed.citedArticle.articleNumber || "Article 28",
                title: parsed.citedArticle.title || "Traffic Regulations",
                decreeRef: parsed.citedArticle.decreeRef || "Presidential Order No 85/01",
                excerpt: parsed.citedArticle.excerpt || "",
                keyTakeaways: parsed.citedArticle.keyTakeaways || [],
              },
            ]
          : relevantGazette.slice(0, 1).map((g) => ({
              id: g.id,
              articleNumber: g.articleNumber,
              title: g.title,
              decreeRef: g.decreeRef,
              excerpt: g.content.slice(0, 250),
              keyTakeaways: g.keyTakeaways,
            })),
        matchedLessons,
        sampleQuestions,
      };

      return NextResponse.json(result);
    }

    // If response was not valid JSON, run similarity fallback
    const fallback = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.warn("Gemini API call failed or quota exceeded, switching to similarity fallback:", error?.message || error);
    // Quota reached (HTTP 429 / RESOURCE_EXHAUSTED) or network error:
    // Execute high-availability similarity fallback seamlessly
    const fallback = await searchSimilarityFallback(query, lang);
    return NextResponse.json(fallback);
  }
}
