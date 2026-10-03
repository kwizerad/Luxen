"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Languages,
  BookOpen,
  FolderOpen,
  FileText,
  FileCode2,
  Loader2,
  ChevronDown,
  Globe2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Lesson, Course, Module } from "@/lib/courses-store";

interface TranslationSyncBarProps {
  currentCourse: Course;
  courses: Course[];
  activeModule?: Module | null;
  activeLesson: Lesson | null;
  activeTopicId?: string | null;
  moduleIndex?: number;
  lessonIndex?: number;
  onTopicContentUpdate?: (newContent: string, newTitle?: string) => void;
  onReloadCourses?: (targetCourseId?: string) => void;
  onSelectCourse?: (courseId: string) => void;
  onOpenGazetteModal?: () => void;
}

type TranslationType = "course" | "module" | "lesson" | "topic";

export function TranslationSyncBar({
  currentCourse,
  courses,
  activeModule,
  activeLesson,
  activeTopicId,
  moduleIndex = 0,
  lessonIndex = 0,
  onTopicContentUpdate,
  onReloadCourses,
  onSelectCourse,
}: TranslationSyncBarProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeDialogType, setActiveDialogType] = useState<TranslationType | null>(null);
  const [selectedTargetLang, setSelectedTargetLang] = useState<"English" | "French" | "Kinyarwanda">("French");
  const [translationProgress, setTranslationProgress] = useState<string>("");

  const activeTopic = activeLesson?.topics?.find((tp) => tp.id === activeTopicId) || null;
  const activeTopicIndex = activeLesson?.topics?.findIndex((tp) => tp.id === activeTopicId) ?? 0;

  const getLanguageFlag = (lang: string) => {
    if (lang === "English") return "🇬🇧";
    if (lang === "French") return "🇫🇷";
    if (lang === "Kinyarwanda") return "🇷🇼";
    return "🌐";
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === "French") return "Français";
    if (lang === "Kinyarwanda") return "Kinyarwanda";
    return "English";
  };

  // Target languages available (exclude current course language)
  const targetLanguages: ("English" | "French" | "Kinyarwanda")[] = (
    ["English", "French", "Kinyarwanda"] as const
  ).filter((l) => l !== currentCourse.language);

  // Initialize selected target language to first available
  const currentTargetLang = targetLanguages.includes(selectedTargetLang)
    ? selectedTargetLang
    : targetLanguages[0] || "French";

  // Safe JSON response parser to prevent `Unexpected token 'A', "An error o"... is not valid JSON`
  const safeParseResponse = async (res: Response) => {
    const rawText = await res.text();
    try {
      return JSON.parse(rawText);
    } catch {
      const preview = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
      throw new Error(
        res.status === 504 || rawText.includes("timeout") || rawText.includes("An error occurred")
          ? `Server timeout or overload (${res.status}): ${preview || "Request took too long."}`
          : `Server returned non-JSON response (${res.status}): ${preview || "Unknown error"}`
      );
    }
  };

  // 1. TRANSLATE WHOLE TOPIC
  const executeTranslateTopic = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    if (!activeTopic) {
      toast.error("Please select a topic to translate.");
      return;
    }

    const targetCourse = courses.find((c) => c.language === targetLang);
    setIsTranslating(true);
    setTranslationProgress(`Translating topic "${activeTopic.title}" to ${getLanguageLabel(targetLang)}...`);
    const toastId = toast.loading(`Translating topic notes & tree path to ${getLanguageLabel(targetLang)}...`);

    try {
      const res = await fetch("/api/admin/courses/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "topic",
          sourceLang: currentCourse.language,
          targetLang,
          topic: {
            id: activeTopic.id,
            title: activeTopic.title,
            content: activeTopic.content,
          },
          saveToDatabase: Boolean(targetCourse),
          targetCourseId: targetCourse?.id,
          sourceCourseId: currentCourse.id,
          sourceModuleIndex: moduleIndex >= 0 ? moduleIndex : 0,
          sourceLessonIndex: lessonIndex >= 0 ? lessonIndex : 0,
          sourceTopicIndex: activeTopicIndex >= 0 ? activeTopicIndex : 0,
          sourceModuleTitle: activeModule?.title || undefined,
          sourceModuleDescription: activeModule?.description || undefined,
          sourceLessonTitle: activeLesson?.title || undefined,
        }),
      });

      const data = await safeParseResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Topic translation failed");
      }

      const newTitle = data.translatedTopic?.title;

      // Invalidate course caches
      mutate("admin/courses");
      mutate((key) => typeof key === "string" && (key.startsWith("admin/course") || key.includes("courses")));

      toast.success(
        `Topic "${newTitle || activeTopic.title}" translated into ${getLanguageLabel(targetLang)} with its Module & Lesson tree!`,
        {
          id: toastId,
          duration: 7000,
          action: targetCourse && onSelectCourse
            ? {
                label: `Open ${getLanguageLabel(targetLang)}`,
                onClick: () => onSelectCourse(targetCourse.id),
              }
            : undefined,
        }
      );

      if (targetCourse && onReloadCourses) {
        onReloadCourses(targetCourse.id);
      }
      setActiveDialogType(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate topic", { id: toastId });
    } finally {
      setIsTranslating(false);
      setTranslationProgress("");
    }
  };

  // 2. TRANSLATE WHOLE LESSON
  const executeTranslateLesson = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    if (!activeLesson) {
      toast.error("Please select a lesson to translate.");
      return;
    }

    const targetCourse = courses.find((c) => c.language === targetLang);
    if (!targetCourse) {
      toast.error(`Target course for ${targetLang} not found.`);
      return;
    }

    setIsTranslating(true);
    const topicsList = Array.isArray(activeLesson.topics) ? activeLesson.topics : [];

    // If lesson has many topics (> 3), translate topic-by-topic to prevent serverless gateway timeouts
    const toastId = toast.loading(
      `Translating lesson "${activeLesson.title}" (${topicsList.length} topics) to ${getLanguageLabel(targetLang)}...`
    );

    try {
      if (topicsList.length <= 3) {
        setTranslationProgress(`Translating lesson "${activeLesson.title}" & topics to ${getLanguageLabel(targetLang)}...`);
        const res = await fetch("/api/admin/courses/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "lesson",
            sourceLang: currentCourse.language,
            targetLang,
            lesson: activeLesson,
            saveToDatabase: true,
            targetCourseId: targetCourse.id,
            sourceCourseId: currentCourse.id,
            sourceModuleIndex: moduleIndex >= 0 ? moduleIndex : 0,
            sourceLessonIndex: lessonIndex >= 0 ? lessonIndex : 0,
            sourceModuleTitle: activeModule?.title || undefined,
            sourceModuleDescription: activeModule?.description || undefined,
          }),
        });

        const data = await safeParseResponse(res);
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Lesson translation failed");
        }
      } else {
        // Step-by-step topic translation under this lesson so it never times out
        for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
          const tp = topicsList[tIdx];
          const progressMsg = `Translating topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
          setTranslationProgress(progressMsg);
          toast.loading(progressMsg, { id: toastId });

          const res = await fetch("/api/admin/courses/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "topic",
              sourceLang: currentCourse.language,
              targetLang,
              topic: {
                id: tp.id,
                title: tp.title,
                content: tp.content,
              },
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: currentCourse.id,
              sourceModuleIndex: moduleIndex >= 0 ? moduleIndex : 0,
              sourceLessonIndex: lessonIndex >= 0 ? lessonIndex : 0,
              sourceTopicIndex: tIdx,
              sourceModuleTitle: activeModule?.title || undefined,
              sourceModuleDescription: activeModule?.description || undefined,
              sourceLessonTitle: activeLesson.title,
            }),
          });

          const data = await safeParseResponse(res);
          if (!res.ok || !data.success) {
            throw new Error(data.error || `Failed on topic "${tp.title}"`);
          }
        }
      }

      mutate("admin/courses");
      mutate((key) => typeof key === "string" && (key.startsWith("admin/course") || key.includes("courses")));

      toast.success(
        `Lesson "${activeLesson.title}" successfully translated to ${getLanguageLabel(targetLang)}!`,
        {
          id: toastId,
          duration: 7000,
          action: onSelectCourse
            ? {
                label: `Open ${getLanguageLabel(targetLang)}`,
                onClick: () => onSelectCourse(targetCourse.id),
              }
            : undefined,
        }
      );

      if (onReloadCourses) onReloadCourses(targetCourse.id);
      setActiveDialogType(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate lesson", { id: toastId });
    } finally {
      setIsTranslating(false);
      setTranslationProgress("");
    }
  };

  // 3. TRANSLATE WHOLE MODULE (Chunked lesson-by-lesson to prevent gateway timeout / Unexpected token 'A')
  const executeTranslateModule = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    if (!activeModule) {
      toast.error("Please select a module to translate.");
      return;
    }

    const targetCourse = courses.find((c) => c.language === targetLang);
    if (!targetCourse) {
      toast.error(`Target course for ${targetLang} not found.`);
      return;
    }

    setIsTranslating(true);
    const modIdx = moduleIndex >= 0 ? moduleIndex : 0;
    const lessonsList = Array.isArray(activeModule.lessons) ? activeModule.lessons : [];

    setTranslationProgress(`Translating module "${activeModule.title}" header...`);
    const toastId = toast.loading(
      `Translating module "${activeModule.title}" to ${getLanguageLabel(targetLang)}...`
    );

    try {
      // Step 1: Translate & create/update module metadata
      const metaRes = await fetch("/api/admin/courses/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "module_meta",
          sourceLang: currentCourse.language,
          targetLang,
          module: {
            id: activeModule.id,
            title: activeModule.title,
            description: activeModule.description,
          },
          saveToDatabase: true,
          targetCourseId: targetCourse.id,
          sourceCourseId: currentCourse.id,
          sourceModuleIndex: modIdx,
        }),
      });

      const metaData = await safeParseResponse(metaRes);
      if (!metaRes.ok || !metaData.success) {
        throw new Error(metaData.error || "Module header translation failed");
      }

      const transModTitle = metaData.translatedModuleTitle || activeModule.title;

      // Step 2: Translate each lesson sequentially (and if a lesson has > 3 topics, topic-by-topic)
      for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
        const les = lessonsList[lIdx];
        const topicsList = Array.isArray(les.topics) ? les.topics : [];

        if (topicsList.length <= 3) {
          const progressMsg = `Module "${transModTitle}": Translating lesson ${lIdx + 1}/${lessonsList.length} ("${les.title}")...`;
          setTranslationProgress(progressMsg);
          toast.loading(progressMsg, { id: toastId });

          const lesRes = await fetch("/api/admin/courses/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "lesson",
              sourceLang: currentCourse.language,
              targetLang,
              lesson: les,
              saveToDatabase: true,
              targetCourseId: targetCourse.id,
              sourceCourseId: currentCourse.id,
              sourceModuleIndex: modIdx,
              sourceLessonIndex: lIdx,
              sourceModuleTitle: activeModule.title,
              sourceModuleDescription: activeModule.description,
            }),
          });

          const lesData = await safeParseResponse(lesRes);
          if (!lesRes.ok || !lesData.success) {
            throw new Error(lesData.error || `Failed translating lesson "${les.title}"`);
          }
        } else {
          for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
            const tp = topicsList[tIdx];
            const progressMsg = `Lesson ${lIdx + 1}/${lessonsList.length} • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
            setTranslationProgress(progressMsg);
            toast.loading(progressMsg, { id: toastId });

            const tpRes = await fetch("/api/admin/courses/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "topic",
                sourceLang: currentCourse.language,
                targetLang,
                topic: {
                  id: tp.id,
                  title: tp.title,
                  content: tp.content,
                },
                saveToDatabase: true,
                targetCourseId: targetCourse.id,
                sourceCourseId: currentCourse.id,
                sourceModuleIndex: modIdx,
                sourceLessonIndex: lIdx,
                sourceTopicIndex: tIdx,
                sourceModuleTitle: activeModule.title,
                sourceModuleDescription: activeModule.description,
                sourceLessonTitle: les.title,
              }),
            });

            const tpData = await safeParseResponse(tpRes);
            if (!tpRes.ok || !tpData.success) {
              throw new Error(tpData.error || `Failed translating topic "${tp.title}"`);
            }
          }
        }
      }

      mutate("admin/courses");
      mutate((key) => typeof key === "string" && (key.startsWith("admin/course") || key.includes("courses")));

      toast.success(
        `Module "${transModTitle}" (${lessonsList.length} lessons) successfully translated to ${getLanguageLabel(targetLang)}!`,
        {
          id: toastId,
          duration: 8000,
          action: onSelectCourse
            ? {
                label: `Open ${getLanguageLabel(targetLang)}`,
                onClick: () => onSelectCourse(targetCourse.id),
              }
            : undefined,
        }
      );

      if (onReloadCourses) onReloadCourses(targetCourse.id);
      setActiveDialogType(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate module", { id: toastId });
    } finally {
      setIsTranslating(false);
      setTranslationProgress("");
    }
  };

  // 4. TRANSLATE WHOLE COURSE (Chunked module-by-module & lesson-by-lesson to prevent gateway timeout)
  const executeTranslateCourse = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    const targetCourse = courses.find((c) => c.language === targetLang);
    if (!targetCourse) {
      toast.error(`Target course for ${targetLang} not found.`);
      return;
    }

    setIsTranslating(true);
    const modulesList = Array.isArray(currentCourse.modules) ? currentCourse.modules : [];
    setTranslationProgress(`Translating course (${modulesList.length} modules) into ${getLanguageLabel(targetLang)}...`);
    const toastId = toast.loading(
      `Translating entire course into ${getLanguageLabel(targetLang)}...`
    );

    try {
      for (let mIdx = 0; mIdx < modulesList.length; mIdx++) {
        const mod = modulesList[mIdx];
        setTranslationProgress(`Module ${mIdx + 1}/${modulesList.length}: "${mod.title}"...`);
        toast.loading(`Translating module ${mIdx + 1}/${modulesList.length}: "${mod.title}"...`, { id: toastId });

        const metaRes = await fetch("/api/admin/courses/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "module_meta",
            sourceLang: currentCourse.language,
            targetLang,
            module: {
              id: mod.id,
              title: mod.title,
              description: mod.description,
            },
            saveToDatabase: true,
            targetCourseId: targetCourse.id,
            sourceCourseId: currentCourse.id,
            sourceModuleIndex: mIdx,
          }),
        });

        const metaData = await safeParseResponse(metaRes);
        if (!metaRes.ok || !metaData.success) {
          throw new Error(metaData.error || `Failed on module "${mod.title}"`);
        }

        const lessonsList = Array.isArray(mod.lessons) ? mod.lessons : [];
        for (let lIdx = 0; lIdx < lessonsList.length; lIdx++) {
          const les = lessonsList[lIdx];
          const topicsList = Array.isArray(les.topics) ? les.topics : [];

          if (topicsList.length <= 3) {
            const msg = `Module ${mIdx + 1}/${modulesList.length} • Lesson ${lIdx + 1}/${lessonsList.length}: "${les.title}"...`;
            setTranslationProgress(msg);
            toast.loading(msg, { id: toastId });

            const lesRes = await fetch("/api/admin/courses/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "lesson",
                sourceLang: currentCourse.language,
                targetLang,
                lesson: les,
                saveToDatabase: true,
                targetCourseId: targetCourse.id,
                sourceCourseId: currentCourse.id,
                sourceModuleIndex: mIdx,
                sourceLessonIndex: lIdx,
                sourceModuleTitle: mod.title,
                sourceModuleDescription: mod.description,
              }),
            });

            const lesData = await safeParseResponse(lesRes);
            if (!lesRes.ok || !lesData.success) {
              throw new Error(lesData.error || `Failed on lesson "${les.title}"`);
            }
          } else {
            for (let tIdx = 0; tIdx < topicsList.length; tIdx++) {
              const tp = topicsList[tIdx];
              const msg = `M${mIdx + 1}/${modulesList.length} • L${lIdx + 1}/${lessonsList.length} • Topic ${tIdx + 1}/${topicsList.length}: "${tp.title}"...`;
              setTranslationProgress(msg);
              toast.loading(msg, { id: toastId });

              const tpRes = await fetch("/api/admin/courses/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "topic",
                  sourceLang: currentCourse.language,
                  targetLang,
                  topic: {
                    id: tp.id,
                    title: tp.title,
                    content: tp.content,
                  },
                  saveToDatabase: true,
                  targetCourseId: targetCourse.id,
                  sourceCourseId: currentCourse.id,
                  sourceModuleIndex: mIdx,
                  sourceLessonIndex: lIdx,
                  sourceTopicIndex: tIdx,
                  sourceModuleTitle: mod.title,
                  sourceModuleDescription: mod.description,
                  sourceLessonTitle: les.title,
                }),
              });

              const tpData = await safeParseResponse(tpRes);
              if (!tpRes.ok || !tpData.success) {
                throw new Error(tpData.error || `Failed on topic "${tp.title}"`);
              }
            }
          }
        }
      }

      mutate("admin/courses");
      mutate((key) => typeof key === "string" && (key.startsWith("admin/course") || key.includes("courses")));

      toast.success(
        `Course successfully translated into ${getLanguageLabel(targetLang)}!`,
        {
          id: toastId,
          duration: 9000,
          action: onSelectCourse
            ? {
                label: `Open ${getLanguageLabel(targetLang)}`,
                onClick: () => onSelectCourse(targetCourse.id),
              }
            : undefined,
        }
      );

      if (onReloadCourses) onReloadCourses(targetCourse.id);
      setActiveDialogType(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to translate course", { id: toastId });
    } finally {
      setIsTranslating(false);
      setTranslationProgress("");
    }
  };

  const handleStartDialogTranslation = () => {
    if (activeDialogType === "topic") executeTranslateTopic(currentTargetLang);
    else if (activeDialogType === "lesson") executeTranslateLesson(currentTargetLang);
    else if (activeDialogType === "module") executeTranslateModule(currentTargetLang);
    else if (activeDialogType === "course") executeTranslateCourse(currentTargetLang);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      {/* Current language tag */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] border border-[var(--admin-primary)]/30 shrink-0">
          <span>{getLanguageFlag(currentCourse.language)}</span>
          <span>{getLanguageLabel(currentCourse.language)}</span>
        </span>
        <span className="text-[11px] text-[var(--admin-muted)] hidden md:inline truncate max-w-sm">
          {activeTopic
            ? `Topic: ${activeTopic.title}`
            : activeLesson
            ? `Lesson: ${activeLesson.title}`
            : activeModule
            ? `Module: ${activeModule.title}`
            : `Course: ${currentCourse.title}`}
        </span>
      </div>

      {/* The Only Required 4 Translation Options Dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isTranslating}
              className="admin-btn-secondary h-8 text-xs px-3 gap-2 border-[var(--admin-border)] hover:border-[var(--admin-primary)]/50 transition-all font-semibold shadow-xs"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--admin-primary)]" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Languages className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                  <span>Translate</span>
                  <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 p-1.5 text-xs bg-[var(--admin-card)] border-[var(--admin-border)] z-50 shadow-2xl rounded-xl backdrop-blur-xl"
          >
            <DropdownMenuLabel className="text-[11px] font-semibold text-[var(--admin-muted)] px-2 py-1.5 flex items-center justify-between">
              <span>Translation Options</span>
              <span className="text-[10px] text-emerald-500 font-mono">Updates In-Place</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--admin-border)]/50 my-1" />

            {/* 1. Translate Whole Course */}
            <DropdownMenuItem
              onClick={() => {
                setActiveDialogType("course");
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] text-amber-500 font-medium transition-colors"
            >
              <Globe2 className="h-4 w-4 shrink-0" />
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-foreground">1. Translate Whole Course</span>
                <span className="text-[10px] text-[var(--admin-muted)] font-normal">
                  All modules, lessons &amp; topics
                </span>
              </div>
            </DropdownMenuItem>

            {/* 2. Translate Whole Module */}
            <DropdownMenuItem
              disabled={!activeModule}
              onClick={() => {
                if (activeModule) setActiveDialogType("module");
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-40"
            >
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-foreground">2. Translate Whole Module</span>
                <span className="text-[10px] text-[var(--admin-muted)] font-normal truncate max-w-[190px]">
                  {activeModule ? `"${activeModule.title}"` : "Select a module"}
                </span>
              </div>
            </DropdownMenuItem>

            {/* 3. Translate Whole Lesson */}
            <DropdownMenuItem
              disabled={!activeLesson}
              onClick={() => {
                if (activeLesson) setActiveDialogType("lesson");
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-40"
            >
              <FileText className="h-4 w-4 shrink-0 text-purple-500" />
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-foreground">3. Translate Whole Lesson</span>
                <span className="text-[10px] text-[var(--admin-muted)] font-normal truncate max-w-[190px]">
                  {activeLesson ? `"${activeLesson.title}"` : "Select a lesson"}
                </span>
              </div>
            </DropdownMenuItem>

            {/* 4. Translate Whole Topic */}
            <DropdownMenuItem
              disabled={!activeTopic}
              onClick={() => {
                if (activeTopic) setActiveDialogType("topic");
              }}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-40"
            >
              <FileCode2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-foreground">4. Translate Whole Topic</span>
                <span className="text-[10px] text-[var(--admin-muted)] font-normal truncate max-w-[190px]">
                  {activeTopic ? `"${activeTopic.title}" (Notes &amp; Title)` : "Select a topic"}
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation & Target Language Modal */}
      <Dialog
        open={Boolean(activeDialogType)}
        onOpenChange={(open) => {
          if (!open && !isTranslating) setActiveDialogType(null);
        }}
      >
        <DialogContent className="max-w-md bg-[var(--admin-card)] border-[var(--admin-border)] text-foreground rounded-2xl shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-[var(--admin-primary)]" />
              {activeDialogType === "course" && "Translate Whole Course"}
              {activeDialogType === "module" && "Translate Whole Module"}
              {activeDialogType === "lesson" && "Translate Whole Lesson"}
              {activeDialogType === "topic" && "Translate Whole Topic"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--admin-muted)]">
              {activeDialogType === "course" && `Translate all modules, lessons, and topics from ${getLanguageLabel(currentCourse.language)}.`}
              {activeDialogType === "module" && `Translate module "${activeModule?.title}" and all its lessons/topics.`}
              {activeDialogType === "lesson" && `Translate lesson "${activeLesson?.title}" and all its topics.`}
              {activeDialogType === "topic" && `Translate topic notes "${activeTopic?.title}" preserving all formatting, images, and layout.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Target Language Selection */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">
                Select Target Language:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {targetLanguages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedTargetLang(lang)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      currentTargetLang === lang
                        ? "bg-[var(--admin-primary)]/15 border-[var(--admin-primary)] text-[var(--admin-primary)] shadow-xs"
                        : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-muted-foreground hover:border-[var(--admin-border-hover)]"
                    }`}
                  >
                    <span className="text-base">{getLanguageFlag(lang)}</span>
                    <span>{getLanguageLabel(lang)}</span>
                    {currentTargetLang === lang && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-[var(--admin-primary)]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Place Update Guarantee notice */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Zero Duplication &amp; Conflict Safe</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                If notes or topics are already translated in the target course, they will be updated in-place without creating duplicate entries or collisions.
              </p>
            </div>

            {isTranslating && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs text-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-[var(--admin-primary)] shrink-0" />
                <span className="truncate">{translationProgress || "Translating with AI..."}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isTranslating}
              onClick={() => setActiveDialogType(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isTranslating}
              onClick={handleStartDialogTranslation}
              className="text-xs bg-[var(--admin-primary)] text-white hover:brightness-110 gap-1.5"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Translate &amp; Update</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
