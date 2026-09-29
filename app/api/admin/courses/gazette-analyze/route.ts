import { NextRequest, NextResponse } from "next/server";
import { analyzeGazetteContent } from "@/lib/ai/gazette-analyzer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gazetteText = "", instructions = "", language = "English", fileData } = body;

    const hasText = typeof gazetteText === "string" && gazetteText.trim().length >= 20;
    const hasFile = Boolean(fileData?.base64 && fileData.base64.length > 50);

    if (!hasText && !hasFile) {
      return NextResponse.json(
        { error: "Please attach a document (PDF, TXT, DOCX) or paste at least 20 characters from the Rwanda Traffic Gazette." },
        { status: 400 }
      );
    }

    const result = await analyzeGazetteContent(gazetteText, instructions, language, fileData);

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
