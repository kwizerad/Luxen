import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { getGazetteArticles, saveGazetteArticles, GazetteArticle } from "@/lib/gazette-data";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow sufficient time for large PDF document analysis

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Admin Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSb = createAdminClient();
    let userIsAdmin = !isStrictlyStudentEmail(user.email) && isAdmin(user as any);

    if (!userIsAdmin) {
      const { data: profile } = await adminSb
        .from("user_profiles")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();

      if (
        !isStrictlyStudentEmail(profile?.email) &&
        (profile?.role?.toLowerCase() === "admin" ||
          profile?.email?.toLowerCase() === "navo@admin.jn")
      ) {
        userIsAdmin = true;
      }
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 2. Parse uploaded file data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const replaceExisting = formData.get("replace") === "true";

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    // 3. Verify Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // 4. Multimodal PDF document understanding using gemini-3.8-flash
    const prompt = `You are an expert legal document analyst specializing in the Official Gazette of the Republic of Rwanda (Igazeti ya Leta ya Repubulika y'u Rwanda / Journal Officiel de la République du Rwanda).
The attached document is an Official Gazette containing road traffic regulations and presidential orders.

YOUR TASK:
Carefully read and parse the PDF document to extract the individual legal articles regulating road traffic, vehicle operation, pedestrian safety, priority, overtaking, signs, signals, speed limits, licensing, and penalties.

The document may be trilingual or published with sections in Kinyarwanda, English, and French:
- Extract each article as a structured record.
- If an article appears in multiple languages, create a distinct record for each language version with its matching language tag ('rw', 'en', 'fr') so users searching in any language get authentic legal text.
- Categorize each article into one of: 'priority', 'speed', 'overtaking', 'signs', 'signals', 'parking', 'penalties', 'general'.
- Extract the official decree reference (e.g. "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002" or the title/number of the law stated in the gazette header).
- Formulate 2 to 4 concise practical takeaways explaining the rule for driving students.

Return a STRICT, VALID JSON object with a root key "articles" containing an array of objects formatted as:
{
  "articles": [
    {
      "articleNumber": "Ingingo ya 28" (or "Article 28"),
      "title": "Title describing what the article regulates",
      "category": "priority",
      "language": "rw" (or "en" or "fr"),
      "decreeRef": "Official Decree reference from document",
      "content": "Exact full text of the article clauses from the gazette",
      "keyTakeaways": [
        "Takeaway 1",
        "Takeaway 2"
      ]
    }
  ]
}

DO NOT include markdown wrappers outside the JSON. Return pure JSON only.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let parsedData: { articles?: any[] } = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Strip potential backticks
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleaned);
    }

    const rawArticles = Array.isArray(parsedData.articles) ? parsedData.articles : [];

    if (rawArticles.length === 0) {
      return NextResponse.json(
        {
          error: "Could not detect road traffic articles in the provided document. Please ensure the PDF is an Official Gazette containing numbered articles.",
        },
        { status: 422 }
      );
    }

    // Sanitize and assign stable IDs
    const formattedArticles: GazetteArticle[] = rawArticles.map((a: any, idx: number) => {
      const artNum = String(a.articleNumber || `Article ${idx + 1}`).trim();
      const lang = ["rw", "en", "fr"].includes(a.language) ? a.language : "rw";
      const validCategories = ["priority", "speed", "overtaking", "signs", "signals", "parking", "penalties", "general"];
      const category = validCategories.includes(a.category) ? a.category : "general";

      return {
        id: `gazette-${lang}-${artNum.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${idx + 1}`,
        articleNumber: artNum,
        title: String(a.title || artNum).trim(),
        category: category as any,
        language: lang as any,
        decreeRef: String(a.decreeRef || file.name.replace(/\.pdf$/i, "")).trim(),
        content: String(a.content || "").trim(),
        keyTakeaways: Array.isArray(a.keyTakeaways)
          ? a.keyTakeaways.map(String).filter(Boolean)
          : [],
        updatedAt: new Date().toISOString(),
      };
    });

    // Save to system_config
    let finalArticles = formattedArticles;
    if (!replaceExisting) {
      const current = await getGazetteArticles();
      const map = new Map<string, GazetteArticle>();
      for (const item of current) {
        map.set(item.id, item);
      }
      for (const item of formattedArticles) {
        map.set(item.id, item);
      }
      finalArticles = Array.from(map.values());
    }

    const saved = await saveGazetteArticles(finalArticles);
    if (!saved) {
      return NextResponse.json({ error: "Failed to persist extracted articles in database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      extractedCount: formattedArticles.length,
      totalCount: finalArticles.length,
      articles: finalArticles,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Error analyzing Gazette PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process Official Gazette PDF" },
      { status: 500 }
    );
  }
}
