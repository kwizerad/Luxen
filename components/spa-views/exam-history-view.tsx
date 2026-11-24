"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Users,
  User,
  Layers,
  FolderCheck,
  FolderX,
  FolderArchive,
  FolderOpen,
  FileWarning,
  Calendar,
  LayoutGrid,
  List,
  Search,
  ArrowRight,
  Award,
  Timer,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Check,
  X,
  ArrowUpDown,
  Tag,
  Folder,
  AlertTriangle,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ExamReview } from "@/components/exam-review";
import { ExamHistorySkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { spaCache } from "@/lib/spa-cache";
import { studentCache } from "@/lib/student-cache";
import {
  getBrowserExamAttemptsAsync,
  getBrowserExamQuestions,
} from "@/lib/browser-exam-history";
import { collectMissedQuestionsForUser } from "@/lib/missed-questions-practice";
import { getExamResultLanguageName } from "@/lib/exam-settings";
import type { ExamAttempt, ExamQuestion, ExamAnswer } from "@/lib/database.types";

export interface ExamHistoryViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

interface ExamAttemptWithAnswers extends ExamAttempt {
  answers: ExamAnswer[];
  challenge_id?: string | null;
  is_module?: boolean;
}

type HistoryTab = "all" | "ongoing" | "individual" | "group" | "module";
type OutcomeFilter = "all" | "passed" | "failed" | "void" | "cheating";
type DateFilter = "all" | "today" | "week" | "month" | "older";
type SortOption = "date_desc" | "date_asc" | "score_desc" | "score_asc" | "duration_desc" | "duration_asc";
type GroupByOption = "none" | "date" | "category" | "outcome" | "type";

function PCFileIcon({
  isCheating,
  isAbandoned,
  isGroup,
  isModule,
  isPassed,
  size = "lg",
}: {
  isCheating: boolean;
  isAbandoned: boolean;
  isGroup: boolean;
  isModule: boolean;
  isPassed: boolean;
  size?: "lg" | "sm";
}) {
  const isLarge = size === "lg";

  const theme = isCheating
    ? {
        surface:
          "bg-gradient-to-br from-orange-500 via-red-500 to-rose-700 ring-1 ring-orange-300/60 dark:ring-orange-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_-6px_rgba(249,115,22,0.55)]",
        fold: "bg-orange-200/55 dark:bg-orange-200/40 border-b border-l border-white/45",
      }
    : isAbandoned
    ? {
        surface:
          "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 ring-1 ring-amber-200/70 dark:ring-amber-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_-6px_rgba(245,158,11,0.5)]",
        fold: "bg-amber-100/60 dark:bg-amber-200/40 border-b border-l border-white/45",
      }
    : isPassed
    ? {
        surface:
          "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 ring-1 ring-emerald-200/70 dark:ring-emerald-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_18px_-6px_rgba(16,185,129,0.5)]",
        fold: "bg-emerald-100/60 dark:bg-emerald-200/40 border-b border-l border-white/45",
      }
    : {
        surface:
          "bg-gradient-to-br from-rose-400 via-rose-500 to-red-600 ring-1 ring-rose-200/70 dark:ring-rose-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_8px_18px_-6px_rgba(244,63,94,0.5)]",
        fold: "bg-rose-100/60 dark:bg-rose-200/40 border-b border-l border-white/45",
      };

  const glyph = isCheating ? (
    <ShieldAlert
      className={cn(
        "text-white drop-shadow-xs stroke-[2.25]",
        isLarge ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5"
      )}
    />
  ) : isAbandoned ? (
    <AlertTriangle
      className={cn(
        "text-white drop-shadow-xs stroke-[2.25]",
        isLarge ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5"
      )}
    />
  ) : isPassed ? (
    <Check
      className={cn(
        "text-white drop-shadow-xs stroke-[2.75]",
        isLarge ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5"
      )}
    />
  ) : (
    <X
      className={cn(
        "text-white drop-shadow-xs stroke-[2.75]",
        isLarge ? "w-5 h-5 sm:w-6 sm:h-6" : "w-3.5 h-3.5"
      )}
    />
  );

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-0.5",
        isLarge
          ? "w-14 h-[68px] sm:w-16 sm:h-[76px] rounded-xl rounded-tr-[4px] [clip-path:polygon(0_0,calc(100%-15px)_0,100%_15px,100%_100%,0_100%)]"
          : "w-8 h-9 rounded-md rounded-tr-[2px] [clip-path:polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,0_100%)]",
        theme.surface
      )}
    >
      {/* Top-right folded corner notch */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0 right-0 pointer-events-none backdrop-blur-xs",
          isLarge
            ? "w-[15px] h-[15px] rounded-bl-md"
            : "w-[8px] h-[8px] rounded-bl-[3px]",
          theme.fold
        )}
      />

      {/* Subtle glass sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent"
      />

      {/* Top-left subtle exam mode indicator (never hides result color/sign) */}
      {isLarge && (isGroup || isModule) && (
        <span
          aria-hidden="true"
          className="absolute top-2 left-2 text-white/90 drop-shadow-2xs"
        >
          {isGroup ? (
            <Users className="w-3 h-3" />
          ) : (
            <BookOpen className="w-3 h-3" />
          )}
        </span>
      )}

      {/* Centered Result Sign INSIDE the Colored File */}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center bg-white/18 backdrop-blur-xs border border-white/30",
          isLarge ? "w-9 h-9 sm:w-10 sm:h-10 rounded-xl" : "w-5 h-5 rounded-md"
        )}
      >
        {glyph}
      </div>

      {/* Bottom futuristic file accent bars */}
      {isLarge && (
        <div
          aria-hidden="true"
          className="absolute bottom-2 inset-x-3 flex flex-col gap-0.5 pointer-events-none"
        >
          <span className="h-[2px] w-full rounded-full bg-white/35" />
          <span className="h-[2px] w-2/3 rounded-full bg-white/20" />
        </div>
      )}
    </div>
  );
}

