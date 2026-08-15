"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Check, Clock, Play, ArrowLeft, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Participant {
  user_id: string;
  status: string;
  profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface GroupExamLobbyProps {
  challengeId: string;
  categoryName: string;
  securitySettings: {
    fullscreenEnabled: boolean;
    tabSwitchEnabled: boolean;
    rightClickEnabled: boolean;
    aiDetectionEnabled: boolean;
  };
  onStart: () => void;
  onCancel: () => void;
}

export function GroupExamLobby({ challengeId, categoryName, securitySettings, onStart, onCancel }: GroupExamLobbyProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = createClient();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!challengeId) return;
    fetchParticipants();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`lobby:${challengeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenge_participants", filter: `challenge_id=eq.${challengeId}` },
        () => fetchParticipants()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_challenges", filter: `id=eq.${challengeId}` },
        (payload: any) => {
          if (payload.new?.status === "active") {
            triggerStart();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [challengeId]);

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from("exam_challenge_participants")
        .select("user_id, status")
        .eq("challenge_id", challengeId);

      if (error) throw error;

      const userIds = (participantsData || []).map((p: { user_id: string; status: string }) => p.user_id);
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

      const enriched: Participant[] = (participantsData || []).map((p: { user_id: string; status: string }) => ({
        user_id: p.user_id,
        status: p.status,
        profile: profileMap[p.user_id] || null,
      }));

      setParticipants(enriched);
      setLoading(false);

      // Check if all joined participants are ready
      const joinedOrReady = enriched.filter((p) => p.status === "joined" || p.status === "ready");
      const allReady = joinedOrReady.length > 1 && joinedOrReady.every((p) => p.status === "ready");
      if (allReady && !starting && !countdown && !hasStartedRef.current) {
        triggerStart();
      }
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setLoading(false);
    }
  };

  const triggerStart = () => {
    if (starting || countdown !== null || hasStartedRef.current) return;
    hasStartedRef.current = true;
    setStarting(true);
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          onStart();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartNow = async () => {
    if (!instructionsAccepted) {
      toast.error(t("acceptExamInstructions") || "Please accept the exam instructions first");
      return;
    }
    try {
      setStarting(true);
      const res = await fetch(`/api/exam-challenges/${challengeId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data?.error || t("failedToStartExam") || "Failed to start");
        setStarting(false);
        return;
      }
      // The realtime subscription will catch the status change to "active"
      // But also trigger locally for immediate feedback
      triggerStart();
    } catch (error) {
      console.error("Failed to start challenge:", error);
      toast.error(t("failedToStartExam") || "Failed to start");
      setStarting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`/api/exam-challenges/${challengeId}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
    onCancel();
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const joinedCount = participants.filter((p) => p.status === "joined" || p.status === "ready").length;
  const pendingCount = participants.filter((p) => p.status === "pending").length;
  const readyCount = participants.filter((p) => p.status === "ready").length;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-center">
          <p className="text-white/70 text-lg mb-4">{t("examStartingIn") || "Exam starting in"}</p>
          <div className="text-8xl font-bold text-primary animate-pulse">{countdown}</div>
          <p className="text-white/50 text-sm mt-4">{t("getReady") || "Get ready!"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleCancel}
            disabled={starting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cancel") || "Cancel"}
          </button>
          <h1 className="text-2xl font-bold mb-2">{t("groupExamLobby") || "Group Exam Lobby"}</h1>
          <p className="text-muted-foreground">
            {t("waitingForFriends") || "Waiting for your friends to join"} — {categoryName}
          </p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-green-500">{joinedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("joined") || "Joined"}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("pending") || "Pending"}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-bold text-primary">{readyCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("ready") || "Ready"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Participants List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              {t("participants") || "Participants"} ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((p) => {
                const isMe = p.user_id === user?.id;
                const isPending = p.status === "pending";
                const isJoined = p.status === "joined";
                const isReady = p.status === "ready";
                const name = p.profile?.full_name || p.profile?.username || "Unknown";

                return (
                  <div
                    key={p.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isReady ? "border-green-500/30 bg-green-500/5" :
                      isJoined ? "border-primary/30 bg-primary/5" :
                      "border-border"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      {p.profile?.avatar_url ? (
                        <AvatarImage src={p.profile.avatar_url} />
                      ) : (
                        <AvatarFallback>{getInitials(name)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {name} {isMe && <span className="text-muted-foreground">({t("you") || "You"})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{p.profile?.username || "—"}</p>
                    </div>
                    <Badge
                      variant={isReady ? "default" : isJoined ? "secondary" : "outline"}
                      className={
                        isReady ? "bg-green-500 text-white" :
                        isJoined ? "bg-primary/15 text-primary" :
                        "text-muted-foreground"
                      }
                    >
                      {isReady ? (
                        <><Check className="h-3 w-3 mr-1" /> {t("ready") || "Ready"}</>
                      ) : isJoined ? (
                        <><Users className="h-3 w-3 mr-1" /> {t("joined") || "Joined"}</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1" /> {t("pending") || "Pending"}</>
                      )}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Exam Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              {t("examInstructions") || "Exam Instructions"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm mb-3">
              <p className="font-medium">{t("examRulesTitle") || "Exam Rules"}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{t("examRule1")}</li>
                <li>{t("examRule2")}</li>
                <li>{t("examRule3")}</li>
                {securitySettings.fullscreenEnabled && <li>{t("examRuleFullscreen")}</li>}
                {securitySettings.tabSwitchEnabled && <li>{t("examRuleTabSwitch")}</li>}
                {securitySettings.rightClickEnabled && <li>{t("examRuleRightClick")}</li>}
                {securitySettings.aiDetectionEnabled && <li>{t("examRules.noAISidebars")}</li>}
                {securitySettings.aiDetectionEnabled && <li>{t("examSecurity.aiShortcutsBlocked")}</li>}
                <li>{t("examSecurity.keyboardLocked")}</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 sm:gap-3 pt-2 border-t">
              <Checkbox
                id="accept-lobby"
                checked={instructionsAccepted}
                onCheckedChange={(checked) => setInstructionsAccepted(checked as boolean)}
              />
              <label
                htmlFor="accept-lobby"
                className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t("acceptExamInstructions") || "I have read and accept the exam instructions"}
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Start Now Button */}
        <Button
          onClick={handleStartNow}
          disabled={starting || !instructionsAccepted || joinedCount === 0}
          className="w-full"
          size="lg"
        >
          {starting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              {t("starting") || "Starting..."}
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              {t("startNow") || "Start Now"}
            </>
          )}
        </Button>

        {!instructionsAccepted && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("acceptInstructionsToStart") || "Accept the exam instructions to start"}
          </p>
        )}

        {instructionsAccepted && pendingCount > 0 && !starting && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("startWithoutWaiting") || "You can start now without waiting for others to join"}
          </p>
        )}

        {instructionsAccepted && joinedCount > 1 && !starting && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t("autoStartWhenAllReady") || "Exam will start automatically when all joined participants are ready"}
          </p>
        )}
      </div>
    </div>
  );
}
