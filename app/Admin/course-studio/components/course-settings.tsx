"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";
import { Course, CourseStatus } from "@/lib/courses-store";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";

interface CourseSettingsProps {
  course: Course;
  onChange: (course: Course) => void;
  initiallyOpen?: boolean;
}

const STATUSES: CourseStatus[] = ["draft", "published"];

export function CourseSettings({ course, onChange, initiallyOpen = true }: CourseSettingsProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--admin-hover-bg)]/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium">
          <Settings className="h-4 w-4 text-[var(--admin-primary)]" />
          {t("courseSettings") || "Course Settings"}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--admin-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--admin-muted)]" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-[var(--admin-border)]">
          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("courseTitle") || "Course Title"}</Label>
            <Input
              value={course.title}
              onChange={(e) => onChange({ ...course, title: e.target.value })}
              className="admin-input"
              placeholder={t("courseTitle") || "Course title"}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("description") || "Description"}</Label>
            <Textarea
              value={course.description}
              onChange={(e) => onChange({ ...course, description: e.target.value })}
              className="admin-input min-h-[80px] resize-y"
              placeholder={t("courseDescription") || "Course description"}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("language") || "Language"}</Label>
            <Input value={course.language === "French" ? "Français" : course.language} disabled className="admin-input opacity-70" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[var(--admin-text)]">Thumbnail URL</Label>
              <Input value={course.thumbnailUrl || ""} onChange={(e) => onChange({ ...course, thumbnailUrl: e.target.value })} className="admin-input" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--admin-text)]">Banner URL</Label>
              <Input value={course.bannerUrl || ""} onChange={(e) => onChange({ ...course, bannerUrl: e.target.value })} className="admin-input" placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("status") || "Status"}</Label>
            <Select value={course.status} onValueChange={(value) => onChange({ ...course, status: value as CourseStatus })}>
              <SelectTrigger className="admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(s) || s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
