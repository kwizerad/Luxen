"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Send, Loader2, Users, UserPlus, MessageCircle, Trophy, X, Check, CheckCheck, ArrowLeft, Eye, EyeOff, Bell, Clock, Play, Smile, Heart, Sparkles, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "👏"] as const;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  isGroupExamEnabled,
  getCachedGroupExamEnabled,
} from "@/lib/feature-flags";
import { ClassmatesViewSkeleton } from "@/components/skeletons";
import type { ChatMessage, ExamChallenge, ExamChallengeParticipant } from "@/lib/database.types";
import { toast } from "sonner";

interface ClassmatesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface FriendProfile {
  id: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
}

interface ClassmateRequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  other_user: FriendProfile;
  direction: "sent" | "received";
}

interface ChallengeWithParticipants extends ExamChallenge {
  participants?: (ExamChallengeParticipant & { 
    profile?: FriendProfile;
    exam_attempt?: { score?: number; percentage?: number };
  })[];
  creator_profile?: FriendProfile;
}

function MessageTicks({ msg }: { msg: ChatMessage }) {
  if (msg.is_read) {
    return <CheckCheck className="inline-block h-3 w-3 text-sky-500" />;
  } else if (msg.delivered_at) {
    return <CheckCheck className="inline-block h-3 w-3 text-muted-foreground" />;
  } else {
    return <Check className="inline-block h-3 w-3 text-muted-foreground" />;
  }
}

