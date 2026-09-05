"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Loader2,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  UserX,
  Users,
  User,
  Layers
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ExamReview } from "@/components/exam-review";
import { ExamHistorySkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExamAttempt, ExamQuestion, ExamAnswer } from "@/lib/database.types";

export interface ExamHistoryViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface ExamAttemptWithAnswers extends ExamAttempt {
  answers: ExamAnswer[];
  challenge_id?: string | null;
}

type HistoryTab = "all" | "individual" | "group";

export function ExamHistoryView({ navigate }: ExamHistoryViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>([]);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithAnswers | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchData = async () => {
      try {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false });

        if (attemptsError) throw attemptsError;

        // Fetch challenge participation to determine which attempts are group exams
        const { data: participantsData } = await supabase
          .from("exam_challenge_participants")
          .select("challenge_id, exam_attempt_id")
          .eq("user_id", user.id)
          .not("exam_attempt_id", "is", null);

        const groupAttemptIdMap = new Map<string, string>();
        (participantsData || []).forEach((p) => {
          if (p.exam_attempt_id) {
            groupAttemptIdMap.set(p.exam_attempt_id, p.challenge_id);
          }
        });

        const mappedAttempts: ExamAttemptWithAnswers[] = (attemptsData || []).map((att) => ({
          ...(att as ExamAttemptWithAnswers),
          challenge_id: groupAttemptIdMap.get(att.id) || null,
        }));

        setAttempts(mappedAttempts);
      } catch (err) {
        console.error("Failed to fetch exam history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleReview = async (attempt: ExamAttemptWithAnswers) => {
    if (attempt.challenge_id) {
      navigate("classmates/group-results", { id: attempt.challenge_id });
      return;
    }

    setSelectedAttempt(attempt);
    setQuestions([]);

    if (!user) return;
    const supabase = createClient();

    try {
      const questionIds = (attempt.answers || []).map((a) => a.question_id).filter(Boolean);
      if (questionIds.length === 0) return;

      const { data: questionData } = await supabase
        .from("exam_questions")
        .select("*")
        .in("id", questionIds);

      if (questionData) {
        // Keep question order matching the attempt answers
        const ordered = (questionData as ExamQuestion[]).slice().sort((a, b) => {
          const idxA = (attempt.answers || []).findIndex((ans) => ans.question_id === a.id);
          const idxB = (attempt.answers || []).findIndex((ans) => ans.question_id === b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return 0;
        });
        setQuestions(ordered);
      }
    } catch (err) {
      console.error("Failed to fetch questions for review:", err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds == null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const individualAttempts = attempts.filter((a) => !a.challenge_id);
  const groupAttempts = attempts.filter((a) => !!a.challenge_id);

  const displayedAttempts =
    activeTab === "individual"
      ? individualAttempts
      : activeTab === "group"
      ? groupAttempts
      : attempts;

  if (loading) {
    return <ExamHistorySkeleton />;
  }

  if (selectedAttempt) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("examHistory") || "Back to Exam History"}
            </button>
          </div>

          <ExamReview
            examResult={selectedAttempt}
            questions={questions}
            onReset={() => setSelectedAttempt(null)}
            onRetake={() => {
              setSelectedAttempt(null);
              navigate("exam");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate("back", { fallback: "home" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("backToHome") || "Back"}
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("examHistory") || "Exam History"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("examHistoryDesc") || "Review your past individual and group exam scores and performance."}
          </p>
        </div>

        {/* History Tabs (All, Individual, Group) */}
        <div className="flex p-1 bg-muted/60 rounded-xl mb-6 border gap-1">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all",
              activeTab === "all"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>{t("all") || "All"}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {attempts.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("individual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all",
              activeTab === "individual"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>{t("individual") || "Individual"}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {individualAttempts.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("group")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all",
              activeTab === "group"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span>{t("groupExam") || "Group"}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
              {groupAttempts.length}
            </Badge>
          </button>
        </div>

        {displayedAttempts.length === 0 ? (
          <div className="py-12 text-center border border-dashed rounded-2xl p-6 bg-muted/10">
            {activeTab === "group" ? (
              <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            ) : (
              <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === "group"
                ? (t("noGroupExamHistory") || "No group exams completed yet")
                : activeTab === "individual"
                ? (t("noIndividualExamHistory") || "No individual exams completed yet")
                : (t("noExamHistory") || "No exam attempts found")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeTab === "group"
                ? (t("noGroupExamHint") || "Challenge your classmates and friends to a group exam to see results here.")
                : (t("noExamHistoryHint") || "Take an exam from the exams page to start recording your progress.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAttempts.map((attempt) => {
              const isPassed = attempt.score_percentage >= 50;
              const answeredCount = (attempt.answers || []).filter((a) => a.selected_answer !== null).length;
              const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
              const isCheating = attempt.submission_reason === "cheating_violation";
              const isAutoSubmitted =
                attempt.submission_reason === "page_closed" ||
                attempt.submission_reason === "time_expired" ||
                isCheating;
              const isGroup = !!attempt.challenge_id;

              return (
                <button
                  key={attempt.id}
                  onClick={() => handleReview(attempt)}
                  className={`group w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                    isCheating
                      ? "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 hover:border-orange-400"
                      : isAbandoned
                      ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 hover:border-amber-300"
                      : isGroup
                      ? "border-primary/30 bg-primary/5 hover:border-primary"
                      : "border-border bg-card hover:border-primary"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isCheating
                        ? "bg-orange-500/10 text-orange-600"
                        : isAbandoned
                        ? "bg-amber-500/10 text-amber-600"
                        : isPassed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {isCheating ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : isAbandoned ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : isPassed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {attempt.category_name}
                      </p>
                      {isGroup && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0 border border-primary/20"
                        >
                          <Users className="h-2.5 w-2.5 mr-1" />
                          {t("groupExam") || "Group"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(attempt.completed_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(attempt.duration_seconds)}
                      </span>
                    </div>

                    {isAbandoned && !isCheating && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {t("noQuestionsAnswered") || "No questions answered"}
                      </p>
                    )}
                    {isCheating && (
                      <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium line-clamp-2">
                        {t("examSubmittedDueToCheating") || "Submitted due to security violation"}
                        {attempt.violation_summary && `: ${attempt.violation_summary}`}
                      </p>
                    )}
                    {isAutoSubmitted && !isCheating && !isAbandoned && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        {attempt.submission_reason === "page_closed"
                          ? (t("autoSubmittedPageClosed") || "Auto-submitted (page closed)")
                          : (t("autoSubmittedTimeExpired") || "Auto-submitted (time expired)")}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        isAbandoned
                          ? "text-amber-600"
                          : isCheating
                          ? "text-orange-600"
                          : isPassed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600"
                      }`}
                    >
                      {isAbandoned ? "—" : `${attempt.score_percentage}%`}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {answeredCount}/{attempt.total_questions}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
