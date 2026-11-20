"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CourseViewSkeleton } from "@/components/skeletons";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
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
  HelpCircle,
  Brain,
  Search,
  ImageIcon,
  PanelLeftOpen,
  PanelLeftClose,
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
import { CourseTreePanel } from "@/components/course/course-tree-panel";
import { CourseImageStage } from "@/components/course/course-image-stage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { loadCourseByLanguage } from "@/app/dashboard/actions/course";
import { spaCache } from "@/lib/spa-cache";
import {
  invalidateStudentDashboardCache,
  invalidateStudentExamHistoryCache,
  studentCache,
} from "@/lib/student-cache";
import { SmartImage, preloadImages } from "@/components/smart-image";
import { extractContentImageUrls } from "@/lib/image-compression";
import { extractCourseMediaAndCleanContent, getLessonThumbnail } from "@/lib/course-media";
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

function parseTopics(raw: unknown): LessonTopicUI[] {
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

function contentHasImage(raw: unknown): boolean {
  if (!raw) return false;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return false;
    if (
      /<img[\s>]/i.test(str) ||
      /!\[[^\]]*\]\([^)]+\)/.test(str) ||
      /background-image\s*:\s*url\(/i.test(str) ||
      /"type"\s*:\s*"image"/i.test(str)
    ) {
      return true;
    }
    if (str.startsWith("{") || str.startsWith("[")) {
      try {
        return contentHasImage(JSON.parse(str));
      } catch {}
    }
    return false;
  }
  if (Array.isArray(raw)) {
    return raw.some((item) => contentHasImage(item));
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.type === "image" || obj.type === "imageUpload") return true;
    const attrs = obj.attrs as Record<string, unknown> | undefined;
    if (attrs && typeof attrs.src === "string" && attrs.src.trim().length > 0) return true;
    if (typeof obj.src === "string" && obj.src.trim().length > 0 && obj.type === "image") return true;
    if (Array.isArray(obj.content) && contentHasImage(obj.content)) return true;
    if (typeof obj.content === "string" && contentHasImage(obj.content)) return true;
  }
  return false;
}

