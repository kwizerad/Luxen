"use client";

import { useState } from "react";
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
  Languages,
  Sparkles,
  CopyCheck,
  Loader2,
  Check,
  ChevronDown,
  Globe2,
  FileCheck2,
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
  onTopicContentUpdate?: (newContent: string) => void;
  onReloadCourses?: () => void;
  onOpenGazetteModal: () => void;
}

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
  onOpenGazetteModal,
}: TranslationSyncBarProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const activeTopic = activeLesson?.topics?.find((tp) => tp.id === activeTopicId) || null;

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

  // Other languages besides the currently active one
  const targetLanguages: ("English" | "French" | "Kinyarwanda")[] = (
    ["English", "French", "Kinyarwanda"] as const
  ).filter((l) => l !== currentCourse.language);

  // Translate active topic content in the current editor view
  const handleTranslateTopic = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    if (!activeTopic) {
      toast.error("Please select a topic to translate.");
      return;
    }

    setIsTranslating(true);
    const toastId = toast.loading(`Translating notes to ${getLanguageLabel(targetLang)} with identical styling...`);

    try {
      const res = await fetch("/api/admin/courses/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "content_only",
          sourceLang: currentCourse.language,
          targetLang,
          content: activeTopic.content,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Translation failed");
      }

      if (onTopicContentUpdate && data.translatedContent) {
        onTopicContentUpdate(data.translatedContent);
      }

      toast.success(`Notes translated into ${getLanguageLabel(targetLang)}! All images, spacing, and styles preserved.`, {
        id: toastId,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to translate notes", { id: toastId });
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate entire lesson and save directly to target course in database
  const handleTranslateAndSaveLessonToDb = async (targetLang: "English" | "French" | "Kinyarwanda") => {
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
    const toastId = toast.loading(
      `Translating lesson & all topics to ${getLanguageLabel(targetLang)} and saving to database...`
    );

    try {
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
          sourceModuleIndex: moduleIndex,
          sourceLessonIndex: lessonIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Translation failed");
      }

      toast.success(
        `Lesson successfully translated to ${getLanguageLabel(targetLang)} and saved to database!`,
        { id: toastId }
      );
      if (onReloadCourses) onReloadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to translate and save lesson", { id: toastId });
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate complete module with all lessons & topics and save to database
  const handleTranslateAndSaveModuleToDb = async (targetLang: "English" | "French" | "Kinyarwanda") => {
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
    const toastId = toast.loading(
      `Translating entire module "${activeModule.title}" to ${getLanguageLabel(targetLang)}...`
    );

    try {
      const res = await fetch("/api/admin/courses/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "module",
          sourceLang: currentCourse.language,
          targetLang,
          module: activeModule,
          saveToDatabase: true,
          targetCourseId: targetCourse.id,
          sourceModuleIndex: moduleIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Module translation failed");
      }

      toast.success(
        `Module "${activeModule.title}" successfully translated to ${getLanguageLabel(targetLang)} and saved to database!`,
        { id: toastId }
      );
      if (onReloadCourses) onReloadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to translate module", { id: toastId });
    } finally {
      setIsTranslating(false);
    }
  };

  // Translate entire course (all modules, lessons, and topics)
  const handleTranslateEntireCourseToDb = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    const targetCourse = courses.find((c) => c.language === targetLang);
    if (!targetCourse) {
      toast.error(`Target course for ${targetLang} not found.`);
      return;
    }

    if (
      !confirm(
        `Translate the entire ${getLanguageLabel(currentCourse.language)} course into ${getLanguageLabel(
          targetLang
        )}? All modules, lessons, and topics with road code rules and formatting will be translated.`
      )
    ) {
      return;
    }

    setIsTranslating(true);
    const toastId = toast.loading(
      `Translating full course to ${getLanguageLabel(targetLang)} (this may take a minute)...`
    );

    try {
      const res = await fetch("/api/admin/courses/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "course",
          sourceLang: currentCourse.language,
          targetLang,
          sourceCourseId: currentCourse.id,
          targetCourseId: targetCourse.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Course translation failed");
      }

      toast.success(
        data.message || `Course successfully translated to ${getLanguageLabel(targetLang)}!`,
        { id: toastId }
      );
      if (onReloadCourses) onReloadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to translate full course", { id: toastId });
    } finally {
      setIsTranslating(false);
    }
  };

  // Save & Sync formatting, layout, spacing, and images to all other language versions
  const handleSyncFormattingToAll = async () => {
    if (!activeLesson) {
      toast.error("Please select a lesson to sync formatting.");
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading(
      "Syncing formatting, layouts, images, and spacing across all languages in database..."
    );

    try {
      const res = await fetch("/api/admin/courses/sync-formatting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLesson: activeLesson,
          sourceLang: currentCourse.language,
          sourceModuleIndex: moduleIndex,
          sourceLessonIndex: lessonIndex,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sync formatting failed");
      }

      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);

      toast.success(
        data.message || "Formatting, images, and styles successfully synced to both languages!",
        { id: toastId }
      );
      if (onReloadCourses) onReloadCourses();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync formatting", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:px-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)]/70 backdrop-blur-sm">
      {/* Current language tag */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] border border-[var(--admin-primary)]/20">
          <span>{getLanguageFlag(currentCourse.language)}</span>
          <span>{getLanguageLabel(currentCourse.language)}</span>
        </span>
        <span className="text-[11px] text-[var(--admin-muted)] hidden md:inline">
          {activeTopic ? `Topic: ${activeTopic.title}` : activeLesson ? `Lesson: ${activeLesson.title}` : ""}
        </span>
      </div>

      {/* Multilingual Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Translate dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isTranslating}
              className="admin-btn-secondary h-7 text-xs px-2.5 gap-1.5"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Languages className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                  <span>Translate to...</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 text-xs bg-[var(--admin-card)] border-[var(--admin-border)]">
            {activeTopic && (
              <>
                <DropdownMenuLabel className="text-[11px] text-[var(--admin-muted)]">
                  In-Editor Topic Note
                </DropdownMenuLabel>
                {targetLanguages.map((targetLang) => (
                  <DropdownMenuItem
                    key={`editor-${targetLang}`}
                    onClick={() => handleTranslateTopic(targetLang)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <span>{getLanguageFlag(targetLang)}</span>
                    <span>Translate current note to {getLanguageLabel(targetLang)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[var(--admin-border)]" />
              </>
            )}

            {activeLesson && (
              <>
                <DropdownMenuLabel className="text-[11px] text-[var(--admin-muted)]">
                  Complete Lesson &amp; All Topics
                </DropdownMenuLabel>
                {targetLanguages.map((targetLang) => (
                  <DropdownMenuItem
                    key={`lesson-${targetLang}`}
                    onClick={() => handleTranslateAndSaveLessonToDb(targetLang)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <span>{getLanguageFlag(targetLang)}</span>
                    <span>Translate Lesson to {getLanguageLabel(targetLang)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[var(--admin-border)]" />
              </>
            )}

            {activeModule && (
              <>
                <DropdownMenuLabel className="text-[11px] text-[var(--admin-muted)]">
                  Complete Module
                </DropdownMenuLabel>
                {targetLanguages.map((targetLang) => (
                  <DropdownMenuItem
                    key={`module-${targetLang}`}
                    onClick={() => handleTranslateAndSaveModuleToDb(targetLang)}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <span>{getLanguageFlag(targetLang)}</span>
                    <span>Translate Module to {getLanguageLabel(targetLang)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[var(--admin-border)]" />
              </>
            )}

            <DropdownMenuLabel className="text-[11px] text-[var(--admin-muted)]">
              Entire Course (All Modules)
            </DropdownMenuLabel>
            {targetLanguages.map((targetLang) => (
              <DropdownMenuItem
                key={`course-${targetLang}`}
                onClick={() => handleTranslateEntireCourseToDb(targetLang)}
                className="gap-2 cursor-pointer text-xs text-amber-500 font-medium"
              >
                <span>{getLanguageFlag(targetLang)}</span>
                <span>Translate Entire Course to {getLanguageLabel(targetLang)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save & Sync Formatting to All */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncFormattingToAll}
          disabled={isSyncing || !activeLesson}
          className="admin-btn-secondary h-7 text-xs px-2.5 gap-1.5 border-emerald-500/30 hover:border-emerald-500/60"
          title="Applies all image, layout, font styles, and spacing edits to both languages in database"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              <span>Syncing...</span>
            </>
          ) : justSynced ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-500">Synced to Both</span>
            </>
          ) : (
            <>
              <CopyCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Save &amp; Sync to All</span>
            </>
          )}
        </Button>

        {/* Rwanda Traffic Gazette AI Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenGazetteModal}
          className="admin-btn-secondary h-7 text-xs px-2.5 gap-1.5 border-amber-500/30 hover:border-amber-500/60"
          title="Analyze Rwanda Traffic Gazette laws and generate curriculum"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Traffic Gazette AI</span>
          <span className="sm:hidden">Gazette</span>
        </Button>
      </div>
    </div>
  );
}
