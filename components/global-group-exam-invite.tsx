"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { canViewUserAvatar } from "@/lib/avatar-helper";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PendingInvite {
  id: string;
  category_id: string;
  category_name: string;
  language?: string;
  creator_id: string;
  created_at: string;
  creator_profile?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export function GlobalGroupExamInvite() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [activeInvite, setActiveInvite] = useState<PendingInvite | null>(null);
  const activeInviteRef = useRef<PendingInvite | null>(null);
  activeInviteRef.current = activeInvite;

  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [acting, setActing] = useState<boolean>(false);
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const checkForPendingInvites = useCallback(async () => {
    if (!user || isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      const res = await fetch("/api/exam-challenges");
      if (!res.ok) return;
      const data = await res.json();
      const challenges = data.challenges || [];

      // Find the most recent pending invite that hasn't expired (> 30s) and not dismissed
      const now = Date.now();
      const validPending = challenges.find((c: any) => {
        if (c.status !== "pending") return false;
        if (c.creator_id === user.id) return false; // Never prompt creator to accept their own invite
        if (dismissedIdsRef.current.has(c.id)) return false;
        const myPart = (c.participants || []).find((p: any) => p.user_id === user.id);
        if (!myPart || myPart.status !== "pending") return false;

        const createdAt = new Date(c.created_at).getTime();
        const diffSeconds = Math.floor((now - createdAt) / 1000);
        return diffSeconds >= 0 && diffSeconds < 30;
      });

      if (validPending) {
        // Don't show if user is currently inside an active exam or inside this challenge's exam room
        if (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true") {
          return;
        }
        const currentUrl = typeof window !== "undefined" ? window.location.href : "";
        if (currentUrl.includes(`challenge_id=${validPending.id}`)) {
          return;
        }

        const createdAt = new Date(validPending.created_at).getTime();
        const initialSeconds = Math.max(0, 30 - Math.floor((Date.now() - createdAt) / 1000));
        setSecondsRemaining(initialSeconds);
        setActiveInvite(validPending);
      } else {
        // No valid invite
        if (activeInviteRef.current && !dismissedIdsRef.current.has(activeInviteRef.current.id)) {
          // If the current active invite expired or was cancelled
          setActiveInvite(null);
        }
      }
    } catch {
      // Ignore network errors in background check
    } finally {
      isCheckingRef.current = false;
    }
  }, [user]);

  // Initial check and realtime subscription
  useEffect(() => {
    if (!user) return;

    checkForPendingInvites();

    // Subscribe to challenge table & participant changes
    const channelName = `global_exam_invites_${user.id}_${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenge_participants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkForPendingInvites();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_challenges",
        },
        () => {
          checkForPendingInvites();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      checkForPendingInvites();
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, supabase, checkForPendingInvites]);

  // 1-second countdown ticker for active invite
  useEffect(() => {
    if (!activeInvite) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const createdAt = new Date(activeInvite.created_at).getTime();

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, 30 - Math.floor((Date.now() - createdAt) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        dismissedIdsRef.current.add(activeInvite.id);
        setActiveInvite(null);
        toast.info(t("challengeExpired") || "Group exam request expired (30s time limit reached)");
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeInvite, t]);

  const handleJoin = async () => {
    if (!activeInvite || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/exam-challenges/${activeInvite.id}/join`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(t("invitationAccepted") || "Joined group exam!");
        const challengeId = activeInvite.id;
        const categoryId = activeInvite.category_id;
        const inviteLang = activeInvite.language || "Kinyarwanda";
        dismissedIdsRef.current.add(challengeId);
        setActiveInvite(null);
        const hashTarget = `#exam?challenge_id=${encodeURIComponent(challengeId)}&category_id=${encodeURIComponent(categoryId || "")}&language=${encodeURIComponent(inviteLang)}`;
        if (pathname === "/dashboard") {
          window.location.hash = hashTarget;
          window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
        } else {
          router.push(`/dashboard${hashTarget}`);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || t("failedToRespond") || "Failed to join");
        dismissedIdsRef.current.add(activeInvite.id);
        setActiveInvite(null);
      }
    } catch {
      toast.error(t("failedToRespond") || "Failed to join");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!activeInvite || acting) return;
    setActing(true);
    try {
      await fetch(`/api/exam-challenges/${activeInvite.id}/deny`, {
        method: "POST",
      });
      dismissedIdsRef.current.add(activeInvite.id);
      setActiveInvite(null);
      toast.info(t("invitationDeclined") || "Group exam invitation declined");
    } catch {
      dismissedIdsRef.current.add(activeInvite.id);
      setActiveInvite(null);
    } finally {
      setActing(false);
    }
  };

  // Hide if no invite, or if on active exam page with same challenge
  if (!activeInvite) return null;

  const inviterName =
    activeInvite.creator_profile?.full_name ||
    activeInvite.creator_profile?.username ||
    "A classmate";

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 30) * 100));

  return (
    <div className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="pointer-events-auto w-full max-w-sm rounded-3xl border-2 border-amber-500/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden ring-4 ring-amber-500/10 transition-all">
        {/* Animated Progress Bar */}
        <div className="h-1.5 w-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              secondsRemaining <= 10 ? "bg-red-500" : secondsRemaining <= 20 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-5 flex flex-col items-center text-center">
          {/* Top Bar: Sender & Countdown */}
          <div className="w-full flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 ring-1 ring-border shrink-0">
                {canViewUserAvatar(activeInvite.creator_profile?.avatar_url, activeInvite.creator_id, user?.id, user?.user_metadata?.role) && activeInvite.creator_profile?.avatar_url ? (
                  <AvatarImage src={activeInvite.creator_profile.avatar_url} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[11px]">
                    {getInitials(inviterName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-xs font-semibold text-foreground truncate">{inviterName}</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
              <Clock className="h-3 w-3 animate-spin text-amber-500" />
              <span>{secondsRemaining}s</span>
            </div>
          </div>

          {/* Big Trophy Icon */}
          <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-primary/15 border-2 border-amber-500/40 text-amber-500 dark:text-amber-400 shadow-lg">
            <Trophy className="h-11 w-11 drop-shadow-sm" />
          </div>

          <h3 className="text-sm font-bold text-foreground tracking-tight">
            {t("groupExam") || "Group Exam"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
            <span className="font-semibold text-foreground">{activeInvite.category_name}</span>
            {activeInvite.language ? (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                {activeInvite.language}
              </span>
            ) : null}
          </p>

          {/* Accept & Reject Buttons directly under the Big Trophy */}
          <div className="mt-4 w-full grid grid-cols-2 gap-2.5">
            <Button
              onClick={handleJoin}
              disabled={acting || secondsRemaining <= 0}
              size="sm"
              className="h-10 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
            >
              {acting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              {t("accept") || "Accept"}
            </Button>
            <Button
              onClick={handleReject}
              disabled={acting}
              variant="outline"
              size="sm"
              className="h-10 rounded-xl font-bold text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
            >
              <X className="h-4 w-4 mr-1.5" />
              {t("reject") || "Reject"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
