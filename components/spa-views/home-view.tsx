"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Clock,
  Target,
  Award,
  TrendingUp,
  Car,
  ShieldCheck,
  Sun,
  SunMedium,
  Moon,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  Loader2,
  Flame,
  UserCheck,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import {
  getDashboardData,
  type ContinueLearningData,
  type DashboardStats,
} from "@/app/dashboard/actions/course";
import { isStandaloneExamEnabled } from "@/lib/supabase/queries";
import { getCachedServicesConfig } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/client";
import { HomeViewSkeleton } from "@/components/skeletons";
import { formatDistanceToNow } from "date-fns";
import type { UserProfile } from "@/lib/database.types";

interface HomeViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface FullExamAttempt {
  id: string;
  category_id?: string;
  category_name?: string;
  score?: number;
  correct_answers?: number;
  total_questions?: number;
  score_percentage?: number;
  duration_seconds?: number;
  status?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  is_passed?: boolean;
  passed?: boolean;
  answers?: any[];
  exam_type?: string;
  submission_reason?: string;
}

interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  attemptsCount: number;
  avgScorePercent: number;
  bestScorePercent: number;
  isWeak: boolean;
  status: "mastered" | "on_track" | "needs_focus";
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
  const [allAttempts, setAllAttempts] = useState<FullExamAttempt[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(true);
  const [servicesPageEnabled, setServicesPageEnabled] = useState<boolean>(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<any | null>(null);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [battleStats, setBattleStats] = useState<{ totalBattles: number; wins: number }>({
    totalBattles: 0,
    wins: 0,
  });
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

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      fetchGroupChallenges();
      const supabase = createClient();

      // Fetch user profile
      const fetchProfile = async () => {
        try {
          const { data } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          return data;
        } catch {
          return null;
        }
      };

      // Fetch all exam attempts
      const fetchAttempts = async () => {
        try {
          // Fetch from standard mock / category exam_attempts
          const examPromise = supabase
            .from("exam_attempts")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          // Fetch from module / curriculum course exam_attempts
          const modulePromise = supabase
            .from("module_exam_attempts")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          const [examRes, moduleRes] = await Promise.allSettled([examPromise, modulePromise]);

          const standardAttempts: FullExamAttempt[] =
            examRes.status === "fulfilled" && examRes.value.data
              ? examRes.value.data
                  .filter((att: any) => att.hidden_from_user !== true)
                  .map((att: any) => {
                  let correct = att.correct_answers;
                  let scorePct = att.score_percentage;
                  const total = att.total_questions || 20;

                  // If correct answers not set but answers array has entries
                  if ((correct === null || correct === undefined || correct === 0) && Array.isArray(att.answers) && att.answers.length > 0) {
                    const count = att.answers.filter((a: any) => a.is_correct).length;
                    if (count > 0) {
                      correct = count;
                    }
                  }

                  if (scorePct === null || scorePct === undefined) {
                    scorePct = correct !== null && correct !== undefined ? Math.round((correct / total) * 100) : 0;
                  } else if ((correct === null || correct === undefined || correct === 0) && scorePct > 0) {
                    correct = Math.round((scorePct / 100) * total);
                  }

                  const isPassed = scorePct >= 50;

                  return {
                    id: att.id,
                    category_id: att.category_id,
                    category_name: att.category_name,
                    total_questions: total,
                    correct_answers: correct ?? 0,
                    score_percentage: scorePct ?? 0,
                    duration_seconds: att.duration_seconds || 0,
                    status: att.status || "completed",
                    started_at: att.started_at,
                    completed_at: att.completed_at || att.created_at || att.started_at,
                    created_at: att.created_at,
                    is_passed: isPassed,
                    answers: att.answers,
                    submission_reason: att.submission_reason,
                    exam_type: "mock",
                  };
                })
              : [];

          const moduleAttempts: FullExamAttempt[] =
            moduleRes.status === "fulfilled" && moduleRes.value.data
              ? moduleRes.value.data.map((att: any) => {
                  let correct = att.correct_answers;
                  let scorePct = att.score_percentage;
                  const total = att.total_questions || 20;

                  if ((correct === null || correct === undefined || correct === 0) && Array.isArray(att.answers) && att.answers.length > 0) {
                    const count = att.answers.filter((a: any) => a.is_correct).length;
                    if (count > 0) {
                      correct = count;
                    }
                  }

                  if (scorePct === null || scorePct === undefined) {
                    scorePct = correct !== null && correct !== undefined ? Math.round((correct / total) * 100) : 0;
                  } else if ((correct === null || correct === undefined || correct === 0) && scorePct > 0) {
                    correct = Math.round((scorePct / 100) * total);
                  }

                  const examTypeLabel =
                    att.exam_type === "final"
                      ? "Final Comprehensive Exam"
                      : att.exam_type === "midterm"
                      ? "Midterm Exam"
                      : att.module_title
                      ? `${att.module_title} (Module Exam)`
                      : "Module Exam";

                  return {
                    id: att.id,
                    category_id: att.module_id || "module",
                    category_name: examTypeLabel,
                    total_questions: total,
                    correct_answers: correct ?? 0,
                    score_percentage: scorePct ?? 0,
                    duration_seconds: att.duration_seconds || 0,
                    status: att.status || "completed",
                    started_at: att.started_at,
                    completed_at: att.completed_at || att.created_at || att.started_at,
                    created_at: att.created_at,
                    passed: att.passed,
                    is_passed: att.passed !== undefined ? att.passed : scorePct >= 60,
                    answers: att.answers,
                    exam_type: att.exam_type || "module",
                  };
                })
              : [];

          // Combine and sort by date descending (most recent first)
          const all = [...standardAttempts, ...moduleAttempts].sort((a, b) => {
            const dateA = new Date(a.completed_at || a.created_at || a.started_at || 0).getTime();
            const dateB = new Date(b.completed_at || b.created_at || b.started_at || 0).getTime();
            return dateB - dateA;
          });

          return all;
        } catch (err) {
          console.error("Failed to fetch user exam attempts:", err);
          return [];
        }
      };

      // Fetch upcoming practical booking
      const fetchUpcomingBooking = async () => {
        try {
          const { data } = await supabase
            .from("driver_bookings")
            .select("*, drivers(*)")
            .eq("student_id", user.id)
            .in("status", ["booked", "pending"])
            .order("booking_date", { ascending: true })
            .limit(1);
          return data?.[0] || null;
        } catch {
          return null;
        }
      };

      // Fetch group battle stats
      const fetchBattleStats = async () => {
        try {
          const { data } = await supabase
            .from("exam_challenge_participants")
            .select("id, challenge_id, status, exam_attempt_id")
            .eq("user_id", user.id);
          const totalBattles = data?.length || 0;
          return { totalBattles, wins: 0 };
        } catch {
          return { totalBattles: 0, wins: 0 };
        }
      };

      const [dashResult, attemptsData, examEnabledResult, servicesConfigResult, profileData, bookingData, battlesData] = await Promise.allSettled([
        Promise.race([
          getDashboardData(interfaceLanguage),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Dashboard timeout")), 5000)
          ),
        ]),
        fetchAttempts(),
        isStandaloneExamEnabled().catch(() => true),
        getCachedServicesConfig().catch(() => ({ pageEnabled: true, services: {} })),
        fetchProfile(),
        fetchUpcomingBooking(),
        fetchBattleStats(),
      ]);

      if (dashResult.status === "fulfilled" && dashResult.value) {
        setContinueData(dashResult.value.continueLearning);
        setStats(dashResult.value.stats);
      }
      if (attemptsData.status === "fulfilled") {
        setAllAttempts(attemptsData.value as unknown as FullExamAttempt[]);
      }
      if (examEnabledResult.status === "fulfilled") {
        setStandaloneExamEnabled(examEnabledResult.value);
      }
      if (servicesConfigResult.status === "fulfilled") {
        setServicesPageEnabled(servicesConfigResult.value.pageEnabled);
      }
      if (profileData.status === "fulfilled" && profileData.value) {
        setUserProfile(profileData.value as unknown as UserProfile);
      }
      if (bookingData.status === "fulfilled") {
        setUpcomingBooking(bookingData.value);
      }
      if (battlesData.status === "fulfilled") {
        setBattleStats(battlesData.value);
      }
    } catch (err) {
      console.error("Failed to load student dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user, interfaceLanguage, fetchGroupChallenges]);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    loadData();
    return () => {
      mounted = false;
    };
  }, [authLoading, user, loadData]);

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

  // Profile completeness calculation
  const profileCompleteness = useMemo(() => {
    let score = 25; // Has email/account
    if (userProfile?.full_name || user?.user_metadata?.full_name) score += 25;
    if (displayAvatar) score += 20;
    if (userProfile?.birthdate || userProfile?.nationality) score += 15;
    if (userProfile?.national_id) score += 15;
    return Math.min(100, score);
  }, [userProfile, user, displayAvatar]);

  // Exam analytics from real attempts
  const examStats = useMemo(() => {
    // Filter out empty in-progress drafts if user has actual attempts
    const validAttempts = allAttempts.filter(
      (a) => (a.status !== "abandoned" && a.status !== "in_progress") || (a.correct_answers !== undefined && a.correct_answers > 0) || (a.score_percentage !== undefined && a.score_percentage > 0)
    );
    const attemptsToUse = validAttempts.length > 0 ? validAttempts : allAttempts;
    const total = attemptsToUse.length;
    if (total === 0) {
      return {
        total: 0,
        passed: 0,
        passRate: 0,
        avgScore: 0,
        bestScore: 0,
        totalStudySeconds: 0,
        avgDurationSeconds: 0,
      };
    }

    let passedCount = 0;
    let sumScorePct = 0;
    let bestScorePct = 0;
    let totalSeconds = 0;

    for (const att of attemptsToUse) {
      const qCount = att.total_questions || 20;
      let score = att.correct_answers ?? att.score ?? 0;
      let pct = att.score_percentage;
      if (pct === undefined || pct === null) {
        pct = Math.round((score / qCount) * 100);
      } else if (score === 0 && pct > 0) {
        score = Math.round((pct / 100) * qCount);
      }
      const isPassed = att.is_passed ?? att.passed ?? (pct >= 60);

      if (isPassed) passedCount++;
      sumScorePct += pct;
      if (pct > bestScorePct) bestScorePct = pct;
      totalSeconds += att.duration_seconds || 0;
    }

    const avgScore = Math.round(sumScorePct / total);
    const passRate = Math.round((passedCount / total) * 100);
    const avgDurationSeconds = Math.round(totalSeconds / total);

    return {
      total,
      passed: passedCount,
      passRate,
      avgScore,
      bestScore: bestScorePct,
      totalStudySeconds: totalSeconds,
      avgDurationSeconds,
    };
  }, [allAttempts]);

  // Total formatted study time
  const formattedStudyTime = useMemo(() => {
    const totalSecs = examStats.totalStudySeconds;
    if (totalSecs === 0) return "0 min";
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }, [examStats.totalStudySeconds]);

  // Average time per exam
  const formattedAvgDuration = useMemo(() => {
    const secs = examStats.avgDurationSeconds;
    if (secs === 0) return "—";
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  }, [examStats.avgDurationSeconds]);

  // Activity Streak calculation
  const streakDays = useMemo(() => {
    if (allAttempts.length === 0) return 0;
    const uniqueDates = Array.from(
      new Set(
        allAttempts
          .map((a) => {
            const dateStr = a.completed_at || a.created_at || a.started_at;
            return dateStr ? new Date(dateStr).toDateString() : null;
          })
          .filter(Boolean)
      )
    ).sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    let streak = 1;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const lastActive = uniqueDates[0];
    if (lastActive !== today && lastActive !== yesterday) {
      return 0;
    }

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const curr = new Date(uniqueDates[i] as string).getTime();
      const next = new Date(uniqueDates[i + 1] as string).getTime();
      const diffDays = Math.round((curr - next) / 86400000);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [allAttempts]);

  // Category breakdown & Weakness detection
  const categoryPerformances = useMemo<CategoryPerformance[]>(() => {
    if (allAttempts.length === 0) return [];

    const map = new Map<
      string,
      { categoryName: string; totalPct: number; count: number; bestPct: number }
    >();

    for (const att of allAttempts) {
      const catId = att.category_id || "general";
      const catName = att.category_name || "Amategeko Rusange";
      const qCount = att.total_questions || 20;
      let score = att.correct_answers ?? att.score ?? 0;
      let pct = att.score_percentage;
      if (pct === undefined || pct === null) {
        pct = Math.round((score / qCount) * 100);
      } else if (score === 0 && pct > 0) {
        score = Math.round((pct / 100) * qCount);
      }

      const existing = map.get(catId) || {
        categoryName: catName,
        totalPct: 0,
        count: 0,
        bestPct: 0,
      };

      existing.totalPct += pct;
      existing.count += 1;
      if (pct > existing.bestPct) existing.bestPct = pct;
      map.set(catId, existing);
    }

    const list: CategoryPerformance[] = [];
    map.forEach((val, key) => {
      const avg = Math.round(val.totalPct / val.count);
      let status: "mastered" | "on_track" | "needs_focus" = "needs_focus";
      if (avg >= 80 && val.count >= 2) status = "mastered";
      else if (avg >= 60) status = "on_track";

      list.push({
        categoryId: key,
        categoryName: val.categoryName,
        attemptsCount: val.count,
        avgScorePercent: avg,
        bestScorePercent: val.bestPct,
        isWeak: avg < 70,
        status,
      });
    });

    return list.sort((a, b) => b.attemptsCount - a.attemptsCount);
  }, [allAttempts]);

  // Weakest category needing practice
  const weakestCategory = useMemo(() => {
    const weakList = categoryPerformances.filter((c) => c.isWeak);
    if (weakList.length === 0) return null;
    return weakList.sort((a, b) => a.avgScorePercent - b.avgScorePercent)[0];
  }, [categoryPerformances]);

  // Overall Theory Readiness score computation
  const readinessScore = useMemo(() => {
    const lessonProgress = stats?.progressPercent || 0;
    const examScoreAvg = examStats.avgScore || 0;

    if (examStats.total === 0) {
      return Math.min(100, Math.round(lessonProgress * 0.85));
    }
    return Math.min(100, Math.round(lessonProgress * 0.4 + examScoreAvg * 0.6));
  }, [stats, examStats]);

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
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 animate-in fade-in duration-300">
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
                className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{t("youCompletedThisExam") || "Completed"}</span>
                          </span>
                        ) : isPendingInvite ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            {t("groupExamInvitation") || "Exam Invitation"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                            {t("activeGroupExam") || "Active Group Session"}
                          </span>
                        )}

                        {isPendingInvite && (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            · {secondsLeft}s {t("left") || "left"}
                          </span>
                        )}

                        {!hasCompleted && challenge.status === "active" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                            {t("ongoing") || "In Progress"}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold tracking-tight text-foreground truncate">
                        {challenge.category_name || "Official Road Rules Assessment"}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>
                          {isCreator
                            ? (t("youCreatedThisExam") || "Organized by you")
                            : `${t("invitedBy") || "Organized by"}: ${challenge.creator_profile?.full_name || challenge.creator_profile?.username || "Classmate"}`}
                        </span>
                        <span>•</span>
                        <span>
                          {joinedParticipants.length} {t("joined") || "participants joined"}
                        </span>
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
                        className="h-8 rounded-md text-xs font-semibold px-3.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                      >
                        <span>{t("viewDetails") || "View Report"}</span>
                      </Button>
                    ) : isPendingInvite ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoadingKey !== null}
                          onClick={() => handleRespondToInvitation(challenge.id, challenge.category_id, false)}
                          className="h-8 rounded-md text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3"
                        >
                          {actionLoadingKey === `${challenge.id}-deny` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <X className="h-3.5 w-3.5" />
                              <span>{t("decline") || "Decline"}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          disabled={actionLoadingKey !== null}
                          onClick={() => handleRespondToInvitation(challenge.id, challenge.category_id, true)}
                          className="h-8 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3.5"
                        >
                          {actionLoadingKey === `${challenge.id}-join` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{t("acceptAndJoin") || "Accept & Enter"}</span>
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
                          className="h-8 rounded-md text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1 px-3"
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
                          className="h-8 rounded-md text-xs font-semibold bg-primary text-primary-foreground gap-1.5 px-3.5"
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

      {/* Comprehensive Student Profile Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-muted/20 p-5 sm:p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            {/* Student Avatar */}
            <div className="relative">
              {displayAvatar ? (
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm shrink-0 bg-muted">
                  <img
                    src={displayAvatar}
                    alt={getDisplayName()}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-lg sm:text-xl shadow-sm shrink-0">
                  {getInitials()}
                </div>
              )}
              {streakDays > 0 && (
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-md border-2 border-card flex items-center justify-center">
                  <Flame className="h-3 w-3 fill-white" />
                </div>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  <GreetingIcon className="w-3.5 h-3.5" />
                  {greeting.text}
                </span>

                {streakDays > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    <Flame className="w-3.5 h-3.5" />
                    {streakDays} {t("studyStreak") || "Day Streak"}
                  </span>
                )}

                {userProfile?.national_id ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    <UserCheck className="w-3.5 h-3.5" />
                    {userProfile.provision_category ? `Cat ${userProfile.provision_category}` : "ID Verified"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("settings")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    + {t("unverifiedCandidate") || "Add National ID"}
                  </button>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {getDisplayName()}
              </h1>

              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{user?.email}</span>
                <span>•</span>
                <span>{userProfile?.nationality || "Rwanda"}</span>
                {profileCompleteness < 100 && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => navigate("settings")}
                      className="text-primary hover:underline font-medium"
                    >
                      {profileCompleteness}% complete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Theory Readiness Gauge & Quick Stats */}
          <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50 shadow-inner shrink-0">
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
                  className="text-primary transition-all duration-700 ease-out"
                  strokeDasharray={`${readinessScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-bold tracking-tight">{readinessScore}%</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("theoryReadiness") || "Theory Readiness"}
              </div>
              <div className="text-base font-bold text-foreground tracking-tight">
                {readinessScore >= 80 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{t("examReady") || "Exam Ready"}</span>
                ) : readinessScore >= 50 ? (
                  <span className="text-amber-600 dark:text-amber-400">{t("inProgress") || "In Progress"}</span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400">{t("gettingStarted") || "Getting Started"}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {examStats.total} {t("examsTaken") || "Exams"} · {formattedStudyTime}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Hero Row: Practice Exam Card + Theory Curriculum Progress */}
      {(standaloneExamEnabled || hasCourses) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Take Exam Card */}
          {standaloneExamEnabled && (
            <div className={hasCourses ? "lg:col-span-2" : "lg:col-span-3"}>
              <div className="h-full rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-card to-card p-6 sm:p-7 shadow-md flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <Award className="w-4 h-4" />
                      {t("officialSimulation") || "Official Provisional License Simulation"}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                      20 Questions · Timed
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mb-2">
                    {t("takeExam") || "Take exam"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed max-w-xl">
                    {t("examSimulationDesc") || "Test your understanding of national traffic regulations, road signs, and right-of-way priorities under timed exam conditions."}
                  </p>

                  <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-card/80 border border-border/70 backdrop-blur-sm text-xs mb-6 shadow-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("duration") || "Duration"}</div>
                      <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">20 min</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("passingScore") || "Passing Mark"}</div>
                      <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">60% (12/20)</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{t("yourPassRate") || "Pass Rate"}</div>
                      <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">{examStats.passRate}%</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      router.push("/dashboard/exam");
                    }}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-md hover:shadow-xl hover:shadow-emerald-600/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t("takeExam") || "Take exam"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Course Curriculum / Continue Learning Card */}
          {hasCourses && (
            <div className={standaloneExamEnabled ? "lg:col-span-1" : "lg:col-span-3"}>
              <div className="h-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {t("theoryCurriculum") || "Syllabus Progress"}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {progressPercent}%
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground mb-1">
                    {continueData?.moduleTitle || t("theoryCourse") || "Theory Curriculum"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {stats ? `${stats.lessonsCompleted} of ${stats.totalLessons} lessons completed` : t("loading")}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-4 shadow-inner">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-700"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Active Lesson status */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 mb-4">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Next Step
                    </div>
                    <p className="text-xs font-semibold text-foreground truncate mt-0.5">
                      {continueData?.lessonTitle || t("continueNextLesson") || "Continue to next lesson"}
                    </p>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (continueData?.lessonId) {
                        navigate("course", { lessonId: continueData.lessonId });
                      } else {
                        navigate("course");
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 shadow-sm transition-all"
                  >
                    <span>{t("continueLearning") || "Resume Lesson"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Practical Driving Training Status (if booking exists) */}
      {upcomingBooking && (
        <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Car className="w-3.5 h-3.5" />
                  {t("upcomingPracticalLesson") || "Scheduled Practical Training"}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {upcomingBooking.booking_date} {upcomingBooking.start_time ? `at ${upcomingBooking.start_time}` : ""}
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {upcomingBooking.drivers?.full_name || t("certifiedInstructor") || "Certified Instructor"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {upcomingBooking.drivers?.vehicle_type ? `Vehicle: ${upcomingBooking.drivers.vehicle_type} · ` : ""}
                {upcomingBooking.drivers?.training_location || "Kigali"}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("services")}
              className="rounded-xl text-xs font-semibold px-4 shrink-0 shadow-sm"
            >
              <span>{t("viewPracticalLog") || "View Training Log"}</span>
            </Button>
          </div>
        </section>
      )}

      {/* Quick Action Matrix */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          {t("quickActions") || "System Navigation"}
        </h2>
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${hasCourses ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3.5`}>
          {/* Action 1: Theory Course */}
          {hasCourses && (
            <button
              type="button"
              onClick={() => navigate("course")}
              className="flex flex-col items-start p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2.5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground line-clamp-1">{t("theoryCourse") || "Theory Course"}</span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("learnModules") || "Study signs & rules"}</span>
            </button>
          )}

          {/* Action 2: Services */}
          {servicesPageEnabled && (
            <button
              type="button"
              onClick={() => navigate("services")}
              className="flex flex-col items-start p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2.5 group-hover:scale-105 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground line-clamp-1">{t("services") || "Driver Hub"}</span>
              <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("allServicesDesc") || "Practical sessions"}</span>
            </button>
          )}

          {/* Action 3: Classmates / Friends */}
          <button
            type="button"
            onClick={() => navigate("classmates")}
            className="flex flex-col items-start p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-2.5 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground line-clamp-1">{t("classmatesAndFriends") || "Study Group"}</span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("chatAndChallenges") || "Live challenges"}</span>
          </button>

          {/* Action 4: Exam Results & Analytics */}
          <button
            type="button"
            onClick={() => navigate("results")}
            className="flex flex-col items-start p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2.5 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground line-clamp-1">{t("examHistory") || "Performance Log"}</span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("reviewScores") || "Past simulations"}</span>
          </button>

          {/* Action 5: Account Settings */}
          <button
            type="button"
            onClick={() => navigate("settings")}
            className="flex flex-col items-start p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
          >
            <div className="p-2.5 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400 mb-2.5 group-hover:scale-105 transition-transform">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-foreground line-clamp-1">{t("settings") || "Preferences"}</span>
            <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t("languageTheme") || "Profile & language"}</span>
          </button>
        </div>
      </section>

      {/* 2-Column: Recent Exam History + Highway Safety Handbook Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Actions & History */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("recentActivity") || "Recent Assessments"}
            </h2>
            {allAttempts.length > 0 && (
              <button
                type="button"
                onClick={() => navigate("results")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t("viewAllResults") || "View All"} ({allAttempts.length})
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-sm">
            {allAttempts.length > 0 ? (
              allAttempts.slice(0, 5).map((attempt) => {
                const total = attempt.total_questions || 20;
                let score = attempt.correct_answers ?? attempt.score ?? 0;
                let percent = attempt.score_percentage;
                if (percent === undefined || percent === null) {
                  percent = Math.round((score / total) * 100);
                } else if (score === 0 && percent > 0) {
                  score = Math.round((percent / 100) * total);
                }
                const isPassed = attempt.is_passed ?? attempt.passed ?? (percent >= 60);
                const attemptDate = attempt.completed_at || attempt.created_at || attempt.started_at;
                const isAbandoned = attempt.status === "abandoned";
                const isInProgress = attempt.status === "in_progress";

                return (
                  <div
                    key={attempt.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {attempt.category_name || (attempt.exam_type === "module" ? t("moduleExam") || "Module Exam" : t("mockExam") || "Practice Exam")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {attemptDate ? formatDistanceToNow(new Date(attemptDate), { addSuffix: true }) : t("completed")}
                        {attempt.duration_seconds ? ` · ${Math.floor(attempt.duration_seconds / 60)}m ${attempt.duration_seconds % 60}s` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground">
                          {score} / {total}
                        </div>
                        <div
                          className={`text-[11px] font-semibold uppercase tracking-wider ${
                            isPassed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isAbandoned
                              ? "text-amber-600 dark:text-amber-400"
                              : isInProgress
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {percent}% · {isPassed ? (t("passed") || "Passed") : isAbandoned ? "Incomplete" : isInProgress ? "In Progress" : (t("failed") || "Failed")}
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
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {t("noRecentActivity") || "No recorded assessments"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t("startLessonOrExamHint") || "Complete your theory modules or begin a timed simulation to track your progress."}
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => router.push("/dashboard/exam")}
                    className="rounded-xl font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t("startExamNow") || "Begin Practice"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Highway Safety Tip Card */}
        <section className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("drivingHandbookTip") || "Safety Reference"}
            </h2>
            <button
              type="button"
              onClick={handleNextTip}
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t("nextTip") || "Cycle"}</span>
            </button>
          </div>

          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-blue-500/5 p-5 space-y-2.5 shadow-sm">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              {DRIVING_TIPS[tipIndex].category}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
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
