"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, ChevronRight, ChevronLeft, Clock, CheckCircle2, Circle, Layers, ArrowRight, Play, FileText, Lock, Trophy, Shield, Home } from "lucide-react";
import type { CourseLanguageCourse, CourseModule, CourseLesson, ModuleExamSettings } from "@/lib/database.types";
import { LessonContentView } from "./LessonContentView";
import { TopicCarousel, type CarouselTopic } from "@/components/topic-carousel";
import { ModuleExamRunner, type ExamType } from "@/components/module-exam-runner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadCourseByLanguage } from "@/app/dashboard/actions/course";
import {
  getStudentModuleProgress,
  getStudentLessonProgress,
  upsertLessonProgress,
  updateModuleTimeSpent,
  getModuleExamAttempts,
} from "@/lib/supabase/queries";

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
  examSettings?: ModuleExamSettings | null;
}

interface CourseWithModules extends CourseLanguageCourse {
  modules: ModuleWithLessons[];
}

interface LessonTopicUI {
  id: string;
  title: string;
  content: string;
  estimated_minutes?: number;
}

const isLearningLanguage = (language: string): language is LearningLanguage =>
  LEARNING_LANGUAGES.includes(language as LearningLanguage);

interface RawTopicInput {
  id?: string;
  title?: string;
  content?: string;
  estimated_minutes?: number;
}

function parseTopics(raw: unknown[] | undefined | null): LessonTopicUI[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => {
    if (typeof t === "string") {
      return { id: crypto.randomUUID(), title: t, content: "", estimated_minutes: 0 };
    }
    const topic = t as RawTopicInput;
    return {
      id: topic.id || crypto.randomUUID(),
      title: topic.title || "",
      content: topic.content || "",
      estimated_minutes: topic.estimated_minutes || 0,
    };
  });
}

function lessonTime(lesson: CourseLesson): number {
  const topics = parseTopics(lesson.topics);
  const topicTime = topics.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const lessonReadTime = (lesson.content && lesson.content.trim() ? lesson.estimated_reading_minutes || 0 : 0);
  if (topics.length > 0) {
    return topicTime + lessonReadTime;
  }
  return lesson.estimated_reading_minutes || 0;
}

function moduleTime(module: ModuleWithLessons): number {
  return module.lessons.reduce((sum, l) => sum + lessonTime(l), 0);
}

function courseTime(course: CourseWithModules): number {
  return course.modules.reduce((sum, m) => sum + moduleTime(m), 0);
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

interface FlatItem {
  type: "lesson" | "topic" | "exam";
  moduleId: string;
  moduleTitle: string;
  lessonId: string;
  lessonTitle: string;
  topicId?: string;
  topicTitle?: string;
  topicIndex?: number;
  topicCount?: number;
}

function buildFlatList(course: CourseWithModules): FlatItem[] {
  const items: FlatItem[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const topics = parseTopics(lesson.topics);
      if (topics.length > 0) {
        if (lesson.content && lesson.content.trim()) {
          items.push({
            type: "lesson",
            moduleId: mod.id,
            moduleTitle: mod.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          });
        }
        topics.forEach((topic, idx) => {
          items.push({
            type: "topic",
            moduleId: mod.id,
            moduleTitle: mod.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            topicId: topic.id,
            topicTitle: topic.title,
            topicIndex: idx,
            topicCount: topics.length,
          });
        });
      } else {
        items.push({
          type: "lesson",
          moduleId: mod.id,
          moduleTitle: mod.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
        });
      }
    }
    if (mod.examSettings) {
      items.push({
        type: "exam",
        moduleId: mod.id,
        moduleTitle: mod.title,
        lessonId: "",
        lessonTitle: mod.examSettings.title || "Module Exam",
      });
    }
  }
  return items;
}

interface ModuleProgress {
  module_id: string;
  lessons_completed: number;
  total_lessons: number;
  exam_passed: boolean;
  exam_attempts: number;
  best_score?: number;
  completed_at?: string;
}

interface LessonProgress {
  lesson_id: string;
  module_id: string;
  completed: boolean;
}

