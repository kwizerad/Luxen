"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Trophy, Users, Check, X, Play, Clock, Loader2, Bell, Medal, Timer } from "lucide-react";
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
          if (updated) setParticipants(updated as any);
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

  const joinedCount = participants.filter((p) => ["joined", "ready", "completed"].includes(p.status)).length;
  const readyCount = participants.filter((p) => ["ready", "completed"].includes(p.status)).length;
  const completedCount = participants.filter((p) => p.status === "completed").length;
  const totalParticipants = participants.length;

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
            {myParticipation && ["joined", "ready", "completed"].includes(myParticipation.status) ? (
              myParticipation.status === "completed" ? (
                <Button size="sm" variant="outline" onClick={handleViewResults} className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  {t("viewChallengeResults")}
                </Button>
              ) : (
                <Button size="sm" onClick={handleStartExam} disabled={acting} className="text-xs">
                  <Play className="h-3 w-3 mr-1" />
                  {t("startExam")}
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground py-1.5">{t("didNotJoin")}</p>
            )}
          </>
        )}

        {/* Completed challenge */}
        {challenge.status === "completed" && (
          <Button size="sm" variant="outline" onClick={handleViewResults} className="text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            {t("viewChallengeResults")}
          </Button>
        )}
      </div>

      {/* Mini leaderboard for completed */}
      {challenge.status === "completed" && completedCount > 0 && (
        <div className="mt-3 space-y-1">
          {participants
            .filter((p) => p.status === "completed")
            .slice(0, 3)
            .map((p, idx) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <Medal
                  className={`h-3.5 w-3.5 ${
                    idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-orange-400"
                  }`}
                />
                <span className="font-medium">{p.profile?.full_name || p.profile?.username}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
