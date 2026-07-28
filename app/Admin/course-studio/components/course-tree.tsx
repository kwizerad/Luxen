"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Course, Module, Lesson } from "@/lib/courses-store";
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  FileText,
  ClipboardList,
  Plus,
  Trash2,
} from "lucide-react";

export type Selection =
  | { type: "course" }
  | { type: "module"; moduleId: string }
  | { type: "lesson"; moduleId: string; lessonId: string }
  | { type: "exam"; moduleId: string; examId: string };

interface CourseTreeProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onAddModule: () => void | Promise<void>;
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

  const handleLessonClick = (lesson: Lesson) => {
    onSelect({ type: "lesson", moduleId: module.id, lessonId: lesson.id });
  };

  const handleExamClick = () => {
    if (module.exam) {
      onSelect({ type: "exam", moduleId: module.id, examId: module.exam.id });
    }
  };

  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/30 overflow-hidden transition-all hover:border-[var(--admin-border-hover)]/60">
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
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
            disabled={index === 0}
            className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveModule(module.id, "down"); }}
            disabled={index === total - 1}
            className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDeleteModule(module.id); }}
            className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
            const lessonIndex = index;
            return (
              <div
                key={lesson.id}
                onClick={() => handleLessonClick(lesson)}
                className={cn(
                  "group flex items-center gap-2 pl-9 pr-2 py-2 rounded-lg cursor-pointer transition-all",
                  isSelected
                    ? "bg-[var(--admin-primary)]/15 text-[var(--admin-text)] border border-[var(--admin-primary)]/40 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0 opacity-70" />
                <span className="flex-1 min-w-0 truncate text-sm">{lesson.title || t("untitledLesson") || "Untitled Lesson"}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "up"); }}
                    disabled={lessonIndex === 0}
                    className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMoveLesson(module.id, lesson.id, "down"); }}
                    disabled={lessonIndex === module.lessons.length - 1}
                    className="p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteLesson(module.id, lesson.id); }}
                    className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {module.exam ? (
            <button
              type="button"
              onClick={handleExamClick}
              className={cn(
                "w-full flex items-center gap-2 pl-9 pr-2 py-2 rounded-lg text-left text-sm transition-all",
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
              className="w-full flex items-center gap-2 pl-9 pr-2 py-2 rounded-lg text-left text-sm text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-all"
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="italic opacity-80">{t("noExamCreated") || "No Exam Created"}</span>
            </button>
          )}

          <div className="flex items-center gap-1 mt-1 pl-8">
            <button
              type="button"
              onClick={() => onAddLesson(module.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              {t("addLesson") || "Add Lesson"}
            </button>
            {!module.exam && (
              <button
                type="button"
                onClick={() => onAddExam(module.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                {t("addExam") || "Add Exam"}
              </button>
            )}
          </div>
        </div>
      )}
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
}: CourseTreeProps) {
  const { t } = useLanguage();
  const course = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(course?.modules.map((m) => m.id) || [])
  );

  const toggleModule = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const isCourseSelected = selected.type === "course";
  const languageLabel = (lang: "English" | "Kinyarwanda" | "French") =>
    lang === "Kinyarwanda" ? "Kinyarwanda" : lang === "French" ? "Français" : "English";

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 admin-card p-4 flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="admin-card-title flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--admin-primary)]" />
          {t("courses") || "Courses"}
        </h2>
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

      {course && (
        <button
          type="button"
          onClick={() => onSelect({ type: "course" })}
          className={cn(
            "w-full text-left rounded-xl p-3 transition-all border",
            isCourseSelected
              ? "bg-[var(--admin-primary)]/15 border-[var(--admin-primary)]/40"
              : "bg-[var(--admin-hover-bg)] border-transparent hover:border-[var(--admin-border)]"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-[var(--admin-text)] line-clamp-1">{course.title}</p>
          </div>
          <p className="text-xs text-[var(--admin-muted)] line-clamp-2 mt-1">
            {course.description || t("noDescription") || "No description"}
          </p>
        </button>
      )}

      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs uppercase tracking-wide text-[var(--admin-muted)] font-semibold">
          {t("modules") || "Modules"}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {course?.modules.map((module, index) => (
          <ModuleItem
            key={module.id}
            module={module}
            index={index}
            total={course.modules.length}
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
          />
        ))}

        {course?.modules.length === 0 && (
          <div className="text-center py-8 border border-dashed border-[var(--admin-border)] rounded-2xl">
            <p className="text-sm text-[var(--admin-muted)]">{t("noModulesYet") || "No modules have been added yet."}</p>
          </div>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        disabled={isMutating}
        onClick={() => void Promise.resolve(onAddModule()).catch(() => undefined)}
        className="admin-btn-primary w-full"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        {isMutating ? (t("loading") || "Loading...") : (t("addModule") || "Add Module")}
      </Button>
    </aside>
  );
}
