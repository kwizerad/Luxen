"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Medal,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Home,
  Crown,
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { ExamReview } from "@/components/exam-review";
import { createClient } from "@/lib/supabase/client";
import { getExamResultLanguageName } from "@/lib/exam-settings";
import { cn } from "@/lib/utils";
import type { ExamAttempt, ExamQuestion } from "@/lib/database.types";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  first_name?: string;
  username: string;
  avatar_url: string | null;
  status: string;
  score: number | null;
  score_percentage?: number | null;
  total_questions: number | null;
  duration_seconds: number | null;
  completed: boolean;
  completed_at?: string | null;
  share_results?: boolean;
  results_hidden?: boolean;
  trend?: "up" | "down" | "neutral" | null;
  trend_diff?: number;
  average_score?: number | null;
  total_attempts?: number;
}

interface GroupExamResultsProps {
  challengeId: string;
  examResult: ExamAttempt;
  questions: ExamQuestion[];
  onReset: () => void;
  onRetake: () => void;
}

export function GroupExamResults({
  challengeId,
  examResult,
  questions,
  onReset,
  onRetake,
}: GroupExamResultsProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challengeInfo, setChallengeInfo] = useState<{ language?: string | null; category_name?: string | null } | null>(null);
  const [isSoloAttempt, setIsSoloAttempt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const confettiFiredRef = useRef(false);
  const leaderboardSigRef = useRef<string>("");
  const supabase = useMemo(() => createClient(), []);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/results`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.challenge) {
        setChallengeInfo({
          language: data.challenge.language ?? null,
          category_name: data.challenge.category_name ?? null,
        });
      }
      if (data.leaderboard) {
        const sig = JSON.stringify(
          (data.leaderboard as LeaderboardEntry[]).map((e) => [
            e.user_id,
            e.status,
            e.score,
            e.completed,
            e.duration_seconds,
            e.share_results,
            e.results_hidden,
          ])
        );
        if (sig !== leaderboardSigRef.current) {
          leaderboardSigRef.current = sig;
          setLeaderboard(data.leaderboard);
        }
      }
      if (typeof data.is_solo_attempt === "boolean") {
        setIsSoloAttempt(data.is_solo_attempt);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }
    fetchResults();
    const interval = setInterval(fetchResults, 3500);

    const channelName = `group-results-${challengeId}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => fetchResults()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenges",
          filter: `id=eq.${challengeId}`,
        },
        () => fetchResults()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_attempts",
        },
        () => fetchResults()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetchResults, supabase]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDuration = (seconds: number | null) => {
    if (!seconds && seconds !== 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatInterval = (seconds: number) => {
    if (seconds <= 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const completedEntries = useMemo(
    () => leaderboard.filter((e) => e.completed && !e.results_hidden && e.score !== null),
    [leaderboard]
  );

  const scoreGroups = useMemo(() => {
    const groups: Record<number, LeaderboardEntry[]> = {};
    completedEntries.forEach((e) => {
      if (e.score !== null) {
        groups[e.score] = groups[e.score] || [];
        groups[e.score].push(e);
      }
    });
    return groups;
  }, [completedEntries]);

  const winner = completedEntries.length > 0 ? completedEntries[0] : null;
  const isWinner = Boolean(winner && winner.user_id === examResult.user_id);
  const isWinnerPassed = winner
    ? winner.score_percentage !== undefined && winner.score_percentage !== null
      ? Number(winner.score_percentage) >= 50
      : ((winner.score || 0) / (winner.total_questions || 1)) * 100 >= 50
    : false;

  useEffect(() => {
    if (!isSoloAttempt && winner && isWinnerPassed && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6"],
      });
    }
  }, [isSoloAttempt, winner, isWinnerPassed]);

  const resultLangName = getExamResultLanguageName({
    exam_language: examResult.exam_language,
    language: challengeInfo?.language,
    category_name: examResult.category_name || challengeInfo?.category_name,
  });

  const resolvedExamResult: ExamAttempt = {
    ...examResult,
    category_name: resultLangName,
    exam_language: resultLangName,
  };

  if (!loading && isSoloAttempt) {
    return (
      <ExamReview
        examResult={resolvedExamResult}
        questions={questions}
        onReset={onReset}
        onRetake={onRetake}
      />
    );
  }

  if (showReview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-3 sm:px-6 pt-3 max-w-5xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReview(false)}
            className="flex items-center gap-2 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backToLeaderboard") || "Back to Leaderboard"}</span>
          </Button>
        </div>
        <ExamReview
          challengeId={challengeId}
          examResult={{ ...resolvedExamResult, challenge_id: challengeId }}
          questions={questions}
          onReset={onReset}
          onRetake={onRetake}
        />
      </div>
    );
  }

  const completedCount = leaderboard.filter((e) => e.completed).length;
  const myEntry = leaderboard.find((e) => e.user_id === examResult.user_id);
  const myRankIndex = completedEntries.findIndex((e) => e.user_id === examResult.user_id);
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const myShareResults = myEntry ? myEntry.share_results !== false : true;

  const handleToggleShareResults = async () => {
    if (togglingVisibility) return;
    const nextShare = !myShareResults;
    setTogglingVisibility(true);
    setLeaderboard((prev) =>
      prev.map((e) =>
        e.user_id === examResult.user_id ? { ...e, share_results: nextShare } : e
      )
    );
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_results: nextShare }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update visibility");
      }
      toast.success(
        nextShare
          ? t("resultsNowShared") || "Your results are now shared with group members"
          : t("resultsNowPrivate") || "Your results are now hidden from other members"
      );
      await fetchResults();
    } catch (error) {
      setLeaderboard((prev) =>
        prev.map((e) =>
          e.user_id === examResult.user_id ? { ...e, share_results: !nextShare } : e
        )
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to update visibility"
      );
    } finally {
      setTogglingVisibility(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 pb-20">
      {/* Unified Primary Top Summary (Replaces 3 separate stacked boxes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums flex-wrap">
            <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="font-semibold text-foreground">{resultLangName}</span>
            <span aria-hidden="true">·</span>
            <span>{t("groupExamResults") || "Group Exam Results"}</span>
            <span aria-hidden="true">·</span>
            <span>
              {completedCount}/{leaderboard.length} {t("participantsCompleted") || "completed"}
            </span>
          </div>

          {winner && isWinnerPassed ? (
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground">
              {isWinner
                ? t("youWon") || "You won 1st place"
                : `${winner.full_name || winner.username} · 1st`}
            </h1>
          ) : (
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground">
              {t("leaderboard") || "Rankings"}
            </h1>
          )}
        </div>

        {/* Inline Personal Standing (Unboxed tabular figures) */}
        {myEntry && (
          <div className="flex items-center gap-5 shrink-0 tabular-nums">
            <div>
              <span className="block text-[11px] text-muted-foreground">
                {t("yourScore") || "Your Score"}
              </span>
              <span className="text-lg sm:text-xl font-bold text-primary">
                {myEntry.score ?? "—"} / {myEntry.total_questions ?? "—"}
              </span>
            </div>
            <div className="h-8 w-px bg-border/60" aria-hidden="true" />
            <div>
              <span className="block text-[11px] text-muted-foreground">
                {t("yourRank") || "Rank"}
              </span>
              <span className="text-lg sm:text-xl font-bold text-foreground">
                #{myRank || "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Result Sharing Preference Bar (Changeable Anytime) */}
      {myEntry && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border/60 bg-card/50 dark:bg-zinc-900/40 px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {myShareResults ? (
              <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {myShareResults
                  ? t("sharingResultsWithGroup") || "Sharing your results with group"
                  : t("hidingResultsFromGroup") || "Your results are hidden from others"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("shareGroupResultsCanChangeLater") ||
                  "You can change this choice anytime."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleShareResults}
            disabled={togglingVisibility}
            className="h-8 rounded-lg text-xs font-semibold shrink-0"
          >
            {myShareResults ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("hideMyResults") || "Hide Results"}</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("shareMyResults") || "Share Results"}</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Single Hairline Leaderboard List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("leaderboard") || "Rankings"}
          </span>
          <span>{t("tieBreakerRule") || "Ties broken by fastest time"}</span>
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden bg-card/40 dark:bg-zinc-900/30">
          {loading ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-center gap-3 py-2">
                <div
                  role="status"
                  aria-label="Loading results"
                  className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-700/80 border-t-emerald-600 dark:border-t-emerald-300 dark:border-r-emerald-300/70 dark:shadow-[0_0_16px_rgba(110,231,183,0.45)]"
                />
                <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("loading") || "Loading..."}
                </span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div layout className="divide-y divide-border/50">
              <AnimatePresence initial={false}>
                {leaderboard.map((entry, idx) => {
                  const isHidden = Boolean(entry.results_hidden);
                  const visibleRankIndex = completedEntries.findIndex(
                    (c) => c.user_id === entry.user_id
                  );
                  const rank = !isHidden && visibleRankIndex >= 0 ? visibleRankIndex + 1 : idx + 1;
                  const isCurrentUser = entry.user_id === examResult.user_id;

                  const group =
                    (!isHidden && entry.score !== null && scoreGroups[entry.score]) || [];
                  const isTiedScore = group.length > 1;
                  const fastestInTie = group[0];
                  const isTiedLeader = entry.user_id === fastestInTie?.user_id;
                  const intervalSeconds = Math.max(
                    0,
                    (entry.duration_seconds || 0) - (fastestInTie?.duration_seconds || 0)
                  );
                  const intervalFormatted = isTiedLeader
                    ? t("fastestInTie") || "Fastest"
                    : `+${formatInterval(intervalSeconds)}`;

                  const pct =
                    entry.score_percentage ??
                    Math.round(((entry.score || 0) / (entry.total_questions || 1)) * 100);

                  return (
                    <motion.div
                      layout
                      key={entry.user_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-3 sm:px-4 transition-colors",
                        isCurrentUser && "bg-primary/[0.07] dark:bg-primary/15"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-7 flex items-center justify-center shrink-0">
                          {isHidden ? (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : !entry.completed ? (
                            <span className="text-xs font-mono text-muted-foreground">—</span>
                          ) : rank === 1 ? (
                            <Crown className="h-4 w-4 text-amber-500" />
                          ) : rank === 2 ? (
                            <Medal className="h-4 w-4 text-slate-400" />
                          ) : rank === 3 ? (
                            <Award className="h-4 w-4 text-amber-700" />
                          ) : (
                            <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums">
                              #{rank}
                            </span>
                          )}
                        </div>

                        <Avatar className="h-8 w-8 shrink-0">
                          {canViewUserAvatar(
                            entry.avatar_url,
                            entry.user_id,
                            user?.id || examResult.user_id,
                            user?.user_metadata?.role
                          ) &&
                            entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
                          <AvatarFallback className="text-xs font-semibold">
                            {getInitials(entry.full_name || entry.username)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {entry.full_name || entry.username}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-xs text-primary font-semibold">
                                ({t("you") || "You"})
                                {entry.share_results === false && (
                                  <span className="ml-1.5 text-[11px] font-normal text-amber-600 dark:text-amber-400">
                                    · {t("resultsPrivateLabel") || "Private"}
                                  </span>
                                )}
                              </span>
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
                            {entry.completed ? (
                              isHidden ? (
                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                  <EyeOff className="h-3 w-3" />
                                  <span>{t("resultsHiddenByParticipant") || "Completed · Results private"}</span>
                                </span>
                              ) : (
                                <>
                                  <span>
                                    {entry.score}/{entry.total_questions}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{formatDuration(entry.duration_seconds)}</span>
                                  {isTiedScore && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{intervalFormatted}</span>
                                    </>
                                  )}
                                  {entry.total_attempts !== undefined &&
                                    entry.total_attempts > 1 &&
                                    entry.trend && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span
                                          className={cn(
                                            "inline-flex items-center gap-0.5 font-medium",
                                            entry.trend === "up"
                                              ? "text-emerald-600 dark:text-emerald-400"
                                              : entry.trend === "down"
                                              ? "text-rose-600 dark:text-rose-400"
                                              : ""
                                          )}
                                        >
                                          {entry.trend === "up" ? (
                                            <TrendingUp className="h-3 w-3" />
                                          ) : entry.trend === "down" ? (
                                            <TrendingDown className="h-3 w-3" />
                                          ) : null}
                                          {entry.trend === "up"
                                            ? `+${entry.trend_diff}%`
                                            : entry.trend === "down"
                                            ? `${entry.trend_diff}%`
                                            : "="}
                                        </span>
                                      </>
                                    )}
                                </>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                {entry.status === "in_progress" || entry.status === "active" ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-300" />
                                    <span>{t("takingExamNow") || "In exam..."}</span>
                                  </>
                                ) : entry.status === "joined" ? (
                                  <>
                                    <Users className="h-3 w-3 text-sky-500" />
                                    <span>{t("inLobbyWaiting") || "In lobby"}</span>
                                  </>
                                ) : entry.status === "ready" ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    <span>{t("readyToStart") || "Ready"}</span>
                                  </>
                                ) : entry.status === "declined" ||
                                  entry.status === "rejected" ||
                                  entry.status === "left" ||
                                  entry.status === "abandoned" ? (
                                  <>
                                    <XCircle className="h-3 w-3 text-muted-foreground" />
                                    <span>
                                      {entry.status === "declined" || entry.status === "rejected"
                                        ? t("declinedInvite") || "Declined"
                                        : t("leftExam") || "Left"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    <span>{t("notJoinedYet") || "Pending"}</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {entry.completed && (
                        isHidden ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground shrink-0">
                            <Lock className="h-3 w-3" />
                            <span>{t("resultsPrivateLabel") || "Private"}</span>
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "font-mono text-sm font-bold tabular-nums shrink-0",
                              pct >= 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : pct >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {pct}%
                          </span>
                        )
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <Button
          onClick={() => setShowReview(true)}
          variant="outline"
          className="flex-1 min-h-[40px] h-auto py-2 px-4 rounded-xl text-xs sm:text-sm whitespace-normal text-center"
        >
          {t("reviewAnswers") || "Review Answers"}
        </Button>
        <Button
          onClick={onReset}
          className="flex-1 min-h-[40px] h-auto py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold whitespace-normal text-center"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span>{t("backToDashboard") || "Back to Exams"}</span>
        </Button>
      </div>
    </div>
  );
}
