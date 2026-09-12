"use client";

import { useLanguage } from "@/lib/language-context";
import { ModuleExam, ModuleExamQuestionType } from "@/lib/courses-store";
import { ClipboardList, Clock, ListChecks, CheckCircle2 } from "lucide-react";

const QUESTION_TYPE_LABELS: Record<ModuleExamQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "T/F",
  matching: "Matching",
};

interface ExamSummaryHeaderProps {
  exam: ModuleExam;
}

export function ExamSummaryHeader({ exam }: ExamSummaryHeaderProps) {
  const { t } = useLanguage();

  const questionCount = exam.questions.length;
  const existingTypes = Array.from(new Set(exam.questions.map((q) => q.type))) as ModuleExamQuestionType[];
  const isPublished = exam.status === "published";

  return (
    <div className="rounded-[5px] border border-[var(--admin-border)] bg-[var(--admin-card)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-[5px] bg-[var(--admin-secondary)]/10 flex-shrink-0">
          <ClipboardList className="h-4.5 w-4.5 text-[var(--admin-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--admin-text)] truncate">{exam.title || t("moduleExam") || "Module Exam"}</h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${isPublished ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"}`}>
              {isPublished ? (t("published") || "Published") : (t("draft") || "Draft")}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--admin-muted)]">
            <span className="flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              {questionCount} {t("questions") || "Questions"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {exam.settings.durationMinutes} {t("minutes") || "min"}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {exam.settings.passingPercentage}% {t("passing") || "passing"}
            </span>
          </div>
          {existingTypes.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {existingTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-0.5 rounded-[5px] text-[10px] bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] border border-[var(--admin-primary)]/20"
                >
                  {QUESTION_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
