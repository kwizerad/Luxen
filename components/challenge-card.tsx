"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Trophy, Users, Check, X, Play, Clock, Loader2, Bell, Medal, Timer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import type { ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";
import { toast } from "sonner";

interface ChallengeCardProps {
  challenge: ExamChallenge & { participants?: (ExamChallengeParticipant & { profile?: any })[]; creator_profile?: any };
  currentUserId: string;
  onActionComplete?: () => void;
  navigate?: (view: string, params?: Record<string, string>) => void;
}

export function ChallengeCard({ challenge, currentUserId, onActionComplete, navigate }: ChallengeCardProps) {
  const { t } = useLanguage();
  const [participants, setParticipants] = useState(challenge.participants || []);
  const [acting, setActing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onActionCompleteRef = useRef(onActionComplete);
  onActionCompleteRef.current = onActionComplete;

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    setParticipants(challenge.participants || []);
  }, [challenge.participants]);

  useEffect(() => {
    if (!challenge?.id) return;

    const channelName = `challenge-${challenge.id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `challenge_id=eq.${challenge.id}` },
        async () => {
          const { data: updated } = await supabase
            .from("exam_challenge_participants")
            .select("*, profile:user_profiles(id, full_name, username, avatar_url, last_seen)")
            .eq("challenge_id", challenge.id);
          if (updated) {
            const attemptIds = updated.map((p) => p.exam_attempt_id).filter(Boolean);
            let attemptMap: Record<string, any> = {};
            if (attemptIds.length > 0) {
              const { data: attempts } = await supabase
                .from("exam_attempts")
                .select("id, score, total_questions, duration_seconds, is_passed, created_at")
                .in("id", attemptIds);
              for (const a of attempts || []) {
                attemptMap[a.id] = {
                  ...a,
                  percentage: a.total_questions ? Math.round(((a.score || 0) / a.total_questions) * 100) : 0,
                };
              }
            }
            const enriched = updated.map((p) => ({
              ...p,
              exam_attempt: p.exam_attempt_id
                ? attemptMap[p.exam_attempt_id] || (challenge.participants?.find((cp) => cp.id === p.id) as any)?.exam_attempt || null
                : null,
            }));
            setParticipants(enriched as any);
          }
          onActionCompleteRef.current?.();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges", filter: `id=eq.${challenge.id}` },
        async () => {
          onActionCompleteRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challenge.id, supabase]);

  const myParticipation = participants.find((p) => p.user_id === currentUserId);
  const isCreator = challenge.creator_id === currentUserId;
  const hasUserCompleted =
    myParticipation?.status === "completed" ||
    Boolean(myParticipation?.exam_attempt_id);

  const joinedCount = participants.filter((p) => ["joined", "ready", "completed"].includes(p.status)).length;
  const readyCount = participants.filter((p) => ["ready", "completed"].includes(p.status)).length;
  const completedCount = participants.filter((p) => p.status === "completed" || Boolean(p.exam_attempt_id) || Boolean((p as any).exam_attempt)).length;
  const totalParticipants = participants.length;

  const sortedCompletedParticipants = useMemo(() => {
    return participants
      .filter((p) => p.status === "completed" || Boolean(p.exam_attempt_id) || Boolean((p as any).exam_attempt))
      .slice()
      .sort((a, b) => {
        const aAttempt = (a as any).exam_attempt;
        const bAttempt = (b as any).exam_attempt;

        const aScore = aAttempt?.score !== undefined ? Number(aAttempt.score) : -1;
        const bScore = bAttempt?.score !== undefined ? Number(bAttempt.score) : -1;
        const aTotal = aAttempt?.total_questions ? Number(aAttempt.total_questions) : 20;
        const bTotal = bAttempt?.total_questions ? Number(bAttempt.total_questions) : 20;
        const aPct = aAttempt?.percentage !== undefined ? Number(aAttempt.percentage) : (aScore >= 0 ? Math.round((aScore / aTotal) * 100) : -1);
        const bPct = bAttempt?.percentage !== undefined ? Number(bAttempt.percentage) : (bScore >= 0 ? Math.round((bScore / bTotal) * 100) : -1);

        // 1. Primary: Score percentage (highest first)
        if (bPct !== aPct) return bPct - aPct;

        // 2. Secondary: Raw score (highest first)
        if (bScore !== aScore) return bScore - aScore;

        // 3. Tertiary: Time duration (fastest / lowest seconds first)
        const aDuration = aAttempt?.duration_seconds !== undefined && aAttempt?.duration_seconds !== null ? Number(aAttempt.duration_seconds) : Infinity;
        const bDuration = bAttempt?.duration_seconds !== undefined && bAttempt?.duration_seconds !== null ? Number(bAttempt.duration_seconds) : Infinity;
        if (aDuration !== bDuration) return aDuration - bDuration;

        // 4. Quaternary: Earliest timestamp
        const aTime = aAttempt?.created_at ? new Date(aAttempt.created_at).getTime() : 0;
        const bTime = bAttempt?.created_at ? new Date(bAttempt.created_at).getTime() : 0;
        return aTime - bTime;
      });
  }, [participants]);

  const callApi = async (endpoint: string, body?: any) => {
    setActing(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(t("success"));
      onActionComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setActing(false);
    }
  };

  const handleJoin = async () => {
    await callApi(`/api/exam-challenges/${challenge.id}/join`);
    window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}`;
  };
  const handleDeny = () => callApi(`/api/exam-challenges/${challenge.id}/deny`);
  const handleCancelChallenge = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/exam-challenges/${challenge.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(t("examCancelledSuccess") || "Exam challenge cancelled");
      onActionComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      toast.error(message);
    } finally {
      setActing(false);
    }
  };
  const handleReady = useCallback(() => {
    callApi(`/api/exam-challenges/${challenge.id}/ready`);
  }, [challenge.id]);

  useEffect(() => {
    if (myParticipation?.status === "joined") {
      setCountdown(30);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            handleReady();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [myParticipation?.status, handleReady]);
  const handleStart = async () => {
    await callApi(`/api/exam-challenges/${challenge.id}/start`);
    window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}`;
  };
  const handleRemind = (participantId: string) =>
    callApi(`/api/exam-challenges/${challenge.id}/remind`, { participant_id: participantId });

  const handleTakeExam = () => {
    if (navigate) {
      navigate("classmates/group-results", { id: challenge.id });
    }
  };

  const handleStartExam = () => {
    const url = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}`;
    window.location.href = url;
  };

  const handleViewResults = () => {
    if (navigate) {
      navigate("classmates/group-results", { id: challenge.id });
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-400 text-amber-950",
      joined: "bg-blue-500 text-white",
      ready: "bg-green-500 text-white",
      in_progress: "bg-sky-500 text-white animate-pulse",
      completed: "bg-emerald-500 text-white",
      abandoned: "bg-orange-500 text-white",
      rejected: "bg-rose-500 text-white",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 sm:p-4 mb-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Trophy className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">
            {t("groupExam")}: {challenge.category_name}
          </h4>
          <p className="text-xs text-muted-foreground">
            {challenge.status === "pending" && t("waitingForOthers")}
            {challenge.status === "active" && `${t("examInProgress")} — ${completedCount}/${joinedCount} ${t("completed")}`}
            {challenge.status === "completed" && t("challengeCompleted")}
            {challenge.status === "cancelled" && t("challengeCompleted")}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {challenge.status}
        </Badge>
      </div>

      {/* Participant avatars */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {participants.map((p) => (
          <div key={p.id} className="relative group">
            {p.profile?.avatar_url ? (
              <Avatar className="h-7 w-7 border-2 border-background">
                <AvatarImage src={p.profile.avatar_url} alt="" />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {(p.profile?.full_name || p.profile?.username || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold border-2 border-background">
                {(p.profile?.full_name || p.profile?.username || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-background ${statusBadge(p.status)}`}
              title={p.status}
            />
          </div>
        ))}
      </div>

      {/* Counts */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {joinedCount} {t("joinedParticipants")}
        </span>
        <span className="flex items-center gap-1">
          <Check className="h-3 w-3" />
          {readyCount} {t("readyParticipants")}
        </span>
        {challenge.status === "active" && (
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            {completedCount} {t("completedParticipants")}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {hasUserCompleted ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleViewResults} className="text-xs font-semibold">
              <Trophy className="h-3.5 w-3.5 mr-1 text-amber-500" />
              {t("viewDetails") || "View Details"}
            </Button>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("youCompletedThisExam") || "You completed this exam"}
            </span>
          </div>
        ) : (
          <>
            {/* Pending challenge */}
            {challenge.status === "pending" && (
              <>
                {/* Creator view */}
                {isCreator && (
                  <>
                    <Button
                      size="sm"
                      onClick={handleStartExam}
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {t("enterWaitingRoom")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStart}
                      disabled={acting}
                      className="text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {t("startExamChallenge")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelChallenge}
                      disabled={acting}
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("cancelChallenge")}
                    </Button>
                  </>
                )}

                {/* Participant view - pending */}
                {!isCreator && myParticipation?.status === "pending" && (
                  <>
                    <Button size="sm" onClick={handleJoin} disabled={acting} className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {t("joinChallenge")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeny} disabled={acting} className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-3 w-3 mr-1" />
                      {t("denyChallenge")}
                    </Button>
                  </>
                )}

                {/* Participant view - joined */}
                {!isCreator && myParticipation?.status === "joined" && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleStartExam} className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {t("enterWaitingRoom")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeny}
                      disabled={acting}
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("leaveWaitingRoom")}
                    </Button>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      <span>{countdown}s</span>
                    </div>
                  </div>
                )}

                {/* Participant view - ready */}
                {!isCreator && myParticipation?.status === "ready" && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleStartExam} className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {t("enterWaitingRoom")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeny}
                      disabled={acting}
                      className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("leaveWaitingRoom")}
                    </Button>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("waitingForCreator")}
                    </p>
                  </div>
                )}

                {/* Creator: Remind joined-not-ready participants */}
                {isCreator &&
                  participants
                    .filter((p) => p.status === "joined")
                    .map((p) => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemind(p.id)}
                        disabled={acting}
                        className="text-xs"
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        {t("remindReady")} {p.profile?.username || p.profile?.full_name?.split(" ")[0]}
                      </Button>
                    ))}
              </>
            )}

            {/* Active challenge */}
            {challenge.status === "active" && (
              <>
                {myParticipation && ["joined", "ready", "in_progress"].includes(myParticipation.status) ? (
                  <Button size="sm" onClick={handleStartExam} disabled={acting} className="text-xs">
                    <Play className="h-3 w-3 mr-1" />
                    {t("startExam")}
                  </Button>
                ) : isCreator ? (
                  <Button size="sm" onClick={handleStartExam} disabled={acting} className="text-xs">
                    <Play className="h-3 w-3 mr-1" />
                    {t("startExam")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground py-1.5">{t("didNotJoin")}</p>
                )}
              </>
            )}

            {/* Completed challenge */}
            {challenge.status === "completed" && (
              <Button size="sm" variant="outline" onClick={handleViewResults} className="text-xs">
                <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                {t("viewDetails") || "View Details"}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Mini leaderboard for completed */}
      {(challenge.status === "completed" || challenge.status === "cancelled" || hasUserCompleted) && sortedCompletedParticipants.length > 0 && (
        <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
            <span>{t("leaderboard") || "Leaderboard"}</span>
            <span className="text-[10px] text-muted-foreground/70 font-normal">{t("tiesBrokenByTime") || "Ties broken by fastest time"}</span>
          </div>
          {sortedCompletedParticipants.slice(0, 3).map((p, idx) => {
            const attempt = (p as any).exam_attempt;
            const score = attempt?.score;
            const total = attempt?.total_questions || 20;
            const pct = attempt?.percentage ?? (score !== undefined && score !== null ? Math.round((Number(score) / total) * 100) : null);
            const duration = attempt?.duration_seconds;
            const formattedDuration =
              duration !== undefined && duration !== null
                ? `${Math.floor(Number(duration) / 60)}:${(Number(duration) % 60).toString().padStart(2, "0")}`
                : null;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                  idx === 0
                    ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-muted/30 border border-border/30"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="font-medium truncate text-foreground text-[11px]">
                    {p.profile?.full_name || p.profile?.username || "Classmate"}
                    {p.user_id === currentUserId ? ` (${t("you") || "You"})` : ""}
                  </span>
                  {idx === 0 && (
                    <Badge className="bg-amber-500 text-amber-950 font-bold text-[9px] px-1.5 py-0 h-4 border-none">
                      {t("winner") || "Winner"}
                    </Badge>
                  )}
                </div>
                {score !== undefined && score !== null && (
                  <div className="flex items-center gap-2 text-[11px] font-semibold shrink-0 text-foreground">
                    <span>{score}/{total} ({pct}%)</span>
                    {formattedDuration && (
                      <span className="text-[10px] text-muted-foreground font-normal">⏱ {formattedDuration}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
