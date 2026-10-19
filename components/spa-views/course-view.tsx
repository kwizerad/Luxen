"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { markTTSDisabledForSession } from "@/components/course/question-tts-button";
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
  const { t, language: interfaceLanguage, setLanguage } = useLanguage();
  const { enabledLanguages } = useLearningLanguages();
  const [course, setCourse] = useState<CourseWithModules | null>(null);
  const [sequentialUnlockEnabled, setSequentialUnlockEnabled] = useState(true);
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLanguage, setSavingLanguage] = useState(false);

  // View state: "language" (Step 2: Language choice) | "modules" (Step 3: 4-card courses) | "module-lessons" (Step 4: Lessons list) | "study" (Step 5: Learning view)
  const [viewMode, setViewMode] = useState<"language" | "modules" | "module-lessons" | "study" | "reading">("modules");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Language switch confirmation card state
  const [pendingSwitchLanguage, setPendingSwitchLanguage] = useState<LearningLanguage | null>(null);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const hasInitialLoadedRef = useRef(false);

  // Sidebar pagination: show 10 lessons at a time per course
  const [sidebarLessonPage, setSidebarLessonPage] = useState<Record<string, number>>({});

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
  const [showLanguagePicker, setShowLanguagePicker] = useState<boolean>(false);

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
  const [isTTSDisabled, setIsTTSDisabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("luxen_tts_disabled") === "true";
      } catch {}
    }
    return false;
  });

  useEffect(() => {
    const handleDisabled = () => {
      setIsTTSDisabled(true);
      setIsTTSOpen(false);
      setIsLoadingTTS(false);
    };
    const handleEnabled = () => {
      setIsTTSDisabled(false);
    };
    window.addEventListener("luxen-tts-disabled", handleDisabled);
    window.addEventListener("luxen-tts-enabled", handleEnabled);

    const activeLang = translatedLang || learningLanguage || "English";
    fetch(`/api/ai/tts?scope=learning&language=${encodeURIComponent(activeLang)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.enabled === false) {
          setIsTTSDisabled(true);
          setIsTTSOpen(false);
          markTTSDisabledForSession();
        } else if (data && data.enabled === true) {
          setIsTTSDisabled(false);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("luxen-tts-disabled", handleDisabled);
      window.removeEventListener("luxen-tts-enabled", handleEnabled);
    };
  }, [learningLanguage, translatedLang]);

  // Instant In-Memory Caches (0ms response on revisit)
  const translationCacheRef = useRef<Map<string, { content: string; title: string }>>(new Map());
  const plainCacheRef = useRef<Map<string, PlainLanguageData>>(new Map());
  const ttsCacheRef = useRef<Map<string, string>>(new Map());

  // Interactive Floating Term Gloss
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [termPosition, setTermPosition] = useState<{ x: number; y: number } | null>(null);

  // Reset transient study aids on topic change
  useEffect(() => {
    setPlainData(null);
    setIsPlainLanguageOpen(false);
    setIsTTSOpen(false);
    setTtsAudioUrl(null);
    setSelectedTerm(null);
    setTermPosition(null);
  }, [currentItemIndex, viewMode]);

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

  // Synchronize sidebar 10-lesson pagination page with current lesson
  useEffect(() => {
    if (currentLesson && currentModule) {
      const lIdx = currentModule.lessons.findIndex((l) => l.id === currentLesson.id);
      if (lIdx >= 0) {
        const targetPage = Math.floor(lIdx / 10);
        setSidebarLessonPage((prev) => {
          if (prev[currentModule.id] === targetPage) return prev;
          return { ...prev, [currentModule.id]: targetPage };
        });
      }
    }
  }, [currentLesson, currentModule]);

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
    const cachedSeq = spaCache.get<boolean>(`spa_course_seq_${selectedLanguage}`);
    if (cachedSeq !== null && cachedSeq !== undefined) {
      setSequentialUnlockEnabled(cachedSeq);
    }
    if (cachedCourse) {
      setCourse(cachedCourse);
      if (cachedCourse.modules.length > 0) {
        setSelectedModuleId((prev) => prev || cachedCourse.modules[0].id);
      }
      setLoading(false);
      void loadProgress(cachedCourse);
    } else {
      setLoading(true);
    }

    try {
      const loadPromise = loadCourseByLanguage(selectedLanguage);
      const timeoutPromise = new Promise<{ course: null; sequentialUnlockEnabled: boolean }>((_, reject) =>
        setTimeout(() => reject(new Error("Course load timeout")), 6000)
      );
      const { course, sequentialUnlockEnabled: seqUnlock } = await Promise.race([loadPromise, timeoutPromise]);
      const resolvedSeq = seqUnlock !== false;
      setSequentialUnlockEnabled(resolvedSeq);
      spaCache.set(`spa_course_seq_${selectedLanguage}`, resolvedSeq);
      if (!course) {
        spaCache.delete(`spa_course_${selectedLanguage}`);
        setCourse(null);
        setLoading(false);
        return;
      }

      spaCache.set(`spa_course_${selectedLanguage}`, course);
      setCourse(course);
      if (course.modules.length > 0) {
        setSelectedModuleId((prev) => prev || course.modules[0].id);
      }
      void loadProgress(course);
    } catch (err) {
      console.error("Failed to load course:", err);
    } finally {
      setLoading(false);
    }
  }, [loadProgress]);

  useEffect(() => {
    if (hasInitialLoadedRef.current) return;
    hasInitialLoadedRef.current = true;

    const loadLearningLanguage = async () => {
      try {
        const hasDeepLink = Boolean(
          params.get("lesson") ||
          params.get("lessonId") ||
          params.get("topic") ||
          params.get("topicId") ||
          params.get("module") ||
          params.get("moduleId")
        );

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = user
          ? await supabase.from("user_profiles").select("learning_language").eq("id", user.id).maybeSingle()
          : { data: null };
        const savedLanguage = profile?.learning_language;
        const storedLocal = typeof window !== "undefined" ? localStorage.getItem("luxen_course_lang") : null;
        const effectiveLang = (isLearningLanguage(storedLocal || "") ? storedLocal : null) || (isLearningLanguage(savedLanguage || "") ? savedLanguage : null);

        if (!hasDeepLink && !effectiveLang) {
          setShowLanguagePicker(true);
          setViewMode("language");
          setLoading(false);
          return;
        }

        const selectedLanguage = (effectiveLang as LearningLanguage) || "Kinyarwanda";
        setLearningLanguage(selectedLanguage);
        await loadCourse(selectedLanguage);
      } catch (err) {
        console.error("Failed in loadLearningLanguage:", err);
      } finally {
        setLoading(false);
      }
    };

    void loadLearningLanguage();
  }, [loadCourse, params]);

  // Request language switch: prompts confirmation card if user already has a language selected
  const requestLanguageSwitch = (targetLang: LearningLanguage) => {
    if (learningLanguage && learningLanguage !== targetLang) {
      setPendingSwitchLanguage(targetLang);
      setShowSwitchConfirmModal(true);
    } else {
      void executeLanguageSwitch(targetLang);
    }
  };

  // Execute language switch: updates course, profile, and global interface translations
    console.log("DEBUG: params useEffect triggered", { lessonId, topicId, moduleId, flatListLength: flatList.length });
  const executeLanguageSwitch = async (chosen: LearningLanguage) => {
    setShowSwitchConfirmModal(false);
    setPendingSwitchLanguage(null);
    setShowLanguagePicker(false);
    setLoading(true);
    setLearningLanguage(chosen);

    // Synchronize global interface language (translates buttons, navigation, headers)
    setLanguage(chosen);

    if (typeof window !== "undefined") {
      localStorage.setItem("luxen_course_lang", chosen);
      localStorage.setItem("navo-language", chosen);
    }

    try {
      await selectLearningLanguage(chosen);
      await loadCourse(chosen);
    } catch (err) {
      console.error("Failed to switch language:", err);
    } finally {
      setLoading(false);
      setViewMode((prev) => (prev === "language" ? "modules" : prev));
    }

    toast.success(
      chosen === "French"
        ? "Langue changée en Français"
        : chosen === "Kinyarwanda"
        ? "Ururimi rwahinduwe mu Kinyarwanda"
        : "Language switched to English"
    );
  };

  const handleChooseCourseLanguage = (chosen: LearningLanguage) => {
    requestLanguageSwitch(chosen);
  };

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
    if (!sequentialUnlockEnabled) return true;
    if (modIdx === 0) return true;
    if (!course) return false;
    const prevMod = course.modules[modIdx - 1];
    return prevMod ? isModuleCompleted(prevMod.id) : false;
  }, [course, isModuleCompleted, sequentialUnlockEnabled]);

  const isLessonUnlocked = useCallback((moduleId: string, lessonIdx: number): boolean => {
    if (!course) return false;
    if (!sequentialUnlockEnabled) return true;
    const modIdx = course.modules.findIndex((m) => m.id === moduleId);
    if (modIdx < 0 || !isModuleUnlocked(modIdx)) return false;

    // First lesson in an unlocked module is unlocked
    if (lessonIdx === 0) return true;

    // Subsequent lessons unlock ONLY after the previous lesson is completed!
    const mod = course.modules[modIdx];
    const prevLesson = mod.lessons[lessonIdx - 1];
    return prevLesson ? isLessonCompleted(prevLesson.id) : false;
  }, [course, isModuleUnlocked, isLessonCompleted, sequentialUnlockEnabled]);

  const isItemUnlocked = useCallback((index: number): boolean => {
    if (!sequentialUnlockEnabled) return true;
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
  }, [flatList, completedItems, course, isModuleUnlocked, isLessonUnlocked, sequentialUnlockEnabled]);

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

      // Save progress to database in background
      void saveLessonProgress(currentItem, true, totalLessonTime);

      // For courses that have Course and Lessons alone (no topics), skip the completion card modal and advance directly
      const hasTopicsInLesson = currentItem.type === "topic" && (currentItem.topicCount ?? 0) > 1;
      if (!hasTopicsInLesson) {
        if (currentItemIndex < flatList.length - 1) {
          const nextIdx = currentItemIndex + 1;
          if (flatList[nextIdx]?.type === "exam") {
            setSelectedModuleId(currentItem.moduleId);
            setViewMode("module-lessons");
          } else {
            setCurrentItemIndex(nextIdx);
          }
        } else {
          setSelectedModuleId(currentItem.moduleId);
          setViewMode("module-lessons");
        }
        return;
      }

      // Set completion meta and pop up modal INSTANTLY with zero network delay
      setCompletedLessonMeta({
        lessonTitle: currentItem.lessonTitle,
        topicsCount: currentItem.topicCount || 1,
        timeSpentSeconds: totalLessonTime,
        nextLessonTitle: nextItem ? (nextItem.type === "topic" ? nextItem.lessonTitle : nextItem.moduleTitle) : undefined,
        hasNextLesson: currentItemIndex < flatList.length - 1,
      });
      setShowLessonCompleteModal(true);
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

  // Keyboard navigation: ArrowLeft / ArrowRight to navigate topics, and block copy/paste/select/right-click in Course view
  useEffect(() => {
    const preventClipboardAndMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventSelect = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      return false;
    };

    const preventMultiClick = (e: MouseEvent) => {
      if (e.detail > 1) {
        e.preventDefault();
        window.getSelection()?.removeAllRanges();
      }
    };

    const preventCopyShortcuts = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && ["c", "C", "v", "V", "x", "X", "a", "A"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("contextmenu", preventClipboardAndMenu, true);
    document.addEventListener("copy", preventClipboardAndMenu, true);
    document.addEventListener("cut", preventClipboardAndMenu, true);
    document.addEventListener("paste", preventClipboardAndMenu, true);
    document.addEventListener("selectstart", preventSelect, true);
    document.addEventListener("mousedown", preventMultiClick, true);
    document.addEventListener("keydown", preventCopyShortcuts, true);

    return () => {
      document.removeEventListener("contextmenu", preventClipboardAndMenu, true);
      document.removeEventListener("copy", preventClipboardAndMenu, true);
      document.removeEventListener("cut", preventClipboardAndMenu, true);
      document.removeEventListener("paste", preventClipboardAndMenu, true);
      document.removeEventListener("selectstart", preventSelect, true);
      document.removeEventListener("mousedown", preventMultiClick, true);
      document.removeEventListener("keydown", preventCopyShortcuts, true);
    };
  }, []);

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

  // Touch Swipe & Horizontal Scroll Handlers for mobile, tablet, and trackpad navigation
  // Allows user to swipe/scroll left or right anywhere on screen (even outside the lesson card)
  useEffect(() => {
    if (viewMode !== "study") return;

    let startX: number | null = null;
    let startY: number | null = null;

    const onTouchStartWindow = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEndWindow = (e: TouchEvent) => {
      if (startX === null || startY === null || e.changedTouches.length !== 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = startX - endX;
      const deltaY = startY - endY;
      const minSwipeDistance = 40;

      // Only trigger if horizontal swipe is clearly dominant over vertical scrolling
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && Math.abs(deltaX) > minSwipeDistance) {
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
      startX = null;
      startY = null;
    };

    const onWheelWindow = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 40 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
        if (e.deltaX > 0) {
          goToNext();
        } else {
          goToPrevious();
        }
      }
    };

    window.addEventListener("touchstart", onTouchStartWindow, { passive: true });
    window.addEventListener("touchend", onTouchEndWindow, { passive: true });
    window.addEventListener("wheel", onWheelWindow, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStartWindow);
      window.removeEventListener("touchend", onTouchEndWindow);
      window.removeEventListener("wheel", onWheelWindow);
    };
  }, [viewMode, currentItem, completedItems, currentItemIndex, flatList.length, goToNext, goToPrevious, markCompleteAndAdvance]);

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
    // Keep activeExam mounted so ModuleExamRunner displays the quiz results card!
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
  console.log("DEBUG: currentContent", { currentContent, currentItem, currentLesson, currentTopic });
      : currentLesson?.content || "";

  const currentEstimatedMinutes =
    currentItem?.type === "topic"
      ? currentTopic?.estimated_minutes || 3
      : currentLesson ? lessonTime(currentLesson) : 5;

  // 1-Click Language Switcher (Instant Cache or API Fetch)
  const handleLanguageSelect = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    const isExtCourse = course?.id === "00000000-0000-0000-0000-00000000e001";
    const activeBaseLang = isExtCourse
      ? "Kinyarwanda"
      : ((learningLanguage as "English" | "French" | "Kinyarwanda") || "English");

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
          entityId: currentKey,
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
    if (isTTSDisabled) return;

    if (isTTSOpen && ttsAudioUrl) {
      setIsTTSOpen(false);
      return;
    }

    const currentKey = currentItem?.type === "topic" ? currentTopic?.id : currentLesson?.id;
    if (!currentKey) return;

    const activeLang = translatedLang || learningLanguage || "English";
    const cacheKey = `${currentKey}_${activeLang}`;

    if (ttsCacheRef.current.has(cacheKey)) {
      setTtsAudioUrl(ttsCacheRef.current.get(cacheKey)!);
      setIsTTSOpen(true);
      return;
    }

    setIsLoadingTTS(true);
    setIsTTSOpen(true);
    try {
      const rawText = extractPlainText(translatedContent || currentContent);
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          entityId: currentKey,
          language: activeLang,
          voice: activeLang === "French" ? "Charon" : "Kore",
          scope: "learning",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || data.disabled || data.quotaExceeded || !data.audioUrl) {
        // Do not show error message inside the course; automatically disable the TTS feature
        setIsTTSOpen(false);
        setTtsAudioUrl(null);
        setIsTTSDisabled(true);
        markTTSDisabledForSession();
        return;
      }
      ttsCacheRef.current.set(cacheKey, data.audioUrl);
      setTtsAudioUrl(data.audioUrl);
    } catch {
      setIsTTSOpen(false);
      setTtsAudioUrl(null);
      setIsTTSDisabled(true);
      markTTSDisabledForSession();
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

  if (viewMode === "language" || showLanguagePicker || !learningLanguage) {
    return (
      <div className="min-h-[calc(100vh-80px)] max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 animate-in fade-in duration-200 select-none">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (learningLanguage && course) {
                setShowLanguagePicker(false);
                setViewMode("modules");
              } else {
                navigate("back", { fallback: "home" });
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 border border-border transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{learningLanguage && course ? (t("backToCourses") || "Back to Courses") : (t("backToHome") || "Back to Home")}</span>
          </button>
        </div>

        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("chooseCourseLanguage") || "Choose Course Language"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("chooseCourseLanguageDesc") || "Select the language you want to study your driving lessons in. You can take courses in any language regardless of your UI interface setting."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          {[
            {
              lang: "Kinyarwanda" as const,
              flag: "🇷🇼",
              label: "Ikinyarwanda",
              badge: "Rwanda · Ikinyarwanda",
              title: "Amategeko y'Umuhanda",
              desc: "Wige amategeko y'umuhanda n'ibyapa byose by'u Rwanda mu Kinyarwanda cyimbitse kandi cyoroshye.",
              btnText: "Fungura mu Kinyarwanda",
            },
            {
              lang: "French" as const,
              flag: "🇫🇷",
              label: "Français",
              badge: "Français · Code de la Route",
              title: "Code de la Route en Français",
              desc: "Étudiez les règles de circulation routière, la signalisation et les priorités en Français.",
              btnText: "Ouvrir en Français",
            },
            {
              lang: "English" as const,
              flag: "🇬🇧",
              label: "English",
              badge: "English · Highway Code",
              title: "Rwanda Highway Code",
              desc: "Master Rwanda traffic regulations, road signs, and driving rules in English.",
              btnText: "Open in English",
            },
          ].map((item) => (
            <div
              key={item.lang}
              onClick={() => void requestLanguageSwitch(item.lang)}
              className={cn(
                "group cursor-pointer rounded-2xl sm:rounded-3xl border p-6 sm:p-7 flex flex-col justify-between transition-all hover:shadow-md hover:border-primary/50 bg-card",
                learningLanguage === item.lang ? "border-primary ring-2 ring-primary/30" : "border-border/80"
              )}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{item.flag}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-xs font-semibold text-primary/80 mt-0.5">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  className="w-full rounded-xl py-2.5 font-semibold text-xs sm:text-sm group-hover:bg-primary/90 transition-colors"
                  disabled={savingLanguage}
                  onClick={(e) => {
                    e.stopPropagation();
                    void requestLanguageSwitch(item.lang);
                  }}
                >
                  <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                  <span>{item.btnText}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Language Switch Confirmation Modal */}
        <AnimatePresence>
          {showSwitchConfirmModal && pendingSwitchLanguage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                    {pendingSwitchLanguage === "French" ? "🇫🇷" : pendingSwitchLanguage === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground">
                      {learningLanguage === "Kinyarwanda"
                        ? "Guhindura Ururimi rw'Amasomo?"
                        : learningLanguage === "French"
                        ? "Changer la langue du cours ?"
                        : "Switch Course Language?"}
                    </h3>
                    <p className="text-xs text-primary font-semibold">
                      {pendingSwitchLanguage === "French" ? "Français" : pendingSwitchLanguage === "Kinyarwanda" ? "Ikinyarwanda" : "English"}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {learningLanguage === "Kinyarwanda"
                    ? `Wifuza guhindura ururimi rw'amasomo rukaba ${pendingSwitchLanguage}? Amasomo yose, ibikoresho by'ubufasha, n'uburyo bwo kwiga bizahindurwa muri urwo rurimi.`
                    : learningLanguage === "French"
                    ? `Souhaitez-vous changer la langue du cours en ${pendingSwitchLanguage} ? Tous les modules, leçons et textes de l'interface seront traduits.`
                    : `Are you sure you want to switch the course language to ${pendingSwitchLanguage}? All course contents, lesson materials, and interface elements will be translated.`}
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl font-medium"
                    onClick={() => {
                      setShowSwitchConfirmModal(false);
                      setPendingSwitchLanguage(null);
                    }}
                  >
                    {t("cancel") || "Cancel"}
                  </Button>
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm"
                    onClick={() => void executeLanguageSwitch(pendingSwitchLanguage)}
                  >
                    {learningLanguage === "Kinyarwanda"
                      ? "Emeza Guhindura"
                      : learningLanguage === "French"
                      ? "Confirmer le changement"
                      : "Confirm Switch"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16 border border-dashed rounded-[20px] bg-muted/40 max-w-2xl mx-auto mt-8 p-8 space-y-4">
        <BookOpen className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-40" />
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

    const activeModIdx = activeExam.moduleId
      ? course.modules.findIndex((m) => m.id === activeExam.moduleId)
      : -1;
    const nextModule =
      activeModIdx >= 0 && activeModIdx + 1 < course.modules.length
        ? course.modules[activeModIdx + 1]
        : null;

    return (
      <ModuleExamRunner
        examType={activeExam.type}
        moduleId={activeExam.moduleId}
        moduleTitle={activeExam.moduleTitle}
        nextCourseTitle={nextModule?.title}
        onNextCourse={
          nextModule
            ? () => {
                setActiveExam(null);
                setSelectedModuleId(nextModule.id);
                setViewMode("module-lessons");
              }
            : () => {
                setActiveExam(null);
                setViewMode("modules");
              }
        }
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
      <div
        className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {/* Course Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={() => {
                setShowLanguagePicker(true);
                setViewMode("language");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-muted dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900 border border-border dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("chooseLanguage") || "Change Language"}</span>
            </button>

            {/* Language Switcher Bar */}
            <div className="flex items-center gap-1 bg-card border border-border dark:border-zinc-800 rounded-xl p-1 shadow-xs">
              {(["English", "French", "Kinyarwanda"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => void handleChooseCourseLanguage(lang)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                    learningLanguage === lang
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{lang === "French" ? "🇫🇷" : lang === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                  <span className="hidden sm:inline">{lang}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground dark:text-zinc-100">
                {course.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400">
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
                className="gap-2 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-none px-4 py-2 self-start sm:self-auto cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t("continueFromLastTopic") || t("resumeLearning") || "Resume Topic"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Continue from Last Topic Bento Card */}
        {resumeTarget && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30 lowercase">
                  <BookMarked className="w-3 h-3" />
                  <span>{t("resumeLearning") || "resume"}</span>
                </span>
                {resumeTarget.topicCount > 1 && (
                  <span className="text-[11px] font-mono text-muted-foreground dark:text-zinc-400">
                    {resumeTarget.topicIndex + 1}/{resumeTarget.topicCount}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground dark:text-zinc-100 truncate">
                {resumeTarget.topicTitle}
              </h2>
              <p className="text-xs text-muted-foreground dark:text-zinc-400 truncate">
                <span className="font-semibold text-foreground/80 dark:text-zinc-300">{resumeTarget.moduleTitle}</span>
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
                className="w-full sm:w-auto gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-none cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t("continueFromLastTopic") || "Continue Learning"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Modules Grid — 4 Cards per line on desktop */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-zinc-400">
              {t("coursesAndModules") || "Courses & Modules"}
            </span>
            <span className="text-xs font-mono text-muted-foreground dark:text-zinc-400">
              {course.modules.length} {course.modules.length === 1 ? (t("module") || "Module") : (t("modules") || "Modules")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                    "relative flex flex-col justify-between rounded-xl border p-4 transition-colors space-y-3.5 shadow-xs select-none",
                    isUnlocked
                      ? "border-border dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900/90 cursor-pointer group"
                      : "border-border/60 dark:border-zinc-800/50 bg-muted/40 dark:bg-zinc-950/40 opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-lg shrink-0 font-mono text-xs font-bold border",
                          isComplete || isUnlocked
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-muted dark:bg-zinc-800/60 border-border dark:border-zinc-700/40 text-muted-foreground dark:text-zinc-500"
                        )}
                      >
                        {isUnlocked ? (
                          isComplete || completedLessonsCount > 0 ? (
                            <FolderOpen className="h-4 w-4" />
                          ) : (
                            <Folder className="h-4 w-4" />
                          )
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase px-2 py-0.5 rounded bg-muted dark:bg-zinc-800/80 border border-border dark:border-zinc-700/50">
                          0{modIdx + 1}
                        </span>
                        {isComplete && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold lowercase">
                            {t("completed") || "done"}
                          </span>
                        )}
                        {!isComplete && isUnlocked && completedLessonsCount > 0 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold lowercase">
                            {t("inProgress") || "in-progress"}
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted dark:bg-zinc-800/50 text-muted-foreground dark:text-zinc-500 font-semibold flex items-center gap-1 border border-border dark:border-zinc-700/40 lowercase">
                            <Lock className="h-2.5 w-2.5" /> {t("locked") || "locked"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-foreground dark:text-zinc-100 group-hover:text-primary dark:group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {module.title}
                      </h3>

                      {module.description && (
                        <p className="text-xs text-muted-foreground dark:text-zinc-400 line-clamp-2 mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-zinc-400 pt-1 flex-wrap font-mono">
                      <span>{totalLessons} {t("lessons") || "Lessons"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(calcModuleTime)}
                      </span>
                      {module.examSettings && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <FileText className="h-3 w-3" />
                          {t("moduleExam") || "Module Exam"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between gap-2">
                      {isUnlocked ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModuleLessons(module.id);
                          }}
                          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-lg shadow-none h-8 cursor-pointer"
                        >
                          <span>{t("open") || "Open"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full gap-1.5 text-xs rounded-lg h-8 opacity-70"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>{t("locked") || "Locked"}</span>
                        </Button>
                      )}
                    </div>
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
      <div
        className="min-h-[calc(100vh-4rem)] w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {/* Navigation Back to Courses */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode("modules")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-muted dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900 border border-border dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("allCourses") || "All Courses"}</span>
          </button>
        </div>

        {/* Display Course Name prominently ABOVE ALL */}
        <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-7 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <BookOpen className="h-4 w-4" />
            <span>{t("course") || "Course"} #{modIdx + 1}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground dark:text-zinc-100">
            {currentModule.title}
          </h1>
          {currentModule.description && (
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-300 max-w-2xl leading-relaxed">
              {currentModule.description}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2 text-xs font-mono text-muted-foreground dark:text-zinc-400">
            <span>{currentModule.lessons.length} {t("lessons") || "Lessons"}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatMinutes(moduleTime(currentModule))} {t("studyTime") || "study time"}
            </span>
          </div>
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
              {t("lessons") || "Lessons"}
            </span>
            <span className="text-xs font-mono text-muted-foreground dark:text-zinc-400">
              {currentModule.lessons.length} {t("lessons") || "lessons"}
            </span>
          </div>

          <div className="space-y-2.5">
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
                    "rounded-xl border p-3.5 sm:p-4 transition-colors space-y-2.5 shadow-xs",
                    isUnlocked
                      ? "border-border dark:border-zinc-800 bg-card hover:bg-muted/30 dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900/90 cursor-pointer"
                      : "border-border/60 dark:border-zinc-800/50 bg-muted/40 dark:bg-zinc-950/40 opacity-60 cursor-not-allowed"
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
                          "flex items-center justify-center h-8 w-8 rounded-lg shrink-0 font-mono text-xs font-bold border",
                          isComplete || isUnlocked
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-muted dark:bg-zinc-800/60 border-border dark:border-zinc-700/40 text-muted-foreground dark:text-zinc-500"
                        )}
                      >
                        {isUnlocked ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                            #{lessonIdx + 1}
                          </span>
                          <h3 className="font-bold text-sm text-foreground dark:text-zinc-100 truncate">
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground dark:text-zinc-400 font-mono">
                          {topics.length > 0 && (
                            <>
                              <span>{topics.length} {topics.length === 1 ? "topic" : "topics"}</span>
                              <span>•</span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatMinutes(calcLessonTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isComplete && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold lowercase">
                          {t("completed") || "completed"}
                        </span>
                      )}
                      {isInProgress && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold lowercase">
                          {t("inProgress") || "in-progress"}
                        </span>
                      )}
                      {isUnlocked && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Module Exam Card if available */}
            {currentModule.examSettings && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-center justify-between gap-4 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 text-primary flex items-center justify-center shrink-0">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-primary lowercase tracking-wider block">
                      {t("moduleExam") || "module exam"}
                    </span>
                    <h3 className="font-bold text-sm text-foreground dark:text-zinc-100">{currentModule.examSettings.title || "Module Test"}</h3>
                    <p className="text-xs text-muted-foreground dark:text-zinc-400 font-mono">
                      {currentModule.examSettings.question_count} {t("questions") || "questions"} · {currentModule.examSettings.duration_minutes} min
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => startModuleExam(currentModule.id, currentModule.examSettings?.title || currentModule.title)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold gap-1.5 shadow-none shrink-0"
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
        "fixed inset-x-0 top-14 sm:top-16 bottom-0 z-20 flex flex-col bg-background select-none overflow-hidden",
        isFocusMode ? "top-0 z-50" : ""
      )}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Celebration Overlay for Final Course Completion */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="relative z-10 text-center space-y-4 p-6 bg-card border-2 border-primary rounded-[28px] shadow-2xl transform-gpu"
            >
              <div className="text-6xl animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold tracking-tight">{t("courseCompleted") || "Course Completed!"}</h2>
              <p className="text-base text-muted-foreground">{t("congratulations") || "Congratulations on finishing all modules!"}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson Complete Celebration Modal (Triggered ONLY on lesson completion when topics exist) */}
      <AnimatePresence>
        {showLessonCompleteModal && completedLessonMeta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="relative max-w-md w-full rounded-[24px] border-2 border-primary/40 bg-card shadow-2xl p-6 sm:p-8 space-y-6 transform-gpu"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center text-primary">
                  <Award className="h-9 w-9 animate-pulse" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
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
                <div className="rounded-[14px] bg-primary/10 border border-primary/20 p-3 text-center space-y-1">
                  <span className="text-[10px] text-primary font-bold uppercase flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("totalLessonTime") || "Total Time Taken"}
                  </span>
                  <p className="text-lg font-extrabold text-primary tabular-nums">
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
                <div className="rounded-[14px] border bg-primary/5 border-primary/20 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
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
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-sm cursor-pointer"
                    onClick={continueToNextLesson}
                  >
                    <ArrowRight className="h-4 w-4" />
                    {t("continueToNextLesson") || "Continue to Next Lesson"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-sm cursor-pointer"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Study Header: docks right under fixed navbar (top-14 sm:top-16) or top-0 in focus mode */}
      <div
        className={cn(
          "z-30 flex flex-col bg-card/90 backdrop-blur-md border-b shadow-xs transition-all",
          isFocusMode ? "sticky top-0" : "sticky top-14 sm:top-16"
        )}
      >
        {/* Focus Lost Paused Alert Banner */}
        {!isFocusActive && (
          <div
            onClick={() => setIsFocusActive(true)}
            className="bg-primary/15 border-b border-primary/30 px-4 py-2 text-center text-xs font-medium text-primary flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-primary/20"
          >
            <Pause className="h-3.5 w-3.5 shrink-0" />
            <span>{t("studyTimerPausedFocusLost") || "Study timer paused (Focus lost) — Click anywhere to resume studying"}</span>
          </div>
        )}

        {/* Top Study Navigation Bar */}
        <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        {/* Navigation Back button to Lessons */}
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <button
            onClick={() => {
              if (currentItem) {
                setSelectedModuleId(currentItem.moduleId);
                setViewMode("module-lessons");
              } else {
                setViewMode("modules");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border transition-colors cursor-pointer shrink-0"
            title="Back to Lessons"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("backToLessons") || "Lessons"}</span>
            <span className="sm:hidden">{t("back") || "Back"}</span>
          </button>
          <span className="text-muted-foreground/40 hidden sm:inline">/</span>
          <span className="font-bold text-foreground truncate max-w-[150px] sm:max-w-[260px]">
            {currentItem?.lessonTitle}
          </span>
        </div>

        {/* Action / Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sidebar Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="gap-1.5 rounded-xl font-medium text-xs border-border cursor-pointer h-8 px-2.5"
            title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{isSidebarOpen ? (t("hideMenu") || "Hide Menu") : (t("courseMenu") || "Course Menu")}</span>
          </Button>

          {/* Active Lesson Study Timer */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums border transition-colors",
              isFocusActive
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
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
              showNotes ? "bg-primary/15 border-primary/30 text-primary" : "bg-background hover:bg-muted text-muted-foreground"
            )}
            title="Study notes & scratchpad"
          >
            <StickyNote className="h-4 w-4" />
          </button>

          {/* Language Switcher Dropdown (Taking Lessons) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-muted text-xs font-semibold transition-colors cursor-pointer text-foreground shadow-2xs"
                title={t("changeLanguage") || "Change course language"}
              >
                <span>{learningLanguage === "French" ? "🇫🇷" : learningLanguage === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                <span className="hidden sm:inline">{learningLanguage || "Language"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl space-y-0.5 z-50">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold">
                {t("courseLanguage") || "Course Language"}
              </DropdownMenuLabel>
              {[
                { lang: "Kinyarwanda" as const, flag: "🇷🇼", label: "Ikinyarwanda" },
                { lang: "French" as const, flag: "🇫🇷", label: "Français" },
                { lang: "English" as const, flag: "🇬🇧", label: "English" },
              ].map((item) => (
                <DropdownMenuItem
                  key={item.lang}
                  onClick={() => requestLanguageSwitch(item.lang)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                    learningLanguage === item.lang
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.flag}</span>
                    <span>{item.label}</span>
                  </div>
                  {learningLanguage === item.lang && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Plain Terms Legal Explainer Toggle */}
          <button
            type="button"
            onClick={handleTogglePlainLanguage}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
              isPlainLanguageOpen
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background hover:bg-muted text-muted-foreground border-border"
            )}
            title="Explain road rules in plain, simple terms [Press P]"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Plain Terms</span>
          </button>

          {/* AI Neural Cloud Voice Player Toggle */}
          {!isTTSDisabled && (
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
          )}

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
    </div>

      {/* Main Study Layout — Decoupled Independent Scrolling */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left Sidebar (Toggleable, Independent Scrolling: Scroll here NEVER affects lesson content) */}
        {!isFocusMode && (
          <aside
            className={cn(
              "border-r bg-card/75 backdrop-blur-md transition-all duration-300 flex flex-col shrink-0 h-full z-20 select-none",
              isSidebarOpen ? "w-72 sm:w-80" : "w-0 overflow-hidden border-r-0 opacity-0 pointer-events-none"
            )}
          >
            <div className="flex items-center justify-between p-3 border-b h-12 bg-muted/20 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 truncate">
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{t("coursesAndLessons") || "Course Structure"}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                title="Hide sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Independent scroll container for sidebar */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain scrollbar-thin">
              {course.modules.map((mod, modIdx) => {
                const isModSelected = selectedModuleId === mod.id;
                const modLessonsCount = mod.lessons.length;
                const page = sidebarLessonPage[mod.id] || 0;
                const totalPages = Math.ceil(modLessonsCount / 10);
                const startIdx = page * 10;
                const pageLessons = mod.lessons.slice(startIdx, startIdx + 10);

                return (
                  <div key={mod.id} className="rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-2xs">
                    {/* Course Accordion Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedModuleId === mod.id) {
                          setSelectedModuleId(null);
                        } else {
                          setSelectedModuleId(mod.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 text-xs font-bold transition-colors text-left cursor-pointer",
                        isModSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                          #{modIdx + 1}
                        </span>
                        <span className="truncate">{mod.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                        <span className="text-[10px] font-mono">{modLessonsCount}</span>
                        {isModSelected ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </div>
                    </button>

                    {/* Lessons Dropdown */}
                    {isModSelected && (
                      <div className="p-2 border-t border-border/50 bg-background/50 space-y-1">
                        {/* 10 Lessons at a time pagination controls if > 10 */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-muted-foreground bg-muted/50 rounded-lg mb-1">
                            <span>{startIdx + 1}-{Math.min(startIdx + 10, modLessonsCount)} / {modLessonsCount}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={page === 0}
                                onClick={() => setSidebarLessonPage((prev) => ({ ...prev, [mod.id]: page - 1 }))}
                                className="px-1.5 py-0.5 rounded bg-card hover:bg-muted border disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Previous 10 lessons"
                              >
                                &lt; Prev
                              </button>
                              <button
                                type="button"
                                disabled={page >= totalPages - 1}
                                onClick={() => setSidebarLessonPage((prev) => ({ ...prev, [mod.id]: page + 1 }))}
                                className="px-1.5 py-0.5 rounded bg-card hover:bg-muted border disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                title="Next 10 lessons"
                              >
                                Next &gt;
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 10 Lessons Slice */}
                        {pageLessons.map((lesson, localIdx) => {
                          const globalLIdx = startIdx + localIdx;
                          const isUnlocked = isLessonUnlocked(mod.id, globalLIdx);
                          const isComplete = isLessonCompleted(lesson.id);
                          const isCurrent = currentItem?.lessonId === lesson.id;
                          const isExpanded = expandedLessons.has(lesson.id);
                          const topics = parseTopics(lesson.topics);

                          return (
                            <div key={lesson.id} className="space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  toggleLessonExpand(lesson.id);
                                  if (isUnlocked && !isCurrent) {
                                    startLesson(mod.id, lesson.id);
                                  }
                                }}
                                disabled={!isUnlocked}
                                className={cn(
                                  "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer",
                                  isCurrent
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                    : isUnlocked
                                    ? "hover:bg-muted text-foreground"
                                    : "opacity-40 cursor-not-allowed text-muted-foreground"
                                )}
                              >
                                <span className="shrink-0 text-[10px] font-mono opacity-70">
                                  #{globalLIdx + 1}
                                </span>
                                {topics.length > 0 ? (
                                  isExpanded ? (
                                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                                  ) : (
                                    <Folder className="h-3.5 w-3.5 shrink-0" />
                                  )
                                ) : isUnlocked ? (
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span className="flex-1 truncate text-[11px]">{lesson.title}</span>
                                {isComplete && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                              </button>

                              {/* Topics list under lesson if expanded */}
                              {isExpanded && topics.length > 0 && (
                                <div className="ml-3 pl-2 border-l border-border/60 space-y-0.5 py-0.5">
                                  {topics.map((tp) => {
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
                                          "w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors text-left cursor-pointer",
                                          isTpCurrent
                                            ? "bg-primary/20 text-primary font-bold"
                                            : isTpDone
                                            ? "text-primary hover:bg-muted/50"
                                            : isTpUnlocked
                                            ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                                            : "opacity-40 cursor-not-allowed text-muted-foreground"
                                        )}
                                      >
                                        {isTpDone ? (
                                          <CheckCircle2 className="h-3 w-3 shrink-0 text-primary" />
                                        ) : (
                                          <FileText className="h-3 w-3 shrink-0" />
                                        )}
                                        <span className="flex-1 truncate">{tp.title}</span>
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
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Reader Content Canvas — Independent scroll container: Scroll here NEVER affects the sidebar */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 pb-32 max-w-4xl mx-auto scrollbar-thin bg-background">
          {/* Main Topic / Reading Card — All content rendered together, NO inner scrollbar */}
          <div className="rounded-[20px] border bg-card shadow-sm overflow-hidden relative">
            <div className="p-5 sm:p-8 space-y-6">
              {/* Topic Header & Meta (Sticky inside card so title remains always visible) */}
              <div className="space-y-2 border-b pb-4 sticky top-0 bg-card/95 backdrop-blur-md z-10 pt-1 -mt-1">
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
                    <span className="inline-flex items-center gap-1 text-primary font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("completed") || "Completed"}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  {currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle}
                </h1>
              </div>

              {/* AI Cloud Neural Voice Player (Gemini TTS) */}
              {isTTSOpen && !isTTSDisabled && (
                <AINeuralVoicePlayer
                  audioUrl={ttsAudioUrl}
                  isLoading={isLoadingTTS}
                  language={learningLanguage || "English"}
                  topicTitle={currentTopic?.title || currentLesson?.title || "Lesson Note"}
                  onClose={() => setIsTTSOpen(false)}
                  onRetry={handleToggleTTS}
                />
              )}

              {/* Plain Language Explainer Card (Rwanda Traffic Code Simplified) */}
              {isPlainLanguageOpen && plainData && (
                <PlainLanguageCard
                  data={plainData}
                  language={learningLanguage || "English"}
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

              {/* Topic Body Content — Rendered naturally in full height, NO nested card scrollbar */}
              <div onMouseUp={handleMouseUpContent} className="w-full transition-all leading-relaxed">
                {currentContent ? (
                  <LessonContentView content={currentContent} textSize={textSize} />
                ) : (
                  <p className="text-muted-foreground italic">{t("noContent") || "No content available yet."}</p>
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
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">P</kbd>
                  <span>{t("plainTerms") || "Plain Terms"}</span>
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
        </main>
      </div>

      {/* Fixed Navigation Buttons: Left corner (Previous) and Right corner (Next) outside the card */}
      <div className="pointer-events-none">
        {/* Previous Button (Bottom Left Corner) */}
        <button
          type="button"
          onClick={goToPrevious}
          disabled={currentItemIndex === 0}
          className="fixed bottom-20 lg:bottom-6 left-4 sm:left-8 z-40 pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-card/95 hover:bg-card text-foreground border border-border shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Previous (or press Left Arrow)"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t("previousTopic") || "Previous"}</span>
        </button>

        {/* Next Button (Bottom Right Corner) */}
        <button
          type="button"
          onClick={() => void goToNext()}
          className="fixed bottom-20 lg:bottom-6 right-4 sm:right-8 z-40 pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Next (or press Right Arrow)"
        >
          <span>
            {currentItem && isLastItemInLesson(currentItem)
              ? t("completeLesson") || "Complete Lesson"
              : t("nextTopic") || "Next"}
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Language Switch Confirmation Modal in Study View */}
      <AnimatePresence>
        {showSwitchConfirmModal && pendingSwitchLanguage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="max-w-md w-full bg-card rounded-2xl border border-border shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
                  {pendingSwitchLanguage === "French" ? "🇫🇷" : pendingSwitchLanguage === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {learningLanguage === "Kinyarwanda"
                      ? "Guhindura Ururimi rw'Amasomo?"
                      : learningLanguage === "French"
                      ? "Changer la langue du cours ?"
                      : "Switch Course Language?"}
                  </h3>
                  <p className="text-xs text-primary font-semibold">
                    {pendingSwitchLanguage === "French" ? "Français" : pendingSwitchLanguage === "Kinyarwanda" ? "Ikinyarwanda" : "English"}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {learningLanguage === "Kinyarwanda"
                  ? `Wifuza guhindura ururimi rw'amasomo rukaba ${pendingSwitchLanguage}? Amasomo yose, ibikoresho by'ubufasha, n'uburyo bwo kwiga bizahindurwa muri urwo rurimi.`
                  : learningLanguage === "French"
                  ? `Souhaitez-vous changer la langue du cours en ${pendingSwitchLanguage} ? Tous les modules, leçons et textes de l'interface seront traduits.`
                  : `Are you sure you want to switch the course language to ${pendingSwitchLanguage}? All course contents, lesson materials, and interface elements will be translated.`}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl font-medium"
                  onClick={() => {
                    setShowSwitchConfirmModal(false);
                    setPendingSwitchLanguage(null);
                  }}
                >
                  {t("cancel") || "Cancel"}
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold shadow-sm"
                  onClick={() => void executeLanguageSwitch(pendingSwitchLanguage)}
                >
                  {learningLanguage === "Kinyarwanda"
                    ? "Emeza Guhindura"
                    : learningLanguage === "French"
                    ? "Confirmer le changement"
                    : "Confirm Switch"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
