"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { useLanguage } from "@/lib/language-context";
import {
  CheckCircle,
  XCircle,
  Trophy,
  Home,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Filter,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  UserX,
} from "lucide-react";
import type { ExamAttempt, ExamAnswer, ExamQuestion } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface ExamReviewProps {
  examResult: ExamAttempt;
  questions: ExamQuestion[];
  onReset: () => void;
  onRetake: () => void;
}

type FilterType = "all" | "correct" | "incorrect" | "unanswered";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-500";
  if (percentage >= 50) return "text-orange-500";
  return "text-red-500";
}

function getScoreBg(percentage: number): string {
  if (percentage >= 80) return "from-green-500 to-emerald-500";
  if (percentage >= 50) return "from-orange-500 to-amber-500";
  return "from-red-500 to-rose-500";
}

function CircularScore({ percentage }: { percentage: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="text-muted/30"
          stroke="currentColor"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", getScoreColor(percentage))}
          style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={cn("text-2xl sm:text-3xl font-bold", getScoreColor(percentage))}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export function ExamReview({ examResult, questions, onReset, onRetake }: ExamReviewProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");

  const unansweredCount = examResult.answers.filter(
    (a: ExamAnswer) => !a.selected_answer
  ).length;
  const answeredCount = examResult.total_questions - unansweredCount;
  const accuracy =
    answeredCount > 0
      ? Math.round((examResult.correct_answers / answeredCount) * 100)
      : 0;
  const avgTimePerQuestion =
    examResult.total_questions > 0
      ? Math.round(examResult.duration_seconds / examResult.total_questions)
      : 0;

  const isPassed = examResult.score_percentage >= 50;
  const isAbandoned = examResult.status === "abandoned";
  const isCheating = examResult.submission_reason === "cheating_violation";
  const isAutoSubmitted = examResult.submission_reason === "page_closed" || examResult.submission_reason === "time_expired";
  const hasNoAnswers = answeredCount === 0;

  const filteredAnswers = useMemo(() => {
    return examResult.answers
      .map((answer: ExamAnswer, idx: number) => ({ answer, idx }))
      .filter(({ answer }: { answer: ExamAnswer; idx: number }) => {
        switch (filter) {
          case "correct":
            return answer.is_correct;
          case "incorrect":
            return !answer.is_correct && answer.selected_answer;
          case "unanswered":
            return !answer.selected_answer;
          default:
            return true;
        }
      });
  }, [examResult.answers, filter]);

  const filterTabs: { key: FilterType; labelKey: string; count: number }[] = [
    { key: "all", labelKey: "examDetails.allQuestions", count: examResult.total_questions },
    { key: "correct", labelKey: "examDetails.correctOnly", count: examResult.correct_answers },
    {
      key: "incorrect",
      labelKey: "examDetails.incorrectOnly",
      count: examResult.total_questions - examResult.correct_answers - unansweredCount,
    },
    { key: "unanswered", labelKey: "examDetails.unansweredOnly", count: unansweredCount },
  ];

  const getOptionText = (question: ExamQuestion | undefined, option: "A" | "B" | "C" | "D") => {
    if (!question) return "";
    switch (option) {
      case "A": return question.option_a || "";
      case "B": return question.option_b || "";
      case "C": return question.option_c || "";
      case "D": return question.option_d || "";
    }
  };

  const getOptionImage = (question: ExamQuestion | undefined, option: "A" | "B" | "C" | "D") => {
    if (!question) return undefined;
    switch (option) {
      case "A": return question.option_a_image;
      case "B": return question.option_b_image;
      case "C": return question.option_c_image;
      case "D": return question.option_d_image;
    }
  };

  const options: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  return (
    <main className="student-page student-page-no-nav relative !mx-auto max-w-5xl">
      <Watermark />

      {/* Header with Pass/Fail Banner */}
      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-bold brand-protected">{t("examResults")}</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{t("yourPerformanceSummary")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onRetake}>
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">{t("retakeExam")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">{t("backToExams")}</span>
          </Button>
        </div>
      </div>

      {/* Pass/Fail Banner */}
      {!isAbandoned && !isCheating && (
        <div
          className={cn(
            "mb-4 sm:mb-6 rounded-[14px] sm:rounded-[24px] p-4 sm:p-6 border-2 flex items-center gap-4 sm:gap-6",
            isPassed
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          )}
        >
          <CircularScore percentage={examResult.score_percentage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isPassed ? (
                <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7 text-red-500" />
              )}
              <h2 className={cn("text-lg sm:text-2xl font-bold", isPassed ? "text-green-600" : "text-red-600")}>
                {isPassed ? t("congratulations") : t("examNotPassed")}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isPassed
                ? t("passedModuleExam")
                : t("failedModuleExam")}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                {examResult.category_name}
              </Badge>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                {formatTime(examResult.duration_seconds)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {t("examDetails.questionsCount").replace("{count}", String(examResult.total_questions))}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* No Questions Answered Banner */}
      {hasNoAnswers && !isCheating && (
        <div className="mb-4 sm:mb-6 rounded-[14px] sm:rounded-[24px] p-4 sm:p-6 border-2 border-amber-500/30 bg-amber-500/5 flex items-center gap-4 sm:gap-6">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <UserX className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400">
              {t("noQuestionsAnsweredTitle")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("noQuestionsAnsweredExplanation")}
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                {examResult.category_name}
              </Badge>
              {isAutoSubmitted && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs text-muted-foreground italic">
                  {examResult.submission_reason === "page_closed" ? t("autoSubmittedPageClosed") : t("autoSubmittedTimeExpired")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cheating Violation Banner */}
      {isCheating && (
        <div className="mb-4 sm:mb-6 rounded-[14px] sm:rounded-[24px] p-4 sm:p-6 border-2 border-orange-500/30 bg-orange-500/5 flex items-center gap-4 sm:gap-6">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
            <ShieldAlert className="h-6 w-6 sm:h-7 sm:w-7 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-bold text-orange-600 dark:text-orange-400">
              {t("examSubmittedDueToCheating")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("cheatingViolationExplanation")}
            </p>
            {examResult.violation_summary && (
              <p className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 mt-1.5 font-medium line-clamp-3">
                {examResult.violation_summary}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                {examResult.category_name}
              </Badge>
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                {formatTime(examResult.duration_seconds)}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-center p-3 sm:p-4 bg-card border rounded-[10px] sm:rounded-lg">
          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mx-auto mb-1" />
          <div className="text-xl sm:text-2xl font-bold text-green-600 leading-tight">{examResult.correct_answers}</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{t("correct")}</div>
        </div>
        <div className="text-center p-3 sm:p-4 bg-card border rounded-[10px] sm:rounded-lg">
          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mx-auto mb-1" />
          <div className="text-xl sm:text-2xl font-bold text-red-600 leading-tight">
            {examResult.total_questions - examResult.correct_answers - unansweredCount}
          </div>
          <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{t("incorrect")}</div>
        </div>
        <div className="text-center p-3 sm:p-4 bg-card border rounded-[10px] sm:rounded-lg">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mx-auto mb-1" />
          <div className="text-xl sm:text-2xl font-bold text-orange-500 leading-tight">{unansweredCount}</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{t("examDetails.unanswered")}</div>
        </div>
        <div className="text-center p-3 sm:p-4 bg-card border rounded-[10px] sm:rounded-lg">
          <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto mb-1" />
          <div className="text-xl sm:text-2xl font-bold text-primary leading-tight">{accuracy}%</div>
          <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{t("examDetails.accuracy")}</div>
        </div>
      </div>

      {/* Exam Details Card */}
      <Card className="border-primary/20 rounded-[14px] sm:rounded-[24px] mb-4 sm:mb-6">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            {t("examDetails.examSummary")}
          </CardTitle>
          <CardDescription className="text-[11px] sm:text-sm">
            {t("examDetails.reviewMode")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-muted-foreground">{t("examDetails.category")}</span>
              <p className="font-medium truncate">{examResult.category_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("completedOn")}</span>
              <p className="font-medium">
                {examResult.completed_at ? new Date(examResult.completed_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("examDetails.duration")}</span>
              <p className="font-medium">{formatTime(examResult.duration_seconds)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("examDetails.avgTimePerQuestion")}</span>
              <p className="font-medium">{formatTime(avgTimePerQuestion)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("examDetails.status")}</span>
              <p className="font-medium">
                {isAbandoned ? t("examDetails.abandoned") : t("examDetails.completed")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("score")}</span>
              <p className={cn("font-bold", getScoreColor(examResult.score_percentage))}>
                {examResult.score_percentage}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("questions")}</span>
              <p className="font-medium">{examResult.total_questions}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("examDetails.accuracy")}</span>
              <p className="font-medium">{accuracy}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all shrink-0 flex items-center gap-1.5",
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {t(tab.labelKey)}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px]",
                filter === tab.key ? "bg-primary-foreground/20" : "bg-background/50"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Question Review */}
      <div className="space-y-2 sm:space-y-3">
        <h3 className="font-semibold text-sm sm:text-base">{t("answerBreakdown")}</h3>
        {filteredAnswers.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-[14px] sm:rounded-[24px]">
            {t("examDetails.noQuestionsInFilter")}
          </div>
        ) : (
          filteredAnswers.map(({ answer, idx }: { answer: ExamAnswer; idx: number }) => {
            const question = questions.find((q) => q.id === answer.question_id);
            if (!question) return null;

            return (
              <div
                key={answer.question_id}
                className={cn(
                  "p-2.5 sm:p-4 border rounded-[10px] sm:rounded-lg transition-all",
                  answer.is_correct
                    ? "border-green-500/20 bg-green-500/5"
                    : answer.selected_answer
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-orange-500/20 bg-orange-500/5"
                )}
              >
                {/* Question Header */}
                <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
                  <Badge
                    variant={answer.is_correct ? "default" : "destructive"}
                    className="text-[10px] sm:text-xs"
                  >
                    {answer.is_correct ? (
                      <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    ) : (
                      <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                    )}
                    {answer.is_correct
                      ? t("correct")
                      : !answer.selected_answer
                      ? t("examDetails.notAnswered")
                      : t("incorrect")}
                  </Badge>
                  <span className="text-[11px] sm:text-sm text-muted-foreground">
                    {t("question")} {idx + 1}
                  </span>
                  {answer.time_spent_seconds != null && answer.time_spent_seconds > 0 && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(answer.time_spent_seconds)}
                    </span>
                  )}
                </div>

                {/* Question Text */}
                {question.question && (
                  <p className="text-xs sm:text-sm mb-2 sm:mb-3 font-medium">{question.question}</p>
                )}

                {/* Question Image */}
                {question.question_image && (
                  <div className="mb-2 sm:mb-3 rounded-lg overflow-hidden border">
                    <img
                      src={question.question_image}
                      alt={t("examDetails.questionImage")}
                      className="w-full max-h-64 object-contain bg-muted/20"
                    />
                  </div>
                )}

                {/* Options A/B/C/D */}
                <div className="space-y-1.5 sm:space-y-2">
                  {options.map((opt) => {
                    const optText = getOptionText(question, opt);
                    const optImage = getOptionImage(question, opt);
                    const isCorrectOption = question.correct_answer === opt;
                    const isUserSelection = answer.selected_answer === opt;

                    if (!optText && !optImage) return null;

                    return (
                      <div
                        key={opt}
                        className={cn(
                          "flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-md border text-xs sm:text-sm transition-all",
                          isCorrectOption && "border-green-500/40 bg-green-500/10",
                          !isCorrectOption && isUserSelection && "border-red-500/40 bg-red-500/10",
                          !isCorrectOption && !isUserSelection && "border-muted bg-muted/20"
                        )}
                      >
                        {/* Option Label */}
                        <div
                          className={cn(
                            "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold",
                            isCorrectOption
                              ? "bg-green-500 text-white"
                              : isUserSelection
                              ? "bg-red-500 text-white"
                              : "bg-muted-foreground/20 text-muted-foreground"
                          )}
                        >
                          {opt}
                        </div>

                        {/* Option Content */}
                        <div className="flex-1 min-w-0">
                          {optText && <p className="break-words">{optText}</p>}
                          {optImage && (
                            <div className="mt-1 rounded overflow-hidden border">
                              <img
                                src={optImage}
                                alt={`${t("examDetails.option")} ${opt}`}
                                className="w-full max-h-32 object-contain bg-muted/20"
                              />
                            </div>
                          )}
                        </div>

                        {/* Status Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isCorrectOption && (
                            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">{t("examDetails.correctOption")}</span>
                            </span>
                          )}
                          {isUserSelection && !isCorrectOption && (
                            <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-red-600">
                              <XCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">{t("examDetails.yourSelection")}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-2.5 bg-secondary rounded-md text-xs sm:text-sm">
                    <span className="font-medium">{t("explanationColon")} </span>
                    {question.explanation}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button onClick={onRetake} className="flex-1 gap-2">
          <RotateCcw className="h-4 w-4" />
          {t("retakeExam")}
        </Button>
        <Button variant="outline" onClick={onReset} className="flex-1 gap-2">
          <Home className="h-4 w-4" />
          {t("backToExams")}
        </Button>
      </div>
    </main>
  );
}
