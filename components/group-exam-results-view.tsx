"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Clock, CheckCircle, XCircle, Loader2, ArrowLeft, Crown, Users, Award, Flame, TrendingUp, TrendingDown } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { GroupExamResultsSkeleton } from "@/components/skeletons";
import { ExamCelebration } from "@/components/exam-celebration";
import { ExamPodium } from "@/components/exam-podium";
import { cn } from "@/lib/utils";
import type { ExamChallenge, ExamChallengeParticipant, ExamQuestion, ExamAttempt } from "@/lib/database.types";

interface GroupExamResultsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params: URLSearchParams;
}

interface ParticipantWithProfile extends ExamChallengeParticipant {
  profile?: {
    id: string;
    full_name?: string;
    first_name?: string;
    username?: string;
    avatar_url?: string;
  };
  exam_attempt?: ExamAttempt | null;
  trend?: "up" | "down" | "neutral" | null;
  trend_diff?: number;
  average_score?: number | null;
  total_attempts?: number;
}

interface RankedParticipant {
  participant: ParticipantWithProfile;
  rank: number;
  scorePercentage: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
  completedAt: string;
  isTiedScore: boolean;
  isTiedLeader: boolean;
  intervalSeconds: number;
  intervalFormatted: string;
  trend?: "up" | "down" | "neutral" | null;
  trendDiff?: number;
  averageScore?: number | null;
  totalAttempts?: number;
}

