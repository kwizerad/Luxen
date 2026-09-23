"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Course, Module, Lesson } from "@/lib/courses-store";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  FolderOpen,
  FileText,
  ClipboardList,
  Plus,
  Minus,
  Trash2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Layers,
  Sparkles,
  HelpCircle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Selection =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "lesson"; moduleId: string; lessonId: string }
  | { type: "topic"; moduleId: string; lessonId: string; topicId: string }
  | { type: "exam"; moduleId: string; examId: string };

interface CourseTreeProps {
  courses: Course[];
  course: Course | undefined;
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onAddModule: (title?: string) => void | Promise<void>;
  onAddLesson: (moduleId: string) => void;
  onAddExam: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onMoveModule: (moduleId: string, direction: "up" | "down") => void;
  onMoveLesson: (moduleId: string, lessonId: string, direction: "up" | "down") => void;
  isMutating?: boolean;
}

function ModuleItem({
  module,
  index,
  total,
  selected,
  onSelect,
  expanded,
  onToggle,
  onAddLesson,
  onAddExam,
  onDeleteModule,
  onDeleteLesson,
  onMoveModule,
  onMoveLesson,
  isMutating,
  searchQuery,
}: {
  module: Module;
  index: number;
  total: number;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  expanded: boolean;
  onToggle: () => void;
  onAddLesson: (moduleId: string) => void;
  onAddExam: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onMoveModule: (moduleId: string, direction: "up" | "down") => void;
  onMoveLesson: (moduleId: string, lessonId: string, direction: "up" | "down") => void;
  isMutating?: boolean;
  searchQuery?: string;
}) {
  const { t } = useLanguage();
  const isModuleSelected = selected.type === "module" && selected.moduleId === module.id;
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "module"; id: string; title: string }
    | { kind: "lesson"; moduleId: string; id: string; title: string }
    | null
  >(null);

  // Auto expand when searching
  useEffect(() => {
    if (searchQuery) {
      setExpandedLessons(new Set(module.lessons.map((l) => l.id)));
    }
  }, [searchQuery, module.lessons]);

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const handleLessonClick = (lesson: Lesson) => {
    setExpandedLessons((prev) => new Set(prev).add(lesson.id));
    onSelect({ type: "lesson", moduleId: module.id, lessonId: lesson.id });
  };

  const handleExamClick = () => {
    if (module.exam) {
      onSelect({ type: "exam", moduleId: module.id, examId: module.exam.id });
    }
  };

  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/30 overflow-hidden transition-all hover:border-[var(--admin-border-hover)]/60">
      <div
        onClick={() => onSelect({ type: "module", moduleId: module.id })}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors cursor-pointer",
          isModuleSelected
            ? "bg-[var(--admin-primary)]/10 border-l-2 border-l-[var(--admin-primary)]"
            : "hover:bg-[var(--admin-hover-bg)]/50 border-l-2 border-l-transparent"
        )}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="flex-shrink-0 text-[var(--admin-muted)] hover:text-[var(--admin-text)] p-0.5 rounded-md hover:bg-[var(--admin-hover-bg)]"
        >
          {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
        {expanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-[var(--admin-primary)]" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-[var(--admin-muted)]" />
        )}
        <span className="flex-1 min-w-0 truncate font-medium text-xs text-[var(--admin-text)]">
          {module.title || t("untitledModule") || "Untitled Module"}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveModule(module.id, "up"); }}
            disabled={index === 0 || isMutating}
            className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveModule(module.id, "down"); }}
            disabled={index === total - 1 || isMutating}
            className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "module", id: module.id, title: module.title }); }}
            disabled={isMutating}
            className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2">
          {module.lessons.map((lesson) => {
            const isSelected =
              selected.type === "lesson" &&
              selected.moduleId === module.id &&
              selected.lessonId === lesson.id;
            const isTopicSelected =
              selected.type === "topic" &&
              selected.moduleId === module.id &&
              selected.lessonId === lesson.id;
            const lessonIndex = module.lessons.findIndex((l) => l.id === lesson.id);
            const lessonExpanded = expandedLessons.has(lesson.id);
            const hasTopics = lesson.topics && lesson.topics.length > 0;

            return (
              <div
                key={lesson.id}
                className="rounded-[5px] transition-all"
              >
                <div
                  onClick={() => handleLessonClick(lesson)}
                  className={cn(
                    "group flex items-center gap-1.5 pl-6 pr-1.5 py-1.5 rounded-[5px] cursor-pointer transition-all",
                    isSelected
                      ? "bg-[var(--admin-primary)]/15 text-[var(--admin-text)] border border-[var(--admin-primary)]/40 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleLessonExpand(lesson.id); }}
                    className="p-0.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                  >
                    {lessonExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {lessonExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 flex-shrink-0 text-[var(--admin-muted)] opacity-80" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-xs">{lesson.title || t("untitledLesson") || "Untitled Lesson"}</span>
                  {hasTopics && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--admin-hover-bg)] text-[var(--admin-muted)] font-mono">
                      {lesson.topics.length}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "up"); }}
                      disabled={lessonIndex === 0 || isMutating}
                      className="p-0.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "down"); }}
                      disabled={lessonIndex === module.lessons.length - 1 || isMutating}
                      className="p-0.5 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "lesson", moduleId: module.id, id: lesson.id, title: lesson.title }); }}
                      disabled={isMutating}
                      className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {lessonExpanded && (
                  <div className="pl-10 pr-1.5 py-0.5 space-y-0.5">
                    {lesson.topics && lesson.topics.length > 0 ? (
                      lesson.topics.map((topic) => {
                        const isThisTopicSelected =
                          isTopicSelected && selected.type === "topic" && selected.topicId === topic.id;
                        return (
                          <div
                            key={topic.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect({ type: "topic", moduleId: module.id, lessonId: lesson.id, topicId: topic.id });
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[11px] transition-all",
                              isThisTopicSelected
                                ? "bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] border border-[var(--admin-primary)]/30 font-medium"
                                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                            )}
                          >
                            <FileText className="h-3 w-3 flex-shrink-0 opacity-70" />
                            <span className="flex-1 min-w-0 truncate">{topic.title || t("untitledTopic") || "Untitled Topic"}</span>
                            {topic.audioUrl && (
                              <Volume2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLessonClick(lesson);
                        }}
                        className="text-[10px] text-[var(--admin-muted)] italic px-2 py-1 hover:text-[var(--admin-text)] cursor-pointer"
                      >
                        {t("noTopicsYet") || "No topics in folder (click to manage)"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {module.exam ? (
            <button
              type="button"
              onClick={handleExamClick}
              className={cn(
                "w-full flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-[5px] text-left text-xs transition-all",
                selected.type === "exam" && selected.moduleId === module.id && selected.examId === module.exam.id
                  ? "bg-[var(--admin-primary)]/15 text-[var(--admin-text)] border border-[var(--admin-primary)]/40 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              )}
            >
              <ClipboardList className="h-3.5 w-3.5 flex-shrink-0 text-[var(--admin-secondary)]" />
              <span className="flex-1 min-w-0 truncate">{module.exam.title || t("moduleExam") || "Module Exam"}</span>
              <span className="text-[10px] text-[var(--admin-muted)] font-mono">
                {module.exam.questions.length}q
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAddExam(module.id)}
              className="w-full flex items-center gap-2 pl-6 pr-2 py-1.5 rounded-[5px] text-left text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-all"
            >
              <Plus className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="italic opacity-80">{t("noExamCreated") || "No Exam Created"}</span>
            </button>
          )}

          <div className="flex items-center gap-1 mt-1 pl-6">
            <button
              type="button"
              onClick={() => onAddLesson(module.id)}
              disabled={isMutating}
              className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-[5px] text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-30"
            >
              <FileText className="h-3 w-3" />
              {t("addLesson") || "Add Lesson"}
            </button>
            {!module.exam && (
              <button
                type="button"
                onClick={() => onAddExam(module.id)}
                disabled={isMutating}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded-[5px] text-[11px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-30"
              >
                <ClipboardList className="h-3 w-3" />
                {t("addExam") || "Add Exam"}
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={
          deleteTarget?.kind === "module"
            ? t("confirmDeleteModule") || "Delete Module"
            : t("confirmDeleteLesson") || "Delete Lesson"
        }
        description={
          deleteTarget?.kind === "module"
            ? (t("confirmDeleteModuleDesc") || `Are you sure you want to delete "${deleteTarget?.title}"? This will also delete all lessons and the exam inside this module.`).replace("${title}", deleteTarget?.title || "")
            : (t("confirmDeleteLessonDesc") || `Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`).replace("${title}", deleteTarget?.title || "")
        }
        confirmLabel={t("delete") || "Delete"}
        cancelLabel={t("cancel") || "Cancel"}
        isDeleting={isMutating}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.kind === "module") {
            onDeleteModule(deleteTarget.id);
          } else {
            onDeleteLesson(deleteTarget.moduleId, deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

export function CourseTree({
  courses,
  selectedCourseId,
  onSelectCourse,
  selected,
  onSelect,
  onAddModule,
  onAddLesson,
  onAddExam,
  onDeleteModule,
  onDeleteLesson,
  onMoveModule,
  onMoveLesson,
  isMutating = false,
  course,
}: CourseTreeProps) {
  const { t } = useLanguage();

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(course?.modules.map((m) => m.id) || [])
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Expand modules for the active course whenever it changes.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const mod of course?.modules || []) next.add(mod.id);
      return next;
    });
  }, [course?.id, course?.modules]);

  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const newModuleInputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  // Auto-focus the inline input when it appears
  useEffect(() => {
    if (isCreatingModule && newModuleInputRef.current) {
      newModuleInputRef.current.focus();
      newModuleInputRef.current.select();
    }
  }, [isCreatingModule]);

  const startCreatingModule = () => {
    setNewModuleName("");
    confirmedRef.current = false;
    setIsCreatingModule(true);
    setTimeout(() => {
      newModuleInputRef.current?.focus();
    }, 50);
  };

  const cancelCreatingModule = () => {
    if (confirmedRef.current) return;
    setIsCreatingModule(false);
    setNewModuleName("");
  };

  const confirmCreatingModule = () => {
    const title = newModuleName.trim();
    confirmedRef.current = true;
    setIsCreatingModule(false);
    setNewModuleName("");
    onAddModule(title || undefined);
  };

  const toggleModule = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (!course) return;
    setExpanded(new Set(course.modules.map((m) => m.id)));
  };

  const handleCollapseAll = () => {
    setExpanded(new Set());
  };

  const filteredModules = useMemo(() => {
    if (!course) return [];
    if (!searchQuery.trim()) return course.modules;
    const q = searchQuery.toLowerCase().trim();

    return course.modules.filter((m) => {
      if (m.title.toLowerCase().includes(q)) return true;
      if (m.exam && m.exam.title.toLowerCase().includes(q)) return true;
      return m.lessons.some((l) => {
        if (l.title.toLowerCase().includes(q)) return true;
        return l.topics?.some((tp) => tp.title.toLowerCase().includes(q));
      });
    });
  }, [course, searchQuery]);

  const courseStats = useMemo(() => {
    if (!course) return { modules: 0, lessons: 0, topics: 0, questions: 0 };
    let lessons = 0;
    let topics = 0;
    let questions = 0;

    course.modules.forEach((m) => {
      lessons += m.lessons.length;
      m.lessons.forEach((l) => {
        topics += l.topics?.length || 0;
      });
      if (m.exam) {
        questions += m.exam.questions.length;
      }
    });

    return { modules: course.modules.length, lessons, topics, questions };
  }, [course]);

  const languageLabel = (lang: "English" | "Kinyarwanda" | "French") =>
    lang === "Kinyarwanda" ? "Kinyarwanda" : lang === "French" ? "Français" : "English";

  if (sidebarCollapsed) {
    return (
      <aside className="course-tree-sidebar w-10 flex-shrink-0 p-2 flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden border-r border-[var(--admin-border)]">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors mb-1"
          title={t("expand") || "Expand"}
          aria-label={t("expand") || "Expand"}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
        {course?.modules.map((module) => (
          <div key={module.id} className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect({ type: "module", moduleId: module.id })}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                selected.type === "module" && selected.moduleId === module.id
                  ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              )}
              title={module.title || t("untitledModule") || "Untitled Module"}
              aria-label={module.title || t("untitledModule") || "Untitled Module"}
            >
              <Folder className="h-4 w-4" />
            </button>
            {module.lessons.map((lesson) => {
              const isSelected = selected.type === "lesson" && selected.moduleId === module.id && selected.lessonId === lesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onSelect({ type: "lesson", moduleId: module.id, lessonId: lesson.id })}
                  className={cn(
                    "p-1 rounded-md transition-colors",
                    isSelected
                      ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                  )}
                  title={lesson.title || t("untitledLesson") || "Untitled Lesson"}
                  aria-label={lesson.title || t("untitledLesson") || "Untitled Lesson"}
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
              );
            })}
            {module.exam && (
              <button
                type="button"
                onClick={() => onSelect({ type: "exam", moduleId: module.id, examId: module.exam!.id })}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  selected.type === "exam" && selected.moduleId === module.id && selected.examId === module.exam!.id
                    ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                )}
                title={module.exam.title || t("moduleExam") || "Module Exam"}
                aria-label={module.exam.title || t("moduleExam") || "Module Exam"}
              >
                <ClipboardList className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="course-tree-sidebar w-full lg:w-80 flex-shrink-0 p-3 sm:p-4 flex flex-col gap-2.5 overflow-hidden border-r border-[var(--admin-border)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="admin-card-title flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4 text-[var(--admin-primary)]" />
          {t("courses") || "Course Studio"}
        </h2>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
          title={t("collapse") || "Collapse"}
          aria-label={t("collapse") || "Collapse"}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Course Language Selector */}
      <Select value={selectedCourseId} onValueChange={onSelectCourse}>
        <SelectTrigger className="admin-input h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>{languageLabel(c.language)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Mini Stats Banner */}
      <div className="flex items-center justify-between px-2 py-1 rounded bg-[var(--admin-hover-bg)]/40 text-[10px] text-[var(--admin-muted)]">
        <span>{courseStats.modules}m • {courseStats.lessons}l • {courseStats.topics}t</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">{courseStats.questions} questions</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-muted)]" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchStructure") || "Search lessons & modules..."}
          className="h-8 text-xs pl-8 pr-7 bg-[var(--admin-card)] border-[var(--admin-border)]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Section Action Bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-[11px] uppercase tracking-wide text-[var(--admin-muted)] font-semibold flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {t("modules") || "Modules"}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleExpandAll}
            title={t("expandAll") || "Expand All"}
            className="p-1 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            title={t("collapseAll") || "Collapse All"}
            className="p-1 rounded text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isMutating || isCreatingModule}
            onClick={startCreatingModule}
            className="p-1 rounded-md text-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/10 disabled:opacity-50 transition-colors"
            title={t("addModule") || "Add Module"}
            aria-label={t("addModule") || "Add Module"}
          >
            {isMutating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Inline new-module input */}
      {isCreatingModule && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded border border-[var(--admin-primary)] bg-[var(--admin-primary)]/5">
          <Folder className="h-4 w-4 flex-shrink-0 text-[var(--admin-primary)]" />
          <input
            ref={newModuleInputRef}
            type="text"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { 
                e.preventDefault(); 
                e.currentTarget.blur(); 
                confirmCreatingModule(); 
              }
              else if (e.key === "Escape") { 
                e.preventDefault(); 
                e.currentTarget.blur();
                cancelCreatingModule(); 
              }
            }}
            onBlur={() => {
              if (!confirmedRef.current) {
                cancelCreatingModule();
              }
            }}
            placeholder={t("moduleNamePlaceholder") || "Module name (Press Enter)..."}
            className="flex-1 min-w-0 text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-muted)] bg-transparent border-none outline-none"
          />
        </div>
      )}

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredModules.map((module, index) => (
          <ModuleItem
            key={module.id}
            module={module}
            index={index}
            total={filteredModules.length}
            selected={selected}
            onSelect={onSelect}
            expanded={expanded.has(module.id)}
            onToggle={() => toggleModule(module.id)}
            onAddLesson={onAddLesson}
            onAddExam={onAddExam}
            onDeleteModule={onDeleteModule}
            onDeleteLesson={onDeleteLesson}
            onMoveModule={onMoveModule}
            onMoveLesson={onMoveLesson}
            isMutating={isMutating}
            searchQuery={searchQuery}
          />
        ))}

        {filteredModules.length === 0 && (
          <div className="text-center py-8 text-[var(--admin-muted)]">
            <p className="text-xs">
              {searchQuery ? t("noMatchingModules") || "No matching modules or lessons." : t("noModulesYet") || "No modules added yet."}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
