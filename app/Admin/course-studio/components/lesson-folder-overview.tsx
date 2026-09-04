"use client";

import { useLanguage } from "@/lib/language-context";
import { Lesson } from "@/lib/courses-store";
import {
  FolderOpen,
  FileText,
  Clock,
  Plus,
  ChevronRight,
  Volume2,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonFolderOverviewProps {
  lesson: Lesson;
  onSelectTopic: (topicId: string) => void;
  onAddTopic: () => void;
  onDeleteTopic: (topicId: string) => void;
}

export function LessonFolderOverview({
  lesson,
  onSelectTopic,
  onAddTopic,
  onDeleteTopic,
}: LessonFolderOverviewProps) {
  const { t } = useLanguage();

  const topics = lesson.topics || [];
  const totalMinutes = topics.reduce((sum, tp) => sum + (tp.estimated_minutes || 0), 0);
  const isPublished = lesson.status === "published";

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Lesson Folder Header */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-[5px] bg-amber-500/10 text-amber-500 flex-shrink-0">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold text-[var(--admin-text)] truncate">
                {lesson.title || t("untitledLesson") || "Untitled Lesson"}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  isPublished
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"
                }`}
              >
                {isPublished ? t("published") || "Published" : t("draft") || "Draft"}
              </span>
            </div>
            <p className="text-xs text-[var(--admin-muted)] mt-1">
              {t("lessonFolderSubtitle") ||
                "This lesson acts as a folder containing all topics below."}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--admin-muted)] flex-wrap">
              <span className="flex items-center gap-1 font-medium text-[var(--admin-text)]">
                <FileText className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                {topics.length} {t("topics") || "Topics"}
              </span>
              {totalMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {totalMinutes} {t("minTotal") || "min total"}
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={onAddTopic}
            className="flex-shrink-0 gap-1.5 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/90 text-white h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addTopic") || "Add Topic"}
          </Button>
        </div>
      </div>

      {/* Topics in Folder */}
      <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--admin-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">
              {t("availableTopics") || "Available Topics in Folder"}
            </h3>
          </div>
          <span className="text-xs text-[var(--admin-muted)]">
            {topics.length} {topics.length === 1 ? "topic" : "topics"}
          </span>
        </div>

        {topics.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted/40 mx-auto text-[var(--admin-muted)]">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--admin-text)]">
                {t("noTopicsInFolder") || "No topics in this lesson folder yet."}
              </p>
              <p className="text-xs text-[var(--admin-muted)] max-w-sm mx-auto">
                {t("noTopicsInFolderDesc") ||
                  "Lessons organize topics into a folder. Add topics to provide study content, questions, and text-to-speech audio."}
              </p>
            </div>
            <Button
              size="sm"
              onClick={onAddTopic}
              className="gap-1.5 bg-[var(--admin-primary)] hover:bg-[var(--admin-primary)]/90 text-white h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("createFirstTopic") || "Create First Topic"}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {topics.map((topic, idx) => (
              <div
                key={topic.id}
                className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-[var(--admin-hover-bg)]/60 transition-colors group cursor-pointer"
                onClick={() => onSelectTopic(topic.id)}
              >
                <span className="text-xs text-[var(--admin-muted)] font-mono w-5 flex-shrink-0">
                  {idx + 1}.
                </span>
                <div className="flex items-center justify-center h-8 w-8 rounded bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--admin-text)] truncate group-hover:text-[var(--admin-primary)] transition-colors">
                      {topic.title || `${t("topic") || "Topic"} ${idx + 1}`}
                    </p>
                    {topic.audioUrl && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                        <Volume2 className="h-3 w-3" />
                        {t("audio") || "Audio"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--admin-muted)] mt-0.5">
                    {topic.estimated_minutes ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {topic.estimated_minutes} min
                      </span>
                    ) : (
                      <span>{t("noTimeSet") || "~5 min"}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTopic(topic.id);
                    }}
                    className="p-1.5 rounded-md text-[var(--admin-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={t("deleteTopic") || "Delete topic"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-[var(--admin-muted)] group-hover:text-[var(--admin-primary)] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
