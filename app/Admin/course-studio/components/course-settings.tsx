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
import { Settings, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
    <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden">
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

          {/* Midterm Configuration */}
          <div className="rounded-[5px] border border-[var(--admin-border)] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium">
                <Shield className="h-4 w-4 text-[var(--admin-primary)]" />
                {t("midtermConfig") || "Midterm Exam Configuration"}
              </div>
              <Switch
                checked={course.midtermEnabled}
                onCheckedChange={(checked) => onChange({ ...course, midtermEnabled: checked })}
              />
            </div>

            {course.midtermEnabled && (
              <div className="space-y-3 pt-2 border-t border-[var(--admin-border)]">
                <div className="space-y-2">
                  <Label className="text-[var(--admin-text)]">{t("midtermInterval") || "Midterm Interval (every N modules)"}</Label>
                  <Select
                    value={String(course.midtermInterval)}
                    onValueChange={(value) => onChange({ ...course, midtermInterval: parseInt(value) })}
                  >
                    <SelectTrigger className="admin-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[var(--admin-text)]">{t("midtermQuestionCount") || "Question Count"}</Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={course.midtermQuestionCount}
                      onChange={(e) => onChange({ ...course, midtermQuestionCount: parseInt(e.target.value) || 30 })}
                      className="admin-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--admin-text)]">{t("midtermDuration") || "Duration (minutes)"}</Label>
                    <Input
                      type="number"
                      min={5}
                      max={180}
                      value={course.midtermDurationMinutes}
                      onChange={(e) => onChange({ ...course, midtermDurationMinutes: parseInt(e.target.value) || 30 })}
                      className="admin-input"
                    />
                  </div>
                </div>

                <p className="text-xs text-[var(--admin-muted)]">
                  {t("midtermConfigDesc") || "A midterm exam will automatically appear after every N completed modules, pulling questions from all completed module exams."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
