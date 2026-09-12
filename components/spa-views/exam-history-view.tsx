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

type HistoryTab = "all" | "ongoing" | "individual" | "group";

export function ExamHistoryView({ navigate }: ExamHistoryViewProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>([]);
  const [ongoingChallenges, setOngoingChallenges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithAnswers | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchData = async () => {
      try {
        // 1. Fetch standard mock/solo/group exam attempts
        const examPromise = supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // 2. Fetch module / curriculum exam attempts
        const modulePromise = supabase
          .from("module_exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // 3. Fetch challenge participation to determine which attempts are group exams
        const challengePromise = supabase
          .from("exam_challenge_participants")
          .select("challenge_id, exam_attempt_id")
          .eq("user_id", user.id)
          .not("exam_attempt_id", "is", null);

        // 4. Fetch ongoing challenges
        const ongoingPromise = fetch("/api/exam-challenges")
          .then((r) => r.json())
          .catch(() => ({ challenges: [] }));

        const [examRes, moduleRes, challengeRes, ongoingRes] = await Promise.allSettled([
          examPromise,
          modulePromise,
          challengePromise,
          ongoingPromise,
        ]);

        const groupAttemptIdMap = new Map<string, string>();
        if (challengeRes.status === "fulfilled" && challengeRes.value.data) {
          challengeRes.value.data.forEach((p: any) => {
            if (p.exam_attempt_id) {
              groupAttemptIdMap.set(p.exam_attempt_id, p.challenge_id);
            }
          });
        }

        if (ongoingRes.status === "fulfilled") {
          const list = (ongoingRes.value as any)?.challenges || [];
          const activeList = list.filter((c: any) => {
            const p = c.participants?.find((x: any) => x.user_id === user.id);
            const hasCompleted = p?.status === "completed" || Boolean(p?.exam_attempt_id) || c.status === "completed";
            if (hasCompleted) return false;
            const isParticipantOrCreator = p?.status === "joined" || p?.status === "ready" || p?.status === "pending" || p?.status === "in_progress" || c.creator_id === user.id;
            return isParticipantOrCreator && (c.status === "active" || c.status === "pending");
          });
          setOngoingChallenges(activeList);
        }

        const standardAttempts: ExamAttemptWithAnswers[] =
          examRes.status === "fulfilled" && examRes.value.data
            ? examRes.value.data
                .filter((att: any) => att.hidden_from_user !== true)
                .map((att: any) => {
                  let correct = att.correct_answers;
                  let scorePct = att.score_percentage;
                  const total = att.total_questions || 20;

                  if ((correct === null || correct === undefined || correct === 0) && Array.isArray(att.answers) && att.answers.length > 0) {
                    const count = att.answers.filter((a: any) => a.is_correct).length;
                    if (count > 0) {
                      correct = count;
                    }
                  }

                  if (scorePct === null || scorePct === undefined) {
                    scorePct = correct !== null && correct !== undefined ? Math.round((correct / total) * 100) : 0;
                  } else if ((correct === null || correct === undefined || correct === 0) && scorePct > 0) {
                    correct = Math.round((scorePct / 100) * total);
                  }

                  return {
                    ...(att as ExamAttemptWithAnswers),
                    correct_answers: correct ?? 0,
                    score_percentage: scorePct ?? 0,
                    challenge_id: groupAttemptIdMap.get(att.id) || null,
                  };
                })
            : [];

        const moduleAttempts: ExamAttemptWithAnswers[] =
          moduleRes.status === "fulfilled" && moduleRes.value.data
            ? moduleRes.value.data.map((att: any) => {
                let correct = att.correct_answers;
                let scorePct = att.score_percentage;
                const total = att.total_questions || 20;

                if ((correct === null || correct === undefined || correct === 0) && Array.isArray(att.answers) && att.answers.length > 0) {
                  const count = att.answers.filter((a: any) => a.is_correct).length;
                  if (count > 0) {
                    correct = count;
                  }
                }

                if (scorePct === null || scorePct === undefined) {
                  scorePct = correct !== null && correct !== undefined ? Math.round((correct / total) * 100) : 0;
                } else if ((correct === null || correct === undefined || correct === 0) && scorePct > 0) {
                  correct = Math.round((scorePct / 100) * total);
                }

                const examTypeLabel =
                  att.exam_type === "final"
                    ? (t("finalExam") || "Final Exam")
                    : att.exam_type === "midterm"
                    ? (t("midtermExam") || "Midterm Exam")
                    : att.module_title
                    ? `${att.module_title} (${t("moduleExam") || "Module Exam"})`
                    : (t("moduleExam") || "Module Exam");

                return {
                  id: att.id,
                  user_id: att.user_id,
                  category_id: att.module_id || "module",
                  category_name: examTypeLabel,
                  started_at: att.started_at,
                  completed_at: att.completed_at || att.created_at || att.started_at,
                  duration_seconds: att.duration_seconds || 0,
                  total_questions: total,
                  correct_answers: correct ?? 0,
                  score_percentage: scorePct ?? 0,
                  status: att.status || "completed",
                  created_at: att.created_at,
                  answers: att.answers || [],
                  challenge_id: null,
                } as ExamAttemptWithAnswers;
              })
            : [];

        const combined = [...standardAttempts, ...moduleAttempts].sort((a, b) => {
          const dateA = new Date(a.created_at || a.started_at || 0).getTime();
          const dateB = new Date(b.created_at || b.started_at || 0).getTime();
          return dateB - dateA;
        });

        setAttempts(combined);
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

        {/* History Tabs (All, Ongoing, Individual, Group) */}
        <div className="flex p-1 bg-muted/60 rounded-xl mb-6 border gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
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

          {ongoingChallenges.length > 0 && (
            <button
              onClick={() => setActiveTab("ongoing")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                activeTab === "ongoing"
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-amber-600 dark:text-amber-400 hover:text-foreground hover:bg-amber-500/10"
              )}
            >
              <Clock className="h-4 w-4 shrink-0 animate-pulse text-amber-600" />
              <span>{t("ongoingExams") || "Ongoing"}</span>
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-amber-600 hover:bg-amber-600 text-white font-bold">
                {ongoingChallenges.length}
              </Badge>
            </button>
          )}

          <button
            onClick={() => setActiveTab("individual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
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
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
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

        {/* Ongoing Active Challenges in Ongoing Tab */}
        {activeTab === "ongoing" && (
          <div className="space-y-3">
            {ongoingChallenges.length === 0 ? (
              <div className="py-12 text-center border border-dashed rounded-2xl p-6 bg-muted/10">
                <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t("noOngoingExams") || "No ongoing exams right now"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("noOngoingExamsHint") || "When you start or get invited to a group exam, it will appear here."}
                </p>
              </div>
            ) : (
              ongoingChallenges.map((challenge) => {
                const isCreator = challenge.creator_id === user?.id;
                const userPart = challenge.participants?.find((p: any) => p.user_id === user?.id);
                return (
                  <div
                    key={challenge.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {challenge.category_name || "Exam Challenge"}
                        </h3>
                        <Badge variant="default" className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                          {challenge.status === "active" ? (t("inProgress") || "In Progress") : (t("pending") || "Pending")}
                        </Badge>
                        {isCreator && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t("creator") || "Creator"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>
                          {isCreator
                            ? (t("youCreatedThisExam") || "You created this exam")
                            : `${t("invitedBy") || "By"}: ${challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Student"}`}
                        </span>
                        <span>•</span>
                        <span>
                          {challenge.participants?.length || 0} {t("participants") || "participants"}
                        </span>
                        <span>•</span>
                        <span>{formatDate(challenge.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id || ""}`;
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>{userPart?.status === "in_progress" || userPart?.status === "joined" ? (t("continueExam") || "Resume Exam") : (t("joinExam") || "Join Exam")}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab !== "ongoing" && displayedAttempts.length === 0 ? (
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

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(attempt.started_at || attempt.completed_at)}</span>
                      </span>
                      {attempt.completed_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t("endedAt") || "Ended"}: {new Date(attempt.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {formatDuration(attempt.duration_seconds)}
                      </span>
                    </div>

                    {isAbandoned && !isCheating && !isAutoSubmitted && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        {t("noQuestionsAnswered") || "No questions answered"}
                      </p>
                    )}
                    {(() => {
                      if (!isAutoSubmitted && !isCheating) return null;
                      let reasonLabel = "";
                      const sum = (attempt.violation_summary || "").toLowerCase();
                      if (attempt.submission_reason === "time_expired") {
                        reasonLabel = t("autoSubmittedTimeExpired") || "Auto-submitted: Time expired";
                      } else if (attempt.submission_reason === "page_closed") {
                        reasonLabel = t("autoSubmittedPageClosed") || "Auto-submitted: Page closed";
                      } else if (isCheating) {
                        if (sum.includes("tab_switch") || sum.includes("blur") || sum.includes("tab")) {
                          reasonLabel = language === "rw" ? "Yatsinzwe ku ngufu: Guhindura paji" : language === "fr" ? "Soumission forcée : Changement d'onglet" : "Forced submission: Tab switching";
                        } else if (sum.includes("fullscreen")) {
                          reasonLabel = language === "rw" ? "Yatsinzwe ku ngufu: Gusohoka muri fullscreen" : language === "fr" ? "Soumission forcée : Sortie du plein écran" : "Forced submission: Exited fullscreen";
                        } else if (sum.includes("dev_tools") || sum.includes("inspect")) {
                          reasonLabel = language === "rw" ? "Yatsinzwe ku ngufu: Gufungura dev tools" : language === "fr" ? "Soumission forcée : Outils d'inspection" : "Forced submission: Developer tools";
                        } else if (sum.includes("copy") || sum.includes("paste")) {
                          reasonLabel = language === "rw" ? "Yatsinzwe ku ngufu: Gukoporora" : language === "fr" ? "Soumission forcée : Copier/Coller" : "Forced submission: Copy/paste";
                        } else {
                          reasonLabel = language === "rw" ? "Yatsinzwe ku ngufu: Umutekano w'ikizamini" : language === "fr" ? "Soumission forcée : Violation des règles" : "Forced submission: Security rule violation";
                        }
                      }
                      if (!reasonLabel) return null;
                      return (
                        <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium inline-flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          <span>{reasonLabel}</span>
                        </p>
                      );
                    })()}
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
                      {isAbandoned ? `${answeredCount}/${attempt.total_questions}` : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
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