function lessonHasImage(lesson: CourseLesson): boolean {
  const record = lesson as CourseLesson & {
    image_url?: string | null;
    lesson_image?: string | null;
    thumbnail_url?: string | null;
  };
  if (typeof record.media_url === "string" && record.media_url.trim().length > 0) return true;
  if (typeof record.image_url === "string" && record.image_url.trim().length > 0) return true;
  if (typeof record.lesson_image === "string" && record.lesson_image.trim().length > 0) return true;
  if (typeof record.thumbnail_url === "string" && record.thumbnail_url.trim().length > 0) return true;
  if (contentHasImage(lesson.content)) return true;
  const topics = parseTopics(lesson.topics);
  return topics.some((topic) => contentHasImage(topic.content));
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

interface CourseCatalogCache {
  course: CourseWithModules;
  sequentialUnlockEnabled: boolean;
}

interface CourseProgressCache {
  moduleProgress: [string, ModuleProgress][];
  lessonProgress: [string, LessonProgress][];
  completedKeys: string[];
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
  const { user: authUser, loading: authLoading } = useAuth();
  const { enabledLanguages } = useLearningLanguages();
  const initialStoredLang =
    typeof window !== "undefined" ? localStorage.getItem("luxen_course_lang") : null;
  const initialLangGuess: LearningLanguage | null =
    initialStoredLang && isLearningLanguage(initialStoredLang) ? initialStoredLang : null;
  const initialHotCatalog = initialLangGuess
    ? studentCache.getHot<CourseCatalogCache>(`course_catalog_${initialLangGuess}`, {
        tier: "public",
      })
    : null;
  const initialHotProgress =
    initialLangGuess && authUser?.id
      ? studentCache.getHot<CourseProgressCache>(`course_progress_${initialLangGuess}`, {
          tier: "private",
          userId: authUser.id,
        })
      : null;

  const [course, setCourse] = useState<CourseWithModules | null>(initialHotCatalog?.course ?? null);
  const [sequentialUnlockEnabled, setSequentialUnlockEnabled] = useState(
    initialHotCatalog?.sequentialUnlockEnabled ?? true
  );
  const [learningLanguage, setLearningLanguage] = useState<LearningLanguage | null>(
    initialHotCatalog ? initialLangGuess : null
  );
  const [loading, setLoading] = useState(!initialHotCatalog?.course);
  const [savingLanguage, setSavingLanguage] = useState(false);

  // View state: "modules" (Course overview) | "module-lessons" (Selected module's lesson list) | "study" (Active reader) | "reading"
  const [viewMode, setViewMode] = useState<"modules" | "module-lessons" | "study" | "reading">("modules");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(
    () => new Set(initialHotProgress?.completedKeys || [])
  );
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
  const [moduleProgress, setModuleProgress] = useState<Map<string, ModuleProgress>>(
    () => new Map(initialHotProgress?.moduleProgress || [])
  );
  const [lessonProgress, setLessonProgress] = useState<Map<string, LessonProgress>>(
    () => new Map(initialHotProgress?.lessonProgress || [])
  );
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");

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

  // AI Cloud Neural Voice Player (fail closed until server verification confirms enabled)
  const [isTTSOpen, setIsTTSOpen] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [isTTSDisabled, setIsTTSDisabled] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const handleDisabled = () => {
      setIsTTSDisabled(true);
      setIsTTSOpen(false);
      setIsLoadingTTS(false);
    };

    const checkLearningTTS = () => {
      const activeLang = translatedLang || learningLanguage || "Kinyarwanda";
      fetch(`/api/ai/tts?scope=learning&language=${encodeURIComponent(activeLang)}`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : { enabled: false }))
        .then((data) => {
          if (!active || !data) return;
          if (data.masterEnabled === false || data.quotaExceeded === true) {
            setIsTTSDisabled(true);
            setIsTTSOpen(false);
            markTTSDisabledForSession();
          } else if (data.enabled !== true) {
            setIsTTSDisabled(true);
            setIsTTSOpen(false);
          } else {
            try {
              sessionStorage.removeItem("luxen_tts_disabled");
            } catch {}
            setIsTTSDisabled(false);
          }
        })
        .catch(() => {
          if (active) {
            setIsTTSDisabled(true);
            setIsTTSOpen(false);
          }
        });
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "luxen_tts_updated_at" || e.key === "luxen_tts_disabled") {
        checkLearningTTS();
      }
    };

    window.addEventListener("luxen-tts-disabled", handleDisabled);
    window.addEventListener("luxen-tts-enabled", checkLearningTTS);
    window.addEventListener("system-config-updated", checkLearningTTS);
    window.addEventListener("luxen-tts-config-updated", checkLearningTTS);
    window.addEventListener("storage", handleStorage);

    checkLearningTTS();

    return () => {
      active = false;
      window.removeEventListener("luxen-tts-disabled", handleDisabled);
      window.removeEventListener("luxen-tts-enabled", checkLearningTTS);
      window.removeEventListener("system-config-updated", checkLearningTTS);
      window.removeEventListener("luxen-tts-config-updated", checkLearningTTS);
      window.removeEventListener("storage", handleStorage);
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

  const moduleParam = (params.get("module") || params.get("moduleId") || "").toLowerCase();
  const filterParam = (params.get("filter") || "").toLowerCase();
  const isRoadSignsFilter = moduleParam === "signs" || filterParam === "images";

  const prevRoadSignsFilterRef = useRef(isRoadSignsFilter);
  useEffect(() => {
    if (prevRoadSignsFilterRef.current !== isRoadSignsFilter) {
      prevRoadSignsFilterRef.current = isRoadSignsFilter;
      if (!isRoadSignsFilter) {
        setViewMode("modules");
        setSelectedModuleId(null);
      }
    }
  }, [isRoadSignsFilter]);

  const effectiveCourse = useMemo<CourseWithModules | null>(() => {
    if (!course) return null;
    if (!isRoadSignsFilter) return course;
    const filteredModules = course.modules
      .map((mod) => {
        const imageLessons = mod.lessons.filter(lessonHasImage);
        if (imageLessons.length === 0) return null;
        return {
          ...mod,
          lessons: imageLessons,
        };
      })
      .filter((mod): mod is ModuleWithLessons => mod !== null);
    return {
      ...course,
      modules: filteredModules,
    };
  }, [course, isRoadSignsFilter]);

  const flatList = useMemo(() => (effectiveCourse ? buildFlatList(effectiveCourse) : []), [effectiveCourse]);

  const itemKey = (item: FlatItem) =>
    item.type === "topic"
      ? `${item.lessonId}:${item.topicId}`
      : item.type === "exam"
      ? `exam:${item.moduleId}`
      : item.lessonId;

  const currentItem = flatList[currentItemIndex] || null;

  // Automatically enter the grid list of signs when opening Road Signs (?module=signs / ?filter=images)
  useEffect(() => {
    if (!isRoadSignsFilter || !effectiveCourse || effectiveCourse.modules.length === 0) return;

    const hasDirectStudyLink = Boolean(
      params.get("lesson") ||
      params.get("lessonId") ||
      params.get("topic") ||
      params.get("topicId")
    );
    if (hasDirectStudyLink) return;

    const hasValidSelected = selectedModuleId
      ? effectiveCourse.modules.some((m) => m.id === selectedModuleId)
      : false;

    if (!hasValidSelected) {
      const preferredMod =
        effectiveCourse.modules.find((m) => /byapa|sign|panneau/i.test(m.title)) ||
        effectiveCourse.modules[0];
      if (preferredMod) {
        setSelectedModuleId(preferredMod.id);
      }
    }

    if (viewMode === "modules") {
      setViewMode("module-lessons");
    }
  }, [isRoadSignsFilter, effectiveCourse, selectedModuleId, viewMode, params]);

  // Selected module object
  const currentModule = useMemo(() => {
    if (!effectiveCourse) return null;
    if (selectedModuleId) {
      const matched = effectiveCourse.modules.find((m) => m.id === selectedModuleId);
      if (matched) return matched;
    }
    if (isRoadSignsFilter) {
      return (
        effectiveCourse.modules.find((m) => /byapa|sign|panneau/i.test(m.title)) ||
        effectiveCourse.modules[0] ||
        null
      );
    }
    if (currentItem) {
      return effectiveCourse.modules.find((m) => m.id === currentItem.moduleId) || effectiveCourse.modules[0] || null;
    }
    return effectiveCourse.modules[0] || null;
  }, [effectiveCourse, selectedModuleId, currentItem, isRoadSignsFilter]);

  const filteredLessons = useMemo(() => {
    if (!currentModule) return [];
    if (!sidebarSearchQuery.trim()) return currentModule.lessons;
    const q = sidebarSearchQuery.toLowerCase();
    return currentModule.lessons.filter((lesson) => {
      if (lesson.title.toLowerCase().includes(q)) return true;
      const topics = parseTopics(lesson.topics);
      return topics.some((tp) => tp.title.toLowerCase().includes(q));
    });
  }, [currentModule, sidebarSearchQuery]);

  // Current lesson object
  const currentLesson = useMemo(() => {
    if (!effectiveCourse || !currentItem) return null;
    const mod = effectiveCourse.modules.find((m) => m.id === currentItem.moduleId);
    return mod?.lessons.find((l) => l.id === currentItem.lessonId) || null;
  }, [effectiveCourse, currentItem]);

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

  const loadProgress = useCallback(async (courseData: CourseWithModules, langOverride?: LearningLanguage | null) => {
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

    const targetLang = langOverride || courseData.language;
    if (authUser?.id && targetLang) {
      void studentCache.write<CourseProgressCache>(
        `course_progress_${targetLang}`,
        {
          moduleProgress: Array.from(modMap.entries()),
          lessonProgress: Array.from(lesMap.entries()),
          completedKeys: Array.from(completed),
        },
        { tier: "private", userId: authUser.id, category: "course_progress" }
      );
    }
  }, [authUser?.id]);

  const loadCourse = useCallback(async (selectedLanguage: LearningLanguage | null) => {
    if (!selectedLanguage) {
      setCourse(null);
      setLoading(false);
      return;
    }

    const catalogKey = `course_catalog_${selectedLanguage}`;
    const progressKey = `course_progress_${selectedLanguage}`;

    let hasCachedCatalog = false;
    const hotCatalog =
      studentCache.getHot<CourseCatalogCache>(catalogKey, { tier: "public" }) ||
      (spaCache.get<CourseWithModules>(`spa_course_${selectedLanguage}`)
        ? {
            course: spaCache.get<CourseWithModules>(`spa_course_${selectedLanguage}`)!,
            sequentialUnlockEnabled:
              spaCache.get<boolean>(`spa_course_seq_${selectedLanguage}`) ?? true,
          }
        : null);

    if (hotCatalog?.course) {
      hasCachedCatalog = true;
      setSequentialUnlockEnabled(hotCatalog.sequentialUnlockEnabled);
      setCourse(hotCatalog.course);
      if (hotCatalog.course.modules.length > 0 && !selectedModuleId) {
        setSelectedModuleId(hotCatalog.course.modules[0].id);
      }
      setLoading(false);
    } else {
      const persistedCatalog = await studentCache.read<CourseCatalogCache>(catalogKey, {
        tier: "public",
        maxAgeMs: 30 * 60 * 1000,
      });
      if (persistedCatalog?.data?.course) {
        hasCachedCatalog = true;
        setSequentialUnlockEnabled(persistedCatalog.data.sequentialUnlockEnabled);
        setCourse(persistedCatalog.data.course);
        if (persistedCatalog.data.course.modules.length > 0 && !selectedModuleId) {
          setSelectedModuleId(persistedCatalog.data.course.modules[0].id);
        }
        setLoading(false);
      }
    }

    if (authUser?.id) {
      const persistedProgress = await studentCache.read<CourseProgressCache>(progressKey, {
        tier: "private",
        userId: authUser.id,
        maxAgeMs: 5 * 60 * 1000,
      });
      if (persistedProgress?.data) {
        setModuleProgress(new Map(persistedProgress.data.moduleProgress || []));
        setLessonProgress(new Map(persistedProgress.data.lessonProgress || []));
        setCompletedItems(new Set(persistedProgress.data.completedKeys || []));
      }
    }

    if (!hasCachedCatalog) {
      setLoading(true);
    }

    try {
      const { course, sequentialUnlockEnabled: seqUnlock } = await loadCourseByLanguage(selectedLanguage);
      const resolvedSeq = seqUnlock !== false;
      setSequentialUnlockEnabled(resolvedSeq);
      spaCache.set(`spa_course_seq_${selectedLanguage}`, resolvedSeq);
      if (!course) {
        if (!hasCachedCatalog) {
          spaCache.delete(`spa_course_${selectedLanguage}`);
          setCourse(null);
        }
        setLoading(false);
        return;
      }

      spaCache.set(`spa_course_${selectedLanguage}`, course);
      void studentCache.write<CourseCatalogCache>(
        catalogKey,
        { course, sequentialUnlockEnabled: resolvedSeq },
        { tier: "public", category: "course_catalog" }
      );
      setCourse(course);
      if (course.modules.length > 0 && !selectedModuleId) {
        setSelectedModuleId(course.modules[0].id);
      }
      setLoading(false);
      await loadProgress(course, selectedLanguage);
    } catch (err) {
      console.error("Failed to revalidate course in background:", err);
      setLoading(false);
    }
  }, [authUser?.id, loadProgress, selectedModuleId]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setLoading(false);
      return;
    }

    const loadLearningLanguage = async () => {
      const storedLocal = typeof window !== "undefined" ? localStorage.getItem("luxen_course_lang") : null;
      const cachedUiLang = typeof window !== "undefined" ? localStorage.getItem("navo-language") : null;
      const persistedLangRec = authUser?.id
        ? await studentCache.read<LearningLanguage>("course_learning_language", {
            tier: "private",
            userId: authUser.id,
            maxAgeMs: 24 * 60 * 60 * 1000,
          })
        : null;

      let quickLang: LearningLanguage | null = null;
      if (persistedLangRec?.data && isLearningLanguage(persistedLangRec.data)) {
        quickLang = persistedLangRec.data;
      } else if (storedLocal && isLearningLanguage(storedLocal)) {
        quickLang = storedLocal;
      } else if (
        cachedUiLang &&
        cachedUiLang !== "Kinyarwanda" &&
        isLearningLanguage(cachedUiLang)
      ) {
        quickLang = cachedUiLang;
      }

      if (quickLang) {
        setShowLanguagePicker(false);
        setLearningLanguage(quickLang);
        void loadCourse(quickLang);
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();
      const savedLanguage = profile?.learning_language;

      let effectiveLang: LearningLanguage | null = null;
      if (storedLocal && isLearningLanguage(storedLocal)) {
        effectiveLang = storedLocal;
      } else if (savedLanguage && isLearningLanguage(savedLanguage)) {
        effectiveLang = savedLanguage;
        if (typeof window !== "undefined" && savedLanguage !== "Kinyarwanda") {
          localStorage.setItem("luxen_course_lang", savedLanguage);
        }
      } else if (
        cachedUiLang &&
        cachedUiLang !== "Kinyarwanda" &&
        isLearningLanguage(cachedUiLang)
      ) {
        effectiveLang = cachedUiLang;
      }

      const selectedLanguage: LearningLanguage = effectiveLang || "Kinyarwanda";
      void studentCache.write("course_learning_language", selectedLanguage, {
        tier: "private",
        userId: user.id,
        category: "course_progress",
      });
      setShowLanguagePicker(false);
      setLearningLanguage(selectedLanguage);
      if (selectedLanguage !== quickLang) {
        await loadCourse(selectedLanguage);
      }
    };

    void loadLearningLanguage();
  }, [authLoading, authUser, loadCourse]);

  const handleChooseCourseLanguage = async (chosen: LearningLanguage) => {
    setShowLanguagePicker(false);
    setLoading(true);
    setLearningLanguage(chosen);
    if (typeof window !== "undefined") {
      localStorage.setItem("luxen_course_lang", chosen);
    }
    await selectLearningLanguage(chosen);
    await loadCourse(chosen);
    setLoading(false);
  };

  // Deep-linking: jump to a specific topic or lesson via ?lesson=<id>&topic=<id>
  useEffect(() => {
    const lessonId = params.get("lesson") || params.get("lessonId");
    const topicId = params.get("topic") || params.get("topicId");
    const rawModuleParam = params.get("module") || params.get("moduleId");
    const moduleId = rawModuleParam && rawModuleParam.toLowerCase() !== "signs" ? rawModuleParam : null;

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

  // Preload upcoming lesson & road sign images through /_next/image (Sharp WebP)
  useEffect(() => {
    if (viewMode !== "study" || !effectiveCourse || flatList.length === 0) return;
    const upcomingItems = flatList.slice(currentItemIndex, currentItemIndex + 4);
    const urlsToPreload: string[] = [];

    for (const item of upcomingItems) {
      if (item.type === "exam") continue;
      const mod = effectiveCourse.modules.find((m) => m.id === item.moduleId);
      const lesson = mod?.lessons.find((l) => l.id === item.lessonId);
      if (!lesson) continue;
      const record = lesson as CourseLesson & {
        image_url?: string | null;
        lesson_image?: string | null;
        thumbnail_url?: string | null;
      };
      if (typeof record.media_url === "string" && record.media_url.startsWith("http")) {
        urlsToPreload.push(record.media_url);
      }
      if (typeof record.image_url === "string" && record.image_url.startsWith("http")) {
        urlsToPreload.push(record.image_url);
      }
      if (typeof record.lesson_image === "string" && record.lesson_image.startsWith("http")) {
        urlsToPreload.push(record.lesson_image);
      }
      if (item.type === "topic" && item.topicId) {
        const tp = parseTopics(lesson.topics).find((t) => t.id === item.topicId);
        if (tp?.content) {
          urlsToPreload.push(...extractContentImageUrls(tp.content));
        }
      } else if (lesson.content) {
        urlsToPreload.push(...extractContentImageUrls(lesson.content));
      }
    }

    if (urlsToPreload.length > 0) {
      preloadImages(urlsToPreload);
    }
  }, [viewMode, effectiveCourse, flatList, currentItemIndex]);

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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("luxen_course_lang", selectedLanguage);
      } catch {}
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLearningLanguage(selectedLanguage);
      await loadCourse(selectedLanguage);
      setSavingLanguage(false);
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ learning_language: selectedLanguage })
      .eq("id", user.id);
    if (!error) {
      void studentCache.write("course_learning_language", selectedLanguage, {
        tier: "private",
        userId: user.id,
        category: "course_progress",
      });
      void invalidateStudentDashboardCache(user.id);
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
    if (!effectiveCourse) return false;
    for (const mod of effectiveCourse.modules) {
      const lesson = mod.lessons.find((l) => l.id === lessonId);
      if (lesson) {
        const topics = parseTopics(lesson.topics);
        if (topics.length === 0) return completedItems.has(lesson.id);
        return topics.every((t) => completedItems.has(`${lesson.id}:${t.id}`));
      }
    }
    return false;
  }, [lessonProgress, effectiveCourse, completedItems]);

  const isModuleCompleted = useCallback((moduleId: string): boolean => {
    if (!effectiveCourse) return false;
    const mod = effectiveCourse.modules.find((m) => m.id === moduleId);
    if (!mod) return false;
    const allLessonsDone = mod.lessons.length > 0 && mod.lessons.every((l) => isLessonCompleted(l.id));
    const mp = moduleProgress.get(moduleId);
    const examTaken = (mp?.exam_attempts || 0) > 0;
    return allLessonsDone && (examTaken || !mod.examSettings);
  }, [effectiveCourse, isLessonCompleted, moduleProgress]);

  const isModuleUnlocked = useCallback((modIdx: number): boolean => {
    if (isRoadSignsFilter || !sequentialUnlockEnabled) return true;
    if (modIdx === 0) return true;
    if (!effectiveCourse) return false;
    const prevMod = effectiveCourse.modules[modIdx - 1];
    return prevMod ? isModuleCompleted(prevMod.id) : false;
  }, [effectiveCourse, isModuleCompleted, sequentialUnlockEnabled, isRoadSignsFilter]);

  const isLessonUnlocked = useCallback((moduleId: string, lessonIdx: number): boolean => {
    if (!effectiveCourse) return false;
    if (isRoadSignsFilter || !sequentialUnlockEnabled) return true;
    const modIdx = effectiveCourse.modules.findIndex((m) => m.id === moduleId);
    if (modIdx < 0 || !isModuleUnlocked(modIdx)) return false;

    // First lesson in an unlocked module is unlocked
    if (lessonIdx === 0) return true;

    // Subsequent lessons unlock ONLY after the previous lesson is completed!
    const mod = effectiveCourse.modules[modIdx];
    const prevLesson = mod.lessons[lessonIdx - 1];
    return prevLesson ? isLessonCompleted(prevLesson.id) : false;
  }, [effectiveCourse, isModuleUnlocked, isLessonCompleted, sequentialUnlockEnabled, isRoadSignsFilter]);

  const isItemUnlocked = useCallback((index: number): boolean => {
    if (isRoadSignsFilter || !sequentialUnlockEnabled) return true;
    if (index === 0) return true;
    const item = flatList[index];
    if (!item) return false;
    if (completedItems.has(itemKey(item))) return true;

    // Find the lesson and module for this item
    const modIdx = effectiveCourse?.modules.findIndex((m) => m.id === item.moduleId) ?? -1;
    if (modIdx < 0 || !isModuleUnlocked(modIdx)) return false;

    const mod = effectiveCourse?.modules[modIdx];
    const lessonIdx = mod?.lessons.findIndex((l) => l.id === item.lessonId) ?? -1;
    if (lessonIdx < 0 || !isLessonUnlocked(item.moduleId, lessonIdx)) return false;

    // For topics within the unlocked lesson
    if (item.type === "topic" && item.topicIndex !== undefined && item.topicIndex > 0) {
      const prevTopic = flatList[index - 1];
      return prevTopic ? completedItems.has(itemKey(prevTopic)) : false;
    }

    return true;
  }, [flatList, completedItems, effectiveCourse, isModuleUnlocked, isLessonUnlocked, sequentialUnlockEnabled, isRoadSignsFilter]);

  const isLastItemInLesson = (item: FlatItem | null): boolean => {
    if (!item) return false;
    const lessonItems = flatList.filter((f) => f.lessonId === item.lessonId && f.type !== "exam");
    const lastLessonItem = lessonItems[lessonItems.length - 1];
    return lastLessonItem ? itemKey(item) === itemKey(lastLessonItem) : false;
  };

  const saveLessonProgress = useCallback(async (item: FlatItem, isFullyCompleted = true, customTimeSpent?: number) => {
    if (item.type === "exam") return;
    const timeSpent = Math.max(customTimeSpent ?? lessonElapsedSeconds, 1);

    const mod = effectiveCourse?.modules.find((m) => m.id === item.moduleId);
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
          if (authUser?.id && learningLanguage) {
            const nextCompleted = new Set(completedItems);
            nextCompleted.add(itemKey(item));
            void studentCache.write<CourseProgressCache>(
              `course_progress_${learningLanguage}`,
              {
                moduleProgress: Array.from(moduleProgress.entries()),
                lessonProgress: Array.from(next.entries()),
                completedKeys: Array.from(nextCompleted),
              },
              { tier: "private", userId: authUser.id, category: "course_progress" }
            );
          }
          return next;
        });
        void invalidateStudentDashboardCache(authUser?.id);
      }
    } catch (error) {
      console.error("Failed to save lesson progress:", error);
    }
  }, [effectiveCourse, lessonElapsedSeconds, authUser?.id, learningLanguage, moduleProgress, completedItems]);

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
    await loadProgress(course, learningLanguage);
    void invalidateStudentDashboardCache(authUser?.id);
    void invalidateStudentExamHistoryCache(authUser?.id);

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
      : currentLesson?.content || "";

  const activeDisplayedContent = translatedContent || currentContent;

  const extractedMedia = useMemo(
    () => extractCourseMediaAndCleanContent(currentLesson, activeDisplayedContent),
    [currentLesson, activeDisplayedContent]
  );

  const currentEstimatedMinutes =
    currentItem?.type === "topic"
      ? currentTopic?.estimated_minutes || 3
      : currentLesson ? lessonTime(currentLesson) : 5;

  // 1-Click Language Switcher (Instant Cache or API Fetch)
  const handleLanguageSelect = async (targetLang: "English" | "French" | "Kinyarwanda") => {
    const isExtCourse = course?.id === "00000000-0000-0000-0000-00000000e001";
    const activeBaseLang = isExtCourse
      ? "Kinyarwanda"
      : ((learningLanguage as "English" | "French" | "Kinyarwanda") || "Kinyarwanda");

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

    const activeLang = translatedLang || learningLanguage || "Kinyarwanda";
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

    const activeLang = translatedLang || learningLanguage || "Kinyarwanda";
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
        setIsTTSOpen(false);
        setTtsAudioUrl(null);
        setIsTTSDisabled(true);
        if (data.quotaExceeded) {
          markTTSDisabledForSession();
        }
        return;
      }
      ttsCacheRef.current.set(cacheKey, data.audioUrl);
      setTtsAudioUrl(data.audioUrl);
    } catch {
      setIsTTSOpen(false);
      setTtsAudioUrl(null);
      setIsTTSDisabled(true);
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
    if (!effectiveCourse || flatList.length === 0) return null;

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
  }, [effectiveCourse, flatList, learningLanguage, completedItems]);

  const examAllModuleIds = useMemo(
    () => (effectiveCourse?.modules || []).map((m) => m.id),
    [effectiveCourse?.modules]
  );

  const examCompletedModuleIds = useMemo(
    () => (effectiveCourse?.modules || []).filter((m) => isModuleCompleted(m.id)).map((m) => m.id),
    [effectiveCourse?.modules, isModuleCompleted]
  );

  const nextModuleForActiveExam = useMemo(() => {
    if (!effectiveCourse?.modules || !activeExam?.moduleId) return null;
    const idx = effectiveCourse.modules.findIndex((m) => m.id === activeExam.moduleId);
    return idx >= 0 && idx + 1 < effectiveCourse.modules.length ? effectiveCourse.modules[idx + 1] : null;
  }, [effectiveCourse?.modules, activeExam?.moduleId]);

  const handleExitActiveExam = useCallback(() => {
    setActiveExam(null);
  }, []);

  const handleNextCourseFromExam = useCallback(() => {
    setActiveExam(null);
    if (nextModuleForActiveExam) {
      setSelectedModuleId(nextModuleForActiveExam.id);
      setViewMode("module-lessons");
    } else {
      setViewMode("modules");
    }
  }, [nextModuleForActiveExam]);

  if (authLoading || loading) {
    return <CourseViewSkeleton />;
  }

  if (!authUser) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-10">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5 sm:p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {t("signInRequired") !== "signInRequired" ? t("signInRequired") : "Bisaba Kwinjira muri Konti"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t("signInToAccessCourseAndExam") !== "signInToAccessCourseAndExam"
                ? t("signInToAccessCourseAndExam")
                : "Amasomo yose n'ibibazo by'ibizamini bibikiwe abanyeshuri binjiye muri konti zabo. Injira kugira ngo wige."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <a
              href="/?auth=login"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <span>{t("signInNow") !== "signInNow" ? t("signInNow") : "Injira Muri Konti"}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/traffic-assistant"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t("searchPublicRules") !== "searchPublicRules" ? t("searchPublicRules") : "Shakisha ku Rwego Rusange"}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showLanguagePicker || !learningLanguage) {
    return (
      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6 animate-in fade-in duration-200 select-none overflow-x-hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 border border-border transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("backToHome") || "Back to Home"}</span>
          </button>
        </div>

        <div className="text-center max-w-2xl mx-auto space-y-2 px-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("chooseCourseLanguage") || "Choose Course Language"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {t("chooseCourseLanguageDesc") || "Select the language you want to study your driving lessons in. You can take courses in any language regardless of your UI interface setting."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 pt-2 sm:pt-4">
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
              onClick={() => void handleChooseCourseLanguage(item.lang)}
              className={cn(
                "group cursor-pointer rounded-2xl border p-4 sm:p-6 flex flex-col justify-between transition-all hover:shadow-md hover:border-primary/50 bg-card min-w-0",
                learningLanguage === item.lang ? "border-primary ring-1 ring-primary/30" : "border-border/80"
              )}
            >
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl">{item.flag}</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary truncate max-w-full">
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-xs font-semibold text-primary/80 mt-0.5">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 sm:pt-6">
                <Button
                  className="w-full rounded-xl min-h-[40px] h-auto py-2 px-3 font-semibold text-xs sm:text-sm group-hover:bg-primary/90 transition-colors whitespace-normal text-center leading-tight"
                  disabled={savingLanguage}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleChooseCourseLanguage(item.lang);
                  }}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-current shrink-0" />
                  <span>{item.btnText}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!effectiveCourse) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 sm:px-6 py-8">
        <div className="text-center py-10 sm:py-14 border border-dashed rounded-2xl bg-muted/40 max-w-lg w-full p-5 sm:p-8 space-y-4">
          <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground opacity-40" />
          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold">{t("noCoursesAvailable") || "No courses available"}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{(t("noPublishedCourse") || "There is no published {language} course right now.").replace("{language}", learningLanguage)}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLearningLanguage(null)}
              className="rounded-xl text-xs cursor-pointer"
            >
              {t("changeLanguage") || "Change Language"}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("home")}
              className="rounded-xl text-xs cursor-pointer"
            >
              {t("backToHome") || "Back"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (activeExam) {
    return (
      <ModuleExamRunner
        examType={activeExam.type}
        moduleId={activeExam.moduleId}
        moduleTitle={activeExam.moduleTitle}
        nextCourseTitle={nextModuleForActiveExam?.title}
        onNextCourse={handleNextCourseFromExam}
        midtermModuleIds={activeExam.type === "midterm" ? examCompletedModuleIds : undefined}
        midtermQuestionCount={effectiveCourse.midterm_question_count || 30}
        midtermDurationMinutes={effectiveCourse.midterm_duration_minutes || 30}
        finalModuleIds={activeExam.type === "final" ? examAllModuleIds : undefined}
        finalQuestionCount={50}
        finalDurationMinutes={45}
        onComplete={handleExamComplete}
        onExit={handleExitActiveExam}
      />
    );
  }

  const handleSelectTreeLesson = (modId: string, lessonId: string, topicId?: string) => {
    startLesson(modId, lessonId, topicId);
    setIsMobileSidebarOpen(false);
  };

  const handleSelectTreeExam = (modId: string, examTitle: string) => {
    const mod = effectiveCourse.modules.find((m) => m.id === modId);
    const totalCount = mod?.lessons.length || 0;
    const completedCount = mod ? mod.lessons.filter((l) => isLessonCompleted(l.id)).length : 0;
    const reqCount = Math.max(1, Math.ceil(totalCount / 3));
    const isQuizUnlocked = totalCount === 0 || completedCount >= reqCount;
    if (!isQuizUnlocked) {
      toast.error(`Utari wakora 1/3 cy'amasomo (${completedCount}/${reqCount}) kugira ngo ufungure ikizamini.`);
      return;
    }
    setIsMobileSidebarOpen(false);
    startModuleExam(modId, examTitle);
  };

  const mobileCourseTreeDrawer = isMobileSidebarOpen ? (
    <div className="fixed inset-0 z-[100] flex lg:hidden">
      <div
        onClick={() => setIsMobileSidebarOpen(false)}
        className="fixed inset-0 bg-black/60"
        aria-hidden="true"
      />
      <div className="relative z-10 w-[85vw] max-w-[320px] h-full bg-card dark:bg-zinc-950 border-r border-border shadow-2xl flex flex-col">
        <CourseTreePanel
          modules={effectiveCourse.modules}
          parseTopics={parseTopics}
          lessonHasImage={lessonHasImage}
          isModuleUnlocked={isModuleUnlocked}
          isModuleCompleted={isModuleCompleted}
          isLessonUnlocked={isLessonUnlocked}
          isLessonCompleted={isLessonCompleted}
          isItemUnlocked={isItemUnlocked}
          completedItems={completedItems}
          flatList={flatList}
          activeModuleId={currentItem?.moduleId || currentModule?.id}
          activeLessonId={currentItem?.lessonId}
          activeTopicId={currentItem?.topicId}
          searchQuery={sidebarSearchQuery}
          onSearchChange={setSidebarSearchQuery}
          onSelectLesson={handleSelectTreeLesson}
          onSelectExam={handleSelectTreeExam}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          titleLabel={t("courseTree") !== "courseTree" ? t("courseTree") : "Course Tree"}
        />
      </div>
    </div>
  ) : null;

  const shouldSkipModulesOverview =
    isRoadSignsFilter && effectiveCourse.modules.length > 0 && viewMode === "modules";

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: MODULES LIST (Course Level)
  // ─────────────────────────────────────────────────────────────────────────────
  if (viewMode === "modules" && !shouldSkipModulesOverview) {
    return (
      <div
        className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-5 animate-in fade-in duration-200 select-none overflow-x-hidden"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {mobileCourseTreeDrawer}

        {/* Course Header */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("back", { fallback: "home" })}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-muted dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900 border border-border dark:border-zinc-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("back") || t("backToHome") || "Back"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/25 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("courseTree") !== "courseTree" ? t("courseTree") : "Course Tree"}</span>
              </button>

              {isRoadSignsFilter && (
                <button
                  type="button"
                  onClick={() => navigate("course")}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 transition-colors cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  <span>{t("allCourses") || "All Courses"}</span>
                </button>
              )}
            </div>

            {/* Language Switcher Bar (Clean responsive labels on all viewports) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-card border border-border dark:border-zinc-800 rounded-xl p-1 shadow-xs w-full sm:w-auto">
              {(["English", "French", "Kinyarwanda"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => void handleChooseCourseLanguage(lang)}
                  className={cn(
                    "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center min-w-0",
                    learningLanguage === lang
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="mr-1 sm:mr-1.5 shrink-0">{lang === "French" ? "🇫🇷" : lang === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                  <span className="sm:hidden">{lang === "French" ? "FR" : lang === "Kinyarwanda" ? "RW" : "EN"}</span>
                  <span className="hidden sm:inline">{lang}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground dark:text-zinc-100 break-words">
                {isRoadSignsFilter ? (t("roadSigns") || "Road Signs") : effectiveCourse.title}
              </h1>
              {isRoadSignsFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("coursesWithImages") || "Courses with Images"}</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400">
              {effectiveCourse.modules.length}{" "}
              {effectiveCourse.modules.length === 1 ? (t("module") || "Module") : (t("modules") || "Modules")} ·{" "}
              {formatMinutes(courseTime(effectiveCourse))} {t("totalEstimatedTime") || "total study time"}
            </p>
          </div>
        </div>

        {/* Continue from Last Topic Card (Single unified resume surface) */}
        {resumeTarget && (() => {
          const normTopic = resumeTarget.topicTitle.trim().toLowerCase();
          const normLesson = (resumeTarget.lessonTitle || "").trim().toLowerCase();
          const showLessonSubtitle = Boolean(resumeTarget.lessonTitle) && normLesson !== normTopic;

          return (
            <div className="rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 p-3 sm:p-4 sm:px-5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shadow-none overflow-hidden">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary min-w-0">
                    <BookMarked className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t("resumeLearning") || "Resume Learning"}</span>
                  </span>
                  {resumeTarget.topicCount > 1 && (
                    <span className="text-[11px] font-mono font-medium text-muted-foreground dark:text-zinc-400 tabular-nums shrink-0">
                      {resumeTarget.topicIndex + 1}/{resumeTarget.topicCount}
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground dark:text-zinc-100 leading-snug line-clamp-2 break-words">
                  {resumeTarget.topicTitle}
                </h2>
                <p className="text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed line-clamp-1 break-words">
                  <span className="font-semibold text-foreground/80 dark:text-zinc-300">{resumeTarget.moduleTitle}</span>
                  {showLessonSubtitle && ` · ${resumeTarget.lessonTitle}`}
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setCurrentItemIndex(resumeTarget.index);
                    setSelectedModuleId(resumeTarget.item.moduleId);
                    setViewMode("study");
                  }}
                  className="w-full sm:w-auto min-h-10 sm:min-h-9 h-auto py-2 px-3.5 sm:px-4 rounded-lg font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-none whitespace-normal text-center leading-tight"
                >
                  <Play className="h-3.5 w-3.5 fill-current mr-2 shrink-0" />
                  <span>{t("continueFromLastTopic") || "Continue Learning"}</span>
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Modules Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground dark:text-zinc-400">
              {t("modules") || "Modules"}
            </span>
            <span className="text-xs font-mono text-muted-foreground dark:text-zinc-400 tabular-nums">
              {effectiveCourse.modules.length} {effectiveCourse.modules.length === 1 ? (t("module") || "Module") : (t("modules") || "Modules")}
            </span>
          </div>

          {effectiveCourse.modules.length === 0 ? (
            <div className="text-center py-12 sm:py-14 border border-dashed rounded-2xl bg-card p-5 sm:p-6 space-y-3">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                {t("noCoursesWithImages") || "No courses with images found"}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t("noCoursesWithImagesDesc") || "No road sign lessons with images are available in this language yet."}
              </p>
              <Button size="sm" onClick={() => navigate("course")} className="rounded-lg text-xs">
                {t("allCourses") || "View All Courses"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {effectiveCourse.modules.map((module, modIdx) => {
                const isUnlocked = isModuleUnlocked(modIdx);
                const isComplete = isModuleCompleted(module.id);
                const totalLessons = module.lessons.length;
                const completedLessonsCount = module.lessons.filter((l) => isLessonCompleted(l.id)).length;
                const modulePct = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
                const calcModuleTime = moduleTime(module);
                const hasVisualLessons = module.lessons.some(lessonHasImage);

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
                      <div className="flex items-start justify-between gap-2">
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

                        <div className="flex items-center flex-wrap justify-end gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 px-2 py-0.5 rounded bg-muted dark:bg-zinc-800/80 border border-border dark:border-zinc-700/50 tabular-nums">
                            {String(modIdx + 1).padStart(2, "0")}
                          </span>
                          {hasVisualLessons && (
                            <span
                              title="Contains visual diagrams / road signs"
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center"
                            >
                              <ImageIcon className="h-3 w-3" />
                            </span>
                          )}
                          {isComplete && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold">
                              {t("completed") || "Done"}
                            </span>
                          )}
                          {!isComplete && isUnlocked && completedLessonsCount > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-semibold">
                              {t("inProgress") || "In Progress"}
                            </span>
                          )}
                          {!isUnlocked && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted dark:bg-zinc-800/50 text-muted-foreground dark:text-zinc-500 font-semibold flex items-center border border-border dark:border-zinc-700/40">
                              <Lock className="h-2.5 w-2.5 mr-1" /> {t("locked") || "Locked"}
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

                      <div className="flex items-center text-xs text-muted-foreground dark:text-zinc-400 pt-1 flex-wrap font-mono">
                        <span className="mr-3">{totalLessons} {t("lessons") || "Lessons"}</span>
                        <span className="flex items-center mr-3">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatMinutes(calcModuleTime)}
                        </span>
                        {module.examSettings && (
                          <span className="flex items-center text-primary font-medium">
                            <FileText className="h-3 w-3 mr-1" />
                            {t("moduleExam") || "Module Exam"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2.5 border-t border-border/80 dark:border-zinc-800/80">
                      {/* Module Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground dark:text-zinc-400">
                          <span>{t("progress") || "progress"}</span>
                          <span className="text-foreground dark:text-zinc-300 font-bold">{completedLessonsCount}/{totalLessons} ({modulePct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${modulePct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        {isUnlocked ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModuleLessons(module.id);
                            }}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-lg shadow-none h-8"
                          >
                            <span>{t("open") || "Open"}</span>
                            <ArrowRight className="h-3.5 w-3.5 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="w-full text-xs rounded-lg h-8 opacity-70"
                          >
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            <span>{t("locked") || "Locked"}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: MODULE LESSONS (Selected Module Detail / Direct Road Signs Grid)
  // ─────────────────────────────────────────────────────────────────────────────
  if ((viewMode === "module-lessons" || shouldSkipModulesOverview) && currentModule) {
    const totalLessons = currentModule.lessons.length;
    const completedLessonsCount = currentModule.lessons.filter((l) => isLessonCompleted(l.id)).length;
    const modulePct = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;
    const requiredForQuiz = Math.max(1, Math.ceil(totalLessons / 3));
    const isQuizUnlocked = totalLessons === 0 || completedLessonsCount >= requiredForQuiz;

    return (
      <div
        className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-5 animate-in fade-in duration-200 select-none overflow-x-hidden"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {mobileCourseTreeDrawer}

        {/* Navigation Breadcrumb */}
        <div className="space-y-3 border-b border-border dark:border-zinc-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isRoadSignsFilter) {
                    navigate("back", { fallback: "home" });
                  } else {
                    setViewMode("modules");
                  }
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-muted dark:bg-[rgb(15,15,16)] dark:hover:bg-zinc-900 border border-border dark:border-zinc-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                <span>
                  {isRoadSignsFilter
                    ? t("back") || t("backToHome") || "Back"
                    : t("allModules") || "All Modules"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/25 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 mr-1.5" />
                <span>{t("courseTree") !== "courseTree" ? t("courseTree") : "Course Tree"}</span>
              </button>

              {isRoadSignsFilter && (
                <button
                  type="button"
                  onClick={() => navigate("course")}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20 transition-colors cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  <span>{t("allCourses") || "All Courses"}</span>
                </button>
              )}
            </div>

            {isRoadSignsFilter && (
              <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-card border border-border dark:border-zinc-800 rounded-xl p-1 shadow-xs w-full sm:w-auto">
                {(["English", "French", "Kinyarwanda"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => void handleChooseCourseLanguage(lang)}
                    className={cn(
                      "px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center min-w-0",
                      learningLanguage === lang
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="mr-1 sm:mr-1.5 shrink-0">{lang === "French" ? "🇫🇷" : lang === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                    <span className="sm:hidden">{lang === "French" ? "FR" : lang === "Kinyarwanda" ? "RW" : "EN"}</span>
                    <span className="hidden sm:inline">{lang}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-foreground dark:text-zinc-100 break-words">
                {isRoadSignsFilter ? (t("roadSigns") || "Road Signs") : currentModule.title}
              </h1>
              {isRoadSignsFilter && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  <span>{currentModule.title}</span>
                </span>
              )}
            </div>
          </div>

          {isRoadSignsFilter && effectiveCourse.modules.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {effectiveCourse.modules.map((mod) => {
                const isActive = mod.id === currentModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {mod.title}
                  </button>
                );
              })}
            </div>
          )}

          {currentModule.description && (
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-2xl break-words">
              {currentModule.description}
            </p>
          )}

          {/* Module Progress Overview */}
          <div className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-[rgb(15,15,16)] p-3 sm:p-3.5 space-y-2 mt-2 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs font-mono">
              <span className="text-muted-foreground dark:text-zinc-400">{t("progress") || "Progress"}</span>
              <span className="text-primary font-bold tabular-nums">
                {completedLessonsCount} / {totalLessons} {t("lessonsMastered") || "Mastered"} ({modulePct}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${modulePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* File Explorer Grid for Lessons (1 col on ultra-narrow, 2 cols on small Android 5 screens, scaling up) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-xs font-medium text-muted-foreground dark:text-zinc-400 flex items-center">
              <FolderOpen className="h-3.5 w-3.5 text-primary mr-2 shrink-0" />
              <span className="sm:hidden">nPhone Explorer</span>
              <span className="hidden sm:inline">{t("moduleFiles") || "Desktop File Explorer"}</span>
            </span>
            <span className="text-xs font-mono text-muted-foreground dark:text-zinc-400 tabular-nums">
              {currentModule.lessons.length} {t("lessons") || "lessons"} {currentModule.examSettings ? "+ 1 Quiz" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 min-[340px]:grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {currentModule.lessons.map((lesson, lessonIdx) => {
              const isUnlocked = isLessonUnlocked(currentModule.id, lessonIdx);
              const isComplete = isLessonCompleted(lesson.id);
              const topics = parseTopics(lesson.topics);
              const calcLessonTime = lessonTime(lesson);
              const completedTopicsInLesson = topics.filter((tp) =>
                completedItems.has(`${lesson.id}:${tp.id}`)
              ).length;
              const isInProgress = !isComplete && isUnlocked && completedTopicsInLesson > 0;
              const thumbUrl = getLessonThumbnail(lesson);

              return (
                <div
                  key={lesson.id}
                  onClick={() => {
                    if (!isUnlocked) {
                      toast.error("Isomo rirafunze! Banza urangize isomo ribanziriza iri.");
                      return;
                    }
                    const idx = flatList.findIndex((item) => item.lessonId === lesson.id);
                    if (idx >= 0) {
                      setCurrentItemIndex(idx);
                      setSelectedModuleId(currentModule.id);
                      setViewMode("study");
                    }
                  }}
                  className={cn(
                    "group relative flex flex-col items-center text-center rounded-2xl border p-3 sm:p-4 transition-all duration-200 select-none",
                    isUnlocked
                      ? "border-slate-200 dark:border-zinc-800 bg-card dark:bg-zinc-900 hover:border-emerald-500/60 hover:shadow-lg sm:hover:-translate-y-1 cursor-pointer"
                      : "border-slate-200/50 dark:border-zinc-800/50 bg-slate-100 dark:bg-zinc-950 opacity-60 cursor-not-allowed"
                  )}
                >
                  {/* Status indicator top corner */}
                  <div className="absolute top-2 right-2 z-10">
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : !isUnlocked ? (
                      <Lock className="h-3.5 w-3.5 text-zinc-400" />
                    ) : isInProgress ? (
                      <span className="block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    ) : null}
                  </div>

                  {/* Lesson Visual Thumbnail or Icon Box */}
                  {thumbUrl ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white dark:bg-zinc-950 border border-border/60 p-1 my-1.5 overflow-hidden flex items-center justify-center">
                      <SmartImage
                        src={thumbUrl}
                        alt={lesson.title}
                        width={160}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 my-1.5 shadow-xs border",
                        isComplete
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                          : isUnlocked
                          ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-zinc-200/50 dark:bg-zinc-800/50 border-zinc-300/30 dark:border-zinc-700/30 text-zinc-400"
                      )}
                    >
                      <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                  )}

                  {/* Lesson Number & Title */}
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                    Item #{lessonIdx + 1}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground dark:text-zinc-100 line-clamp-2 mt-0.5 leading-snug break-words w-full">
                    {lesson.title}
                  </h3>

                  {/* Duration & Details */}
                  <div className="mt-2 pt-2 border-t border-border/40 w-full flex items-center justify-center text-[10px] font-mono text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatMinutes(calcLessonTime)}</span>
                  </div>
                </div>
              );
            })}

            {/* Quiz / Exam File Card (Gated by 1/3 Completion) */}
            {currentModule.examSettings && (
              <div
                onClick={() => {
                  if (!isQuizUnlocked) {
                    toast.error(
                      `Utari wakora 1/3 cy'amasomo meza! Ugomba kwiga amategeko 1/3 (${completedLessonsCount}/${requiredForQuiz} amashuri) kugira ngo ufungure ikizamini.`
                    );
                    return;
                  }
                  startModuleExam(currentModule.id, currentModule.examSettings?.title || currentModule.title);
                }}
                className={cn(
                  "group relative flex flex-col items-center text-center rounded-2xl border p-3 sm:p-4 transition-all duration-200 select-none",
                  isQuizUnlocked
                    ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-zinc-900 hover:border-emerald-500 hover:shadow-xl sm:hover:-translate-y-1 cursor-pointer"
                    : "border-amber-500/30 bg-amber-500/5 dark:bg-zinc-950 opacity-80 cursor-not-allowed"
                )}
              >
                {/* Status indicator */}
                <div className="absolute top-2 right-2">
                  {isQuizUnlocked ? (
                    <Sparkles className="h-4 w-4 text-emerald-500 animate-pulse" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-500" />
                  )}
                </div>

                {/* Quiz Icon */}
                <div
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 my-1.5 shadow-xs border",
                    isQuizUnlocked
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  )}
                >
                  <Brain className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>

                {/* Quiz Badge */}
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Quiz File
                </span>

                <h3 className="text-xs sm:text-sm font-bold text-foreground dark:text-zinc-100 line-clamp-2 mt-1 leading-snug">
                  {currentModule.examSettings.title || "Module Quiz"}
                </h3>

                {/* 1/3 Gated Requirement Notice */}
                {!isQuizUnlocked ? (
                  <div className="mt-2 pt-2 border-t border-amber-500/30 w-full text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold leading-tight">
                    Locked (1/3 required)
                    <span className="block font-normal text-[9px] text-muted-foreground mt-0.5">
                      {completedLessonsCount}/{requiredForQuiz} lessons
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 w-full flex items-center justify-center text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{currentModule.examSettings.duration_minutes} min ({currentModule.examSettings.question_count} Qs)</span>
                  </div>
                )}
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
        "flex-1 min-h-0 w-full flex flex-col transition-all overflow-x-hidden touch-pan-y select-none",
        isFocusMode ? "bg-background fixed inset-0 z-50 overflow-y-auto" : ""
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
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="relative z-10 text-center space-y-3 sm:space-y-4 p-5 sm:p-6 max-w-sm w-full bg-card border-2 border-primary rounded-3xl shadow-2xl transform-gpu"
            >
              <div className="text-5xl sm:text-6xl animate-bounce">🎉</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("courseCompleted") || "Course Completed!"}</h2>
              <p className="text-sm sm:text-base text-muted-foreground">{t("congratulations") || "Congratulations on finishing all modules!"}</p>
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
            className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 340, mass: 0.8 }}
              className="relative max-w-md w-full max-h-[90dvh] overflow-y-auto rounded-3xl border-2 border-primary/40 bg-card shadow-2xl p-5 sm:p-8 space-y-5 sm:space-y-6 transform-gpu"
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

      {mobileCourseTreeDrawer}

      {/* Top Study Header: docks cleanly at top-0 inside OSWindow or Focus Mode */}
      <div className="z-30 flex flex-col bg-card dark:bg-zinc-950 border-b border-border shadow-xs transition-all sticky top-0">
        {/* Focus Lost Paused Alert Banner */}
        {!isFocusActive && (
          <div
            onClick={() => setIsFocusActive(true)}
            className="bg-primary/15 border-b border-primary/30 px-4 py-2 text-center text-xs font-medium text-primary flex items-center justify-center cursor-pointer transition-colors hover:bg-primary/20"
          >
            <Pause className="h-3.5 w-3.5 shrink-0 mr-2" />
            <span>{t("studyTimerPausedFocusLost") || "Study timer paused (Focus lost) — Click anywhere to resume studying"}</span>
          </div>
        )}

        {/* Top Study Navigation Bar */}
        <div className="px-2.5 sm:px-5 py-2 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-2">
          {/* Row 1: Tree Toggle + Breadcrumb + Primary Status Controls */}
          <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
            <div className="flex items-center min-w-0 text-xs flex-1">
              {/* Mobile Course Tree Button */}
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden inline-flex items-center px-2 py-1 mr-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground shrink-0 cursor-pointer"
                title="Open Course Tree"
                aria-label="Open Course Tree"
              >
                <PanelLeftOpen className="h-3.5 w-3.5 text-primary min-[380px]:mr-1" />
                <span className="hidden min-[380px]:inline font-semibold">Tree</span>
              </button>

              {/* Desktop Sidebar Toggle when collapsed */}
              {!isSidebarOpen && !isFocusMode && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="hidden lg:inline-flex items-center px-2 py-1 mr-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground shrink-0 cursor-pointer"
                  title="Expand Course Tree"
                >
                  <PanelLeftOpen className="h-3.5 w-3.5 text-primary mr-1" />
                  <span className="font-semibold">Tree</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isRoadSignsFilter) {
                    navigate("course");
                  } else {
                    setViewMode("modules");
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium shrink-0 hidden sm:inline cursor-pointer"
              >
                {t("course") || "Course"}
              </button>
              <span className="text-muted-foreground/40 hidden sm:inline mx-1.5">/</span>
              <button
                type="button"
                onClick={() => {
                  if (currentItem) {
                    setSelectedModuleId(currentItem.moduleId);
                    setViewMode("module-lessons");
                  } else {
                    setViewMode("modules");
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium truncate max-w-[100px] sm:max-w-[160px] hidden sm:inline cursor-pointer"
                title={currentItem?.moduleTitle}
              >
                {currentItem?.moduleTitle}
              </button>
              <span className="text-muted-foreground/40 hidden sm:inline mx-1.5">/</span>
              <span className="font-bold text-foreground truncate min-w-0 flex-1 md:flex-initial md:max-w-[240px]">
                {currentItem?.lessonTitle}
              </span>
            </div>

            {/* Mobile-only right pills (Timer + Focus) */}
            <div className="flex items-center gap-1.5 shrink-0 md:hidden">
              <div
                className={cn(
                  "flex items-center px-2 py-1 rounded-full text-[11px] font-semibold tabular-nums border transition-colors",
                  isFocusActive
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border"
                )}
                title="Lesson Study Timer"
              >
                <Clock className={cn("h-3 w-3 mr-1", isFocusActive && "animate-pulse")} />
                <span>{formatTimer(lessonElapsedSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                title={isFocusMode ? "Exit Fullscreen" : "Distraction-Free Mode"}
              >
                {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Row 2 on Mobile / Right Cluster on Desktop: Reader Tools */}
          <div className="flex items-center justify-between md:justify-end gap-1.5 pt-1.5 md:pt-0 border-t border-border/50 md:border-t-0 overflow-x-auto scrollbar-none shrink-0">
            {/* Active Lesson Study Timer (Desktop) */}
            <div
              className={cn(
                "hidden md:flex items-center px-2 py-1 rounded-full text-[11px] font-semibold tabular-nums border transition-colors shrink-0",
                isFocusActive
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
              title="Lesson Study Timer"
            >
              <Clock className={cn("h-3 w-3 mr-1", isFocusActive && "animate-pulse")} />
              <span>{formatTimer(lessonElapsedSeconds)}</span>
            </div>

            {/* Text Size Control (Accessible on mobile & desktop) */}
            <div className="flex items-center border rounded-lg bg-background p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setTextSize("sm")}
                className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", textSize === "sm" ? "bg-muted text-foreground" : "text-muted-foreground")}
                title="Small text"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setTextSize("base")}
                className={cn("px-1.5 py-0.5 rounded text-xs font-bold cursor-pointer", textSize === "base" ? "bg-muted text-foreground" : "text-muted-foreground")}
                title="Normal text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setTextSize("lg")}
                className={cn("px-1.5 py-0.5 rounded text-sm font-bold cursor-pointer", textSize === "lg" ? "bg-muted text-foreground" : "text-muted-foreground")}
                title="Large text"
              >
                A+
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Scratchpad / Notes Toggle */}
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className={cn(
                  "p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0",
                  showNotes ? "bg-primary/15 border-primary/30 text-primary" : "bg-background hover:bg-muted text-muted-foreground"
                )}
                title="Study notes & scratchpad"
              >
                <StickyNote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Current Selected Course Language */}
              <button
                type="button"
                onClick={() => setLearningLanguage(null)}
                className="flex items-center px-2 py-1 rounded-xl border border-border/70 hover:border-primary/40 bg-card hover:bg-muted text-xs font-semibold transition-colors cursor-pointer text-foreground shrink-0"
                title={t("changeLanguage") || "Change course language"}
              >
                <span>{learningLanguage === "French" ? "🇫🇷" : learningLanguage === "Kinyarwanda" ? "🇷🇼" : "🇬🇧"}</span>
                <span className="ml-1 md:hidden text-[10px] font-mono">
                  {learningLanguage === "French" ? "FR" : learningLanguage === "Kinyarwanda" ? "RW" : "EN"}
                </span>
                <span className="hidden md:inline ml-1.5">{learningLanguage || "Language"}</span>
                <span className="text-[10px] text-primary underline ml-1 hidden sm:inline">{t("change") || "Change"}</span>
              </button>

              {/* Plain Terms Legal Explainer Toggle (Visible on mobile too) */}
              <button
                type="button"
                onClick={handleTogglePlainLanguage}
                className={cn(
                  "flex items-center px-2 sm:px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0",
                  isPlainLanguageOpen
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background hover:bg-muted text-muted-foreground border-border"
                )}
                title="Explain road rules in plain, simple terms [Press P]"
              >
                <Lightbulb className="h-3.5 w-3.5 min-[380px]:mr-1" />
                <span className="hidden min-[380px]:inline lg:hidden">Plain</span>
                <span className="hidden lg:inline">Plain Terms</span>
              </button>

              {/* AI Neural Cloud Voice Player Toggle */}
              {!isTTSDisabled && (
                <button
                  type="button"
                  onClick={handleToggleTTS}
                  className={cn(
                    "flex items-center px-2 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0",
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
                  <span className="hidden md:inline ml-1">AI Voice</span>
                </button>
              )}

              {/* Distraction-Free Focus Mode Toggle (Desktop) */}
              <button
                type="button"
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="hidden md:inline-flex p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground transition-colors cursor-pointer shrink-0"
                title={isFocusMode ? "Exit Fullscreen" : "Distraction-Free Mode"}
              >
                {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Study Layout */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar: Full Navo OS Hierarchical Course Tree (Desktop) */}
        {!isFocusMode && isSidebarOpen && (
          <aside className="hidden lg:flex w-72 xl:w-80 border-r border-border bg-card dark:bg-zinc-950 flex-col shrink-0">
            <div className="flex items-center justify-end px-2 pt-2 pb-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="inline-flex items-center px-2 py-1 rounded-md hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                title="Collapse Course Tree"
              >
                <PanelLeftClose className="h-3.5 w-3.5 mr-1" />
                <span>Hide Tree</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <CourseTreePanel
                modules={effectiveCourse.modules}
                parseTopics={parseTopics}
                lessonHasImage={lessonHasImage}
                isModuleUnlocked={isModuleUnlocked}
                isModuleCompleted={isModuleCompleted}
                isLessonUnlocked={isLessonUnlocked}
                isLessonCompleted={isLessonCompleted}
                isItemUnlocked={isItemUnlocked}
                completedItems={completedItems}
                flatList={flatList}
                activeModuleId={currentItem?.moduleId || currentModule?.id}
                activeLessonId={currentItem?.lessonId}
                activeTopicId={currentItem?.topicId}
                searchQuery={sidebarSearchQuery}
                onSearchChange={setSidebarSearchQuery}
                onSelectLesson={handleSelectTreeLesson}
                onSelectExam={handleSelectTreeExam}
                titleLabel={t("courseTree") !== "courseTree" ? t("courseTree") : "Course Tree"}
              />
            </div>
          </aside>
        )}

        {/* Center Reader Content Canvas */}
        <main
          className={cn(
            "flex-1 min-w-0 p-2.5 sm:p-5 md:p-7 pb-6 sm:pb-8 space-y-3.5 sm:space-y-5 mx-auto w-full overflow-x-hidden",
            extractedMedia.images.length > 0 ? "max-w-6xl" : "max-w-4xl"
          )}
        >
          {/* Progress Indicators: Module Progress and Lesson Progress */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* Module Progress */}
            <div className="rounded-xl sm:rounded-2xl border bg-card dark:bg-zinc-900 p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold gap-1">
                <span className="text-muted-foreground flex items-center min-w-0">
                  <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0 mr-1 sm:mr-1.5" />
                  <span className="truncate">{t("moduleProgress") || "Module"}</span>
                </span>
                <span className="text-foreground shrink-0 tabular-nums">
                  {activeModuleCompletedLessonsCount}/{activeModuleLessons.length} <span className="hidden min-[420px]:inline">({activeModuleProgressPct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${activeModuleProgressPct}%` }}
                />
              </div>
            </div>

            {/* Lesson Progress */}
            <div className="rounded-xl sm:rounded-2xl border bg-card dark:bg-zinc-900 p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold gap-1">
                <span className="text-muted-foreground flex items-center min-w-0">
                  <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary shrink-0 mr-1 sm:mr-1.5" />
                  <span className="truncate">{t("lessonProgress") || "Lesson"}</span>
                </span>
                <span className="text-foreground shrink-0 tabular-nums">
                  {currentLessonTopics.length > 0
                    ? `${currentLessonCompletedTopicsCount}/${currentLessonTopics.length}`
                    : isLessonCompleted(currentLesson?.id || "")
                    ? "100%"
                    : "0%"}
                  {currentLessonTopics.length > 0 && (
                    <span className="hidden min-[420px]:inline"> ({currentLessonProgressPct}%)</span>
                  )}
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
          <div className="rounded-2xl border bg-card dark:bg-zinc-900 shadow-sm overflow-hidden relative">
            <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
              {/* Topic Header & Meta (Flows naturally so Android 5 screens aren't trapped by stacked sticky headers) */}
              <div className="space-y-2 border-b border-border/70 pb-3.5 sm:pb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2 font-medium">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground font-semibold">
                      {currentItem?.type === "topic" && currentItem.topicIndex !== undefined
                        ? `Topic ${currentItem.topicIndex + 1} of ${currentItem.topicCount}`
                        : "Lesson"}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {formatMinutes(currentEstimatedMinutes)} {t("readingTime") || "reading"}
                    </span>
                  </div>

                  {currentItem && completedItems.has(itemKey(currentItem)) && (
                    <span className="inline-flex items-center text-primary font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {t("completed") || "Completed"}
                    </span>
                  )}
                </div>

                <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-foreground break-words">
                  {translatedTitle || (currentItem?.type === "topic" ? currentItem.topicTitle : currentItem?.lessonTitle)}
                </h1>
              </div>

              {/* AI Cloud Neural Voice Player (Gemini TTS) */}
              {isTTSOpen && !isTTSDisabled && (
                <AINeuralVoicePlayer
                  audioUrl={ttsAudioUrl}
                  isLoading={isLoadingTTS}
                  language={learningLanguage || "Kinyarwanda"}
                  topicTitle={currentTopic?.title || currentLesson?.title || "Lesson Note"}
                  onClose={() => setIsTTSOpen(false)}
                  onRetry={handleToggleTTS}
                />
              )}

              {/* Plain Language Explainer Card (Rwanda Traffic Code Simplified) */}
              {isPlainLanguageOpen && plainData && (
                <PlainLanguageCard
                  data={plainData}
                  language={learningLanguage || "Kinyarwanda"}
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

              {/* Exam-Style Split Content: Images on the LEFT side, Explanation on the RIGHT side */}
              <div onMouseUp={handleMouseUpContent} className="w-full min-w-0">
                {extractedMedia.images.length > 0 ? (
                  <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                    {/* LEFT SIDE: Visual Diagram / Road Sign Stage */}
                    <div className="w-full md:w-[44%] lg:w-[42%] shrink-0 md:sticky md:top-20">
                      <CourseImageStage
                        images={extractedMedia.images}
                        title={
                          (currentItem?.type === "topic"
                            ? currentItem.topicTitle
                            : currentItem?.lessonTitle) || "Course Diagram"
                        }
                      />
                    </div>

                    {/* RIGHT SIDE: Explanation Prose */}
                    <div className="flex-1 min-w-0 w-full leading-relaxed">
                      {extractedMedia.cleanContent &&
                      (typeof extractedMedia.cleanContent !== "string" ||
                        extractedMedia.cleanContent.trim().length > 0) ? (
                        <LessonContentView content={extractedMedia.cleanContent} textSize={textSize} />
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {currentItem?.type === "topic"
                            ? currentItem.topicTitle
                            : currentItem?.lessonTitle}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-w-0 transition-all leading-relaxed">
                    {activeDisplayedContent ? (
                      <LessonContentView content={activeDisplayedContent} textSize={textSize} />
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
              <div className="hidden md:flex items-center justify-end pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                <span className="flex items-center">
                  <kbd className="px-1.5 py-0.5 mr-1.5 rounded bg-muted border font-mono text-[10px]">P</kbd>
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

      {/* Bottom Navigation Footer (Placed below content like the exam so buttons never cover course text) */}
      <footer className="shrink-0 mt-auto border-t border-border bg-card dark:bg-zinc-950 px-2.5 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={currentItemIndex === 0}
            className="rounded-lg h-9 px-2.5 sm:px-3.5 font-medium text-xs sm:text-sm cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ChevronLeft className="h-4 w-4 mr-1 shrink-0" />
            <span>{t("previousTopic") || "Previous"}</span>
          </Button>

          <div className="text-[11px] sm:text-xs text-muted-foreground font-mono font-semibold tabular-nums px-1.5 shrink-0">
            {currentItemIndex + 1} / {flatList.length}
          </div>

          <div className="flex items-center shrink-0">
            {currentItem && isLastItemInLesson(currentItem) ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void markCompleteAndAdvance()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 px-3 sm:px-4 font-semibold text-xs sm:text-sm shadow-xs cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5 shrink-0" />
                <span>{t("completeLesson") || "Complete Lesson"}</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void markCompleteAndAdvance()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 px-3 sm:px-4 font-semibold text-xs sm:text-sm shadow-xs cursor-pointer whitespace-nowrap"
              >
                <span>{t("nextTopic") || "Next"}</span>
                <ChevronRight className="h-4 w-4 ml-1 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
