"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import {
  ModuleExam,
  ModuleExamQuestionUI,
  extractTextFromTiptapJSON,
} from "@/lib/courses-store";
import { shuffle } from "@/lib/exam-settings";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";
import { MatchingInteraction } from "./matching-interaction";
import {
  CheckCircle2,
  Circle,
  ArrowLeftRight,
  Clock,
  Award,
  ListChecks,
  ToggleLeft,
  CheckCheck,
  RotateCcw,
  Info,
  Check,
  X,
} from "lucide-react";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  matching: "Matching",
};

const QUESTION_TYPE_ICONS: Record<string, typeof CheckCircle2> = {
  multiple_choice: CheckCircle2,
  multiple_select: ListChecks,
  true_false: ToggleLeft,
  matching: ArrowLeftRight,
};

type AnswerState = Record<string, any>;

export function ExamPreview({ exam }: { exam: ModuleExam }) {
  const { t } = useLanguage();
  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  const displayQuestions = useMemo(() => {
    if (exam.settings.randomizeQuestionOrder) {
      return shuffle(exam.questions);
    }
    return exam.questions;
  }, [exam.questions, exam.settings.randomizeQuestionOrder]);

  const answeredCount = Object.keys(answers).filter((qid) => {
    const a = answers[qid];
    if (a === undefined || a === null) return false;
    if (typeof a === "string") return a.trim().length > 0;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === "object") return Object.keys(a).length > 0;
    return false;
  }).length;

  const correctCount = displayQuestions.filter((q) => {
    if (!checkedQuestions[q.id]) return false;
    return isAnswerCorrect(q, answers[q.id]);
  }).length;

  const handleReset = () => {
    setAnswers({});
    setCheckedQuestions({});
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* No-save banner */}
      <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>{t("previewNoSave") || "Preview mode — answers are not saved."}</span>
      </div>

      {/* Exam header card */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-6 space-y-3">
        <div className="flex items-center gap-2 text-[var(--admin-muted)]">
          <CheckCheck className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">{t("exam") || "Exam"}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--admin-text)]">{exam.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--admin-muted)]">
          <span className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            {displayQuestions.length} {t("questions") || "questions"}
          </span>
          <span className="flex items-center gap-1.5">
            <Award className="h-4 w-4" />
            {totalPoints} {t("points") || "points"}
          </span>
          {exam.settings.durationMinutes > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {exam.settings.durationMinutes} {t("minutes") || "min"}
            </span>
          )}
          {exam.settings.maxAttempts && (
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              {exam.settings.maxAttempts} {t("attempts") || "attempts"}
            </span>
          )}
        </div>
        {/* Score summary */}
        {displayQuestions.length > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t border-[var(--admin-border)]">
            <span className="text-sm text-[var(--admin-muted)]">
              {t("answered") || "Answered"}: <span className="font-semibold text-[var(--admin-text)]">{answeredCount}/{displayQuestions.length}</span>
            </span>
            {Object.keys(checkedQuestions).length > 0 && (
              <span className="text-sm text-[var(--admin-muted)]">
                {t("correct") || "Correct"}: <span className="font-semibold text-green-500">{correctCount}/{displayQuestions.length}</span>
              </span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="ml-auto h-7 text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("reset") || "Reset"}
            </Button>
          </div>
        )}
      </div>

      {/* Questions */}
      {displayQuestions.length === 0 ? (
        <div className="text-center py-16 text-[var(--admin-muted)] text-sm">
          {t("noQuestionsYet") || "No questions yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {displayQuestions.map((q, i) => (
            <StudentQuestionCard
              key={q.id}
              q={q}
              number={i + 1}
              answer={answers[q.id]}
              isChecked={!!checkedQuestions[q.id]}
              randomizeAnswers={exam.settings.randomizeAnswerChoices}
              onAnswer={(a) => setAnswers((prev) => ({ ...prev, [q.id]: a }))}
              onCheck={() => setCheckedQuestions((prev) => ({ ...prev, [q.id]: true }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isAnswerCorrect(q: ModuleExamQuestionUI, answer: any): boolean {
  if (answer === undefined || answer === null) return false;
  if (q.type === "multiple_choice" || q.type === "true_false") {
    return answer === q.correctOptionId;
  }
  if (q.type === "multiple_select") {
    const selected = answer as string[];
    return selected.length === q.correctOptionIds.length &&
      selected.every((id) => q.correctOptionIds.includes(id));
  }
  if (q.type === "matching") {
    const pairs = answer as Record<string, string>;
    return q.matchingPairs.every((p) => pairs[p.id] === `right-${p.id}`);
  }
  return false;
}

function StudentQuestionCard({
  q,
  number,
  answer,
  isChecked,
  randomizeAnswers,
  onAnswer,
  onCheck,
}: {
  q: ModuleExamQuestionUI;
  number: number;
  answer: any;
  isChecked: boolean;
  randomizeAnswers: boolean;
  onAnswer: (a: any) => void;
  onCheck: () => void;
}) {
  const { t } = useLanguage();
  const Icon = QUESTION_TYPE_ICONS[q.type] || Circle;
  const questionText = extractTextFromTiptapJSON(q.text);
  const correct = isChecked && isAnswerCorrect(q, answer);

  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 space-y-4">
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-sm font-semibold flex-shrink-0">
          {number}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
            <Icon className="h-3.5 w-3.5" />
            {QUESTION_TYPE_LABELS[q.type] || q.type}
            <span>·</span>
            <span>{q.points || 1} {t("points") || "pts"}</span>
            {isChecked && (
              <span className={cn("flex items-center gap-1 ml-2", correct ? "text-green-500" : "text-red-500")}>
                {correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {correct ? (t("correct") || "Correct") : (t("incorrect") || "Incorrect")}
              </span>
            )}
          </div>
          <div className="text-[var(--admin-text)] prose prose-sm max-w-none">
            {questionText ? (
              <LessonContentView content={q.text} />
            ) : (
              <span className="text-[var(--admin-muted)] italic">{t("enterQuestion") || "Enter the question..."}</span>
            )}
            {q.audio && (
              <audio
                controls
                src={q.audio}
                className="w-full h-10 rounded-lg mt-2"
              />
            )}
          </div>
        </div>
      </div>

      {/* Answer area */}
      <StudentAnswerArea q={q} answer={answer} isChecked={isChecked} randomizeAnswers={randomizeAnswers} onAnswer={onAnswer} />

      {/* Check button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCheck}
          disabled={answer === undefined || answer === null || (typeof answer === "string" && !answer.trim()) || (Array.isArray(answer) && answer.length === 0) || (typeof answer === "object" && !Array.isArray(answer) && Object.keys(answer).length === 0)}
          className="h-8 text-xs gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("checkAnswer") || "Check Answer"}
        </Button>
      </div>
    </div>
  );
}

function StudentAnswerArea({
  q,
  answer,
  isChecked,
  randomizeAnswers,
  onAnswer,
}: {
  q: ModuleExamQuestionUI;
  answer: any;
  isChecked: boolean;
  randomizeAnswers: boolean;
  onAnswer: (a: any) => void;
}) {
  const { t } = useLanguage();

  const displayOptions = useMemo(() => {
    if (randomizeAnswers && q.options && (q.type === "multiple_choice" || q.type === "multiple_select" || q.type === "true_false")) {
      return shuffle(q.options);
    }
    return q.options || [];
  }, [q.options, q.type, randomizeAnswers]);

  if (q.type === "multiple_choice" || q.type === "true_false") {
    const selected = answer as string | undefined;
    return (
      <div className="space-y-2 pl-10">
        {displayOptions.map((option) => {
          const isSelected = selected === option.id;
          const isCorrect = isChecked && option.id === q.correctOptionId;
          const isWrong = isChecked && isSelected && option.id !== q.correctOptionId;
          return (
            <div
              key={option.id}
              onClick={() => onAnswer(option.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-500/10"
                  : isWrong
                  ? "border-red-500 bg-red-500/10"
                  : isSelected
                  ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/5"
                  : "border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)]/30"
              )}
            >
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0",
                isSelected
                  ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]"
                  : "border-[var(--admin-border)]"
              )}>
                {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className="text-sm text-[var(--admin-text)]">{option.text || option.id}</span>
              {option.image && (
                <Image src={option.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "multiple_select") {
    const selected = (answer as string[]) || [];
    const toggle = (id: string) => {
      if (selected.includes(id)) {
        onAnswer(selected.filter((s) => s !== id));
      } else {
        onAnswer([...selected, id]);
      }
    };
    return (
      <div className="space-y-2 pl-10">
        {displayOptions.map((option) => {
          const isSelected = selected.includes(option.id);
          const isCorrect = isChecked && q.correctOptionIds.includes(option.id);
          const isWrong = isChecked && isSelected && !q.correctOptionIds.includes(option.id);
          return (
            <div
              key={option.id}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                isCorrect
                  ? "border-green-500 bg-green-500/10"
                  : isWrong
                  ? "border-red-500 bg-red-500/10"
                  : isSelected
                  ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/5"
                  : "border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)]/30"
              )}
            >
              <Checkbox checked={isSelected} className="border-[var(--admin-border)]" />
              <span className="text-sm text-[var(--admin-text)]">{option.text || option.id}</span>
              {option.image && (
                <Image src={option.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded object-cover" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "matching") {
    return (
      <div className="pl-10">
        <MatchingInteraction
          pairs={q.matchingPairs}
          checked={isChecked}
          onPairsChange={(pairs) => onAnswer(pairs)}
        />
      </div>
    );
  }

  return null;
}
