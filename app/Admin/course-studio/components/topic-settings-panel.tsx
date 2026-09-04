"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { LessonTopic, CourseStatus } from "@/lib/courses-store";
import { BookOpen, Trash2 } from "lucide-react";
import { AudioUpload } from "@/components/audio-upload";

interface TopicSettingsPanelProps {
  topic: LessonTopic;
  onChange: (topic: LessonTopic) => void;
  onDelete: () => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

export function TopicSettingsPanel({ topic, onChange, onDelete }: TopicSettingsPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium text-sm">
        <BookOpen className="h-4 w-4 text-[var(--admin-primary)]" />
        {t("topicSettings") || "Topic Settings"}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--admin-text)]">{t("topicTitle") || "Topic Title"}</Label>
        <Input
          value={topic.title}
          onChange={(e) => onChange({ ...topic, title: e.target.value })}
          className="admin-input h-8 text-sm"
          placeholder={t("topicTitle") || "Topic title"}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-[var(--admin-text)]">{t("estimatedMinutes") || "Estimated Minutes"}</Label>
        <Input
          type="number"
          min={0}
          max={180}
          value={topic.estimated_minutes || 0}
          onChange={(e) => onChange({ ...topic, estimated_minutes: Math.max(0, Number(e.target.value)) })}
          className="admin-input h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <AudioUpload
          value={topic.audioUrl}
          onChange={(audioUrl) => onChange({ ...topic, audioUrl: audioUrl || undefined })}
          folder="topics/audio"
          label={t("ttsAudio") || "Text-to-speech audio"}
        />
      </div>

      <div className="pt-2 border-t border-[var(--admin-border)]">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="w-full h-8 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          {t("deleteTopic") || "Delete Topic"}
        </Button>
      </div>
    </div>
  );
}
