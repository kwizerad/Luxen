"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Settings,
  ArrowRight,
  Play,
  CheckCircle2,
  Trophy,
  Users,
  FileText,
  GraduationCap,
  Sparkles,
  Clock,
  Target,
  Award,
  TrendingUp,
  Car,
  ShieldCheck,
  Zap,
  Sun,
  SunMedium,
  Moon,
  ChevronRight,
  RotateCcw,
  ClipboardList,
  AlertCircle,
  BarChart3,
  Calendar,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  getDashboardData,
  type ContinueLearningData,
  type DashboardStats,
} from "@/app/dashboard/actions/course";
import { isStandaloneExamEnabled, getExamAttempts } from "@/lib/supabase/queries";
import { getCachedServicesConfig } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/client";
import { HomeViewSkeleton } from "@/components/skeletons";
import { formatDistanceToNow } from "date-fns";

interface HomeViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface RecentAttempt {
  id: string;
  category_name?: string;
  score?: number;
  total_questions?: number;
  status?: string;
  created_at?: string;
  started_at?: string;
  is_passed?: boolean;
}

const DRIVING_TIPS = [
  {
    title: "The 2-Second Following Rule",
    desc: "Maintain at least a 2-second distance from the vehicle ahead in normal conditions; double it to 4 seconds during rain or low visibility.",
    category: "Safety",
  },
  {
    title: "Roundabout Priority",
    desc: "Always yield to vehicles already circulating inside the roundabout from your left unless traffic signs state otherwise.",
    category: "Priority",
  },
  {
    title: "Blind Spot Observation",
    desc: "Always physically check your shoulder blind spot before changing lanes or merging, in addition to using all three mirrors.",
    category: "Observation",
  },
  {
    title: "Hydroplaning Recovery",
    desc: "If your vehicle starts hydroplaning on wet asphalt, ease off the accelerator smoothly without slamming on the brakes.",
    category: "Hazard Control",
  },
  {
    title: "Pedestrian Crossings",
    desc: "Slow down and be prepared to stop completely whenever approaching marked zebra crossings or school zones.",
    category: "Regulations",
  },
];

