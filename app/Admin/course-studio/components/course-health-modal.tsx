"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-context";
import { Selection } from "./course-tree";
import { Course, extractTextFromTiptapJSON } from "@/lib/courses-store";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Layers,
  FileText,
  ClipboardList,
  Volume2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface HealthIssue {
  id: string;
  severity: "error" | "warning" | "suggestion";
  category: "module" | "lesson" | "topic" | "exam" | "question";
  title: string;
  description: string;
  targetSelection: Selection;
  actionLabel?: string;
}

interface CourseHealthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | undefined;
  onSelect: (selection: Selection) => void;
}

export function CourseHealthModal({
  open,
  onOpenChange,
  course,
  onSelect,
}: CourseHealthModalProps) {
  const { t } = useLanguage();
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning" | "suggestion">("all");
  const [copied, setCopied] = useState(false);

  const { issues, stats, score } = useMemo(() => {
    if (!course) {
      return { issues: [], stats: { modules: 0, lessons: 0, topics: 0, questions: 0, audioCoverage: 0, totalReadingMinutes: 0 }, score: 100 };
    }

    const items: HealthIssue[] = [];
    let totalModules = course.modules.length;
    let totalLessons = 0;
    let totalTopics = 0;
    let totalQuestions = 0;
    let topicsWithAudio = 0;
    let totalEstimatedMinutes = 0;

    if (totalModules === 0) {
      items.push({
        id: "course-no-modules",
        severity: "error",
        category: "module",
        title: t("noModulesAdded") || "Course has no modules",
        description: t("noModulesAddedDesc") || "Add at least one module to build the learning path.",
        targetSelection: { type: "course" },
        actionLabel: t("addModule") || "Add Module",
      });
    }

    course.modules.forEach((mod, mIdx) => {
      totalLessons += mod.lessons.length;

      if (mod.lessons.length === 0) {
        items.push({
          id: `mod-no-lessons-${mod.id}`,
          severity: "error",
          category: "module",
          title: `${mod.title || `${t("module") || "Module"} ${mIdx + 1}`}: ${t("noLessonsInModule") || "No lessons in module"}`,
          description: t("noLessonsInModuleDesc") || "This module has no lessons for students to learn from.",
          targetSelection: { type: "module", moduleId: mod.id },
          actionLabel: t("viewModule") || "View Module",
        });
      }

      // Check exam
      if (!mod.exam) {
        items.push({
          id: `mod-no-exam-${mod.id}`,
          severity: "suggestion",
          category: "exam",
          title: `${mod.title || `${t("module") || "Module"} ${mIdx + 1}`}: ${t("noExamInModule") || "No quiz or exam configured"}`,
          description: t("noExamInModuleDesc") || "Adding a module exam helps students test their knowledge.",
          targetSelection: { type: "module", moduleId: mod.id },
          actionLabel: t("addExam") || "Add Exam",
        });
      } else {
        const qCount = mod.exam.questions.length;
        totalQuestions += qCount;

        if (qCount === 0) {
          items.push({
            id: `exam-no-q-${mod.exam.id}`,
            severity: "error",
            category: "exam",
            title: `${mod.exam.title || t("moduleExam") || "Module Exam"}: ${t("noQuestionsInExam") || "Exam has 0 questions"}`,
            description: t("noQuestionsInExamDesc") || "Add multiple choice, true/false, or matching questions to this exam.",
            targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam.id },
            actionLabel: t("editExam") || "Edit Exam",
          });
        } else if (qCount < 5) {
          items.push({
            id: `exam-few-q-${mod.exam.id}`,
            severity: "warning",
            category: "exam",
            title: `${mod.exam.title || t("moduleExam") || "Module Exam"}: ${t("fewQuestionsInExam") || "Exam has fewer than 5 questions"}`,
            description: t("fewQuestionsInExamDesc") || "We recommend at least 5-10 questions for a comprehensive module assessment.",
            targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam.id },
            actionLabel: t("addQuestions") || "Add Questions",
          });
        }

        // Check individual questions
        mod.exam.questions.forEach((q, qIdx) => {
          const qText = extractTextFromTiptapJSON(q.text).trim();
          if (!qText) {
            items.push({
              id: `q-empty-text-${q.id}`,
              severity: "error",
              category: "question",
              title: `${mod.exam?.title}: ${t("question") || "Question"} ${qIdx + 1} ${t("emptyText") || "has empty text"}`,
              description: t("emptyQuestionTextDesc") || "Please write the question text prompt.",
              targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam!.id },
              actionLabel: t("fixQuestion") || "Fix Question",
            });
          }

          if (q.type === "multiple_choice" || q.type === "true_false") {
            const hasCorrect = q.options.some((opt) => opt.id === q.correctOptionId);
            if (!hasCorrect || !q.correctOptionId) {
              items.push({
                id: `q-no-correct-${q.id}`,
                severity: "error",
                category: "question",
                title: `${mod.exam?.title}: ${t("question") || "Question"} ${qIdx + 1} ${t("noCorrectAnswer") || "missing correct answer"}`,
                description: t("noCorrectAnswerDesc") || "Mark at least one option as the correct answer.",
                targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam!.id },
                actionLabel: t("setCorrect") || "Set Correct",
              });
            }
          }

          if (q.type === "multiple_select") {
            if (!q.correctOptionIds || q.correctOptionIds.length === 0) {
              items.push({
                id: `q-multisel-none-${q.id}`,
                severity: "error",
                category: "question",
                title: `${mod.exam?.title}: ${t("question") || "Question"} ${qIdx + 1} ${t("noOptionsSelected") || "has no correct options marked"}`,
                description: t("noOptionsSelectedDesc") || "Multiple-select questions must have at least one correct option.",
                targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam!.id },
                actionLabel: t("fixSelection") || "Fix Selection",
              });
            }
          }

          if (q.type === "matching") {
            if (!q.matchingPairs || q.matchingPairs.length < 2) {
              items.push({
                id: `q-matching-few-${q.id}`,
                severity: "warning",
                category: "question",
                title: `${mod.exam?.title}: ${t("question") || "Question"} ${qIdx + 1} ${t("fewMatchingPairs") || "has fewer than 2 pairs"}`,
                description: t("fewMatchingPairsDesc") || "Matching questions need at least 2 complete pairs.",
                targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam!.id },
                actionLabel: t("editPairs") || "Edit Pairs",
              });
            }
          }

          // Missing explanation suggestion
          const expl = extractTextFromTiptapJSON(q.explanation).trim();
          if (!expl) {
            items.push({
              id: `q-no-expl-${q.id}`,
              severity: "suggestion",
              category: "question",
              title: `${mod.exam?.title}: ${t("question") || "Question"} ${qIdx + 1} ${t("missingExplanation") || "has no answer explanation"}`,
              description: t("missingExplanationDesc") || "Providing explanations helps students understand their mistakes.",
              targetSelection: { type: "exam", moduleId: mod.id, examId: mod.exam!.id },
              actionLabel: t("addExplanation") || "Add Explanation",
            });
          }
        });
      }

      // Check lessons and topics
      mod.lessons.forEach((lesson, lIdx) => {
        const topics = lesson.topics || [];
        totalTopics += topics.length;

        if (topics.length === 0) {
          const hasLegacyContent = extractTextFromTiptapJSON(lesson.content).trim().length > 0;
          if (!hasLegacyContent) {
            items.push({
              id: `lesson-empty-${lesson.id}`,
              severity: "error",
              category: "lesson",
              title: `${lesson.title || `${t("lesson") || "Lesson"} ${lIdx + 1}`}: ${t("lessonEmpty") || "Lesson is empty"}`,
              description: t("lessonEmptyDesc") || "This lesson has no topics and no written content.",
              targetSelection: { type: "lesson", moduleId: mod.id, lessonId: lesson.id },
              actionLabel: t("addTopics") || "Add Topics",
            });
          }
        }

        topics.forEach((topic, tpIdx) => {
          totalEstimatedMinutes += topic.estimated_minutes || 3;
          if (topic.audioUrl) {
            topicsWithAudio++;
          } else {
            items.push({
              id: `topic-no-audio-${topic.id}`,
              severity: "suggestion",
              category: "topic",
              title: `${lesson.title} > ${topic.title || `${t("topic") || "Topic"} ${tpIdx + 1}`}: ${t("noAudioAttached") || "No TTS audio narration"}`,
              description: t("noAudioAttachedDesc") || "Attaching audio narration improves accessibility and student engagement.",
              targetSelection: { type: "topic", moduleId: mod.id, lessonId: lesson.id, topicId: topic.id },
              actionLabel: t("attachAudio") || "Attach Audio",
            });
          }

          const tpText = extractTextFromTiptapJSON(topic.content).trim();
          if (!tpText) {
            items.push({
              id: `topic-empty-text-${topic.id}`,
              severity: "error",
              category: "topic",
              title: `${lesson.title} > ${topic.title || `${t("topic") || "Topic"} ${tpIdx + 1}`}: ${t("topicContentEmpty") || "Topic has no content"}`,
              description: t("topicContentEmptyDesc") || "Write content or add lesson materials for this topic.",
              targetSelection: { type: "topic", moduleId: mod.id, lessonId: lesson.id, topicId: topic.id },
              actionLabel: t("writeContent") || "Write Content",
            });
          }
        });
      });
    });

    const errorCount = items.filter((i) => i.severity === "error").length;
    const warningCount = items.filter((i) => i.severity === "warning").length;
    const suggestionCount = items.filter((i) => i.severity === "suggestion").length;

    // Calculate score (0-100)
    let calculatedScore = 100 - errorCount * 15 - warningCount * 5 - suggestionCount * 1;
    if (calculatedScore < 0) calculatedScore = 0;
    if (totalModules === 0) calculatedScore = 0;

    const audioCoverage = totalTopics > 0 ? Math.round((topicsWithAudio / totalTopics) * 100) : 0;

    return {
      issues: items,
      stats: {
        modules: totalModules,
        lessons: totalLessons,
        topics: totalTopics,
        questions: totalQuestions,
        audioCoverage,
        totalReadingMinutes: totalEstimatedMinutes,
      },
      score: Math.max(0, Math.min(100, calculatedScore)),
    };
  }, [course, t]);

  const filteredIssues = useMemo(() => {
    if (filterSeverity === "all") return issues;
    return issues.filter((i) => i.severity === filterSeverity);
  }, [issues, filterSeverity]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const suggestionCount = issues.filter((i) => i.severity === "suggestion").length;

  const handleCopyReport = () => {
    if (!course) return;
    const lines = [
      `=== Course Health Audit: ${course.title} ===`,
      `Overall Score: ${score}%`,
      `Modules: ${stats.modules} | Lessons: ${stats.lessons} | Topics: ${stats.topics} | Questions: ${stats.questions}`,
      `Audio Coverage: ${stats.audioCoverage}% | Total Content Time: ~${stats.totalReadingMinutes} mins`,
      ``,
      `Issues Found (${issues.length}):`,
      ...issues.map((i) => `[${i.severity.toUpperCase()}] ${i.title} - ${i.description}`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success(t("auditReportCopied") || "Audit report copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (sc: number) => {
    if (sc >= 85) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
    if (sc >= 60) return "text-amber-500 bg-amber-500/10 border-amber-500/30";
    return "text-red-500 bg-red-500/10 border-red-500/30";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-[var(--admin-card)] border-[var(--admin-border)]">
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
                  {t("courseHealthCheck") || "Course Readiness & Quality Audit"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--admin-muted)]">
                  {course?.title}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyReport}
                className="h-8 text-xs gap-1.5 border-[var(--admin-border)]"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? (t("copied") || "Copied") : (t("copyReport") || "Copy Report")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Stats summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:p-4 bg-[var(--admin-hover-bg)]/40 border-b border-[var(--admin-border)] text-xs flex-shrink-0">
          {/* Score card */}
          <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-lg border flex flex-col items-center justify-center text-center ${getScoreColor(score)}`}>
            <span className="text-[10px] font-medium uppercase tracking-wider">{t("healthScore") || "Health Score"}</span>
            <span className="text-2xl font-black mt-0.5">{score}%</span>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] flex flex-col justify-center">
            <span className="text-[10px] text-[var(--admin-muted)] flex items-center gap-1">
              <Layers className="h-3 w-3" /> {t("structure") || "Structure"}
            </span>
            <span className="text-sm font-semibold text-[var(--admin-text)] mt-0.5">
              {stats.modules}m • {stats.lessons}l • {stats.topics}t
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] flex flex-col justify-center">
            <span className="text-[10px] text-[var(--admin-muted)] flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> {t("questions") || "Questions"}
            </span>
            <span className="text-sm font-semibold text-[var(--admin-text)] mt-0.5">
              {stats.questions} {t("items") || "items"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] flex flex-col justify-center">
            <span className="text-[10px] text-[var(--admin-muted)] flex items-center gap-1">
              <Volume2 className="h-3 w-3 text-emerald-500" /> {t("audioCoverage") || "Audio"}
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.audioCoverage}% {t("covered") || "narrated"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] flex flex-col justify-center">
            <span className="text-[10px] text-[var(--admin-muted)] flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" /> {t("estDuration") || "Est. Duration"}
            </span>
            <span className="text-sm font-semibold text-[var(--admin-text)] mt-0.5">
              ~{stats.totalReadingMinutes} {t("minutes") || "mins"}
            </span>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--admin-border)] text-xs flex-shrink-0 overflow-x-auto">
          <span className="text-[var(--admin-muted)] mr-1">{t("filter") || "Filter"}:</span>
          <button
            type="button"
            onClick={() => setFilterSeverity("all")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filterSeverity === "all"
                ? "bg-[var(--admin-primary)] text-white"
                : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            {t("all") || "All"} ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("error")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterSeverity === "error"
                ? "bg-red-600 text-white"
                : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
            }`}
          >
            <XCircle className="h-3 w-3" />
            {t("errors") || "Errors"} ({errorCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("warning")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterSeverity === "warning"
                ? "bg-amber-600 text-white"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {t("warnings") || "Warnings"} ({warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity("suggestion")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterSeverity === "suggestion"
                ? "bg-blue-600 text-white"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            {t("suggestions") || "Suggestions"} ({suggestionCount})
          </button>
        </div>

        {/* Issue list */}
        <ScrollArea className="flex-1 p-4 max-h-[50vh] overflow-y-auto">
          {filteredIssues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--admin-muted)]">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-[var(--admin-text)]">
                {issues.length === 0
                  ? t("coursePerfect") || "Everything looks great! No issues found."
                  : t("noIssuesInFilter") || "No issues found in this category."}
              </p>
              <p className="text-xs max-w-sm mt-1">
                {t("readyToPublishDesc") || "Your course structure, questions, and learning topics are well configured."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredIssues.map((issue) => {
                const isError = issue.severity === "error";
                const isWarning = issue.severity === "warning";

                return (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                      isError
                        ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                        : isWarning
                        ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                        : "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isError ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : isWarning ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[var(--admin-text)]">{issue.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0 ${
                            isError
                              ? "border-red-500/40 text-red-600 dark:text-red-400"
                              : isWarning
                              ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                              : "border-blue-500/40 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--admin-muted)] mt-1">{issue.description}</p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onSelect(issue.targetSelection);
                        onOpenChange(false);
                      }}
                      className="flex-shrink-0 h-7 text-xs px-2.5 gap-1 border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)]"
                    >
                      <span>{issue.actionLabel || t("fix") || "Fix"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
