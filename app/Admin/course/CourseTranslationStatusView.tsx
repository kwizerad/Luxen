"use client";

import { useEffect, useState } from "react";
import {
  Languages,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FolderOpen,
  FileText,
  FileCode2,
  Globe2,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Play,
  Square,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { translationQueue, type TranslationJobRecord } from "@/lib/translation-queue";
import { createClient } from "@/lib/supabase/client";
import { loadFullCourse, type FullCourse } from "@/app/Admin/actions/courses";
import {
  Course,
  CourseLanguage,
  dbCourseToUI,
  dbModuleToUI,
  dbLessonToUI,
  dbExamSettingsToUI,
  dbQuestionToUI,
} from "@/lib/courses-store";
import { toast } from "sonner";

interface CourseSummaryItem {
  id: string;
  title: string;
  language: CourseLanguage;
  status: string;
  moduleCount: number;
  lessonCount: number;
}

function fullCourseToUI(full: FullCourse): Course {
  const course = dbCourseToUI(full.course);
  course.modules = full.modules.map(({ module, lessons, exam, questions }) => {
    const mod = dbModuleToUI(module);
    mod.lessons = lessons.map(dbLessonToUI);
    if (exam) {
      const examUI = dbExamSettingsToUI(exam);
      examUI.questions = questions.map(dbQuestionToUI);
      mod.exam = examUI;
    }
    return mod;
  });
  return course;
}

interface CourseTranslationStatusViewProps {
  onOpenStudioCourse?: (courseId: string) => void;
}

export function CourseTranslationStatusView({ onOpenStudioCourse }: CourseTranslationStatusViewProps) {
  const [courses, setCourses] = useState<CourseSummaryItem[]>([]);
  const [jobs, setJobs] = useState<TranslationJobRecord[]>([]);
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "running" | "completed" | "failed">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick start full course translation modal state
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [sourceLang, setSourceLang] = useState<"English" | "French" | "Kinyarwanda">("English");
  const [targetLang, setTargetLang] = useState<"English" | "French" | "Kinyarwanda">("French");
  const [startingJob, setStartingJob] = useState(false);
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);

  const reloadCourses = async () => {
    try {
      const supabase = createClient();
      const { data: coursesData } = await supabase
        .from("course_languages")
        .select("*")
        .in("language", ["English", "Kinyarwanda", "French"])
        .is("deleted_at", null)
        .order("order_index", { ascending: true });

      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("id, language_id, lessons:course_lessons(id, deleted_at)")
        .is("deleted_at", null);

      const lessonCounts = new Map<string, number>();
      const moduleCounts = new Map<string, number>();
      for (const mod of modulesData || []) {
        moduleCounts.set(mod.language_id, (moduleCounts.get(mod.language_id) || 0) + 1);
        const lessonData = (mod as { lessons?: { id: string; deleted_at: string | null }[] }).lessons;
        const activeLessons = (lessonData || []).filter((l) => !l.deleted_at);
        lessonCounts.set(mod.language_id, (lessonCounts.get(mod.language_id) || 0) + activeLessons.length);
      }

      const enriched: CourseSummaryItem[] = (coursesData || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        language: c.language as CourseLanguage,
        status: c.status || (c.is_published ? "published" : "draft"),
        moduleCount: moduleCounts.get(c.id) || 0,
        lessonCount: lessonCounts.get(c.id) || 0,
      }));
      setCourses(enriched);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    reloadCourses();
    const unsub = translationQueue.subscribe((updatedJobs) => {
      setJobs(updatedJobs);
      // Automatically expand any running jobs
      setExpandedJobIds((prev) => {
        const next = new Set(prev);
        for (const j of updatedJobs) {
          if (j.status === "running") next.add(j.id);
        }
        return next;
      });
    });
    return unsub;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([translationQueue.syncFromServer(), reloadCourses()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const getLanguageFlag = (lang: string) => {
    if (lang === "English") return "🇬🇧";
    if (lang === "French") return "🇫🇷";
    if (lang === "Kinyarwanda") return "🇷🇼";
    return "🌐";
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === "French") return "Français";
    if (lang === "Kinyarwanda") return "Kinyarwanda";
    return "English";
  };

  const formatDuration = (ms?: number) => {
    if (!ms || ms < 0) return "0s";
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const handleStartCourseTranslation = async () => {
    if (sourceLang === targetLang) {
      toast.error("Source and target languages must be different.");
      return;
    }

    const srcSummary = courses.find((c) => c.language === sourceLang);
    const tgtSummary = courses.find((c) => c.language === targetLang);

    if (!srcSummary || !tgtSummary) {
      toast.error("Could not find source or target course.");
      return;
    }

    setStartingJob(true);
    try {
      const fullRes = await loadFullCourse(srcSummary.id);
      if (!fullRes.success) {
        throw new Error(fullRes.error || "Failed to load full source course structure.");
      }
      const fullSourceCourse = fullCourseToUI(fullRes.data);

      translationQueue.startTranslationJob({
        type: "course",
        sourceCourse: fullSourceCourse,
        targetCourse: {
          ...fullSourceCourse,
          id: tgtSummary.id,
          title: tgtSummary.title,
          language: tgtSummary.language,
        },
        targetLang,
        onReloadCourses: () => reloadCourses(),
      });

      setShowNewJobModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to start background translation");
    } finally {
      setStartingJob(false);
    }
  };

  const handleResumeJob = async (job: TranslationJobRecord) => {
    const srcSummary =
      courses.find((c) => c.id === job.sourceCourseId) ||
      courses.find((c) => c.language === job.sourceLang);
    const tgtSummary =
      courses.find((c) => c.id === job.targetCourseId) ||
      courses.find((c) => c.language === job.targetLang);

    if (!srcSummary || !tgtSummary) {
      toast.error("Could not find source or target course to resume.");
      return;
    }

    setResumingJobId(job.id);
    try {
      const fullRes = await loadFullCourse(srcSummary.id);
      if (!fullRes.success) {
        throw new Error(fullRes.error || "Failed to load full source course structure.");
      }
      const fullSourceCourse = fullCourseToUI(fullRes.data);

      translationQueue.resumeTranslationJob(job.id, {
        sourceCourse: fullSourceCourse,
        targetCourse: {
          ...fullSourceCourse,
          id: tgtSummary.id,
          title: tgtSummary.title,
          language: tgtSummary.language,
        },
        onReloadCourses: () => reloadCourses(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to resume translation job");
    } finally {
      setResumingJobId(null);
    }
  };

  const runningCount = jobs.filter((j) => j.status === "running").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed" || j.status === "cancelled").length;
  const totalTopicsTranslated = jobs.reduce((acc, j) => acc + (j.stats?.topicsTranslated || 0), 0);

  const filteredJobs = jobs.filter((j) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "running") return j.status === "running";
    if (filterStatus === "completed") return j.status === "completed";
    if (filterStatus === "failed") return j.status === "failed" || j.status === "cancelled";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="admin-card !rounded-xl p-4 sm:p-6 border border-[var(--admin-border)] bg-[var(--admin-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] flex items-center justify-center shrink-0">
              <Languages className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--admin-text)] flex items-center gap-2">
                <span>Background Translation Center &amp; Detailed Reports</span>
                {runningCount > 0 && (
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse text-xs">
                    {runningCount} Active
                  </Badge>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--admin-muted)]">
                All course, module, lesson, and topic translations run asynchronously in the background with step-by-step audit reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {jobs.some((j) => j.status !== "running") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => translationQueue.clearCompletedJobs()}
              className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => setShowNewJobModal(true)}
            className="h-9 text-xs gap-1.5 bg-[var(--admin-primary)] text-white hover:brightness-110"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>New Course Translation</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="admin-card !rounded-xl p-4 border border-[var(--admin-border)] bg-[var(--admin-card)] flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
            <Loader2 className={`h-5 w-5 ${runningCount > 0 ? "animate-spin" : ""}`} />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)] font-medium">Running in Background</p>
            <p className="text-xl font-bold text-[var(--admin-text)]">{runningCount}</p>
          </div>
        </div>

        <div className="admin-card !rounded-xl p-4 border border-[var(--admin-border)] bg-[var(--admin-card)] flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)] font-medium">Completed Jobs</p>
            <p className="text-xl font-bold text-[var(--admin-text)]">{completedCount}</p>
          </div>
        </div>

        <div className="admin-card !rounded-xl p-4 border border-[var(--admin-border)] bg-[var(--admin-card)] flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)] font-medium">Topics Translated</p>
            <p className="text-xl font-bold text-[var(--admin-text)]">{totalTopicsTranslated}</p>
          </div>
        </div>

        <div className="admin-card !rounded-xl p-4 border border-[var(--admin-border)] bg-[var(--admin-card)] flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-[var(--admin-muted)] font-medium">Failed / Cancelled</p>
            <p className="text-xl font-bold text-[var(--admin-text)]">{failedCount}</p>
          </div>
        </div>
      </div>

      {/* Course Language Coverage Matrix */}
      {courses.length > 0 && (
        <div className="admin-card !rounded-xl p-4 sm:p-5 border border-[var(--admin-border)] bg-[var(--admin-card)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-[var(--admin-primary)]" />
              <span>Multilingual Course Coverage Overview</span>
            </h3>
            <span className="text-xs text-[var(--admin-muted)]">Real-time structure across languages</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]/40 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getLanguageFlag(c.language)}</span>
                    <div>
                      <p className="text-sm font-bold text-[var(--admin-text)]">{c.title}</p>
                      <p className="text-[11px] text-[var(--admin-muted)]">{getLanguageLabel(c.language)}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.status === "published"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--admin-border)]/60">
                  <div className="flex items-center gap-3 text-[var(--admin-muted)]">
                    <span>
                      <strong className="text-[var(--admin-text)]">{c.moduleCount}</strong> Modules
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-[var(--admin-text)]">{c.lessonCount}</strong> Lessons
                    </span>
                  </div>
                  {onOpenStudioCourse && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioCourse(c.id)}
                      className="text-xs font-semibold text-[var(--admin-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open in Studio</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--admin-card)] p-1 rounded-xl border border-[var(--admin-border)]">
          {(
            [
              { id: "all", label: `All Reports (${jobs.length})` },
              { id: "running", label: `Running (${runningCount})` },
              { id: "completed", label: `Completed (${completedCount})` },
              { id: "failed", label: `Failed / Cancelled (${failedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === tab.id
                  ? "bg-[var(--admin-primary)] text-white shadow-xs"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Job Reports List */}
      {filteredJobs.length === 0 ? (
        <div className="admin-card !rounded-xl p-12 border border-[var(--admin-border)] bg-[var(--admin-card)] text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex items-center justify-center mx-auto">
            <Languages className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--admin-text)]">No Translation Activity Yet</h3>
          <p className="text-xs text-[var(--admin-muted)] max-w-md mx-auto">
            Start a translation from Course Studio (Whole Course, Module, Lesson, or Topic) or click &ldquo;New Course Translation&rdquo; above. All tasks run in the background and report detailed progress here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJobIds.has(job.id);
            const isRunning = job.status === "running";
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed";
            const isCancelled = job.status === "cancelled";

            const TypeIcon =
              job.type === "course"
                ? Globe2
                : job.type === "module"
                ? FolderOpen
                : job.type === "lesson"
                ? FileText
                : FileCode2;

            return (
              <div
                key={job.id}
                className="admin-card !rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] overflow-hidden transition-all"
              >
                {/* Job Header Summary */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(job.id)}
                        className="mt-0.5 p-1.5 rounded-lg bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:border-[var(--admin-primary)] transition-colors shrink-0"
                        title={isExpanded ? "Collapse Detailed Report" : "Expand Detailed Report"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[var(--admin-primary)]/15 text-[var(--admin-primary)]">
                            <TypeIcon className="h-3 w-3" />
                            <span>{job.type}</span>
                          </span>

                          <h4 className="text-sm sm:text-base font-bold text-[var(--admin-text)] break-words">
                            {job.scopeTitle}
                          </h4>

                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                            <span>{getLanguageFlag(job.sourceLang)}</span>
                            <span>{getLanguageLabel(job.sourceLang)}</span>
                            <ArrowRight className="h-3 w-3 text-[var(--admin-muted)] mx-0.5" />
                            <span>{getLanguageFlag(job.targetLang)}</span>
                            <span>{getLanguageLabel(job.targetLang)}</span>
                          </span>
                        </div>

                        {/* Breadcrumb context if module/lesson/topic */}
                        {(job.moduleTitle || job.lessonTitle) && (
                          <p className="text-xs text-[var(--admin-muted)]">
                            {job.moduleTitle && <span>Module: <strong>{job.moduleTitle}</strong></span>}
                            {job.moduleTitle && job.lessonTitle && <span> • </span>}
                            {job.lessonTitle && <span>Lesson: <strong>{job.lessonTitle}</strong></span>}
                          </p>
                        )}

                        <p className="text-xs text-[var(--admin-muted)] flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {new Date(job.startedAt).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>Duration: <strong>{formatDuration(job.durationMs)}</strong></span>
                          {job.initiatedBy && (
                            <>
                              <span>•</span>
                              <span>By: {job.initiatedBy}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isRunning && (
                        <>
                          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1.5 py-1 px-2.5 text-xs">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>In Progress ({job.progressPercent}%)</span>
                          </Badge>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => translationQueue.cancelJob(job.id)}
                            className="h-8 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                          >
                            <Square className="h-3 w-3 fill-current" />
                            <span>Stop</span>
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completed (100%)</span>
                        </Badge>
                      )}

                      {isFailed && (
                        <>
                          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1.5 py-1 px-2.5 text-xs">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Failed</span>
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            disabled={resumingJobId === job.id}
                            onClick={() => handleResumeJob(job)}
                            className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 px-3 shadow-xs"
                          >
                            {resumingJobId === job.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            <span>Continue</span>
                          </Button>
                        </>
                      )}

                      {isCancelled && (
                        <>
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30 gap-1.5 py-1 px-2.5 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Cancelled</span>
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            disabled={resumingJobId === job.id}
                            onClick={() => handleResumeJob(job)}
                            className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 px-3 shadow-xs"
                          >
                            {resumingJobId === job.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            )}
                            <span>Continue</span>
                          </Button>
                        </>
                      )}

                      {!isRunning && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => translationQueue.deleteJob(job.id)}
                          className="h-8 w-8 p-0 text-[var(--admin-muted)] hover:text-rose-500"
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Live Activity Message */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--admin-text)] truncate max-w-2xl">
                        {job.currentStepMessage}
                      </span>
                      <span className="text-[var(--admin-muted)] font-mono shrink-0">
                        {job.completedSteps} / {job.totalSteps} steps ({job.progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--admin-input-bg)] overflow-hidden border border-[var(--admin-border)]/50">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isFailed
                            ? "bg-rose-500"
                            : isCancelled
                            ? "bg-amber-500"
                            : isCompleted
                            ? "bg-emerald-500"
                            : "bg-[var(--admin-primary)]"
                        }`}
                        style={{ width: `${Math.max(2, job.progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini Stats Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[var(--admin-muted)]">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Modules: <strong className="text-[var(--admin-text)]">{job.stats?.modulesTranslated || 0}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Lessons: <strong className="text-[var(--admin-text)]">{job.stats?.lessonsTranslated || 0}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Topics: <strong className="text-[var(--admin-text)]">{job.stats?.topicsTranslated || 0}</strong>
                      </span>
                      {(job.stats?.failedItems || 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-500 font-semibold">
                            Failed Items: {job.stats.failedItems}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {job.targetCourseId && onOpenStudioCourse && (
                        <button
                          type="button"
                          onClick={() => onOpenStudioCourse(job.targetCourseId!)}
                          className="text-xs font-semibold text-[var(--admin-primary)] hover:underline inline-flex items-center gap-1"
                        >
                          <span>Open Translated Course</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpand(job.id)}
                        className="text-xs font-semibold text-[var(--admin-text)] hover:text-[var(--admin-primary)] inline-flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Hide Detailed Report" : `View Full Report (${job.steps?.length || 0} items)`}</span>
                      </button>
                    </div>
                  </div>

                  {job.error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Failure Reason: </span>
                        <span>{job.error}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Step-by-Step Detailed Report */}
                {isExpanded && (
                  <div className="border-t border-[var(--admin-border)] bg-[var(--admin-input-bg)]/30 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                        Detailed Step-by-Step Translation Log ({job.steps?.length || 0} entries)
                      </h5>
                      <span className="text-[11px] text-[var(--admin-muted)]">
                        In-place updates • Zero duplication
                      </span>
                    </div>

                    {!job.steps || job.steps.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--admin-muted)]">
                        {isRunning
                          ? "First item is currently being translated by AI..."
                          : "No detailed step logs recorded for this job."}
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] divide-y divide-[var(--admin-border)]/60">
                        {job.steps.map((step, sIdx) => (
                          <div
                            key={step.id || sIdx}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[var(--admin-hover-bg)]/40 transition-colors"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              {step.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : step.status === "failed" ? (
                                <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                              ) : (
                                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0 mt-0.5" />
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">
                                    {step.itemType}
                                  </Badge>
                                  <span className="font-semibold text-[var(--admin-text)] break-words">
                                    {step.sourceTitle}
                                  </span>
                                  {step.translatedTitle && (
                                    <>
                                      <ArrowRight className="h-3 w-3 text-[var(--admin-muted)] shrink-0" />
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 break-words">
                                        {step.translatedTitle}
                                      </span>
                                    </>
                                  )}
                                </div>

                                {(step.moduleTitle || step.lessonTitle) && (
                                  <p className="text-[11px] text-[var(--admin-muted)]">
                                    {step.moduleTitle && <span>Module: {step.moduleTitle}</span>}
                                    {step.moduleTitle && step.lessonTitle && <span> › </span>}
                                    {step.lessonTitle && <span>Lesson: {step.lessonTitle}</span>}
                                  </p>
                                )}

                                {step.error && (
                                  <p className="text-[11px] text-rose-500 font-medium">{step.error}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[var(--admin-muted)] shrink-0 self-end sm:self-center">
                              {step.durationMs !== undefined && (
                                <span className="font-mono">{formatDuration(step.durationMs)}</span>
                              )}
                              <span>
                                {new Date(step.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to Start a New Full Course Background Translation */}
      <Dialog open={showNewJobModal} onOpenChange={setShowNewJobModal}>
        <DialogContent className="max-w-md bg-[var(--admin-card)] border-[var(--admin-border)] text-[var(--admin-text)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="h-4 w-4 text-[var(--admin-primary)]" />
              <span>Start Background Course Translation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--admin-muted)]">
              Translate all modules, lessons, and topics from one course language to another in the background.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold block mb-1.5">Source Course Language</label>
              <div className="grid grid-cols-3 gap-2">
                {(["English", "French", "Kinyarwanda"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setSourceLang(lang);
                      if (targetLang === lang) {
                        setTargetLang(lang === "English" ? "French" : "English");
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      sourceLang === lang
                        ? "bg-[var(--admin-primary)]/15 border-[var(--admin-primary)] text-[var(--admin-primary)]"
                        : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)]"
                    }`}
                  >
                    <span>{getLanguageFlag(lang)}</span>
                    <span>{getLanguageLabel(lang)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5">Target Course Language</label>
              <div className="grid grid-cols-3 gap-2">
                {(["English", "French", "Kinyarwanda"] as const).map((lang) => {
                  const disabled = lang === sourceLang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTargetLang(lang)}
                      className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        disabled
                          ? "opacity-35 cursor-not-allowed bg-[var(--admin-input-bg)] border-[var(--admin-border)]"
                          : targetLang === lang
                          ? "bg-[var(--admin-primary)]/15 border-[var(--admin-primary)] text-[var(--admin-primary)]"
                          : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)]"
                      }`}
                    >
                      <span>{getLanguageFlag(lang)}</span>
                      <span>{getLanguageLabel(lang)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewJobModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={startingJob || sourceLang === targetLang}
              onClick={handleStartCourseTranslation}
              className="text-xs bg-[var(--admin-primary)] text-white hover:brightness-110 gap-1.5"
            >
              {startingJob ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Background Translation</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
