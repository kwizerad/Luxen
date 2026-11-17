"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  CheckCircle2,
  Lock,
  Search,
  Brain,
  Sparkles,
  Volume2,
  ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseModule, CourseLesson, ModuleExamSettings } from "@/lib/database.types";

export interface CourseTreeModule extends CourseModule {
  lessons: CourseLesson[];
  examSettings?: ModuleExamSettings | null;
}

export interface CourseTreeTopic {
  id: string;
  title: string;
  content: string;
  estimated_minutes?: number;
  audioUrl?: string;
}

export interface CourseTreeFlatItem {
  type: "lesson" | "topic" | "exam";
  moduleId: string;
  lessonId: string;
  topicId?: string;
}

interface CourseTreePanelProps {
  modules: CourseTreeModule[];
  parseTopics: (raw: unknown) => CourseTreeTopic[];
  lessonHasImage: (lesson: CourseLesson) => boolean;
  isModuleUnlocked: (modIdx: number) => boolean;
  isModuleCompleted: (moduleId: string) => boolean;
  isLessonUnlocked: (moduleId: string, lessonIdx: number) => boolean;
  isLessonCompleted: (lessonId: string) => boolean;
  isItemUnlocked: (idx: number) => boolean;
  completedItems: Set<string>;
  flatList: CourseTreeFlatItem[];
  activeModuleId?: string | null;
  activeLessonId?: string | null;
  activeTopicId?: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string, topicId?: string) => void;
  onSelectExam: (moduleId: string, examTitle: string) => void;
  onCloseMobile?: () => void;
  titleLabel?: string;
  searchPlaceholder?: string;
}

