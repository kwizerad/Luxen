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
  Languages,
  Loader2,
  Columns2,
  Lightbulb,
  Play,
  Volume2,
  VolumeX,
  Keyboard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CourseLanguageCourse, CourseModule, CourseLesson, ModuleExamSettings } from "@/lib/database.types";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";
import { TopicAudioPlayer } from "@/components/topic-audio-player";
import { TopicNotes } from "@/components/topic-notes";
import { TermLookupTooltip } from "@/components/course/term-lookup-tooltip";
import { PlainLanguageCard, type PlainLanguageData } from "@/components/course/plain-language-card";
import { AINeuralVoicePlayer } from "@/components/course/ai-neural-voice-player";
import { ModuleExamRunner, type ExamType } from "@/components/module-exam-runner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadCourseByLanguage } from "@/app/dashboard/actions/course";
import { spaCache } from "@/lib/spa-cache";
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

function extractPlainText(content: any): string {
  if (!content) return "";
  if (typeof content === "string") {
    if (content.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(content);
        return extractFromTiptapNode(parsed);
      } catch {
        // fall through to regex
      }
    }
    return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  if (typeof content === "object") {
    return extractFromTiptapNode(content);
  }
  return "";
}

function extractFromTiptapNode(node: any): string {
  if (!node) return "";
  let text = "";
  if (node.text) text += node.text + " ";
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractFromTiptapNode(child);
    }
  }
  return text.trim();
}

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

  // Focus-aware Timer state: tracks continuous study time in current lesson & topic
  const [lessonElapsedSeconds, setLessonElapsedSeconds] = useState(0);
  const [topicElapsedSeconds, setTopicElapsedSeconds] = useState(0);
  const [isFocusActive, setIsFocusActive] = useState(true);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentLessonIdRef = useRef<string | null>(null);
  const topicTimesRef = useRef<Record<string, number>>({});

  // Accessibility & UX tools
  const [textSize, setTextSize] = useState<TextSize>("base");
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [comprehensionChecked, setComprehensionChecked] = useState<Record<string, boolean>>({});

  // AI Note translation & Study Booster state
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [translatedLang, setTranslatedLang] = useState<"English" | "French" | "Kinyarwanda" | null>(null);
  const [isTranslatingNote, setIsTranslatingNote] = useState(false);
  const [pendingLang, setPendingLang] = useState<string | null>(null);

  // Side-by-side Dual View (PC Mode)
  const [isDualView, setIsDualView] = useState(false);

  // Plain Terms Legal Explainer
  const [isPlainLanguageOpen, setIsPlainLanguageOpen] = useState(false);
  const [plainData, setPlainData] = useState<PlainLanguageData | null>(null);
  const [isLoadingPlain, setIsLoadingPlain] = useState(false);

  // AI Cloud Neural Voice Player
  const [isTTSOpen, setIsTTSOpen] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);

  // Instant In-Memory Caches (0ms response on revisit)
  const translationCacheRef = useRef<Map<string, { content: string; title: string }>>(new Map());
  const plainCacheRef = useRef<Map<string, PlainLanguageData>>(new Map());
  const ttsCacheRef = useRef<Map<string, string>>(new Map());

  // Interactive Floating Term Gloss
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [termPosition, setTermPosition] = useState<{ x: number; y: number } | null>(null);

  // Reset transient translation on topic change
  useEffect(() => {
    setTranslatedContent(null);
    setTranslatedTitle(null);
    setTranslatedLang(null);
    setPlainData(null);
    setIsPlainLanguageOpen(false);
    setIsTTSOpen(false);
    setTtsAudioUrl(null);
    setSelectedTerm(null);
    setTermPosition(null);
  }, [currentItemIndex]);

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

    const cachedCourse = spaCache.get<CourseWithModules>(`spa_course_${selectedLanguage}`);
    if (cachedCourse) {
      setCourse(cachedCourse);
      if (cachedCourse.modules.length > 0 && !selectedModuleId) {
        setSelectedModuleId(cachedCourse.modules[0].id);
      }
      setLoading(false);
      void loadProgress(cachedCourse);
    } else {
      setLoading(true);
    }

    const { course } = await loadCourseByLanguage(selectedLanguage);
    if (!course) {
      if (!cachedCourse) {
        setCourse(null);
        setLoading(false);
      }
      return;
    }

    spaCache.set(`spa_course_${selectedLanguage}`, course);
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

  // Deep-linking: jump to a specific topic or lesson via ?lesson=<id>&topic=<id>
  useEffect(() => {
    const lessonId = params.get("lesson") || params.get("lessonId");
    const topicId = params.get("topic") || params.get("topicId");
    const moduleId = params.get("module") || params.get("moduleId");

    if ((!lessonId && !topicId && !moduleId) || flatList.length === 0) return;

    let targetIdx = -1;

    // 1. Try finding exact topic
    if (topicId) {
      targetIdx = flatList.findIndex((f) => f.topicId === topicId || f.lessonId === topicId);
    }

    // 2. Try finding lesson, preferring first uncompleted topic in that lesson
    if (targetIdx < 0 && lessonId) {
      targetIdx = flatList.findIndex(
        (f) => f.lessonId === lessonId && !completedItems.has(itemKey(f))
      );
      if (targetIdx < 0) {
        targetIdx = flatList.findIndex((f) => f.lessonId === lessonId);
      }
    }

    // 3. Fallback to module
    if (targetIdx < 0 && moduleId) {
      targetIdx = flatList.findIndex(
        (f) => f.moduleId === moduleId && !completedItems.has(itemKey(f))
      );
      if (targetIdx < 0) {
        targetIdx = flatList.findIndex((f) => f.moduleId === moduleId);
      }
    }

    if (targetIdx >= 0) {
      setCurrentItemIndex(targetIdx);
      setSelectedModuleId(flatList[targetIdx].moduleId);
      setViewMode("study");
    }
  }, [params, flatList, completedItems]);

  // Persist last active topic and study position in localStorage for cross-view resumption
  useEffect(() => {
    if (viewMode === "study" && currentItem && currentItem.type !== "exam") {
      try {
        const itemInfo = {
          courseId: course?.id,
          language: learningLanguage,
          moduleId: currentItem.moduleId,
          moduleTitle: currentItem.moduleTitle,
          lessonId: currentItem.lessonId,
          lessonTitle: currentItem.lessonTitle,
          topicId: currentItem.topicId || "",
          topicTitle: currentItem.topicTitle || "",
          topicIndex: currentItem.topicIndex ?? 0,
          topicCount: currentItem.topicCount ?? 0,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("luxen_last_topic_global", JSON.stringify(itemInfo));
        if (learningLanguage) {
          localStorage.setItem(`luxen_last_topic_${learningLanguage}`, JSON.stringify(itemInfo));
        }
      } catch {}
    }
  }, [viewMode, currentItem, course?.id, learningLanguage]);

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

  // Track lesson switching vs topic switching within the same lesson
  useEffect(() => {
    if (!currentItem) return;
    const lessonId = currentItem.lessonId;
    const isNewLesson = currentLessonIdRef.current !== lessonId;

    if (isNewLesson) {
      // Switched to a new lesson -> initialize lesson timer
      currentLessonIdRef.current = lessonId;
      setLessonElapsedSeconds(0);
      setTopicElapsedSeconds(0);
      topicTimesRef.current = {};
    } else {
      // Navigating between topics within the same lesson -> KEEP lesson timer accumulating!
      const topicKey = currentItem.topicId || currentItem.lessonId;
      setTopicElapsedSeconds(topicTimesRef.current[topicKey] || 0);
    }
  }, [currentItemIndex, currentItem]);

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
      setLessonElapsedSeconds((prev) => prev + 1);
      setTopicElapsedSeconds((prev) => prev + 1);
      if (currentItem) {
        const topicKey = currentItem.topicId || currentItem.lessonId;
        topicTimesRef.current[topicKey] = (topicTimesRef.current[topicKey] || 0) + 1;
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [viewMode, currentItem, activeExam, showLessonCompleteModal, showCelebration, isFocusActive]);

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

  const saveLessonProgress = useCallback(async (item: FlatItem, isFullyCompleted = true, customTimeSpent?: number) => {
    if (item.type === "exam") return;
    const timeSpent = Math.max(customTimeSpent ?? lessonElapsedSeconds, 1);

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
  }, [course, lessonElapsedSeconds]);

  /**
   * Mark current topic / lesson complete and advance.
   * Requirement: NO animation or complete popup on topic completion.
   * Animation and completion modal is ONLY shown on completing the entire lesson!
   */
  const markCompleteAndAdvance = async () => {
    if (!currentItem) return;
    const key = itemKey(currentItem);
    const newCompleted = new Set(completedItems);
    newCompleted.add(key);
    setCompletedItems(newCompleted);

    const wasLastInLesson = isLastItemInLesson(currentItem);

    if (wasLastInLesson) {
      // Calculate total cumulative time taken across ALL topics of this lesson
      const totalLessonTime = Math.max(lessonElapsedSeconds, 1);
      const nextItem = flatList[currentItemIndex + 1];

      // Mark lesson completed immediately in memory
      setLessonProgress((prev) => {
        const next = new Map(prev);
        next.set(currentItem.lessonId, { lesson_id: currentItem.lessonId, module_id: currentItem.moduleId, completed: true });
        return next;
      });

      // Set completion meta and pop up modal INSTANTLY with zero network delay
      setCompletedLessonMeta({
        lessonTitle: currentItem.lessonTitle,
        topicsCount: currentItem.topicCount || 1,
        timeSpentSeconds: totalLessonTime,
        nextLessonTitle: nextItem ? (nextItem.type === "topic" ? nextItem.lessonTitle : nextItem.moduleTitle) : undefined,
        hasNextLesson: currentItemIndex < flatList.length - 1,
      });
      setShowLessonCompleteModal(true);

      // Save progress to database in background
      void saveLessonProgress(currentItem, true, totalLessonTime);
      return;
    }

    // Save intermediate progress without marking full lesson complete
    void saveLessonProgress(currentItem, false, topicElapsedSeconds);

    // Intermediate topic: Smooth and instant transition with ZERO distracting popup animation!
    if (currentItemIndex < flatList.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (showLessonCompleteModal) return;
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const goToNext = () => {
    if (showLessonCompleteModal) return;
    if (currentItem && isLastItemInLesson(currentItem) && !isLessonCompleted(currentItem.lessonId)) {
      void markCompleteAndAdvance();
      return;
    }
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

  const startLesson = (moduleId: string, lessonId: string, topicId?: string) => {
    let targetIdx = -1;
    if (topicId) {
      targetIdx = flatList.findIndex(
        (f) => f.moduleId === moduleId && f.lessonId === lessonId && (f.topicId === topicId || f.lessonId === topicId)
      );
    }
    if (targetIdx < 0) {
      // Find first uncompleted topic within this lesson
      targetIdx = flatList.findIndex(
        (f) => f.moduleId === moduleId && f.lessonId === lessonId && !completedItems.has(itemKey(f))
      );
    }
    if (targetIdx < 0) {
      targetIdx = flatList.findIndex((f) => f.moduleId === moduleId && f.lessonId === lessonId);
    }

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
      const nextIdx = currentItemIndex + 1;
      if (isItemUnlocked(nextIdx)) {
        setCurrentItemIndex(nextIdx);
      }
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

  // 1-Click Language Switcher (Instant Cache or API Fetch)
  const handleLanguageSelect = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    const activeBaseLang = (learningLanguage as "English" | "French" | "Kinyarwanda") || "English";

    // Revert to original
    if (targetLang === activeBaseLang) {
      setTranslatedContent(null);
      setTranslatedTitle(null);
      setTranslatedLang(null);
      return;
    }

    const currentKey = currentItem?.type === "topic" ? currentTopic?.id : currentLesson?.id;
    if (!currentKey) return;
    const cacheKey = `${currentKey}_${targetLang}`;

    // Instant Cache Hit (0ms)
    if (translationCacheRef.current.has(cacheKey)) {
      const cached = translationCacheRef.current.get(cacheKey)!;
      setTranslatedContent(cached.content);
      setTranslatedTitle(cached.title);
      setTranslatedLang(targetLang);
      return;
    }

    if (!currentContent && !currentTopic?.title && !currentLesson?.title) return;
    setIsTranslatingNote(true);
    setPendingLang(targetLang);
    const toastId = toast.loading(`Translating to ${targetLang}...`);

    try {
      const res = await fetch("/api/course/translate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentContent,
          topicTitle: currentTopic?.title || currentLesson?.title,
          sourceLang: activeBaseLang,
          targetLang,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Translation failed");
      }
      translationCacheRef.current.set(cacheKey, {
        content: data.translatedContent,
        title: data.translatedTitle,
      });
      setTranslatedContent(data.translatedContent);
      setTranslatedTitle(data.translatedTitle);
      setTranslatedLang(targetLang);
      toast.success(`Notes translated into ${targetLang}! All road signs and styles preserved.`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to translate note", { id: toastId });
    } finally {
      setIsTranslatingNote(false);
      setPendingLang(null);
    }
  };

  const handleResetTranslation = () => {
    setTranslatedContent(null);
    setTranslatedTitle(null);
    setTranslatedLang(null);
    toast.info("Reverted to original note");
  };

  // Toggle Bilingual Dual View (PC Side-by-Side)
  const handleToggleDualView = () => {
    const nextVal = !isDualView;
    setIsDualView(nextVal);
    if (nextVal && !translatedContent) {
      const target: "English" | "Kinyarwanda" =
        learningLanguage === "Kinyarwanda" ? "English" : "Kinyarwanda";
      handleLanguageSelect(target);
    }
  };

  // Plain Terms Legal Explainer
  const handleTogglePlainLanguage = async () => {
    if (isPlainLanguageOpen) {
      setIsPlainLanguageOpen(false);
      return;
    }
    const currentKey = currentItem?.type === "topic" ? currentTopic?.id : currentLesson?.id;
    if (!currentKey) return;

    const activeLang = translatedLang || learningLanguage || "English";
    const cacheKey = `${currentKey}_${activeLang}`;

    if (plainCacheRef.current.has(cacheKey)) {
      setPlainData(plainCacheRef.current.get(cacheKey)!);
      setIsPlainLanguageOpen(true);
      return;
    }

    setIsLoadingPlain(true);
    setIsPlainLanguageOpen(true);
    try {
      const res = await fetch("/api/course/simplify-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: translatedContent || currentContent,
          title: translatedTitle || currentTopic?.title || currentLesson?.title,
          language: activeLang,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to simplify");
      }
      plainCacheRef.current.set(cacheKey, data.explanation);
      setPlainData(data.explanation);
    } catch (err: any) {
      toast.error(err.message || "Failed to simplify road code");
      setIsPlainLanguageOpen(false);
    } finally {
      setIsLoadingPlain(false);
    }
  };

  // AI Neural Cloud Voice Player
  const handleToggleTTS = async () => {
    if (isTTSOpen && ttsAudioUrl) {
      setIsTTSOpen(false);
      return;
    }
    setIsTTSOpen(true);

    const currentKey = currentItem?.type === "topic" ? currentTopic?.id : currentLesson?.id;
    if (!currentKey) return;

    const activeLang = translatedLang || learningLanguage || "English";
    const cacheKey = `${currentKey}_${activeLang}`;

    if (ttsCacheRef.current.has(cacheKey)) {
      setTtsAudioUrl(ttsCacheRef.current.get(cacheKey)!);
      return;
    }

    setIsLoadingTTS(true);
    try {
      const rawText = extractPlainText(translatedContent || currentContent);
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          language: activeLang,
          voice: activeLang === "French" ? "Charon" : "Kore",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to synthesize voice");
      }
      ttsCacheRef.current.set(cacheKey, data.audioUrl);
      setTtsAudioUrl(data.audioUrl);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate neural speech");
    } finally {
      setIsLoadingTTS(false);
    }
  };

  // Text selection for instant terminology lookups
  const handleMouseUpContent = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (text.length >= 2 && text.length <= 60) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setTermPosition({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setSelectedTerm(text);
    }
  };

  // Keyboard Shortcuts for PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        handleToggleDualView();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handleTogglePlainLanguage();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (translatedLang) {
          handleResetTranslation();
        } else {
          handleLanguageSelect("Kinyarwanda");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [translatedLang, currentContent, currentTopic, isDualView, isPlainLanguageOpen, learningLanguage]);

  const resumeTarget = useMemo(() => {
    if (!course || flatList.length === 0) return null;

    // 1. Try saved position from localStorage
    if (typeof window !== "undefined") {
      try {
        const raw =
          (learningLanguage ? localStorage.getItem(`luxen_last_topic_${learningLanguage}`) : null) ||
          localStorage.getItem("luxen_last_topic_global");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.topicId || parsed.lessonId)) {
            const matchIdx = flatList.findIndex(
              (f) => (parsed.topicId && f.topicId === parsed.topicId) || f.lessonId === parsed.lessonId
            );
            if (matchIdx >= 0) {
              const matchedItem = flatList[matchIdx];
              return {
                item: matchedItem,
                index: matchIdx,
                topicTitle: matchedItem.topicTitle || parsed.topicTitle || matchedItem.lessonTitle,
                topicIndex: matchedItem.topicIndex ?? parsed.topicIndex ?? 0,
                topicCount: matchedItem.topicCount ?? parsed.topicCount ?? 1,
                lessonTitle: matchedItem.lessonTitle,
                moduleTitle: matchedItem.moduleTitle,
              };
            }
          }
        }
      } catch {}
    }

    // 2. First uncompleted topic or lesson
    const firstUnfinishedIdx = flatList.findIndex((item) => !completedItems.has(itemKey(item)));
    if (firstUnfinishedIdx >= 0) {
      const item = flatList[firstUnfinishedIdx];
      return {
        item,
        index: firstUnfinishedIdx,
        topicTitle: item.topicTitle || item.lessonTitle,
        topicIndex: item.topicIndex ?? 0,
        topicCount: item.topicCount ?? 1,
        lessonTitle: item.lessonTitle,
        moduleTitle: item.moduleTitle,
      };
    }

    // 3. If all completed, first item
    if (flatList.length > 0) {
      const item = flatList[0];
      return {
        item,
        index: 0,
        topicTitle: item.topicTitle || item.lessonTitle,
        topicIndex: item.topicIndex ?? 0,
        topicCount: item.topicCount ?? 1,
        lessonTitle: item.lessonTitle,
        moduleTitle: item.moduleTitle,
      };
    }

    return null;
  }, [course, flatList, learningLanguage, completedItems]);

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
      <div className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 animate-in fade-in duration-200">
        {/* Course Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("back", { fallback: "home" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("back") || t("backToHome") || "Back"}</span>
            </button>

            <span className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase hidden sm:inline-block">
              curriculum · driving theory
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-mono tracking-wider text-zinc-400 lowercase">
                official highway syllabus · rwanda
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-100">
                {course.title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                {course.modules.length} {t("modules") || "Modules"} · {formatMinutes(courseTime(course))} {t("totalEstimatedTime") || "total study time"}
              </p>
            </div>

            {resumeTarget && (
              <Button
                onClick={() => {
                  setCurrentItemIndex(resumeTarget.index);
                  setSelectedModuleId(resumeTarget.item.moduleId);
                  setViewMode("study");
                }}
                className="gap-2 font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-none px-4 py-2 self-start sm:self-auto"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t("continueFromLastTopic") || t("resumeLearning") || "Resume Topic"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Continue from Last Topic Bento Card */}
        {resumeTarget && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30 p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 lowercase">
                  <BookMarked className="w-3 h-3" />
                  <span>resume · last studied</span>
                </span>
                {resumeTarget.topicCount > 1 && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    topic {resumeTarget.topicIndex + 1}/{resumeTarget.topicCount}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 truncate">
                {resumeTarget.topicTitle}
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                <span className="font-semibold text-zinc-300">{resumeTarget.moduleTitle}</span>
                {resumeTarget.lessonTitle && ` · ${resumeTarget.lessonTitle}`}
              </p>
            </div>

            <div className="shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setCurrentItemIndex(resumeTarget.index);
                  setSelectedModuleId(resumeTarget.item.moduleId);
                  setViewMode("study");
                }}
                className="w-full sm:w-auto gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-none"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t("continueFromLastTopic") || "Continue Learning"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
              modules · structured curriculum
            </span>
            <span className="text-[11px] font-mono text-zinc-400 lowercase">
              {course.modules.length} {course.modules.length === 1 ? (t("module") || "Module") : (t("modules") || "Modules")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                    "relative flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-colors space-y-4 shadow-none select-none",
                    isUnlocked
                      ? "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer group"
                      : "border-zinc-800/50 bg-zinc-950/40 opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-lg shrink-0 font-mono text-xs font-bold border",
                          isComplete
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : isUnlocked
                            ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                            : "bg-zinc-800/60 border-zinc-700/40 text-zinc-500"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isUnlocked ? (
                          <Layers className="h-5 w-5" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-[10px] font-mono text-zinc-400 lowercase px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50">
                          mod 0{modIdx + 1}
                        </span>
                        {isComplete && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-semibold lowercase">
                            {t("completed") || "done"}
                          </span>
                        )}
                        {!isComplete && isUnlocked && completedLessonsCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-400 font-semibold lowercase">
                            {t("inProgress") || "in-progress"}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/50 text-zinc-500 font-semibold flex items-center gap-1 border border-zinc-700/40 lowercase">
                            <Lock className="h-2.5 w-2.5" /> {t("locked") || "locked"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-zinc-100 group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {module.title}
                      </h3>

                      {module.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1 flex-wrap font-mono">
                      <span>{totalLessons} {t("lessons") || "Lessons"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(calcModuleTime)}
                      </span>
                      {module.examSettings && (
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <FileText className="h-3 w-3" />
                          {t("moduleExam") || "Module Exam"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                    {/* Module Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 lowercase">
                        <span>progress</span>
                        <span className="text-zinc-300 font-bold">{completedLessonsCount}/{totalLessons} ({modulePct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${modulePct}%` }}
                        />
                      </div>
                    </div>

                    {isUnlocked && (
                      <div className="w-full pt-1 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                        <span>{t("viewLessons") || "View Lessons"}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
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
      <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 animate-in fade-in duration-200">
        {/* Navigation Breadcrumb */}
        <div className="space-y-3 border-b border-zinc-800 pb-5">
          <button
            onClick={() => setViewMode("modules")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("allModules") || "All Modules"}</span>
          </button>

          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
              module 0{modIdx + 1} · lessons directory
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              {currentModule.title}
            </h1>
          </div>

          {currentModule.description && (
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              {currentModule.description}
            </p>
          )}

          {/* Module Progress Overview */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 mt-3 shadow-none">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 lowercase">module progress</span>
              <span className="text-emerald-400 font-bold">
                {completedLessonsCount} / {totalLessons} {t("lessonsMastered") || "Mastered"} ({modulePct}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
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
            <span className="text-[11px] font-mono tracking-wide text-zinc-400 lowercase">
              available lessons · sequential syllabus
            </span>
            <span className="text-[11px] font-mono text-zinc-400 lowercase">
              {currentModule.lessons.length} lessons
            </span>
          </div>

          <div className="space-y-3">
            {currentModule.lessons.map((lesson, lessonIdx) => {
              const isUnlocked = isLessonUnlocked(currentModule.id, lessonIdx);
              const isComplete = isLessonCompleted(lesson.id);
              const topics = parseTopics(lesson.topics);
              const calcLessonTime = lessonTime(lesson);
              const completedTopicsInLesson = topics.filter((tp) =>
                completedItems.has(`${lesson.id}:${tp.id}`)
              ).length;
              const isInProgress = !isComplete && isUnlocked && completedTopicsInLesson > 0;

              return (
                <div
                  key={lesson.id}
                  className={cn(
                    "rounded-xl border p-4 sm:p-5 transition-colors space-y-3 shadow-none",
                    isUnlocked
                      ? "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer"
                      : "border-zinc-800/50 bg-zinc-950/40 opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (!isUnlocked) return;
                    const idx = flatList.findIndex((item) => item.lessonId === lesson.id);
                    if (idx >= 0) {
                      setCurrentItemIndex(idx);
                      setSelectedModuleId(currentModule.id);
                      setViewMode("study");
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 font-mono text-xs font-bold border",
                          isComplete
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : isUnlocked
                            ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                            : "bg-zinc-800/60 border-zinc-700/40 text-zinc-500"
                        )}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isUnlocked ? (
                          <span>{lessonIdx + 1}</span>
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-zinc-100 truncate">
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                          <span>{topics.length} {topics.length === 1 ? "topic" : "topics"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMinutes(calcLessonTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isComplete && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-semibold lowercase">
                          completed
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-400 font-semibold lowercase">
                          in-progress
                        </span>
                      )}
                      {isUnlocked && (
                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Module Exam Card if available */}
            {currentModule.examSettings && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 lowercase tracking-wider block">
                      assessment · {t("moduleExam") || "module exam"}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-zinc-100">{currentModule.examSettings.title || "Module Test"}</h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      {currentModule.examSettings.question_count} {t("questions") || "questions"} · {currentModule.examSettings.duration_minutes} min
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => startModuleExam(currentModule.id, currentModule.examSettings?.title || currentModule.title)}
                  className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold gap-1.5 shadow-none shrink-0"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{t("takeExam") || "Take Exam"}</span>
                </Button>
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
                <span className="text-[10px] text-muted-foreground block">Completed all</span>
              </div>
              <div className="rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 p-3 text-center space-y-1">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("totalLessonTime") || "Total Time Taken"}
                </span>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatTimer(completedLessonMeta.timeSpentSeconds)}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  {completedLessonMeta.timeSpentSeconds < 60
                    ? `${completedLessonMeta.timeSpentSeconds}s (all ${completedLessonMeta.topicsCount} topics)`
                    : `${Math.floor(completedLessonMeta.timeSpentSeconds / 60)}m ${completedLessonMeta.timeSpentSeconds % 60}s total`}
                </span>
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
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                  onClick={continueToNextLesson}
                >
                  <ArrowRight className="h-4 w-4" />
                  {t("continueToNextLesson") || "Continue to Next Lesson"}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                  onClick={backToModuleLessonsFromModal}
                >
                  <Trophy className="h-4 w-4" />
                  {t("viewModuleSummary") || "Module Completed · View Summary"}
                </Button>
              )}

              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 rounded-xl font-medium cursor-pointer"
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
          {/* Active Lesson Study Timer */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border transition-colors",
              isFocusActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            )}
            title="Lesson Study Timer"
          >
            <Clock className={cn("h-3 w-3", isFocusActive && "animate-pulse")} />
            <span>{formatTimer(lessonElapsedSeconds)}</span>
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

          {/* 1-Click Segmented Language Switcher (Zero Dropdown Hunting, 0ms Cache) */}
          <div className="flex items-center p-0.5 rounded-xl bg-muted/70 border border-border/50 text-xs">
            {(["English", "French", "Kinyarwanda"] as const).map((lang) => {
              const activeLang = translatedLang || learningLanguage || "English";
              const isActive = activeLang === lang;
              const isPending = isTranslatingNote && pendingLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageSelect(lang)}
                  disabled={isTranslatingNote}
                  className={cn(
                    "px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={`Read note in ${lang === "French" ? "Français" : lang} [Hotkey: T]`}
                >
                  <span>{lang === "English" ? "🇬🇧" : lang === "French" ? "🇫🇷" : "🇷🇼"}</span>
                  <span className="hidden sm:inline">{lang === "French" ? "FR" : lang === "English" ? "EN" : "RW"}</span>
                  {isPending && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </button>
              );
            })}
          </div>

          {/* Bilingual Dual View Split Toggle (PC Mode) */}
          <button
            type="button"
            onClick={handleToggleDualView}
            className={cn(
              "hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              isDualView
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background hover:bg-muted text-muted-foreground border-border"
            )}
            title="Side-by-side bilingual comparison (PC Mode) [Press B]"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Dual View</span>
          </button>

          {/* Plain Terms Legal Explainer Toggle */}
          <button
            type="button"
            onClick={handleTogglePlainLanguage}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              isPlainLanguageOpen
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-background hover:bg-muted text-muted-foreground border-border"
            )}
            title="Explain road rules in plain, simple terms [Press P]"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Plain Terms</span>
          </button>

          {/* AI Neural Cloud Voice Player Toggle */}
          <button
            type="button"
            onClick={handleToggleTTS}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              isTTSOpen
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background hover:bg-muted text-muted-foreground border-border"
            )}
            title="Listen with AI Cloud Voice (Gemini Neural TTS)"
          >
            {isLoadingTTS ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">AI Voice</span>
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

                {/* Active AI Translation Banner */}
                {translatedLang && !isDualView && (
                  <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>
                        AI Translated into <strong>{translatedLang}</strong> using Rwanda Traffic Code terminology (all signs &amp; styles preserved).
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetTranslation}
                      className="underline text-[11px] hover:text-foreground font-semibold ml-2 shrink-0 cursor-pointer"
                    >
                      Revert
                    </button>
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {translatedTitle || (currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle)}
                </h1>
              </div>

              {/* AI Cloud Neural Voice Player (Gemini TTS) */}
              {isTTSOpen && (
                <AINeuralVoicePlayer
                  audioUrl={ttsAudioUrl}
                  isLoading={isLoadingTTS}
                  language={translatedLang || learningLanguage || "English"}
                  topicTitle={translatedTitle || currentTopic?.title || currentLesson?.title || "Lesson Note"}
                  onClose={() => setIsTTSOpen(false)}
                  onRetry={handleToggleTTS}
                />
              )}

              {/* Plain Language Explainer Card (Rwanda Traffic Code Simplified) */}
              {isPlainLanguageOpen && plainData && (
                <PlainLanguageCard
                  data={plainData}
                  language={translatedLang || learningLanguage || "English"}
                  onClose={() => setIsPlainLanguageOpen(false)}
                />
              )}

              {/* Advanced Audio Player if Topic has pre-uploaded Audio */}
              {currentTopic?.audioUrl && !isTTSOpen && (
                <TopicAudioPlayer
                  audioUrl={currentTopic.audioUrl}
                  topicTitle={currentTopic.title}
                />
              )}

              {/* Topic Body Content: Side-by-Side Bilingual Dual View on PC or Standard View */}
              <div onMouseUp={handleMouseUpContent}>
                {isDualView && translatedContent ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Left: Original Note */}
                    <div className="space-y-3 p-4 sm:p-5 rounded-2xl border bg-muted/20 border-border/60">
                      <div className="flex items-center justify-between pb-2 border-b text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{learningLanguage === "French" ? "🇫🇷" : learningLanguage === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                          Original Note ({learningLanguage || "Original"})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted">Source</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-foreground">
                        {currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle}
                      </div>
                      <LessonContentView content={currentContent} textSize={textSize} />
                    </div>

                    {/* Right: Translated Note */}
                    <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span>{translatedLang === "French" ? "🇫🇷" : translatedLang === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                          Translated Note ({translatedLang || "Translation"})
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">AI Synced</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-foreground">
                        {translatedTitle || (currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle)}
                      </div>
                      <LessonContentView content={translatedContent} textSize={textSize} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full transition-all leading-relaxed">
                    {currentContent ? (
                      <LessonContentView content={translatedContent || currentContent} textSize={textSize} />
                    ) : (
                      <p className="text-muted-foreground italic">{t("noContent") || "No content available yet."}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Floating Term Tooltip on Selection */}
              {selectedTerm && termPosition && (
                <TermLookupTooltip
                  term={selectedTerm}
                  position={termPosition}
                  onClose={() => {
                    setSelectedTerm(null);
                    setTermPosition(null);
                  }}
                />
              )}

              {/* PC Desktop Hotkey Hints */}
              <div className="hidden md:flex items-center justify-end gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">T</kbd>
                  <span>Translate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">B</kbd>
                  <span>Bilingual Split</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">P</kbd>
                  <span>Plain Terms</span>
                </span>
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
