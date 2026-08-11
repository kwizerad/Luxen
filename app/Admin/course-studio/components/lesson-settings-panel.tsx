"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Lesson, LessonTopic, CourseStatus } from "@/lib/courses-store";
import { FileText, X, Plus, Tag, AlertTriangle, Trash2, Clock } from "lucide-react";
import { AudioUpload } from "@/components/audio-upload";

interface LessonSettingsPanelProps {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

export function LessonSettingsPanel({ lesson, onChange }: LessonSettingsPanelProps) {
  const { t } = useLanguage();
  const [topicInput, setTopicInput] = useState("");
  const [topicToDelete, setTopicToDelete] = useState<LessonTopic | null>(null);

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (!trimmed) return;
    if (lesson.topics?.some((t) => t.title === trimmed)) {
      setTopicInput("");
      return;
    }
    const newTopic: LessonTopic = {
      id: crypto.randomUUID(),
      title: trimmed,
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      estimated_minutes: 5,
    };
    onChange({ ...lesson, topics: [...(lesson.topics || []), newTopic] });
    setTopicInput("");
  };

  const removeTopic = (topicId: string) => {
    onChange({ ...lesson, topics: (lesson.topics || []).filter((t) => t.id !== topicId) });
  };

  const updateTopicTime = (topicId: string, minutes: number) => {
    onChange({
      ...lesson,
      topics: (lesson.topics || []).map((t) =>
        t.id === topicId ? { ...t, estimated_minutes: Math.max(0, minutes) } : t
      ),
    });
  };

  const confirmRemoveTopic = () => {
    if (topicToDelete) {
      removeTopic(topicToDelete.id);
      setTopicToDelete(null);
    }
  };

  const handleTopicKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTopic();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium text-sm">
        <FileText className="h-4 w-4 text-[var(--admin-primary)]" />
        {t("lessonSettings") || "Lesson Settings"}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--admin-text)]">{t("lessonTitle") || "Lesson Title"}</Label>
        <Input
          value={lesson.title}
          onChange={(e) => onChange({ ...lesson, title: e.target.value })}
          className="admin-input h-8 text-sm"
          placeholder={t("lessonTitle") || "Lesson title"}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--admin-text)]">{t("status") || "Status"}</Label>
        <Select
          value={lesson.status}
          onValueChange={(value) => onChange({ ...lesson, status: value as CourseStatus })}
        >
          <SelectTrigger className="admin-input h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <AudioUpload
          value={lesson.audioUrl}
          onChange={(audioUrl) => onChange({ ...lesson, audioUrl: audioUrl || undefined })}
          folder="lessons/audio"
          label={t("ttsAudio") || "Text-to-speech audio"}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-[var(--admin-text)] flex items-center gap-1.5">
          <Tag className="h-3 w-3" />
          {t("topics") || "Topics"}
        </Label>
        {(lesson.topics || []).length > 0 && (
          <div className="space-y-1.5">
            {lesson.topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs bg-[var(--admin-primary)]/10 text-[var(--admin-text)] border border-[var(--admin-primary)]/15"
              >
                <Tag className="h-3 w-3 text-[var(--admin-primary)] flex-shrink-0" />
                <span className="flex-1 truncate">{topic.title}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Clock className="h-3 w-3 text-[var(--admin-muted)]" />
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={topic.estimated_minutes || 0}
                    onChange={(e) => updateTopicTime(topic.id, Number(e.target.value))}
                    className="admin-input h-6 w-14 text-xs text-center px-1"
                  />
                  <span className="text-[10px] text-[var(--admin-muted)]">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTopicToDelete(topic)}
                  className="hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={handleTopicKeyDown}
            className="admin-input h-8 text-sm flex-1"
            placeholder={t("addTopic") || "Add a topic and press Enter"}
          />
          <button
            type="button"
            onClick={addTopic}
            disabled={!topicInput.trim()}
            className="flex items-center justify-center h-8 w-8 rounded-md border border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] disabled:opacity-30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {topicToDelete && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--admin-text)]">
                {t("confirmDeleteTopic") || "Delete topic?"}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">
                {t("confirmDeleteTopicDesc") || "This will permanently remove \""}{topicToDelete.title}{t("confirmDeleteTopicDescEnd") || "\" and all its content."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-6">
            <button
              type="button"
              onClick={confirmRemoveTopic}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {t("delete") || "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setTopicToDelete(null)}
              className="px-2.5 py-1 rounded-md text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
            >
              {t("cancel") || "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
