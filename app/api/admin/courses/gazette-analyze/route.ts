import { NextRequest, NextResponse } from "next/server";
import { analyzeGazetteContent } from "@/lib/ai/gazette-analyzer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gazetteText, instructions, language = "English" } = body;

    if (!gazetteText || gazetteText.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide the text, article excerpt, or document content from the Rwanda Traffic Gazette." },
        { status: 400 }
      );
    }

    const result = await analyzeGazetteContent(gazetteText, instructions, language);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("API /api/admin/courses/gazette-analyze error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze gazette content" },
      { status: 500 }
    );
  }
}
