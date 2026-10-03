import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateTiptapDoc, translateTextSnippets } from "@/lib/ai/tiptap-translator";
import { Lesson } from "@/lib/courses-store";

export const maxDuration = 300; // Allow sufficient time for translation batches

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // "topic" | "lesson" | "module" | "course" | "content_only"
      sourceLang = "English",
      targetLang = "French",
      topic,
      lesson,
      module,
      content,
      saveToDatabase = true,
      targetCourseId,
      sourceCourseId,
      sourceModuleIndex = 0,
      sourceLessonIndex = 0,
      sourceTopicIndex = 0,
    } = body;

    if (!targetLang) {
      return NextResponse.json({ error: "Target language is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Helper to find or create target module by order_index
    async function getOrCreateTargetModule(
      targetCId: string,
      orderIdx: number,
      defaultTitle: string = "Module",
      defaultDesc: string = ""
    ) {
      const { data: existingModules } = await supabase
        .from("course_modules")
        .select("id, title, description, order_index")
        .eq("language_id", targetCId)
        .eq("order_index", orderIdx)
        .is("deleted_at", null);

      if (existingModules && existingModules.length > 0) {
        return existingModules[0];
      }

      // Check if any module exists with same title in target course
      const { data: titleMatch } = await supabase
        .from("course_modules")
        .select("id, title, description, order_index")
        .eq("language_id", targetCId)
        .ilike("title", defaultTitle)
        .is("deleted_at", null);

      if (titleMatch && titleMatch.length > 0) {
        return titleMatch[0];
      }

      const { data: newMod, error: insertErr } = await supabase
        .from("course_modules")
        .insert({
          language_id: targetCId,
          title: defaultTitle,
          description: defaultDesc,
          status: "published",
          order_index: orderIdx,
        })
        .select("id, title, description, order_index")
        .single();

      if (insertErr || !newMod) {
        throw new Error(`Failed to create target module: ${insertErr?.message || "Unknown error"}`);
      }
      return newMod;
    }

    // Helper to find or create target lesson by order_index
    async function getOrCreateTargetLesson(
      moduleId: string,
      orderIdx: number,
      defaultTitle: string = "Lesson",
      contentType: string = "rich_text"
    ) {
      const { data: existingLessons } = await supabase
        .from("course_lessons")
        .select("id, title, topics, order_index, content_type")
        .eq("module_id", moduleId)
        .eq("order_index", orderIdx)
        .is("deleted_at", null);

      if (existingLessons && existingLessons.length > 0) {
        return existingLessons[0];
      }

      const { data: newLes, error: insertErr } = await supabase
        .from("course_lessons")
        .insert({
          module_id: moduleId,
          title: defaultTitle,
          content: "",
          content_type: contentType,
          status: "published",
          topics: [],
          order_index: orderIdx,
        })
        .select("id, title, topics, order_index, content_type")
        .single();

      if (insertErr || !newLes) {
        throw new Error(`Failed to create target lesson: ${insertErr?.message || "Unknown error"}`);
      }
      return newLes;
    }

    // Helper to merge translated topics into existing topics avoiding collision/duplicates
    function mergeTopicList(existingTopics: any[], translatedTopics: any[]): any[] {
      const merged = Array.isArray(existingTopics) ? [...existingTopics] : [];

      translatedTopics.forEach((newTp, idx) => {
        // 1. Try matching by exact ID
        let matchIndex = merged.findIndex((et) => et.id && newTp.id && et.id === newTp.id);

        // 2. If not found by ID, try matching by position index
        if (matchIndex === -1 && idx < merged.length) {
          matchIndex = idx;
        }

        if (matchIndex !== -1) {
          // UPDATE existing topic in place to avoid duplicate notes/topics
          merged[matchIndex] = {
            ...merged[matchIndex],
            id: merged[matchIndex].id || newTp.id || crypto.randomUUID(),
            title: newTp.title,
            content: newTp.content,
          };
        } else {
          // Append new topic
          merged.push({
            id: newTp.id || crypto.randomUUID(),
            title: newTp.title,
            content: newTp.content,
          });
        }
      });

      return merged;
    }

    // =========================================================================
    // 1. OPTION 4: TRANSLATE WHOLE TOPIC
    // =========================================================================
    if (type === "topic" && topic) {
      const titleMap = await translateTextSnippets(
        [{ id: 0, text: topic.title || "Topic" }],
        sourceLang,
        targetLang
      );
      const translatedTitle = titleMap.get(0) || topic.title;
      const translatedContent = await translateTiptapDoc(topic.content, sourceLang, targetLang);

      const translatedTopic = {
        ...topic,
        id: topic.id || crypto.randomUUID(),
        title: translatedTitle,
        content: translatedContent,
      };

      // Save directly to target course in database if requested
      if (saveToDatabase && targetCourseId) {
        const targetMod = await getOrCreateTargetModule(
          targetCourseId,
          typeof sourceModuleIndex === "number" ? sourceModuleIndex : 0
        );

        const targetLesson = await getOrCreateTargetLesson(
          targetMod.id,
          typeof sourceLessonIndex === "number" ? sourceLessonIndex : 0
        );

        const existingTopics = Array.isArray(targetLesson.topics) ? [...targetLesson.topics] : [];
        let matchIdx = existingTopics.findIndex(
          (tp: any) => tp.id && topic.id && tp.id === topic.id
        );

        if (matchIdx === -1 && typeof sourceTopicIndex === "number" && sourceTopicIndex < existingTopics.length) {
          matchIdx = sourceTopicIndex;
        }

        if (matchIdx !== -1) {
          // Update existing topic in place - avoid collision and duplicate entries
          existingTopics[matchIdx] = {
            ...existingTopics[matchIdx],
            id: existingTopics[matchIdx].id || topic.id,
            title: translatedTitle,
            content: translatedContent,
          };
        } else {
          existingTopics.push(translatedTopic);
        }

        await supabase
          .from("course_lessons")
          .update({
            topics: existingTopics,
            content: existingTopics[0]?.content || translatedContent,
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetLesson.id);
      }

      return NextResponse.json({
        success: true,
        translatedTopic,
        message: `Topic successfully translated into ${targetLang} and updated!`,
      });
    }

    // =========================================================================
    // 2. OPTION 3: TRANSLATE WHOLE LESSON
    // =========================================================================
    if (type === "lesson" && lesson) {
      const snippets = [{ id: 0, text: lesson.title || "Lesson" }];
      const topicsList = Array.isArray(lesson.topics) ? lesson.topics : [];

      topicsList.forEach((tp: any, idx: number) => {
        snippets.push({ id: idx + 1, text: tp.title || `Topic ${idx + 1}` });
      });

      const titlesMap = await translateTextSnippets(snippets, sourceLang, targetLang);
      const translatedLessonTitle = titlesMap.get(0) || lesson.title;

      // Translate each topic sequentially to prevent 429 quota exhaustion
      const translatedTopics: any[] = [];
      for (let idx = 0; idx < topicsList.length; idx++) {
        const tp = topicsList[idx];
        const tTitle = titlesMap.get(idx + 1) || tp.title;
        const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
        translatedTopics.push({
          ...tp,
          id: tp.id || crypto.randomUUID(),
          title: tTitle,
          content: tContent,
        });

        // Inter-topic delay to respect Gemini rate limits
        if (idx < topicsList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      const translatedLesson: Lesson = {
        ...lesson,
        title: translatedLessonTitle,
        topics: translatedTopics,
      };

      if (saveToDatabase && targetCourseId) {
        const targetMod = await getOrCreateTargetModule(
          targetCourseId,
          typeof sourceModuleIndex === "number" ? sourceModuleIndex : 0
        );

        const targetLesson = await getOrCreateTargetLesson(
          targetMod.id,
          typeof sourceLessonIndex === "number" ? sourceLessonIndex : 0,
          translatedLessonTitle,
          (lesson as any)?.content_type || "rich_text"
        );

        // Merge topics: updates existing topics in place and avoids duplication
        const mergedTopics = mergeTopicList(targetLesson.topics || [], translatedTopics);

        await supabase
          .from("course_lessons")
          .update({
            title: translatedLessonTitle,
            topics: mergedTopics,
            content: mergedTopics[0]?.content || "",
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetLesson.id);
      }

      return NextResponse.json({
        success: true,
        translatedLesson,
        message: `Lesson successfully translated into ${targetLang} and updated!`,
      });
    }

    // =========================================================================
    // 3. OPTION 2: TRANSLATE WHOLE MODULE
    // =========================================================================
    if (type === "module" && module) {
      const snippets = [
        { id: 0, text: module.title || "Module" },
        { id: 1, text: module.description || "" },
      ];
      const lessonsList = Array.isArray(module.lessons) ? module.lessons : [];

      let snippetId = 2;
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
      const translatedModuleDesc = titlesMap.get(1) || module.description;

      const translatedLessons: Lesson[] = [];

      // Sequentially translate all lessons in module
      for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
        const les = lessonsList[lIdx];
        const lesTitleSnippetId = lessonTitleIndices[lIdx];
        const transLesTitle = titlesMap.get(lesTitleSnippetId) || les.title;

        const transTopics: any[] = [];
        const rawTopics = les.topics || [];

        for (let tIdx = 0; tIdx < rawTopics.length; tIdx++) {
          const tp = rawTopics[tIdx];
          const match = topicTitleIndices.find((m) => m.lessonIdx === lIdx && m.topicIdx === tIdx);
          const tTitle = match ? titlesMap.get(match.snippetId) || tp.title : tp.title;
          const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
          transTopics.push({
            ...tp,
            id: tp.id || crypto.randomUUID(),
            title: tTitle,
            content: tContent,
          });

          // Delay between topics
          await new Promise((resolve) => setTimeout(resolve, 350));
        }

        translatedLessons.push({
          ...les,
          title: transLesTitle,
          topics: transTopics,
        });

        // Delay between lessons
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (saveToDatabase && targetCourseId) {
        // Find or create target module
        const targetMod = await getOrCreateTargetModule(
          targetCourseId,
          typeof sourceModuleIndex === "number" ? sourceModuleIndex : 0,
          translatedModuleTitle,
          translatedModuleDesc
        );

        // Update module details
        await supabase
          .from("course_modules")
          .update({
            title: translatedModuleTitle,
            description: translatedModuleDesc,
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetMod.id);

        // Sync and merge all lessons inside module
        for (let lIdx = 0; lIdx < translatedLessons.length; lIdx++) {
          const tLes = translatedLessons[lIdx];
          const targetLesson = await getOrCreateTargetLesson(
            targetMod.id,
            lIdx,
            tLes.title,
            (tLes as any).content_type || "rich_text"
          );

          const mergedTopics = mergeTopicList(targetLesson.topics || [], tLes.topics || []);

          await supabase
            .from("course_lessons")
            .update({
              title: tLes.title,
              topics: mergedTopics,
              content: mergedTopics[0]?.content || "",
              status: "published",
              updated_at: new Date().toISOString(),
            })
            .eq("id", targetLesson.id);
        }
      }

      return NextResponse.json({
        success: true,
        translatedModule: {
          ...module,
          title: translatedModuleTitle,
          description: translatedModuleDesc,
          lessons: translatedLessons,
        },
        message: `Module "${translatedModuleTitle}" successfully translated into ${targetLang}!`,
      });
    }

    // =========================================================================
    // 4. OPTION 1: TRANSLATE WHOLE COURSE
    // =========================================================================
    if (type === "course" && targetCourseId && sourceCourseId) {
      const { data: sourceModules, error: srcModErr } = await supabase
        .from("course_modules")
        .select("id, title, description, order_index")
        .eq("language_id", sourceCourseId)
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

        const targetMod = await getOrCreateTargetModule(
          targetCourseId,
          srcMod.order_index,
          transModTitle,
          transModDesc
        );

        await supabase
          .from("course_modules")
          .update({
            title: transModTitle,
            description: transModDesc,
            status: "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetMod.id);

        totalModules++;

        const { data: srcLessons } = await supabase
          .from("course_lessons")
          .select("id, title, topics, order_index, content_type")
          .eq("module_id", srcMod.id)
          .is("deleted_at", null)
          .order("order_index", { ascending: true });

        if (srcLessons && srcLessons.length > 0) {
          for (const srcLesson of srcLessons) {
            const rawTopics = Array.isArray(srcLesson.topics) ? srcLesson.topics : [];
            const snippets = [{ id: 0, text: srcLesson.title || "Lesson" }];
            rawTopics.forEach((tp: any, tIdx: number) => {
              snippets.push({ id: tIdx + 1, text: tp.title || `Topic ${tIdx + 1}` });
            });

            const lessonTitlesMap = await translateTextSnippets(snippets, sourceLang, targetLang);
            const transLessonTitle = lessonTitlesMap.get(0) || srcLesson.title;

            // Sequential topic translation with backoff
            const transTopics: any[] = [];
            for (let tIdx = 0; tIdx < rawTopics.length; tIdx++) {
              const tp = rawTopics[tIdx];
              const tTitle = lessonTitlesMap.get(tIdx + 1) || tp.title;
              const tContent = await translateTiptapDoc(tp.content, sourceLang, targetLang);
              totalTopics++;
              transTopics.push({
                ...tp,
                id: tp.id || crypto.randomUUID(),
                title: tTitle,
                content: tContent,
              });

              await new Promise((resolve) => setTimeout(resolve, 350));
            }

            const targetLesson = await getOrCreateTargetLesson(
              targetMod.id,
              srcLesson.order_index,
              transLessonTitle,
              (srcLesson as any)?.content_type || "rich_text"
            );

            // Merge topics cleanly to avoid duplicates
            const mergedTopics = mergeTopicList(targetLesson.topics || [], transTopics);

            await supabase
              .from("course_lessons")
              .update({
                title: transLessonTitle,
                topics: mergedTopics,
                content: mergedTopics[0]?.content || "",
                status: "published",
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetLesson.id);

            totalLessons++;
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return NextResponse.json({
        success: true,
        message: `Successfully translated full course into ${targetLang}!`,
        stats: { totalModules, totalLessons, totalTopics },
      });
    }

    // 5. Content-only translation (single Tiptap string or text)
    if (type === "content_only" && content) {
      const translatedDoc = await translateTiptapDoc(content, sourceLang, targetLang);
      return NextResponse.json({ success: true, translatedContent: translatedDoc });
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
