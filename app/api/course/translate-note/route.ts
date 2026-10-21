import { NextRequest, NextResponse } from "next/server";
import { translateTiptapDoc, translateTextSnippets } from "@/lib/ai/tiptap-translator";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
        content,
        topicTitle,
        sourceLang = "English",
        targetLang = "Kinyarwanda",
    } = body;
    // Cache key calculation
    const cacheKey = crypto.createHash('md5').update(`${content || ''}|${topicTitle || ''}|${sourceLang}|${targetLang}`).digest('hex');

    const supabase = await createClient();
    const { data: cached } = await supabase
      .from("course_ai_cache")
      .select("cached_data")
      .eq("entity_id", cacheKey)
      .eq("target_language", targetLang)
      .maybeSingle();

    if (cached && cached.cached_data) {
        return NextResponse.json({
            success: true,
            translatedTitle: cached.cached_data.title,
            translatedContent: cached.cached_data.content,
            targetLang,
        });
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

    await supabase.from("course_ai_cache").insert({
        entity_id: cacheKey,
        target_language: targetLang,
        feature_type: "note_translation",
        cached_data: { title: translatedTitle, content: translatedContent },
        updated_at: new Date().toISOString()
    });

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