export function ExamHistoryView({ navigate }: ExamHistoryViewProps) {
  const { t, language } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";
  const { user } = useAuth();

  const cached = user
    ? studentCache.getHot<{ attempts: ExamAttemptWithAnswers[]; ongoingChallenges: any[] }>(
        "exam_history",
        { tier: "private", userId: user.id }
      ) ||
      spaCache.get<{ attempts: ExamAttemptWithAnswers[]; ongoingChallenges: any[] }>(`spa_exam_history_${user.id}`)
    : null;

  const normalizeAttemptsForDisplay = (
    list: ExamAttemptWithAnswers[],
    challengeLangs?: Map<string, string>
  ): ExamAttemptWithAnswers[] =>
    (list || []).map((att) => {
      if (att.is_module) return att;
      const chLang = att.challenge_id ? challengeLangs?.get(att.challenge_id) : undefined;
      return {
        ...att,
        category_name: getExamResultLanguageName({
          exam_language: (att as any).exam_language,
          language: chLang,
          category_name: att.category_name,
          is_module: att.is_module,
        }),
      };
    });

  const [loading, setLoading] = useState(!cached);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>(
    normalizeAttemptsForDisplay(cached?.attempts || [])
  );
  const [ongoingChallenges, setOngoingChallenges] = useState<any[]>(cached?.ongoingChallenges || []);
  
  // Filter States
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithAnswers | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [missedQuestionsCount, setMissedQuestionsCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void collectMissedQuestionsForUser(user.id, 50)
      .then((pool) => {
        if (active) setMissedQuestionsCount(pool.totalMissedCount);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id, attempts.length]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const supabase = createClient();

    const hydratePersistentHistory = async () => {
      const persisted = await studentCache.read<{
        attempts: ExamAttemptWithAnswers[];
        ongoingChallenges: any[];
      }>("exam_history", {
        tier: "private",
        userId: user.id,
        maxAgeMs: 5 * 60 * 1000,
      });
      if (active && persisted?.data) {
        setAttempts(normalizeAttemptsForDisplay(persisted.data.attempts || []));
        setOngoingChallenges(persisted.data.ongoingChallenges || []);
        setLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        // 1. Fetch standard mock/solo/group exam attempts
        const examPromise = supabase
          .from("exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // 2. Fetch module / curriculum exam attempts
        const modulePromise = supabase
          .from("module_exam_attempts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        // 3. Fetch challenge participation to determine which attempts are group exams
        const challengePromise = supabase
          .from("exam_challenge_participants")
          .select("challenge_id, exam_attempt_id, status")
          .eq("user_id", user.id)
          .not("exam_attempt_id", "is", null);

        // 4. Fetch ongoing challenges
        const ongoingPromise = fetch("/api/exam-challenges")
          .then((r) => r.json())
          .catch(() => ({ challenges: [] }));

        const [examRes, moduleRes, challengeRes, ongoingRes] = await Promise.allSettled([
          examPromise,
          modulePromise,
          challengePromise,
          ongoingPromise,
        ]);

        const soloChallengeIds = new Set<string>();
        const challengeLangMap = new Map<string, string>();
        const allChallengesList =
          ongoingRes.status === "fulfilled" ? (ongoingRes.value as any)?.challenges || [] : [];
        allChallengesList.forEach((c: any) => {
          if (c?.id && c?.language) {
            challengeLangMap.set(c.id, String(c.language));
          }
          if (c?.is_solo_attempt) {
            soloChallengeIds.add(c.id);
          } else if (Array.isArray(c?.participants)) {
            const attemptedCount = c.participants.filter(
              (p: any) =>
                p.status === "completed" ||
                p.status === "in_progress" ||
                Boolean(p.exam_attempt_id)
            ).length;
            const activeJoinedCount = c.participants.filter((p: any) =>
              ["joined", "ready", "in_progress", "completed"].includes(p.status)
            ).length;
            const ageMs = c.created_at ? Date.now() - new Date(c.created_at).getTime() : 0;
            const isFinishedOrStale =
              c.status === "completed" ||
              c.status === "cancelled" ||
              c.status === "expired" ||
              ageMs > 30 * 60 * 1000;
            if (attemptedCount <= 1 && (isFinishedOrStale || activeJoinedCount <= 1)) {
              soloChallengeIds.add(c.id);
            }
          }
        });

        const groupAttemptIdMap = new Map<string, string>();
        if (challengeRes.status === "fulfilled" && challengeRes.value.data) {
          challengeRes.value.data.forEach((p: any) => {
            if (p.exam_attempt_id && p.challenge_id && !soloChallengeIds.has(p.challenge_id)) {
              groupAttemptIdMap.set(p.exam_attempt_id, p.challenge_id);
            }
          });
        }

        let activeList: any[] = [];
        if (ongoingRes.status === "fulfilled") {
          const list = (ongoingRes.value as any)?.challenges || [];
          const now = Date.now();
          activeList = list.filter((c: any) => {
            if (!user || !c?.created_at) return false;
            if (c.status === "completed" || c.status === "cancelled" || c.status === "expired") return false;

            const p = c.participants?.find((x: any) => x.user_id === user.id);
            const hasCompleted =
              p?.status === "completed" ||
              p?.status === "abandoned" ||
              p?.status === "rejected" ||
              p?.status === "declined" ||
              p?.status === "expired" ||
              Boolean(p?.exam_attempt_id);
            if (hasCompleted) return false;

            const isCreator = c.creator_id === user.id;
            const ageMs = now - new Date(c.created_at).getTime();

            if (c.status === "pending") {
              if (isCreator) return ageMs <= 60 * 1000;
              if (p?.status === "pending") return ageMs <= 30 * 1000;
              if (p?.status === "joined" || p?.status === "ready") return ageMs <= 60 * 1000;
              return false;
            }

            if (c.status === "active") {
              const isParticipantOrCreator =
                isCreator || p?.status === "joined" || p?.status === "ready" || p?.status === "in_progress";
              return isParticipantOrCreator && ageMs <= 30 * 60 * 1000;
            }

            return false;
          });
          setOngoingChallenges(activeList);
        }

        const standardAttempts: ExamAttemptWithAnswers[] =
          examRes.status === "fulfilled" && examRes.value.data
            ? examRes.value.data
                .filter((att: any) => att.hidden_from_user !== true)
                .map((att: any) => {
                  let correct = att.correct_answers;
                  let scorePct = att.score_percentage;
                  const total = att.total_questions || 20;

                  if (
                    (correct === null || correct === undefined || correct === 0) &&
                    Array.isArray(att.answers) &&
                    att.answers.length > 0
                  ) {
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

                  const rawAnswers = Array.isArray(att.answers) ? att.answers : [];
                  const hasAnsweredAny = rawAnswers.some((a: any) => Boolean(a?.selected_answer));

                  const chId = groupAttemptIdMap.get(att.id) || null;
                  const chLang = chId ? challengeLangMap.get(chId) : undefined;
                  const displayLangName = getExamResultLanguageName({
                    exam_language: att.exam_language,
                    language: chLang,
                    category_name: att.category_name,
                    is_module: false,
                  });

                  return {
                    ...(att as ExamAttemptWithAnswers),
                    category_name: displayLangName,
                    exam_language: att.exam_language || chLang || displayLangName,
                    answers: hasAnsweredAny ? rawAnswers : [],
                    correct_answers: correct ?? 0,
                    score_percentage: scorePct ?? 0,
                    challenge_id: chId,
                    is_module: false,
                  };
                })
            : [];

        const moduleAttempts: ExamAttemptWithAnswers[] =
          moduleRes.status === "fulfilled" && moduleRes.value.data
            ? moduleRes.value.data.map((att: any) => {
                let correct = att.correct_answers;
                let scorePct = att.score_percentage;
                const total = att.total_questions || 20;

                if (
                  (correct === null || correct === undefined || correct === 0) &&
                  Array.isArray(att.answers) &&
                  att.answers.length > 0
                ) {
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
                    ? t("finalExam") || "Final Exam"
                    : att.exam_type === "midterm"
                    ? t("midtermExam") || "Midterm Exam"
                    : att.module_title
                    ? `${att.module_title} (${t("moduleExam") || "Module Exam"})`
                    : t("moduleExam") || "Module Exam";

                const rawModAnswers = Array.isArray(att.answers) ? att.answers : [];
                const hasModAnsweredAny = rawModAnswers.some((a: any) => Boolean(a?.selected_answer));

                return {
                  id: att.id,
                  user_id: att.user_id,
                  category_id: att.module_id || "module",
                  category_name: examTypeLabel,
                  started_at: att.started_at,
                  completed_at: att.completed_at || att.created_at || att.started_at,
                  duration_seconds: att.duration_seconds || 0,
                  total_questions: total,
                  correct_answers: correct ?? 0,
                  score_percentage: scorePct ?? 0,
                  status: att.status || "completed",
                  created_at: att.created_at,
                  answers: hasModAnsweredAny ? rawModAnswers : [],
                  challenge_id: null,
                  is_module: true,
                  module_title: att.module_title,
                } as ExamAttemptWithAnswers;
              })
            : [];

        const browserRecords = await getBrowserExamAttemptsAsync(user.id).catch(() => []);
        const browserAttempts: ExamAttemptWithAnswers[] = (browserRecords || []).map((att) => {
          const isMod = Boolean(att.is_module);
          const chLang = att.challenge_id ? challengeLangMap.get(att.challenge_id) : undefined;
          const displayName = isMod
            ? att.category_name
            : getExamResultLanguageName({
                exam_language: att.exam_language,
                language: chLang,
                category_name: att.category_name,
                is_module: isMod,
              });
          return {
            ...(att as ExamAttemptWithAnswers),
            category_name: displayName,
            answers: Array.isArray(att.answers) ? att.answers : [],
            correct_answers: att.correct_answers ?? 0,
            score_percentage: att.score_percentage ?? 0,
            challenge_id: att.challenge_id || null,
            is_module: isMod,
          };
        });

        const dedupedMap = new Map<string, ExamAttemptWithAnswers>();
        for (const item of [...browserAttempts, ...standardAttempts, ...moduleAttempts]) {
          if (!dedupedMap.has(item.id)) {
            dedupedMap.set(item.id, item);
          }
        }

        const combined = Array.from(dedupedMap.values()).sort((a, b) => {
          const dateA = new Date(a.created_at || a.started_at || 0).getTime();
          const dateB = new Date(b.created_at || b.started_at || 0).getTime();
          return dateB - dateA;
        });

        if (!active) return;
        setAttempts(combined);
        const historyPayload = {
          attempts: combined,
          ongoingChallenges: activeList,
        };
        spaCache.set(`spa_exam_history_${user.id}`, historyPayload);
        void studentCache.write("exam_history", historyPayload, {
          tier: "private",
          userId: user.id,
          category: "exam_history",
        });
      } catch (err) {
        console.error("Failed to fetch exam history:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const runSync = async () => {
      await hydratePersistentHistory();
      if (active) {
        void fetchData();
      }
    };

    void runSync();

    const handleCacheInvalidated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.scope === "exam_history" || detail?.scope === "all_private") {
        void fetchData();
      }
    };
    window.addEventListener("navo-cache-invalidated", handleCacheInvalidated);

    return () => {
      active = false;
      window.removeEventListener("navo-cache-invalidated", handleCacheInvalidated);
    };
  }, [user, t]);

  const handleReview = async (attempt: ExamAttemptWithAnswers) => {
    if (attempt.challenge_id) {
      navigate("classmates/group-results", { id: attempt.challenge_id });
      return;
    }

    setSelectedAttempt(attempt);
    setQuestions([]);

    const answeredCount = (attempt.answers || []).filter((a) => Boolean(a.selected_answer)).length;
    if (!user || answeredCount === 0) return;

    const browserQuestions = await getBrowserExamQuestions(user.id, attempt.id);
    if (browserQuestions?.length) {
      setQuestions(browserQuestions);
      return;
    }

    const reviewKey = `exam_review_${attempt.id}`;
    const cachedReview = await studentCache.read<ExamQuestion[]>(reviewKey, {
      tier: "private",
      userId: user.id,
      maxAgeMs: 24 * 60 * 60 * 1000,
    });
    if (cachedReview?.data?.length) {
      setQuestions(cachedReview.data);
      if (!cachedReview.isStale) return;
    }

    const supabase = createClient();

    try {
      const questionIds = (attempt.answers || []).map((a) => a.question_id).filter(Boolean);
      if (questionIds.length === 0) return;

      const { data: questionData } = await supabase.from("exam_questions").select("*").in("id", questionIds);

      if (questionData) {
        const ordered = (questionData as ExamQuestion[]).slice().sort((a, b) => {
          const idxA = (attempt.answers || []).findIndex((ans) => ans.question_id === a.id);
          const idxB = (attempt.answers || []).findIndex((ans) => ans.question_id === b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return 0;
        });
        setQuestions(ordered);
        void studentCache.write(reviewKey, ordered, {
          tier: "private",
          userId: user.id,
          category: "exam_review",
        });
      }
    } catch (err) {
      console.error("Failed to fetch questions for review:", err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    const dateFormatted = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateFormatted} • ${timeFormatted}`;
  };

  const formatDuration = (seconds?: number | null) => {
    if (seconds == null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Distinct Categories for category filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach((a) => {
      if (a.category_name) {
        set.add(a.category_name);
      }
    });
    return Array.from(set).sort();
  }, [attempts]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (outcomeFilter !== "all") count++;
    if (dateFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (sortBy !== "date_desc") count++;
    if (groupBy !== "none") count++;
    return count;
  }, [outcomeFilter, dateFilter, categoryFilter, sortBy, groupBy]);

  const resetAllFilters = () => {
    setOutcomeFilter("all");
    setDateFilter("all");
    setCategoryFilter("all");
    setSortBy("date_desc");
    setGroupBy("none");
    setSearchQuery("");
  };

  const extractCourseNumber = (categoryName?: string, moduleTitle?: string) => {
    const text = `${categoryName || ""} ${moduleTitle || ""}`;
    if (!text.trim()) return 999;
    const match = text.match(/(?:course|isomo|module|chapter|igice|theme|amasomo|uwo)\s*#?\s*(\d+)/i);
    if (match && match[1]) return parseInt(match[1], 10);
    const modMatch = text.match(/(?:ext-mod-|chapter[_-]|mod[_-])(\d+)/i);
    if (modMatch && modMatch[1]) return parseInt(modMatch[1], 10);
    const num = text.match(/\b\d+\b/);
    return num ? parseInt(num[0], 10) : 999;
  };

  // Multi-tier filtering
  const filteredAndSortedAttempts = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let list = attempts.filter((a) => {
      // 1. Tab Filter
      if (activeTab === "all") {
        // Exclude separate quizzes & module exams from the all exams history tab
        if (
          a.is_module ||
          a.category_name?.toLowerCase().includes("separate quiz") ||
          a.category_name?.toLowerCase().includes("quick quiz") ||
          a.category_name?.toLowerCase().includes("quiz") ||
          a.category_name?.toLowerCase().includes("module exam")
        ) {
          return false;
        }
      }
      if (activeTab === "individual" && (a.challenge_id || a.is_module)) return false;
      if (activeTab === "group" && !a.challenge_id) return false;
      if (activeTab === "module" && !a.is_module) return false;

      // 2. Outcome Filter
      const answeredCount = (a.answers || []).filter((ans) => ans.selected_answer !== null).length;
      const isAbandoned = a.status === "abandoned" || answeredCount === 0;
      const isCheating = a.submission_reason === "cheating_violation";
      const isPassed = (a.score_percentage || 0) >= 50 && !isAbandoned;
      const isFailed = (a.score_percentage || 0) < 50 && !isAbandoned;

      if (outcomeFilter === "passed" && !isPassed) return false;
      if (outcomeFilter === "failed" && !isFailed) return false;
      if (outcomeFilter === "void" && !isAbandoned) return false;
      if (outcomeFilter === "cheating" && !isCheating) return false;

      // 3. Date Filter
      const attemptTime = new Date(a.created_at || a.started_at || 0).getTime();
      const ageMs = now - attemptTime;
      if (dateFilter === "today" && ageMs > oneDay) return false;
      if (dateFilter === "week" && ageMs > sevenDays) return false;
      if (dateFilter === "month" && ageMs > thirtyDays) return false;
      if (dateFilter === "older" && ageMs <= thirtyDays) return false;

      // 4. Category Filter
      if (categoryFilter !== "all" && a.category_name !== categoryFilter) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cat = (a.category_name || "").toLowerCase();
        const reason = (a.submission_reason || "").toLowerCase();
        const violation = (a.violation_summary || "").toLowerCase();
        if (!cat.includes(q) && !reason.includes(q) && !violation.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sort logic: Course quizzes must be ranked strictly based on their course's number ascending.
    // Course 10 cannot be above Course 1 based on done_at time!
    list.sort((a, b) => {
      const courseNumA = extractCourseNumber(a.category_name, (a as any).module_title);
      const courseNumB = extractCourseNumber(b.category_name, (b as any).module_title);
      if (courseNumA !== courseNumB) {
        return courseNumA - courseNumB;
      }

      const dateA = new Date(a.completed_at || a.created_at || a.started_at || 0).getTime();
      const dateB = new Date(b.completed_at || b.created_at || b.started_at || 0).getTime();
      const scoreA = a.score_percentage || 0;
      const scoreB = b.score_percentage || 0;
      const durA = a.duration_seconds || 0;
      const durB = b.duration_seconds || 0;

      switch (sortBy) {
        case "date_asc":
          return dateA - dateB;
        case "score_desc":
          return scoreB - scoreA || dateB - dateA;
        case "score_asc":
          return scoreA - scoreB || dateB - dateA;
        case "duration_desc":
          return durB - durA || dateB - dateA;
        case "duration_asc":
          return durA - durB || dateB - dateA;
        case "date_desc":
        default:
          return dateB - dateA;
      }
    });

    return list;
  }, [attempts, activeTab, outcomeFilter, dateFilter, categoryFilter, searchQuery, sortBy]);

  // Grouping logic
  interface AttemptGroup {
    id: string;
    label: string;
    subtitle?: string;
    icon: any;
    items: ExamAttemptWithAnswers[];
    avgScore: number;
    passedRate: number;
  }

  const groupedAttempts = useMemo((): AttemptGroup[] => {
    const loc = (rw: string, fr: string, en: string) => (isRw ? rw : isFr ? fr : en);

    if (groupBy === "none") {
      return [
        {
          id: "all",
          label: loc("Ibizamini Byose", "Tous les examens", "All Exam Dossiers"),
          icon: FolderArchive,
          items: filteredAndSortedAttempts,
          avgScore: 0,
          passedRate: 0,
        },
      ];
    }

    const groupMap = new Map<string, { label: string; icon: any; items: ExamAttemptWithAnswers[] }>();

    filteredAndSortedAttempts.forEach((attempt) => {
      let key = "other";
      let label = loc("Ibindi", "Autres", "Other");
      let icon = FolderArchive;

      if (groupBy === "date") {
        const attemptDate = new Date(attempt.created_at || attempt.started_at || 0);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          key = "today";
          label = loc("Uyu Munsi", "Aujourd'hui", "Today");
          icon = Clock;
        } else if (diffDays <= 7) {
          key = "week";
          label = loc("Muri Iki Cyumweru", "Cette semaine", "This Week");
          icon = Calendar;
        } else if (diffDays <= 30) {
          key = "month";
          label = loc("Muri Uku Kwezi", "Ce mois-ci", "This Month");
          icon = Calendar;
        } else {
          key = "older";
          label = loc("Ibya Kera", "Archives plus anciennes", "Older Archives");
          icon = FolderArchive;
        }
      } else if (groupBy === "category") {
        key = attempt.category_name || loc("Ikizamini Rusange", "Examen général", "General Driving Exam");
        label = key;
        icon = attempt.is_module ? BookOpen : FolderCheck;
      } else if (groupBy === "outcome") {
        const answeredCount = (attempt.answers || []).filter((ans) => ans.selected_answer !== null).length;
        const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
        const isCheating = attempt.submission_reason === "cheating_violation";
        const isPassed = (attempt.score_percentage || 0) >= 50 && !isAbandoned;

        if (isCheating) {
          key = "cheating";
          label = loc("Gukopera", "Violations de sécurité", "Security Violations");
          icon = ShieldAlert;
        } else if (isAbandoned) {
          key = "void";
          label = loc("Ibitarangiye", "Incomplets / Vides", "Void / Incomplete");
          icon = FileWarning;
        } else if (isPassed) {
          key = "passed";
          label = loc("Ibyo Watsinze (≥50%)", "Réussis (≥50%)", "Passed Dossiers (≥50%)");
          icon = FolderCheck;
        } else {
          key = "failed";
          label = loc("Ibyo Watsinzwe (<50%)", "Échoués (<50%)", "Needs Review (<50%)");
          icon = FolderX;
        }
      } else if (groupBy === "type") {
        if (attempt.challenge_id) {
          key = "group";
          label = loc("Ibizamini by'Itsinda", "Défis en groupe", "Group Battles");
          icon = Users;
        } else if (attempt.is_module) {
          key = "module";
          label = loc("Ibizamini by'Amasomo", "Examens de modules", "Module Curriculum Exams");
          icon = BookOpen;
        } else {
          key = "solo";
          label = loc("Ibizamini bya Wenyine", "Examens individuels", "Solo Mock Exams");
          icon = User;
        }
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, { label, icon, items: [] });
      }
      groupMap.get(key)!.items.push(attempt);
    });

    // Convert map to array with computed metrics
    return Array.from(groupMap.entries()).map(([id, g]) => {
      const valid = g.items.filter((a) => a.score_percentage != null && a.status !== "abandoned");
      const avg =
        valid.length > 0
          ? Math.round(valid.reduce((acc, curr) => acc + (curr.score_percentage || 0), 0) / valid.length)
          : 0;
      const passed = valid.filter((a) => (a.score_percentage || 0) >= 50).length;
      const rate = valid.length > 0 ? Math.round((passed / valid.length) * 100) : 0;

      return {
        id,
        label: g.label,
        icon: g.icon,
        items: g.items,
        avgScore: avg,
        passedRate: rate,
      };
    });
  }, [groupBy, filteredAndSortedAttempts, isRw, isFr]);

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  if (loading) {
    return <ExamHistorySkeleton />;
  }

  if (selectedAttempt) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              onClick={() => setSelectedAttempt(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("examHistory") || "Back to Exam History"}
            </button>
          </div>

          <ExamReview
            examResult={selectedAttempt}
            questions={questions}
            onReset={() => setSelectedAttempt(null)}
            onRetake={() => {
              setSelectedAttempt(null);
              navigate("exam");
            }}
          />
        </div>
      </div>
    );
  }

  const validCompletedAttempts = attempts.filter((a) => a.score_percentage != null && a.status !== "abandoned");
  const avgScore =
    validCompletedAttempts.length > 0
      ? Math.round(
          validCompletedAttempts.reduce((acc, curr) => acc + (curr.score_percentage || 0), 0) /
            validCompletedAttempts.length
        )
      : 0;
  const passedCount = validCompletedAttempts.filter((a) => (a.score_percentage || 0) >= 50).length;
  const individualCount = attempts.filter((a) => !a.challenge_id && !a.is_module).length;
  const groupCount = attempts.filter((a) => !!a.challenge_id).length;
  const moduleCount = attempts.filter((a) => !!a.is_module).length;

  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono tracking-wider text-muted-foreground dark:text-zinc-400 lowercase flex items-center gap-1.5">
              <FolderArchive className="h-3.5 w-3.5 text-primary" />
              <span>
                {isRw
                  ? "imitsindire · ububiko bw'amateka y'ibizamini"
                  : isFr
                  ? "suivi des résultats · coffre des examens"
                  : "performance ledger · exam dossier vault"}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground dark:text-foreground dark:text-zinc-100 mt-0.5">
              {t("examHistory") || "Exam History Archive"}
            </h1>
          </div>

          {/* Quick Search, Grouping Selector, Filter & Grid/List Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {missedQuestionsCount > 0 && (
              <button
                type="button"
                onClick={() => navigate("exam", { mode: "missed" })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/15 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isRw
                    ? `Subiramo Ibyakugoye (${missedQuestionsCount})`
                    : isFr
                    ? `Revoir les erreurs (${missedQuestionsCount})`
                    : `Practice Missed (${missedQuestionsCount})`}
                </span>
              </button>
            )}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground dark:text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search") || "Search dossiers..."}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-card dark:bg-card dark:bg-zinc-900/80 border border-border dark:border-border dark:border-zinc-800 text-xs text-foreground dark:text-foreground dark:text-zinc-200 placeholder:text-muted-foreground focus:outline-hidden focus:border-primary/50 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick Top Grouping Selector */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors bg-card dark:bg-zinc-900/80",
                  groupBy !== "none"
                    ? "border-primary/50 text-primary font-bold bg-primary/10"
                    : "border-border dark:border-zinc-800 text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:border-border dark:hover:border-zinc-700"
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline text-[11px] text-muted-foreground dark:text-zinc-400">
                  {isRw ? "itsinda:" : isFr ? "groupe :" : "group:"}
                </span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                  className="bg-transparent border-0 text-xs font-mono text-inherit focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value="none" className="bg-card dark:bg-zinc-900 text-foreground dark:text-zinc-300">
                    {isRw ? "ntaryo (birambuye)" : isFr ? "aucun (à plat)" : "none (flat)"}
                  </option>
                  <option value="date" className="bg-card dark:bg-zinc-900 text-foreground dark:text-zinc-300">
                    {isRw ? "ku itariki" : isFr ? "par date" : "by date"}
                  </option>
                  <option value="outcome" className="bg-card dark:bg-zinc-900 text-foreground dark:text-zinc-300">
                    {isRw ? "ku mitsindire" : isFr ? "par résultat" : "by outcome"}
                  </option>
                  <option value="category" className="bg-card dark:bg-zinc-900 text-foreground dark:text-zinc-300">
                    {isRw ? "ku cyiciro" : isFr ? "par matière" : "by subject"}
                  </option>
                  <option value="type" className="bg-card dark:bg-zinc-900 text-foreground dark:text-zinc-300">
                    {isRw ? "ku bwoko" : isFr ? "par type" : "by exam type"}
                  </option>
                </select>
              </div>
            </div>

            {/* Filter Toggle Button with Badge */}
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors shrink-0",
                showFiltersPanel || activeFilterCount > 0
                  ? "bg-primary/15 border-primary/40 text-primary font-bold"
                  : "bg-card hover:bg-muted/80 dark:bg-zinc-900/80 border-border dark:border-zinc-800 text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:border-border dark:hover:border-zinc-700"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{isRw ? "yungurura" : isFr ? "filtrer" : "filter"}</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-muted/60 dark:bg-zinc-900/80 rounded-lg border border-border dark:border-zinc-800 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title={isRw ? "Imbonerahamwe" : isFr ? "Vue grille" : "Grid View"}
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title={isRw ? "Urutonde" : isFr ? "Vue liste" : "List View"}
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Telemetry Strip - Replaced separate stats cards with unified horizontal telemetry */}
      <div className="rounded-xl border border-border dark:border-zinc-800 bg-card/70 dark:bg-zinc-900/50 backdrop-blur-xs p-2 sm:p-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 dark:divide-zinc-800/80">
          
          {/* Total Attempts */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase tracking-wide truncate">
                {isRw ? "inshuro zose" : isFr ? "total essais" : "total attempts"}
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-foreground dark:text-zinc-100 leading-tight">
                {attempts.length}
              </div>
            </div>
          </div>

          {/* Passed Files */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <FolderCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase tracking-wide truncate">
                {isRw ? "ibyo watsinze" : isFr ? "examens réussis" : "passed files"}
              </div>
              <div className="flex items-baseline gap-1.5 leading-tight">
                <span className="text-base sm:text-lg font-mono font-bold text-foreground dark:text-zinc-100">
                  {passedCount}
                </span>
                {attempts.length > 0 && (
                  <span className="text-[11px] font-mono text-muted-foreground dark:text-zinc-400">
                    ({Math.round((passedCount / attempts.length) * 100)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Avg Score */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase tracking-wide truncate">
                  {isRw ? "impuzandengo" : isFr ? "moyenne" : "avg score"}
                </span>
                <span className="text-xs font-mono font-bold text-primary">
                  {avgScore}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, avgScore))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Group Battles */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase tracking-wide truncate">
                {isRw ? "ibizamini by'itsinda" : isFr ? "défis en groupe" : "group battles"}
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-foreground dark:text-zinc-100 leading-tight">
                {groupCount}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Primary Category Type Tabs */}
      <div className="flex p-1 bg-muted/60 dark:bg-zinc-900/80 rounded-xl border border-border dark:border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "all"
              ? "bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 font-bold border border-border dark:border-zinc-700/60 shadow-xs"
              : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:bg-muted/30 dark:hover:bg-zinc-800/40"
          )}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>{isRw ? "byose" : isFr ? "tout" : "all files"}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted-foreground/15 dark:bg-zinc-700/60 text-foreground/80 dark:text-zinc-300">
            {attempts.length}
          </span>
        </button>

        {ongoingChallenges.length > 0 && (
          <button
            onClick={() => setActiveTab("ongoing")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
              activeTab === "ongoing"
                ? "bg-primary/20 text-primary font-bold border border-primary/30 shadow-xs"
                : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:bg-muted/30 dark:hover:bg-zinc-800/40"
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 animate-pulse text-primary" />
            <span>{isRw ? "birikuba" : isFr ? "en cours" : "ongoing"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
              {ongoingChallenges.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("individual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "individual"
              ? "bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 font-bold border border-border dark:border-zinc-700/60 shadow-xs"
              : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:bg-muted/30 dark:hover:bg-zinc-800/40"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>{isRw ? "wenyine" : isFr ? "solo" : "solo"}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted-foreground/15 dark:bg-zinc-700/60 text-foreground/80 dark:text-zinc-300">
            {individualCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "group"
              ? "bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 font-bold border border-border dark:border-zinc-700/60 shadow-xs"
              : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:bg-muted/30 dark:hover:bg-zinc-800/40"
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>{isRw ? "itsinda" : isFr ? "groupe" : "group"}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted-foreground/15 dark:bg-zinc-700/60 text-foreground/80 dark:text-zinc-300">
            {groupCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("module")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "module"
              ? "bg-background dark:bg-zinc-800 text-foreground dark:text-zinc-100 font-bold border border-border dark:border-zinc-700/60 shadow-xs"
              : "text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 hover:bg-muted/30 dark:hover:bg-zinc-800/40"
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span>{isRw ? "amasomo" : isFr ? "modules" : "modules"}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted-foreground/15 dark:bg-zinc-700/60 text-foreground/80 dark:text-zinc-300">
            {moduleCount}
          </span>
        </button>
      </div>

      {/* Collapsible Refined Filter & Grouping Control Deck */}
      {showFiltersPanel && (
        <div className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/60 p-3 sm:p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-border dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground dark:text-zinc-200">
                {isRw ? "Amayungurura n'Amatsinda" : isFr ? "Filtres et Groupement" : "Ledger Filters & Grouping"}
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{isRw ? "Siba Amayungurura Yose" : isFr ? "Réinitialiser les filtres" : "Reset All Filters"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Outcome Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                {isRw ? "Ibyavuyemo" : isFr ? "Résultats" : "Outcome"}
              </label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 text-xs font-mono text-foreground dark:text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="all">{isRw ? "Ibyavuyemo Byose" : isFr ? "Tous les résultats" : "All Outcomes"}</option>
                <option value="passed">{isRw ? "Watsinze (≥50%)" : isFr ? "Réussi (≥50%)" : "Passed (≥50%)"}</option>
                <option value="failed">{isRw ? "Watsinzwe (<50%)" : isFr ? "Échoué (<50%)" : "Failed (<50%)"}</option>
                <option value="void">{isRw ? "Ibitarangiye" : isFr ? "Incomplet" : "Void / Incomplete"}</option>
                <option value="cheating">{isRw ? "Gukopera" : isFr ? "Violations de sécurité" : "Security Violations"}</option>
              </select>
            </div>

            {/* Time Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                {isRw ? "Igihe / Itariki" : isFr ? "Période" : "Date Period"}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 text-xs font-mono text-foreground dark:text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="all">{isRw ? "Igihe Cyose" : isFr ? "Toutes les dates" : "All Time"}</option>
                <option value="today">{isRw ? "Uyu munsi (24h)" : isFr ? "Aujourd'hui (24h)" : "Today (24h)"}</option>
                <option value="week">{isRw ? "Iki Cyumweru" : isFr ? "Cette semaine" : "This Week"}</option>
                <option value="month">{isRw ? "Uku Kwezi" : isFr ? "Ce mois-ci" : "This Month"}</option>
                <option value="older">{isRw ? "Ibyashize" : isFr ? "Archives antérieures" : "Older Archive"}</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                {isRw ? "Icyiciro cy'Ikizamini" : isFr ? "Matière / Catégorie" : "Subject / Category"}
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 text-xs font-mono text-foreground dark:text-zinc-200 focus:outline-hidden focus:border-primary/50 truncate"
              >
                <option value="all">{isRw ? "Ibyiciro Byose" : isFr ? "Toutes les catégories" : "All Categories"}</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                {isRw ? "Tondeka" : isFr ? "Trier par" : "Sort By"}
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 text-xs font-mono text-foreground dark:text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="date_desc">{isRw ? "Bishya Mbere" : isFr ? "Plus récents" : "Newest First"}</option>
                <option value="date_asc">{isRw ? "Bishaje Mbere" : isFr ? "Plus anciens" : "Oldest First"}</option>
                <option value="score_desc">{isRw ? "Amanota Menshi" : isFr ? "Meilleur score" : "Highest Score"}</option>
                <option value="score_asc">{isRw ? "Amanota Make" : isFr ? "Score le plus bas" : "Lowest Score"}</option>
                <option value="duration_desc">{isRw ? "Igihe Kirekire" : isFr ? "Plus longue durée" : "Longest Time"}</option>
                <option value="duration_asc">{isRw ? "Igihe Gito" : isFr ? "Plus rapide" : "Fastest Time"}</option>
              </select>
            </div>

            {/* Sleek Grouping Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
                {isRw ? "Shyira mu Matsinda" : isFr ? "Grouper les dossiers" : "Group Dossiers"}
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg bg-card dark:bg-zinc-900 border text-xs font-mono focus:outline-hidden",
                  groupBy !== "none"
                    ? "border-primary/50 text-primary font-bold"
                    : "border-border dark:border-zinc-800 text-foreground dark:text-zinc-200 focus:border-primary/50"
                )}
              >
                <option value="none">{isRw ? "Nta tsinda (Birambuye)" : isFr ? "Aucun groupement" : "No Grouping (Flat)"}</option>
                <option value="date">{isRw ? "Ukurikije Itariki" : isFr ? "Grouper par date" : "Group by Date"}</option>
                <option value="outcome">{isRw ? "Ukurikije Imitsindire" : isFr ? "Grouper par résultat" : "Group by Outcome"}</option>
                <option value="category">{isRw ? "Ukurikije Icyiciro" : isFr ? "Grouper par matière" : "Group by Subject"}</option>
                <option value="type">{isRw ? "Ukurikije Ubwoko" : isFr ? "Grouper par type" : "Group by Exam Type"}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips Row (when filters are active & panel is closed or open) */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
          <span className="text-muted-foreground dark:text-zinc-400">
            {isRw ? "birikora:" : isFr ? "actifs :" : "active:"}
          </span>
          {outcomeFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200">
              <span>{isRw ? "ibyavuyemo" : isFr ? "résultat" : "outcome"}: {outcomeFilter}</span>
              <button onClick={() => setOutcomeFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200">
              <span>{isRw ? "itariki" : isFr ? "date" : "date"}: {dateFilter}</span>
              <button onClick={() => setDateFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 max-w-[200px] truncate">
              <span className="truncate">{categoryFilter}</span>
              <button onClick={() => setCategoryFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {groupBy !== "none" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary">
              <span>{isRw ? `itsinda: ${groupBy}` : isFr ? `groupé par ${groupBy}` : `grouped by ${groupBy}`}</span>
              <button onClick={() => setGroupBy("none")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {sortBy !== "date_desc" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200">
              <span>{isRw ? "tondeka:" : isFr ? "tri :" : "sorted:"} {sortBy.replace("_", " ")}</span>
              <button onClick={() => setSortBy("date_desc")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetAllFilters}
            className="text-[10px] text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:text-zinc-200 underline ml-1"
          >
            {isRw ? "siba byose" : isFr ? "tout effacer" : "clear all"}
          </button>
        </div>
      )}

      {/* Ongoing Active Challenges in Ongoing Tab */}
      {activeTab === "ongoing" && (
        <div className="space-y-2.5">
          {ongoingChallenges.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-border dark:border-zinc-800 rounded-xl p-6 bg-muted/30 dark:bg-zinc-950/30">
              <Clock className="mx-auto mb-2.5 h-8 w-8 text-zinc-600" />
              <p className="text-xs font-medium text-foreground/80 dark:text-zinc-300">
                {t("noOngoingExams") || "No ongoing exams right now"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground dark:text-zinc-400 font-mono">
                {t("noOngoingExamsHint") || "When you start or get invited to a group exam, it will appear here."}
              </p>
            </div>
          ) : (
            ongoingChallenges.map((challenge) => {
              const isCreator = challenge.creator_id === user?.id;
              const userPart = challenge.participants?.find((p: any) => p.user_id === user?.id);
              return (
                <div
                  key={challenge.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/60 hover:border-border dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-foreground dark:text-zinc-100 truncate">
                        {getExamResultLanguageName({
                          language: challenge.language,
                          category_name: challenge.category_name,
                        })}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold lowercase">
                        {challenge.status === "active" ? t("inProgress") || "in-progress" : t("pending") || "pending"}
                      </span>
                      {isCreator && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted dark:bg-zinc-800 border border-border dark:border-zinc-700 text-foreground/80 dark:text-zinc-300 lowercase">
                          {isRw ? "uwabiteguye" : isFr ? "créateur" : "creator"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground dark:text-zinc-400 font-mono flex-wrap">
                      <span>
                        {isCreator
                          ? isRw
                            ? "byateguwe nawe"
                            : isFr
                            ? "créé par vous"
                            : "created by you"
                          : `${isRw ? "uwakiriye:" : isFr ? "hôte :" : "host:"} ${
                              challenge.creator_profile?.full_name ||
                              challenge.creator_profile?.username ||
                              (isRw ? "Umunyeshuri" : isFr ? "Étudiant" : "Student")
                            }`}
                      </span>
                      <span>•</span>
                      <span>
                        {challenge.participants?.length || 0}{" "}
                        {isRw ? "ababitabiriye" : isFr ? "participants" : "participants"}
                      </span>
                      <span>•</span>
                      <span>{formatDate(challenge.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigate("exam", {
                        challenge_id: challenge.id,
                        category_id: challenge.category_id || "",
                        ...(challenge.language ? { language: challenge.language } : {}),
                      });
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {userPart?.status === "in_progress" || userPart?.status === "joined"
                        ? t("continueExam") || "Resume Exam"
                        : t("joinExam") || "Join Exam"}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Main Content Area (Grouped or Flat Stream) */}
      {activeTab !== "ongoing" && filteredAndSortedAttempts.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border dark:border-zinc-800 rounded-xl p-6 bg-muted/30 dark:bg-zinc-950/30">
          <FolderArchive className="mx-auto mb-2.5 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-semibold text-foreground dark:text-zinc-200">
            {searchQuery || activeFilterCount > 0
              ? isRw
                ? "Nta kizamini gihuye n'ibyo washatse"
                : isFr
                ? "Aucun dossier ne correspond aux filtres"
                : "No dossiers match current filters"
              : activeTab === "group"
              ? t("noGroupExamHistory") || "No group exams completed yet"
              : activeTab === "module"
              ? isRw
                ? "Nta kizamini cy'isomo kirakorwa"
                : isFr
                ? "Aucun examen de module terminé"
                : "No module assessments completed yet"
              : t("noExamHistory") || "No exam attempts found"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400 font-mono max-w-sm mx-auto">
            {searchQuery || activeFilterCount > 0
              ? isRw
                ? "Gerageza guhindura cyangwa gukuraho amayungurura kugira ngo urebe ibindi bizamini."
                : isFr
                ? "Essayez de modifier ou de réinitialiser vos filtres pour voir d'autres archives."
                : "Try adjusting or resetting your filter criteria to inspect other archives."
              : activeTab === "group"
              ? t("noGroupExamHint") || "Challenge your classmates to a group exam to see results here."
              : activeTab === "module"
              ? isRw
                ? "Rangiza ibizamini by'imitwe y'amasomo mu gice cy'amasomo kugira ngo bibikwe hano."
                : isFr
                ? "Terminez les examens de modules dans la section cours pour les enregistrer ici."
                : "Complete curriculum module exams in the course section to record dossiers."
              : t("noExamHistoryHint") || "Take an exam from the exams page to start recording your progress."}
          </p>
          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={resetAllFilters}
              className="mt-3 px-3 py-1.2 rounded-lg text-xs font-mono bg-muted hover:bg-muted/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border dark:border-zinc-700 text-foreground dark:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{isRw ? "Siba Amayungurura" : isFr ? "Réinitialiser les filtres" : "Reset Filters"}</span>
            </button>
          )}
        </div>
      ) : (
        activeTab !== "ongoing" && (
          <div className="space-y-6">
            {groupedAttempts.map((group) => {
              const isCollapsed = collapsedGroups[group.id];
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="space-y-2.5">
                  {/* Sleek, Compact Folder-Style Group Header (only when groupBy is enabled) */}
                  {groupBy !== "none" && (
                    <div
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 dark:bg-white/[0.04] hover:bg-muted/70 dark:hover:bg-white/[0.08] cursor-pointer transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="h-4 w-4 fill-amber-400 text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-foreground dark:text-zinc-100 truncate">{group.label}</span>
                        <span className="text-[11px] font-mono text-muted-foreground dark:text-zinc-400 tabular-nums shrink-0">
                          ({group.items.length}{" "}
                          {isRw
                            ? group.items.length === 1
                              ? "dosiye"
                              : "amadosiye"
                            : isFr
                            ? group.items.length === 1
                              ? "dossier"
                              : "dossiers"
                            : group.items.length === 1
                            ? "file"
                            : "files"}
                          )
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {group.avgScore > 0 && (
                          <span className="text-[11px] font-mono text-primary font-bold tabular-nums hidden sm:inline-block">
                            {isRw ? "impuz." : isFr ? "moy." : "avg"} {group.avgScore}%
                          </span>
                        )}
                        {isCollapsed ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-400" />
                        ) : (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-400" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Group Items (PC File Explorer Grid / List) */}
                  {!isCollapsed && (
                    <>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5 p-1 sm:p-2">
                          {group.items.map((attempt) => {
                            const isPassed = (attempt.score_percentage || 0) >= 50;
                            const answeredCount = (attempt.answers || []).filter(
                              (a) => a.selected_answer !== null
                            ).length;
                            const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
                            const isCheating = attempt.submission_reason === "cheating_violation";
                            const isGroup = !!attempt.challenge_id;
                            const isModule = !!attempt.is_module;
                            const scorePct = isAbandoned
                              ? 0
                              : Math.max(0, Math.min(100, attempt.score_percentage || 0));
                            const rawDate = attempt.completed_at || attempt.started_at || attempt.created_at;
                            const shortDate = (() => {
                              if (!rawDate) return "";
                              const d = new Date(rawDate);
                              if (isNaN(d.getTime())) return "";
                              return d.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "2-digit",
                              });
                            })();

                            const getZeroAnswerCause = () => {
                              if (isCheating) {
                                const sum = (attempt.violation_summary || "").toLowerCase();
                                if (sum.includes("tab"))
                                  return isRw ? "Cyoherejwe: Guhindura paji" : isFr ? "Soumis : Changement d'onglet" : "Submitted by violation: Tab switch";
                                if (sum.includes("fullscreen"))
                                  return isRw ? "Cyoherejwe: Kuvamo ecran yose" : isFr ? "Soumis : Sortie du plein écran" : "Submitted by violation: Fullscreen exited";
                                if (sum.includes("dev_tools") || sum.includes("inspect"))
                                  return isRw ? "Cyoherejwe: Ibikoresho by'ikoranabuhanga" : isFr ? "Soumis : Outils développeur" : "Submitted by violation: DevTools detected";
                                if (sum.includes("copy") || sum.includes("paste"))
                                  return isRw ? "Cyoherejwe: Gukoporora" : isFr ? "Soumis : Copier/Coller" : "Submitted by violation: Copy/Paste";
                                return isRw ? "Cyoherejwe kubera gukopera" : isFr ? "Soumis pour violation de sécurité" : "Submitted by exam security violation";
                              }
                              if (attempt.submission_reason === "page_closed")
                                return isRw ? "0 byasubijwe: Idirishya ryafunzwe" : isFr ? "0 réponse : Fenêtre fermée" : "0 answered: Exam window/tab closed";
                              if (attempt.submission_reason === "time_expired")
                                return isRw ? "0 byasubijwe: Igihe cyarangiye" : isFr ? "0 réponse : Temps écoulé" : "0 answered: Exam timer expired";
                              return isRw ? "0 byasubijwe: Cyahagaritswe hakiri kare" : isFr ? "0 réponse : Quitté prématurément" : "0 answered: Incomplete / exited early";
                            };

                            const fileName = getExamResultLanguageName(attempt);
                            const fractionLabel = isAbandoned
                              ? `${answeredCount}/${attempt.total_questions || 20}`
                              : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`;
                            const modeLabel = isGroup
                              ? isRw
                                ? "itsinda"
                                : isFr
                                ? "groupe"
                                : "group"
                              : isModule
                              ? isRw
                                ? "modire"
                                : "module"
                              : isRw
                              ? "wenyine"
                              : isFr
                              ? "solo"
                              : "solo";
                            const statusLabel = isCheating
                              ? isRw
                                ? "Gukopera"
                                : isFr
                                ? "Infraction"
                                : "Violation"
                              : isAbandoned
                              ? isRw
                                ? "Ntiryarangiye"
                                : isFr
                                ? "Incomplet"
                                : "Incomplete"
                              : isPassed
                              ? isRw
                                ? "Yatsinze"
                                : isFr
                                ? "Réussi"
                                : "Passed"
                              : isRw
                              ? "Yatsinzwe"
                              : isFr
                              ? "Échoué"
                              : "Failed";
                            const statusColorClass = isCheating
                              ? "text-orange-600 dark:text-orange-400"
                              : isAbandoned
                              ? "text-amber-600 dark:text-amber-400"
                              : isPassed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400";

                            return (
                              <button
                                key={attempt.id}
                                type="button"
                                onClick={() => handleReview(attempt)}
                                className="group relative flex flex-col items-center text-center rounded-xl p-2 sm:p-2.5 bg-transparent border border-transparent hover:bg-slate-200/70 dark:hover:bg-white/[0.08] hover:border-slate-300/70 dark:hover:border-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
                              >
                                <PCFileIcon
                                  isCheating={isCheating}
                                  isAbandoned={isAbandoned}
                                  isGroup={isGroup}
                                  isModule={isModule}
                                  isPassed={isPassed}
                                  size="lg"
                                />

                                <span className="mt-2 text-xs font-semibold text-foreground dark:text-zinc-100 leading-snug line-clamp-2 break-words w-full">
                                  {fileName}
                                </span>

                                <span
                                  className={cn(
                                    "mt-1 text-[11px] font-semibold leading-tight",
                                    statusColorClass
                                  )}
                                >
                                  {statusLabel}
                                </span>

                                <span className="mt-0.5 text-[11px] font-mono tabular-nums font-medium text-foreground/85 dark:text-zinc-200 leading-tight">
                                  {fractionLabel} · {scorePct}%
                                </span>

                                {shortDate && (
                                  <span className="mt-0.5 text-[10px] font-mono tabular-nums text-muted-foreground dark:text-zinc-400 truncate max-w-full leading-tight">
                                    {shortDate}
                                  </span>
                                )}

                                {/* Windows Explorer-style Hover Details Tooltip */}
                                <div className="hidden sm:group-hover:block pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(100%+4px)] z-30 w-60 rounded-lg border border-border/90 dark:border-zinc-700/80 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-md p-2.5 text-left shadow-xl text-[11px] leading-relaxed text-popover-foreground dark:text-zinc-200">
                                  <div className="font-semibold text-foreground dark:text-white truncate mb-1">
                                    {fileName}
                                  </div>
                                  <div className="space-y-0.5 text-[10px] font-mono text-muted-foreground dark:text-zinc-400">
                                    <div>
                                      {isRw ? "Imiterere:" : isFr ? "Statut :" : "Status:"}{" "}
                                      <span className={cn("font-semibold", statusColorClass)}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                    <div>
                                      {isRw ? "Amanota:" : isFr ? "Points :" : "Marks:"}{" "}
                                      <span className="text-foreground dark:text-zinc-200 tabular-nums">
                                        {fractionLabel}
                                      </span>
                                    </div>
                                    <div>
                                      {isRw ? "Ijanisha:" : isFr ? "Pourcentage :" : "Percentage:"}{" "}
                                      <span className="text-foreground dark:text-zinc-200 tabular-nums">
                                        {scorePct}%
                                      </span>
                                    </div>
                                    <div>
                                      {isRw ? "Itariki:" : isFr ? "Date :" : "Date:"}{" "}
                                      <span className="text-foreground dark:text-zinc-200 tabular-nums">{formatDate(rawDate)}</span>
                                    </div>
                                    <div>
                                      {isRw ? "Ubwoko:" : isFr ? "Type :" : "Type:"}{" "}
                                      <span className="text-foreground dark:text-zinc-200">
                                        {modeLabel}
                                        {attempt.duration_seconds != null ? ` · ${formatDuration(attempt.duration_seconds)}` : ""}
                                      </span>
                                    </div>
                                    {answeredCount === 0 && (
                                      <div className="text-amber-600 dark:text-amber-400 pt-0.5 leading-snug">
                                        {getZeroAnswerCause()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50 dark:divide-zinc-800/70">
                          {group.items.map((attempt) => {
                            const isPassed = (attempt.score_percentage || 0) >= 50;
                            const answeredCount = (attempt.answers || []).filter(
                              (a) => a.selected_answer !== null
                            ).length;
                            const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
                            const isCheating = attempt.submission_reason === "cheating_violation";
                            const isGroup = !!attempt.challenge_id;
                            const isModule = !!attempt.is_module;
                            const listScorePct = isAbandoned
                              ? 0
                              : Math.max(0, Math.min(100, attempt.score_percentage || 0));
                            const listStatusLabel = isCheating
                              ? isRw
                                ? "Gukopera"
                                : isFr
                                ? "Infraction"
                                : "Violation"
                              : isAbandoned
                              ? isRw
                                ? "Ntiryarangiye"
                                : isFr
                                ? "Incomplet"
                                : "Incomplete"
                              : isPassed
                              ? isRw
                                ? "Yatsinze"
                                : isFr
                                ? "Réussi"
                                : "Passed"
                              : isRw
                              ? "Yatsinzwe"
                              : isFr
                              ? "Échoué"
                              : "Failed";
                            const listStatusColorClass = isCheating
                              ? "text-orange-600 dark:text-orange-400"
                              : isAbandoned
                              ? "text-amber-600 dark:text-amber-400"
                              : isPassed
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400";

                            const getZeroAnswerListCause = () => {
                              if (isCheating) {
                                const sum = (attempt.violation_summary || "").toLowerCase();
                                if (sum.includes("tab"))
                                  return isRw ? "Cyoherejwe: Guhindura paji byatahuwe" : isFr ? "Soumis : Changement d'onglet détecté" : "Submitted by exam violation: Tab switching detected";
                                if (sum.includes("fullscreen"))
                                  return isRw ? "Cyoherejwe: Kuvamo ecran yose" : isFr ? "Soumis : Sortie du plein écran" : "Submitted by exam violation: Fullscreen exited";
                                if (sum.includes("dev_tools") || sum.includes("inspect"))
                                  return isRw ? "Cyoherejwe: Ibikoresho by'ikoranabuhanga" : isFr ? "Soumis : Outils développeur détectés" : "Submitted by exam violation: Developer tools detected";
                                if (sum.includes("copy") || sum.includes("paste"))
                                  return isRw ? "Cyoherejwe: Gukoporora byatahuwe" : isFr ? "Soumis : Copier/coller détecté" : "Submitted by exam violation: Copy/paste detected";
                                return isRw ? "Cyoherejwe kubera gukopera" : isFr ? "Soumis pour violation de sécurité" : "Submitted by exam security violation";
                              }
                              if (attempt.submission_reason === "page_closed")
                                return isRw ? "0 byasubijwe: Urupapuro rwafunzwe hakiri kare" : isFr ? "0 réponse : Page fermée prématurément" : "0 answered questions: Exam page was closed or left early";
                              if (attempt.submission_reason === "time_expired")
                                return isRw ? "0 byasubijwe: Igihe cyarangiye nta kibazo gisubijwe" : isFr ? "0 réponse : Temps écoulé sans réponse" : "0 answered questions: Exam timer expired without answers";
                              return isRw ? "0 byasubijwe: Wasohotse mbere yo gusubiza" : isFr ? "0 réponse : Quitté avant de répondre" : "0 answered questions: Exam exited before answering";
                            };

                            return (
                              <button
                                key={attempt.id}
                                onClick={() => handleReview(attempt)}
                                className="group w-full flex items-center gap-3 rounded-lg bg-transparent hover:bg-slate-200/60 dark:hover:bg-white/[0.06] px-2.5 py-2.5 text-left transition-colors cursor-pointer"
                              >
                                <PCFileIcon
                                  isCheating={isCheating}
                                  isAbandoned={isAbandoned}
                                  isGroup={isGroup}
                                  isModule={isModule}
                                  isPassed={isPassed}
                                  size="sm"
                                />

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-semibold text-foreground dark:text-zinc-100 truncate">
                                      {getExamResultLanguageName(attempt)}
                                    </p>
                                    <span className={cn("text-[11px] font-semibold", listStatusColorClass)}>
                                      · {listStatusLabel}
                                    </span>
                                    {(isGroup || isModule) && (
                                      <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400">
                                        · {isGroup ? (isRw ? "itsinda" : isFr ? "groupe" : "group") : (isRw ? "modire" : "module")}
                                      </span>
                                    )}
                                  </div>

                                  {answeredCount === 0 && (
                                    <p
                                      className={cn(
                                        "text-[11px] font-medium truncate",
                                        isCheating
                                          ? "text-orange-600 dark:text-orange-400"
                                          : "text-amber-600 dark:text-amber-400"
                                      )}
                                    >
                                      {getZeroAnswerListCause()}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground dark:text-zinc-400 font-mono flex-wrap tabular-nums">
                                    <span>{formatDate(attempt.completed_at || attempt.started_at || attempt.created_at)}</span>
                                    {attempt.duration_seconds != null && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>{formatDuration(attempt.duration_seconds)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p
                                    className={cn(
                                      "text-sm font-mono font-bold tabular-nums",
                                      listStatusColorClass
                                    )}
                                  >
                                    {listScorePct}%
                                  </p>
                                  <p className="text-[11px] font-mono tabular-nums text-muted-foreground dark:text-zinc-400">
                                    {isAbandoned
                                      ? `${answeredCount}/${attempt.total_questions || 20}`
                                      : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-zinc-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