export function GroupExamResultsView({ navigate, params }: GroupExamResultsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();
  const challengeId = params.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<ExamChallenge | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [viewMode, setViewMode] = useState<"all" | "group" | "individual">("all");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const confettiFiredRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}`);
      const data = await res.json();
      if (data.challenge) {
        setChallenge(data.challenge);
        const enrichedParticipants = data.participants || [];
        setParticipants(enrichedParticipants);

        const completedWithAttempts = enrichedParticipants.filter(
          (p: ParticipantWithProfile) => p.status === "completed" && p.exam_attempt
        );
        if (completedWithAttempts.length > 0) {
          // Collect attempted question IDs across participant attempts
          const attemptedQuestionIds = Array.from(
            new Set(
              completedWithAttempts.flatMap((p: ParticipantWithProfile) =>
                (p.exam_attempt?.answers || []).map((a: any) => a.question_id).filter(Boolean)
              )
            )
          );

          if (attemptedQuestionIds.length > 0) {
            const { data: questionsData } = await supabase
              .from("exam_questions")
              .select("*")
              .in("id", attemptedQuestionIds);

            // Keep questions in the exact order of the first participant attempt
            const firstAttemptAnswers = completedWithAttempts[0].exam_attempt?.answers || [];
            const orderedQuestions = (questionsData || []).slice().sort((a: any, b: any) => {
              const idxA = firstAttemptAnswers.findIndex((ans: any) => ans.question_id === a.id);
              const idxB = firstAttemptAnswers.findIndex((ans: any) => ans.question_id === b.id);
              if (idxA !== -1 && idxB !== -1) return idxA - idxB;
              return 0;
            });
            setQuestions(orderedQuestions as ExamQuestion[]);
          } else {
            setQuestions([]);
          }
        } else {
          setQuestions([]);
        }

        const firstCompleted = enrichedParticipants.find(
          (p: ParticipantWithProfile) => p.status === "completed"
        );
        if (firstCompleted) {
          setSelectedParticipantId(firstCompleted.user_id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch challenge results:", error);
    } finally {
      setLoading(false);
    }
  }, [challengeId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!challengeId) return;
    const channelName = `challenge-results-${challengeId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `challenge_id=eq.${challengeId}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges", filter: `id=eq.${challengeId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, supabase, fetchData]);

  const completedParticipants = participants.filter((p) => p.status === "completed" && p.exam_attempt);
  const incompleteParticipants = participants.filter((p) => p.status !== "completed" && p.status !== "rejected");
  const joinedParticipants = participants.filter((p) => ["joined", "ready", "completed"].includes(p.status));
  const allCompleted = joinedParticipants.length > 0 && joinedParticipants.every((p) => p.status === "completed");

  // Format interval helper
  const formatInterval = (seconds: number) => {
    if (seconds <= 0) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  // Sort strictly by:
  // 1. Score percentage descending
  // 2. Correct answers descending
  // 3. Duration seconds ascending (fastest wins tie)
  // 4. Completed at timestamp ascending
  const rawSorted = [...completedParticipants]
    .map((p) => ({
      participant: p,
      scorePercentage: p.exam_attempt?.score_percentage || 0,
      correctAnswers: p.exam_attempt?.correct_answers || 0,
      totalQuestions: p.exam_attempt?.total_questions || 0,
      durationSeconds: p.exam_attempt?.duration_seconds || 0,
      completedAt: p.completed_at || p.exam_attempt?.completed_at || "",
      trend: p.trend,
      trendDiff: p.trend_diff,
      averageScore: p.average_score,
      totalAttempts: p.total_attempts,
    }))
    .sort((a, b) => {
      if (b.scorePercentage !== a.scorePercentage) return b.scorePercentage - a.scorePercentage;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
      return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
    });

  // Calculate tie intervals
  const scoreGroups: Record<number, typeof rawSorted> = {};
  rawSorted.forEach((item) => {
    scoreGroups[item.correctAnswers] = scoreGroups[item.correctAnswers] || [];
    scoreGroups[item.correctAnswers].push(item);
  });

  const ranked: RankedParticipant[] = rawSorted.map((item, idx) => {
    const group = scoreGroups[item.correctAnswers] || [];
    const isTiedScore = group.length > 1;
    const fastestInTie = group[0];
    const isTiedLeader = item.participant.user_id === fastestInTie.participant.user_id;
    const intervalSeconds = Math.max(0, item.durationSeconds - fastestInTie.durationSeconds);
    const intervalFormatted = isTiedLeader ? (t("fastestInTie") || "Fastest") : `+${formatInterval(intervalSeconds)}`;

    return {
      ...item,
      rank: idx + 1,
      isTiedScore,
      isTiedLeader,
      intervalSeconds,
      intervalFormatted,
    };
  });

  const winner = ranked.length > 0 ? ranked[0] : null;
  const isWinner = winner && user && winner.participant.user_id === user.id;

  // Trigger celebration confetti for winner
  useEffect(() => {
    if (winner && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      const duration = 2.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [winner]);

  const formatDuration = (seconds: number) => {
    if (!seconds && seconds !== 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getOptionText = (q: ExamQuestion, option: string) => {
    const key = `option_${option.toLowerCase()}` as keyof ExamQuestion;
    return q[key] as string;
  };

  const getOptionImage = (q: ExamQuestion, option: string) => {
    const key = `option_${option.toLowerCase()}_image` as keyof ExamQuestion;
    return q[key] as string | undefined;
  };

  const getParticipantsForOption = (questionId: string, option: string) => {
    return participants.filter((p) => {
      if (!p.exam_attempt?.answers) return false;
      const answer = (p.exam_attempt.answers as any[]).find((a: any) => a.question_id === questionId);
      return answer?.selected_answer === option;
    });
  };

  const selectedParticipant = participants.find((p) => p.user_id === selectedParticipantId);
  const selectedParticipantAttempt = selectedParticipant?.exam_attempt;

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === "all") return true;
    if (!selectedParticipantAttempt?.answers) return false;
    const answer = selectedParticipantAttempt.answers.find((a) => a.question_id === q.id);
    if (questionFilter === "correct") return answer?.is_correct === true;
    if (questionFilter === "incorrect") return answer && !answer.is_correct;
    if (questionFilter === "unanswered") return !answer || answer.selected_answer === null;
    return true;
  });

  if (loading) return <GroupExamResultsSkeleton />;

  if (!challenge) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <p className="text-muted-foreground">{t("challengeCompleted") || "Challenge not found"}</p>
      </div>
    );
  }

  const ProfileAvatar = ({ profile, size = "h-8 w-8" }: { profile?: any; size?: string }) => {
    if (!profile) return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
    return (
      <Avatar className={size}>
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
        <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>
          {(profile.full_name || profile.username || "?")[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("back", { fallback: "classmates" })}
            className="rounded-lg p-2 hover:bg-muted"
            title={t("back") || "Back"}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
              {challenge.category_name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {completedParticipants.length} {t("xOfYCompleted") || "completed out of"} {joinedParticipants.length} {t("participants") || "participants"}
            </p>
          </div>
        </div>

        {/* Winner Completion Animation Banner */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mb-6 relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-linear-to-r from-amber-500/15 via-yellow-500/10 to-orange-500/15 p-4 sm:p-6 shadow-md"
          >
            {/* Ambient shimmer */}
            <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5 sm:gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -5, 5, 0], y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
                  >
                    <Crown className="h-6 w-6 text-yellow-500 fill-yellow-400 drop-shadow-md" />
                  </motion.div>
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-4 ring-amber-400/80 shadow-lg">
                    {winner.participant.profile?.avatar_url && (
                      <AvatarImage src={winner.participant.profile.avatar_url} />
                    )}
                    <AvatarFallback className="bg-amber-500 text-white font-bold text-xl">
                      {(winner.participant.profile?.full_name || winner.participant.profile?.username || "?")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isWinner ? (t("youWon") || "🏆 You Won 1st Place!") : (t("champion") || "🏆 Group Exam Winner")}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {winner.participant.profile?.full_name || winner.participant.profile?.username}
                    {isWinner && <span className="text-primary ml-1.5 text-sm">({t("you") || "You"})</span>}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                    <span>
                      {winner.correctAnswers}/{winner.totalQuestions} ({winner.scorePercentage}%)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      {formatDuration(winner.durationSeconds)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action / Badges */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <div className="px-3 py-1.5 rounded-xl bg-background/80 backdrop-blur-xs border border-amber-400/40 text-center shadow-xs">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                    {t("winningTime") || "Winning Time"}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                    {formatDuration(winner.durationSeconds)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Podium for top 3 if all completed or multiple finishers */}
        {ranked.length >= 2 && (
          <div className="mb-6">
            <ExamPodium
              participants={ranked.map((rp) => ({
                profile: rp.participant.profile,
                scorePercentage: rp.scorePercentage,
                correctAnswers: rp.correctAnswers,
                totalQuestions: rp.totalQuestions,
                rank: rp.rank,
              }))}
            />
          </div>
        )}

        {/* Waiting for others state */}
        {completedParticipants.length > 0 && incompleteParticipants.length > 0 && (
          <motion.div
            className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-6 w-6 text-primary" />
            </motion.div>
            <div>
              <p className="font-medium text-sm">
                {t("waitingForOthersToFinish") || "Waiting for others to finish..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {incompleteParticipants.length} {t("participantsStillTaking") || "participant(s) still taking exam"}
              </p>
            </div>
          </motion.div>
        )}

        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4 w-fit">
          {(["all", "group", "individual"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                viewMode === mode ? "bg-background shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "all" ? (t("allResults") || "All Results") : mode === "group" ? (t("groupResults") || "Group Answers") : (t("individualResults") || "Individual Review")}
            </button>
          ))}
        </div>

        {/* Leaderboard with Strict Tie-Breaking & Interval Display */}
        <div className="mb-6 rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-500" />
              <span>{t("leaderboard") || "Full Leaderboard & Rankings"}</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {t("tieBreakerRule") || "Ties broken by fastest time"}
            </span>
          </div>

          <motion.div layout className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {ranked.map((rp) => {
                const isCurrentUser = rp.participant.user_id === user?.id;
                const isWinnerEntry = rp.rank === 1;

                return (
                  <motion.div
                    layout
                    key={rp.participant.user_id || rp.participant.id}
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
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 transition-colors",
                      isCurrentUser && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      isWinnerEntry && "bg-amber-500/5"
                    )}
                  >
                    {/* Left: Rank + Avatar + Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Rank Badge */}
                      <motion.div layout className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm shrink-0">
                        <AnimatePresence mode="wait">
                          {rp.rank === 1 ? (
                            <motion.div
                              key="rank-1"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs"
                            >
                              <Crown className="h-4 w-4" />
                            </motion.div>
                          ) : rp.rank === 2 ? (
                            <motion.div
                              key="rank-2"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 text-white shadow-xs"
                            >
                              <Medal className="h-4 w-4" />
                            </motion.div>
                          ) : rp.rank === 3 ? (
                            <motion.div
                              key="rank-3"
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 450, damping: 20 }}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-white shadow-xs"
                            >
                              <Award className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.span
                              key={`rank-${rp.rank}`}
                              initial={{ scale: 0.7, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.7, opacity: 0 }}
                              className="text-muted-foreground font-semibold text-sm"
                            >
                              #{rp.rank}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      <ProfileAvatar profile={rp.participant.profile} size="h-9 w-9" />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          <span>{rp.participant.profile?.full_name || rp.participant.profile?.username}</span>
                          {isCurrentUser && (
                            <span className="text-xs text-primary font-bold">({t("you") || "You"})</span>
                          )}
                          {isWinnerEntry && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                              <Crown className="h-3 w-3" /> Winner
                            </span>
                          )}
                        </p>

                        {/* Marks & Time */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="font-semibold text-foreground">
                            {rp.correctAnswers}/{rp.totalQuestions} {t("marks") || "marks"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDuration(rp.durationSeconds)}
                          </span>
                          {rp.totalAttempts !== undefined && rp.totalAttempts > 1 && rp.trend && (
                            <>
                              <span>•</span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-2xs",
                                  rp.trend === "up"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : rp.trend === "down"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                                title={
                                  rp.trend === "up"
                                    ? `+${rp.trendDiff}% ${t("aboveAverage") || "above average"} (${rp.averageScore}%) ${t("across") || "across"} ${rp.totalAttempts} ${t("attempts") || "attempts"}`
                                    : rp.trend === "down"
                                    ? `${rp.trendDiff}% ${t("belowAverage") || "below average"} (${rp.averageScore}%) ${t("across") || "across"} ${rp.totalAttempts} ${t("attempts") || "attempts"}`
                                    : `${t("matchesAverage") || "Matches average"} (${rp.averageScore}%)`
                                }
                              >
                                {rp.trend === "up" ? (
                                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                ) : rp.trend === "down" ? (
                                  <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                ) : null}
                                <span>
                                  {rp.trend === "up" ? `+${rp.trendDiff}%` : rp.trend === "down" ? `${rp.trendDiff}%` : "="}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Interval & Score Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pl-11 sm:pl-0">
                      {/* Tied Marks Interval Badge */}
                      {rp.isTiedScore && (
                        <div className="text-left sm:text-right">
                          {rp.isTiedLeader ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <Flame className="h-3 w-3 text-emerald-500" />
                              {t("fastestInTie") || "Fastest Time"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30" title="Time difference from fastest participant with same score">
                              <Clock className="h-3 w-3 text-amber-500" />
                              {rp.intervalFormatted} {t("interval") || "interval"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Percentage */}
                      <motion.span
                        layout
                        className={cn(
                          "px-2.5 py-1 rounded-md font-bold text-xs sm:text-sm text-center min-w-[52px] shadow-2xs",
                          rp.scorePercentage >= 80
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            : rp.scorePercentage >= 50
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                        )}
                      >
                        {rp.scorePercentage}%
                      </motion.span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Incomplete Participants */}
            {incompleteParticipants.map((p) => (
              <motion.div
                layout
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 opacity-60"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <ProfileAvatar profile={p.profile} size="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.profile?.full_name || p.profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("stillTakingExam") || "Still taking exam..."}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Group Results — Questions with Floating User Avatars & Names */}
        {(viewMode === "all" || viewMode === "group") && questions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{t("groupResults") || "Group Answers Breakdown"}</span>
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("seeOthersChoices") || "See what each participant chose"}
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const correctOption = q.correct_answer;
                const options = ["A", "B", "C", "D"];

                return (
                  <div key={q.id} className="rounded-xl border bg-card p-3.5 sm:p-4 shadow-xs">
                    {/* Question Header */}
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm sm:text-base font-semibold leading-snug">
                        {q.question}
                      </p>
                    </div>

                    {q.question_image && (
                      <div className="mb-3 rounded-lg overflow-hidden border">
                        <img
                          src={q.question_image}
                          alt=""
                          className="w-full max-h-48 object-contain bg-muted/20"
                        />
                      </div>
                    )}

                    {/* Options list */}
                    <div className="space-y-2 mt-3">
                      {options.map((opt) => {
                        const optText = getOptionText(q, opt);
                        const optImg = getOptionImage(q, opt);
                        const isCorrect = opt === correctOption;
                        const choosers = getParticipantsForOption(q.id, opt);

                        if (!optText && !optImg) return null;

                        return (
                          <div
                            key={opt}
                            className={cn(
                              "rounded-lg border p-2.5 sm:p-3 transition-colors",
                              isCorrect
                                ? "border-emerald-500/50 bg-emerald-500/5 shadow-2xs"
                                : choosers.length > 0
                                ? "border-border bg-card"
                                : "border-border/60 bg-muted/10 opacity-80"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              {/* Option Badge */}
                              <span
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5",
                                  isCorrect
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {opt}
                              </span>

                              {/* Option Content */}
                              <div className="flex-1 min-w-0">
                                {optImg && (
                                  <div className="mb-2 rounded-md overflow-hidden border">
                                    <img
                                      src={optImg}
                                      alt=""
                                      className="w-full max-h-32 object-contain bg-muted/20"
                                    />
                                  </div>
                                )}
                                {optText && (
                                  <p className="text-xs sm:text-sm font-medium text-foreground break-words leading-relaxed text-left">
                                    {optText}
                                  </p>
                                )}
                              </div>

                              {/* Correct Pill */}
                              {isCorrect && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/15 shrink-0"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  <span>{t("correct") || "Correct"}</span>
                                </Badge>
                              )}
                            </div>

                            {/* Floating Usernames & Profile Pictures */}
                            {choosers.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
                                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mr-1">
                                  <Users className="h-3 w-3" />
                                  <span>{choosers.length} {choosers.length === 1 ? (t("chosenBy") || "chose this") : (t("chosenByPlural") || "chose this")}:</span>
                                </span>

                                {choosers.map((c) => {
                                  const isCurrentUser = c.user_id === user?.id;
                                  const firstName =
                                    c.profile?.first_name ||
                                    (c.profile?.full_name ? c.profile.full_name.trim().split(/\s+/)[0] : c.profile?.username || "User");
                                  return (
                                    <div
                                      key={c.user_id}
                                      className={cn(
                                        "inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-medium border shadow-2xs transition-all hover:scale-105",
                                        isCorrect
                                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40"
                                          : "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
                                        isCurrentUser && "ring-2 ring-primary ring-offset-1 font-bold"
                                      )}
                                    >
                                      <Avatar className="h-4 w-4 shrink-0">
                                        {c.profile?.avatar_url && <AvatarImage src={c.profile.avatar_url} />}
                                        <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                                          {(firstName || "?")[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="truncate max-w-[120px]">
                                        {firstName}
                                      </span>
                                      {isCurrentUser && (
                                        <span className="text-[10px] opacity-85 font-bold">({t("you") || "You"})</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-2.5 p-2 sm:p-2.5 bg-muted/40 rounded-md text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{t("explanationColon") || "Explanation:"} </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual Results Review */}
        {(viewMode === "all" || viewMode === "individual") && completedParticipants.length > 0 && (
          <div>
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span>{t("individualResults") || "Individual Participant Answers"}</span>
            </h2>

            {/* Participant tabs */}
            <div className="flex gap-1.5 overflow-x-auto mb-3 pb-1">
              {completedParticipants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.user_id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border",
                    selectedParticipantId === p.user_id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  )}
                >
                  <ProfileAvatar profile={p.profile} size="h-4 w-4" />
                  <span>{p.profile?.full_name || p.profile?.username}</span>
                </button>
              ))}
            </div>

            {/* Selected participant's review */}
            {selectedParticipantAttempt && (
              <div className="rounded-xl border bg-card p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                  <ProfileAvatar profile={selectedParticipant?.profile} size="h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {selectedParticipant?.profile?.full_name || selectedParticipant?.profile?.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedParticipantAttempt.correct_answers}/{selectedParticipantAttempt.total_questions} {t("correct") || "correct"} ·{" "}
                      {selectedParticipantAttempt.score_percentage}% ·{" "}
                      {formatDuration(selectedParticipantAttempt.duration_seconds)}
                    </p>
                  </div>
                  <Badge
                    variant={selectedParticipantAttempt.score_percentage >= 50 ? "default" : "destructive"}
                    className="text-xs font-semibold"
                  >
                    {selectedParticipantAttempt.score_percentage >= 50 ? (t("passed") || "Passed") : (t("failed") || "Failed")}
                  </Badge>
                </div>

                {/* Question filter */}
                <div className="flex gap-1 mb-3">
                  {(["all", "correct", "incorrect", "unanswered"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setQuestionFilter(f)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                        questionFilter === f ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f === "all" ? (t("all") || "All") : f === "correct" ? (t("correct") || "Correct") : f === "incorrect" ? (t("incorrect") || "Incorrect") : (t("unanswered") || "Unanswered")}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredQuestions.map((q, qIdx) => {
                    const answer = selectedParticipantAttempt.answers?.find((a) => a.question_id === q.id);
                    const isCorrect = answer?.is_correct;
                    const selectedOption = answer?.selected_answer;

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "rounded-lg border p-2.5 sm:p-3 transition-colors",
                          isCorrect === true
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : isCorrect === false
                            ? "border-rose-500/40 bg-rose-500/5"
                            : "border-border bg-card"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-muted-foreground mt-0.5">{qIdx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium leading-snug">{q.question}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                              {isCorrect === true && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span>{selectedOption ? `${t("answer") || "Answer"}: ${selectedOption}` : t("correct") || "Correct"}</span>
                                </span>
                              )}
                              {isCorrect === false && (
                                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>{selectedOption ? `${t("yourAnswer") || "Selected"}: ${selectedOption}` : t("unanswered") || "Unanswered"}</span>
                                </span>
                              )}
                              <span className="text-muted-foreground">•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                {t("correctAnswer") || "Correct Answer"}: {q.correct_answer}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