export default function StudentCoursePage() {
  const { t, language: interfaceLanguage } = useLanguage();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showCompletion, setShowCompletion] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [viewMode, setViewMode] = useState<"overview" | "journey">("overview");

  const [activeExam, setActiveExam] = useState<{ type: ExamType; moduleId?: string; moduleTitle?: string } | null>(null);
  const [moduleProgress, setModuleProgress] = useState<Map<string, ModuleProgress>>(new Map());
  const [lessonProgress, setLessonProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLessonComplete, setShowLessonComplete] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const sidebarHoverRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lessonStartTimeRef = useRef<number>(Date.now());

  const flatList = useMemo(() => (course ? buildFlatList(course) : []), [course]);

  const itemKey = (item: FlatItem) =>
    item.type === "topic" ? `${item.lessonId}:${item.topicId}` : item.type === "exam" ? `exam:${item.moduleId}` : item.lessonId;

  const currentItem = flatList[currentItemIndex] || null;

  const loadProgress = useCallback(async (courseData: CourseWithModules) => {
    const moduleIds = courseData.modules.map((m) => m.id);
    if (moduleIds.length === 0) return;

    const [modProgress, lesProgress] = await Promise.all([
      getStudentModuleProgress(moduleIds),
      getStudentLessonProgress(moduleIds),
    ]);

    const modMap = new Map<string, ModuleProgress>();
    (modProgress || []).forEach((p: unknown) => {
      const item = p as { module_id: string };
      modMap.set(item.module_id, p as ModuleProgress);
    });
    setModuleProgress(modMap);

    const lesMap = new Map<string, LessonProgress>();
    (lesProgress || []).forEach((p: unknown) => {
      const item = p as { lesson_id: string };
      lesMap.set(item.lesson_id, p as LessonProgress);
    });
    setLessonProgress(lesMap);

    const completed = new Set<string>();
    const allItems = buildFlatList(courseData);
    for (const item of allItems) {
      if (item.type === "exam") {
        const mp = modMap.get(item.moduleId);
        if (mp && mp.exam_attempts > 0) {
          completed.add(itemKey(item));
        }
      } else {
        const lp = lesMap.get(item.lessonId);
        if (lp && lp.completed) {
          completed.add(itemKey(item));
        }
      }
    }
    setCompletedItems(completed);

    const attemptsMap = new Map<string, number>();
    for (const mod of courseData.modules) {
      if (mod.examSettings) {
        try {
          const attempts = await getModuleExamAttempts(mod.id, "module");
          attemptsMap.set(mod.id, attempts.length);
        } catch {
          attemptsMap.set(mod.id, 0);
        }
      }
    }
  }, []);

  const loadCourse = useCallback(async (selectedLanguage: LearningLanguage | null) => {
    if (!selectedLanguage) {
      setCourse(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { course } = await loadCourseByLanguage(selectedLanguage);
    if (!course) {
      setCourse(null);
      setLoading(false);
      return;
    }

    setCourse(course);
    setLoading(false);

    await loadProgress(course);
  }, [loadProgress]);

  useEffect(() => {
    const loadLearningLanguage = async () => {
      const matchingLanguage = isLearningLanguage(interfaceLanguage) ? interfaceLanguage : null;
      if (matchingLanguage) {
        setLearningLanguage(matchingLanguage);
        await loadCourse(matchingLanguage);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from("user_profiles").select("learning_language").eq("id", user.id).maybeSingle()
        : { data: null };
      const savedLanguage = profile?.learning_language;
      const selectedLanguage = isLearningLanguage(savedLanguage || "") ? savedLanguage : null;
      setLearningLanguage(selectedLanguage);
      await loadCourse(selectedLanguage);
    };

    void loadLearningLanguage();
  }, [interfaceLanguage, loadCourse]);

  // Deep-linking: jump to a specific lesson via ?lesson=<id>
  const searchParams = useSearchParams();
  useEffect(() => {
    const lessonId = searchParams.get("lesson");
    if (!lessonId || flatList.length === 0) return;
    const idx = flatList.findIndex((f) => f.lessonId === lessonId);
    if (idx >= 0) {
      setCurrentItemIndex(idx);
      setViewMode("journey");
      lessonStartTimeRef.current = Date.now();
    }
  }, [searchParams, flatList]);

  const selectLearningLanguage = async (selectedLanguage: LearningLanguage) => {
    const supabase = createClient();
    setSavingLanguage(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingLanguage(false);
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ learning_language: selectedLanguage })
      .eq("id", user.id);
    if (!error) {
      setLearningLanguage(selectedLanguage);
      await loadCourse(selectedLanguage);
    }
    setSavingLanguage(false);
  };

  const saveLessonProgress = useCallback(async (item: FlatItem) => {
    if (item.type === "exam") return;
    const timeSpent = Math.floor((Date.now() - lessonStartTimeRef.current) / 1000);
    lessonStartTimeRef.current = Date.now();
    try {
      await upsertLessonProgress(item.lessonId, item.moduleId, true, timeSpent);
      await updateModuleTimeSpent(item.moduleId, timeSpent);
    } catch (error) {
      console.error("Failed to save lesson progress:", error);
    }
  }, []);

  const isItemUnlocked = (index: number): boolean => {
    if (index === 0) return true;
    const key = itemKey(flatList[index]);
    if (completedItems.has(key)) return true;
    const firstUncompleted = flatList.findIndex((item) => !completedItems.has(itemKey(item)));
    return index <= firstUncompleted;
  };

  const isLastItemInLesson = (item: FlatItem | undefined): boolean => {
    if (!item) return false;
    const lessonItems = flatList.filter((f) => f.lessonId === item.lessonId && f.type !== "exam");
    const lastLessonItem = lessonItems[lessonItems.length - 1];
    if (!lastLessonItem) return false;
    return itemKey(item) === itemKey(lastLessonItem);
  };

  const isModuleCompleted = (moduleId: string): boolean => {
    const mp = moduleProgress.get(moduleId);
    if (!mp) return false;
    const mod = course?.modules.find((m) => m.id === moduleId);
    if (!mod) return false;
    const allLessonsDone = mod.lessons.every((l) => {
      const lp = lessonProgress.get(l.id);
      return lp && lp.completed;
    });
    const examTaken = mp.exam_attempts > 0;
    return allLessonsDone && (examTaken || !mod.examSettings);
  };

  const isMidtermDue = (moduleIndex: number): boolean => {
    if (!course || !course.midterm_enabled || course.midterm_interval <= 0) return false;
    return (moduleIndex + 1) % course.midterm_interval === 0;
  };

  const allModulesCompleted = (): boolean => {
    if (!course) return false;
    return course.modules.every((m) => isModuleCompleted(m.id));
  };

  const markCompleteAndAdvance = async () => {
    if (!currentItem) return;
    const key = itemKey(currentItem);
    const newCompleted = new Set(completedItems);
    newCompleted.add(key);
    setCompletedItems(newCompleted);

    if (currentItem.type !== "exam") {
      await saveLessonProgress(currentItem);
    }

    if (newCompleted.size >= flatList.length) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
      return;
    }

    if (currentItemIndex < flatList.length - 1) {
      // Show lesson completion card if this was the last item in a lesson
      if (isLastItemInLesson(currentItem)) {
        setShowLessonComplete(true);
      } else {
        setShowCompletion(true);
        setTimeout(() => {
          setShowCompletion(false);
          setCurrentItemIndex(currentItemIndex + 1);
        }, 1200);
      }
    }
  };

  const goToPrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
      setShowLessonComplete(false);
    }
  };

  const goToNext = () => {
    if (currentItemIndex < flatList.length - 1) {
      const nextIndex = currentItemIndex + 1;
      if (isItemUnlocked(nextIndex)) {
        setCurrentItemIndex(nextIndex);
        setShowLessonComplete(false);
      }
    }
  };

  // Keyboard navigation: left/right arrows to switch lessons/topics
  useEffect(() => {
    if (viewMode !== "journey" || activeExam || showLessonComplete || showCompletion || showCelebration) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentItem && !completedItems.has(itemKey(currentItem)) && currentItemIndex < flatList.length - 1) {
          void markCompleteAndAdvance();
        } else {
          goToNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [viewMode, activeExam, showLessonComplete, showCompletion, showCelebration, currentItemIndex, currentItem, completedItems, flatList]);

  const continueToNextLesson = () => {
    setShowLessonComplete(false);
    if (currentItemIndex < flatList.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const backToHomeFromLesson = () => {
    setShowLessonComplete(false);
    backToOverview();
  };

  // Swipe handlers for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) {
      if (currentItem && !completedItems.has(itemKey(currentItem)) && currentItemIndex < flatList.length - 1) {
        void markCompleteAndAdvance();
      } else {
        goToNext();
      }
    } else if (distance < -minSwipeDistance) {
      goToPrevious();
    }
  };

  // Auto-expand sidebar on cursor hover (desktop only)
  const handleSidebarMouseEnter = () => {
    if (sidebarHoverRef.current) clearTimeout(sidebarHoverRef.current);
    setIsSidebarOpen(true);
  };

  const handleSidebarMouseLeave = () => {
    if (sidebarHoverRef.current) clearTimeout(sidebarHoverRef.current);
    sidebarHoverRef.current = setTimeout(() => setIsSidebarOpen(false), 300);
  };

  const startModule = (moduleId: string) => {
    const firstInModule = flatList.findIndex((f) => f.moduleId === moduleId);
    if (firstInModule >= 0) {
      setCurrentItemIndex(firstInModule);
      setViewMode("journey");
      lessonStartTimeRef.current = Date.now();
    }
  };

  const backToOverview = () => {
    setViewMode("overview");
    setActiveExam(null);
  };

  const startModuleExam = (moduleId: string, moduleTitle: string) => {
    setActiveExam({ type: "module", moduleId, moduleTitle });
  };

  const startMidtermExam = () => {
    if (!course) return;
    setActiveExam({ type: "midterm" });
  };

  const startFinalExam = () => {
    if (!course) return;
    setActiveExam({ type: "final" });
  };

  const handleExamComplete = async (result: { passed: boolean; score: number; taken: boolean }) => {
    if (!activeExam || !course) return;

    await loadProgress(course);

    if (activeExam.type === "module" && activeExam.moduleId) {
      const examItem = flatList.find((f) => f.type === "exam" && f.moduleId === activeExam.moduleId);
      if (examItem) {
        const newCompleted = new Set(completedItems);
        newCompleted.add(itemKey(examItem));
        setCompletedItems(newCompleted);
      }
      toast.success(result.passed ? (t("examPassed") || "Exam passed!") : (t("examCompleted") || "Exam completed"));
    } else if (activeExam.type === "midterm") {
      toast.success(t("midtermCompleted") || "Midterm completed!");
    } else if (activeExam.type === "final") {
      toast.success(t("finalExamCompleted") || "Final exam completed!");
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 4000);
    }

    setActiveExam(null);
  };

  const handleExamExit = () => {
    setActiveExam(null);
  };

  const totalItems = flatList.length;
  const completedCount = completedItems.size;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const currentLesson = useMemo(() => {
    if (!course || !currentItem) return null;
    const mod = course.modules.find((m) => m.id === currentItem.moduleId);
    return mod?.lessons.find((l) => l.id === currentItem.lessonId) || null;
  }, [course, currentItem]);

  const currentTopic = useMemo(() => {
    if (!currentItem || currentItem.type !== "topic") return null;
    const topics = parseTopics(currentLesson?.topics);
    return topics.find((tp) => tp.id === currentItem.topicId) || null;
  }, [currentItem, currentLesson]);

  const currentContent = currentItem?.type === "topic"
    ? (currentTopic?.content || "")
    : (currentLesson?.content || "");

  const currentEstimatedTime = currentItem?.type === "topic"
    ? (currentTopic?.estimated_minutes || 0)
    : (currentLesson ? lessonTime(currentLesson) : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">{t("loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!learningLanguage) {
    return (
      <div className="max-w-xl mx-auto rounded-[14px] sm:rounded-[24px] border bg-card p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <BookOpen className="h-10 w-10 mx-auto text-primary-readable" />
          <h1 className="text-2xl font-bold">{t("chooseLearningLanguage") || "Choose the language you want to study in"}</h1>
          <p className="text-sm text-muted-foreground">{t("learningLanguageSeparate") || "Your learning language is separate from the application interface language."}</p>
        </div>
        <div className="grid gap-3">
          {LEARNING_LANGUAGES.map((option) => (
            <Button key={option} type="button" variant="outline" className="h-12 justify-start" disabled={savingLanguage} onClick={() => void selectLearningLanguage(option)}>
              {option === "English" ? "English" : option === "French" ? "Français" : "Kinyarwanda"}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16 border border-dashed rounded-[14px] sm:rounded-[24px] bg-muted/40">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-lg font-medium">{t("noCoursesAvailable") || "No courses available"}</p>
        <p className="text-sm text-muted-foreground mt-1">{(t("noPublishedCourse") || "There is no published {language} course right now.").replace("{language}", learningLanguage)}</p>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-[14px] sm:rounded-[24px] bg-muted/40">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-lg font-medium">{t("noContentYet") || "No content available yet."}</p>
      </div>
    );
  }

  if (activeExam) {
    const allModuleIds = course.modules.map((m) => m.id);
    const completedModuleIds = course.modules
      .filter((m) => isModuleCompleted(m.id))
      .map((m) => m.id);

    return (
      <ModuleExamRunner
        examType={activeExam.type}
        moduleId={activeExam.moduleId}
        moduleTitle={activeExam.moduleTitle}
        midtermModuleIds={activeExam.type === "midterm" ? completedModuleIds : undefined}
        midtermQuestionCount={course.midterm_question_count || 30}
        midtermDurationMinutes={course.midterm_duration_minutes || 30}
        finalModuleIds={activeExam.type === "final" ? allModuleIds : undefined}
        finalQuestionCount={50}
        finalDurationMinutes={45}
        onComplete={handleExamComplete}
        onExit={handleExamExit}
      />
    );
  }

  if (viewMode === "overview") {
    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-readable" />
            <h1 className="text-xl font-bold flex-1 truncate">{course.title}</h1>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("progress") || "Progress"}</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{completedCount} {t("completed") || "completed"}</span>
              <span className="flex items-center gap-1"><Circle className="h-3 w-3" />{totalItems - completedCount} {t("remaining") || "remaining"}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(courseTime(course))}</span>
            </div>
          </div>

          <div className="space-y-3">
            {course.modules.map((module, modIdx) => {
              const moduleItems = flatList.filter((f) => f.moduleId === module.id);
              const moduleDone = moduleItems.filter((f) => completedItems.has(itemKey(f))).length;
              const modulePct = moduleItems.length > 0 ? Math.round((moduleDone / moduleItems.length) * 100) : 0;
              const isComplete = isModuleCompleted(module.id);
              const isInProgress = moduleDone > 0 && !isComplete;
              const mp = moduleProgress.get(module.id);
              const examTaken = (mp?.exam_attempts || 0) > 0;
              const examPassed = mp?.exam_passed;

              return (
                <div key={module.id}>
                  <button
                    type="button"
                    onClick={() => startModule(module.id)}
                    className="w-full text-left rounded-[14px] sm:rounded-[24px] border bg-card shadow-sm hover:shadow-md transition-all p-5 space-y-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center h-10 w-10 rounded-[10px] flex-shrink-0 ${isComplete ? "bg-green-500/10" : "bg-green-500/10"}`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Layers className="h-5 w-5 text-primary-readable" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-medium">{t("module") || "Module"} {modIdx + 1}</span>
                          {isInProgress && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-readable font-medium">{t("inProgress") || "In Progress"}</span>
                          )}
                          {isComplete && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">{t("completed") || "Completed"}</span>
                          )}
                          {examTaken && !examPassed && module.examSettings && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">{t("examTaken") || "Exam Taken"}</span>
                          )}
                        </div>
                        <h3 className="font-semibold text-base truncate">{module.title}</h3>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{module.lessons.length} {t("lessons") || "lessons"}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(moduleTime(module))}</span>
                          {module.examSettings && (
                            <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{t("exam") || "Exam"}</span>
                          )}
                          <span>{moduleDone}/{moduleItems.length} {t("completed") || "completed"}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary-readable group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full transition-all duration-500 rounded-full bg-green-500" style={{ width: `${modulePct}%` }} />
                    </div>
                  </button>

                  {isMidtermDue(modIdx) && isModuleCompleted(module.id) && modIdx < course.modules.length - 1 && (
                    <div className="mt-2 ml-4 rounded-[12px] border-2 border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-[10px] bg-primary/10">
                          <Shield className="h-5 w-5 text-primary-readable" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] text-primary-readable font-medium">{t("midtermTest") || "Midterm Test"}</div>
                          <h3 className="font-semibold text-sm">{t("midtermExamReady") || "Midterm exam ready"}</h3>
                          <p className="text-[11px] text-muted-foreground">{course.midterm_question_count} {t("questions") || "questions"} · {course.midterm_duration_minutes} min</p>
                        </div>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); startMidtermExam(); }}>
                          <Play className="h-3.5 w-3.5 mr-1" />
                          {t("start") || "Start"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allModulesCompleted() && (
            <div className="rounded-[14px] sm:rounded-[24px] border-2 border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-12 w-12 rounded-[10px] bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary-readable" />
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-primary-readable font-medium">{t("finalExam") || "Final Exam"}</div>
                  <h3 className="font-semibold text-base">{t("finalExamReady") || "Final exam ready!"}</h3>
                  <p className="text-[11px] text-muted-foreground">{t("allModulesCompleted") || "All modules completed. Take the final exam to finish the course."}</p>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); startFinalExam(); }}>
                  <Play className="h-4 w-4 mr-2" />
                  {t("startFinalExam") || "Start Final Exam"}
                </Button>
              </div>
            </div>
          )}

          {completedCount > 0 && currentItemIndex < totalItems && !allModulesCompleted() && (
            <div className="pt-2">
              <Button onClick={() => setViewMode("journey")} className="w-full gap-2" size="lg">
                <Play className="h-4 w-4" />
                {t("resumeLearning") || "Resume Learning"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {showCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 animate-[fadeIn_0.3s_ease-out]" />
          <div className="relative z-10 text-center space-y-4 animate-[scaleIn_0.4s_ease-out]">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-white drop-shadow-lg">{t("courseCompleted") || "Course Completed!"}</h2>
            <p className="text-lg text-white/90 drop-shadow">{t("congratulations") || "Congratulations on finishing the course!"}</p>
          </div>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute text-3xl animate-[confetti_1.5s_ease-out_forwards]" style={{ left: `${10 + (i * 7)}%`, top: `${20 + (i % 3) * 10}%`, animationDelay: `${i * 0.1}s` }}>
              {["🎊", "🎉", "✨", "⭐", "🌟"][i % 5]}
            </div>
          ))}
        </div>
      )}

      {showCompletion && (
        <div className="fixed inset-0 z-[90] pointer-events-none flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-[14px] sm:rounded-[24px] shadow-2xl p-8 space-y-3 animate-[scaleIn_0.3s_ease-out] border-2 border-green-500/30">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-[scaleIn_0.5s_ease-out]" />
            <p className="text-lg font-semibold text-center">{t("sectionCompleted") || "Section Completed!"}</p>
          </div>
        </div>
      )}

      {/* Lesson Completion Card */}
      {showLessonComplete && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative max-w-md w-full rounded-[24px] border-2 border-green-500/30 bg-card shadow-2xl p-8 space-y-6 animate-[scaleIn_0.3s_ease-out]">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">{t("lessonCompletedTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("lessonCompletedMsg")}</p>
            </div>
            {(() => {
              const nextItem = flatList[currentItemIndex + 1];
              if (nextItem) {
                return (
                  <div className="rounded-[14px] border bg-secondary/50 p-4 space-y-1">
                    <div className="text-[11px] text-muted-foreground font-medium">{t("nextLesson")}</div>
                    <div className="flex items-center gap-2">
                      {nextItem.type === "exam" ? <Trophy className="h-4 w-4 text-amber-500" /> : <BookOpen className="h-4 w-4 text-blue-500" />}
                      <span className="font-semibold text-sm truncate">{nextItem.type === "topic" ? nextItem.topicTitle : nextItem.type === "exam" ? nextItem.lessonTitle : nextItem.lessonTitle}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex flex-col gap-2.5">
              {currentItemIndex < flatList.length - 1 && (
                <Button size="lg" className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={continueToNextLesson}>
                  <ArrowRight className="h-4 w-4" />
                  {t("continueToNextLesson")}
                </Button>
              )}
              <Button size="lg" variant="outline" className="w-full gap-2" onClick={backToHomeFromLesson}>
                <Home className="h-4 w-4" />
                {t("backToHome")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-[calc(100dvh-4rem)] relative">
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        <aside
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          className={cn(
            "fixed lg:sticky top-0 left-0 z-50 h-dvh lg:h-[calc(100dvh-4rem)] border-r bg-card transition-all duration-300 overflow-hidden flex flex-col",
            "max-lg:translate-x-[-100%] max-lg:w-64 hidden lg:flex",
            isMobileSidebarOpen && "max-lg:translate-x-0 max-lg:flex",
            isSidebarOpen ? "lg:w-64" : "lg:w-12"
          )}
        >
          {/* Collapsed: vertical progress bar */}
          {!isSidebarOpen && (
            <div className="flex flex-col items-center pt-3 pb-3 h-full gap-2">
              {/* Break button - collapsed */}
              <button
                type="button"
                onClick={backToOverview}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label={t("break") || "Break"}
                title={t("break") || "Break"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {/* Checkpoint icons - collapsed */}
              <div className="flex flex-col items-center gap-1 pb-1">
                {flatList.map((item, idx) => {
                  const isDone = completedItems.has(itemKey(item));
                  const isCurrent = idx === currentItemIndex;
                  const isUnlocked = isItemUnlocked(idx);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        isDone ? "bg-green-500" : isCurrent ? "bg-primary ring-2 ring-primary/30" : isUnlocked ? "bg-muted-foreground/40" : "bg-muted-foreground/15"
                      )}
                      title={item.type === "topic" ? item.topicTitle : item.type === "exam" ? item.lessonTitle : item.lessonTitle}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Expanded: full sidebar content */}
          {isSidebarOpen && (
            <>
              <div className="flex items-center p-2 border-b h-12">
                <span className="text-xs font-semibold px-1 truncate flex-1">{t("courseContent") || "Course Content"}</span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="hidden lg:inline-flex p-1.5 rounded-md hover:bg-muted transition-colors ml-auto"
                  aria-label={t("collapseSidebar") || "Collapse sidebar"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors ml-auto"
                  aria-label={t("closeSidebar") || "Close sidebar"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <Button type="button" variant="outline" size="sm" onClick={backToOverview} className="w-full gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  {t("break") || "Break"}
                </Button>

                {currentItem && (
                  <div className="rounded-[14px] sm:rounded-[20px] border bg-card p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary-readable flex-shrink-0" />
                      <h3 className="font-semibold text-sm truncate">{currentItem.moduleTitle}</h3>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{t("progress") || "Progress"}</span>
                        <span>{(() => {
                          const modItems = flatList.filter((f) => f.moduleId === currentItem.moduleId);
                          const modDone = modItems.filter((f) => completedItems.has(itemKey(f))).length;
                          return `${modDone}/${modItems.length}`;
                        })()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-green-500 transition-all duration-500 rounded-full" style={{ width: `${(() => {
                          const modItems = flatList.filter((f) => f.moduleId === currentItem.moduleId);
                          const modDone = modItems.filter((f) => completedItems.has(itemKey(f))).length;
                          return modItems.length > 0 ? (modDone / modItems.length) * 100 : 0;
                        })()}%` }} />
                      </div>
                    </div>

                    {/* Checkpoint-style list with colored icons */}
                    <div className="space-y-0.5">
                      {course.modules.find((m) => m.id === currentItem.moduleId)?.lessons.map((lesson) => {
                        const lessonTopics = parseTopics(lesson.topics);
                        const lessonMainPage = flatList.find((f) => f.type === "lesson" && f.lessonId === lesson.id);
                        const lessonFlatItems = lessonTopics.length > 0
                          ? [...(lessonMainPage ? [lessonMainPage] : []), ...lessonTopics.map((tp) => flatList.find((f) => f.type === "topic" && f.lessonId === lesson.id && f.topicId === tp.id))]
                          : [lessonMainPage || flatList.find((f) => f.type === "lesson" && f.lessonId === lesson.id)];
                        const lessonDone = lessonFlatItems.filter((f) => f && completedItems.has(itemKey(f))).length;
                        const lessonTotal = lessonFlatItems.filter(Boolean).length;
                        const isLessonComplete = lessonDone === lessonTotal && lessonTotal > 0;
                        const isLessonCurrent = currentItem.lessonId === lesson.id && currentItem.type !== "exam";
                        const firstItemIdx = lessonFlatItems.find(Boolean) ? flatList.indexOf(lessonFlatItems.find(Boolean)!) : -1;
                        const isLessonUnlocked = firstItemIdx >= 0 && isItemUnlocked(firstItemIdx);

                        return (
                          <div key={lesson.id} className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => isLessonUnlocked && firstItemIdx >= 0 && setCurrentItemIndex(firstItemIdx)}
                              disabled={!isLessonUnlocked}
                              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all text-left", isLessonCurrent && "bg-primary text-primary-foreground", !isLessonCurrent && isLessonComplete && "text-green-600 dark:text-green-400", !isLessonCurrent && !isLessonComplete && isLessonUnlocked && "hover:bg-muted", !isLessonUnlocked && "opacity-40 cursor-not-allowed")}
                            >
                              {isLessonComplete ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" /> : isLessonCurrent ? <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" /> : isLessonUnlocked ? <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" /> : <Lock className="h-3.5 w-3.5 flex-shrink-0" />}
                              <span className="flex-1 truncate">{lesson.title}</span>
                              {lessonTotal > 1 && <span className={cn("text-[9px] flex-shrink-0", isLessonCurrent ? "text-primary-foreground/70" : "text-muted-foreground")}>{lessonDone}/{lessonTotal}</span>}
                            </button>

                            {isLessonCurrent && lessonTopics.length > 0 && (
                              <div className="ml-4 space-y-0.5 border-l pl-1.5 border-purple-200 dark:border-purple-900">
                                {lessonMainPage && (() => {
                                  const mainIdxInFlat = flatList.indexOf(lessonMainPage);
                                  const mainDone = completedItems.has(itemKey(lessonMainPage));
                                  const mainCurrent = currentItem.type === "lesson" && currentItem.lessonId === lesson.id;
                                  const mainUnlocked = mainIdxInFlat >= 0 && isItemUnlocked(mainIdxInFlat);
                                  return (
                                    <button type="button" onClick={() => mainUnlocked && mainIdxInFlat >= 0 && setCurrentItemIndex(mainIdxInFlat)} disabled={!mainUnlocked} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-all text-left", mainCurrent && "bg-primary/20 text-primary-readable font-medium", !mainCurrent && mainDone && "text-green-600 dark:text-green-400", !mainCurrent && !mainDone && mainUnlocked && "hover:bg-muted", !mainUnlocked && "opacity-40 cursor-not-allowed")}>
                                      {mainDone ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" /> : mainCurrent ? <FileText className="h-3 w-3 flex-shrink-0 text-blue-500" /> : mainUnlocked ? <FileText className="h-3 w-3 flex-shrink-0 text-blue-400" /> : <Lock className="h-3 w-3 flex-shrink-0" />}
                                      <span className="flex-1 truncate">{t("introduction") || "Introduction"}</span>
                                    </button>
                                  );
                                })()}
                                {lessonTopics.map((tp) => {
                                  const tpFlat = flatList.find((f) => f.type === "topic" && f.lessonId === lesson.id && f.topicId === tp.id);
                                  const tpIdxInFlat = tpFlat ? flatList.indexOf(tpFlat) : -1;
                                  const tpDone = tpFlat && completedItems.has(itemKey(tpFlat));
                                  const tpCurrent = currentItem.type === "topic" && currentItem.topicId === tp.id;
                                  const tpUnlocked = tpIdxInFlat >= 0 && isItemUnlocked(tpIdxInFlat);
                                  return (
                                    <button key={tp.id} type="button" onClick={() => tpUnlocked && tpIdxInFlat >= 0 && setCurrentItemIndex(tpIdxInFlat)} disabled={!tpUnlocked} className={cn("w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-all text-left", tpCurrent && "bg-purple-500/20 text-purple-600 dark:text-purple-400 font-medium", !tpCurrent && tpDone && "text-green-600 dark:text-green-400", !tpCurrent && !tpDone && tpUnlocked && "hover:bg-muted", !tpUnlocked && "opacity-40 cursor-not-allowed")}>
                                      {tpDone ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-500" /> : tpCurrent ? <Circle className="h-3 w-3 flex-shrink-0 fill-purple-500/30 text-purple-500" /> : tpUnlocked ? <Circle className="h-3 w-3 flex-shrink-0 text-purple-400" /> : <Lock className="h-3 w-3 flex-shrink-0" />}
                                      <span className="flex-1 truncate">{tp.title}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {(() => {
                        const mod = course.modules.find((m) => m.id === currentItem.moduleId);
                        if (!mod?.examSettings) return null;
                        const examFlat = flatList.find((f) => f.type === "exam" && f.moduleId === mod.id);
                        const examIdx = examFlat ? flatList.indexOf(examFlat) : -1;
                        const examDone = examFlat && completedItems.has(itemKey(examFlat));
                        const examCurrent = currentItem.type === "exam" && currentItem.moduleId === mod.id;
                        const examUnlocked = examIdx >= 0 && isItemUnlocked(examIdx);
                        const mp = moduleProgress.get(mod.id);
                        const attempts = mp?.exam_attempts || 0;
                        return (
                          <div className="pt-1 border-t mt-1 border-amber-200 dark:border-amber-900">
                            <button type="button" onClick={() => examUnlocked && examIdx >= 0 && setCurrentItemIndex(examIdx)} disabled={!examUnlocked} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all text-left", examCurrent && "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium", !examCurrent && examDone && "text-green-600 dark:text-green-400", !examCurrent && !examDone && examUnlocked && "hover:bg-muted", !examUnlocked && "opacity-40 cursor-not-allowed")}>
                              {examDone ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" /> : examCurrent ? <Trophy className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" /> : examUnlocked ? <Trophy className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" /> : <Lock className="h-3.5 w-3.5 flex-shrink-0" />}
                              <span className="flex-1 truncate">{mod.examSettings.title || (t("moduleExam") || "Module Exam")}</span>
                              {attempts > 0 && <span className={cn("text-[9px] flex-shrink-0", examCurrent ? "text-amber-600/70" : "text-muted-foreground")}>{attempts}</span>}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
          {/* Mobile: only Break button, no course content sidebar toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button type="button" variant="outline" size="sm" onClick={backToOverview} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              {t("break") || "Break"}
            </Button>
            <span className="text-[10px] text-muted-foreground ml-auto">{t("swipeToNavigate")}</span>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary-readable flex-shrink-0" />
              <h1 className="text-base sm:text-xl font-bold flex-1 truncate">{currentItem?.moduleTitle || course.title}</h1>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="text-muted-foreground truncate">{t("progress") || "Progress"}{currentItem && currentItem.type !== "exam" ? ` : ${currentItem.lessonTitle}` : ""}</span>
                <span className="font-semibold flex-shrink-0">{progressPercent}%</span>
              </div>
              <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{completedCount} {t("completed") || "completed"}</span>
                <span className="flex items-center gap-1"><Circle className="h-3 w-3" />{totalItems - completedCount} {t("remaining") || "remaining"}</span>
                <span className="hidden sm:flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(courseTime(course))}</span>
              </div>
            </div>
          </div>

          {currentItem?.type === "exam" ? (
            (() => {
              const mod = course.modules.find((m) => m.id === currentItem.moduleId);
              if (!mod?.examSettings) return null;
              const mp = moduleProgress.get(mod.id);
              const attempts = mp?.exam_attempts || 0;
              const bestScore = mp?.best_score;
              const passed = mp?.exam_passed;
              return (
                <div className="rounded-[14px] sm:rounded-[24px] border bg-card shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 md:p-8 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-[10px] bg-amber-500/10 flex-shrink-0">
                        <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{mod.examSettings.title || (t("moduleExam") || "Module Exam")}</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{mod.examSettings.question_count} {t("questions") || "questions"} · {mod.examSettings.duration_minutes} min · {t("passingScore") || "Passing"}: {mod.examSettings.passing_percentage}%</p>
                      </div>
                    </div>
                    {attempts > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="text-center p-2 sm:p-3 bg-secondary rounded-lg">
                          <div className="text-base sm:text-lg font-bold">{attempts}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{t("attempts") || "Attempts"}</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-secondary rounded-lg">
                          <div className="text-base sm:text-lg font-bold">{bestScore !== undefined ? `${bestScore}%` : "--"}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{t("bestScore") || "Best Score"}</div>
                        </div>
                        <div className="text-center p-2 sm:p-3 bg-secondary rounded-lg">
                          <div className={`text-base sm:text-lg font-bold ${passed ? "text-green-600" : "text-red-600"}`}>{passed ? (t("passed") || "Passed") : (t("notYet") || "Not Yet")}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{t("status") || "Status"}</div>
                        </div>
                      </div>
                    )}
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3">
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">{t("examRequiredToProceed") || "You must take this exam (pass or fail) to complete the module and unlock the next one."}</p>
                    </div>
                    <Button size="lg" className="w-full" onClick={() => startModuleExam(mod.id, mod.examSettings?.title || mod.title)}>
                      <Play className="h-4 w-4 mr-2" />
                      {attempts > 0 ? (t("retakeExam") || "Retake Exam") : (t("startExam") || "Start Exam")}
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {(() => {
                if (currentItem && currentItem.type === "topic" && currentItem.topicCount && currentItem.topicCount > 1) {
                  const lessonTopics = parseTopics(currentLesson?.topics);
                  const carouselTopics: CarouselTopic[] = lessonTopics.map((tp) => {
                    const tpFlat = flatList.find((f) => f.type === "topic" && f.lessonId === currentItem.lessonId && f.topicId === tp.id);
                    const tpIdxInFlat = tpFlat ? flatList.indexOf(tpFlat) : -1;
                    return { id: tp.id, title: tp.title, content: tp.content, estimated_minutes: tp.estimated_minutes, flatIndex: tpIdxInFlat, isCompleted: tpFlat ? completedItems.has(itemKey(tpFlat)) : false, isUnlocked: tpIdxInFlat >= 0 && isItemUnlocked(tpIdxInFlat), isCurrent: currentItem.topicId === tp.id };
                  });
                  const activeCarouselIndex = carouselTopics.findIndex((tp) => tp.isCurrent);
                  return <TopicCarousel topics={carouselTopics} currentIndex={activeCarouselIndex >= 0 ? activeCarouselIndex : 0} onSelectTopic={(flatIdx) => setCurrentItemIndex(flatIdx)} onNext={() => void markCompleteAndAdvance()} formatMinutes={formatMinutes} noContentText={t("noContent") || "No content yet."} lessonTitle={currentItem.lessonTitle} />;
                }
                return (
                  <div className="rounded-[14px] sm:rounded-[24px] border bg-card shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 md:p-8 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {currentEstimatedTime > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(currentEstimatedTime)}</span>}
                          </div>
                          <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle}</h2>
                        </div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-hidden">
                        {currentContent ? <LessonContentView content={currentContent} /> : <p className="text-muted-foreground italic">{t("noContent") || "No content yet."}</p>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <Button variant="outline" size="sm" onClick={goToPrevious} disabled={currentItemIndex === 0} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("previous") || "Previous"}</span>
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{currentItemIndex + 1} / {totalItems}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentItem && !completedItems.has(itemKey(currentItem)) && isLastItemInLesson(currentItem) && (
                    <Button size="sm" onClick={() => void markCompleteAndAdvance()} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{currentItemIndex < totalItems - 1 ? (t("completeAndContinue") || "Complete & Continue") : (t("finishCourse") || "Finish Course")}</span>
                      <span className="sm:hidden">{currentItemIndex < totalItems - 1 ? (t("next") || "Next") : "✓"}</span>
                    </Button>
                  )}
                  {currentItem && completedItems.has(itemKey(currentItem)) && currentItemIndex < totalItems - 1 && (
                    <Button size="sm" onClick={goToNext} className="gap-1.5">
                      <span className="hidden sm:inline">{t("next") || "Next"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                  {currentItem && !completedItems.has(itemKey(currentItem)) && !isLastItemInLesson(currentItem) && currentItemIndex < totalItems - 1 && (
                    <Button size="sm" onClick={() => void markCompleteAndAdvance()} className="gap-1.5">
                      <span className="hidden sm:inline">{t("next") || "Next"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

    </div>
  );
}
