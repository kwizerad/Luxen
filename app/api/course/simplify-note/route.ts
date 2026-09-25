import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/ai/gemini-client";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, title, entityId, language = "English" } = body;

    if (!content && !title) {
      return NextResponse.json(
        { error: "Content or title is required for explanation" },
        { status: 400 }
      );
    }

    const textContent =
      typeof content === "string"
        ? content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000)
        : JSON.stringify(content).slice(0, 4000);

    const contentHash = crypto.createHash("md5").update(`${title || ""}_${textContent}`).digest("hex");

    // 1. Check database cache
    if (entityId) {
      try {
        const supabase = createAdminClient();
        const { data: cached } = await supabase
          .from("course_ai_cache")
          .select("cached_data, content_hash")
          .eq("entity_id", entityId)
          .eq("target_language", language)
          .eq("feature_type", "plain_terms")
          .maybeSingle();

        if (cached && cached.content_hash === contentHash && cached.cached_data?.explanation) {
          return NextResponse.json({
            success: true,
            explanation: cached.cached_data.explanation,
            fromCache: true,
            language,
          });
        }
      } catch (err) {
        console.warn("Error reading plain_terms from cache:", err);
      }
    }

    const prompt = `You are a friendly, expert Rwanda Driving School Instructor.
Analyze the following official Rwanda road code article / course topic:

Topic Title: "${title || "Traffic Rule"}"
Content:
"""${textContent}"""

Task: Explain this in clear, plain language for student drivers taking the Rwanda Provisional Driving Exam (Ibizamini by'uruhushya rw'agateganyo).
Remove heavy bureaucratic legal jargon and explain what the driver must actually do on the road.

Target Language: "${language}" (English, Kinyarwanda, or French).

Respond with valid JSON strictly conforming to this structure:
{
  "summary": "1 clear, simple sentence summarizing what this rule means in plain terms",
  "plainPoints": [
    "Simple bullet point 1 explaining what is allowed or forbidden",
    "Simple bullet point 2 with concrete driving action",
    "Simple bullet point 3 on speed, safety, or signals"
  ],
  "practicalExample": "A realistic real-world driving situation in Rwanda demonstrating this rule (e.g. at a Kigali junction, roundabout, school zone, or highway).",
  "examTip": "A vital tip on how this question commonly appears in the Rwanda Police Provisional Exam (Ibibazo bya Polisi)."
}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response?.text || "{}";
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    // 2. Persist to database cache
    if (entityId) {
      try {
        const supabase = createAdminClient();
        await supabase.from("course_ai_cache").upsert(
          {
            entity_id: entityId,
            target_language: language,
            feature_type: "plain_terms",
            content_hash: contentHash,
            cached_data: { explanation: parsed, updatedAt: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_id,target_language,feature_type" }
        );
      } catch (err) {
        console.warn("Failed to persist plain_terms to cache:", err);
      }
    }

    return NextResponse.json({
      success: true,
      explanation: parsed,
      language,
    });
  } catch (error: any) {
    console.error("API /api/course/simplify-note error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to simplify course note" },
      { status: 500 }
    );
  }
}
