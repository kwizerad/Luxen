"use client";

import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { RichEditor } from "./rich-editor";
import { Lesson } from "@/lib/courses-store";

interface LessonEditorProps {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
}

export function LessonEditor({ lesson, onChange }: LessonEditorProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--admin-text)]">
          {t("lessonTitle") || "Lesson Title"}
        </label>
        <Input
          value={lesson.title}
          onChange={(e) => onChange({ ...lesson, title: e.target.value })}
          placeholder={t("lessonTitle") || "Lesson title"}
          className="admin-input"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--admin-text)]">
          {t("lessonContent") || "Lesson Content"}
        </label>
        <RichEditor
          content={lesson.content}
          onChange={(content) => onChange({ ...lesson, content })}
          placeholder={t("lessonContentPlaceholder") || "Write the lesson content here..."}
        />
      </div>
    </div>
  );
}
