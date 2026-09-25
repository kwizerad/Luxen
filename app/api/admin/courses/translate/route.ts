import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateTiptapDoc, translateTextSnippets, TargetLanguage } from "@/lib/ai/tiptap-translator";
import { Lesson, Module } from "@/lib/courses-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // "topic" | "lesson" | "module" | "content_only"
      sourceLang = "English",
      targetLang = "French",
      topic,
      lesson,
      module,
      content,
      saveToDatabase = false,
      targetCourseId,
      sourceModuleIndex,
      sourceLessonIndex,
    } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required" }, { status: 400 });
    }

    // 1. Content-only translation (single Tiptap string or text)
    if (type === "content_only") {
      const translatedDoc = await translateTiptapDoc(content, sourceLang, targetLang);
      return NextResponse.json({ success: true, translatedContent: translatedDoc });
    }

    // 2. Single Topic translation
    if (type === "topic" && topic) {
      const titleMap = await translateTextSnippets(
        [{ id: 0, text: topic.title || "Topic" }],
        sourceLang,
        targetLang
      );
      const translatedTitle = titleMap.get(0) || topic.title;
      const translatedContent = await translateTiptapDoc(topic.content, sourceLang, targetLang);

      return NextResponse.json({
        success: true,
        translatedTopic: {
          ...topic,
          title: translatedTitle,
          content: translatedContent,
        },
      });
    }

    // 3. Complete Lesson translation
    if (type === "lesson" && lesson) {
      const snippets = [{ id: 0, text: lesson.title || "Lesson" }];
      const topicsList = lesson.topics || [];

      topicsList.forEach((tp: any, idx: number) => {
        snippets.push({ id: idx + 1, text: tp.title || `Topic ${idx + 1}` });
      });

      const titlesMap = await translateTextSnippets(snippets, sourceLang, targetLang);
      const translatedLessonTitle = titlesMap.get(0) || lesson.title;

      const translatedTopics = await Promise.all(
        topicsList.map(async (tp: any, idx: number) => {
          const tTitle = titlesMap.get(idx + 1) || tp.title;
          const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
          return {
            ...tp,
            title: tTitle,
            content: tContent,
          };
        })
      );

      const translatedLesson: Lesson = {
        ...lesson,
        title: translatedLessonTitle,
        topics: translatedTopics,
      };

      // Optional: Save directly to Supabase in background
      if (saveToDatabase && targetCourseId) {
        const supabase = createAdminClient();

        // Find or match the target course module
        const { data: targetModules } = await supabase
          .from("course_modules")
          .select("id, order_index")
          .eq("language_id", targetCourseId)
          .is("deleted_at", null)
          .order("order_index", { ascending: true });

        const matchedModule =
          targetModules && typeof sourceModuleIndex === "number"
            ? targetModules[sourceModuleIndex] || targetModules[0]
            : targetModules?.[0];

        if (matchedModule) {
          // Check for existing lesson in target module by order_index
          const { data: existingLessons } = await supabase
            .from("course_lessons")
            .select("id, order_index")
            .eq("module_id", matchedModule.id)
            .is("deleted_at", null)
            .order("order_index", { ascending: true });

          const matchedLesson =
            existingLessons && typeof sourceLessonIndex === "number"
              ? existingLessons[sourceLessonIndex]
              : null;

          if (matchedLesson) {
            // Update existing lesson
            await supabase
              .from("course_lessons")
              .update({
                title: translatedLessonTitle,
                topics: translatedTopics,
                status: "published",
              })
              .eq("id", matchedLesson.id);
          } else {
            // Insert new lesson in target module
            await supabase.from("course_lessons").insert({
              module_id: matchedModule.id,
              title: translatedLessonTitle,
              content: "",
              content_type: "rich_text",
              status: "published",
              topics: translatedTopics,
              order_index: typeof sourceLessonIndex === "number" ? sourceLessonIndex : 0,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        translatedLesson,
      });
    }

    // 4. Complete Module translation
    if (type === "module" && module) {
      const snippets = [{ id: 0, text: module.title || "Module" }];
      const lessonsList = module.lessons || [];

      // Collect all lesson titles and topic titles
      let snippetId = 1;
      const lessonTitleIndices: number[] = [];
      const topicTitleIndices: { lessonIdx: number; topicIdx: number; snippetId: number }[] = [];

      for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
        const les = lessonsList[lIdx];
        lessonTitleIndices.push(snippetId);
        snippets.push({ id: snippetId++, text: les.title || `Lesson ${lIdx + 1}` });

        for (let tIdx = 0; tIdx < (les.topics || []).length; tIdx++) {
          const tp = les.topics![tIdx];
          topicTitleIndices.push({ lessonIdx: lIdx, topicIdx: tIdx, snippetId });
          snippets.push({ id: snippetId++, text: tp.title || `Topic ${tIdx + 1}` });
        }
      }

      const titlesMap = await translateTextSnippets(snippets, sourceLang, targetLang);
      const translatedModuleTitle = titlesMap.get(0) || module.title;

      const translatedLessons: Lesson[] = [];

      for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
        const les = lessonsList[lIdx];
        const lesTitleSnippetId = lessonTitleIndices[lIdx];
        const transLesTitle = titlesMap.get(lesTitleSnippetId) || les.title;

        const transTopics = await Promise.all(
          (les.topics || []).map(async (tp: any, tIdx: number) => {
            const match = topicTitleIndices.find(
              (m) => m.lessonIdx === lIdx && m.topicIdx === tIdx
            );
            const tTitle = match ? titlesMap.get(match.snippetId) || tp.title : tp.title;
            const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
            return {
              ...tp,
              id: tp.id || crypto.randomUUID(),
              title: tTitle,
              content: tContent,
            };
          })
        );

        translatedLessons.push({
          ...les,
          title: transLesTitle,
          topics: transTopics,
        });
      }

      // Optional: Save directly to Supabase
      if (saveToDatabase && targetCourseId) {
        const supabase = createAdminClient();

        // Find or create target module
        const { data: existingModules } = await supabase
          .from("course_modules")
          .select("id, order_index")
          .eq("language_id", targetCourseId)
          .is("deleted_at", null)
          .order("order_index", { ascending: true });

        let targetModuleId: string | null = null;
        const matchedModule =
          existingModules && typeof sourceModuleIndex === "number"
            ? existingModules[sourceModuleIndex]
            : null;

        if (matchedModule) {
          targetModuleId = matchedModule.id;
          await supabase
            .from("course_modules")
            .update({ title: translatedModuleTitle })
            .eq("id", targetModuleId);
        } else {
          const { data: newMod } = await supabase
            .from("course_modules")
            .insert({
              language_id: targetCourseId,
              title: translatedModuleTitle,
              description: module.description || "",
              order_index: typeof sourceModuleIndex === "number" ? sourceModuleIndex : 0,
            })
            .select("id")
            .single();
          targetModuleId = newMod?.id || null;
        }

        if (targetModuleId) {
          // Sync lessons
          for (let lIdx = 0; lIdx < translatedLessons.length; lIdx++) {
            const tLes = translatedLessons[lIdx];
            const { data: existingLessons } = await supabase
              .from("course_lessons")
              .select("id, order_index")
              .eq("module_id", targetModuleId)
              .eq("order_index", lIdx)
              .is("deleted_at", null);

            if (existingLessons && existingLessons.length > 0) {
              await supabase
                .from("course_lessons")
                .update({
                  title: tLes.title,
                  topics: tLes.topics,
                  status: "published",
                })
                .eq("id", existingLessons[0].id);
            } else {
              await supabase.from("course_lessons").insert({
                module_id: targetModuleId,
                title: tLes.title,
                content: "",
                content_type: "rich_text",
                status: "published",
                topics: tLes.topics,
                order_index: lIdx,
              });
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        translatedModule: {
          ...module,
          title: translatedModuleTitle,
          lessons: translatedLessons,
        },
      });
    }

    // 5. Complete Course translation (All modules, lessons, and topics)
    if (type === "course" && targetCourseId && body.sourceCourseId) {
      const supabase = createAdminClient();

      const { data: sourceModules, error: srcModErr } = await supabase
        .from("course_modules")
        .select("id, title, description, order_index")
        .eq("language_id", body.sourceCourseId)
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      if (srcModErr || !sourceModules || sourceModules.length === 0) {
        return NextResponse.json({ error: "No modules found in source course" }, { status: 400 });
      }

      let totalModules = 0;
      let totalLessons = 0;
      let totalTopics = 0;

      for (let mIdx = 0; mIdx < sourceModules.length; mIdx++) {
        const srcMod = sourceModules[mIdx];
        const modSnippets = [
          { id: 0, text: srcMod.title || "Module" },
          { id: 1, text: srcMod.description || "" },
        ];
        const modTitlesMap = await translateTextSnippets(modSnippets, sourceLang, targetLang);
        const transModTitle = modTitlesMap.get(0) || srcMod.title;
        const transModDesc = modTitlesMap.get(1) || srcMod.description;

        const { data: existingTargetModules } = await supabase
          .from("course_modules")
          .select("id, order_index")
          .eq("language_id", targetCourseId)
          .eq("order_index", srcMod.order_index)
          .is("deleted_at", null);

        let targetModId: string;
        if (existingTargetModules && existingTargetModules.length > 0) {
          targetModId = existingTargetModules[0].id;
          await supabase
            .from("course_modules")
            .update({ title: transModTitle, description: transModDesc })
            .eq("id", targetModId);
        } else {
          const { data: newMod } = await supabase
            .from("course_modules")
            .insert({
              language_id: targetCourseId,
              title: transModTitle,
              description: transModDesc,
              order_index: srcMod.order_index,
            })
            .select("id")
            .single();
          targetModId = newMod?.id;
        }
        totalModules++;

        const { data: srcLessons } = await supabase
          .from("course_lessons")
          .select("id, title, topics, order_index, content_type")
          .eq("module_id", srcMod.id)
          .is("deleted_at", null)
          .order("order_index", { ascending: true });

        if (srcLessons && srcLessons.length > 0 && targetModId) {
          for (const srcLesson of srcLessons) {
            const rawTopics = Array.isArray(srcLesson.topics) ? srcLesson.topics : [];
            const snippets = [{ id: 0, text: srcLesson.title || "Lesson" }];
            rawTopics.forEach((tp: any, tIdx: number) => {
              snippets.push({ id: tIdx + 1, text: tp.title || `Topic ${tIdx + 1}` });
            });

            const lessonTitlesMap = await translateTextSnippets(snippets, sourceLang, targetLang);
            const transLessonTitle = lessonTitlesMap.get(0) || srcLesson.title;

            const transTopics = await Promise.all(
              rawTopics.map(async (tp: any, tIdx: number) => {
                const tTitle = lessonTitlesMap.get(tIdx + 1) || tp.title;
                const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
                totalTopics++;
                return {
                  ...tp,
                  id: tp.id || crypto.randomUUID(),
                  title: tTitle,
                  content: tContent,
                };
              })
            );

            const { data: existingTargetLessons } = await supabase
              .from("course_lessons")
              .select("id")
              .eq("module_id", targetModId)
              .eq("order_index", srcLesson.order_index)
              .is("deleted_at", null);

            if (existingTargetLessons && existingTargetLessons.length > 0) {
              await supabase
                .from("course_lessons")
                .update({
                  title: transLessonTitle,
                  topics: transTopics,
                  status: "published",
                })
                .eq("id", existingTargetLessons[0].id);
            } else {
              await supabase.from("course_lessons").insert({
                module_id: targetModId,
                title: transLessonTitle,
                content: "",
                content_type: srcLesson.content_type || "rich_text",
                status: "published",
                topics: transTopics,
                order_index: srcLesson.order_index,
              });
            }
            totalLessons++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully translated full course into ${targetLang}`,
        stats: { totalModules, totalLessons, totalTopics },
      });
    }

    return NextResponse.json({ error: "Invalid translation request type" }, { status: 400 });
  } catch (error: any) {
    console.error("API /api/admin/courses/translate error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process translation" },
      { status: 500 }
    );
  }
}
