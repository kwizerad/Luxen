"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, Clock, CheckCircle, XCircle, ArrowLeft, RotateCcw, Home, Crown, Flame, Users, Activity, TrendingUp, TrendingDown } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { ExamReview } from "@/components/exam-review";
import { createClient } from "@/lib/supabase/client";
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

export function GroupExamResults({ challengeId, examResult, questions, onReset, onRetake }: GroupExamResultsProps) {
  const { t } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const confettiFiredRef = useRef(false);
  const supabase = createClient();

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/results`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3500);

    // Subscribe to real-time participant and attempt updates
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
        () => {
          fetchResults();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_attempts",
        },
        () => {
          fetchResults();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetchResults, supabase]);

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

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

  // Group by score for completed entries to calculate time difference interval
  const completedEntries = leaderboard.filter((e) => e.completed && e.score !== null);
  const scoreGroups: Record<number, LeaderboardEntry[]> = {};
  completedEntries.forEach((e) => {
    if (e.score !== null) {
      scoreGroups[e.score] = scoreGroups[e.score] || [];
      scoreGroups[e.score].push(e);
    }
  });

  const winner = completedEntries.length > 0 ? completedEntries[0] : null;
  const isWinner = winner && winner.user_id === examResult.user_id;

  // Winner celebration confetti
  useEffect(() => {
    if (winner && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6"],
      });
    }
  }, [winner]);

  if (showReview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 max-w-5xl mx-auto pb-0">
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
          examResult={{ ...examResult, challenge_id: challengeId }}
          questions={questions}
          onReset={onReset}
          onRetake={onRetake}
        />
      </div>
    );
  }

  const completedCount = completedEntries.length;
  const myEntry = leaderboard.find((e) => e.user_id === examResult.user_id);
  const myRank = myEntry ? leaderboard.findIndex((e) => e.user_id === examResult.user_id) + 1 : null;

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 pb-20">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mb-3 shadow-xs">
            <Trophy className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold mb-1">{t("groupExamResults") || "Group Exam Results"}</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount} {t("of") || "of"} {leaderboard.length} {t("participantsCompleted") || "participants completed"}
          </p>
        </div>

        {/* Winner Hero Card */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-6 relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-linear-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/15 p-4 sm:p-6 shadow-md"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0], y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
                  >
                    <Crown className="h-6 w-6 text-yellow-500 fill-yellow-400 drop-shadow-sm" />
                  </motion.div>
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-amber-400/80 shadow-md">
                    {winner.avatar_url && <AvatarImage src={winner.avatar_url} />}
                    <AvatarFallback className="bg-amber-500 text-white font-bold text-xl">
                      {getInitials(winner.full_name || winner.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isWinner ? (t("youWon") || "🏆 You Won 1st Place!") : (t("champion") || "🏆 Challenge Winner")}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {winner.full_name || winner.username}
                    {isWinner && <span className="text-primary ml-1.5 text-sm font-semibold">({t("you") || "You"})</span>}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                    <span className="font-semibold text-foreground">
                      {winner.score}/{winner.total_questions} {t("marks") || "marks"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      {formatDuration(winner.duration_seconds)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-background/80 backdrop-blur-xs border border-amber-400/40 text-center shadow-2xs">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                  {t("winningTime") || "Winning Time"}
                </span>
                <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatDuration(winner.duration_seconds)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* My Result Card */}
        {myEntry && (
          <Card className="mb-6 border-primary/30 bg-primary/5 shadow-2xs">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("yourScore") || "Your Score"}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">
                    {myEntry.score ?? "—"} / {myEntry.total_questions ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t("yourRank") || "Your Rank"}</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">
                    #{myRank || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard with Smooth Reordering Animation */}
        <Card className="mb-6 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/40 border-b flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>{t("leaderboard") || "Full Leaderboard & Rankings"}</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {t("tieBreakerRule") || "Ties broken by fastest time"}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <motion.div layout className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {leaderboard.map((entry, idx) => {
                    const rank = idx + 1;
                    const isTop3 = rank <= 3;
                    const isCurrentUser = entry.user_id === examResult.user_id;

                    // Tie calculation
                    const group = (entry.score !== null && scoreGroups[entry.score]) || [];
                    const isTiedScore = group.length > 1;
                    const fastestInTie = group[0];
                    const isTiedLeader = entry.user_id === fastestInTie?.user_id;
                    const intervalSeconds = Math.max(0, (entry.duration_seconds || 0) - (fastestInTie?.duration_seconds || 0));
                    const intervalFormatted = isTiedLeader ? (t("fastestInTie") || "Fastest") : `+${formatInterval(intervalSeconds)}`;

                    return (
                      <motion.div
                        layout
                        key={entry.user_id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 350,
                            damping: 26,
                          },
                          opacity: { duration: 0.25 },
                        }}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4 transition-colors",
                          isTop3 && "bg-amber-500/5",
                          isCurrentUser && "bg-primary/5 ring-1 ring-inset ring-primary/25"
                        )}
                      >
                        {/* Left: Rank + Avatar + Name */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <motion.div
                            layout
                            className="flex h-8 w-8 shrink-0 items-center justify-center font-bold text-sm"
                          >
                            <AnimatePresence mode="wait">
                              {rank === 1 ? (
                                <motion.div
                                  key="rank-1"
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.6, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs"
                                >
                                  <Crown className="h-4 w-4" />
                                </motion.div>
                              ) : rank === 2 ? (
                                <motion.div
                                  key="rank-2"
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.6, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-white shadow-2xs"
                                >
                                  <Medal className="h-4 w-4" />
                                </motion.div>
                              ) : rank === 3 ? (
                                <motion.div
                                  key="rank-3"
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.6, opacity: 0 }}
                                  transition={{ type: "spring", stiffness: 450, damping: 20 }}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-white shadow-2xs"
                                >
                                  <Award className="h-4 w-4" />
                                </motion.div>
                              ) : (
                                <motion.span
                                  key={`rank-${rank}`}
                                  initial={{ scale: 0.7, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.7, opacity: 0 }}
                                  className="text-muted-foreground font-semibold text-sm"
                                >
                                  #{rank}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.div>

                          <Avatar className="h-9 w-9 shrink-0">
                            {entry.avatar_url ? (
                              <AvatarImage src={entry.avatar_url} />
                            ) : (
                              <AvatarFallback>{getInitials(entry.full_name || entry.username)}</AvatarFallback>
                            )}
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                              <span>{entry.full_name || entry.username}</span>
                              {isCurrentUser && (
                                <span className="text-xs text-primary font-bold">({t("you") || "You"})</span>
                              )}
                              {rank === 1 && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                  <Crown className="h-3 w-3" /> Winner
                                </span>
                              )}
                            </p>

                            {/* Marks & Details visible to all participants */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                              {entry.completed ? (
                                <>
                                  <span className="font-semibold text-foreground">
                                    {entry.score}/{entry.total_questions} {t("marks") || "marks"}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(entry.duration_seconds)}
                                  </span>
                                  {entry.total_attempts !== undefined && entry.total_attempts > 1 && entry.trend && (
                                    <>
                                      <span>•</span>
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs",
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
                                          <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        ) : entry.trend === "down" ? (
                                          <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                        ) : null}
                                        <span>
                                          {entry.trend === "up" ? `+${entry.trend_diff}%` : entry.trend === "down" ? `${entry.trend_diff}%` : "="}
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {t("stillTakingExam") || "Still taking exam..."}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Interval & Score Badge */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-11 sm:pl-0">
                          {/* Tied Marks Interval Badge */}
                          {entry.completed && isTiedScore && (
                            <div>
                              {isTiedLeader ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <Flame className="h-3 w-3 text-emerald-500" />
                                  {t("fastestInTie") || "Fastest Time"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30" title="Time difference from fastest participant with same score">
                                  <Clock className="h-3 w-3 text-amber-500" />
                                  {intervalFormatted} {t("interval") || "interval"}
                                </span>
                              )}
                            </div>
                          )}

                          {entry.completed ? (
                            <motion.span
                              layout
                              className={cn(
                                "px-2.5 py-1 rounded-md font-bold text-xs sm:text-sm text-center min-w-[50px] shadow-2xs",
                                (entry.score_percentage ?? (entry.score! / (entry.total_questions || 1)) * 100) >= 80
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                  : (entry.score_percentage ?? (entry.score! / (entry.total_questions || 1)) * 100) >= 60
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                              )}
                            >
                              {entry.score_percentage ?? Math.round(((entry.score || 0) / (entry.total_questions || 1)) * 100)}%
                            </motion.span>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {entry.status === "pending" ? (t("pending") || "Pending") :
                               entry.status === "joined" ? (t("joined") || "Joined") :
                               entry.status === "ready" ? (t("ready") || "Ready") :
                               (t("inProgress") || "In Progress")}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setShowReview(true)}
            variant="outline"
            className="flex-1"
          >
            {t("reviewAnswers") || "Review Answers"}
          </Button>
          <Button
            onClick={onReset}
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            {t("backToDashboard") || "Back to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
