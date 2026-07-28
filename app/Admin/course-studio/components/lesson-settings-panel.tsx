"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Lesson, CourseStatus } from "@/lib/courses-store";
import { FileText } from "lucide-react";

interface LessonSettingsPanelProps {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

export function LessonSettingsPanel({ lesson, onChange }: LessonSettingsPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium">
        <FileText className="h-4 w-4 text-[var(--admin-primary)]" />
        {t("lessonSettings") || "Lesson Settings"}
      </div>

      <div className="space-y-2">
        <Label className="text-[var(--admin-text)]">{t("status") || "Status"}</Label>
        <Select
          value={lesson.status}
          onValueChange={(value) => onChange({ ...lesson, status: value as CourseStatus })}
        >
          <SelectTrigger className="admin-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
