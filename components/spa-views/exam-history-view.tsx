"use client";

import { useEffect, useState, useMemo } from "react";
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
  Users,
  User,
  Layers,
  FolderCheck,
  FolderX,
  FolderArchive,
  FolderOpen,
  FileCheck2,
  FileX2,
  FileWarning,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
  Search,
  ArrowRight,
  Award,
  Timer,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ExamReview } from "@/components/exam-review";
import { ExamHistorySkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { spaCache } from "@/lib/spa-cache";
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

  const cached = user ? spaCache.get<{ attempts: ExamAttemptWithAnswers[]; ongoingChallenges: any[] }>(`spa_exam_history_${user.id}`) : null;

  const [loading, setLoading] = useState(!cached);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>(cached?.attempts || []);
  const [ongoingChallenges, setOngoingChallenges] = useState<any[]>(cached?.ongoingChallenges || []);
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
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
          const now = Date.now();
          const activeList = list.filter((c: any) => {
            if (!user || !c?.created_at) return false;
            if (c.status === "completed" || c.status === "cancelled") return false;

            const p = c.participants?.find((x: any) => x.user_id === user.id);
            const hasCompleted = p?.status === "completed" || p?.status === "abandoned" || p?.status === "rejected" || Boolean(p?.exam_attempt_id);
            if (hasCompleted) return false;

            const isCreator = c.creator_id === user.id;
            const ageMs = now - new Date(c.created_at).getTime();

            if (c.status === "pending") {
              if (isCreator) return ageMs <= 60 * 1000;
              if (p?.status === "pending") return ageMs <= 30 * 1000;
              if (p?.status === "joined" || p?.status === "ready") return ageMs <= 60 * 1000;
              return false;
            }

            if (c.status === "active") {
              const isParticipantOrCreator = isCreator || p?.status === "joined" || p?.status === "ready" || p?.status === "in_progress";
              return isParticipantOrCreator && ageMs <= 30 * 60 * 1000;
            }

            return false;
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
        spaCache.set(`spa_exam_history_${user.id}`, {
          attempts: combined,
          ongoingChallenges: ongoingRes.status === "fulfilled" ? ((ongoingRes.value as any)?.challenges || []) : [],
        });
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

  const baseAttempts =
    activeTab === "individual"
      ? individualAttempts
      : activeTab === "group"
      ? groupAttempts
      : attempts;

  const displayedAttempts = useMemo(() => {
    if (!searchQuery.trim()) return baseAttempts;
    const q = searchQuery.toLowerCase().trim();
    return baseAttempts.filter(
      (a) =>
        (a.category_name || "").toLowerCase().includes(q) ||
        (a.submission_reason || "").toLowerCase().includes(q) ||
        (a.violation_summary || "").toLowerCase().includes(q)
    );
  }, [baseAttempts, searchQuery]);

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

  const validCompletedAttempts = attempts.filter((a) => a.score_percentage != null && a.status !== "abandoned");
  const avgScore = validCompletedAttempts.length > 0
    ? Math.round(validCompletedAttempts.reduce((acc, curr) => acc + (curr.score_percentage || 0), 0) / validCompletedAttempts.length)
    : 0;
  const passedCount = validCompletedAttempts.filter((a) => (a.score_percentage || 0) >= 50).length;

  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("back") || t("backToHome") || "Back"}</span>
          </button>
          <span className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase hidden sm:inline-block">
            telemetry · exam archive
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase flex items-center gap-1.5">
              <FolderArchive className="h-3.5 w-3.5 text-primary" />
              <span>performance ledger · exam dossier vault</span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">
              {t("examHistory") || "Exam History Archive"}
            </h1>
          </div>

          {/* Search and Grid / List Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search") || "Search files..."}
                className="w-full pl-8 pr-3 py-1.2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-primary/50 font-mono transition-colors"
              />
            </div>
            <div className="flex items-center p-0.5 bg-zinc-900/80 rounded-lg border border-zinc-800 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View (Compact)"
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List View"
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row - Professional & Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <FolderOpen className="h-3 w-3 text-primary" />
            <span>total attempts</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{attempts.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <FolderCheck className="h-3 w-3 text-primary" />
            <span>passed files</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{passedCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <Award className="h-3 w-3 text-primary" />
            <span>avg score</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-primary">{avgScore}%</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <Users className="h-3 w-3 text-primary" />
            <span>group battles</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{groupAttempts.length}</div>
        </div>
      </div>

      {/* History Tabs Filter */}
      <div className="flex p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "all"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>all</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {attempts.length}
          </span>
        </button>

        {ongoingChallenges.length > 0 && (
          <button
            onClick={() => setActiveTab("ongoing")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
              activeTab === "ongoing"
                ? "bg-primary/20 text-primary font-bold border border-primary/30 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 animate-pulse text-primary" />
            <span>ongoing</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
              {ongoingChallenges.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("individual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "individual"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>solo</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {individualAttempts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "group"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>group</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {groupAttempts.length}
          </span>
        </button>
      </div>

      {/* Ongoing Active Challenges in Ongoing Tab */}
      {activeTab === "ongoing" && (
        <div className="space-y-2.5">
          {ongoingChallenges.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-950/30">
              <Clock className="mx-auto mb-2.5 h-8 w-8 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-300">
                {t("noOngoingExams") || "No ongoing exams right now"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 font-mono">
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
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-zinc-100 truncate">
                        {challenge.category_name || "Exam Challenge"}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold lowercase">
                        {challenge.status === "active" ? (t("inProgress") || "in-progress") : (t("pending") || "pending")}
                      </span>
                      {isCreator && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 lowercase">
                          creator
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono flex-wrap">
                      <span>
                        {isCreator
                          ? "created by you"
                          : `host: ${challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Student"}`}
                      </span>
                      <span>•</span>
                      <span>{challenge.participants?.length || 0} participants</span>
                      <span>•</span>
                      <span>{formatDate(challenge.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id || ""}`;
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>{userPart?.status === "in_progress" || userPart?.status === "joined" ? (t("continueExam") || "Resume Exam") : (t("joinExam") || "Join Exam")}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab !== "ongoing" && displayedAttempts.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-950/30">
          <FolderArchive className="mx-auto mb-2.5 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-200">
            {searchQuery ? "No matching exam files found" : activeTab === "group" ? (t("noGroupExamHistory") || "No group exams completed yet") : (t("noExamHistory") || "No exam attempts found")}
          </p>
          <p className="mt-1 text-xs text-zinc-400 font-mono max-w-sm mx-auto">
            {searchQuery
              ? `Try adjusting your query "${searchQuery}" or clear the search filter.`
              : activeTab === "group"
              ? (t("noGroupExamHint") || "Challenge your classmates to a group exam to see results here.")
              : (t("noExamHistoryHint") || "Take an exam from the exams page to start recording your progress.")}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : activeTab !== "ongoing" && viewMode === "grid" ? (
        /* Professional, Compact 4 to 6 Columns Dossier Grid with Primary Focus */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {displayedAttempts.map((attempt) => {
            const isPassed = attempt.score_percentage >= 50;
            const answeredCount = (attempt.answers || []).filter((a) => a.selected_answer !== null).length;
            const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
            const isCheating = attempt.submission_reason === "cheating_violation";
            const isGroup = !!attempt.challenge_id;
            const scorePct = isAbandoned ? 0 : Math.max(0, Math.min(100, attempt.score_percentage || 0));

            return (
              <div
                key={attempt.id}
                onClick={() => handleReview(attempt)}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-primary/50 p-3 sm:p-3.5 text-left transition-all duration-150 cursor-pointer overflow-hidden shadow-xs hover:shadow-md"
              >
                {/* Header: Folder Icon + Score Badge */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    {isCheating ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : isAbandoned ? (
                      <FileWarning className="h-3.5 w-3.5" />
                    ) : isGroup ? (
                      <Users className="h-3.5 w-3.5" />
                    ) : (
                      <FolderCheck className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={cn(
                      "font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border leading-none inline-block",
                      isAbandoned
                        ? "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                        : isPassed
                        ? "bg-primary/10 border-primary/20 text-primary font-extrabold"
                        : "bg-zinc-800/90 border-zinc-700/80 text-zinc-300"
                    )}>
                      {isAbandoned ? "VOID" : `${attempt.score_percentage}%`}
                    </span>
                  </div>
                </div>

                {/* Body: Title & Meta Info */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 group-hover:text-zinc-100 transition-colors line-clamp-2 leading-snug">
                      {attempt.category_name || "Official Driving Exam"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-zinc-400">
                      <span>{isGroup ? "group battle" : "solo mock"}</span>
                      <span>•</span>
                      <span>{isAbandoned ? "incomplete" : isPassed ? "passed" : "reviewed"}</span>
                    </div>
                  </div>

                  {/* Sleek Minimal Progress Meter */}
                  <div className="space-y-1 pt-1">
                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isPassed ? "bg-primary" : "bg-zinc-500"
                        )}
                        style={{ width: `${scorePct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>
                        {isAbandoned
                          ? `${answeredCount}/${attempt.total_questions || 20}`
                          : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
                      </span>
                      <span className="truncate">
                        {new Date(attempt.started_at || attempt.completed_at || "").toLocaleDateString(undefined, {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  <span className="flex items-center gap-1 truncate">
                    <Timer className="h-2.5 w-2.5 shrink-0" />
                    <span>{attempt.duration_seconds != null ? formatDuration(attempt.duration_seconds) : "15m"}</span>
                  </span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:text-primary transition-all shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab !== "ongoing" && viewMode === "list" ? (
        /* Alternate Clean List View */
        <div className="space-y-2">
          {displayedAttempts.map((attempt) => {
            const isPassed = attempt.score_percentage >= 50;
            const answeredCount = (attempt.answers || []).filter((a) => a.selected_answer !== null).length;
            const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
            const isCheating = attempt.submission_reason === "cheating_violation";
            const isGroup = !!attempt.challenge_id;

            return (
              <button
                key={attempt.id}
                onClick={() => handleReview(attempt)}
                className="group w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-primary/40 p-3 text-left transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-primary">
                  {isCheating ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : isAbandoned ? (
                    <FileWarning className="h-4 w-4" />
                  ) : isGroup ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    <FolderCheck className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-zinc-100 truncate">
                      {attempt.category_name}
                    </p>
                    {isGroup && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        group
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(attempt.started_at || attempt.completed_at)}</span>
                    </span>
                    {attempt.duration_seconds != null && (
                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                        {formatDuration(attempt.duration_seconds)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold text-zinc-100">
                    {isAbandoned ? "—" : `${attempt.score_percentage}%`}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {isAbandoned ? `${answeredCount}/${attempt.total_questions}` : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
