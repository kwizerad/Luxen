"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  FolderOpen,
  FileText,
  FileCode2,
  Loader2,
  ChevronDown,
  Globe2,
  CheckCircle2,
  Sparkles,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Lesson, Course, Module } from "@/lib/courses-store";
import { translationQueue, type TranslationJobRecord } from "@/lib/translation-queue";

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
  onReloadCourses,
  onSelectCourse,
}: TranslationSyncBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeDialogType, setActiveDialogType] = useState<TranslationType | null>(null);
  const [selectedTargetLang, setSelectedTargetLang] = useState<"English" | "French" | "Kinyarwanda">("French");
  const [runningJobs, setRunningJobs] = useState<TranslationJobRecord[]>([]);

  useEffect(() => {
    const unsub = translationQueue.subscribe((allJobs) => {
      setRunningJobs(allJobs.filter((j) => j.status === "running"));
    });
    return unsub;
  }, []);

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

  const currentTargetLang = targetLanguages.includes(selectedTargetLang)
    ? selectedTargetLang
    : targetLanguages[0] || "French";

  const navigateToTranslationTab = () => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("tab", "translation");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleStartDialogTranslation = () => {
    if (!activeDialogType) return;

    const targetCourse = courses.find((c) => c.language === currentTargetLang);
    if (!targetCourse && activeDialogType !== "topic") {
      toast.error(`Target course for ${currentTargetLang} not found.`);
      return;
    }

    if (activeDialogType === "topic" && !activeTopic) {
      toast.error("Please select a topic to translate.");
      return;
    }
    if (activeDialogType === "lesson" && !activeLesson) {
      toast.error("Please select a lesson to translate.");
      return;
    }
    if (activeDialogType === "module" && !activeModule) {
      toast.error("Please select a module to translate.");
      return;
    }

    translationQueue.startTranslationJob({
      type: activeDialogType,
      sourceCourse: currentCourse,
      targetCourse,
      targetLang: currentTargetLang,
      activeModule,
      activeLesson,
      activeTopic,
      moduleIndex: Math.max(0, moduleIndex),
      lessonIndex: Math.max(0, lessonIndex),
      topicIndex: Math.max(0, activeTopicIndex),
      onReloadCourses,
      onSelectCourse,
      onViewTranslationTab: navigateToTranslationTab,
    });

    setActiveDialogType(null);
  };

  const latestRunningJob = runningJobs[0] || null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
      {/* Current language tag & live background status */}
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

        {latestRunningJob && (
          <button
            type="button"
            onClick={navigateToTranslationTab}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors"
            title="Click to open Translation Status & Detailed Report tab"
          >
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            <span className="truncate max-w-[220px]">
              {latestRunningJob.currentStepMessage} ({latestRunningJob.progressPercent}%)
            </span>
          </button>
        )}
      </div>

      {/* Translation Actions & Status Tab Shortcut */}
      <div className="flex items-center gap-2 shrink-0">
        {runningJobs.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={navigateToTranslationTab}
            className="h-8 text-xs px-2.5 gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Translation Status ({runningJobs.length})</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="admin-btn-secondary h-8 text-xs px-3 gap-2 border-[var(--admin-border)] hover:border-[var(--admin-primary)]/50 transition-all font-semibold shadow-xs"
            >
              <Languages className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
              <span>Translate</span>
              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 p-1.5 text-xs bg-[var(--admin-card)] border-[var(--admin-border)] z-50 shadow-2xl rounded-xl backdrop-blur-xl"
          >
            <DropdownMenuLabel className="text-[11px] font-semibold text-[var(--admin-muted)] px-2 py-1.5 flex items-center justify-between">
              <span>Background Translation</span>
              <span className="text-[10px] text-emerald-500 font-mono">Runs in Background</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[var(--admin-border)]/50 my-1" />

            {/* 1. Translate Whole Course */}
            <DropdownMenuItem
              onClick={() => setActiveDialogType("course")}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] text-amber-500 font-medium transition-colors"
            >
              <Globe2 className="h-4 w-4 shrink-0" />
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-foreground">1. Translate Whole Course</span>
                <span className="text-[10px] text-[var(--admin-muted)] font-normal">
                  All modules, lessons &amp; topics (background)
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
                  {activeTopic ? `"${activeTopic.title}" (Notes & Title)` : "Select a topic"}
                </span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[var(--admin-border)]/50 my-1" />

            {/* View Translation Reports Tab */}
            <DropdownMenuItem
              onClick={navigateToTranslationTab}
              className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-lg text-xs hover:bg-[var(--admin-hover-bg)] focus:bg-[var(--admin-hover-bg)] text-[var(--admin-primary)] font-semibold transition-colors"
            >
              <Activity className="h-4 w-4 shrink-0" />
              <span>View Translation Status &amp; Reports</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation & Target Language Modal */}
      <Dialog
        open={Boolean(activeDialogType)}
        onOpenChange={(open) => {
          if (!open) setActiveDialogType(null);
        }}
      >
        <DialogContent className="max-w-md bg-[var(--admin-card)] border-[var(--admin-border)] text-foreground rounded-2xl shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-[var(--admin-primary)]" />
              {activeDialogType === "course" && "Translate Whole Course (Background)"}
              {activeDialogType === "module" && "Translate Whole Module (Background)"}
              {activeDialogType === "lesson" && "Translate Whole Lesson (Background)"}
              {activeDialogType === "topic" && "Translate Whole Topic (Background)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--admin-muted)]">
              {activeDialogType === "course" && `Translate all modules, lessons, and topics from ${getLanguageLabel(currentCourse.language)} in the background.`}
              {activeDialogType === "module" && `Translate module "${activeModule?.title}" and all its lessons/topics in the background.`}
              {activeDialogType === "lesson" && `Translate lesson "${activeLesson?.title}" and all its topics in the background.`}
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

            {/* Background + In-Place Update Guarantee notice */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Non-Blocking Background Execution &amp; Full Report</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                This translation runs in the background so you can continue working immediately. Track live progress, step-by-step logs, and full reports in the <strong>Translation</strong> tab next to Course Management.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDialogType(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStartDialogTranslation}
              className="text-xs bg-[var(--admin-primary)] text-white hover:brightness-110 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Start in Background</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