export function CourseTreePanel({
  modules,
  parseTopics,
  lessonHasImage,
  isModuleUnlocked,
  isModuleCompleted,
  isLessonUnlocked,
  isLessonCompleted,
  isItemUnlocked,
  completedItems,
  flatList,
  activeModuleId,
  activeLessonId,
  activeTopicId,
  searchQuery,
  onSearchChange,
  onSelectLesson,
  onSelectExam,
  onCloseMobile,
  titleLabel = "Course Tree",
  searchPlaceholder = "Search modules, lessons...",
}: CourseTreePanelProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeModuleId) initial.add(activeModuleId);
    else if (modules[0]) initial.add(modules[0].id);
    return initial;
  });

  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeLessonId) initial.add(activeLessonId);
    return initial;
  });

  // Auto-expand active module & active lesson when navigating
  useEffect(() => {
    if (activeModuleId) {
      setExpandedModules((prev) => {
        if (prev.has(activeModuleId)) return prev;
        const next = new Set(prev);
        next.add(activeModuleId);
        return next;
      });
    }
  }, [activeModuleId]);

  useEffect(() => {
    if (activeLessonId) {
      setExpandedLessons((prev) => {
        if (prev.has(activeLessonId)) return prev;
        const next = new Set(prev);
        next.add(activeLessonId);
        return next;
      });
    }
  }, [activeLessonId]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredModules = useMemo(() => {
    if (!normalizedQuery) return modules;
    return modules
      .map((mod) => {
        const modMatch = mod.title.toLowerCase().includes(normalizedQuery);
        const matchingLessons = mod.lessons.filter((lesson) => {
          if (modMatch || lesson.title.toLowerCase().includes(normalizedQuery)) return true;
          const topics = parseTopics(lesson.topics);
          return topics.some((tp) => tp.title.toLowerCase().includes(normalizedQuery));
        });
        if (!modMatch && matchingLessons.length === 0) return null;
        return {
          ...mod,
          lessons: modMatch ? mod.lessons : matchingLessons,
        };
      })
      .filter((m): m is CourseTreeModule => m !== null);
  }, [modules, normalizedQuery, parseTopics]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-card dark:bg-zinc-950 text-foreground select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center min-w-0">
          <FolderOpen className="h-4 w-4 text-primary shrink-0 mr-2" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
            {titleLabel}
          </span>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close Course Tree"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-border/60 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Hierarchical Tree */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5 navo-sidebar-scrollbar">
        {filteredModules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 italic">
            No matching modules or lessons
          </p>
        ) : (
          filteredModules.map((mod) => {
            const origModIdx = modules.findIndex((m) => m.id === mod.id);
            const modUnlocked = isModuleUnlocked(origModIdx >= 0 ? origModIdx : 0);
            const modCompleted = isModuleCompleted(mod.id);
            const isModExpanded = Boolean(normalizedQuery) || expandedModules.has(mod.id);
            const isCurrentMod = activeModuleId === mod.id;

            const totalLessonsCount = mod.lessons.length;
            const completedLessonsCount = mod.lessons.filter((l) => isLessonCompleted(l.id)).length;
            const reqCount = Math.max(1, Math.ceil(totalLessonsCount / 3));
            const isQuizUnlocked = totalLessonsCount === 0 || completedLessonsCount >= reqCount;

            return (
              <div
                key={mod.id}
                className={cn(
                  "rounded-xl border transition-colors",
                  isCurrentMod
                    ? "border-primary/35 bg-primary/[0.04]"
                    : "border-border/50 bg-background/50"
                )}
              >
                {/* Module Branch Row */}
                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={cn(
                    "w-full flex items-center px-2.5 py-2 text-left rounded-xl transition-colors cursor-pointer",
                    modUnlocked ? "hover:bg-muted/60" : "opacity-60"
                  )}
                >
                  <span className="text-muted-foreground shrink-0 mr-1.5">
                    {isModExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <span className="shrink-0 mr-2">
                    {!modUnlocked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : isModExpanded ? (
                      <FolderOpen className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-primary/80" />
                    )}
                  </span>

                  <div className="flex-1 min-w-0 pr-1.5">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {mod.title}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 mr-1 tabular-nums">
                    {completedLessonsCount}/{totalLessonsCount}
                  </span>

                  {modCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>

                {/* Lessons inside expanded Module */}
                {isModExpanded && (
                  <div className="px-2 pb-2 pt-0.5 space-y-1 border-t border-border/40">
                    {mod.lessons.map((lesson) => {
                      const origMod = modules[origModIdx >= 0 ? origModIdx : 0];
                      const origLessonIdx = origMod
                        ? origMod.lessons.findIndex((l) => l.id === lesson.id)
                        : 0;
                      const lessonUnlocked = isLessonUnlocked(
                        mod.id,
                        origLessonIdx >= 0 ? origLessonIdx : 0
                      );
                      const lessonComplete = isLessonCompleted(lesson.id);
                      const isCurrentLesson = activeLessonId === lesson.id;
                      const topics = parseTopics(lesson.topics);
                      const hasTopics = topics.length > 0;
                      const isLessonExp =
                        Boolean(normalizedQuery) ||
                        expandedLessons.has(lesson.id) ||
                        isCurrentLesson;
                      const hasImg = lessonHasImage(lesson);

                      return (
                        <div key={lesson.id} className="space-y-0.5">
                          <div className="flex items-center">
                            {hasTopics && (
                              <button
                                type="button"
                                onClick={() => toggleLesson(lesson.id)}
                                className="p-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                aria-label="Toggle topics"
                              >
                                {isLessonExp ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!lessonUnlocked}
                              onClick={() => {
                                if (!lessonUnlocked) return;
                                if (hasTopics) {
                                  setExpandedLessons((prev) => {
                                    const next = new Set(prev);
                                    next.add(lesson.id);
                                    return next;
                                  });
                                }
                                onSelectLesson(mod.id, lesson.id);
                              }}
                              className={cn(
                                "flex-1 min-w-0 flex items-center px-2 py-1.5 rounded-lg text-xs text-left transition-colors",
                                !hasTopics && "ml-4",
                                isCurrentLesson
                                  ? "bg-primary/15 text-primary font-semibold"
                                  : lessonUnlocked
                                  ? "hover:bg-muted/70 text-foreground cursor-pointer"
                                  : "opacity-45 cursor-not-allowed text-muted-foreground"
                              )}
                            >
                              <span className="shrink-0 mr-1.5">
                                {!lessonUnlocked ? (
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                ) : lessonComplete ? (
                                  <CheckCircle2 className="h-3 w-3 text-primary" />
                                ) : (
                                  <FileText className="h-3 w-3 text-primary/80" />
                                )}
                              </span>
                              <span className="flex-1 truncate">{lesson.title}</span>
                              {hasImg && (
                                <ImageIcon className="h-3 w-3 text-emerald-500/80 shrink-0 ml-1" />
                              )}
                            </button>
                          </div>

                          {/* Topics Branch */}
                          {hasTopics && isLessonExp && (
                            <div className="ml-5 pl-2 border-l border-border/60 space-y-0.5">
                              {topics.map((tp) => {
                                const isTpCurrent = activeTopicId === tp.id;
                                const isTpDone = completedItems.has(`${lesson.id}:${tp.id}`);
                                const targetIdx = flatList.findIndex(
                                  (f) => f.lessonId === lesson.id && f.topicId === tp.id
                                );
                                const isTpUnlocked = targetIdx >= 0 && isItemUnlocked(targetIdx);

                                return (
                                  <button
                                    key={tp.id}
                                    type="button"
                                    disabled={!isTpUnlocked}
                                    onClick={() => {
                                      if (isTpUnlocked) {
                                        onSelectLesson(mod.id, lesson.id, tp.id);
                                      }
                                    }}
                                    className={cn(
                                      "w-full flex items-center px-2 py-1 rounded text-[11px] text-left transition-colors",
                                      isTpCurrent
                                        ? "bg-primary/15 text-foreground font-semibold border border-primary/40"
                                        : isTpDone
                                        ? "text-primary hover:bg-muted/70 cursor-pointer"
                                        : isTpUnlocked
                                        ? "text-foreground/85 hover:bg-muted/70 cursor-pointer"
                                        : "opacity-45 cursor-not-allowed text-muted-foreground"
                                    )}
                                  >
                                    <span className="shrink-0 mr-1.5">
                                      {isTpDone ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 text-primary" />
                                      ) : isTpCurrent ? (
                                        <FileText className="h-2.5 w-2.5 text-primary" />
                                      ) : isTpUnlocked ? (
                                        <FileText className="h-2.5 w-2.5 text-muted-foreground" />
                                      ) : (
                                        <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                                      )}
                                    </span>
                                    <span className="flex-1 truncate">{tp.title}</span>
                                    {tp.audioUrl && (
                                      <Volume2 className="h-2.5 w-2.5 text-primary shrink-0 ml-1" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Module Quiz Node */}
                    {mod.examSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectExam(mod.id, mod.examSettings?.title || mod.title);
                        }}
                        className={cn(
                          "w-full flex items-center px-2 py-1.5 mt-1 rounded-lg text-[11px] font-semibold text-left border transition-colors cursor-pointer",
                          isQuizUnlocked
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400 opacity-85"
                        )}
                      >
                        <Brain className="h-3.5 w-3.5 shrink-0 mr-1.5 text-emerald-500" />
                        <span className="flex-1 truncate">
                          {mod.examSettings.title || "Module Quiz"}
                        </span>
                        {!isQuizUnlocked ? (
                          <Lock className="h-3 w-3 shrink-0 ml-1 text-amber-500" />
                        ) : (
                          <Sparkles className="h-3 w-3 shrink-0 ml-1 text-emerald-500" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
