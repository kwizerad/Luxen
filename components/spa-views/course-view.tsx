"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { CourseViewSkeleton } from "@/components/skeletons";
import { useLanguage } from "@/lib/language-context";
import { useLearningLanguages } from "@/hooks/use-learning-languages";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Clock,
  CheckCircle2,
  Circle,
  Layers,
  ArrowRight,
  Play,
  FileText,
  Lock,
  Trophy,
  Shield,
  Home,
  ArrowLeft,
  Folder,
  FolderOpen,
  Volume2,
  Maximize2,
  Minimize2,
  Type,
  Pause,
  Sparkles,
  Award,
  BookMarked,
  RotateCcw,
  CheckSquare,
  Square,
  StickyNote,
} from "lucide-react";
import type { CourseLanguageCourse, CourseModule, CourseLesson, ModuleExamSettings } from "@/lib/database.types";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";
import { TopicAudioPlayer } from "@/components/topic-audio-player";
import { TopicNotes } from "@/components/topic-notes";
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
  audioUrl?: string;
  audio_url?: string;
}

const isLearningLanguage = (language: string): language is LearningLanguage =>
  LEARNING_LANGUAGES.includes(language as LearningLanguage);

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
      return { id: crypto.randomUUID(), title: t, content: "", estimated_minutes: 0 };
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

/**
 * Total estimated time for a lesson = sum of all its topic times.
 * If no topics have estimated minutes, fallback to estimated_reading_minutes or 5 min default.
 */
function lessonTime(lesson: CourseLesson): number {
  const topics = parseTopics(lesson.topics);
  const topicTime = topics.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  if (topicTime > 0) return topicTime;
  if (lesson.estimated_reading_minutes && lesson.estimated_reading_minutes > 0) {
    return lesson.estimated_reading_minutes;
  }
  return Math.max(1, topics.length * 3);
}

/**
 * Total module time = sum of all lessons in this module.
 */
function moduleTime(module: ModuleWithLessons): number {
  return module.lessons.reduce((sum, l) => sum + lessonTime(l), 0);
}

/**
 * Total course time = sum of all modules in this course.
 */
function courseTime(course: CourseWithModules): number {
  return course.modules.reduce((sum, m) => sum + moduleTime(m), 0);
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

export interface CourseViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params: URLSearchParams;
}

type TextSize = "sm" | "base" | "lg" | "xl";

