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
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ExamReview } from "@/components/exam-review";
import { ExamHistorySkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { spaCache } from "@/lib/spa-cache";
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

export function ExamHistoryView({ navigate }: ExamHistoryViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const cached = user
    ? spaCache.get<{ attempts: ExamAttemptWithAnswers[]; ongoingChallenges: any[] }>(`spa_exam_history_${user.id}`)
    : null;

  const [loading, setLoading] = useState(!cached);
  const [attempts, setAttempts] = useState<ExamAttemptWithAnswers[]>(cached?.attempts || []);
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

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

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
          .select("challenge_id, exam_attempt_id")
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

        const groupAttemptIdMap = new Map<string, string>();
        if (challengeRes.status === "fulfilled" && challengeRes.value.data) {
          challengeRes.value.data.forEach((p: any) => {
            if (p.exam_attempt_id) {
              groupAttemptIdMap.set(p.exam_attempt_id, p.challenge_id);
            }
          });
        }

        if (ongoingRes.status === "fulfilled") {
          const list = (ongoingRes.value as any)?.challenges || [];
          const now = Date.now();
          const activeList = list.filter((c: any) => {
            if (!user || !c?.created_at) return false;
            if (c.status === "completed" || c.status === "cancelled") return false;

            const p = c.participants?.find((x: any) => x.user_id === user.id);
            const hasCompleted =
              p?.status === "completed" ||
              p?.status === "abandoned" ||
              p?.status === "rejected" ||
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

                  return {
                    ...(att as ExamAttemptWithAnswers),
                    correct_answers: correct ?? 0,
                    score_percentage: scorePct ?? 0,
                    challenge_id: groupAttemptIdMap.get(att.id) || null,
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
                  answers: att.answers || [],
                  challenge_id: null,
                  is_module: true,
                } as ExamAttemptWithAnswers;
              })
            : [];

        const combined = [...standardAttempts, ...moduleAttempts].sort((a, b) => {
          const dateA = new Date(a.created_at || a.started_at || 0).getTime();
          const dateB = new Date(b.created_at || b.started_at || 0).getTime();
          return dateB - dateA;
        });

        setAttempts(combined);
        spaCache.set(`spa_exam_history_${user.id}`, {
          attempts: combined,
          ongoingChallenges: ongoingRes.status === "fulfilled" ? (ongoingRes.value as any)?.challenges || [] : [],
        });
      } catch (err) {
        console.error("Failed to fetch exam history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, t]);

  const handleReview = async (attempt: ExamAttemptWithAnswers) => {
    if (attempt.challenge_id) {
      navigate("classmates/group-results", { id: attempt.challenge_id });
      return;
    }

    setSelectedAttempt(attempt);
    setQuestions([]);

    if (!user) return;
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
      }
    } catch (err) {
      console.error("Failed to fetch questions for review:", err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  // Multi-tier filtering
  const filteredAndSortedAttempts = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;
    const thirtyDays = 30 * oneDay;

    let list = attempts.filter((a) => {
      // 1. Tab Filter
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

    // Sort logic
    list.sort((a, b) => {
      const dateA = new Date(a.created_at || a.started_at || 0).getTime();
      const dateB = new Date(b.created_at || b.started_at || 0).getTime();
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
    if (groupBy === "none") {
      return [
        {
          id: "all",
          label: "All Exam Dossiers",
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
      let label = "Other";
      let icon = FolderArchive;

      if (groupBy === "date") {
        const attemptDate = new Date(attempt.created_at || attempt.started_at || 0);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          key = "today";
          label = "Today";
          icon = Clock;
        } else if (diffDays <= 7) {
          key = "week";
          label = "This Week";
          icon = Calendar;
        } else if (diffDays <= 30) {
          key = "month";
          label = "This Month";
          icon = Calendar;
        } else {
          key = "older";
          label = "Older Archives";
          icon = FolderArchive;
        }
      } else if (groupBy === "category") {
        key = attempt.category_name || "General Driving Exam";
        label = key;
        icon = attempt.is_module ? BookOpen : FolderCheck;
      } else if (groupBy === "outcome") {
        const answeredCount = (attempt.answers || []).filter((ans) => ans.selected_answer !== null).length;
        const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
        const isCheating = attempt.submission_reason === "cheating_violation";
        const isPassed = (attempt.score_percentage || 0) >= 50 && !isAbandoned;

        if (isCheating) {
          key = "cheating";
          label = "Security Violations";
          icon = ShieldAlert;
        } else if (isAbandoned) {
          key = "void";
          label = "Void / Incomplete";
          icon = FileWarning;
        } else if (isPassed) {
          key = "passed";
          label = "Passed Dossiers (≥50%)";
          icon = FolderCheck;
        } else {
          key = "failed";
          label = "Needs Review (<50%)";
          icon = FolderX;
        }
      } else if (groupBy === "type") {
        if (attempt.challenge_id) {
          key = "group";
          label = "Group Battles";
          icon = Users;
        } else if (attempt.is_module) {
          key = "module";
          label = "Module Curriculum Exams";
          icon = BookOpen;
        } else {
          key = "solo";
          label = "Solo Mock Exams";
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
  }, [groupBy, filteredAndSortedAttempts]);

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
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("back") || t("backToHome") || "Back"}</span>
          </button>
          <span className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase hidden sm:inline-block">
            telemetry · exam archive
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase flex items-center gap-1.5">
              <FolderArchive className="h-3.5 w-3.5 text-primary" />
              <span>performance ledger · exam dossier vault</span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">
              {t("examHistory") || "Exam History Archive"}
            </h1>
          </div>

          {/* Quick Search, Grouping Selector, Filter & Grid/List Switcher */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search") || "Search dossiers..."}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-primary/50 font-mono transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick Top Grouping Selector */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-colors bg-zinc-900/80",
                  groupBy !== "none"
                    ? "border-primary/50 text-primary font-bold bg-primary/10"
                    : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                )}
              >
                <Layers className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline text-[11px] text-zinc-400">group:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                  className="bg-transparent border-0 text-xs font-mono text-inherit focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value="none" className="bg-zinc-900 text-zinc-300">none (flat)</option>
                  <option value="date" className="bg-zinc-900 text-zinc-300">by date</option>
                  <option value="outcome" className="bg-zinc-900 text-zinc-300">by outcome</option>
                  <option value="category" className="bg-zinc-900 text-zinc-300">by subject</option>
                  <option value="type" className="bg-zinc-900 text-zinc-300">by exam type</option>
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
                  : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>filter</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-zinc-900/80 rounded-lg border border-zinc-800 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                title="Grid View (Compact 4-6)"
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List View"
                className={cn(
                  "p-1.5 rounded-md text-xs transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row - Professional & Compact Primary Focus */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <FolderOpen className="h-3 w-3 text-primary" />
            <span>total attempts</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{attempts.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <FolderCheck className="h-3 w-3 text-primary" />
            <span>passed files</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{passedCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <Award className="h-3 w-3 text-primary" />
            <span>avg score</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-primary">{avgScore}%</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 sm:p-3 space-y-0.5">
          <div className="text-[10px] font-mono text-zinc-400 lowercase flex items-center gap-1">
            <Users className="h-3 w-3 text-primary" />
            <span>group battles</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-zinc-100">{groupCount}</div>
        </div>
      </div>

      {/* Primary Category Type Tabs */}
      <div className="flex p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "all"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span>all files</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
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
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 animate-pulse text-primary" />
            <span>ongoing</span>
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
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span>solo</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {individualCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "group"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>group</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {groupCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("module")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap lowercase",
            activeTab === "module"
              ? "bg-zinc-800 text-zinc-100 font-bold border border-zinc-700/60 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span>modules</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-700/60 text-zinc-300">
            {moduleCount}
          </span>
        </button>
      </div>

      {/* Collapsible Refined Filter & Grouping Control Deck */}
      {showFiltersPanel && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
                Ledger Filters & Grouping
              </span>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Outcome Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Outcome</label>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="all">All Outcomes</option>
                <option value="passed">Passed (≥50%)</option>
                <option value="failed">Failed (&lt;50%)</option>
                <option value="void">Void / Incomplete</option>
                <option value="cheating">Security Violations</option>
              </select>
            </div>

            {/* Time Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Date Period</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="all">All Time</option>
                <option value="today">Today (24h)</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="older">Older Archive</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Subject / Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-primary/50 truncate"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-hidden focus:border-primary/50"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="score_asc">Lowest Score</option>
                <option value="duration_desc">Longest Time</option>
                <option value="duration_asc">Fastest Time</option>
              </select>
            </div>

            {/* Sleek Grouping Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Group Dossiers</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                className={cn(
                  "w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border text-xs font-mono focus:outline-hidden",
                  groupBy !== "none"
                    ? "border-primary/50 text-primary font-bold"
                    : "border-zinc-800 text-zinc-200 focus:border-primary/50"
                )}
              >
                <option value="none">No Grouping (Flat)</option>
                <option value="date">Group by Date</option>
                <option value="outcome">Group by Outcome</option>
                <option value="category">Group by Subject</option>
                <option value="type">Group by Exam Type</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips Row (when filters are active & panel is closed or open) */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
          <span className="text-zinc-400">active:</span>
          {outcomeFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <span>outcome: {outcomeFilter}</span>
              <button onClick={() => setOutcomeFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {dateFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <span>date: {dateFilter}</span>
              <button onClick={() => setDateFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {categoryFilter !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 max-w-[200px] truncate">
              <span className="truncate">{categoryFilter}</span>
              <button onClick={() => setCategoryFilter("all")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {groupBy !== "none" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary">
              <span>grouped by {groupBy}</span>
              <button onClick={() => setGroupBy("none")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {sortBy !== "date_desc" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200">
              <span>sorted: {sortBy.replace("_", " ")}</span>
              <button onClick={() => setSortBy("date_desc")} className="hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={resetAllFilters}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 underline ml-1"
          >
            clear all
          </button>
        </div>
      )}

      {/* Ongoing Active Challenges in Ongoing Tab */}
      {activeTab === "ongoing" && (
        <div className="space-y-2.5">
          {ongoingChallenges.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-950/30">
              <Clock className="mx-auto mb-2.5 h-8 w-8 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-300">
                {t("noOngoingExams") || "No ongoing exams right now"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400 font-mono">
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
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-zinc-100 truncate">
                        {challenge.category_name || "Exam Challenge"}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold lowercase">
                        {challenge.status === "active" ? t("inProgress") || "in-progress" : t("pending") || "pending"}
                      </span>
                      {isCreator && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 lowercase">
                          creator
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono flex-wrap">
                      <span>
                        {isCreator
                          ? "created by you"
                          : `host: ${
                              challenge.creator_profile?.full_name ||
                              challenge.creator_profile?.username ||
                              "Student"
                            }`}
                      </span>
                      <span>•</span>
                      <span>{challenge.participants?.length || 0} participants</span>
                      <span>•</span>
                      <span>{formatDate(challenge.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      window.location.href = `/dashboard/exam?challenge_id=${challenge.id}&category_id=${
                        challenge.category_id || ""
                      }`;
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
        <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl p-6 bg-zinc-950/30">
          <FolderArchive className="mx-auto mb-2.5 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-semibold text-zinc-200">
            {searchQuery || activeFilterCount > 0
              ? "No dossiers match current filters"
              : activeTab === "group"
              ? t("noGroupExamHistory") || "No group exams completed yet"
              : activeTab === "module"
              ? "No module assessments completed yet"
              : t("noExamHistory") || "No exam attempts found"}
          </p>
          <p className="mt-1 text-xs text-zinc-400 font-mono max-w-sm mx-auto">
            {searchQuery || activeFilterCount > 0
              ? "Try adjusting or resetting your filter criteria to inspect other archives."
              : activeTab === "group"
              ? t("noGroupExamHint") || "Challenge your classmates to a group exam to see results here."
              : activeTab === "module"
              ? "Complete curriculum module exams in the course section to record dossiers."
              : t("noExamHistoryHint") || "Take an exam from the exams page to start recording your progress."}
          </p>
          {(searchQuery || activeFilterCount > 0) && (
            <button
              onClick={resetAllFilters}
              className="mt-3 px-3 py-1.2 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
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
                  {/* Sleek, Compact Group Header (only when groupBy is enabled) */}
                  {groupBy !== "none" && (
                    <div
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GroupIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-bold text-zinc-200 truncate">{group.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                          {group.items.length} {group.items.length === 1 ? "file" : "files"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {group.avgScore > 0 && (
                          <span className="text-[10px] font-mono text-primary font-bold hidden sm:inline-block">
                            avg {group.avgScore}%
                          </span>
                        )}
                        {isCollapsed ? (
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                        ) : (
                          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Group Items (Grid / List) */}
                  {!isCollapsed && (
                    <>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
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

                            return (
                              <div
                                key={attempt.id}
                                onClick={() => handleReview(attempt)}
                                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-primary/50 p-3 sm:p-3.5 text-left transition-all duration-150 cursor-pointer overflow-hidden shadow-xs hover:shadow-md"
                              >
                                {/* Header: File Icon + Score Badge */}
                                <div className="flex items-start justify-between gap-1.5 mb-2">
                                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                                    {isCheating ? (
                                      <ShieldAlert className="h-3.5 w-3.5" />
                                    ) : isAbandoned ? (
                                      <FileWarning className="h-3.5 w-3.5" />
                                    ) : isGroup ? (
                                      <Users className="h-3.5 w-3.5" />
                                    ) : isModule ? (
                                      <BookOpen className="h-3.5 w-3.5" />
                                    ) : (
                                      <FolderCheck className="h-3.5 w-3.5" />
                                    )}
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <span
                                      className={cn(
                                        "font-mono font-bold text-[11px] px-1.5 py-0.5 rounded border leading-none inline-block",
                                        isAbandoned
                                          ? "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                                          : isPassed
                                          ? "bg-primary/10 border-primary/20 text-primary font-extrabold"
                                          : "bg-zinc-800/90 border-zinc-700/80 text-zinc-300"
                                      )}
                                    >
                                      {isAbandoned ? "VOID" : `${attempt.score_percentage}%`}
                                    </span>
                                  </div>
                                </div>

                                {/* Body: Title & Meta Info */}
                                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <h3 className="text-xs font-bold text-zinc-200 group-hover:text-zinc-100 transition-colors line-clamp-2 leading-snug">
                                      {attempt.category_name || "Official Driving Exam"}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-zinc-400">
                                      <span>{isGroup ? "group" : isModule ? "module" : "solo"}</span>
                                      <span>•</span>
                                      <span>{isAbandoned ? "incomplete" : isPassed ? "passed" : "reviewed"}</span>
                                    </div>
                                  </div>

                                  {/* Sleek Minimal Progress Meter */}
                                  <div className="space-y-1 pt-1">
                                    <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-300",
                                          isPassed ? "bg-primary" : "bg-zinc-500"
                                        )}
                                        style={{ width: `${scorePct}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                      <span>
                                        {isAbandoned
                                          ? `${answeredCount}/${attempt.total_questions || 20}`
                                          : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
                                      </span>
                                      <span className="truncate">
                                        {new Date(
                                          attempt.started_at || attempt.completed_at || ""
                                        ).toLocaleDateString(undefined, {
                                          month: "numeric",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Bar */}
                                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                  <span className="flex items-center gap-1 truncate">
                                    <Timer className="h-2.5 w-2.5 shrink-0" />
                                    <span>
                                      {attempt.duration_seconds != null
                                        ? formatDuration(attempt.duration_seconds)
                                        : "15m"}
                                    </span>
                                  </span>
                                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:text-primary transition-all shrink-0" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {group.items.map((attempt) => {
                            const isPassed = (attempt.score_percentage || 0) >= 50;
                            const answeredCount = (attempt.answers || []).filter(
                              (a) => a.selected_answer !== null
                            ).length;
                            const isAbandoned = attempt.status === "abandoned" || answeredCount === 0;
                            const isCheating = attempt.submission_reason === "cheating_violation";
                            const isGroup = !!attempt.challenge_id;
                            const isModule = !!attempt.is_module;

                            return (
                              <button
                                key={attempt.id}
                                onClick={() => handleReview(attempt)}
                                className="group w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60 hover:border-primary/40 p-3 text-left transition-colors"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-primary">
                                  {isCheating ? (
                                    <ShieldAlert className="h-4 w-4" />
                                  ) : isAbandoned ? (
                                    <FileWarning className="h-4 w-4" />
                                  ) : isGroup ? (
                                    <Users className="h-4 w-4" />
                                  ) : isModule ? (
                                    <BookOpen className="h-4 w-4" />
                                  ) : (
                                    <FolderCheck className="h-4 w-4" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-xs font-bold text-zinc-100 truncate">
                                      {attempt.category_name}
                                    </p>
                                    {isGroup && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                                        group
                                      </span>
                                    )}
                                    {isModule && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                                        module
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatDate(attempt.started_at || attempt.completed_at)}</span>
                                    </span>
                                    {attempt.duration_seconds != null && (
                                      <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                        {formatDuration(attempt.duration_seconds)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <p className="text-sm font-mono font-bold text-zinc-100">
                                    {isAbandoned ? "—" : `${attempt.score_percentage}%`}
                                  </p>
                                  <p className="text-[11px] font-mono text-zinc-400">
                                    {isAbandoned
                                      ? `${answeredCount}/${attempt.total_questions}`
                                      : `${attempt.correct_answers ?? 0}/${attempt.total_questions || 20}`}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-zinc-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
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
