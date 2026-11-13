"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users,
  Check,
  Clock,
  Play,
  ArrowLeft,
  Loader2,
  X,
  Trophy,
  AlertCircle,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Participant {
  user_id: string;
  status:
    | "pending"
    | "joined"
    | "ready"
    | "in_progress"
    | "rejected"
    | "completed"
    | "abandoned"
    | string;
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
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const canShowAvatar = (targetUserId: string, avatarUrl?: string | null) =>
    canViewUserAvatar(avatarUrl, targetUserId, user?.id, user?.user_metadata?.role);

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

  // Hide dock on mobile while waiting in lobby
  useEffect(() => {
    sessionStorage.setItem("group-creation-active", "true");
    window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    return () => {
      sessionStorage.removeItem("group-creation-active");
      window.dispatchEvent(new CustomEvent("group-creation-state-change"));
    };
  }, []);

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
      const res = await fetch(`/api/exam-challenges/${challengeId}`);
      if (res.ok) {
        const data = await res.json();
        const challengeData = data.challenge;
        if (challengeData) {
          setChallenge(challengeData);

          const now = Date.now();
          const durationMin =
            challengeData.category_settings?.duration_minutes || durationMinutes || 20;
          const maxDurationMs = (durationMin + 5) * 60 * 1000;
          const startedAtMs = challengeData.started_at
            ? new Date(challengeData.started_at).getTime()
            : null;
          const isExamTimeExpired =
            challengeData.status === "completed" ||
            challengeData.status === "cancelled" ||
            (challengeData.status === "active" &&
              startedAtMs &&
              now - startedAtMs > maxDurationMs);

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
            const diff = Math.max(
              0,
              joinWindowSeconds - Math.floor((Date.now() - refTime) / 1000)
            );
            setSecondsRemaining(diff);
          }
        }

        if (Array.isArray(data.participants)) {
          const enriched: Participant[] = data.participants.map((p: any) => ({
            user_id: p.user_id,
            status: p.status,
            profile: p.profile || null,
          }));
          setParticipants(enriched);
          return;
        }
      }

      const { data: challengeData } = await supabase
        .from("exam_challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

      if (challengeData) {
        setChallenge(challengeData);
      }

      const { data: participantsData } = await supabase
        .from("exam_challenge_participants")
        .select("user_id, status")
        .eq("challenge_id", challengeId);

      const userIds = (participantsData || []).map((p: any) => p.user_id);
      const profileMap: Record<string, any> = {};
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

  useEffect(() => {
    if (
      secondsRemaining === 0 &&
      challenge &&
      challenge.status === "pending" &&
      !hasStartedRef.current
    ) {
      const activeTakers = participants.some(
        (p) =>
          p.status === "in_progress" || p.status === "completed" || p.status === "ready"
      );
      if (!activeTakers) {
        fetch(`/api/exam-challenges/${challengeId}/expire`, { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "deleted") {
              const doneAtMsg = data.doneAt ? ` (${data.doneAt})` : "";
              toast.info(
                t("challengeExpiredDeleted") ||
                  `Group exam was cancelled and removed because no one took the exam${doneAtMsg}.`
              );
              onCancel();
            }
          })
          .catch((err) => console.error("Error expiring challenge:", err));
      }
    }
  }, [secondsRemaining, challenge, participants, challengeId, onCancel, t]);

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
        {
          event: "*",
          schema: "public",
          table: "exam_challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => fetchChallengeDetails()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenges",
          filter: `id=eq.${challengeId}`,
        },
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

    const pollTimer = setInterval(fetchChallengeDetails, 2500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [challengeId, supabase, fetchChallengeDetails]);

  const handleStartExam = async () => {
    if (starting || hasStartedRef.current) return;
    setStarting(true);

    try {
      if (challengeChannelRef.current) {
        challengeChannelRef.current.send({
          type: "broadcast",
          event: "exam_countdown",
          payload: { count: 3 },
        });
      }
      setCountdown(3);

      await fetch(`/api/exam-challenges/${challengeId}/start`, {
        method: "POST",
      });

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
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

  const getStatusMeta = (status: string, isHost: boolean) => {
    if (isHost && (status === "joined" || status === "ready")) {
      return {
        label: t("host") || "Host",
        tone: "text-amber-600 dark:text-amber-400",
        icon: <Crown className="h-3.5 w-3.5 shrink-0" />,
      };
    }
    switch (status) {
      case "in_progress":
        return {
          label: isRw ? "Aracyakora" : isFr ? "En cours" : "In exam",
          tone: "text-blue-600 dark:text-blue-400",
          icon: <Play className="h-3.5 w-3.5 shrink-0 fill-current" />,
        };
      case "joined":
      case "ready":
        return {
          label: isRw ? "Yinjiye" : isFr ? "Prêt" : "Joined",
          tone: "text-emerald-600 dark:text-emerald-400",
          icon: <Check className="h-3.5 w-3.5 shrink-0" />,
        };
      case "pending":
        return {
          label: isRw ? "Ategerejwe" : isFr ? "En attente" : "Pending",
          tone: "text-amber-600 dark:text-amber-400",
          icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
        };
      case "completed":
        return {
          label: isRw ? "Yararangiye" : isFr ? "Terminé" : "Finished",
          tone: "text-emerald-600 dark:text-emerald-400",
          icon: <Trophy className="h-3.5 w-3.5 shrink-0" />,
        };
      case "rejected":
        return {
          label: isRw ? "Yanze" : isFr ? "Refusé" : "Declined",
          tone: "text-rose-600 dark:text-rose-400",
          icon: <X className="h-3.5 w-3.5 shrink-0" />,
        };
      default:
        return {
          label: isRw ? "Yavuyemo" : isFr ? "Parti" : "Left",
          tone: "text-muted-foreground",
          icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
        };
    }
  };

  const orderedParticipants = [...participants].sort((a, b) => {
    const rank = (s: string) =>
      s === "joined" || s === "ready"
        ? 0
        : s === "in_progress"
        ? 1
        : s === "completed"
        ? 2
        : s === "pending"
        ? 3
        : 4;
    return rank(a.status) - rank(b.status);
  });

  const canStart = participants.some(
    (p) => p.status === "joined" || p.status === "ready" || p.status === "in_progress" || p.status === "completed"
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[320px] text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary mb-3" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("loadingGroupExam") || "Loading group exam..."}
        </p>
      </div>
    );
  }

  if (countdown !== null && countdown > 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl">
        <div className="text-center space-y-3 px-6">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
            {t("groupExamStarting") || "Starting"}
          </p>
          <div className="text-8xl sm:text-9xl font-black text-primary tracking-tighter tabular-nums">
            {countdown}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("getReadyExamStartsNow") || "Get ready!"}
          </p>
        </div>
      </div>
    );
  }

  if (isExpiredOrCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Trophy className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {t("groupExamCompletedTitle") || "Group Exam Completed"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("groupExamCompletedDesc") ||
              "This group challenge has ended. View the final rankings and scores."}
          </p>
        </div>
        <div className="w-full flex flex-col gap-2 pt-2">
          <Button
            onClick={() => {
              window.location.hash = `#classmates/group-results?id=${encodeURIComponent(challengeId)}`;
              window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
            }}
            className="w-full min-h-[40px] h-auto py-2 px-4 rounded-xl text-xs font-semibold whitespace-normal"
          >
            <Trophy className="h-4 w-4 shrink-0" />
            <span>{t("viewRankings") || "View Rankings"}</span>
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full min-h-[40px] h-auto py-2 px-4 rounded-xl text-xs font-medium whitespace-normal"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{t("backToDashboard") || "Back"}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-6 space-y-5">
        {/* Top Navigation & Timer */}
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4">
          <div className="min-w-0 space-y-1">
            <button
              type="button"
              onClick={handleLeaveOrCancel}
              disabled={starting || actionLoading}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{isCreator ? t("cancelExam") || "Cancel" : t("leaveExam") || "Leave"}</span>
            </button>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground truncate">
              {categoryName}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
              <span>{t("groupExam") || "Group Exam"}</span>
              <span aria-hidden="true">·</span>
              <span>{durationMinutes}m</span>
              <span aria-hidden="true">·</span>
              <span>{questionCount} Q</span>
            </div>
          </div>

          {secondsRemaining !== null && secondsRemaining > 0 && (
            <div className="text-right shrink-0">
              <span className="block text-[11px] text-muted-foreground">
                {t("joinWindow") || "Join window"}
              </span>
              <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {formatTimeMMSS(secondsRemaining)}
              </span>
            </div>
          )}
        </div>

        {/* Single Unified Participants Roster (No nested cards per status) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              {t("participants") || "Participants"}
            </span>
            <span>{orderedParticipants.length}</span>
          </div>

          <div className="border border-border/60 rounded-xl divide-y divide-border/50 overflow-hidden bg-card/40 dark:bg-zinc-900/30">
            {orderedParticipants.map((p) => {
              const isMe = p.user_id === user?.id;
              const isHost = p.user_id === challenge?.creator_id;
              const name = p.profile?.full_name || p.profile?.username || "Player";
              const statusMeta = getStatusMeta(p.status, isHost);

              return (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-1 ring-border/50 shrink-0">
                      {canShowAvatar(p.user_id, p.profile?.avatar_url) &&
                      p.profile?.avatar_url ? (
                        <AvatarImage src={p.profile.avatar_url} alt={name} />
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {getInitials(name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {name}
                        {isMe && (
                          <span className="ml-1.5 text-xs text-primary font-semibold">
                            ({t("you") || "You"})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{p.profile?.username || "student"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium shrink-0 whitespace-nowrap",
                      statusMeta.tone
                    )}
                  >
                    {statusMeta.icon}
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clean Docked Bottom Actions */}
      <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 dark:bg-zinc-950/95 backdrop-blur-xl px-3.5 sm:px-6 py-3 space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleLeaveOrCancel}
            disabled={starting || actionLoading}
            className="min-h-[42px] h-auto py-2.5 px-4 flex-1 rounded-xl text-xs sm:text-sm font-medium border-destructive/30 text-destructive hover:bg-destructive/10 whitespace-normal text-center"
          >
            <X className="h-4 w-4 shrink-0" />
            <span>{isCreator ? t("cancelExam") || "Cancel Exam" : t("leaveRoom") || "Leave Room"}</span>
          </Button>

          <Button
            type="button"
            onClick={handleStartExam}
            disabled={starting || !canStart}
            className="min-h-[42px] h-auto py-2.5 px-4 flex-1 rounded-xl text-xs sm:text-sm font-semibold whitespace-normal text-center"
          >
            {starting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>{t("startingExam") || "Starting Exam..."}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current shrink-0" />
                <span>{t("startExamNow") || "Start Exam"}</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground leading-snug">
          {isCreator
            ? t("creatorCanStartImmediately") ||
              "Starting launches a 3-second synchronized countdown for everyone."
            : t("anyPlayerCanStart") ||
              "Starting launches a 3-second synchronized countdown for everyone."}
        </p>
      </div>
    </div>
  );
}