function ChatExamInviteBanner({
  challenge,
  currentUserId,
  selectedFriend,
  onRespond,
  navigate,
  t,
}: {
  challenge: ChallengeWithParticipants;
  currentUserId: string;
  selectedFriend: FriendProfile;
  onRespond: (challengeId: string, accept: boolean) => Promise<void>;
  navigate?: (view: string, params?: Record<string, string>) => void;
  t: (key: string) => string;
}) {
  const [acting, setActing] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);

  useEffect(() => {
    if (!challenge.created_at) return;
    const createdAt = new Date(challenge.created_at).getTime();
    const updateTicker = () => {
      const remaining = Math.max(0, 30 - Math.floor((Date.now() - createdAt) / 1000));
      setSecondsRemaining(remaining);
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [challenge.created_at]);

  const myParticipation = challenge.participants?.find((p) => p.user_id === currentUserId);
  const isCreator = challenge.creator_id === currentUserId;
  const isExpired = secondsRemaining <= 0;

  const inviterName =
    challenge.creator_profile?.full_name ||
    challenge.creator_profile?.username ||
    selectedFriend.full_name ||
    selectedFriend.username ||
    "Classmate";

  // If user is invited and pending
  if (myParticipation?.status === "pending" && !isCreator && challenge.status === "pending") {
    if (isExpired) {
      return (
        <div className="mb-2 rounded-xl border border-muted bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("challengeExpired") || "Exam request expired (30s time limit reached)"}</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground">30s Expired</Badge>
        </div>
      );
    }

    return (
      <div className="mb-2 rounded-2xl border-2 border-primary/40 bg-primary/10 p-3 shadow-md animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground truncate">
                  {inviterName} {t("invitedYouToExam") ? t("invitedYouToExam").replace("{username}", "") : "invited you to a Group Exam"}
                </p>
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 px-1.5 py-0.5">
                  <Clock className="h-2.5 w-2.5 mr-1 animate-spin" />
                  {secondsRemaining}s
                </Badge>
              </div>
              {challenge.category_name && (
                <p className="text-xs text-muted-foreground truncate font-medium">{challenge.category_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              size="sm"
              disabled={acting || isExpired}
              onClick={async () => {
                setActing(true);
                try {
                  await onRespond(challenge.id, true);
                  window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
                } finally {
                  setActing(false);
                }
              }}
              className="h-8 px-3.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm"
            >
              {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `${t("join") || "Join"} (${secondsRemaining}s)`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={acting}
              onClick={async () => {
                setActing(true);
                try {
                  await onRespond(challenge.id, false);
                } finally {
                  setActing(false);
                }
              }}
              className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              {t("reject") || "Reject"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If user is creator and invitation is pending
  if (isCreator && challenge.status === "pending") {
    return (
      <div className="mb-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground truncate">
                {t("examRequestSent") || "Group Exam Request Sent"}
              </span>
              {secondsRemaining > 0 ? (
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 px-1.5 py-0.5">
                  <Clock className="h-2.5 w-2.5 mr-1 animate-spin" />
                  {secondsRemaining}s
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">30s Expired</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {challenge.category_name} • {selectedFriend.full_name || selectedFriend.username}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
          }}
          className="h-8 px-3.5 text-xs font-bold self-end sm:self-auto shrink-0 bg-primary text-primary-foreground shadow-sm"
        >
          <Play className="h-3 w-3 mr-1" />
          {t("joinRoom") || "Join / Enter Room"} {secondsRemaining > 0 ? `(${secondsRemaining}s)` : ""}
        </Button>
      </div>
    );
  }

  // If challenge is active and joined by user
  if (challenge.status === "active" && (myParticipation?.status === "joined" || isCreator)) {
    return (
      <div className="mb-2 rounded-xl border border-green-500/30 bg-green-500/10 p-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs font-bold truncate text-foreground">
            {t("examInProgress") || "Group Exam Active"}: {challenge.category_name}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
          }}
          className="h-7 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white shrink-0"
        >
          <Play className="h-3 w-3 mr-1 fill-current" />
          {t("enterExam") || "Enter Exam"}
        </Button>
      </div>
    );
  }

  return null;
}

function ExamInvitationsContent({ 
  user, 
  supabase, 
  t, 
  navigate, 
  searchQuery = "", 
  onPendingCountChange, 
  onOpenCreateExam 
}: { 
  user: any; 
  supabase: any; 
  t: any; 
  navigate: (view: string, params?: Record<string, string>) => void; 
  searchQuery?: string; 
  onPendingCountChange?: (count: number) => void; 
  onOpenCreateExam?: () => void; 
}) {
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing");
  const [now, setNow] = useState<number>(Date.now());
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/exam-challenges");
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
      toast.error(t("failedToLoadChallenges") || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  useEffect(() => {
    if (!user) return;

    const channelName = `exam_challenges:${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges" },
        () => fetchChallenges()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `user_id=eq.${user.id}` },
        () => fetchChallenges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchChallenges]);

  // Compute pending non-expired count
  const pendingActiveCount = challenges.filter((c) => {
    const p = c.participants?.find((x) => x.user_id === user?.id);
    if (p?.status !== "pending") return false;
    const createdAt = c.created_at ? new Date(c.created_at).getTime() : 0;
    const secondsLeft = Math.max(0, 30 - Math.floor((now - createdAt) / 1000));
    return secondsLeft > 0;
  }).length;

  useEffect(() => {
    if (onPendingCountChange) {
      onPendingCountChange(pendingActiveCount);
    }
  }, [pendingActiveCount, onPendingCountChange]);

  const handleRespondToInvitation = async (challengeId: string, categoryId: string | undefined, accept: boolean) => {
    const actionKey = `${challengeId}-${accept ? "join" : "deny"}`;
    setActionLoadingKey(actionKey);
    try {
      const endpoint = accept ? `/api/exam-challenges/${challengeId}/join` : `/api/exam-challenges/${challengeId}/deny`;
      const res = await fetch(endpoint, { method: "POST" });
      
      if (res.ok) {
        toast.success(accept ? (t("invitationAccepted") || "Invitation accepted") : (t("invitationDeclined") || "Invitation declined"));
        await fetchChallenges();
        if (accept) {
          window.location.href = `/dashboard/exam?challenge_id=${challengeId}&category_id=${categoryId || ""}`;
        }
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespond") || "Failed to respond");
      }
    } catch (error) {
      console.error("Failed to respond to invitation:", error);
      toast.error(t("failedToRespond") || "Failed to respond");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleCancelChallenge = async (challengeId: string) => {
    const actionKey = `${challengeId}-cancel`;
    setActionLoadingKey(actionKey);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("examCancelledSuccess") || "Ikizamini cyahagaritswe neza.");
        await fetchChallenges();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel exam challenge");
      }
    } catch (error) {
      console.error("Failed to cancel challenge:", error);
      toast.error("Failed to cancel exam challenge");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    const actionKey = `${challengeId}-leave`;
    setActionLoadingKey(actionKey);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/deny`, { method: "POST" });
      if (res.ok) {
        toast.success(t("examLeftSuccess") || "Wavuye mu cyumba cy'ikizamini.");
        await fetchChallenges();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to leave exam room");
      }
    } catch (error) {
      console.error("Failed to leave challenge:", error);
      toast.error("Failed to leave exam room");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isWithin60Min = (c: ChallengeWithParticipants) => {
    if (!c.created_at) return true;
    return Date.now() - new Date(c.created_at).getTime() <= 60 * 60 * 1000;
  };

  const ongoingCount = challenges.filter((c) => {
    if (!isWithin60Min(c)) return false;
    const p = c.participants?.find((x) => x.user_id === user?.id);
    const hasCompleted = p?.status === "completed" || Boolean(p?.exam_attempt_id) || c.status === "completed";
    if (hasCompleted) return false;
    const isParticipantOrCreator = p?.status === "joined" || p?.status === "ready" || p?.status === "pending" || c.creator_id === user?.id;
    return isParticipantOrCreator && (c.status === "active" || c.status === "pending");
  }).length;

  const completedCount = challenges.filter((c) => {
    if (!isWithin60Min(c)) return false;
    const p = c.participants?.find((x) => x.user_id === user?.id);
    return c.status === "completed" || p?.status === "completed" || Boolean(p?.exam_attempt_id);
  }).length;

  const filteredChallenges = challenges
    .filter((c) => isWithin60Min(c))
    .filter((challenge) => {
      const userParticipation = challenge.participants?.find((p) => p.user_id === user?.id);
      if (!userParticipation && challenge.creator_id !== user?.id) return false;

      const hasCompleted = userParticipation?.status === "completed" || Boolean(userParticipation?.exam_attempt_id) || challenge.status === "completed";

      if (activeTab === "ongoing") {
        return !hasCompleted && (challenge.status === "pending" || challenge.status === "active");
      }
      if (activeTab === "completed") {
        return hasCompleted;
      }
      return false;
    })
    .filter((challenge) => {
      if (!searchQuery?.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const catName = (challenge.category_name || "").toLowerCase();
      const creatorName = (challenge.creator_profile?.full_name || challenge.creator_profile?.username || "").toLowerCase();
      return catName.includes(q) || creatorName.includes(q);
    })
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs font-medium">{t("loading") || "Birimo gushakishwa..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Sub Tabs Pill Navigation */}
      <div className="p-3 border-b bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex gap-1.5 p-1 bg-muted/80 rounded-xl">
          <button
            onClick={() => setActiveTab("ongoing")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ongoing"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span className="truncate">{t("ongoing") || "Biri Gukorwa"}</span>
            {ongoingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {ongoingCount > 99 ? "99+" : ongoingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "completed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span className="truncate">{t("completed") || "Byarangiye"}</span>
            {completedCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-muted-foreground/20 text-foreground text-[10px] font-bold">
                {completedCount > 99 ? "99+" : completedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Challenges List View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed bg-card/40 my-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              {activeTab === "ongoing" ? (
                <Play className="h-6 w-6" />
              ) : (
                <Trophy className="h-6 w-6" />
              )}
            </div>
            <h4 className="text-sm font-bold text-foreground mb-1">
              {activeTab === "ongoing"
                ? t("noOngoingExams") || "Nta kizamini kiri gukorwa ubu"
                : t("noCompletedExams") || "Nta bizamini byarangiye biraboneka"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
              {activeTab === "ongoing"
                ? t("noOngoingExamsDesc") || "All group exams you joined that are in progress appear here."
                : t("noCompletedExamsDesc") || "Group exams completed along with final scores are stored here."}
            </p>
            {onOpenCreateExam && (
              <Button
                size="sm"
                onClick={onOpenCreateExam}
                className="gap-1.5 rounded-xl text-xs font-bold shadow-sm"
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>{t("prepareNewGroupExam") || "Prepare New Group Exam"}</span>
              </Button>
            )}
          </div>
        ) : (
          filteredChallenges.map((challenge) => {
            const userParticipation = challenge.participants?.find((p) => p.user_id === user?.id);
            const hasCompleted = userParticipation?.status === "completed" || Boolean(userParticipation?.exam_attempt_id) || challenge.status === "completed";
            const isPending = userParticipation?.status === "pending" && !hasCompleted;
            const isOngoing = (userParticipation?.status === "joined" || challenge.creator_id === user?.id) && challenge.status === "active" && !hasCompleted;
            const isCompleted = hasCompleted;

            const createdAt = challenge.created_at ? new Date(challenge.created_at).getTime() : Date.now();
            const secondsLeft = Math.max(0, 30 - Math.floor((now - createdAt) / 1000));
            const isExpired = isPending && secondsLeft <= 0;
            const isActivePending = isPending && secondsLeft > 0;

            return (
              <div
                key={challenge.id}
                className={`rounded-2xl border transition-all duration-200 p-3.5 sm:p-4 shadow-sm ${
                  isActivePending
                    ? "bg-card border-primary/40 ring-1 ring-primary/20 shadow-md"
                    : isExpired
                    ? "bg-card/40 border-border/60 opacity-85"
                    : isOngoing
                    ? "bg-card border-blue-500/40 ring-1 ring-blue-500/20"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                {/* Header: Title + Status Badge */}
                <div className="flex items-start justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isActivePending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : isExpired
                          ? "bg-muted text-muted-foreground"
                          : isOngoing
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Trophy className="h-4 w-4" />
                      ) : isOngoing ? (
                        <Play className="h-4 w-4 fill-current" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate leading-tight">
                        {challenge.category_name || "Ikizamini cy'Amategeko y'Umuhanda"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {challenge.created_at ? formatDistanceToNow(new Date(challenge.created_at), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="shrink-0">
                    {isActivePending ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 px-2.5 py-0.5 animate-pulse flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3 animate-spin" />
                        <span>{secondsLeft}s {t("left") || "zisigaye"}</span>
                      </Badge>
                    ) : isExpired ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium text-muted-foreground bg-muted/40 border-border/60 px-2.5 py-0.5"
                      >
                        {t("expired") || "Byarenze Igihe"}
                      </Badge>
                    ) : isOngoing ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 px-2.5 py-0.5 flex items-center gap-1.5"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                        <span>{t("ongoing") || "Biri Gukorwa"}</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-2.5 py-0.5 flex items-center gap-1"
                      >
                        <Trophy className="h-3 w-3" />
                        <span>{t("completed") || "Byarangiye"}</span>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Creator and Participants Details */}
                <div className="space-y-2 mb-3 bg-muted/30 dark:bg-muted/20 rounded-xl p-2.5 border border-border/40 text-xs">
                  <div className="flex items-center justify-between gap-2 text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px]">{t("createdBy") || "Cyateguwe na"}:</span>
                      <span className="font-semibold text-foreground truncate">
                        {challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Classmate"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {t("participants") || "Abitabiriye"} ({challenge.participants?.length || 0}):
                    </span>
                    <div className="flex items-center -space-x-1.5">
                      {challenge.participants?.slice(0, 4).map((participant) => (
                        <Avatar key={participant.id} className="w-5 h-5 border-2 border-card ring-1 ring-border/20">
                          {participant.profile?.avatar_url ? (
                            <AvatarImage src={participant.profile.avatar_url} />
                          ) : (
                            <AvatarFallback className="text-[7px] font-bold bg-primary/20 text-primary">
                              {getInitials(participant.profile?.full_name || participant.profile?.username)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      ))}
                      {(challenge.participants?.length || 0) > 4 && (
                        <div className="w-5 h-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                          +{(challenge.participants?.length || 0) - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Leaderboard preview for completed challenges */}
                {isCompleted && challenge.participants && (
                  <div className="space-y-1.5 mb-3">
                    {challenge.participants
                      .filter((p) => p.status === "completed" || Boolean(p.exam_attempt_id) || Boolean((p as any).exam_attempt))
                      .slice()
                      .sort((a, b) => {
                        const aAttempt = (a as any).exam_attempt;
                        const bAttempt = (b as any).exam_attempt;
                        const aScore = aAttempt?.score !== undefined ? Number(aAttempt.score) : -1;
                        const bScore = bAttempt?.score !== undefined ? Number(bAttempt.score) : -1;
                        const aTotal = aAttempt?.total_questions || 20;
                        const bTotal = bAttempt?.total_questions || 20;
                        const aPct = aAttempt?.percentage ?? (aScore >= 0 ? Math.round((aScore / aTotal) * 100) : -1);
                        const bPct = bAttempt?.percentage ?? (bScore >= 0 ? Math.round((bScore / bTotal) * 100) : -1);

                        // 1. Primary: Score percentage
                        if (bPct !== aPct) return bPct - aPct;
                        // 2. Secondary: Raw score
                        if (bScore !== aScore) return bScore - aScore;

                        // 3. Tertiary: Time duration (fastest / lowest seconds first)
                        const aDuration = aAttempt?.duration_seconds !== undefined && aAttempt?.duration_seconds !== null ? Number(aAttempt.duration_seconds) : Infinity;
                        const bDuration = bAttempt?.duration_seconds !== undefined && bAttempt?.duration_seconds !== null ? Number(bAttempt.duration_seconds) : Infinity;
                        if (aDuration !== bDuration) return aDuration - bDuration;

                        // 4. Quaternary: Earliest timestamp
                        const aTime = aAttempt?.created_at ? new Date(aAttempt.created_at).getTime() : 0;
                        const bTime = bAttempt?.created_at ? new Date(bAttempt.created_at).getTime() : 0;
                        return aTime - bTime;
                      })
                      .slice(0, 3)
                      .map((participant, index) => {
                        const attempt = (participant as any).exam_attempt;
                        const score = attempt?.score;
                        const total = attempt?.total_questions || 20;
                        const pct = attempt?.percentage ?? (score !== undefined ? Math.round((Number(score) / total) * 100) : null);
                        const duration = attempt?.duration_seconds;
                        const formattedDuration =
                          duration !== undefined && duration !== null
                            ? `${Math.floor(Number(duration) / 60)}:${(Number(duration) % 60).toString().padStart(2, "0")}`
                            : null;

                        return (
                          <div
                            key={participant.id}
                            className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                              index === 0
                                ? "bg-amber-500/10 border-amber-500/20"
                                : "bg-muted/40 border-border/30"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                              </span>
                              <span className="font-medium truncate text-[11px] text-foreground">
                                {participant.profile?.full_name || participant.profile?.username || "Classmate"}
                                {participant.user_id === user?.id ? ` (${t("you") || "You"})` : ""}
                              </span>
                              {index === 0 && (
                                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                  {t("winner") || "Winner"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-foreground text-[11px]">
                                {pct !== null ? `${pct}%` : ""}
                              </span>
                              {formattedDuration && (
                                <span className="text-[10px] text-muted-foreground font-normal">⏱ {formattedDuration}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Action Buttons Section */}
                <div>
                  {hasCompleted ? (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("youCompletedThisExam") || "Wasoje iki kizamini"}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigate?.("classmates/group-results", { id: challenge.id });
                        }}
                        className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                      >
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>{t("viewRankings") || t("viewDetails") || "Reba Uko Bakurikirana mu Manota"}</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Case 1: Creator of Pending Challenge */}
                      {challenge.status === "pending" && challenge.creator_id === user?.id && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingKey !== null}
                            onClick={() => handleCancelChallenge(challenge.id)}
                            className="h-9 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3 transition-all"
                          >
                            {actionLoadingKey === `${challenge.id}-cancel` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5" />
                                <span>{t("cancelExam")}</span>
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
                            }}
                            className="flex-1 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm gap-1.5 transition-all"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>{t("enterWaitingRoom")} {secondsLeft > 0 ? `(${secondsLeft}s)` : ""}</span>
                          </Button>
                        </div>
                      )}

                      {/* Case 2: Joined/Ready Participant of Pending Challenge */}
                      {challenge.status === "pending" && challenge.creator_id !== user?.id && (userParticipation?.status === "joined" || userParticipation?.status === "ready") && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingKey !== null}
                            onClick={() => handleLeaveChallenge(challenge.id)}
                            className="h-9 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3 transition-all"
                          >
                            {actionLoadingKey === `${challenge.id}-leave` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5" />
                                <span>{t("leaveExam")}</span>
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
                            }}
                            className="flex-1 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm gap-1.5 transition-all"
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>{t("enterWaitingRoom")}</span>
                          </Button>
                        </div>
                      )}

                      {/* Case 3: Active Pending Invitation (Not joined yet) */}
                      {challenge.status === "pending" && challenge.creator_id !== user?.id && isActivePending && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoadingKey !== null}
                            onClick={() => handleRespondToInvitation(challenge.id, challenge.category_id, false)}
                            className="flex-1 h-9 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5 transition-all"
                          >
                            {actionLoadingKey === `${challenge.id}-deny` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5" />
                                <span>{t("decline") || "Guhakana"}</span>
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            disabled={actionLoadingKey !== null}
                            onClick={() => handleRespondToInvitation(challenge.id, challenge.category_id, true)}
                            className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 transition-all"
                          >
                            {actionLoadingKey === `${challenge.id}-join` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>{t("accept") || "Injira"} ({secondsLeft}s)</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Case 4: Expired Pending */}
                      {challenge.status === "pending" && challenge.creator_id !== user?.id && isExpired && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground text-xs">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="font-medium truncate">
                            {t("invitationExpired") || "Igihe cyo kwinjira cyarangiye (Amasegonda 30 yarenze)"}
                          </span>
                        </div>
                      )}

                      {/* Case 5: Active Exam */}
                      {challenge.status === "active" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=classmates`;
                          }}
                          className="w-full h-9 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 transition-all"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{t("joinExam") || "Injira mu Kizamini Ubu"}</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ClassmatesView({ navigate }: ClassmatesViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"friends" | "classmates" | "invitations">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [classmates, setClassmates] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<ClassmateRequestWithProfile[]>([]);
  const [sentRequestIds, setSentRequestIds] = useState<Map<string, string>>(new Map());
  const [isPublic, setIsPublic] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [examCategories, setExamCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedInvitees, setSelectedInvitees] = useState<Set<string>>(new Set());
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteTab, setInviteTab] = useState<"friends" | "classmates">("friends");
  const [pictureViewer, setPictureViewer] = useState<{ url: string; name: string } | null>(null);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<{ senderId: string; senderName: string; message: string; conversationId: string }[]>([]);
  const [friendLastMessages, setFriendLastMessages] = useState<Map<string, { message: string; time: string; unread: number }>>(new Map());
  const [pendingExamInvites, setPendingExamInvites] = useState(0);
  const cachedGroup = getCachedGroupExamEnabled();
  const [groupExamEnabled, setGroupExamEnabled] = useState(cachedGroup !== null ? cachedGroup : true);

  // Realtime message reactions state
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, { count: number; users: { id: string; name: string }[] }>>>({});
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);

  // Handle back button / shortcuts to close modals and chat on mobile / desktop
  useEffect(() => {
    const handleAppBack = (e: Event) => {
      if (pictureViewer) {
        e.preventDefault();
        setPictureViewer(null);
        return;
      }
      if (showInviteModal) {
        e.preventDefault();
        setShowInviteModal(false);
        return;
      }
      if (selectedFriend) {
        e.preventDefault();
        setSelectedFriend(null);
        setConversationId(null);
        setMessages([]);
        setChallenges([]);
        return;
      }
    };

    window.addEventListener("app:request-back", handleAppBack);
    return () => window.removeEventListener("app:request-back", handleAppBack);
  }, [pictureViewer, showInviteModal, selectedFriend]);

  // Handle browser popstate on mobile/desktop when chat is open
  useEffect(() => {
    if (!selectedFriend) return;

    window.history.pushState({ chatOpen: true, friendId: selectedFriend.id }, "", window.location.href);

    const handlePopState = () => {
      setSelectedFriend(null);
      setConversationId(null);
      setMessages([]);
      setChallenges([]);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedFriend]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<ReturnType<typeof createClient> extends infer T ? any : any>(null);
  const hasAutoSwitchedRef = useRef(false);

  // Auto-switch to classmates tab if friends tab is hidden (only once on initial load to prevent flickering)
  useEffect(() => {
    if (!loading && !hasAutoSwitchedRef.current) {
      if (friends.length === 0 && requests.filter((r) => r.status === "pending").length === 0) {
        setActiveTab("classmates");
      }
      hasAutoSwitchedRef.current = true;
    }
  }, [loading, friends.length, requests.length]);

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return null;
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return null;
    }
  };

  const getSortedFriends = (list: FriendProfile[]) => {
    return [...list].sort((a, b) => {
      const aOnline = isOnline(a.last_seen);
      const bOnline = isOnline(b.last_seen);
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      // Both online or both offline: sort by last_seen descending (most recent first)
      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bTime - aTime;
    });
  };

  const fetchData = useCallback(async (isInitial = false) => {
    if (!user) return;
    if (isInitial) setLoading(true);
    try {
      const [classmatesRes, requestsRes] = await Promise.all([
        fetch("/api/classmate-requests/classmates").then((r) => r.json()),
        fetch("/api/classmate-requests").then((r) => r.json()),
      ]);

      const classmatesData = classmatesRes as { classmates?: FriendProfile[]; error?: string };
      const requestsData = requestsRes as { requests?: ClassmateRequestWithProfile[]; is_public?: boolean };
      const allRequests: ClassmateRequestWithProfile[] = requestsData.requests || [];

      const acceptedFriends = allRequests
        .filter((r) => r.status === "accepted")
        .map((r) => r.other_user);

      // Double-check: ensure we don't include pending requests in friends
      const pendingRequestIds = new Set(
        allRequests.filter((r) => r.status === "pending").map((r) => r.other_user.id)
      );

      const friendIds = new Set(acceptedFriends.map((f) => f.id));
      const sentMap = new Map<string, string>();
      allRequests.filter((r) => r.direction === "sent" && r.status === "pending").forEach((r) => {
        sentMap.set(r.other_user.id, r.id);
      });

      // Filter out any users who have pending requests from being in friends
      const filteredFriends = acceptedFriends.filter((f) => !pendingRequestIds.has(f.id));
      setFriends(filteredFriends);
      setSentRequestIds(sentMap);
      setRequests(allRequests.filter((r) => r.status === "pending"));
      setIsPublic(requestsData.is_public ?? true);

      const classmatesList = classmatesData.classmates || [];
      // Filter out both accepted friends and users with pending requests
      const allKnownUserIds = new Set([...friendIds, ...pendingRequestIds]);
      const filteredClassmates = classmatesList.filter((c: FriendProfile) => !allKnownUserIds.has(c.id));
      setClassmates(filteredClassmates);
    } catch (error) {
      console.error("Failed to fetch classmates data:", error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Fetch pending exam challenge invitations count
  const fetchPendingExamInvites = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/exam-challenges");
      const data = await res.json();
      const pending = (data.challenges || []).filter((c: any) => {
        const participation = c.participants?.find((p: any) => p.user_id === user.id);
        return participation?.status === "pending";
      });
      setPendingExamInvites(pending.length);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchPendingExamInvites();
  }, [fetchPendingExamInvites]);

  useEffect(() => {
    void isGroupExamEnabled().then(setGroupExamEnabled);
  }, []);

  // Realtime subscription for exam challenge updates
  useEffect(() => {
    if (!user?.id) return;
    const channelName = `exam_invite_count:${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `user_id=eq.${user.id}` },
        () => fetchPendingExamInvites()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges" },
        () => fetchPendingExamInvites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchPendingExamInvites]);

  // Global realtime subscription for new message notifications
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const channelName = `chat_notifications:${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload: any) => {
          const newMsg = payload.new;
          // Only notify for messages from others, not our own
          if (newMsg.sender_id === user.id) return;
          // Don't notify if we're currently viewing this conversation
          if (conversationId === newMsg.conversation_id) return;

          // Fetch conversation to get the friend ID
          const { data: conversation } = await supabase
            .from("chat_conversations")
            .select("driver_id, student_id")
            .eq("id", newMsg.conversation_id)
            .maybeSingle();

          if (!conversation) return;

          const friendId = conversation.driver_id === user.id ? conversation.student_id : conversation.driver_id;

          // Update friend last messages
          setFriendLastMessages((prev) => {
            const existing = prev.get(friendId);
            return new Map(prev).set(friendId, {
              message: newMsg.message,
              time: newMsg.created_at,
              unread: (existing?.unread || 0) + 1,
            });
          });

          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from("user_profiles")
            .select("full_name, username")
            .eq("id", newMsg.sender_id)
            .maybeSingle();

          const senderName = senderProfile?.full_name || senderProfile?.username || "Unknown";
          setUnreadNotifications((prev) => {
            // Keep only last 5 notifications, replace if same conversation
            const filtered = prev.filter((n) => n.conversationId !== newMsg.conversation_id);
            return [...filtered, {
              senderId: newMsg.sender_id,
              senderName,
              message: newMsg.message,
              conversationId: newMsg.conversation_id,
            }].slice(-5);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, conversationId, supabase]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (unreadNotifications.length === 0) return;
    const timer = setTimeout(() => setUnreadNotifications([]), 5000);
    return () => clearTimeout(timer);
  }, [unreadNotifications]);

  // Real-time subscription for classmate_requests and user_profiles
  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    // Helper: enrich a raw classmate_request row with the other user's profile
    const enrichRequest = async (
      row: any,
      currentUserId: string
    ): Promise<ClassmateRequestWithProfile | null> => {
      const otherUserId = row.sender_id === currentUserId ? row.receiver_id : row.sender_id;
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, full_name, username, avatar_url, last_seen")
          .eq("id", otherUserId)
          .maybeSingle();
        if (!profile) return null;
        return {
          ...row,
          other_user: profile,
          direction: row.sender_id === currentUserId ? "sent" : "received",
        };
      } catch {
        return null;
      }
    };

    // Subscribe to classmate_requests changes in real-time
    const reqChannelName = `classmate_requests_rt:${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const reqChannel = supabase
      .channel(reqChannelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classmate_requests" },
        async (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;

          // Only care about rows involving the current user
          if (row.sender_id !== user.id && row.receiver_id !== user.id) return;

          // Re-sync full data asynchronously to guarantee 100% accurate state
          void fetchData();

          if (payload.eventType === "INSERT") {
            const enriched = await enrichRequest(row, user.id);
            if (!enriched) return;

            if (enriched.direction === "received") {
              // Someone sent us a friend request
              setRequests((prev) => {
                const filtered = prev.filter((r) => r.id !== row.id);
                return [enriched, ...filtered];
              });
              toast.success(t("newFriendRequest"), {
                description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("wantsToBeYourFriend")}`,
              });
            } else {
              // We sent a request
              setSentRequestIds((prev) => new Map([...prev, [enriched.other_user.id, row.id]]));
              setRequests((prev) => {
                const filtered = prev.filter((r) => r.id !== row.id);
                return [enriched, ...filtered];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const status = row.status;
            const enriched = await enrichRequest(row, user.id);

            if (status === "pending") {
              if (row.receiver_id === user.id && enriched) {
                setRequests((prev) => {
                  const filtered = prev.filter((r) => r.id !== row.id);
                  return [enriched, ...filtered];
                });
                toast.success(t("newFriendRequest"), {
                  description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("wantsToBeYourFriend")}`,
                });
              }
            } else if (status === "accepted") {
              setRequests((prev) => prev.filter((r) => r.id !== row.id));
              if (enriched) {
                setSentRequestIds((prev) => {
                  const next = new Map(prev);
                  next.delete(enriched.other_user.id);
                  return next;
                });
                setFriends((prev) => {
                  if (prev.some((f) => f.id === enriched.other_user.id)) return prev;
                  return [...prev, enriched.other_user];
                });
                setClassmates((prev) => prev.filter((c) => c.id !== enriched.other_user.id));

                if (row.sender_id === user.id) {
                  toast.success(t("friendRequestAccepted"), {
                    description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("acceptedYourFriendRequest")}`,
                  });
                }
              }
            } else if (status === "rejected") {
              setRequests((prev) => prev.filter((r) => r.id !== row.id));
              if (enriched) {
                setSentRequestIds((prev) => {
                  const next = new Map(prev);
                  next.delete(enriched.other_user.id);
                  return next;
                });
                if (row.sender_id === user.id) {
                  toast.error(t("friendRequestRejected"), {
                    description: `${enriched.other_user.full_name || enriched.other_user.username} ${t("declinedYourFriendRequest")}`,
                  });
                }
              }
            }
          } else if (payload.eventType === "DELETE") {
            const targetId = payload.old?.id || row.id;
            setRequests((prev) => prev.filter((r) => r.id !== targetId));
            const otherUserId = row.sender_id === user.id ? row.receiver_id : row.sender_id;
            if (otherUserId) {
              setSentRequestIds((prev) => {
                const next = new Map(prev);
                next.delete(otherUserId);
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to user_profiles changes for online status updates
    const profileChannelName = `user_profiles_rt:${user.id}-${Math.random().toString(36).slice(2, 9)}`;
    const profileChannel = supabase
      .channel(profileChannelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload: any) => {
          const updated = payload.new as FriendProfile;
          if (!updated?.id) return;

          // Update friends list
          setFriends((prev) =>
            prev.map((f) => (f.id === updated.id ? { ...f, last_seen: updated.last_seen } : f))
          );
          // Update classmates list
          setClassmates((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, last_seen: updated.last_seen } : c))
          );
          // Update selected friend
          setSelectedFriend((prev) =>
            prev?.id === updated.id ? { ...prev, last_seen: updated.last_seen } : prev
          );
          // Update requests other_user
          setRequests((prev) =>
            prev.map((r) =>
              r.other_user.id === updated.id
                ? { ...r, other_user: { ...r.other_user, last_seen: updated.last_seen } }
                : r
            )
          );
        }
      )
      .subscribe();

    // Listen for custom friend-request-updated events from other components (like notifications dropdown)
    const handleFriendRequestEvent = () => {
      void fetchData();
    };
    window.addEventListener("friend-request-updated", handleFriendRequestEvent);

    return () => {
      supabase.removeChannel(reqChannel);
      supabase.removeChannel(profileChannel);
      window.removeEventListener("friend-request-updated", handleFriendRequestEvent);
    };
  }, [user?.id, supabase, t]);

  const fetchChallenges = useCallback(async (otherUserId: string) => {
    try {
      const res = await fetch(`/api/exam-challenges?with_user=${otherUserId}`);
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (error) {
      console.error("Failed to fetch challenges:", error);
    }
  }, []);

  const handleChatRespondToInvitation = async (challengeId: string, accept: boolean) => {
    try {
      const endpoint = accept ? `/api/exam-challenges/${challengeId}/join` : `/api/exam-challenges/${challengeId}/deny`;
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        toast.success(accept ? t("invitationAccepted") || "Invitation accepted" : t("invitationDeclined") || "Invitation declined");
        if (selectedFriend) {
          fetchChallenges(selectedFriend.id);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespond") || "Failed to respond");
      }
    } catch {
      toast.error(t("failedToRespond") || "Failed to respond");
    }
  };

  const openChat = async (friend: FriendProfile) => {
    if (!user) return;
    setLoadingChat(true);
    setSelectedFriend(friend);
    // Clear unread counter when opening chat
    setFriendLastMessages((prev) => {
      const existing = prev.get(friend.id);
      if (existing) {
        return new Map(prev).set(friend.id, { ...existing, unread: 0 });
      }
      return prev;
    });
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peer_id: friend.id }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setMessages([]);

        // Fetch messages via API route (handles delivered_at marking and error recovery)
        const msgRes = await fetch(`/api/chat/messages?conversation_id=${data.conversation.id}`);
        const msgData = await msgRes.json();
        if (msgData.messages) {
          setMessages(msgData.messages as ChatMessage[]);
          // Update last message from the most recent message
          const latestMessage = msgData.messages[msgData.messages.length - 1];
          if (latestMessage) {
            setFriendLastMessages((prev) => {
              return new Map(prev).set(friend.id, {
                message: latestMessage.message,
                time: latestMessage.created_at,
                unread: 0,
              });
            });
          }
        }

        // Mark messages as read
        await fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: data.conversation.id }),
        });

        fetchChallenges(friend.id);
      }
    } catch (error) {
      console.error("Failed to open chat:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `chat_messages:${conversationId}-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Clear typing indicator when a message arrives
          setIsFriendTyping(false);
          if (newMsg.sender_id !== user?.id) {
            // Mark as read since we're viewing the chat
            fetch("/api/chat/messages", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation_id: conversationId }),
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload: any) => {
          const updatedMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (payload.payload?.userId !== user?.id) {
          setIsFriendTyping(true);
          // Auto-clear typing after 3 seconds
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsFriendTyping(false), 3000);
        }
      })
      .on("broadcast", { event: "stop_typing" }, (payload: any) => {
        if (payload.payload?.userId !== user?.id) {
          setIsFriendTyping(false);
        }
      })
      .on("broadcast", { event: "message_reaction" }, (payload: any) => {
        const { messageId, emoji, userId, userName, action } = payload.payload || {};
        if (!messageId || !emoji || !userId) return;

        setMessageReactions((prev) => {
          const msgMap = { ...(prev[messageId] || {}) };
          const currentEmojiData = msgMap[emoji] || { count: 0, users: [] };
          const existingUserIdx = currentEmojiData.users.findIndex((u) => u.id === userId);

          if (action === "remove") {
            if (existingUserIdx >= 0) {
              const updatedUsers = currentEmojiData.users.filter((u) => u.id !== userId);
              if (updatedUsers.length === 0) {
                delete msgMap[emoji];
              } else {
                msgMap[emoji] = { count: updatedUsers.length, users: updatedUsers };
              }
            }
          } else {
            if (existingUserIdx === -1) {
              msgMap[emoji] = {
                count: currentEmojiData.users.length + 1,
                users: [...currentEmojiData.users, { id: userId, name: userName || "Friend" }],
              };
            }
          }
          return { ...prev, [messageId]: msgMap };
        });

        // Trigger floating burst
        const animId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setFloatingReactions((prev) => [...prev, { id: animId, emoji, x: Math.random() * 30 - 15, y: -20 }]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== animId));
        }, 1400);
      })
      .subscribe();

    messageChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      messageChannelRef.current = null;
      setIsFriendTyping(false);
    };
  }, [conversationId, user?.id, supabase]);

  // Toggle or add a reaction to a message with instant local update and realtime broadcast
  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!user) return;
      const currentUserName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Me";

      setMessageReactions((prev) => {
        const msgMap = { ...(prev[messageId] || {}) };
        const currentEmojiData = msgMap[emoji] || { count: 0, users: [] };
        const hasReacted = currentEmojiData.users.some((u) => u.id === user.id);
        const action = hasReacted ? "remove" : "add";

        if (hasReacted) {
          const updatedUsers = currentEmojiData.users.filter((u) => u.id !== user.id);
          if (updatedUsers.length === 0) {
            delete msgMap[emoji];
          } else {
            msgMap[emoji] = { count: updatedUsers.length, users: updatedUsers };
          }
        } else {
          msgMap[emoji] = {
            count: currentEmojiData.users.length + 1,
            users: [...currentEmojiData.users, { id: user.id, name: currentUserName }],
          };
        }

        // Broadcast to channel
        if (messageChannelRef.current) {
          messageChannelRef.current.send({
            type: "broadcast",
            event: "message_reaction",
            payload: {
              messageId,
              emoji,
              userId: user.id,
              userName: currentUserName,
              action,
            },
          });
        }

        return { ...prev, [messageId]: msgMap };
      });

      const animId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setFloatingReactions((prev) => [...prev, { id: animId, emoji, x: 0, y: -20 }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== animId));
      }, 1400);

      setActiveReactionPickerMessageId(null);
    },
    [user]
  );

  // Broadcast typing status
  const broadcastTyping = () => {
    if (!messageChannelRef.current) return;
    messageChannelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: user?.id } });
  };

  const broadcastStopTyping = () => {
    if (!messageChannelRef.current) return;
    messageChannelRef.current.send({ type: "broadcast", event: "stop_typing", payload: { userId: user?.id } });
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    } else {
      broadcastStopTyping();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify layout to hide dock nav when chat is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedFriend) {
      sessionStorage.setItem("chat-active", "true");
      sessionStorage.setItem("student-chat-active", "true");
    } else {
      sessionStorage.removeItem("chat-active");
      sessionStorage.removeItem("student-chat-active");
    }
    window.dispatchEvent(new CustomEvent("chat-state-change"));
    window.dispatchEvent(new CustomEvent("student-chat-state-change"));
  }, [selectedFriend]);

  // Clean up chat-active flag when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      sessionStorage.removeItem("chat-active");
      sessionStorage.removeItem("student-chat-active");
      window.dispatchEvent(new CustomEvent("chat-state-change"));
      window.dispatchEvent(new CustomEvent("student-chat-state-change"));
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || sendingMessage) return;
    const msgText = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, message: msgText }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("failedToSendMessage"));
        setNewMessage(msgText);
      } else if (data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message as ChatMessage];
        });
        // Update last message when we send a message
        if (selectedFriend) {
          setFriendLastMessages((prev) => {
            return new Map(prev).set(selectedFriend.id, {
              message: data.message.message,
              time: data.message.created_at,
              unread: 0,
            });
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error(t("failedToSendMessage"));
      setNewMessage(msgText);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSendRequest = async (classmateId: string) => {
    try {
      const res = await fetch("/api/classmate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: classmateId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t("classmateRequestSent"));
        if (data.request?.id) {
          setSentRequestIds((prev) => new Map([...prev, [classmateId, data.request.id]]));
        }
        fetchData();
      } else {
        toast.error(data.error || t("failedToSendRequest"));
      }
    } catch {
      toast.error(t("failedToSendRequest"));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestAccepted"));
        fetchData();
        window.dispatchEvent(new CustomEvent("friend-request-updated"));
      } else {
        toast.error(t("failedToRespondRequest"));
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}/reject`, { method: "POST" });
      if (res.ok) {
        toast.success(t("requestRejected"));
        fetchData();
        window.dispatchEvent(new CustomEvent("friend-request-updated"));
      } else {
        toast.error(t("failedToRespondRequest"));
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/classmate-requests/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("requestCancelled"));
        fetchData();
        window.dispatchEvent(new CustomEvent("friend-request-updated"));
      }
    } catch {
      toast.error(t("failedToRespondRequest"));
    }
  };

  const handleToggleVisibility = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    try {
      const res = await fetch("/api/classmate-requests/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: newValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(t("visibilityUpdated"));
    } catch (error) {
      setIsPublic(!newValue);
      const message = error instanceof Error ? error.message : "Failed";
      toast.error(`${t("failedToUpdateVisibility")}: ${message}`);
    }
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
    setInviteSearchQuery("");
    setInviteTab("friends");
    if (examCategories.length === 0) {
      try {
        const { data, error } = await supabase
          .from("exam_categories")
          .select("id, name")
          .eq("is_published", true)
          .order("name", { ascending: true });
        if (error) {
          console.error("Failed to fetch exam categories:", error);
        }
        const cats = data || [];
        setExamCategories(cats);
        if (cats.length === 1) {
          setSelectedCategory(cats[0].id);
        }
      } catch {
        // ignore
      }
    } else if (examCategories.length === 1) {
      setSelectedCategory(examCategories[0].id);
    }
    if (selectedFriend) {
      setSelectedInvitees(new Set([selectedFriend.id]));
    }
  };

  const handleCreateChallenge = async () => {
    if (!selectedCategory) {
      toast.error(t("selectExamCategory"));
      return;
    }
    if (selectedInvitees.size === 0) {
      toast.error(t("selectAtLeastOneFriend"));
      return;
    }
    setCreatingChallenge(true);
    try {
      const category = examCategories.find((c) => c.id === selectedCategory);
      const res = await fetch("/api/exam-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: selectedCategory,
          category_name: category?.name || "",
          invite_user_ids: Array.from(selectedInvitees),
        }),
      });
      const data = await res.json();
      if (res.ok && data.challenge?.id) {
        toast.success(t("challengeCreated") || "Group exam created!");
        setShowInviteModal(false);
        const catId = selectedCategory;
        setSelectedCategory("");
        setSelectedInvitees(new Set());
        window.location.href = `/dashboard/exam?challenge_id=${data.challenge.id}&category_id=${catId}&from=classmates`;
      } else {
        toast.error(data.error || t("failedToCreateChallenge"));
      }
    } catch {
      toast.error(t("failedToCreateChallenge"));
    } finally {
      setCreatingChallenge(false);
    }
  };

  const pendingReceivedRequests = requests.filter((r) => r.direction === "received");
  const pendingSentRequests = requests.filter((r) => r.direction === "sent");

  const filteredFriends = getSortedFriends(
    friends.filter((f) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        f.full_name?.toLowerCase().includes(q) ||
        f.username?.toLowerCase().includes(q)
      );
    })
  );

  const filteredClassmates = getSortedFriends(
    classmates.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q)
      );
    })
  );

  const hasFriends = friends.length > 0;
  const hasPendingRequests = pendingReceivedRequests.length > 0 || pendingSentRequests.length > 0;
  const showFriendsTab = hasFriends || hasPendingRequests;

  if (loading) return <ClassmatesViewSkeleton />;

  const getAvatarUrl = (profile?: FriendProfile | null) => {
    if (!profile) return undefined;
    return profile.avatar_url || undefined;
  };

  const getInitials = (profile?: FriendProfile | null) => {
    if (!profile) return "?";
    const name = profile.full_name || profile.username || "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const ProfileAvatar = ({ profile, size = "h-10 w-10" }: { profile?: FriendProfile | null; size?: string }) => {
    if (!profile) return <div className={`${size} rounded-full bg-muted animate-pulse`} />;
    const url = getAvatarUrl(profile);
    if (url) {
      return (
        <button
          onClick={() => setPictureViewer({ url, name: profile.full_name || profile.username || "" })}
          className="rounded-full overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all"
          title={t("viewProfilePicture")}
        >
          <Avatar className={size}>
            <AvatarImage src={url} alt={profile.full_name || ""} />
            <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>{getInitials(profile)}</AvatarFallback>
          </Avatar>
        </button>
      );
    }
    return (
      <Avatar className={size}>
        <AvatarFallback className={`bg-primary/10 text-primary font-bold text-xs ${size}`}>{getInitials(profile)}</AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className={`${selectedFriend ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 border-r flex flex-col bg-background h-full`}>
        {/* Back button */}
        <div className="p-3 pb-0">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || t("backToHome") || "Back"}
          </button>
        </div>
        {/* Tab Switcher + Visibility */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto no-scrollbar max-w-full">
              {showFriendsTab && (
                <button
                  onClick={() => setActiveTab("friends")}
                  className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                    activeTab === "friends" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("friends")}
                  {pendingReceivedRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {pendingReceivedRequests.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setActiveTab("classmates")}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                  activeTab === "classmates" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("classmatesList")}
              </button>
              {groupExamEnabled && (
              <button
                onClick={() => setActiveTab("invitations")}
                className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                  activeTab === "invitations" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("examInvitations") || "Exam Invitations"}
                {pendingExamInvites > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                    {pendingExamInvites > 99 ? "99+" : pendingExamInvites}
                  </span>
                )}
              </button>
              )}
            </div>
            <button
              onClick={handleToggleVisibility}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
              title={isPublic ? t("youArePublic") : t("youArePrivate")}
            >
              {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "friends"
                  ? t("searchFriends")
                  : activeTab === "invitations"
                  ? (t("searchExams") || "Shakisha mu butumire bw'ibizamini...")
                  : t("searchClassmates")
              }
              className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === "friends" ? (
            <>
              {/* Invite to Group Exam button (available outside chat) */}
              {friends.length > 0 && groupExamEnabled && (
                <button
                  onClick={() => {
                    setSelectedInvitees(new Set());
                    openInviteModal();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-b bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                >
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">{t("inviteToGroupExam")}</span>
                </button>
              )}

              {/* Pending Requests */}
              {pendingReceivedRequests.length > 0 && (
                <div className="border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2 block">
                    {t("pendingRequests")} ({pendingReceivedRequests.length})
                  </span>
                  {pendingReceivedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <ProfileAvatar profile={req.other_user} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent Requests */}
              {pendingSentRequests.length > 0 && (
                <div className="border-b">
                  <span className="text-xs font-semibold text-muted-foreground uppercase px-3 py-2 block">
                    {t("requestSent")} ({pendingSentRequests.length})
                  </span>
                  {pendingSentRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                      <ProfileAvatar profile={req.other_user} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                        title={t("cancelRequest")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List */}
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{t("noFriendsYet")}</p>
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const lastMessageData = friendLastMessages.get(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => openChat(friend)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left ${
                        selectedFriend?.id === friend.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="relative">
                        <ProfileAvatar profile={friend} size="h-10 w-10" />
                        {isOnline(friend.last_seen) && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {friend.full_name || friend.username}
                          </p>
                          {lastMessageData?.time && (
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(lastMessageData.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {lastMessageData?.message || (isOnline(friend.last_seen) ? t("online") : (formatLastSeen(friend.last_seen) || `@${friend.username}`))}
                          </p>
                          {lastMessageData?.unread && lastMessageData.unread > 0 && (
                            <span className="ml-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
                              {lastMessageData.unread > 9 ? "9+" : lastMessageData.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          ) : activeTab === "invitations" ? (
            <ExamInvitationsContent 
              user={user} 
              supabase={supabase} 
              t={t} 
              navigate={navigate} 
              searchQuery={searchQuery}
              onPendingCountChange={setPendingExamInvites} 
              onOpenCreateExam={() => {
                setSelectedInvitees(new Set());
                openInviteModal();
              }}
            />
          ) : (
            <>
              {filteredClassmates.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">{t("noClassmatesFound")}</p>
                </div>
              ) : (
                filteredClassmates.map((classmate) => (
                  <div
                    key={classmate.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="relative">
                      <ProfileAvatar profile={classmate} size="h-10 w-10" />
                      {isOnline(classmate.last_seen) && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {classmate.full_name || classmate.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isOnline(classmate.last_seen)
                          ? t("online")
                          : (formatLastSeen(classmate.last_seen) || `@${classmate.username}`)}
                      </p>
                    </div>
                    {(() => {
                      const receivedReq = pendingReceivedRequests.find((r) => r.other_user.id === classmate.id);
                      const sentReqId = sentRequestIds.get(classmate.id);

                      if (receivedReq) {
                        return (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAcceptRequest(receivedReq.id)}
                              className="text-xs h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {t("accept") || "Accept"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(receivedReq.id)}
                              className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      }

                      if (sentReqId) {
                        return (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelRequest(sentReqId)}
                            className="text-xs h-7 text-muted-foreground hover:text-red-600 shrink-0"
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t("cancelRequest")}
                          </Button>
                        );
                      }

                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendRequest(classmate.id)}
                          className="text-xs h-7 shrink-0"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          {t("addClassmate")}
                        </Button>
                      );
                    })()}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className={`${selectedFriend ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-background fixed inset-0 sm:static z-20 sm:z-0`}>
        {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground overflow-y-auto">
            {pendingReceivedRequests.length > 0 ? (
              <div className="w-full max-w-md px-4 py-6">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">{t("pendingRequests")}</h2>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {pendingReceivedRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingReceivedRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                      <ProfileAvatar profile={req.other_user} size="h-12 w-12" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {req.other_user.full_name || req.other_user.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">@{req.other_user.username}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAcceptRequest(req.id)}
                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4" />
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(req.id)}
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                        {t("deny")}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "invitations" ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
                <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-sm ring-1 ring-primary/20">
                  <Trophy className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1.5">
                  {t("examInvitations") || "Exam Invitations"}
                </h3>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  {t("examInvitationsDesc") || "Set up a group exam and invite your classmates to compete together in real-time."}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full mb-6 text-left">
                  <div className="p-3 rounded-xl border bg-card/60">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      <span>{t("thirtySeconds") || "30 Seconds"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {t("invitationsLast30Seconds") || "Invitations last only 30 seconds for classmates to accept."}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-card/60">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                      <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{t("realTimeScores") || "Real-Time Scores"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {t("realTimeScoresDesc") || "See live comparative rankings and scores as classmates start and complete."}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setSelectedInvitees(new Set());
                    openInviteModal();
                  }}
                  className="gap-2 rounded-xl text-xs font-bold shadow-md px-5 h-9"
                >
                  <Trophy className="h-4 w-4" />
                  <span>{t("prepareNewGroupExam") || "Prepare New Group Exam"}</span>
                </Button>
              </div>
            ) : (
              <>
                <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{t("selectFriendToChat")}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 z-10 shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-background max-h-[60px]">
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  setConversationId(null);
                  setMessages([]);
                  setChallenges([]);
                }}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t("back") || "Close chat"}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <ProfileAvatar profile={selectedFriend} size="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">
                  {selectedFriend.full_name || selectedFriend.username}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isFriendTyping
                    ? t("typing")
                    : isOnline(selectedFriend.last_seen)
                    ? t("online")
                    : (formatLastSeen(selectedFriend.last_seen) || `@${selectedFriend.username}`)}
                </p>
              </div>
            </div>

            {/* Group Exam Chat Invitations */}
            {groupExamEnabled && challenges.length > 0 && (
              <div className="px-4 pt-2.5">
                {challenges.map((ch) => (
                  <ChatExamInviteBanner
                    key={ch.id}
                    challenge={ch}
                    currentUserId={user?.id || ""}
                    selectedFriend={selectedFriend}
                    onRespond={handleChatRespondToInvitation}
                    navigate={navigate}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {/* Floating Reaction Animation Burst */}
              {floatingReactions.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center items-center">
                  {floatingReactions.map((item) => (
                    <span
                      key={item.id}
                      className="absolute text-2xl animate-in fade-in zoom-in-50 slide-out-to-top-12 duration-1000 fill-mode-forwards"
                      style={{
                        transform: `translate(${item.x}px, ${item.y}px)`,
                      }}
                    >
                      {item.emoji}
                    </span>
                  ))}
                </div>
              )}

              {loadingChat ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  const reactionsOnMsg = messageReactions[msg.id] || {};
                  const hasReactions = Object.keys(reactionsOnMsg).length > 0;
                  const isPickerOpen = activeReactionPickerMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex flex-col ${
                        isOwn ? "items-end self-end ml-auto" : "items-start self-start mr-auto"
                      } max-w-[84%] sm:max-w-[78%]`}
                    >
                      {/* Reaction Picker Popover */}
                      {isPickerOpen && (
                        <div
                          className={`absolute -top-10 z-20 flex items-center gap-1 px-1.5 py-1 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg transition-all animate-in fade-in zoom-in-90 duration-150 ${
                            isOwn ? "right-0" : "left-0"
                          }`}
                        >
                          {REACTION_EMOJIS.map((emoji) => {
                            const hasThisReaction = (reactionsOnMsg[emoji]?.users || []).some(
                              (u) => u.id === user?.id
                            );
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`flex items-center justify-center h-7 w-7 rounded-full text-sm hover:scale-125 active:scale-100 transition-all ${
                                  hasThisReaction ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted"
                                }`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bubble with Quick Reaction Button */}
                      <div className={`relative flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm shadow-xs transition-all ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-xs"
                              : "bg-muted text-foreground rounded-bl-xs"
                          }`}
                        >
                          <p className="leading-relaxed break-words">{msg.message}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setActiveReactionPickerMessageId((prev) => (prev === msg.id ? null : msg.id))
                          }
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
                          title="React"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Reaction Badges */}
                      {hasReactions && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                          {Object.entries(reactionsOnMsg).map(([emoji, data]) => {
                            if (!data || data.count <= 0) return null;
                            const hasUserReacted = data.users.some((u) => u.id === user?.id);
                            const userNames = data.users.map((u) => u.name).join(", ");
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                title={userNames}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-95 border ${
                                  hasUserReacted
                                    ? "bg-primary/15 border-primary/40 text-primary font-medium"
                                    : "bg-muted/70 hover:bg-muted border-border/40 text-muted-foreground"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-semibold">{data.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Timestamp & Ticks */}
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isOwn && <MessageTicks msg={msg} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Typing indicator */}
            {isFriendTyping && (
              <div className="px-4 pb-1 text-xs text-muted-foreground italic">
                {selectedFriend.full_name || selectedFriend.username} {t("isTyping")}
              </div>
            )}

            {/* Message Input */}
            <div className="border-t px-4 py-3 flex items-center gap-2">
              {groupExamEnabled && (
              <button
                onClick={openInviteModal}
                title={t("inviteToGroupExam")}
                className="rounded-xl p-2.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
              >
                <Trophy className="h-5 w-5" />
              </button>
              )}
              <input
                type="text"
                value={newMessage}
                onChange={handleMessageInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                  else if (e.key === "Backspace" && !newMessage) broadcastStopTyping();
                }}
                placeholder={t("typeMessage")}
                className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => {
                  broadcastStopTyping();
                  handleSendMessage();
                }}
                disabled={sendingMessage || !newMessage.trim()}
                className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
              >
                {sendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile Chat Overlay */}
      {selectedFriend && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-background" style={{ height: "100dvh" }}>
          <div className="sticky top-0 z-10 shrink-0 border-b px-4 py-3 flex items-center gap-3 bg-background">
            <button
              onClick={() => {
                setSelectedFriend(null);
                setConversationId(null);
                setMessages([]);
                setChallenges([]);
              }}
              className="rounded-lg p-1 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <ProfileAvatar profile={selectedFriend} size="h-10 w-10" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-sm truncate">
                {selectedFriend.full_name || selectedFriend.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isFriendTyping
                  ? t("typing")
                  : isOnline(selectedFriend.last_seen)
                  ? t("online")
                  : `@${selectedFriend.username}`}
              </p>
            </div>
          </div>

          {/* Group Exam Chat Invitations */}
          {groupExamEnabled && challenges.length > 0 && (
            <div className="px-4 pt-2.5">
              {challenges.map((ch) => (
                <ChatExamInviteBanner
                  key={ch.id}
                  challenge={ch}
                  currentUserId={user?.id || ""}
                  selectedFriend={selectedFriend}
                  onRespond={handleChatRespondToInvitation}
                  navigate={navigate}
                  t={t}
                />
              ))}
            </div>
          )}

          <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Floating Reaction Animation Burst (Mobile) */}
            {floatingReactions.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center items-center">
                {floatingReactions.map((item) => (
                  <span
                    key={item.id}
                    className="absolute text-2xl animate-in fade-in zoom-in-50 slide-out-to-top-12 duration-1000 fill-mode-forwards"
                    style={{
                      transform: `translate(${item.x}px, ${item.y}px)`,
                    }}
                  >
                    {item.emoji}
                  </span>
                ))}
              </div>
            )}

            {loadingChat ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("noMessagesYet")}</p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const reactionsOnMsg = messageReactions[msg.id] || {};
                const hasReactions = Object.keys(reactionsOnMsg).length > 0;
                const isPickerOpen = activeReactionPickerMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex flex-col ${
                      isOwn ? "items-end self-end ml-auto" : "items-start self-start mr-auto"
                    } max-w-[84%]`}
                  >
                    {/* Reaction Picker Popover */}
                    {isPickerOpen && (
                      <div
                        className={`absolute -top-10 z-20 flex items-center gap-1 px-1.5 py-1 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg transition-all animate-in fade-in zoom-in-90 duration-150 ${
                          isOwn ? "right-0" : "left-0"
                        }`}
                      >
                        {REACTION_EMOJIS.map((emoji) => {
                          const hasThisReaction = (reactionsOnMsg[emoji]?.users || []).some(
                            (u) => u.id === user?.id
                          );
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`flex items-center justify-center h-7 w-7 rounded-full text-sm hover:scale-125 active:scale-100 transition-all ${
                                hasThisReaction ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted"
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Bubble with Quick Reaction Button */}
                    <div className={`relative flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm shadow-xs transition-all ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-xs"
                            : "bg-muted text-foreground rounded-bl-xs"
                        }`}
                      >
                        <p className="leading-relaxed break-words">{msg.message}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionPickerMessageId((prev) => (prev === msg.id ? null : msg.id))
                        }
                        className="opacity-70 hover:opacity-100 p-1 rounded-full text-muted-foreground hover:text-foreground transition-all"
                        title="React"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Reaction Badges */}
                    {hasReactions && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                        {Object.entries(reactionsOnMsg).map(([emoji, data]) => {
                          if (!data || data.count <= 0) return null;
                          const hasUserReacted = data.users.some((u) => u.id === user?.id);
                          const userNames = data.users.map((u) => u.name).join(", ");
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              title={userNames}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-95 border ${
                                hasUserReacted
                                  ? "bg-primary/15 border-primary/40 text-primary font-medium"
                                  : "bg-muted/70 hover:bg-muted border-border/40 text-muted-foreground"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="text-[10px] font-semibold">{data.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp & Ticks */}
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isOwn && <MessageTicks msg={msg} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

            {/* Typing indicator */}
            {isFriendTyping && (
              <div className="px-4 pb-1 text-xs text-muted-foreground italic">
                {selectedFriend.full_name || selectedFriend.username} {t("isTyping")}
              </div>
            )}

          <div className="border-t px-4 py-3 flex items-center gap-2">
            {groupExamEnabled && (
            <button
              onClick={openInviteModal}
              title={t("inviteToGroupExam")}
              className="rounded-xl p-2.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
            >
              <Trophy className="h-5 w-5" />
            </button>
            )}
            <input
              type="text"
              value={newMessage}
              onChange={handleMessageInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
                else if (e.key === "Backspace" && !newMessage) broadcastStopTyping();
              }}
              placeholder={t("typeMessage")}
              className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                broadcastStopTyping();
                handleSendMessage();
              }}
              disabled={sendingMessage || !newMessage.trim()}
              className="rounded-xl bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Invite to Group Exam Modal */}
      {groupExamEnabled && (
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("inviteToGroupExam")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {/* 1. Category */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("selectExamCategory")}</label>
              {examCategories.length === 1 ? (
                <div className="p-2.5 rounded-lg border border-primary bg-primary/5">
                  <p className="text-sm font-medium">{examCategories[0].name}</p>
                </div>
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">—</option>
                  {examCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Search bar */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  placeholder={t("searchFriendsClassmates") || "Search friends or classmates..."}
                  className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* 3. Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setInviteTab("friends")}
                disabled={friends.length === 0}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  inviteTab === "friends" && friends.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                } ${friends.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {t("friends") || "Friends"} ({friends.length})
              </button>
              <button
                onClick={() => setInviteTab("classmates")}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  inviteTab === "classmates"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t("classmatesList") || "Classmates"} ({classmates.length})
              </button>
            </div>

            {/* 4. User list based on tab */}
            <div>
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                {inviteTab === "friends" ? (
                  friends.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">{t("noFriendsToInvite")}</p>
                  ) : (
                    friends
                      .filter((f) => {
                        if (!inviteSearchQuery) return true;
                        const q = inviteSearchQuery.toLowerCase();
                        return f.full_name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q);
                      })
                      .map((friend) => (
                        <label
                          key={friend.id}
                          className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedInvitees.has(friend.id)}
                            onCheckedChange={(checked) => {
                              setSelectedInvitees((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(friend.id);
                                else next.delete(friend.id);
                                return next;
                              });
                            }}
                          />
                          <ProfileAvatar profile={friend} size="h-8 w-8" />
                          <span className="text-sm flex-1">
                            {friend.full_name || friend.username}
                          </span>
                        </label>
                      ))
                  )
                ) : classmates.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">{t("noClassmatesFound")}</p>
                ) : (
                  classmates
                    .filter((c) => {
                      if (!inviteSearchQuery) return true;
                      const q = inviteSearchQuery.toLowerCase();
                      return c.full_name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q);
                    })
                    .map((classmate) => (
                      <label
                        key={classmate.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedInvitees.has(classmate.id)}
                          onCheckedChange={(checked) => {
                            setSelectedInvitees((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(classmate.id);
                              else next.delete(classmate.id);
                              return next;
                            });
                          }}
                        />
                        <ProfileAvatar profile={classmate} size="h-8 w-8" />
                        <span className="text-sm flex-1">
                          {classmate.full_name || classmate.username}
                        </span>
                      </label>
                    ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateChallenge} disabled={creatingChallenge}>
              {creatingChallenge ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              {t("createChallenge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Profile Picture Viewer */}
      <Dialog open={!!pictureViewer} onOpenChange={(open) => !open && setPictureViewer(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 border-0 bg-black/90 shadow-none flex flex-col items-center justify-center gap-3 rounded-2xl overflow-hidden">
          <img
            src={pictureViewer?.url}
            alt={pictureViewer?.name || ""}
            className="max-h-[88vh] max-w-[93vw] w-auto h-auto object-contain rounded-lg"
            onClick={() => setPictureViewer(null)}
          />
          {pictureViewer?.name && (
            <p className="text-white text-sm font-medium drop-shadow-lg absolute bottom-4">{pictureViewer.name}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* New message notifications */}
      {unreadNotifications.length > 0 && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-xs">
          {unreadNotifications.map((notif, idx) => {
            const friend = friends.find((f) => f.id === notif.senderId);
            return (
              <button
                key={idx}
                onClick={() => {
                  if (friend) openChat(friend);
                  setUnreadNotifications([]);
                }}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-lg transition-all hover:shadow-xl text-left animate-in slide-in-from-bottom-2"
              >
                <div className="relative shrink-0">
                  <ProfileAvatar profile={friend} size="h-10 w-10" />
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{notif.senderName}</p>
                  <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
