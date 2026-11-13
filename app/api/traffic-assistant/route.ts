import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findTopMatchesForQuery,
  searchSimilarityFallback,
  SupportedLanguage,
  AssistantAnswerResult,
} from "@/lib/search-similarity";

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

  // Check if requester is authenticated (public search works without auth,
  // while raw exam question banks & full course lessons remain gated behind auth)
  let isAuthenticated = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
    } else {
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.replace(/^bearer\s+/i, "").trim();
      if (bearerToken) {
        const adminSb = createAdminClient();
        const {
          data: { user: bearerUser },
        } = await adminSb.auth.getUser(bearerToken);
        if (bearerUser) isAuthenticated = true;
      }
    }
  } catch {
    isAuthenticated = false;
  }

  // Run full similarity search across Gazette + Primary & External Courses + DB Questions
  const matches = await findTopMatchesForQuery(query, requestedLang);
  const lang = matches.langInfo.uiLang;

  const matchedLessons: AssistantAnswerResult["matchedLessons"] = matches.topLessons
    .slice(0, 3)
    .map(({ lesson, score }) => ({
      id: lesson.id,
      title: lesson.title,
      moduleTitle: lesson.moduleTitle,
      summary: lesson.summary,
      similarityPercent: Math.min(99, Math.max(25, Math.round(score * 100))),
    }));

  const sampleQuestions: AssistantAnswerResult["sampleQuestions"] = isAuthenticated
    ? matches.topQuestions.slice(0, 3).map(({ question }) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation || "",
      }))
    : [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackResult = await searchSimilarityFallback(query, requestedLang, {
      isAuthenticated,
      precomputed: matches,
    });
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

    const topGazette = matches.topGazette.slice(0, 4).map((x) => x.art);
    const hasGazette = topGazette.length > 0;

    const gazetteContext = hasGazette
      ? topGazette
          .map(
            (g) =>
              `[${g.articleNumber}: ${g.title}]\nDecree Reference: ${g.decreeRef}\nContent:\n${g.content}\nKey Takeaways: ${(g.keyTakeaways || []).join("; ")}`
          )
          .join("\n\n---\n\n")
      : "No uploaded Gazette articles matched; rely on matched Navo course lessons and verified DB Q&As below.";

    const coursesContext =
      matches.topLessons.length > 0
        ? matches.topLessons
            .map(
              (m, i) =>
                `Course Match ${i + 1} (${Math.round(m.score * 100)}% similarity${m.lesson.moduleTitle ? ` · ${m.lesson.moduleTitle}` : ""}): ${m.lesson.rawText.slice(0, 500)}`
            )
            .join("\n")
        : "No direct course lesson excerpt matched.";

    const examsContext =
      matches.topQuestions.length > 0
        ? matches.topQuestions
            .map(
              (m, i) =>
                `Database Q&A Match ${i + 1} (${Math.round(m.score * 100)}% similarity): Question: "${m.question.question}" | Verified Correct Answer: "${m.question.correctOptionText}"${m.question.explanation ? ` | Explanation: ${m.question.explanation}` : ""}`
            )
            .join("\n")
        : "No direct exam Q&A matched.";

    const languageDirective = requestedLang
      ? requestedLang === "rw"
        ? "Subiza mu Kinyarwanda cyiza kandi gisobanutse cyane."
        : requestedLang === "fr"
        ? "Répondez strictement en Français clair, précis et pédagogique."
        : "Respond strictly in clear, accurate, educational English."
      : `Detect the exact language used in the user's question ("${query}") — whether Kinyarwanda, English, French, Swahili, Spanish, or ANY other language — and write "directAnswer" strictly in THAT SAME LANGUAGE. If the language is ambiguous, default to Kinyarwanda.`;

    const prompt = `You are Navo's Rwanda Road Traffic Regulations Search Assistant.
User's search query: "${query}"

LANGUAGE RULE:
${languageDirective}

DATABASE MATCHES FOUND BY SIMILARITY:
==================================================
OFFICIAL GAZETTE ARTICLES:
${gazetteContext}

MATCHED COURSE LESSONS:
${coursesContext}

VERIFIED DATABASE Q&A MATCHES:
${examsContext}
==================================================

INSTRUCTIONS:
1. Answer the user's question directly and clearly (2-5 concise sentences) in the required language based on the highest-similarity matches from the course lessons, verified Q&As, and Gazette articles above.
2. Do NOT dump multiple-choice lists (A/B/C/D) or reveal test answer letters verbatim—give a natural, helpful explanation of the traffic rule/concept.
3. If Gazette articles are provided above and relevant, populate "citedArticle"; otherwise set "citedArticle" to null.

OUTPUT FORMAT (STRICT JSON):
{
  "directAnswer": "Clear explanation in the user's language...",
  "citedArticle": {
    "articleNumber": "Article number or Ingingo ya...",
    "title": "Article title",
    "decreeRef": "Official Presidential Order reference",
    "excerpt": "Key legal excerpt",
    "keyTakeaways": ["Rule 1", "Rule 2"]
  }
}`;

    const generatePromise = ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI generation timeout")), 6500)
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
            articleNumber: parsed.citedArticle.articleNumber,
            title: parsed.citedArticle.title || "Amategeko y'Umuhanda",
            decreeRef: parsed.citedArticle.decreeRef || "Iteka rya Perezida No 85/01",
            excerpt: parsed.citedArticle.excerpt || "",
            keyTakeaways: Array.isArray(parsed.citedArticle.keyTakeaways)
              ? parsed.citedArticle.keyTakeaways
              : [],
          },
        ];
      } else if (hasGazette) {
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
        detectedLanguageName: matches.langInfo.languageName,
        requiresAuthForFullAccess: !isAuthenticated,
        similarityScore: matches.bestSimilarityPercent,
        directAnswer: String(parsed.directAnswer).trim(),
        source: "ai_grounded",
        gazetteArticles: gazetteList,
        matchedLessons,
        sampleQuestions,
      };

      return NextResponse.json(result);
    }

    const fallback = await searchSimilarityFallback(query, requestedLang, {
      isAuthenticated,
      precomputed: matches,
    });
    return NextResponse.json(fallback);
  } catch (error: any) {
    console.warn("Traffic assistant error or fallback:", error?.message || error);
    const fallback = await searchSimilarityFallback(query, requestedLang, {
      isAuthenticated,
      precomputed: matches,
    });
    return NextResponse.json(fallback);
  }
}
