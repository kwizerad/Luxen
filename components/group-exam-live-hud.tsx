"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Users, CheckCircle2, XCircle, Flame, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ParticipantProgress {
  userId: string;
  currentIndex: number;
  answeredCount: number;
  totalQuestions: number;
  timestamp: number;
}

interface ParticipantData {
  user_id: string;
  status: "pending" | "joined" | "ready" | "in_progress" | "completed" | "abandoned" | string;
  exam_attempt_id?: string | null;
  profile?: {
    id?: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  exam_attempt?: {
    score?: number;
    score_percentage?: number;
    duration_seconds?: number;
    total_questions?: number;
    completed_at?: string;
  } | null;
  liveProgress?: ParticipantProgress;
}

interface GroupExamLiveHUDProps {
  challengeId: string;
  currentUserId: string;
  currentIndex: number;
  answeredCount: number;
  totalQuestions: number;
  isExamActive: boolean;
}

function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GroupExamLiveHUD({
  challengeId,
  currentUserId,
  currentIndex,
  answeredCount,
  totalQuestions,
  isExamActive,
}: GroupExamLiveHUDProps) {
  const { t, language } = useLanguage();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [liveProgressMap, setLiveProgressMap] = useState<Record<string, ParticipantProgress>>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Record<string, boolean>>({});
  const [hasNewActivity, setHasNewActivity] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const previousStatusRef = useRef<Record<string, string>>({});
  const channelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Fetch initial challenge data and participants
  const fetchParticipants = useCallback(async () => {
    if (!challengeId) return;
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.participants) {
        const unique = Array.from(
          new Map(
            (data.participants as ParticipantData[]).map((p) => [p.user_id, p])
          ).values()
        );
        setParticipants(unique);
      }
    } catch (error) {
      console.warn("Failed to fetch live participants in HUD:", error);
    }
  }, [challengeId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Track status transitions to Completed and trigger celebratory animation & notification ping
  useEffect(() => {
    const newRecentlyCompleted: Record<string, boolean> = {};
    let hasNew = false;

    participants.forEach((p) => {
      const isCompleted = p.status === "completed" || !!p.exam_attempt;
      const prevStatus = previousStatusRef.current[p.user_id];

      // If user wasn't completed before and is completed now
      if (prevStatus && prevStatus !== "completed" && isCompleted) {
        newRecentlyCompleted[p.user_id] = true;
        hasNew = true;
      }
      previousStatusRef.current[p.user_id] = isCompleted ? "completed" : (p.status || "in_progress");
    });

    if (hasNew) {
      setRecentlyCompleted((prev) => ({ ...prev, ...newRecentlyCompleted }));
      setHasNewActivity(true);
      const timer = setTimeout(() => {
        setRecentlyCompleted((prev) => {
          const next = { ...prev };
          Object.keys(newRecentlyCompleted).forEach((k) => delete next[k]);
          return next;
        });
        setHasNewActivity(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [participants]);

  // Subscribe to real-time events for this challenge
  useEffect(() => {
    if (!challengeId) return;

    const channelName = `exam_challenge_${challengeId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "participant_progress" }, (payload: any) => {
        if (payload.payload?.userId) {
          const prog = payload.payload as ParticipantProgress;
          setLiveProgressMap((prev) => ({
            ...prev,
            [prog.userId]: prog,
          }));
          setHasNewActivity(true);
          setTimeout(() => setHasNewActivity(false), 2000);
        }
      })
      .on("broadcast", { event: "participant_finished" }, () => {
        fetchParticipants();
      })
      .on("broadcast", { event: "participant_abandoned" }, () => {
        fetchParticipants();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenge_participants",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Resilient periodic sync every 5 seconds
    const interval = setInterval(fetchParticipants, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [challengeId, supabase, fetchParticipants]);

  // Broadcast current user's progress when currentIndex or answeredCount changes
  useEffect(() => {
    if (!isExamActive || !challengeId || !currentUserId) return;

    const now = Date.now();
    // Broadcast immediately on answer or throttled to max once every 600ms
    if (now - lastBroadcastRef.current >= 600) {
      lastBroadcastRef.current = now;
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "participant_progress",
          payload: {
            userId: currentUserId,
            currentIndex,
            answeredCount,
            totalQuestions,
            timestamp: now,
          },
        });
      }
    }
  }, [currentIndex, answeredCount, totalQuestions, isExamActive, challengeId, currentUserId]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Only render HUD if there is an active challenge and participants exist
  if (!challengeId || participants.length === 0) {
    return null;
  }

  const completedCount = participants.filter((p) => p.status === "completed" || !!p.exam_attempt).length;
  const youTag = language === "rw" ? "(Wowe)" : language === "fr" ? "(Vous)" : "(You)";

  return (
    <>
      {/* Floating Action Button (Fixed on screen, mobile & desktop accessible) */}
      <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "relative flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-lg transition-all duration-200 border",
            isOpen
              ? "bg-primary text-primary-foreground border-primary shadow-primary/25 ring-2 ring-primary/30"
              : "bg-card/95 hover:bg-card text-foreground border-border/80 backdrop-blur-md shadow-xl hover:border-primary/50"
          )}
          aria-label={isOpen ? "Hide participants status" : "Show participants status"}
        >
          {/* People Icon */}
          <div className="relative flex items-center justify-center">
            <Users className="h-5 w-5 sm:h-5 sm:w-5" />
            {/* Pulsing Live Dot */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          {/* Participants Count Label */}
          <span className="text-xs sm:text-sm font-bold flex items-center gap-1">
            <span>{participants.length}</span>
            <span className="hidden xs:inline text-[11px] sm:text-xs font-medium opacity-85">
              {t("participants") || "Participants"}
            </span>
          </span>

          {/* Badge indicator for finished count */}
          <span
            className={cn(
              "text-[10px] sm:text-xs font-semibold px-1.5 py-0.2 rounded-full",
              isOpen
                ? "bg-white/20 text-white"
                : "bg-primary/10 text-primary dark:bg-primary/20"
            )}
          >
            {completedCount}/{participants.length}
          </span>

          {/* Activity Ping Indicator */}
          {hasNewActivity && !isOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: 3, duration: 0.6 }}
              className="absolute -top-1 -left-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-white shadow-xs text-[9px] font-bold"
            >
              •
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Floating Expandable Participants Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for easy mobile dismissal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/25 backdrop-blur-2xs sm:hidden"
            />

            {/* Panel Card */}
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={cn(
                "fixed z-50 rounded-2xl border border-border/90 bg-card/95 dark:bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col select-none",
                // Positioning: bottom-sheet on mobile, floating corner card on desktop
                "bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 max-h-[75vh]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {t("liveParticipantsHUD") || "Live Classmates Status"}
                    </h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {completedCount} of {participants.length} completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 bg-background/80">
                    {participants.length} {t("participants") || "Participants"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Participants List */}
              <div className="p-3 overflow-y-auto space-y-2 max-h-[55vh]">
                {participants.map((p, index) => {
                  const isMe = p.user_id === currentUserId;
                  const liveProg = isMe
                    ? { currentIndex, answeredCount, totalQuestions, timestamp: Date.now() }
                    : liveProgressMap[p.user_id];

                  const isCompleted = p.status === "completed" || !!p.exam_attempt;
                  const isAbandoned = p.status === "abandoned";
                  const isReadyOrJoined = p.status === "ready" || p.status === "joined";
                  const isJustCompleted = !!recentlyCompleted[p.user_id];

                  // Progress percentage calculation
                  const currAnswered = isCompleted
                    ? (p.exam_attempt?.total_questions || totalQuestions)
                    : liveProg?.answeredCount ?? (isReadyOrJoined ? 0 : 0);
                  const currentQuestionNumber = isCompleted
                    ? (p.exam_attempt?.total_questions || totalQuestions)
                    : (liveProg?.currentIndex !== undefined ? liveProg.currentIndex + 1 : (isMe ? currentIndex + 1 : 1));

                  const progressPercent = Math.min(
                    100,
                    Math.round((currAnswered / (totalQuestions || 20)) * 100)
                  );

                  const name = p.profile?.full_name || p.profile?.username || (isMe ? t("you") || "You" : `Student ${index + 1}`);

                  return (
                    <motion.div
                      key={p.user_id || index}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: isJustCompleted ? [1, 1.03, 1] : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "relative flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all text-xs",
                        isMe
                          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                          : isCompleted
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : isAbandoned
                          ? "bg-destructive/5 border-destructive/20 opacity-70"
                          : "bg-card/60 border-border/60 hover:bg-muted/30"
                      )}
                    >
                      {/* Left: Avatar + Name + Status */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Avatar with Status Overlay */}
                        <div className="relative shrink-0">
                          <Avatar className="h-8 w-8 border">
                            {p.profile?.avatar_url && <AvatarImage src={p.profile.avatar_url} alt={name} />}
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          {isCompleted ? (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            </span>
                          ) : isAbandoned ? (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-white">
                              <XCircle className="h-2.5 w-2.5" />
                            </span>
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-background" />
                          )}
                        </div>

                        {/* Name + Status Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[160px] text-xs">
                              {name}
                            </span>
                            {isMe && (
                              <Badge className="text-[9px] py-0 px-1 bg-primary text-primary-foreground font-bold shrink-0">
                                {youTag}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                            {isCompleted ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{t("participantFinished") || "Finished"}</span>
                                {p.exam_attempt?.score !== undefined && (
                                  <span>• {p.exam_attempt.score}/{p.exam_attempt.total_questions || totalQuestions} pts</span>
                                )}
                              </span>
                            ) : isAbandoned ? (
                              <span className="text-destructive font-medium flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                <span>{t("examLeftParticipant") || "Left"}</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                <Flame className="h-3 w-3 animate-pulse text-amber-500" />
                                <span>{t("answering") || "Answering"} Q{currentQuestionNumber}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress Percentage (No progress bar) */}
                      <div className="shrink-0 text-right flex flex-col items-end justify-center">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-md font-bold text-xs tabular-nums border",
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : isMe
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-foreground border-border"
                          )}
                        >
                          {progressPercent}%
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                          {currAnswered}/{totalQuestions}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span>{t("liveSync") || "Live syncing"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("close") || "Close"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
