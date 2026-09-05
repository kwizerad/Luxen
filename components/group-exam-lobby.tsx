"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Users, Check, Clock, Play, ArrowLeft, Loader2, X, Trophy, Zap, AlertCircle, Crown, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Participant {
  user_id: string;
  status: "pending" | "joined" | "ready" | "in_progress" | "rejected" | "completed" | "abandoned" | string;
  profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

function formatTimeMMSS(seconds: number | null) {
  if (seconds === null || seconds === undefined || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface GroupExamLobbyProps {
  challengeId: string;
  categoryName: string;
  durationMinutes?: number;
  questionCount?: number;
  securitySettings?: {
    fullscreenEnabled: boolean;
    tabSwitchEnabled: boolean;
    rightClickEnabled: boolean;
    aiDetectionEnabled: boolean;
  };
  onStart: () => void;
  onCancel: () => void;
}

export function GroupExamLobby({
  challengeId,
  categoryName,
  durationMinutes = 20,
  questionCount = 20,
  onStart,
  onCancel,
}: GroupExamLobbyProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [joinWindowSeconds, setJoinWindowSeconds] = useState<number>(120);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [isExpiredOrCompleted, setIsExpiredOrCompleted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const hasStartedRef = useRef(false);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const challengeChannelRef = useRef<any>(null);
  const isFetchingRef = useRef(false);

  // Fetch join window config from system config
  useEffect(() => {
    async function loadConfig() {
      try {
        const { data } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "group_exam_join_window_seconds")
          .maybeSingle();
        if (data?.value) {
          const s = parseInt(data.value, 10);
          if (!isNaN(s) && s > 0) {
            setJoinWindowSeconds(s);
          }
        }
      } catch (err) {
        console.warn("Failed to load join window config:", err);
      }
    }
    loadConfig();
  }, [supabase]);

  const fetchChallengeDetails = useCallback(async () => {
    if (!challengeId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { data: challengeData } = await supabase
        .from("exam_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

      if (challengeData) {
        setChallenge(challengeData);

        const now = Date.now();
        const durationMin = (challengeData.category_settings?.duration_minutes || durationMinutes || 20);
        const maxDurationMs = (durationMin + 5) * 60 * 1000;
        const startedAtMs = challengeData.started_at ? new Date(challengeData.started_at).getTime() : null;
        const isExamTimeExpired =
          challengeData.status === "completed" ||
          challengeData.status === "cancelled" ||
          (challengeData.status === "active" && startedAtMs && (now - startedAtMs > maxDurationMs));

        if (isExamTimeExpired) {
          setIsExpiredOrCompleted(true);
        } else if (challengeData.status === "active") {
          if (!hasStartedRef.current) {
            hasStartedRef.current = true;
            onStartRef.current();
          }
        }

        const refTimeStr = challengeData.started_at || challengeData.created_at;
        if (refTimeStr) {
          const refTime = new Date(refTimeStr).getTime();
          const diff = Math.max(0, joinWindowSeconds - Math.floor((Date.now() - refTime) / 1000));
          setSecondsRemaining(diff);
        }
      }

      const { data: participantsData, error } = await supabase
        .from("exam_challenge_participants")
        .select("user_id, status")
        .eq("challenge_id", challengeId);

      if (error) throw error;

      const userIds = (participantsData || []).map((p: any) => p.user_id);
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", userIds);
        for (const p of profiles || []) {
          profileMap[p.id] = p;
        }
      }

      const enriched: Participant[] = (participantsData || []).map((p: any) => ({
        user_id: p.user_id,
        status: p.status,
        profile: profileMap[p.user_id] || null,
      }));

      setParticipants(enriched);
    } catch (err) {
      console.error("Error fetching challenge details:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [challengeId, durationMinutes, joinWindowSeconds, supabase]);

  // Window countdown timer
  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // Synchronized countdown runner
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        onStartRef.current();
      }
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Real-time channel for challenge state updates & countdown sync
  useEffect(() => {
    if (!challengeId) return;

    fetchChallengeDetails();

    const channelName = `exam_challenge_${challengeId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `challenge_id=eq.${challengeId}` },
        () => fetchChallengeDetails()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges", filter: `id=eq.${challengeId}` },
        (payload: any) => {
          if (payload.new?.status === "active") {
            if (!hasStartedRef.current) {
              hasStartedRef.current = true;
              onStartRef.current();
            }
          } else {
            fetchChallengeDetails();
          }
        }
      )
      .on("broadcast", { event: "exam_countdown" }, (payload: any) => {
        const count = payload.payload?.count ?? 3;
        setCountdown(count);
      })
      .on("broadcast", { event: "exam_started" }, () => {
        if (!hasStartedRef.current) {
          hasStartedRef.current = true;
          onStartRef.current();
        }
      })
      .subscribe();

    challengeChannelRef.current = channel;

    const pollTimer = setInterval(fetchChallengeDetails, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [challengeId, supabase, fetchChallengeDetails]);

  // Start exam flow with synchronized 3s countdown
  const handleStartExam = async () => {
    if (starting || hasStartedRef.current) return;
    setStarting(true);

    try {
      // 1. Trigger synchronized countdown across all clients
      if (challengeChannelRef.current) {
        challengeChannelRef.current.send({
          type: "broadcast",
          event: "exam_countdown",
          payload: { count: 3 },
        });
      }
      setCountdown(3);

      // 2. Mark challenge active on backend
      await fetch(`/api/exam-challenges/${challengeId}/start`, {
        method: "POST",
      });

      // 3. Fallback broadcast start
      setTimeout(() => {
        if (challengeChannelRef.current) {
          challengeChannelRef.current.send({
            type: "broadcast",
            event: "exam_started",
            payload: { challengeId },
          });
        }
      }, 3000);
    } catch (error) {
      console.error("Failed to start group exam:", error);
      toast.error(t("failedToStartExam") || "Failed to start exam");
      setStarting(false);
      setCountdown(null);
    }
  };

  // Toggle ready status for participant
  const handleToggleReady = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const myParticipant = participants.find((p) => p.user_id === user?.id);
      const isReady = myParticipant?.status === "ready";
      const endpoint = isReady
        ? `/api/exam-challenges/${challengeId}/join`
        : `/api/exam-challenges/${challengeId}/ready`;

      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchChallengeDetails();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  // Leave / Cancel Room
  const handleLeaveOrCancel = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const isCreator = challenge?.creator_id === user?.id;
      if (isCreator) {
        const res = await fetch(`/api/exam-challenges/${challengeId}`, { method: "DELETE" });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to cancel");
        }
        toast.success(t("examCancelledSuccess") || "Exam challenge cancelled");
      } else {
        const res = await fetch(`/api/exam-challenges/${challengeId}/deny`, { method: "POST" });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Failed to leave");
        }
        toast.success(t("examLeftSuccess") || "Left exam room");
      }
      onCancel();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Action failed";
      toast.error(msg);
      setActionLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isCreator = challenge?.creator_id === user?.id;
  const myParticipant = participants.find((p) => p.user_id === user?.id);
  const isMeReady = myParticipant?.status === "ready";

  const joinedParticipants = participants.filter((p) => p.status === "joined" || p.status === "ready");
  const inProgressParticipants = participants.filter((p) => p.status === "in_progress");
  const finishedParticipants = participants.filter((p) => p.status === "completed");
  const pendingParticipants = participants.filter((p) => p.status === "pending");
  const abandonedParticipants = participants.filter((p) => p.status === "abandoned");
  const rejectedParticipants = participants.filter((p) => p.status === "rejected");

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">{t("loadingGroupExam") || "Loading group exam..."}</p>
      </div>
    );
  }

  // Active Synchronized Countdown Overlay
  if (countdown !== null && countdown > 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl animate-in fade-in duration-300">
        <div className="text-center space-y-4">
          <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-bold px-3 py-1 animate-pulse">
            {t("groupExamStarting") || "Exam Starting..."}
          </Badge>
          <div className="text-8xl sm:text-9xl font-black text-primary tracking-tighter animate-bounce">
            {countdown}
          </div>
          <p className="text-base font-medium text-muted-foreground">
            {t("getReadyExamStartsNow") || "Get ready! The exam starts in a few seconds."}
          </p>
        </div>
      </div>
    );
  }

  if (isExpiredOrCompleted) {
    return (
      <div className="relative min-h-[calc(100vh-80px)] p-4 sm:p-6 flex flex-col items-center justify-center pb-24">
        <div className="w-full max-w-md mx-auto">
          <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur-xl shadow-xl rounded-2xl sm:rounded-3xl p-6 text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {t("groupExamCompletedTitle") || "Ikizamini Cy'Itsinda Cyararangiye"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {t("groupExamCompletedDesc") || "This group challenge has ended. You can view the final rankings and scores."}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => {
                  window.location.href = `/dashboard#classmates/group-results?id=${challengeId}`;
                }}
                className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-2"
              >
                <Trophy className="h-4 w-4" />
                <span>{t("viewRankings") || "View Rankings"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full h-11 rounded-xl text-xs font-semibold gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t("backToDashboard") || "Back to Dashboard"}</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-80px)] p-4 sm:p-6 flex flex-col items-center justify-start pb-24">
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Top Bar: Back/Cancel and Join Window */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveOrCancel}
            disabled={starting || actionLoading}
            className="text-xs font-medium text-muted-foreground hover:text-destructive gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isCreator ? t("cancelExam") : t("leaveExam")}</span>
          </Button>

          {secondsRemaining !== null && secondsRemaining > 0 && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs py-1 px-2.5">
              <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              {t("joinWindow") || "Join window"}: {formatTimeMMSS(secondsRemaining)}
            </Badge>
          )}
        </div>

        {/* Main Group Exam Card */}
        <Card className="border-2 border-primary/20 bg-background/95 backdrop-blur-xl shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b pb-5 pt-6 px-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[11px] font-bold px-2 py-0.5">
                    {t("groupExam") || "Group Exam"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">• {durationMinutes}m • {questionCount} Qs</span>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold truncate mt-1 text-foreground">
                  {categoryName}
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Section 1: Joined Players / Ready */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  {t("joinedPlayers") || "In Lobby / Ready"} ({joinedParticipants.length})
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {joinedParticipants.filter((p) => p.status === "ready" || p.user_id === challenge?.creator_id).length}/{joinedParticipants.length} {t("ready") || "ready"}
                </span>
              </div>

              <div className="space-y-2">
                {joinedParticipants.map((p) => {
                  const isMe = p.user_id === user?.id;
                  const isHost = p.user_id === challenge?.creator_id;
                  const isReady = p.status === "ready" || isHost;
                  const name = p.profile?.full_name || p.profile?.username || "Player";

                  return (
                    <div
                      key={p.user_id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                        isReady
                          ? "border-emerald-500/30 bg-emerald-500/5 shadow-xs"
                          : "border-border/60 bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <Avatar className={cn("h-10 w-10 ring-2", isReady ? "ring-emerald-500/40" : "ring-border")}>
                            {p.profile?.avatar_url ? (
                              <AvatarImage src={p.profile.avatar_url} alt={name} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {getInitials(name)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {isHost && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs">
                              <Crown className="h-2.5 w-2.5 fill-current" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground truncate">
                              {name}
                            </p>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-primary text-primary-foreground leading-none">
                                {t("youBadge") || "YOU"}
                              </span>
                            )}
                            {isHost && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 font-bold border-amber-500/40 text-amber-600 dark:text-amber-400">
                                {t("host") || "HOST"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">@{p.profile?.username || "student"}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isReady ? (
                          <Badge className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1">
                            <Check className="h-3 w-3 mr-1" />
                            {isHost ? t("ready") || "Host" : t("ready") || "Ready"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground px-2.5 py-1">
                            <Clock className="h-3 w-3 mr-1 animate-pulse" />
                            {t("joined") || "In Lobby"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Active / Finished */}
            {(inProgressParticipants.length > 0 || finishedParticipants.length > 0) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" />
                    {t("activeExams") || "In Progress / Finished"} ({inProgressParticipants.length + finishedParticipants.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {inProgressParticipants.map((p) => {
                    const isMe = p.user_id === user?.id;
                    const name = p.profile?.full_name || p.profile?.username || "Player";
                    return (
                      <div key={p.user_id} className="flex items-center justify-between p-3 rounded-xl border border-blue-500/30 bg-blue-500/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 ring-2 ring-blue-500/30">
                            <AvatarImage src={p.profile?.avatar_url} />
                            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{name} {isMe && <span className="text-xs text-primary font-medium">({t("youBadge") || "You"})</span>}</p>
                            <p className="text-xs text-muted-foreground">@{p.profile?.username || "student"}</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-500 text-white text-xs font-semibold px-2.5 py-1">
                          <Play className="h-3 w-3 mr-1 animate-pulse fill-current" />
                          {t("takingExam") || "Taking Exam"}
                        </Badge>
                      </div>
                    );
                  })}

                  {finishedParticipants.map((p) => {
                    const isMe = p.user_id === user?.id;
                    const name = p.profile?.full_name || p.profile?.username || "Player";
                    return (
                      <div key={p.user_id} className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 ring-2 ring-emerald-500/30">
                            <AvatarImage src={p.profile?.avatar_url} />
                            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{name} {isMe && <span className="text-xs text-primary font-medium">({t("youBadge") || "You"})</span>}</p>
                            <p className="text-xs text-muted-foreground">@{p.profile?.username || "student"}</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1">
                          <Trophy className="h-3 w-3 mr-1" />
                          {t("finished") || "Finished"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Pending Invites */}
            {pendingParticipants.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {t("waitingForJoin") || "Invited / Not Joined Yet"} ({pendingParticipants.length})
                  </span>
                  {secondsRemaining !== null && (
                    <span className="text-[11px] font-semibold">
                      {secondsRemaining > 0 ? `${formatTimeMMSS(secondsRemaining)} left` : t("timeExpired") || "Expired"}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {pendingParticipants.map((p) => {
                    const name = p.profile?.full_name || p.profile?.username || "Friend";
                    return (
                      <div key={p.user_id} className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 opacity-80">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8 ring-1 ring-amber-500/30">
                            <AvatarImage src={p.profile?.avatar_url} />
                            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{name}</p>
                            <p className="text-[10px] text-muted-foreground">@{p.profile?.username || "friend"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs px-2 py-0.5">
                          <Clock className="h-3 w-3 mr-1 animate-pulse" />
                          {secondsRemaining !== null && secondsRemaining > 0 ? formatTimeMMSS(secondsRemaining) : t("notYetJoined") || "Pending"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 4: Left / Abandoned / Rejected */}
            {(abandonedParticipants.length > 0 || rejectedParticipants.length > 0) && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {t("leftOrDeclined") || "Left / Declined"} ({abandonedParticipants.length + rejectedParticipants.length})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {abandonedParticipants.map((p) => {
                    const name = p.profile?.full_name || p.profile?.username || "Friend";
                    return (
                      <div key={p.user_id} className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/10 opacity-70">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 grayscale opacity-60">
                            <AvatarImage src={p.profile?.avatar_url} />
                            <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium truncate">{name}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {t("abandoned") || "Left"}
                        </Badge>
                      </div>
                    );
                  })}
                  {rejectedParticipants.map((p) => {
                    const name = p.profile?.full_name || p.profile?.username || "Friend";
                    return (
                      <div key={p.user_id} className="flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/10 opacity-70">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 grayscale opacity-60">
                            <AvatarImage src={p.profile?.avatar_url} />
                            <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
                          </Avatar>
                          <p className="text-xs font-medium truncate">{name}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-destructive">
                          {t("declined") || "Declined"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2">
                {!isCreator && (
                  <Button
                    onClick={handleToggleReady}
                    disabled={starting || actionLoading}
                    variant={isMeReady ? "outline" : "default"}
                    className={cn(
                      "flex-1 h-12 rounded-xl text-sm font-bold transition-all",
                      isMeReady ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10" : "bg-emerald-600 text-white hover:bg-emerald-700"
                    )}
                  >
                    {isMeReady ? (
                      <>
                        <Check className="h-4 w-4 mr-1.5" />
                        {t("ready") || "You Are Ready"}
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1.5" />
                        {t("markReady") || "I Am Ready"}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleStartExam}
                  disabled={starting || joinedParticipants.length === 0}
                  className={cn(
                    "h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg hover:opacity-95 transition-all",
                    isCreator ? "w-full" : "flex-1"
                  )}
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("startingExam") || "Starting Exam..."}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2 fill-current" />
                      {t("startExamNow") || "Start Exam (3s Countdown)"}
                    </>
                  )}
                </Button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                {isCreator
                  ? t("creatorCanStartImmediately") || "As host, clicking Start Exam launches a 3-second synchronized countdown for everyone in the room."
                  : t("anyPlayerCanStart") || "Click Start Exam when ready to begin the 3-second synchronized countdown."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
