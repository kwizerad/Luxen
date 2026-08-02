"use client";

import { useLanguage } from "@/lib/language-context";
import { Module } from "@/lib/courses-store";
import { Layers, FileText, ClipboardList, Clock, Plus, ChevronRight } from "lucide-react";

interface ModuleOverviewProps {
  module: Module;
  onSelectLesson: (lessonId: string) => void;
  onSelectExam: () => void;
  onAddLesson: () => void;
  onAddExam: () => void;
}

export function ModuleOverview({
  module,
  onSelectLesson,
  onSelectExam,
  onAddLesson,
  onAddExam,
}: ModuleOverviewProps) {
  const { t } = useLanguage();

  const topicCount = module.lessons.reduce((sum, l) => sum + (l.topics?.length || 0), 0);
  const isPublished = module.status === "published";

  return (
    <div className="space-y-4">
      {/* Module header */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-[5px] bg-[var(--admin-primary)]/10 flex-shrink-0">
            <Layers className="h-5 w-5 text-[var(--admin-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">{module.title}</h2>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--admin-muted)]">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {module.lessons.length} {t("lessons") || "Lessons"}
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                {topicCount} {t("topics") || "Topics"}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isPublished ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"}`}>
                {isPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border)]">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("lessons") || "Lessons"}</h3>
          <button
            type="button"
            onClick={onAddLesson}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addLesson") || "Add Lesson"}
          </button>
        </div>
        {module.lessons.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
            {t("noLessonsYet") || "No lessons yet."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {module.lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => onSelectLesson(lesson.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--admin-hover-bg)] transition-colors group"
              >
                <span className="text-xs text-[var(--admin-muted)] font-medium w-6 flex-shrink-0">{idx + 1}</span>
                <FileText className="h-4 w-4 text-[var(--admin-primary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--admin-text)] truncate">{lesson.title || `${t("untitledLesson") || "Untitled Lesson"} ${idx + 1}`}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--admin-muted)] mt-0.5">
                    <span>{lesson.topics?.length || 0} {t("topics") || "topics"}</span>
                    {lesson.topics && lesson.topics.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {lesson.topics.reduce((sum, tp) => sum + (tp.estimated_minutes || 0), 0)} min
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--admin-muted)] group-hover:text-[var(--admin-text)] transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Exam section */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border)]">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("moduleExam") || "Module Exam"}</h3>
          {!module.exam && (
            <button
              type="button"
              onClick={onAddExam}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("addExam") || "Add Exam"}
            </button>
          )}
        </div>
        {module.exam ? (
          <button
            type="button"
            onClick={onSelectExam}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--admin-hover-bg)] transition-colors group"
          >
            <ClipboardList className="h-4 w-4 text-[var(--admin-secondary)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--admin-text)] truncate">{module.exam.title || t("moduleExam") || "Module Exam"}</p>
              <p className="text-[10px] text-[var(--admin-muted)] mt-0.5">{module.exam.questions.length} {t("questions") || "questions"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--admin-muted)] group-hover:text-[var(--admin-text)] transition-colors flex-shrink-0" />
          </button>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-[var(--admin-muted)]">
            {t("noExamCreated") || "No Exam Created"}
          </div>
        )}
      </div>
    </div>
  );
}