export function CourseView({ navigate, params }: CourseViewProps) {
  const { t, language: interfaceLanguage } = useLanguage();
  const { enabledLanguages } = useLearningLanguages();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);

  // View state: "modules" (Course overview) | "module-lessons" (Selected module's lesson list) | "study" (Active reader)
  const [viewMode, setViewMode] = useState<"modules" | "module-lessons" | "study">("modules");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showLessonCompleteModal, setShowLessonCompleteModal] = useState(false);
  const [completedLessonMeta, setCompletedLessonMeta] = useState<{
    lessonTitle: string;
    topicsCount: number;
    timeSpentSeconds: number;
    nextLessonTitle?: string;
    hasNextLesson: boolean;
  } | null>(null);

  // Exam state
  const [activeExam, setActiveExam] = useState<{ type: ExamType; moduleId?: string; moduleTitle?: string } | null>(null);
  const [moduleProgress, setModuleProgress] = useState<Map<string, ModuleProgress>>(new Map());
  const [lessonProgress, setLessonProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Focus-aware Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFocusActive, setIsFocusActive] = useState(true);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lessonTotalSecondsRef = useRef<number>(0);

  // Accessibility & UX tools
  const [textSize, setTextSize] = useState<TextSize>("base");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [comprehensionChecked, setComprehensionChecked] = useState<Record<string, boolean>>({});

  // Touch swipe handling
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const flatList = useMemo(() => (course ? buildFlatList(course) : []), [course]);

  const itemKey = (item: FlatItem) =>
    item.type === "topic"
      ? `${item.lessonId}:${item.topicId}`
      : item.type === "exam"
      ? `exam:${item.moduleId}`
      : item.lessonId;

  const currentItem = flatList[currentItemIndex] || null;

  // Selected module object
  const currentModule = useMemo(() => {
    if (!course) return null;
    if (selectedModuleId) {
      return course.modules.find((m) => m.id === selectedModuleId) || course.modules[0] || null;
    }
    if (currentItem) {
      return course.modules.find((m) => m.id === currentItem.moduleId) || course.modules[0] || null;
    }
    return course.modules[0] || null;
  }, [course, selectedModuleId, currentItem]);

  // Current lesson object
  const currentLesson = useMemo(() => {
    if (!course || !currentItem) return null;
    const mod = course.modules.find((m) => m.id === currentItem.moduleId);
    return mod?.lessons.find((l) => l.id === currentItem.lessonId) || null;
  }, [course, currentItem]);

  // Current topic object
  const currentTopic = useMemo(() => {
    if (!currentItem || currentItem.type !== "topic") return null;
    const topics = parseTopics(currentLesson?.topics);
    return topics.find((tp) => tp.id === currentItem.topicId) || null;
  }, [currentItem, currentLesson]);

  // Auto-expand current lesson in sidebar
  useEffect(() => {
    if (currentItem?.lessonId) {
      setExpandedLessons((prev) => {
        if (prev.has(currentItem.lessonId)) return prev;
        const next = new Set(prev);
        next.add(currentItem.lessonId);
        return next;
      });
    }
  }, [currentItem?.lessonId]);

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

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
    if (course.modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(course.modules[0].id);
    }
    setLoading(false);
    await loadProgress(course);
  }, [loadProgress, selectedModuleId]);

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
  useEffect(() => {
    const lessonId = params.get("lesson");
    if (!lessonId || flatList.length === 0) return;
    const idx = flatList.findIndex((f) => f.lessonId === lessonId);
    if (idx >= 0) {
      setCurrentItemIndex(idx);
      setSelectedModuleId(flatList[idx].moduleId);
      setViewMode("study");
    }
  }, [params, flatList]);

  // Focus Detection: Pause timer if window/tab loses focus, resume on refocus
  useEffect(() => {
    const handleFocus = () => setIsFocusActive(true);
    const handleBlur = () => setIsFocusActive(false);
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsFocusActive(false);
      } else {
        setIsFocusActive(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Timer Tick: ticks only when active in study mode, on a valid topic/lesson, and window has focus
  useEffect(() => {
    if (
      viewMode !== "study" ||
      !currentItem ||
      currentItem.type === "exam" ||
      activeExam ||
      showLessonCompleteModal ||
      showCelebration ||
      !isFocusActive
    ) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      lessonTotalSecondsRef.current += 1;
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [viewMode, currentItem, activeExam, showLessonCompleteModal, showCelebration, isFocusActive]);

  // Reset per-topic elapsed time when switching topic/lesson
  useEffect(() => {
    setElapsedSeconds(0);
  }, [currentItemIndex]);

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

  /**
   * Unlock Logic:
   * Rule: User is allowed to view only the first lesson initially.
   * Other lessons unlock sequentially after completing previous lessons.
   */
  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    const lp = lessonProgress.get(lessonId);
    if (lp && lp.completed) return true;
    if (!course) return false;
    for (const mod of course.modules) {
      const lesson = mod.lessons.find((l) => l.id === lessonId);
      if (lesson) {
        const topics = parseTopics(lesson.topics);
        if (topics.length === 0) return completedItems.has(lesson.id);
        return topics.every((t) => completedItems.has(`${lesson.id}:${t.id}`));
      }
    }
    return false;
  }, [lessonProgress, course, completedItems]);

  const isModuleCompleted = useCallback((moduleId: string): boolean => {
    if (!course) return false;
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return false;
    const allLessonsDone = mod.lessons.length > 0 && mod.lessons.every((l) => isLessonCompleted(l.id));
    const mp = moduleProgress.get(moduleId);
    const examTaken = (mp?.exam_attempts || 0) > 0;
    return allLessonsDone && (examTaken || !mod.examSettings);
  }, [course, isLessonCompleted, moduleProgress]);

  const isModuleUnlocked = useCallback((modIdx: number): boolean => {
    if (modIdx === 0) return true;
    if (!course) return false;
    const prevMod = course.modules[modIdx - 1];
    return prevMod ? isModuleCompleted(prevMod.id) : false;
  }, [course, isModuleCompleted]);

  const isLessonUnlocked = useCallback((moduleId: string, lessonIdx: number): boolean => {
    if (!course) return false;
    const modIdx = course.modules.findIndex((m) => m.id === moduleId);
    if (modIdx < 0 || !isModuleUnlocked(modIdx)) return false;

    // First lesson in an unlocked module is unlocked
    if (lessonIdx === 0) return true;

    // Subsequent lessons unlock ONLY after the previous lesson is completed!
    const mod = course.modules[modIdx];
    const prevLesson = mod.lessons[lessonIdx - 1];
    return prevLesson ? isLessonCompleted(prevLesson.id) : false;
  }, [course, isModuleUnlocked, isLessonCompleted]);

  const isItemUnlocked = useCallback((index: number): boolean => {
    if (index === 0) return true;
    const item = flatList[index];
    if (!item) return false;
    if (completedItems.has(itemKey(item))) return true;

    // Find the lesson and module for this item
    const modIdx = course?.modules.findIndex((m) => m.id === item.moduleId) ?? -1;
    if (modIdx < 0 || !isModuleUnlocked(modIdx)) return false;

    const mod = course?.modules[modIdx];
    const lessonIdx = mod?.lessons.findIndex((l) => l.id === item.lessonId) ?? -1;
    if (lessonIdx < 0 || !isLessonUnlocked(item.moduleId, lessonIdx)) return false;

    // For topics within the unlocked lesson
    if (item.type === "topic" && item.topicIndex !== undefined && item.topicIndex > 0) {
      const prevTopic = flatList[index - 1];
      return prevTopic ? completedItems.has(itemKey(prevTopic)) : false;
    }

    return true;
  }, [flatList, completedItems, course, isModuleUnlocked, isLessonUnlocked]);

  const isLastItemInLesson = (item: FlatItem | null): boolean => {
    if (!item) return false;
    const lessonItems = flatList.filter((f) => f.lessonId === item.lessonId && f.type !== "exam");
    const lastLessonItem = lessonItems[lessonItems.length - 1];
    return lastLessonItem ? itemKey(item) === itemKey(lastLessonItem) : false;
  };

  const saveLessonProgress = useCallback(async (item: FlatItem, isFullyCompleted = true) => {
    if (item.type === "exam") return;
    const timeSpent = Math.max(elapsedSeconds, 1);

    const mod = course?.modules.find((m) => m.id === item.moduleId);
    const lesson = mod?.lessons.find((l) => l.id === item.lessonId);
    const estimatedSeconds = lesson ? lessonTime(lesson) * 60 : 0;
    const exceededSeconds = estimatedSeconds > 0 ? Math.max(0, timeSpent - estimatedSeconds) : 0;
    const countedTime = estimatedSeconds > 0 ? Math.min(timeSpent, estimatedSeconds) : timeSpent;

    try {
      await upsertLessonProgress(item.lessonId, item.moduleId, isFullyCompleted, timeSpent, exceededSeconds);
      await updateModuleTimeSpent(item.moduleId, countedTime, exceededSeconds);
      if (isFullyCompleted) {
        setLessonProgress((prev) => {
          const next = new Map(prev);
          next.set(item.lessonId, { lesson_id: item.lessonId, module_id: item.moduleId, completed: true });
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to save lesson progress:", error);
    }
  }, [course, elapsedSeconds]);

  /**
   * Mark current topic / lesson complete and advance.
   * Requirement: NO animation or complete popup on topic completion.
   * Animation is ONLY shown on completing the entire lesson!
   */
  const markCompleteAndAdvance = async () => {
    if (!currentItem) return;
    const key = itemKey(currentItem);
    const newCompleted = new Set(completedItems);
    newCompleted.add(key);
    setCompletedItems(newCompleted);

    const wasLastInLesson = isLastItemInLesson(currentItem);

    if (wasLastInLesson) {
      await saveLessonProgress(currentItem, true);
      const nextItem = flatList[currentItemIndex + 1];

      setCompletedLessonMeta({
        lessonTitle: currentItem.lessonTitle,
        topicsCount: currentItem.topicCount || 1,
        timeSpentSeconds: lessonTotalSecondsRef.current || elapsedSeconds || 60,
        nextLessonTitle: nextItem ? (nextItem.type === "topic" ? nextItem.lessonTitle : nextItem.moduleTitle) : undefined,
        hasNextLesson: currentItemIndex < flatList.length - 1,
      });
      lessonTotalSecondsRef.current = 0;
      setShowLessonCompleteModal(true);
      return;
    }

    // Save intermediate progress without marking full lesson complete
    void saveLessonProgress(currentItem, false);

    // Intermediate topic: Smooth and instant transition with ZERO distracting popup animation!
    if (currentItemIndex < flatList.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentItemIndex < flatList.length - 1) {
      const nextIndex = currentItemIndex + 1;
      if (isItemUnlocked(nextIndex)) {
        setCurrentItemIndex(nextIndex);
      }
    }
  };

  // Keyboard navigation: ArrowLeft / ArrowRight to navigate topics
  useEffect(() => {
    if (viewMode !== "study" || activeExam || showLessonCompleteModal || showCelebration) return;

    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

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
  }, [viewMode, activeExam, showLessonCompleteModal, showCelebration, currentItemIndex, currentItem, completedItems, flatList]);

  // Touch Swipe Handlers for mobile and tablet navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;
    const minSwipeDistance = 75;

    // Only trigger if horizontal swipe is clearly dominant over vertical scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swiped Left -> Go to Next
        if (currentItem && !completedItems.has(itemKey(currentItem)) && currentItemIndex < flatList.length - 1) {
          void markCompleteAndAdvance();
        } else {
          goToNext();
        }
      } else {
        // Swiped Right -> Go to Previous
        goToPrevious();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  const openModuleLessons = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setViewMode("module-lessons");
  };

  const startLesson = (moduleId: string, lessonId: string) => {
    const targetIdx = flatList.findIndex((f) => f.moduleId === moduleId && f.lessonId === lessonId);
    if (targetIdx >= 0 && isItemUnlocked(targetIdx)) {
      setSelectedModuleId(moduleId);
      setCurrentItemIndex(targetIdx);
      setViewMode("study");
    }
  };

  const startModule = (moduleId: string) => {
    const firstInModule = flatList.findIndex((f) => f.moduleId === moduleId);
    if (firstInModule >= 0 && isItemUnlocked(firstInModule)) {
      setSelectedModuleId(moduleId);
      setCurrentItemIndex(firstInModule);
      setViewMode("study");
    } else {
      openModuleLessons(moduleId);
    }
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

  const continueToNextLesson = () => {
    setShowLessonCompleteModal(false);
    if (currentItemIndex < flatList.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const backToModuleLessonsFromModal = () => {
    setShowLessonCompleteModal(false);
    if (currentItem) {
      setSelectedModuleId(currentItem.moduleId);
      setViewMode("module-lessons");
    } else {
      setViewMode("modules");
    }
  };

  // Progress Computations: Module Progress & Lesson Progress ONLY
  const activeModuleLessons = currentModule?.lessons || [];
  const activeModuleCompletedLessonsCount = activeModuleLessons.filter((l) => isLessonCompleted(l.id)).length;
  const activeModuleProgressPct =
    activeModuleLessons.length > 0
      ? Math.round((activeModuleCompletedLessonsCount / activeModuleLessons.length) * 100)
      : 0;

  const currentLessonTopics = currentLesson ? parseTopics(currentLesson.topics) : [];
  const currentLessonCompletedTopicsCount = currentLessonTopics.filter((tp) =>
    completedItems.has(`${currentLesson?.id}:${tp.id}`)
  ).length;
  const currentLessonProgressPct =
    currentLessonTopics.length > 0
      ? Math.round((currentLessonCompletedTopicsCount / currentLessonTopics.length) * 100)
      : isLessonCompleted(currentLesson?.id || "") ? 100 : 0;

  const currentContent =
    currentItem?.type === "topic"
      ? currentTopic?.content || ""
      : currentLesson?.content || "";

  const currentEstimatedMinutes =
    currentItem?.type === "topic"
      ? currentTopic?.estimated_minutes || 3
      : currentLesson ? lessonTime(currentLesson) : 5;

  if (loading) {
    return <CourseViewSkeleton />;
  }

  if (!learningLanguage) {
    return (
      <div className="max-w-xl mx-auto rounded-[20px] border bg-card p-6 sm:p-8 space-y-6 shadow-sm mt-8">
        <div className="text-center space-y-2">
          <BookOpen className="h-10 w-10 mx-auto text-primary-readable" />
          <h1 className="text-2xl font-bold">{t("chooseLearningLanguage") || "Choose the language you want to study in"}</h1>
          <p className="text-sm text-muted-foreground">{t("learningLanguageSeparate") || "Your learning language is separate from the application interface language."}</p>
        </div>
        <div className="grid gap-3">
          {enabledLanguages.map((option) => (
            <Button key={option} type="button" variant="outline" className="h-12 justify-start font-medium text-sm rounded-xl" disabled={savingLanguage} onClick={() => void selectLearningLanguage(option)}>
              {option === "English" ? "English" : option === "French" ? "Français" : "Kinyarwanda"}
            </Button>
          ))}
          {enabledLanguages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noLearningLanguagesAvailable") || "No learning languages are currently available. Please contact an administrator."}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16 border border-dashed rounded-[20px] bg-muted/40 max-w-2xl mx-auto mt-8 p-8">
        <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-lg font-semibold">{t("noCoursesAvailable") || "No courses available"}</p>
        <p className="text-sm text-muted-foreground mt-1">{(t("noPublishedCourse") || "There is no published {language} course right now.").replace("{language}", learningLanguage)}</p>
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
        onExit={() => setActiveExam(null)}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: MODULES LIST (Course Level)
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewMode === "modules") {
    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Course Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="space-y-1">
            <button
              onClick={() => navigate("back", { fallback: "home" })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back") || t("backToHome") || "Back"}
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary-readable shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{course.title}</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {course.modules.length} {t("modules") || "Modules"} · {formatMinutes(courseTime(course))} {t("totalEstimatedTime") || "total study time"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {course.modules.some((m) => isModuleCompleted(m.id)) && (
              <Button
                onClick={() => {
                  const firstUnfinished = flatList.findIndex((item) => !completedItems.has(itemKey(item)));
                  const targetIdx = firstUnfinished >= 0 ? firstUnfinished : 0;
                  setCurrentItemIndex(targetIdx);
                  setSelectedModuleId(flatList[targetIdx].moduleId);
                  setViewMode("study");
                }}
                className="gap-2 font-medium shadow-xs"
              >
                <Play className="h-4 w-4" />
                {t("resumeLearning") || "Resume Course"}
              </Button>
            )}
          </div>
        </div>

        {/* Modules Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("courseModules") || "Course Modules"}
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {course.modules.length} {course.modules.length === 1 ? (t("module") || "Module") : (t("modules") || "Modules")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {course.modules.map((module, modIdx) => {
              const isUnlocked = isModuleUnlocked(modIdx);
              const isComplete = isModuleCompleted(module.id);
              const totalLessons = module.lessons.length;
              const completedLessonsCount = module.lessons.filter((l) => isLessonCompleted(l.id)).length;
              const modulePct = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
              const calcModuleTime = moduleTime(module);

              return (
                <div
                  key={module.id}
                  onClick={() => isUnlocked && openModuleLessons(module.id)}
                  className={cn(
                    "relative flex flex-col justify-between rounded-[20px] border bg-card p-5 sm:p-6 transition-all space-y-4 shadow-sm",
                    isUnlocked
                      ? "hover:border-primary/50 hover:shadow-md cursor-pointer group"
                      : "opacity-60 cursor-not-allowed bg-muted/30"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center h-12 w-12 rounded-[14px] shrink-0 font-bold text-sm",
                          isComplete
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : isUnlocked
                            ? "bg-primary/10 text-primary-readable"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : isUnlocked ? (
                          <Layers className="h-6 w-6" />
                        ) : (
                          <Lock className="h-5 w-5" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted">
                          {t("module") || "Module"} {modIdx + 1}
                        </span>
                        {isComplete && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                            {t("completed") || "Completed"}
                          </span>
                        )}
                        {!isComplete && isUnlocked && completedLessonsCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary-readable font-semibold">
                            {t("inProgress") || "In Progress"}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> {t("locked") || "Locked"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary-readable transition-colors line-clamp-2">
                        {module.title}
                      </h3>

                      {module.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap font-medium">
                      <span>{totalLessons} {t("lessons") || "Lessons"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(calcModuleTime)}
                      </span>
                      {module.examSettings && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <FileText className="h-3 w-3" />
                          {t("moduleExam") || "Module Exam"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    {/* Module Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{t("moduleProgress") || "Module Progress"}</span>
                        <span>{completedLessonsCount} / {totalLessons} ({modulePct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${modulePct}%` }}
                        />
                      </div>
                    </div>

                    {isUnlocked && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModuleLessons(module.id);
                        }}
                        variant="outline"
                        className="w-full gap-1.5 rounded-xl font-medium text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent transition-colors"
                      >
                        <span>{t("viewLessons") || "View Lessons"}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: MODULE LESSONS (Selected Module Detail)
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewMode === "module-lessons" && currentModule) {
    const modIdx = course.modules.findIndex((m) => m.id === currentModule.id);
    const totalLessons = currentModule.lessons.length;
    const completedLessonsCount = currentModule.lessons.filter((l) => isLessonCompleted(l.id)).length;
    const modulePct = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

    return (
      <div className="min-h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="space-y-2 border-b pb-5">
          <button
            onClick={() => setViewMode("modules")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("allModules") || "All Modules"}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-readable px-2 py-0.5 rounded-full bg-primary/10">
              {t("module") || "Module"} {modIdx + 1}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              {currentModule.title}
            </h1>
          </div>

          {currentModule.description && (
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {currentModule.description}
            </p>
          )}

          {/* Module Progress Overview */}
          <div className="rounded-[16px] border bg-card p-4 space-y-2 mt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">{t("moduleProgress") || "Module Progress"}</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {completedLessonsCount} of {totalLessons} {t("lessonsMastered") || "Lessons Mastered"} ({modulePct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${modulePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("availableLessons") || "Available Lessons"}
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              {t("sequentialUnlockingNote") || "Lessons unlock sequentially as you complete them"}
            </span>
          </div>

          <div className="space-y-3">
            {currentModule.lessons.map((lesson, lessonIdx) => {
              const isUnlocked = isLessonUnlocked(currentModule.id, lessonIdx);
              const isComplete = isLessonCompleted(lesson.id);
              const topics = parseTopics(lesson.topics);
              const calcLessonTime = lessonTime(lesson);

              return (
                <div
                  key={lesson.id}
                  className={cn(
                    "rounded-[18px] border p-4 sm:p-5 transition-all space-y-3",
                    isUnlocked
                      ? "bg-card hover:border-primary/50 shadow-xs"
                      : "bg-muted/30 border-dashed opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-[12px] shrink-0 font-bold text-xs",
                          isComplete
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : isUnlocked
                            ? "bg-primary/10 text-primary-readable"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isUnlocked ? (
                          <span>{lessonIdx + 1}</span>
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {t("lesson") || "Lesson"} {lessonIdx + 1}
                          </span>
                          {isComplete && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                              {t("completed") || "Completed"}
                            </span>
                          )}
                          {!isUnlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" /> {t("completePreviousLessonToUnlock") || "Locked · Complete prior lesson"}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-foreground truncate">
                          {lesson.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                          <span>{topics.length} {t("topics") || "Topics"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMinutes(calcLessonTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-center">
                      {isUnlocked ? (
                        <Button
                          size="sm"
                          onClick={() => startLesson(currentModule.id, lesson.id)}
                          className={cn(
                            "gap-1.5 rounded-xl font-medium text-xs",
                            isComplete ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : ""
                          )}
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{isComplete ? (t("reviewLesson") || "Review") : (t("startLesson") || "Start Lesson")}</span>
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-lg">
                          <Lock className="h-3.5 w-3.5" />
                          <span>{t("locked") || "Locked"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Module Exam Card if available */}
            {currentModule.examSettings && (
              <div className="rounded-[18px] border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[12px] bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                        {t("moduleExam") || "Module Exam"}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base">{currentModule.examSettings.title || "Module Test"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {currentModule.examSettings.question_count} {t("questions") || "questions"} · {currentModule.examSettings.duration_minutes} min
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => startModuleExam(currentModule.id, currentModule.examSettings?.title || currentModule.title)}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{t("takeExam") || "Take Exam"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE LESSON & TOPIC STUDY VIEW ("study")
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] flex flex-col transition-all overflow-x-clip touch-pan-y",
        isFocusMode ? "bg-background fixed inset-0 z-50 overflow-y-auto" : ""
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Celebration Overlay for Final Course Completion */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs animate-[fadeIn_0.3s_ease-out]" />
          <div className="relative z-10 text-center space-y-4 animate-[scaleIn_0.4s_ease-out] p-6 bg-card border-2 border-emerald-500 rounded-[28px] shadow-2xl">
            <div className="text-6xl animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold tracking-tight">{t("courseCompleted") || "Course Completed!"}</h2>
            <p className="text-base text-muted-foreground">{t("congratulations") || "Congratulations on finishing all modules!"}</p>
          </div>
        </div>
      )}

      {/* Lesson Complete Celebration Modal (Triggered ONLY on lesson completion) */}
      {showLessonCompleteModal && completedLessonMeta && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="relative max-w-md w-full rounded-[24px] border-2 border-emerald-500/40 bg-card shadow-2xl p-6 sm:p-8 space-y-6 animate-[scaleIn_0.3s_ease-out]">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Award className="h-9 w-9 animate-pulse" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                {t("lessonMastered") || "Lesson Mastered!"}
              </span>
              <h2 className="text-2xl font-bold tracking-tight">{completedLessonMeta.lessonTitle}</h2>
              <p className="text-xs text-muted-foreground">
                {t("lessonCompletedSummary") || "You have successfully finished all topics in this lesson."}
              </p>
            </div>

            {/* Achievement Badges & Stats */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="rounded-[14px] bg-secondary/60 p-3 text-center space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t("topicsMastered") || "Topics Mastered"}</span>
                <p className="text-lg font-bold">{completedLessonMeta.topicsCount}</p>
              </div>
              <div className="rounded-[14px] bg-secondary/60 p-3 text-center space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t("studyTime") || "Study Time"}</span>
                <p className="text-lg font-bold">{formatTimer(completedLessonMeta.timeSpentSeconds)}</p>
              </div>
            </div>

            {/* Next Lesson Preview */}
            {completedLessonMeta.hasNextLesson && completedLessonMeta.nextLessonTitle && (
              <div className="rounded-[14px] border bg-emerald-500/5 border-emerald-500/20 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t("nextUp") || "Next Up"}
                </span>
                <p className="text-xs font-semibold text-foreground truncate">
                  {completedLessonMeta.nextLessonTitle}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {completedLessonMeta.hasNextLesson ? (
                <Button
                  size="lg"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                  onClick={continueToNextLesson}
                >
                  <ArrowRight className="h-4 w-4" />
                  {t("continueToNextLesson") || "Continue to Next Lesson"}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
                  onClick={backToModuleLessonsFromModal}
                >
                  <Trophy className="h-4 w-4" />
                  {t("viewModuleSummary") || "Module Completed · View Summary"}
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 rounded-xl font-medium"
                onClick={backToModuleLessonsFromModal}
              >
                <BookMarked className="h-4 w-4" />
                {t("backToLessons") || "Back to Lessons List"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Lost Paused Alert Banner */}
      {!isFocusActive && (
        <div
          onClick={() => setIsFocusActive(true)}
          className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 cursor-pointer sticky top-0 z-40"
        >
          <Pause className="h-3.5 w-3.5 shrink-0" />
          <span>{t("studyTimerPausedFocusLost") || "Study timer paused (Focus lost) — Click anywhere to resume studying"}</span>
        </div>
      )}

      {/* Top Study Navigation Bar */}
      <div className="border-b bg-card/80 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <button
            onClick={() => setViewMode("modules")}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium shrink-0 hidden sm:inline"
          >
            {t("course") || "Course"}
          </button>
          <span className="text-muted-foreground/40 hidden sm:inline">/</span>
          <button
            onClick={() => {
              if (currentItem) {
                setSelectedModuleId(currentItem.moduleId);
                setViewMode("module-lessons");
              } else {
                setViewMode("modules");
              }
            }}
            className="text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[120px] sm:max-w-[180px]"
            title={currentItem?.moduleTitle}
          >
            {currentItem?.moduleTitle}
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-[220px]">
            {currentItem?.lessonTitle}
          </span>
        </div>

        {/* Action / Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Topic Timer */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border transition-colors",
              isFocusActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            )}
            title="Active Topic Timer"
          >
            <Clock className={cn("h-3 w-3", isFocusActive && "animate-pulse")} />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Text Size Control */}
          <div className="hidden sm:flex items-center border rounded-lg bg-background p-0.5">
            <button
              type="button"
              onClick={() => setTextSize("sm")}
              className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", textSize === "sm" ? "bg-muted text-foreground" : "text-muted-foreground")}
              title="Small text"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setTextSize("base")}
              className={cn("px-1.5 py-0.5 rounded text-xs font-bold", textSize === "base" ? "bg-muted text-foreground" : "text-muted-foreground")}
              title="Normal text"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setTextSize("lg")}
              className={cn("px-1.5 py-0.5 rounded text-sm font-bold", textSize === "lg" ? "bg-muted text-foreground" : "text-muted-foreground")}
              title="Large text"
            >
              A+
            </button>
          </div>

          {/* Scratchpad / Notes Toggle */}
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-medium transition-colors",
              showNotes ? "bg-amber-500/15 border-amber-500/30 text-amber-600" : "bg-background hover:bg-muted text-muted-foreground"
            )}
            title="Study notes & scratchpad"
          >
            <StickyNote className="h-4 w-4" />
          </button>

          {/* Distraction-Free Focus Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground transition-colors"
            title={isFocusMode ? "Exit Fullscreen" : "Distraction-Free Mode"}
          >
            {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Study Layout */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar (Collapsible on Desktop, Folder Navigator) */}
        {!isFocusMode && (
          <aside
            className={cn(
              "border-r bg-card/50 transition-all duration-300 flex flex-col shrink-0",
              isSidebarOpen ? "w-64" : "w-12",
              "hidden lg:flex"
            )}
          >
            <div className="flex items-center justify-between p-2.5 border-b h-11">
              {isSidebarOpen ? (
                <>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {t("moduleLessons") || "Module Lessons"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1 mx-auto rounded hover:bg-muted text-muted-foreground"
                  title="Expand sidebar"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {isSidebarOpen && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {currentModule?.lessons.map((lesson, lIdx) => {
                  const isUnlocked = isLessonUnlocked(currentModule.id, lIdx);
                  const isComplete = isLessonCompleted(lesson.id);
                  const isCurrent = currentItem?.lessonId === lesson.id;
                  const isExpanded = expandedLessons.has(lesson.id);
                  const topics = parseTopics(lesson.topics);

                  return (
                    <div key={lesson.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          toggleLessonExpand(lesson.id);
                          if (isUnlocked && !isCurrent) {
                            startLesson(currentModule.id, lesson.id);
                          }
                        }}
                        disabled={!isUnlocked}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left group",
                          isCurrent
                            ? "bg-primary/10 text-primary-readable font-bold"
                            : isUnlocked
                            ? "hover:bg-muted text-foreground"
                            : "opacity-40 cursor-not-allowed text-muted-foreground"
                        )}
                      >
                        <span className="p-0.5 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </span>
                        {isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : isExpanded ? (
                          <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : isUnlocked ? (
                          <Folder className="h-3.5 w-3.5 text-amber-500/80 shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 truncate">{lesson.title}</span>
                      </button>

                      {isExpanded && topics.length > 0 && (
                        <div className="ml-4 pl-2 border-l border-border/60 space-y-0.5">
                          {topics.map((tp, tpIdx) => {
                            const isTpCurrent = currentItem?.type === "topic" && currentItem.topicId === tp.id;
                            const isTpDone = completedItems.has(`${lesson.id}:${tp.id}`);
                            const targetIdx = flatList.findIndex((f) => f.lessonId === lesson.id && f.topicId === tp.id);
                            const isTpUnlocked = targetIdx >= 0 && isItemUnlocked(targetIdx);

                            return (
                              <button
                                key={tp.id}
                                type="button"
                                onClick={() => isTpUnlocked && targetIdx >= 0 && setCurrentItemIndex(targetIdx)}
                                disabled={!isTpUnlocked}
                                className={cn(
                                  "w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-all text-left",
                                  isTpCurrent
                                    ? "bg-emerald-600 text-white font-semibold shadow-xs"
                                    : isTpDone
                                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-muted"
                                    : isTpUnlocked
                                    ? "hover:bg-muted text-foreground"
                                    : "opacity-40 cursor-not-allowed text-muted-foreground"
                                )}
                              >
                                {isTpDone ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                ) : isTpCurrent ? (
                                  <FileText className="h-3 w-3 shrink-0 text-white" />
                                ) : isTpUnlocked ? (
                                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                                ) : (
                                  <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
                                )}
                                <span className="flex-1 truncate">{tp.title}</span>
                                {tp.audioUrl && (
                                  <Volume2 className={cn("h-3 w-3 shrink-0", isTpCurrent ? "text-white/80" : "text-emerald-500")} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}

        {/* Center Reader Content Canvas */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto overflow-x-hidden">
          {/* Progress Indicators: Module Progress and Lesson Progress ONLY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Module Progress */}
            <div className="rounded-[16px] border bg-card/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary-readable" />
                  {t("moduleProgress") || "Module Progress"}
                </span>
                <span className="text-foreground">
                  {activeModuleCompletedLessonsCount} / {activeModuleLessons.length} {t("lessons") || "Lessons"} ({activeModuleProgressPct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${activeModuleProgressPct}%` }}
                />
              </div>
            </div>

            {/* Lesson Progress */}
            <div className="rounded-[16px] border bg-card/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary-readable" />
                  {t("lessonProgress") || "Lesson Progress"}
                </span>
                <span className="text-foreground">
                  {currentLessonTopics.length > 0
                    ? `${currentLessonCompletedTopicsCount} / ${currentLessonTopics.length} Topics (${currentLessonProgressPct}%)`
                    : isLessonCompleted(currentLesson?.id || "")
                    ? "100%"
                    : "0%"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${currentLessonProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main Topic / Reading Card */}
          <div className="rounded-[20px] border bg-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-8 space-y-6">
              {/* Topic Header & Meta */}
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground font-semibold">
                      {currentItem?.type === "topic" && currentItem.topicIndex !== undefined
                        ? `Topic ${currentItem.topicIndex + 1} of ${currentItem.topicCount}`
                        : "Lesson"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatMinutes(currentEstimatedMinutes)} {t("readingTime") || "reading"}
                    </span>
                  </div>

                  {currentItem && completedItems.has(itemKey(currentItem)) && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("completed") || "Completed"}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle}
                </h1>
              </div>

              {/* Advanced Audio Player if Topic has Audio */}
              {currentTopic?.audioUrl && (
                <TopicAudioPlayer
                  audioUrl={currentTopic.audioUrl}
                  topicTitle={currentTopic.title}
                />
              )}

              {/* Topic Body Content */}
              <div className="w-full transition-all leading-relaxed">
                {currentContent ? (
                  <LessonContentView content={currentContent} textSize={textSize} />
                ) : (
                  <p className="text-muted-foreground italic">{t("noContent") || "No content available yet."}</p>
                )}
              </div>

              {/* Study Scratchpad & Notes Drawer if toggled */}
              {showNotes && currentTopic && currentLesson && (
                <div className="pt-4 border-t">
                  <TopicNotes
                    topicId={currentTopic.id}
                    topicTitle={currentTopic.title}
                    lessonTitle={currentLesson.title}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation Toolbar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={currentItemIndex === 0}
              className="gap-1.5 rounded-xl font-medium text-xs sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t("previousTopic") || "Previous"}</span>
            </Button>

            <div className="text-xs text-muted-foreground font-semibold tabular-nums">
              {currentItemIndex + 1} / {flatList.length}
            </div>

            <div className="flex items-center gap-2">
              {currentItem && isLastItemInLesson(currentItem) ? (
                <Button
                  size="sm"
                  onClick={() => void markCompleteAndAdvance()}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t("completeLesson") || "Complete Lesson"}</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void markCompleteAndAdvance()}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-xs sm:text-sm shadow-sm"
                >
                  <span>{t("nextTopic") || "Next"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
