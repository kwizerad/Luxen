import { NextRequest, NextResponse } from "next/server";
import { generateContentWithFallback } from "@/lib/ai/gemini-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { term, context = "" } = body;

    if (!term || typeof term !== "string" || term.trim().length === 0) {
      return NextResponse.json({ error: "Term is required" }, { status: 400 });
    }

    const cleanTerm = term.trim().slice(0, 150);

    const prompt = `You are a specialist in the Rwanda Highway Code (Amategeko y'Umuhanda mu Rwanda / Code de la route Rwandais).
The user highlighted this term in a driving course note: "${cleanTerm}".
Surrounding context: "${context.slice(0, 300)}"

Provide a quick, precise definition under Rwanda road traffic regulations and its translations in English, Kinyarwanda, and French.

Return valid JSON strictly matching this schema:
{
  "term": "${cleanTerm}",
  "definition": "Clear 1-2 sentence legal/practical definition under Rwanda traffic rules",
  "translations": {
    "English": "Standard English traffic term",
    "Kinyarwanda": "Ijambo nyaryo mu Kinyarwanda rikoreshwa mu mategeko y'umuhanda",
    "French": "Terme exact en français selon le code de la route"
  },
  "tip": "Short driving safety advice related to this term (under 15 words)"
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

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error("API /api/course/explain-term error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to define term" },
      { status: 500 }
    );
  }
}
