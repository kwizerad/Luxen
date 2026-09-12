"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { ModuleExam, CourseStatus, ModuleExamQuestionType } from "@/lib/courses-store";
import { ClipboardList, Trash2, CheckCircle2, ListChecks, ToggleLeft, ArrowLeftRight } from "lucide-react";

interface ExamSettingsPanelProps {
  exam: ModuleExam;
  onChange: (exam: ModuleExam) => void;
  onDelete: () => void;
}

const STATUSES: CourseStatus[] = ["draft", "published", "archived"];

const QUESTION_TYPE_LABELS: Record<ModuleExamQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "T/F",
  matching: "Matching",
};

const QUESTION_TYPE_ICONS: Record<ModuleExamQuestionType, typeof CheckCircle2> = {
  multiple_choice: CheckCircle2,
  multiple_select: ListChecks,
  true_false: ToggleLeft,
  matching: ArrowLeftRight,
};

export function ExamSettingsPanel({ exam, onChange, onDelete }: ExamSettingsPanelProps) {
  const { t } = useLanguage();

  const updateSettings = (patch: Partial<ModuleExam["settings"]>) => {
    onChange({
      ...exam,
      settings: { ...exam.settings, ...patch },
    });
  };

  // Collect existing question types from the exam's questions
  const existingTypes = Array.from(
    new Set(exam.questions.map((q) => q.type))
  ) as ModuleExamQuestionType[];

  const toggleQuestionType = (type: ModuleExamQuestionType) => {
    const current = exam.settings.examType;
    if (current.includes(type)) {
      updateSettings({ examType: current.filter((t) => t !== type) });
    } else {
      updateSettings({ examType: [...current, type] });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--admin-text)] font-medium text-sm">
        <ClipboardList className="h-4 w-4 text-[var(--admin-secondary)]" />
        {t("examSettings") || "Exam Settings"}
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--admin-text)]">{t("examTitle") || "Exam Title"}</Label>
          <Input
            value={exam.title}
            onChange={(e) => onChange({ ...exam, title: e.target.value })}
            className="admin-input h-8 text-sm"
            placeholder={t("moduleExam") || "Module Exam"}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-[var(--admin-text)]">{t("status") || "Status"}</Label>
            <Select
              value={exam.status}
              onValueChange={(value) => onChange({ ...exam, status: value as CourseStatus })}
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
          <div className="space-y-1">
            <Label className="text-xs text-[var(--admin-text)]">{t("passingPercentage") || "Passing Percentage"}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={exam.settings.passingPercentage}
              onChange={(e) =>
                updateSettings({ passingPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
              }
              className="admin-input h-8 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-[var(--admin-text)]">{t("maxAttempts") || "Max Attempts"}</Label>
            <Input
              type="number"
              min={1}
              value={exam.settings.maxAttempts ?? ""}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : null;
                updateSettings({ maxAttempts: value });
              }}
              placeholder="2"
              className="admin-input h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--admin-text)]">{t("examDuration") || "Exam Duration (min)"}</Label>
            <Input
              type="number"
              min={1}
              value={exam.settings.durationMinutes}
              onChange={(e) => updateSettings({ durationMinutes: Math.max(1, Number(e.target.value) || 0) })}
              className="admin-input h-8 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-[var(--admin-text)]">{t("noq") || "NOQ"}</Label>
            <Input
              type="number"
              min={1}
              value={exam.settings.questionCount}
              onChange={(e) => updateSettings({ questionCount: Math.max(1, Number(e.target.value) || 0) })}
              className="admin-input h-8 text-sm"
            />
          </div>
        </div>

        {existingTypes.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-[var(--admin-text)]">{t("examType") || "Exam Type"}</Label>
            <div className="flex flex-wrap gap-1.5">
              {existingTypes.map((type) => {
                const Icon = QUESTION_TYPE_ICONS[type];
                const active = exam.settings.examType.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleQuestionType(type)}
                    title={QUESTION_TYPE_LABELS[type]}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors border",
                      active
                        ? "bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] border-[var(--admin-primary)]/40"
                        : "text-[var(--admin-muted)] border-[var(--admin-border)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {QUESTION_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-1">
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

        <div className="pt-2 border-t border-[var(--admin-border)]">
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="w-full h-8 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
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
      <Label className="text-xs text-[var(--admin-text)] cursor-pointer">{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[var(--admin-primary)]"
      />
    </div>
  );
}
