"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { LessonTopic } from "@/lib/courses-store";
import { BookOpen, Plus, CheckCircle2 } from "lucide-react";

interface TopicStripProps {
  topics: LessonTopic[];
  activeTopicId?: string;
  completedTopicIds?: Set<string>;
  onSelectTopic: (topicId: string) => void;
  onAddTopic: () => void;
}

export function TopicStrip({
  topics,
  activeTopicId,
  completedTopicIds,
  onSelectTopic,
  onAddTopic,
}: TopicStripProps) {
  const { t } = useLanguage();

  if (topics.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAddTopic}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors border border-dashed border-[var(--admin-border)]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addTopic") || "Add Topic"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
      {topics.map((topic, idx) => {
        const isActive = topic.id === activeTopicId;
        const isCompleted = completedTopicIds?.has(topic.id);
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => onSelectTopic(topic.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-xs whitespace-nowrap transition-all flex-shrink-0 border",
              isActive
                ? "bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] border-[var(--admin-primary)]/40 font-medium"
                : "text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] border-transparent"
            )}
            title={topic.title}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
            ) : (
              <BookOpen className="h-3 w-3 flex-shrink-0 opacity-60" />
            )}
            <span className="max-w-[120px] truncate">{topic.title || `${t("topic") || "Topic"} ${idx + 1}`}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAddTopic}
        className="flex items-center justify-center w-7 h-7 rounded-[5px] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors border border-dashed border-[var(--admin-border)] flex-shrink-0"
        title={t("addTopic") || "Add Topic"}
        aria-label={t("addTopic") || "Add Topic"}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
