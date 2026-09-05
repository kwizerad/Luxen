"use client";

import { useLanguage } from "@/lib/language-context";
import { Course, Module } from "@/lib/courses-store";
import { BookOpen, Layers, FileText, ClipboardList, ChevronRight, Plus } from "lucide-react";

interface CourseOverviewProps {
  course: Course;
  onSelectModule: (moduleId: string) => void;
  onAddModule: () => void;
}

export function CourseOverview({ course, onSelectModule, onAddModule }: CourseOverviewProps) {
  const { t } = useLanguage();

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalTopics = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + (l.topics?.length || 0), 0),
    0
  );
  const totalExams = course.modules.filter((m) => m.exam).length;
  const isPublished = course.status === "published";

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Course header */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-[5px] bg-[var(--admin-primary)]/10 flex-shrink-0">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--admin-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--admin-text)]">{course.title}</h2>
            {course.description && (
              <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-1 line-clamp-2">{course.description}</p>
            )}
            <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs text-[var(--admin-muted)] flex-wrap">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {course.modules.length} {t("modules") || "Modules"}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {totalLessons} {t("lessons") || "Lessons"}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {totalTopics} {t("topics") || "Topics"}
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                {totalExams} {t("exams") || "Exams"}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isPublished ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"}`}>
                {isPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules list */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[var(--admin-border)]">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("modules") || "Modules"}</h3>
          <button
            type="button"
            onClick={onAddModule}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addModule") || "Add Module"}
          </button>
        </div>
        {course.modules.length === 0 ? (
          <div className="px-4 py-6 sm:py-8 text-center text-sm text-[var(--admin-muted)]">
            {t("noModulesYet") || "No modules have been added yet."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {course.modules.map((module, idx) => {
              const modTopicCount = module.lessons.reduce((s, l) => s + (l.topics?.length || 0), 0);
              const modPublished = module.status === "published";
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onSelectModule(module.id)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-[var(--admin-hover-bg)] transition-colors group"
                >
                  <span className="text-xs text-[var(--admin-muted)] font-medium w-5 sm:w-6 flex-shrink-0">{idx + 1}</span>
                  <Layers className="h-4 w-4 text-[var(--admin-primary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--admin-text)] truncate">{module.title || `${t("untitledModule") || "Untitled Module"} ${idx + 1}`}</p>
                    <div className="flex items-center gap-2 sm:gap-3 text-[10px] text-[var(--admin-muted)] mt-0.5 flex-wrap">
                      <span>{module.lessons.length} {t("lessons") || "lessons"}</span>
                      <span>{modTopicCount} {t("topics") || "topics"}</span>
                      {module.exam && <span>{module.exam.questions.length} {t("questions") || "questions"}</span>}
                      <span className={modPublished ? "text-green-600 dark:text-green-400" : ""}>
                        {modPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--admin-muted)] group-hover:text-[var(--admin-text)] transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
