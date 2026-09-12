"use client";

import { useLanguage } from "@/lib/language-context";
import { RichEditor } from "./rich-editor";
import { Lesson } from "@/lib/courses-store";
import type { Editor } from "@tiptap/core";

interface LessonEditorProps {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

export function LessonEditor({ lesson, onChange, onEditorReady }: LessonEditorProps) {
  const { t } = useLanguage();

  return (
    <RichEditor
      content={lesson.content || ""}
      onChange={(content) => onChange({ ...lesson, content })}
      placeholder={t("lessonContentPlaceholder") || "Write the lesson content here..."}
      onEditorReady={onEditorReady}
    />
  );
}
