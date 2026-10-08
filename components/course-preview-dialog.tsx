"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";
import { loadFullCourse, type FullCourse } from "@/app/Admin/actions/courses";
import type {
  CourseLanguageCourse,
  CourseModule,
  CourseLesson,
  ModuleExamSettings,
  ModuleExamQuestion,
} from "@/lib/database.types";
import {
  BookOpen,
  Layers,
  FileText,
  Clock,
  Globe,
  Lock,
  Trophy,
  Play,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertCircle,
  Music,
  FileDown,
  X,
  Volume2,
} from "lucide-react";

type PreviewType = "course" | "module" | "lesson";

type FullModule = FullCourse["modules"][number];
type FullLesson = FullModule["lessons"][number];

interface CoursePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PreviewType;
  course: CourseLanguageCourse;
  moduleId?: string;
  lessonId?: string;
}

interface LessonTopicUI {
  id: string;
  title: string;
  content: string;
  estimated_minutes?: number;
  audioUrl?: string;
  audio_url?: string;
}

interface RawTopicInput {
  id?: string;
  title?: string;
  content?: string;
  estimated_minutes?: number;
  audioUrl?: string;
  audio_url?: string;
}

function parseTopics(raw: unknown[] | undefined | null): LessonTopicUI[] {
  if (!Array.isArray(raw)) {
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parseTopics(parsed);
      } catch {}
    }
    return [];
  }
  return raw.map((t) => {
    if (typeof t === "string") {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === "object") {
          return {
            id: parsed.id || crypto.randomUUID(),
            title: parsed.title || "",
            content: typeof parsed.content === "object" ? JSON.stringify(parsed.content) : (parsed.content || ""),
            estimated_minutes: parsed.estimated_minutes || 0,
            audioUrl: parsed.audioUrl || parsed.audio_url || undefined,
          };
        }
      } catch {}
      return { id: crypto.randomUUID(), title: t, content: "" };
    }
    const topic = t as RawTopicInput;
    const content = typeof topic.content === "object"
      ? JSON.stringify(topic.content)
      : (topic.content || "");
    return {
      id: topic.id || crypto.randomUUID(),
      title: topic.title || "",
      content: content,
      estimated_minutes: topic.estimated_minutes || 0,
      audioUrl: topic.audioUrl || topic.audio_url || undefined,
    };
  });
}

function lessonTime(lesson: CourseLesson): number {
  const topics = parseTopics(lesson.topics);
  const topicTime = topics.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const lessonReadTime = lesson.content?.trim() ? lesson.estimated_reading_minutes || 0 : 0;
  if (topics.length > 0) {
    return topicTime + lessonReadTime;
  }
  return lesson.estimated_reading_minutes || 0;
}

function moduleTime(module: FullModule): number {
  return module.lessons.reduce((sum, l) => sum + lessonTime(l), 0);
}

