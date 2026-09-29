import { NextRequest, NextResponse } from "next/server";
import { translateTiptapDoc, translateTextSnippets } from "@/lib/ai/tiptap-translator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      content,
      topicTitle,
      sourceLang = "English",
      targetLang = "Kinyarwanda",
    } = body;

    if (!content && !topicTitle) {
      return NextResponse.json(
        { error: "Content or topic title is required" },
        { status: 400 }
      );
    }

    let translatedTitle = topicTitle;
    if (topicTitle && topicTitle.trim().length > 0) {
      const titleMap = await translateTextSnippets(
        [{ id: 0, text: topicTitle }],
        sourceLang,
        targetLang
      );
      translatedTitle = titleMap.get(0) || topicTitle;
    }

    let translatedContent = content;
    if (content) {
      translatedContent = await translateTiptapDoc(content, sourceLang, targetLang);
    }

    return NextResponse.json({
      success: true,
      translatedTitle,
      translatedContent,
      targetLang,
    });
  } catch (error: any) {
    console.error("API /api/course/translate-note error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to translate note" },
      { status: 500 }
    );
  }
}
