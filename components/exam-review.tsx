"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Watermark } from "@/components/watermark";
import { useLanguage } from "@/lib/language-context";
import { ExamCelebration } from "@/components/exam-celebration";
import {
  CheckCircle,
  XCircle,
  Home,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RotateCcw,
  Filter,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  UserX,
  Trophy,
  Users,
  Award,
  Crown,
  Loader2,
} from "lucide-react";
import type { ExamAttempt, ExamAnswer, ExamQuestion } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface ExamReviewProps {
  examResult: ExamAttempt;
  questions: ExamQuestion[];
  onReset: () => void;
  onRetake: () => void;
  challengeId?: string;
  passingPercentage?: number;
}

type FilterType = "all" | "correct" | "incorrect" | "unanswered";

function formatTime(totalSeconds: number) {
  if (!totalSeconds && totalSeconds !== 0) return "00:00";
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-500";
  if (percentage >= 60) return "text-amber-500";
  return "text-red-500";
}

export function ExamReview({ examResult, questions, onReset, onRetake, challengeId, passingPercentage = 60 }: ExamReviewProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupData, setGroupData] = useState<{ challenge: any; leaderboard: any[] } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const effectiveChallengeId =
    challengeId ||
    examResult.challenge_id ||
    (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("challenge_id") || undefined : undefined);

  useEffect(() => {
    if (!effectiveChallengeId) return;
    let isMounted = true;
    const fetchGroupResults = async () => {
      setLoadingGroup(true);
      try {
        const res = await fetch(`/api/exam-challenges/${effectiveChallengeId}/results`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setGroupData(data);
        }
      } catch (err) {
        console.error("Failed to fetch group exam results:", err);
      } finally {
        if (isMounted) setLoadingGroup(false);
      }
    };
    fetchGroupResults();
    return () => {
      isMounted = false;
    };
  }, [effectiveChallengeId]);

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

  const isPassed = examResult.score_percentage >= passingPercentage;
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
          {!effectiveChallengeId && (
            <Button variant="outline" size="sm" onClick={onRetake}>
              <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">{t("retakeExam")}</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">{t("backToExams")}</span>
          </Button>
        </div>
      </div>

      {/* Pass/Fail Celebration Banner */}
      {!isAbandoned && !isCheating && (
        <ExamCelebration
          passed={isPassed}
          scorePercentage={examResult.score_percentage}
          title={isPassed ? t("congratulations") : t("examNotPassed")}
          subtitle={isPassed ? t("passedModuleExam") : t("keepTrying")}
          badges={
            <>
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
            </>
          }
        />
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

      {/* Compact Stats Grid - Single Horizontal Line on all screens */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 mb-4 sm:mb-6">
        <div className="text-center py-2 px-1 sm:py-3 sm:px-3 bg-card border rounded-lg sm:rounded-xl shadow-2xs">
          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 mx-auto mb-0.5" />
          <div className="text-sm sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{examResult.correct_answers}</div>
          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t("correct") || "Correct"}</div>
        </div>
        <div className="text-center py-2 px-1 sm:py-3 sm:px-3 bg-card border rounded-lg sm:rounded-xl shadow-2xs">
          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 mx-auto mb-0.5" />
          <div className="text-sm sm:text-xl font-bold text-rose-600 dark:text-rose-400 leading-tight">
            {examResult.total_questions - examResult.correct_answers - unansweredCount}
          </div>
          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t("incorrect") || "Incorrect"}</div>
        </div>
        <div className="text-center py-2 px-1 sm:py-3 sm:px-3 bg-card border rounded-lg sm:rounded-xl shadow-2xs">
          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 mx-auto mb-0.5" />
          <div className="text-sm sm:text-xl font-bold text-amber-500 leading-tight">{unansweredCount}</div>
          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t("examDetails.unanswered") || "Unanswered"}</div>
        </div>
        <div className="text-center py-2 px-1 sm:py-3 sm:px-3 bg-card border rounded-lg sm:rounded-xl shadow-2xs">
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary mx-auto mb-0.5" />
          <div className="text-sm sm:text-xl font-bold text-primary leading-tight">{accuracy}%</div>
          <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 truncate">{t("examDetails.accuracy") || "Accuracy"}</div>
        </div>
      </div>

      {/* Exam Details Card */}
      <Card className="border-primary/20 rounded-[14px] sm:rounded-[24px] mb-4 sm:mb-6 overflow-hidden">
        <CardHeader className="p-3 sm:p-6 bg-muted/10 border-b">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
            <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            {t("examDetails.examSummary")}
          </CardTitle>
          <CardDescription className="text-[11px] sm:text-sm">
            {t("examDetails.reviewMode")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Main Key Exam Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("examDetails.category")}</span>
              <p className="font-semibold text-foreground truncate mt-0.5">{examResult.category_name}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("completedOn")}</span>
              <p className="font-semibold text-foreground mt-0.5">
                {examResult.completed_at ? new Date(examResult.completed_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("examDetails.duration")}</span>
              <p className="font-semibold text-foreground mt-0.5">{formatTime(examResult.duration_seconds)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("examDetails.avgTimePerQuestion")}</span>
              <p className="font-semibold text-foreground mt-0.5">{formatTime(avgTimePerQuestion)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("examDetails.status")}</span>
              <p className="font-semibold text-foreground mt-0.5">
                {isAbandoned ? t("examDetails.abandoned") : t("examDetails.completed")}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("score")}</span>
              <p className={cn("font-bold mt-0.5", getScoreColor(examResult.score_percentage))}>
                {examResult.score_percentage}% ({examResult.correct_answers}/{examResult.total_questions} {t("marks") || "marks"})
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("questions")}</span>
              <p className="font-semibold text-foreground mt-0.5">{examResult.total_questions}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <span className="text-muted-foreground block text-[11px] font-medium">{t("examDetails.accuracy")}</span>
              <p className="font-semibold text-foreground mt-0.5">{accuracy}%</p>
            </div>
          </div>

          {/* All Participants Summary (Group Exam Specific) */}
          {groupData?.leaderboard && groupData.leaderboard.length > 0 && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{t("allParticipantsSummary") || "All Participants' Exam Summary"}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-semibold bg-primary/5 text-primary border-primary/20">
                        {groupData.leaderboard.length} {t("participants") || "Participants"}
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {t("allParticipantsSummaryDesc") || "Comprehensive marks, rankings, scores, and completion metrics for everyone in this group exam"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Participants Comparison Table / List */}
              <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">{t("participantName") || "Participant"}</th>
                      <th className="py-2.5 px-3 text-center">{t("marksAndRankings") || "Marks & Score"}</th>
                      <th className="py-2.5 px-3 text-center">{t("timeTaken") || "Time Taken"}</th>
                      <th className="py-2.5 px-3 text-center">{t("examDetails.status") || "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {groupData.leaderboard.map((entry, idx) => {
                      const isCurrentUser = entry.user_id === examResult.user_id;
                      const scorePct =
                        entry.score_percentage !== undefined && entry.score_percentage !== null
                          ? entry.score_percentage
                          : entry.score !== null && entry.total_questions
                          ? Math.round((entry.score / entry.total_questions) * 100)
                          : 0;
                      const passed = scorePct >= passingPercentage;
                      const isWinner = idx === 0;

                      return (
                        <tr
                          key={entry.user_id || idx}
                          className={cn(
                            "transition-colors",
                            isCurrentUser
                              ? "bg-primary/10 font-medium"
                              : isWinner
                              ? "bg-amber-500/5"
                              : "hover:bg-muted/30"
                          )}
                        >
                          {/* Rank */}
                          <td className="py-2.5 px-3 text-center font-bold">
                            {idx === 0 ? (
                              <span className="text-base" title="1st Place Winner">🥇</span>
                            ) : idx === 1 ? (
                              <span className="text-base" title="2nd Place">🥈</span>
                            ) : idx === 2 ? (
                              <span className="text-base" title="3rd Place">🥉</span>
                            ) : (
                              <span className="text-muted-foreground">#{idx + 1}</span>
                            )}
                          </td>

                          {/* Participant Name & Avatar */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 shrink-0 border">
                                {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                  {(entry.full_name || entry.username || "?")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                                    {entry.full_name || entry.username || "Participant"}
                                  </span>
                                  {isCurrentUser && (
                                    <Badge className="text-[9px] py-0 px-1 bg-primary text-primary-foreground font-bold shrink-0">
                                      {t("you") || "You"}
                                    </Badge>
                                  )}
                                  {isWinner && (
                                    <Badge className="text-[9px] py-0 px-1 bg-amber-500 text-white font-bold shrink-0 flex items-center gap-0.5">
                                      <Crown className="h-2 w-2" />
                                      <span>{t("winner") || "Winner"}</span>
                                    </Badge>
                                  )}
                                </div>
                                {entry.username && (
                                  <span className="text-[10px] text-muted-foreground block truncate">@{entry.username}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Marks & Score */}
                          <td className="py-2.5 px-3 text-center">
                            {entry.completed || entry.score !== null ? (
                              <div className="inline-flex flex-col items-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-foreground text-xs sm:text-sm">
                                    {entry.score ?? 0}/{entry.total_questions ?? examResult.total_questions} {t("marks") || "marks"}
                                  </span>
                                  {entry.total_attempts !== undefined && entry.total_attempts > 1 && entry.trend && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs",
                                        entry.trend === "up"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                          : entry.trend === "down"
                                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                          : "bg-muted text-muted-foreground border-border"
                                      )}
                                      title={
                                        entry.trend === "up"
                                          ? `+${entry.trend_diff}% ${t("aboveAverage") || "above average"} (${entry.average_score}%) ${t("across") || "across"} ${entry.total_attempts} ${t("attempts") || "attempts"}`
                                          : entry.trend === "down"
                                          ? `${entry.trend_diff}% ${t("belowAverage") || "below average"} (${entry.average_score}%) ${t("across") || "across"} ${entry.total_attempts} ${t("attempts") || "attempts"}`
                                          : `${t("matchesAverage") || "Matches average"} (${entry.average_score}%)`
                                      }
                                    >
                                      {entry.trend === "up" ? (
                                        <TrendingUp className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                      ) : entry.trend === "down" ? (
                                        <TrendingDown className="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
                                      ) : null}
                                      <span>
                                        {entry.trend === "up" ? `+${entry.trend_diff}%` : entry.trend === "down" ? `${entry.trend_diff}%` : "="}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 font-bold mt-0.5",
                                    passed
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                      : "bg-destructive/10 text-destructive border-destructive/30"
                                  )}
                                >
                                  {scorePct}% • {passed ? (t("passed") || "Passed") : (t("failed") || "Failed")}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>

                          {/* Time Taken */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-medium text-foreground text-xs flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatTime(entry.duration_seconds)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-2 py-0.5 font-medium",
                                entry.completed
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : entry.status === "in_progress"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {entry.completed ? (t("examDetails.completed") || "Completed") :
                               entry.status === "in_progress" ? (t("inProgress") || "In Progress") :
                               (t(entry.status) || entry.status)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                {(() => {
                  const hasImageOptions = options.some((opt) => !!getOptionImage(question, opt));
                  return (
                    <div className={hasImageOptions ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" : "space-y-2 sm:space-y-2.5"}>
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
                              "flex flex-col gap-2 p-2.5 sm:p-3.5 rounded-lg border text-xs sm:text-sm transition-all",
                              isCorrectOption && "border-emerald-500/60 bg-emerald-500/15 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30 shadow-xs",
                              !isCorrectOption && isUserSelection && "border-red-500/60 bg-red-500/15 dark:bg-red-950/40 shadow-xs",
                              !isCorrectOption && !isUserSelection && "border-border bg-card/60"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              {/* Option Label */}
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                    isCorrectOption
                                      ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                                      : isUserSelection
                                      ? "bg-red-600 dark:bg-red-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {opt}
                                </div>
                              </div>

                              {/* Status Icons */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isCorrectOption && (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 dark:bg-emerald-500/25 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    <span>{t("examDetails.correctOption") || t("correct") || "Correct"}</span>
                                  </span>
                                )}
                                {isUserSelection && !isCorrectOption && (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-red-700 dark:text-red-300 bg-red-500/20 dark:bg-red-500/25 px-2 py-0.5 rounded-full border border-red-500/30">
                                    <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    <span>{t("examDetails.yourSelection") || "Your Choice"}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Option Content */}
                            <div className="w-full text-left mt-0.5">
                              {optImage && (
                                <div className="mb-2 rounded overflow-hidden border">
                                  <img
                                    src={optImage}
                                    alt={`${t("examDetails.option")} ${opt}`}
                                    className="w-full max-h-40 object-contain bg-muted/20"
                                  />
                                </div>
                              )}
                              {optText && (
                                <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed text-left">
                                  {optText}
                                </p>
                              )}
                            </div>

                            {/* Floating Usernames & Profile Pictures for Group Exam */}
                            {(() => {
                              const choosers = (groupData?.leaderboard || []).filter((p) => {
                                if (!p.answers) return false;
                                const ans = (p.answers as any[]).find((a) => a.question_id === question.id);
                                return ans?.selected_answer === opt;
                              });

                              if (choosers.length === 0) return null;

                              return (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
                                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mr-1">
                                    <Users className="h-3 w-3" />
                                    <span>{choosers.length} {choosers.length === 1 ? (t("chosenBy") || "chose this") : (t("chosenByPlural") || "chose this")}:</span>
                                  </span>

                                  {choosers.map((c) => {
                                    const isCurrentUserChooser = c.user_id === examResult.user_id;
                                    const firstName =
                                      c.first_name ||
                                      (c.full_name ? c.full_name.trim().split(/\s+/)[0] : c.username || "User");
                                    return (
                                      <div
                                        key={c.user_id}
                                        className={cn(
                                          "inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-all",
                                          isCorrectOption
                                            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
                                            : "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
                                          isCurrentUserChooser && "ring-2 ring-primary ring-offset-1 font-bold"
                                        )}
                                      >
                                        <Avatar className="h-4 w-4 shrink-0">
                                          {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                                          <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                                            {(firstName || "?")[0]?.toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate max-w-[120px]">
                                          {firstName}
                                        </span>
                                        {isCurrentUserChooser && (
                                          <span className="text-[10px] opacity-85 font-bold">({t("you") || "You"})</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

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
        {!effectiveChallengeId && (
          <Button onClick={onRetake} className="flex-1 gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("retakeExam")}
          </Button>
        )}
        <Button variant={effectiveChallengeId ? "default" : "outline"} onClick={onReset} className="flex-1 gap-2">
          <Home className="h-4 w-4" />
          {t("backToExams")}
        </Button>
      </div>
    </main>
  );
}
