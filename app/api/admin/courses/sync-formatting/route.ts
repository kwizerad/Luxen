import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncFormattingAST } from "@/lib/ai/tiptap-translator";
import { Lesson } from "@/lib/courses-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceLesson,
      sourceLang = "English",
      sourceModuleIndex = 0,
      sourceLessonIndex = 0,
    } = body;

    if (!sourceLesson || !Array.isArray(sourceLesson.topics)) {
      return NextResponse.json(
        { error: "A valid source lesson with topics is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Get all published courses
    const { data: courses, error: coursesError } = await supabase
      .from("course_languages")
      .select("id, language")
      .is("deleted_at", null);

    if (coursesError || !courses) {
      throw new Error("Failed to fetch language courses");
    }

    const otherCourses = courses.filter((c) => c.language !== sourceLang);
    const syncSummary: Record<string, number> = {};

    for (const targetCourse of otherCourses) {
      const targetLang = targetCourse.language;

      // Find matching module
      const { data: targetModules } = await supabase
        .from("course_modules")
        .select("id, order_index")
        .eq("language_id", targetCourse.id)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      if (!targetModules || targetModules.length === 0) continue;

      const matchedModule =
        targetModules[sourceModuleIndex] || targetModules[targetModules.length - 1];

      // Find matching lesson
      const { data: targetLessons } = await supabase
        .from("course_lessons")
        .select("id, title, topics, order_index")
        .eq("module_id", matchedModule.id)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      const matchedLesson =
        targetLessons && targetLessons.length > sourceLessonIndex
          ? targetLessons[sourceLessonIndex]
          : null;

      if (!matchedLesson) {
        // Target lesson doesn't exist yet, we will create it with synced formatting + translation
        const newTopics = await Promise.all(
          sourceLesson.topics.map(async (masterTopic: any) => {
            const syncedContent = await syncFormattingAST(
              masterTopic.content,
              "",
              sourceLang,
              targetLang
            );
            return {
              ...masterTopic,
              id: crypto.randomUUID(),
              content: syncedContent,
            };
          })
        );

        await supabase.from("course_lessons").insert({
          module_id: matchedModule.id,
          title: sourceLesson.title,
          content: "",
          content_type: "rich_text",
          status: "published",
          topics: newTopics,
          order_index: sourceLessonIndex,
        });

        syncSummary[targetLang] = newTopics.length;
      } else {
        // Target lesson exists: overlay master formatting/layout/images onto target text
        const existingTopics = Array.isArray(matchedLesson.topics) ? matchedLesson.topics : [];

        const syncedTopics = await Promise.all(
          sourceLesson.topics.map(async (masterTopic: any, idx: number) => {
            const existingTopic = existingTopics[idx];
            const existingContent = existingTopic ? existingTopic.content : "";

            const syncedContent = await syncFormattingAST(
              masterTopic.content,
              existingContent,
              sourceLang,
              targetLang
            );

            return {
              id: existingTopic?.id || masterTopic.id,
              title: existingTopic?.title || masterTopic.title,
              estimated_minutes: masterTopic.estimated_minutes || 5,
              audioUrl: existingTopic?.audioUrl,
              content: syncedContent,
            };
          })
        );

        await supabase
          .from("course_lessons")
          .update({
            topics: syncedTopics,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedLesson.id);

        syncSummary[targetLang] = syncedTopics.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Formatting, layouts, and images successfully synced to ${Object.keys(syncSummary).join(", ")}.`,
      syncSummary,
    });
  } catch (error: any) {
    console.error("API /api/admin/courses/sync-formatting error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to sync formatting across languages" },
      { status: 500 }
    );
  }
}
