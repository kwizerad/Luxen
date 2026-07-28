"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { ModuleExam, CourseStatus } from "@/lib/courses-store";
import { ClipboardList, Trash2 } from "lucide-react";

interface ExamSettingsPanelProps {
  exam: ModuleExam;
  onChange: (exam: ModuleExam) => void;
  onDelete: () => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

export function ExamSettingsPanel({ exam, onChange, onDelete }: ExamSettingsPanelProps) {
  const { t } = useLanguage();

  const updateSettings = (patch: Partial<ModuleExam["settings"]>) => {
    onChange({
      ...exam,
      settings: { ...exam.settings, ...patch },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium">
        <ClipboardList className="h-4 w-4 text-[var(--admin-secondary)]" />
        {t("examSettings") || "Exam Settings"}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[var(--admin-text)]">{t("examTitle") || "Exam Title"}</Label>
          <Input
            value={exam.title}
            onChange={(e) => onChange({ ...exam, title: e.target.value })}
            className="admin-input"
            placeholder={t("moduleExam") || "Module Exam"}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[var(--admin-text)]">{t("status") || "Status"}</Label>
          <Select
            value={exam.status}
            onValueChange={(value) => onChange({ ...exam, status: value as CourseStatus })}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[var(--admin-text)]">{t("passingPercentage") || "Passing Percentage"}</Label>
            <span className="text-sm text-[var(--admin-muted)]">{exam.settings.passingPercentage}%</span>
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            value={exam.settings.passingPercentage}
            onChange={(e) =>
              updateSettings({ passingPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
            }
            className="admin-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("maxAttempts") || "Max Attempts"}</Label>
            <Input
              type="number"
              min={1}
              value={exam.settings.maxAttempts ?? ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                updateSettings({ maxAttempts: value });
              }}
              placeholder={t("unlimited") || "Unlimited"}
              className="admin-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[var(--admin-text)]">{t("timeLimitMinutes") || "Time Limit (min)"}</Label>
            <Input
              type="number"
              min={1}
              value={exam.settings.timeLimitMinutes ?? ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                updateSettings({ timeLimitMinutes: value });
              }}
              placeholder={t("noLimit") || "No limit"}
              className="admin-input"
            />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <SwitchRow
            label={t("randomizeQuestionOrder") || "Randomize Question Order"}
            checked={exam.settings.randomizeQuestionOrder}
            onCheckedChange={(checked) => updateSettings({ randomizeQuestionOrder: checked })}
          />
          <SwitchRow
            label={t("randomizeAnswerChoices") || "Randomize Answer Choices"}
            checked={exam.settings.randomizeAnswerChoices}
            onCheckedChange={(checked) => updateSettings({ randomizeAnswerChoices: checked })}
          />
          <SwitchRow
            label={t("showResultsImmediately") || "Show Results Immediately"}
            checked={exam.settings.showResultsImmediately}
            onCheckedChange={(checked) => updateSettings({ showResultsImmediately: checked })}
          />
          <SwitchRow
            label={t("showExplanations") || "Show Explanations After Completion"}
            checked={exam.settings.showExplanations}
            onCheckedChange={(checked) => updateSettings({ showExplanations: checked })}
          />
          <SwitchRow
            label={t("allowReview") || "Allow Review After Submission"}
            checked={exam.settings.allowReview}
            onCheckedChange={(checked) => updateSettings({ allowReview: checked })}
          />
        </div>

        <div className="pt-4 border-t border-[var(--admin-border)]">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm(t("confirmDeleteExam") || "Delete this module exam?")) {
                onDelete();
              }
            }}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t("deleteExam") || "Delete Exam"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm text-[var(--admin-text)] cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[var(--admin-primary)]"
      />
    </div>
  );
}