export function HomeView({ navigate }: HomeViewProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language: interfaceLanguage } = useLanguage();
  const { config } = useBrandingConfig();

  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(true);
  const [servicesPageEnabled, setServicesPageEnabled] = useState<boolean>(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    avatar_url?: string;
  } | null>(null);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchGroupChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/exam-challenges");
      if (!res.ok) return;
      const data = await res.json();
      setGroupChallenges(data.challenges || []);
    } catch {
      // ignore
    }
  }, []);

  const handleRespondToInvitation = async (challengeId: string, categoryId: string, accept: boolean) => {
    const actionKey = `${challengeId}-${accept ? "join" : "deny"}`;
    setActionLoadingKey(actionKey);
    try {
      const endpoint = accept ? `/api/exam-challenges/${challengeId}/join` : `/api/exam-challenges/${challengeId}/deny`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to respond to invitation");
        return;
      }
      if (accept) {
        toast.success(t("invitationAccepted") || "Wemeye ubutumire! Winjiye mu kizamini.");
        window.location.href = `/dashboard/exam?challenge_id=${challengeId}&category_id=${categoryId}&from=dashboard`;
      } else {
        toast.info(t("invitationDeclined") || "Ubutumire bwanzwe.");
        fetchGroupChallenges();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to respond to invitation");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleCancelChallenge = async (challengeId: string) => {
    const actionKey = `${challengeId}-cancel`;
    setActionLoadingKey(actionKey);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("examCancelledSuccess") || "Ikizamini cyahagaritswe neza.");
        await fetchGroupChallenges();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel exam challenge");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel exam challenge");
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    const actionKey = `${challengeId}-leave`;
    setActionLoadingKey(actionKey);
    try {
      const res = await fetch(`/api/exam-challenges/${challengeId}/deny`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(t("examLeftSuccess") || "Wavuye mu cyumba cy'ikizamini.");
        await fetchGroupChallenges();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to leave exam room");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to leave exam room");
    } finally {
      setActionLoadingKey(null);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;

    const loadData = async () => {
      try {
        fetchGroupChallenges();
        const supabase = createClient();
        const fetchUserProfile = async () => {
          try {
            const { data } = await supabase
              .from("user_profiles")
              .select("full_name, avatar_url")
              .eq("id", user.id)
              .maybeSingle();
            return data;
          } catch {
            return null;
          }
        };
        const profilePromise = fetchUserProfile();

        const [dashResult, attemptsResult, examEnabledResult, servicesConfigResult, profileResult] = await Promise.allSettled([
          Promise.race([
            getDashboardData(interfaceLanguage),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Dashboard timeout")), 5000)
            ),
          ]),
          getExamAttempts().catch(() => ({ attempts: [] })),
          isStandaloneExamEnabled().catch(() => true),
          getCachedServicesConfig().catch(() => ({ pageEnabled: true, services: {} })),
          profilePromise,
        ]);

        if (mounted) {
          if (dashResult.status === "fulfilled" && dashResult.value) {
            setContinueData(dashResult.value.continueLearning);
            setStats(dashResult.value.stats);
          }
          if (attemptsResult.status === "fulfilled" && attemptsResult.value?.attempts) {
            setRecentAttempts(
              (attemptsResult.value.attempts as unknown as RecentAttempt[]).slice(0, 5)
            );
          }
          if (examEnabledResult.status === "fulfilled") {
            setStandaloneExamEnabled(examEnabledResult.value);
          }
          if (servicesConfigResult.status === "fulfilled") {
            setServicesPageEnabled(servicesConfigResult.value.pageEnabled);
          }
          if (profileResult.status === "fulfilled" && profileResult.value) {
            setUserProfile(profileResult.value);
          }
        }
      } catch (err) {
        console.error("Failed to load student dashboard data:", err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [authLoading, user, interfaceLanguage]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t("goodMorning") || "Good morning", icon: Sun };
    if (hour < 17) return { text: t("goodAfternoon") || "Good afternoon", icon: SunMedium };
    return { text: t("goodEvening") || "Good evening", icon: Moon };
  }, [t]);

  const getDisplayName = useCallback(() => {
    if (userProfile?.full_name) return userProfile.full_name;
    const meta = user?.user_metadata;
    if (meta?.full_name) return meta.full_name;
    if (meta?.first_name && meta?.last_name) return `${meta.first_name} ${meta.last_name}`;
    if (meta?.username) return meta.username;
    return user?.email?.split("@")[0] || t("student") || "Student";
  }, [userProfile, user, t]);

  const displayAvatar = userProfile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.google_avatar_url || user?.user_metadata?.picture;

  const getInitials = useCallback(() => {
    const name = getDisplayName();
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [getDisplayName]);

  // Overall Theory Readiness score computation
  const readinessScore = useMemo(() => {
    const lessonProgress = stats?.progressPercent || 0;
    let examScoreAvg = 0;
    if (recentAttempts.length > 0) {
      const totalScorePercent = recentAttempts.reduce((acc, a) => {
        const total = a.total_questions || 20;
        const score = a.score || 0;
        return acc + (score / total) * 100;
      }, 0);
      examScoreAvg = Math.round(totalScorePercent / recentAttempts.length);
    }

    if (recentAttempts.length === 0) {
      return Math.min(100, Math.round(lessonProgress * 0.9));
    }
    return Math.min(100, Math.round(lessonProgress * 0.4 + examScoreAvg * 0.6));
  }, [stats, recentAttempts]);

  const examAverageScore = useMemo(() => {
    if (recentAttempts.length === 0) return null;
    const totalScorePercent = recentAttempts.reduce((acc, a) => {
      const total = a.total_questions || 20;
      const score = a.score || 0;
      return acc + (score / total) * 100;
    }, 0);
    return Math.round(totalScorePercent / recentAttempts.length);
  }, [recentAttempts]);

  const passedAttemptsCount = useMemo(() => {
    return recentAttempts.filter((a) => a.is_passed || (a.score && a.total_questions && (a.score / a.total_questions) >= 0.8)).length;
  }, [recentAttempts]);

  const activeGroupChallenges = useMemo(() => {
    if (!user) return [];
    return groupChallenges.filter((c) => {
      if (!c.created_at) return false;
      const age = now - new Date(c.created_at).getTime();
      if (age > 60 * 60 * 1000) return false;
      if (c.status === "cancelled") return false;

      const isCreator = c.creator_id === user.id;
      const myParticipation = c.participants?.find((p: any) => p.user_id === user.id);
      if (!isCreator && !myParticipation) return false;

      if (myParticipation?.status === "abandoned" || myParticipation?.status === "declined") {
        return false;
      }

      const hasCompleted =
        myParticipation?.status === "completed" ||
        Boolean(myParticipation?.exam_attempt_id) ||
        c.status === "completed";

      const isPendingInvite = myParticipation?.status === "pending" && !isCreator;
      const isJoinedOrReady =
        myParticipation &&
        (myParticipation.status === "joined" ||
          myParticipation.status === "ready" ||
          myParticipation.status === "in_progress");

      return isPendingInvite || isJoinedOrReady || isCreator || hasCompleted;
    });
  }, [groupChallenges, user, now]);

  const hasCourses = (stats?.totalLessons ?? 0) > 0;
  const progressPercent = stats?.progressPercent ?? 0;

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % DRIVING_TIPS.length);
  };

  if (authLoading || (loadingData && !stats)) {
    return <HomeViewSkeleton />;
  }

  const GreetingIcon = greeting.icon;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      {/* Active Group Exam Space (ONLY shown if user is invited or is the creator) */}
      {activeGroupChallenges.length > 0 && (
        <section className="space-y-3">
          {activeGroupChallenges.map((challenge) => {
            const isCreator = challenge.creator_id === user?.id;
            const myParticipation = challenge.participants?.find((p: any) => p.user_id === user?.id);
            const hasCompleted =
              myParticipation?.status === "completed" ||
              Boolean(myParticipation?.exam_attempt_id) ||
              challenge.status === "completed";
            const isPendingInvite = myParticipation?.status === "pending" && !isCreator && !hasCompleted;
            const createdAt = challenge.created_at ? new Date(challenge.created_at).getTime() : Date.now();
            const secondsLeft = Math.max(0, 30 - Math.floor((now - createdAt) / 1000));
            const isExpired = isPendingInvite && secondsLeft <= 0;

            if (isExpired) return null;

            const joinedParticipants = (challenge.participants || []).filter(
              (p: any) => p.status === "joined" || p.status === "ready" || p.status === "completed" || p.status === "in_progress"
            );

            return (
              <div
                key={challenge.id}
                className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-amber-500/10 p-4 sm:p-5 shadow-md animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Icon & Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <Trophy className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasCompleted ? (
                          <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{t("youCompletedThisExam") || "Wasoje iki kizamini"}</span>
                          </Badge>
                        ) : isPendingInvite ? (
                          <Badge className="bg-amber-500 text-amber-950 font-bold text-[10px] px-2 py-0.5 shadow-xs">
                            {t("groupExamInvitation") || "Ubutumire bw'Ikizamini"}
                          </Badge>
                        ) : (
                          <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2 py-0.5 shadow-xs">
                            {t("activeGroupExam") || "Ikizamini cy'Itsinda Kirafunguye"}
                          </Badge>
                        )}

                        {isPendingInvite && (
                          <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {secondsLeft}s {t("left") || "zisigaye"}
                          </Badge>
                        )}

                        {!hasCompleted && challenge.status === "active" && (
                          <Badge variant="outline" className="text-[10px] font-bold border-blue-500/40 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                            {t("ongoing") || "Biri Gukorwa"}
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                        {challenge.category_name || "Ikizamini cy'Amategeko y'Umuhanda"}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>
                          {isCreator
                            ? (t("youCreatedThisExam") || "Wateguye iki kizamini")
                            : `${t("invitedBy") || "Watumiwe na"}: ${challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Mugenzi wawe"}`}
                        </span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-primary" />
                          <span>
                            {joinedParticipants.length} {t("joined") || "abamaze kwinjira"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {hasCompleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigate("classmates/group-results", { id: challenge.id });
                        }}
                        className="h-9 rounded-xl text-xs font-bold gap-1.5 px-4 hover:bg-primary/10 hover:text-primary hover:border-primary/40 shadow-xs transition-all"
                      >
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>{t("viewDetails") || "View Details"}</span>
                      </Button>
                    ) : isPendingInvite ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoadingKey !== null}
                          onClick={() => handleRespondToInvitation(challenge.id, challenge.category_id, false)}
                          className="h-9 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3"
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
                          className="h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1 px-4"
                        >
                          {actionLoadingKey === `${challenge.id}-join` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{t("acceptAndJoin") || "Injira mu Kizamini"}</span>
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoadingKey !== null}
                          onClick={() => (isCreator ? handleCancelChallenge(challenge.id) : handleLeaveChallenge(challenge.id))}
                          className="h-9 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3"
                        >
                          {actionLoadingKey === `${challenge.id}-cancel` || actionLoadingKey === `${challenge.id}-leave` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <X className="h-3.5 w-3.5" />
                              <span>{isCreator ? t("cancelExam") : t("leaveExam")}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${challenge.category_id}&from=dashboard`;
                          }}
                          className="h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm gap-1.5 px-4"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{t("enterWaitingRoom")}</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Welcome Header */}
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Student ID Photo or Avatar */}
            {displayAvatar ? (
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-sm shrink-0 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayAvatar}
                  alt={getDisplayName()}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-lg sm:text-xl shrink-0 shadow-sm">
                {getInitials()}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  <GreetingIcon className="w-3.5 h-3.5" />
                  <span>{greeting.text}</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                {t("welcomeBack") || "Welcome back"},{" "}
                <span className="text-primary">{getDisplayName()}</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                {hasCourses
                  ? t("studentDashboardSubtitle") || "Track your theory progress, review past exam attempts, and practice driving regulations."
                  : t("coursesUnderPreparation") || "Your driving theory curriculum is being prepared. Practice official mock exams and explore student services."}
              </p>
            </div>
          </div>

          {/* Theory Readiness Meter */}
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border shrink-0">
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted-foreground/20"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary transition-all duration-500 ease-out"
                  strokeDasharray={`${readinessScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold">{readinessScore}%</span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">{t("theoryReadiness") || "Theory Readiness"}</div>
              <div className="text-sm font-semibold text-foreground">
                {readinessScore >= 80 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{t("examReady") || "Exam Ready"}</span>
                ) : readinessScore >= 50 ? (
                  <span className="text-amber-600 dark:text-amber-400">{t("inProgress") || "In Progress"}</span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400">{t("gettingStarted") || "Getting Started"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Hero Row: Take Practice Exam (First) + Conditional Course Progress (Second, ONLY when courses published) */}
      {(standaloneExamEnabled || hasCourses) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Take Exam Card (First) - Rendered ONLY if standalone exam is enabled */}
          {standaloneExamEnabled && (
            <div className={hasCourses ? "lg:col-span-1" : "lg:col-span-3"}>
              <div className="h-full rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      {t("officialSimulation") || "Mock Exam"}
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                    {t("takePracticeExam") || "Take Mock Exam"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("examSimulationDesc") || "Simulate real test conditions with timed multiple-choice questions and instant scoring."}
                  </p>

                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {t("duration") || "Duration"}
                      </span>
                      <span className="font-medium text-foreground">20 {t("minutes") || "min"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5" />
                        {t("passingScore") || "Passing Score"}
                      </span>
                      <span className="font-medium text-foreground">80%</span>
                    </div>
                  </div>
                </div>

                {/* SINGLE TAKE EXAM BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/exam");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t("startExamNow") || "Start Exam"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Course Curriculum / Continue Learning Card - DISPLAYED ONLY WHEN COURSE IS PUBLISHED */}
          {hasCourses && (
            <div className={standaloneExamEnabled ? "lg:col-span-2" : "lg:col-span-3"}>
              <div className="h-full rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-foreground">
                          {t("theoryCurriculum") || "Theory Curriculum"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {stats ? `${stats.lessonsCompleted} ${t("of") || "of"} ${stats.totalLessons} ${t("lessonsCompleted") || "lessons completed"}` : t("loading")}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-md bg-primary/10">
                      {progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden mb-5">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Active Lesson / Course Status */}
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {continueData?.moduleTitle || t("activeModule") || "Current Module"}
                      </span>
                      <span>{continueData?.courseTitle || t("theoryCourse") || "Theory Course"}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
                      {continueData?.lessonTitle || t("continueNextLesson") || "Continue to your next structured lesson"}
                    </p>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (continueData?.lessonId) {
                        navigate("course", { lessonId: continueData.lessonId });
                      } else {
                        navigate("course");
                      }
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <span>{t("continueLearning") || "Continue Learning"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Matrix (Distinct, dedicated targets with ZERO duplicate exam triggers) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
          {t("quickActions") || "Quick Actions"}
        </h2>
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${hasCourses ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3 sm:gap-4`}>
          {/* Action 1: Theory Course - ONLY SHOWN WHEN COURSES PUBLISHED */}
          {hasCourses && (
            <button
              type="button"
              onClick={() => navigate("course")}
              className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-2.5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground line-clamp-1">{t("theoryCourse") || "Theory Course"}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("learnModules") || "Lessons & signs"}</span>
            </button>
          )}

          {/* Action 2: Services */}
          {servicesPageEnabled && (
            <button
              type="button"
              onClick={() => navigate("services")}
              className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2.5 group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground line-clamp-1">{t("services") || "Services"}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("allServicesDesc") || "Permits, hub & exams"}</span>
            </button>
          )}

          {/* Action 3: Classmates / Friends */}
          <button
            type="button"
            onClick={() => navigate("classmates")}
            className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center group"
          >
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground line-clamp-1">{t("classmatesAndFriends") || "Classmates / Friends"}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("chatAndChallenges") || "Chat & peer challenges"}</span>
          </button>

          {/* Action 4: Exam Results & Analytics */}
          <button
            type="button"
            onClick={() => navigate("results")}
            className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center group"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground line-clamp-1">{t("examHistory") || "Exam Results"}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("reviewScores") || "Past reports"}</span>
          </button>

          {/* Action 5: Account Settings */}
          <button
            type="button"
            onClick={() => navigate("settings")}
            className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all text-center group"
          >
            <div className="p-3 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-foreground line-clamp-1">{t("settings") || "Settings"}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t("languageTheme") || "Profile & language"}</span>
          </button>
        </div>
      </section>

      {/* Live Statistics & Performance Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {hasCourses ? (
          <>
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">{t("lessonsCompleted") || "Lessons Mastered"}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats?.lessonsCompleted ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {stats?.totalLessons ?? 0}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">{t("modulesFinished") || "Modules Done"}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {stats?.modulesCompleted ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ {stats?.totalModules ?? 0}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium">{t("totalExamsTaken") || "Exams Taken"}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {recentAttempts.length}
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium">{t("passRate") || "Pass Rate"}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {recentAttempts.length > 0 ? `${Math.round((passedAttemptsCount / recentAttempts.length) * 100)}%` : "—"}
              </div>
            </div>
          </>
        )}

        <div className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium">{t("averageExamScore") || "Exam Average"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {examAverageScore !== null ? `${examAverageScore}%` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium">{t("passedExams") || "Passed Tests"}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {passedAttemptsCount}
            <span className="text-xs font-normal text-muted-foreground ml-1">/ {recentAttempts.length}</span>
          </div>
        </div>
      </section>

      {/* Two Columns: Recent Actions Log + Highway Safety Handbook Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Actions & History */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("recentActivity") || "Recent Actions"}
            </h2>
            {recentAttempts.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("results")}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("viewAllResults") || "View all results"}
              </button>
            )}
          </div>

          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden divide-y">
            {recentAttempts.length > 0 ? (
              recentAttempts.map((attempt) => {
                const total = attempt.total_questions || 20;
                const score = attempt.score || 0;
                const percent = Math.round((score / total) * 100);
                const isPassed = attempt.is_passed || percent >= 80;
                const attemptDate = attempt.created_at || attempt.started_at;

                return (
                  <div
                    key={attempt.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPassed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {attempt.category_name || t("mockExam") || "Practice Exam"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attemptDate ? formatDistanceToNow(new Date(attemptDate), { addSuffix: true }) : t("completed")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          {score} / {total}
                        </div>
                        <div
                          className={`text-[11px] font-semibold ${
                            isPassed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {percent}% · {isPassed ? (t("passed") || "Passed") : (t("failed") || "Failed")}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate("results", { attemptId: attempt.id })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={t("viewDetails") || "View Details"}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  {t("noRecentActivity") || "No recent activity yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t("startLessonOrExamHint") || "Complete your theory lessons or take a practice mock exam to generate performance logs."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Highway Safety Tip Card */}
        <section className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("drivingHandbookTip") || "Safety Handbook Tip"}
            </h2>
            <button
              type="button"
              onClick={handleNextTip}
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t("nextTip") || "Next tip"}</span>
            </button>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-3 h-3" />
              <span>{DRIVING_TIPS[tipIndex].category}</span>
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {DRIVING_TIPS[tipIndex].title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {DRIVING_TIPS[tipIndex].desc}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