function courseTime(course: FullCourse): number {
  return course.modules.reduce((sum, m) => sum + moduleTime(m), 0);
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function statusLabel(status: string, t: (key: string) => string): string {
  if (status === "published") return t("published") || "Published";
  if (status === "draft") return t("draft") || "Draft";
  if (status === "archived") return t("archived") || "Archived";
  return status;
}

function languageLabel(lang: string): string {
  if (lang === "Kinyarwanda") return "Kinyarwanda";
  if (lang === "French") return "Français";
  return "English";
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function MediaPreview({ lesson }: { lesson: CourseLesson }) {
  const { image_url, audio_url, media_url, content_type } = lesson;

  if (image_url) {
    return (
      <div className="space-y-2">
        <img
          src={image_url}
          alt={lesson.title}
          className="rounded-[14px] max-h-64 w-auto object-contain border border-[var(--admin-border)] bg-[var(--admin-input-bg)]"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  if (audio_url || (media_url && content_type === "audio")) {
    const src = audio_url || media_url;
    return (
      <div className="flex items-center gap-3 rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-hover-bg)] p-3">
        <Music className="h-5 w-5 text-[var(--admin-primary)]" />
        <audio controls src={src} className="flex-1" />
      </div>
    );
  }

  if (media_url) {
    if (isYouTubeUrl(media_url)) {
      const embedUrl = getYouTubeEmbedUrl(media_url);
      if (embedUrl) {
        return (
          <div className="aspect-video rounded-[14px] overflow-hidden border border-[var(--admin-border)] bg-black">
            <iframe
              src={embedUrl}
              title="Video preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      }
    }

    if (content_type === "video") {
      return (
        <div className="aspect-video rounded-[14px] overflow-hidden border border-[var(--admin-border)] bg-black">
          <video controls src={media_url} className="w-full h-full" />
        </div>
      );
    }
  }

  return null;
}

function QuestionPreview({
  question,
  index,
}: {
  question: ModuleExamQuestion;
  index: number;
}) {
  const options = [
    { key: "A", label: question.option_a, image: question.option_a_image },
    { key: "B", label: question.option_b, image: question.option_b_image },
    { key: "C", label: question.option_c, image: question.option_c_image },
    { key: "D", label: question.option_d, image: question.option_d_image },
  ].filter((o) => o.label?.trim() || o.image);

  const questionAudio = (question.metadata as { audio?: string } | undefined)?.audio;

  return (
    <div className="rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-[10px] font-semibold">
          {index + 1}
        </span>
        <div className="flex-1 space-y-2">
          {question.question && (
            <p className="text-sm font-medium text-[var(--admin-text)]">{question.question}</p>
          )}
          {question.question_image && (
            <img
              src={question.question_image}
              alt="Question"
              className="rounded-lg max-h-48 object-contain border border-[var(--admin-border)]"
            />
          )}
          {questionAudio && (
            <audio
              controls
              src={questionAudio}
              className="w-full h-10 rounded-lg mt-2"
            />
          )}
        </div>
      </div>

      <div className={cn("pl-7", options.some((o) => !!o.image) ? "grid grid-cols-2 gap-2" : "grid gap-2")}>
        {options.map((option) => {
          const isCorrect = question.correct_answer === option.key;
          return (
            <div
              key={option.key}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                isCorrect
                  ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                  : "border-[var(--admin-border)] bg-[var(--admin-hover-bg)] text-[var(--admin-text)]"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold flex-shrink-0",
                  isCorrect
                    ? "bg-green-500 text-white"
                    : "bg-[var(--admin-border)] text-[var(--admin-muted)]"
                )}
              >
                {option.key}
              </span>
              <div className="flex-1 space-y-2">
                {option.label && <span>{option.label}</span>}
                {option.image && (
                  <img
                    src={option.image}
                    alt={`Option ${option.key}`}
                    className="rounded-lg max-h-40 object-contain border border-[var(--admin-border)]"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {question.explanation && (
        <p className="pl-7 text-xs text-[var(--admin-muted)] italic">
          {question.explanation}
        </p>
      )}
    </div>
  );
}

export function CoursePreviewDialog({
  open,
  onOpenChange,
  type,
  course,
  moduleId,
  lessonId,
}: CoursePreviewDialogProps) {
  const { t } = useLanguage();
  const [fullCourse, setFullCourse] = useState<FullCourse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState(false);

  useEffect(() => {
    if (!open) {
      setFullCourse(null);
      setSelectedModuleId(null);
      setSelectedLessonId(null);
      setSelectedTopicId(null);
      setSelectedExam(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadFullCourse(course.id).then((result) => {
      if (cancelled) return;
      if (result.success) {
        if (result.data) {
          setFullCourse(result.data);
        } else {
          setError(t("failedToLoad") || "Failed to load preview");
        }
      } else {
        setError(result.error || t("failedToLoad") || "Failed to load preview");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, course.id, t]);

  useEffect(() => {
    if (!fullCourse) return;

    if (type === "lesson" && moduleId && lessonId) {
      const mod = fullCourse.modules.find((m) => m.module.id === moduleId);
      if (mod && mod.lessons.some((l) => l.id === lessonId)) {
        setSelectedModuleId(moduleId);
        setSelectedLessonId(lessonId);
        setSelectedTopicId(null);
        setSelectedExam(false);
        return;
      }
    }

    if (type === "module" && moduleId) {
      const mod = fullCourse.modules.find((m) => m.module.id === moduleId);
      if (mod) {
        setSelectedModuleId(moduleId);
        setSelectedLessonId(null);
        setSelectedTopicId(null);
        setSelectedExam(false);
        return;
      }
    }

    // Course preview starts at the course overview
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    setSelectedTopicId(null);
    setSelectedExam(false);
  }, [fullCourse, type, moduleId, lessonId]);

  const selectedModule = useMemo(
    () => fullCourse?.modules.find((m) => m.module.id === selectedModuleId) || null,
    [fullCourse, selectedModuleId]
  );

  const selectedLesson = useMemo(
    () => selectedModule?.lessons.find((l) => l.id === selectedLessonId) || null,
    [selectedModule, selectedLessonId]
  );

  const selectedTopic = useMemo(() => {
    if (!selectedLesson) return null;
    return parseTopics(selectedLesson.topics).find((tp) => tp.id === selectedTopicId) || null;
  }, [selectedLesson, selectedTopicId]);

  const totalLessons = useMemo(
    () => fullCourse?.modules.reduce((sum, m) => sum + m.lessons.length, 0) || 0,
    [fullCourse]
  );

  const handleSelectModule = (id: string) => {
    setSelectedModuleId(id);
    setSelectedLessonId(null);
    setSelectedTopicId(null);
    setSelectedExam(false);
  };

  const handleSelectLesson = (id: string) => {
    setSelectedLessonId(id);
    setSelectedTopicId(null);
    setSelectedExam(false);
  };

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setSelectedExam(false);
  };

  const handleSelectExam = () => {
    setSelectedExam(true);
    setSelectedLessonId(null);
    setSelectedTopicId(null);
  };

  const renderStatusBadge = (status: string) => {
    const isPublished = status === "published";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
          isPublished
            ? "bg-green-500/15 text-green-600 dark:text-green-400"
            : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"
        )}
      >
        {isPublished ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
        {statusLabel(status, t)}
      </span>
    );
  };

  const renderSidebar = () => {
    if (!fullCourse) return null;

    return (
      <div className="flex flex-col h-full w-full overflow-hidden border-r border-border/80 bg-muted/20 dark:bg-zinc-900/60">
        <div className="px-4 py-3.5 border-b border-border/80 bg-background/60 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedModuleId(null);
              setSelectedLessonId(null);
              setSelectedTopicId(null);
              setSelectedExam(false);
            }}
            className="w-full text-left group"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
              {t("courseContent") || "Course Curriculum"}
            </div>
            <div className="text-sm font-semibold text-foreground truncate mt-0.5">
              {course.title}
            </div>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5">
          {fullCourse.modules.map((mod, modIdx) => {
            const isModSelected = selectedModuleId === mod.module.id;
            return (
              <div key={mod.module.id} className="rounded-xl border border-transparent">
                <button
                  type="button"
                  onClick={() => handleSelectModule(mod.module.id)}
                  title={`${t("module") || "Module"} ${modIdx + 1}: ${mod.module.title}`}
                  className={cn(
                    "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all",
                    isModSelected
                      ? "bg-primary/15 text-primary font-semibold border border-primary/30 shadow-xs"
                      : "text-foreground/90 hover:bg-muted/70"
                  )}
                >
                  <Layers className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                  <span className="flex-1 min-w-0 break-words line-clamp-2 leading-snug">
                    {t("module") || "Module"} {modIdx + 1}: {mod.module.title}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 mt-0.5 transition-transform duration-200",
                      isModSelected ? "rotate-90 text-primary" : "text-muted-foreground"
                    )}
                  />
                </button>

                {isModSelected && (
                  <div className="ml-3.5 pl-3 border-l-2 border-border/70 space-y-1 mt-1.5 mb-2">
                    {mod.lessons.map((lesson) => {
                      const isLessonSelected = selectedLessonId === lesson.id;
                      return (
                        <div key={lesson.id} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSelectLesson(lesson.id)}
                            title={lesson.title}
                            className={cn(
                              "w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all",
                              isLessonSelected && !selectedTopicId
                                ? "bg-primary/12 text-foreground font-semibold border border-primary/25"
                                : isLessonSelected
                                ? "text-foreground font-medium bg-muted/40"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary/80" />
                            <span className="flex-1 min-w-0 break-words line-clamp-2 leading-snug">
                              {lesson.title}
                            </span>
                          </button>

                          {isLessonSelected && (
                            <div className="ml-3 pl-2.5 border-l border-border/60 space-y-1 py-0.5">
                              {(() => {
                                const topics = parseTopics(lesson.topics);
                                if (topics.length === 0) return null;
                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTopicId(null)}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] text-left transition-all",
                                        !selectedTopicId
                                          ? "bg-primary/15 text-foreground font-semibold border border-primary/30"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                      )}
                                    >
                                      <BookOpen className="h-3 w-3 flex-shrink-0 text-primary" />
                                      <span className="flex-1 min-w-0 truncate">
                                        {t("introduction") || "Introduction"}
                                      </span>
                                    </button>
                                    {topics.map((topic) => (
                                      <button
                                        key={topic.id}
                                        type="button"
                                        onClick={() => handleSelectTopic(topic.id)}
                                        title={topic.title}
                                        className={cn(
                                          "w-full flex items-start gap-2 px-2.5 py-1.5 rounded-md text-[11px] text-left transition-all",
                                          selectedTopicId === topic.id
                                            ? "bg-primary/15 text-foreground font-semibold border border-primary/30"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                        )}
                                      >
                                        <Circle className="h-2.5 w-2.5 flex-shrink-0 mt-1 text-primary" />
                                        <span className="flex-1 min-w-0 break-words line-clamp-2 leading-snug">
                                          {topic.title}
                                        </span>
                                      </button>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {mod.exam && (
                      <button
                        type="button"
                        onClick={handleSelectExam}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-all",
                          selectedExam
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Trophy className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        <span className="flex-1 min-w-0 truncate">
                          {mod.exam.title || t("moduleExam") || "Module Exam"}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">
              {course.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {renderStatusBadge(course.status)}
              <span className="text-xs text-[var(--admin-muted)] flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {languageLabel(course.language)}
              </span>
              {fullCourse && (
                <span className="text-xs text-[var(--admin-muted)] flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatMinutes(courseTime(fullCourse))}
                </span>
              )}
            </div>
          </div>
          {course.thumbnail_url && (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-20 w-20 rounded-[14px] object-cover border border-[var(--admin-border)] flex-shrink-0"
            />
          )}
        </div>

        {course.description && (
          <p className="text-sm text-[var(--admin-muted)] leading-relaxed">
            {course.description}
          </p>
        )}

        {course.banner_url && (
          <img
            src={course.banner_url}
            alt={course.title}
            className="w-full h-40 object-cover rounded-[14px] border border-[var(--admin-border)]"
          />
        )}
      </div>

      {fullCourse && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
            <Layers className="h-5 w-5 mx-auto text-[var(--admin-primary)]" />
            <div className="text-lg font-bold text-[var(--admin-text)]">{fullCourse.modules.length}</div>
            <div className="text-[10px] text-[var(--admin-muted)]">{t("modules") || "Modules"}</div>
          </div>
          <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
            <FileText className="h-5 w-5 mx-auto text-green-600 dark:text-green-400" />
            <div className="text-lg font-bold text-[var(--admin-text)]">{totalLessons}</div>
            <div className="text-[10px] text-[var(--admin-muted)]">{t("lessons") || "Lessons"}</div>
          </div>
          <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
            <Clock className="h-5 w-5 mx-auto text-[var(--admin-primary)]" />
            <div className="text-lg font-bold text-[var(--admin-text)]">{formatMinutes(courseTime(fullCourse))}</div>
            <div className="text-[10px] text-[var(--admin-muted)]">{t("estimatedTime") || "Estimated Time"}</div>
          </div>
          <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
            <Trophy className="h-5 w-5 mx-auto text-amber-500" />
            <div className="text-lg font-bold text-[var(--admin-text)]">
              {fullCourse.modules.filter((m) => m.exam).length}
            </div>
            <div className="text-[10px] text-[var(--admin-muted)]">{t("exams") || "Exams"}</div>
          </div>
        </div>
      )}

      {course.midterm_enabled && (
        <div className="rounded-[14px] border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[var(--admin-primary)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("midtermTest") || "Midterm Test"}</h3>
              <p className="text-xs text-[var(--admin-muted)]">
                {course.midterm_question_count} {t("questions") || "questions"} · {course.midterm_duration_minutes} {t("minutes") || "min"} · every {course.midterm_interval} {t("modules") || "modules"}
              </p>
            </div>
          </div>
        </div>
      )}

      {fullCourse && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("modules") || "Modules"}</h3>
          <div className="space-y-2">
            {fullCourse.modules.map((mod, idx) => (
              <button
                key={mod.module.id}
                type="button"
                onClick={() => handleSelectModule(mod.module.id)}
                className="w-full text-left rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--admin-text)] truncate">{mod.module.title}</div>
                    <div className="text-[10px] text-[var(--admin-muted)]">
                      {mod.lessons.length} {t("lessons") || "lessons"} · {formatMinutes(moduleTime(mod))}
                      {mod.exam ? ` · ${t("exam") || "Exam"}` : ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderModuleOverview = (mod: FullModule) => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
          <BookOpen className="h-3.5 w-3.5" />
          {t("module") || "Module"}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">{mod.module.title}</h2>
        {renderStatusBadge(mod.module.status)}
      </div>

      {mod.module.description && (
        <p className="text-sm text-[var(--admin-muted)] leading-relaxed">{mod.module.description}</p>
      )}

      {mod.module.objectives && (
        <div className="rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("objectives") || "Objectives"}</h3>
          <p className="text-sm text-[var(--admin-muted)]">{mod.module.objectives}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
          <FileText className="h-5 w-5 mx-auto text-[var(--admin-primary)]" />
          <div className="text-lg font-bold text-[var(--admin-text)]">{mod.lessons.length}</div>
          <div className="text-[10px] text-[var(--admin-muted)]">{t("lessons") || "Lessons"}</div>
        </div>
        <div className="admin-card !rounded-[5px] p-3 text-center space-y-1">
          <Clock className="h-5 w-5 mx-auto text-green-600 dark:text-green-400" />
          <div className="text-lg font-bold text-[var(--admin-text)]">{formatMinutes(moduleTime(mod))}</div>
          <div className="text-[10px] text-[var(--admin-muted)]">{t("estimatedTime") || "Estimated Time"}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("lessons") || "Lessons"}</h3>
        <div className="space-y-2">
          {mod.lessons.map((lesson, idx) => {
            const topicCount = parseTopics(lesson.topics).length;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => handleSelectLesson(lesson.id)}
                className="w-full text-left rounded-[14px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-[10px] font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--admin-text)] truncate">{lesson.title}</div>
                    <div className="text-[10px] text-[var(--admin-muted)]">
                      {formatMinutes(lessonTime(lesson))}
                      {topicCount > 0 ? ` · ${topicCount} ${t("topics") || "topics"}` : ""}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {mod.exam && (
        <div className="rounded-[14px] border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--admin-text)]">{mod.exam.title || t("moduleExam") || "Module Exam"}</h3>
              <p className="text-xs text-[var(--admin-muted)]">
                {mod.exam.question_count} {t("questions") || "questions"} · {mod.exam.duration_minutes} {t("minutes") || "min"} · {t("passingScore") || "Passing"}: {mod.exam.passing_percentage}%
              </p>
              <Button
                size="sm"
                className="mt-2 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSelectExam}
              >
                <Play className="h-3.5 w-3.5" />
                {t("previewExam") || "Preview Exam"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLessonPreview = (mod: FullModule, lesson: CourseLesson) => {
    const topics = parseTopics(lesson.topics);
    const activeContent = selectedTopic ? selectedTopic.content : lesson.content;
    const activeTitle = selectedTopic ? selectedTopic.title : lesson.title;
    const activeTime = selectedTopic
      ? selectedTopic.estimated_minutes || 0
      : lessonTime(lesson);

    return (
      <div className="space-y-6">
        {/* Lesson Header Card */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedModuleId(null);
                setSelectedLessonId(null);
                setSelectedTopicId(null);
                setSelectedExam(false);
              }}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors font-medium"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="truncate max-w-[180px]">{course.title}</span>
            </button>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <button
              type="button"
              onClick={() => handleSelectModule(mod.module.id)}
              className="truncate max-w-[260px] hover:text-primary transition-colors font-medium"
            >
              {mod.module.title}
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-snug">
            {activeTitle}
          </h2>

          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {renderStatusBadge(lesson.status)}
            {activeTime > 0 && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/60">
                <Clock className="h-3 w-3 text-primary" />
                {formatMinutes(activeTime)}
              </span>
            )}
            {topics.length > 0 && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/60">
                <Layers className="h-3 w-3 text-primary" />
                {topics.length} {t("topics") || "topics"}
              </span>
            )}
          </div>

          {lesson.short_description && (
            <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
              {lesson.short_description}
            </p>
          )}
        </div>

        <MediaPreview lesson={lesson} />

        {/* Topic Navigation Strip */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border/70 bg-muted/20">
            <button
              type="button"
              onClick={() => setSelectedTopicId(null)}
              className={cn(
                "text-xs px-3.5 py-1.5 rounded-lg border transition-all",
                !selectedTopicId
                  ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border-border/70 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {t("introduction") || "Introduction"}
            </button>
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectTopic(topic.id)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-lg border transition-all",
                  selectedTopicId === topic.id
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border/70 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {topic.title}
              </button>
            ))}
          </div>
        )}

        {selectedTopic?.audioUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
            <Volume2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
                {t("topicAudio") || "Topic Audio"}
              </span>
              <audio controls src={selectedTopic.audioUrl} className="w-full h-8" />
            </div>
          </div>
        )}

        {/* Lesson Reading Canvas */}
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none rounded-2xl border border-border/80 bg-card/80 dark:bg-zinc-900/50 p-6 sm:p-8 shadow-sm leading-relaxed overflow-x-auto">
          {activeContent ? (
            <LessonContentView content={activeContent} />
          ) : (
            <p className="text-muted-foreground italic">{t("noContent") || "No content yet."}</p>
          )}
        </div>

        {lesson.resources && lesson.resources.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--admin-text)]">{t("resources") || "Resources"}</h3>
            <div className="grid gap-2">
              {lesson.resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-input-bg)] p-2.5 text-sm text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] transition-colors"
                  onClick={(e) => {
                    // Prevent navigation inside preview for relative or blob URLs
                    if (!resource.url.startsWith("http")) e.preventDefault();
                  }}
                >
                  <FileDown className="h-4 w-4 text-[var(--admin-primary)]" />
                  <span className="flex-1 truncate">{resource.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {lesson.tags && lesson.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lesson.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--admin-hover-bg)] text-[var(--admin-muted)] border border-[var(--admin-border)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderExamPreview = (mod: FullModule, exam: ModuleExamSettings) => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)]">
          <BookOpen className="h-3.5 w-3.5" />
          {mod.module.title}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--admin-text)]">{exam.title}</h2>
        <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--admin-muted)]">
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {exam.question_count} {t("questions") || "questions"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {exam.duration_minutes} {t("minutes") || "min"}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("passingScore") || "Passing"}: {exam.passing_percentage}%
          </span>
        </div>
      </div>

      {mod.questions.length === 0 ? (
        <div className="text-center py-8 text-sm text-[var(--admin-muted)]">
          {t("noQuestionsYet") || "No questions added to this exam yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {mod.questions
            .filter((q) => !q.deleted_at)
            .sort((a, b) => a.order_index - b.order_index)
            .map((q, idx) => (
              <QuestionPreview key={q.id} question={q} index={idx} />
            ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="h-full flex items-center justify-center text-[var(--admin-muted)]">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-primary)] border-t-transparent" />
            {t("loading") || "Loading preview..."}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--admin-muted)]">
          <AlertCircle className="h-8 w-8 mb-2 text-red-500" />
          <p className="text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setLoading(true);
              setError(null);
              loadFullCourse(course.id).then((result) => {
                if (result.success) {
                  if (result.data) {
                    setFullCourse(result.data);
                    setError(null);
                  } else {
                    setError(t("failedToLoad") || "Failed to load preview");
                  }
                } else {
                  setError(result.error || t("failedToLoad") || "Failed to load preview");
                }
                setLoading(false);
              });
            }}
          >
            {t("retry") || "Retry"}
          </Button>
        </div>
      );
    }

    if (!fullCourse) {
      return (
        <div className="h-full flex items-center justify-center text-sm text-[var(--admin-muted)]">
          {t("loading") || "Loading..."}
        </div>
      );
    }

    if (selectedExam && selectedModule && selectedModule.exam) {
      return renderExamPreview(selectedModule, selectedModule.exam);
    }

    if (selectedLesson && selectedModule) {
      return renderLessonPreview(selectedModule, selectedLesson);
    }

    if (selectedModule) {
      return renderModuleOverview(selectedModule);
    }

    return renderOverview();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        className="w-full sm:max-w-6xl p-0 flex flex-col bg-background border-l border-border shadow-2xl overflow-hidden"
      >
        <SheetHeader className="px-5 py-3.5 border-b border-border bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-primary/15 text-primary flex-shrink-0">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base sm:text-lg font-bold truncate">
                  {t("previewOf") || "Preview of"} {course.title}
                </SheetTitle>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Interactive student curriculum &amp; lesson preview
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-xl hover:bg-muted shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">
            {t("coursePreviewDescription") || "Preview how this course appears to students"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="hidden md:flex w-80 h-full shrink-0 overflow-hidden">
            {renderSidebar()}
          </div>
          <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-background/50">
            <div className="p-5 sm:p-8 max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
