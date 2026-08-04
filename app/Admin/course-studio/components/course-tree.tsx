"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

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
}) {
  const { t } = useLanguage();
  const isModuleSelected = selected.type === "module" && selected.moduleId === module.id;
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "module"; id: string; title: string }
    | { kind: "lesson"; moduleId: string; id: string; title: string }
    | null
  >(null);

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const handleLessonClick = (lesson: Lesson) => {
    onSelect({ type: "lesson", moduleId: module.id, lessonId: lesson.id });
  };

  const handleExamClick = () => {
    if (module.exam) {
      onSelect({ type: "exam", moduleId: module.id, examId: module.exam.id });
    }
  };

  return (
    <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/30 overflow-hidden transition-all hover:border-[var(--admin-border-hover)]/60">
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
          {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        {expanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-[var(--admin-primary)]" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-[var(--admin-muted)]" />
        )}
        <span className="flex-1 min-w-0 truncate font-medium text-sm text-[var(--admin-text)]">
          {module.title || t("untitledModule") || "Untitled Module"}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveModule(module.id, "up"); }}
            disabled={index === 0 || isMutating}
            className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveModule(module.id, "down"); }}
            disabled={index === total - 1 || isMutating}
            className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "module", id: module.id, title: module.title }); }}
            disabled={isMutating}
            className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
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
                    "group flex items-center gap-2 pl-9 pr-2 py-2 rounded-[5px] cursor-pointer transition-all",
                    isSelected
                      ? "bg-[var(--admin-primary)]/15 text-[var(--admin-text)] border border-[var(--admin-primary)]/40 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                      : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                  )}
                >
                  {hasTopics ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleLessonExpand(lesson.id); }}
                      className="p-0.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                    >
                      {lessonExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  ) : (
                    <FileText className="h-4 w-4 flex-shrink-0 opacity-70" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm">{lesson.title || t("untitledLesson") || "Untitled Lesson"}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "up"); }}
                      disabled={lessonIndex === 0 || isMutating}
                      className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "down"); }}
                      disabled={lessonIndex === module.lessons.length - 1 || isMutating}
                      className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ kind: "lesson", moduleId: module.id, id: lesson.id, title: lesson.title }); }}
                      disabled={isMutating}
                      className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {hasTopics && lessonExpanded && (
                  <div className="pl-12 pr-2 py-1 space-y-0.5">
                    {lesson.topics.map((topic) => {
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
                            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-all",
                            isThisTopicSelected
                              ? "bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] border border-[var(--admin-primary)]/30"
                              : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                          )}
                        >
                          <BookOpen className="h-3 w-3 flex-shrink-0 opacity-60" />
                          <span className="flex-1 min-w-0 truncate">{topic.title || t("untitledTopic") || "Untitled Topic"}</span>
                        </div>
                      );
                    })}
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
                "w-full flex items-center gap-2 pl-9 pr-2 py-2 rounded-[5px] text-left text-sm transition-all",
                selected.type === "exam" && selected.moduleId === module.id && selected.examId === module.exam.id
                  ? "bg-[var(--admin-primary)]/15 text-[var(--admin-text)] border border-[var(--admin-primary)]/40 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              )}
            >
              <ClipboardList className="h-4 w-4 flex-shrink-0 text-[var(--admin-secondary)]" />
              <span className="flex-1 min-w-0 truncate">{module.exam.title || t("moduleExam") || "Module Exam"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAddExam(module.id)}
              className="w-full flex items-center gap-2 pl-9 pr-2 py-2 rounded-[5px] text-left text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-all"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="italic opacity-80">{t("noExamCreated") || "No Exam Created"}</span>
            </button>
          )}

          <div className="flex items-center gap-1 mt-1 pl-8">
            <button
              type="button"
              onClick={() => onAddLesson(module.id)}
              disabled={isMutating}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-30"
            >
              <FileText className="h-3.5 w-3.5" />
              {t("addLesson") || "Add Lesson"}
            </button>
            {!module.exam && (
              <button
                type="button"
                onClick={() => onAddExam(module.id)}
                disabled={isMutating}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors disabled:opacity-30"
              >
                <ClipboardList className="h-3.5 w-3.5" />
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
            ? (t("confirmDeleteModuleDesc") || `Are you sure you want to delete "${deleteTarget?.title}"? This will also delete all lessons and the exam inside this module.`).replace("\${title}", deleteTarget?.title || "")
            : (t("confirmDeleteLessonDesc") || `Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`).replace("\${title}", deleteTarget?.title || "")
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

  // Expand modules for the active course whenever it changes.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const module of course?.modules || []) next.add(module.id);
      return next;
    });
  }, [course?.id]);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const newModuleInputRef = useRef<HTMLInputElement>(null);
  const confirmedRef = useRef(false);

  // Auto-focus the inline input when it appears (VSCode new-file style).
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
    // Focus the input after it's rendered
    setTimeout(() => {
      newModuleInputRef.current?.focus();
    }, 50);
  };

  const cancelCreatingModule = () => {
    if (confirmedRef.current) return; // Enter was pressed — don't cancel.
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
    <aside className="course-tree-sidebar w-full lg:w-80 flex-shrink-0 p-3 sm:p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="admin-card-title flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--admin-primary)]" />
          {t("courses") || "Courses"}
        </h2>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(true)}
          className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
          title={t("collapse") || "Collapse"}
          aria-label={t("collapse") || "Collapse"}
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      <Select value={selectedCourseId} onValueChange={onSelectCourse}>
        <SelectTrigger className="admin-input">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>{languageLabel(c.language)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs uppercase tracking-wide text-[var(--admin-muted)] font-semibold">
          {t("modules") || "Modules"}
        </h3>
        <button
          type="button"
          disabled={isMutating || isCreatingModule}
          onClick={startCreatingModule}
          className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-50 transition-colors"
          title={t("addModule") || "Add Module"}
          aria-label={t("addModule") || "Add Module"}
        >
          {isMutating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Inline new-module input — VSCode new-file style */}
      {isCreatingModule && (
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <FileText className="h-4 w-4 flex-shrink-0 text-[var(--admin-primary)]" />
          <input
            ref={newModuleInputRef}
            type="text"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { 
                e.preventDefault(); 
                // Prevent onBlur from firing after Enter
                e.currentTarget.blur(); 
                confirmCreatingModule(); 
              }
              else if (e.key === "Escape") { 
                e.preventDefault(); 
                e.currentTarget.blur();
                cancelCreatingModule(); 
              }
            }}
            onBlur={(e) => {
              // Only cancel if not already confirmed (Enter key wasn't pressed)
              if (!confirmedRef.current) {
                cancelCreatingModule();
              }
            }}
            placeholder={t("moduleNamePlaceholder") || "Module name..."}
            className="flex-1 min-w-0 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-muted)] bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-0"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {course?.modules.map((module, index) => (
          <ModuleItem
            key={module.id}
            module={module}
            index={index}
            total={course?.modules.length ?? 0}
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
          />
        ))}

        {course?.modules.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--admin-muted)]">{t("noModulesYet") || "No modules have been added yet."}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
