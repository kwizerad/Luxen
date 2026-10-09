"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BookOpen,
  HelpCircle,
  Image as ImageIcon,
  Upload,
  Pencil,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Play,
  RefreshCw,
  FolderOpen,
  Folder,
  Eye,
  ChevronDown,
  ChevronRight,
  Save,
  ClipboardList,
  ChevronsUpDown,
  ChevronsDownUp,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  X,
  Check,
  Database,
  Clock,
  Hash,
  Globe,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { QuestionTTSButton } from "@/components/course/question-tts-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  ExternalChapter,
  ExternalSection,
  ExternalLesson,
  ExternalQuestion,
  ExternalQuestionSet,
} from "@/lib/supabase/external";

type SupportedLang = "Kinyarwanda" | "English" | "French";
type PictureFilter = "all" | "with_picture" | "without_picture";

type SidebarSelection =
  | { type: "chapter"; chapterId: string }
  | { type: "lesson"; chapterId: string; lessonId: string }
  | { type: "quiz"; chapterId: string; questionId?: string };

interface ExternalCoursesViewProps {
  isAdminMode?: boolean;
}

function hasValidImage(url: string | null | undefined): boolean {
  return Boolean(url && typeof url === "string" && url.trim().length > 0);
}

export function ExternalCoursesView({ isAdminMode = false }: ExternalCoursesViewProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(isAdminMode);

  const [chapters, setChapters] = useState<ExternalChapter[]>([]);
  const [sections, setSections] = useState<ExternalSection[]>([]);
  const [lessons, setLessons] = useState<ExternalLesson[]>([]);
  const [questions, setQuestions] = useState<ExternalQuestion[]>([]);
  const [questionSets, setQuestionSets] = useState<ExternalQuestionSet[]>([]);

  // Sidebar & Tree Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarPicFilter, setSidebarPicFilter] = useState<PictureFilter>("all");
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<SidebarSelection | null>(null);

  // Quiz Workspace Filter & Active Question State
  const [quizPicFilter, setQuizPicFilter] = useState<PictureFilter>("all");
  const [quizSearch, setQuizSearch] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Language Translation State
  const [activeLang, setActiveLang] = useState<SupportedLang>("Kinyarwanda");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({
    Kinyarwanda: {},
    English: {},
    French: {},
  });

  // Image Lightbox Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Direct Picture Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<{
    type: "question" | "lesson" | "chapter";
    id: string;
  } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Inline Lesson Editor State (when a lesson is selected in the workspace)
  const [lFormTitle, setLFormTitle] = useState("");
  const [lFormNumber, setLFormNumber] = useState<string>("1");
  const [lFormImage, setLFormImage] = useState<string>("");
  const [lFormSectionId, setLFormSectionId] = useState<string>("");
  const [savingLesson, setSavingLesson] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  // Inline Course / Chapter Editor State (when a chapter is selected in the workspace)
  const [cFormTitle, setCFormTitle] = useState("");
  const [cFormNumber, setCFormNumber] = useState<string>("1");
  const [cFormImage, setCFormImage] = useState<string>("");
  const [savingChapter, setSavingChapter] = useState(false);

  // Inline Quiz Question Editor State (when a quiz question is active in the workspace)
  const [qFormTitle, setQFormTitle] = useState("");
  const [qFormChoices, setQFormChoices] = useState<string[]>(["", "", "", ""]);
  const [qFormAnswer, setQFormAnswer] = useState<number>(0);
  const [qFormChapterId, setQFormChapterId] = useState<string>("");
  const [qFormImage, setQFormImage] = useState<string>("");
  const [qFormNumber, setQFormNumber] = useState<string>("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);

  // Create Modals State (for adding new Course, Lesson, or Quiz Question)
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseNumber, setNewCourseNumber] = useState("1");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [newLessonChapterId, setNewLessonChapterId] = useState("");
  const [newLessonSectionId, setNewLessonSectionId] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonNumber, setNewLessonNumber] = useState("1");
  const [newLessonImage, setNewLessonImage] = useState("");
  const [creatingLesson, setCreatingLesson] = useState(false);

  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const [newQChapterId, setNewQChapterId] = useState("");
  const [newQTitle, setNewQTitle] = useState("");
  const [newQChoices, setNewQChoices] = useState<string[]>(["", "", "", ""]);
  const [newQAnswer, setNewQAnswer] = useState<number>(0);
  const [newQNumber, setNewQNumber] = useState("");
  const [newQImage, setNewQImage] = useState("");
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Interactive Quiz Practice Runner Modal/View State
  const [practiceActive, setPracticeActive] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<ExternalQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({});
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceModeLabel, setPracticeModeLabel] = useState("Course Quiz");

  // Publish & Quiz Settings State (Navo's Mock Exam + Single External Course + Quiz Timer/Count)
  const [examPublished, setExamPublished] = useState(false);
  const [examTitle, setExamTitle] = useState("Navo's Mock Exam (External DB)");
  const [examDurationMinutes, setExamDurationMinutes] = useState("20");
  const [examQuestionCount, setExamQuestionCount] = useState("20");
  const [coursePublished, setCoursePublished] = useState(false);
  const [courseTitle, setCourseTitle] = useState("Official Traffic Rules & Road Signs Course");
  const [globalQuizDuration, setGlobalQuizDuration] = useState("20");
  const [globalQuizQuestionCount, setGlobalQuizQuestionCount] = useState("20");
  const [perCourseQuizSettings, setPerCourseQuizSettings] = useState<
    Record<string, { durationMinutes?: number; questionCount?: number }>
  >({});
  const [quizScopeTarget, setQuizScopeTarget] = useState<string>("all");
  const [courseQuizDurationInput, setCourseQuizDurationInput] = useState("20");
  const [courseQuizQuestionsInput, setCourseQuizQuestionsInput] = useState("20");
  const [savingPublishSettings, setSavingPublishSettings] = useState(false);
  const [publishPanelOpen, setPublishPanelOpen] = useState(true);

  // Fetch all external data
  const fetchExternalData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/external-courses?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load external courses");
      }

      const loadedChapters: ExternalChapter[] = data.chapters || [];
      const loadedSections: ExternalSection[] = data.sections || [];
      const loadedLessons: ExternalLesson[] = data.lessons || [];
      const loadedQuestions: ExternalQuestion[] = data.questions || [];

      setChapters(loadedChapters);
      setSections(loadedSections);
      setLessons(loadedLessons);
      setQuestions(loadedQuestions);
      setQuestionSets(data.questionSets || []);

      if (data.publishConfig) {
        setExamPublished(Boolean(data.publishConfig.examPublished));
        if (data.publishConfig.examTitle) setExamTitle(data.publishConfig.examTitle);
        setExamDurationMinutes(String(data.publishConfig.examDurationMinutes || 20));
        setExamQuestionCount(String(data.publishConfig.examQuestionCount || 20));
        setCoursePublished(Boolean(data.publishConfig.coursePublished));
        if (data.publishConfig.courseTitle) setCourseTitle(data.publishConfig.courseTitle);
        if (data.publishConfig.quizSettings) {
          const gDur = String(data.publishConfig.quizSettings.globalDurationMinutes || 20);
          const gCnt = String(data.publishConfig.quizSettings.globalQuestionCount || 20);
          setGlobalQuizDuration(gDur);
          setGlobalQuizQuestionCount(gCnt);
          setCourseQuizDurationInput(gDur);
          setCourseQuizQuestionsInput(gCnt);
          setPerCourseQuizSettings(data.publishConfig.quizSettings.perCourse || {});
        }
      }

      if (data.isAdmin || isAdminMode) {
        setIsAdmin(true);
      }

      // Initialize default sidebar expansion & selection on first load
      if (loadedChapters.length > 0) {
        setExpandedChapters((prev) => {
          if (prev.size > 0) return prev;
          return new Set([loadedChapters[0].id]);
        });
        setSelection((prev) => {
          if (prev) return prev;
          const firstChap = loadedChapters[0];
          const firstChapSectionIds = new Set(
            loadedSections.filter((s) => s.chapter_id === firstChap.id).map((s) => s.id)
          );
          const firstLesson = loadedLessons.find((l) => firstChapSectionIds.has(l.section_id));
          if (firstLesson) {
            return { type: "lesson", chapterId: firstChap.id, lessonId: firstLesson.id };
          }
          return { type: "chapter", chapterId: firstChap.id };
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Could not load external database courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdminMode]);

  useEffect(() => {
    void fetchExternalData();
  }, [fetchExternalData]);

  // Lookup maps
  const chapterMap = useMemo(() => {
    const map = new Map<string, ExternalChapter>();
    chapters.forEach((c) => map.set(c.id, c));
    return map;
  }, [chapters]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, ExternalSection>();
    sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [sections]);

  // Group sections and lessons by chapter_id
  const lessonsByChapter = useMemo(() => {
    const map = new Map<string, ExternalLesson[]>();
    chapters.forEach((c) => map.set(c.id, []));
    lessons.forEach((l) => {
      const sec = sectionMap.get(l.section_id);
      const chapId = sec?.chapter_id;
      if (chapId) {
        const list = map.get(chapId) || [];
        list.push(l);
        map.set(chapId, list);
      }
    });
    return map;
  }, [chapters, lessons, sectionMap]);

  // Group questions by chapter_id
  const questionsByChapter = useMemo(() => {
    const map = new Map<string, ExternalQuestion[]>();
    chapters.forEach((c) => map.set(c.id, []));
    const unassigned: ExternalQuestion[] = [];
    questions.forEach((q) => {
      if (q.chapter_id && map.has(q.chapter_id)) {
        const list = map.get(q.chapter_id) || [];
        list.push(q);
        map.set(q.chapter_id, list);
      } else {
        unassigned.push(q);
      }
    });
    if (unassigned.length > 0) {
      map.set("unassigned", unassigned);
    }
    return map;
  }, [chapters, questions]);

  // Currently selected entities
  const selectedChapter = useMemo(() => {
    if (!selection) return null;
    if (selection.chapterId === "all") return null;
    return chapterMap.get(selection.chapterId) || null;
  }, [selection, chapterMap]);

  const selectedLesson = useMemo(() => {
    if (!selection || selection.type !== "lesson") return null;
    return lessons.find((l) => l.id === selection.lessonId) || null;
  }, [selection, lessons]);

  // Filtered questions for the active Quiz selection
  const currentQuizQuestions = useMemo(() => {
    if (!selection || selection.type !== "quiz") return [];
    let pool: ExternalQuestion[] = [];
    if (selection.chapterId === "all") {
      pool = questions;
    } else if (selection.chapterId === "unassigned") {
      pool = questionsByChapter.get("unassigned") || [];
    } else {
      pool = questionsByChapter.get(selection.chapterId) || [];
    }

    return pool.filter((q) => {
      const hasImg = hasValidImage(q.image);
      if (quizPicFilter === "with_picture" && !hasImg) return false;
      if (quizPicFilter === "without_picture" && hasImg) return false;

      if (quizSearch.trim()) {
        const s = quizSearch.toLowerCase();
        const titleMatch = (q.title || "").toLowerCase().includes(s);
        const choiceMatch = (q.choice || []).some((c) => (c || "").toLowerCase().includes(s));
        const numMatch = String(q.question_numbers || "").includes(s);
        return titleMatch || choiceMatch || numMatch;
      }
      return true;
    });
  }, [selection, questions, questionsByChapter, quizPicFilter, quizSearch]);

  const activeQuestion = useMemo(() => {
    if (!selection || selection.type !== "quiz") return null;
    if (activeQuestionId) {
      const found = currentQuizQuestions.find((q) => q.id === activeQuestionId);
      if (found) return found;
    }
    return currentQuizQuestions[0] || null;
  }, [selection, activeQuestionId, currentQuizQuestions]);

  // Keep activeQuestionId synced with currentQuizQuestions
  useEffect(() => {
    if (selection?.type === "quiz") {
      if (selection.questionId) {
        setActiveQuestionId(selection.questionId);
      } else if (
        currentQuizQuestions.length > 0 &&
        (!activeQuestionId || !currentQuizQuestions.some((q) => q.id === activeQuestionId))
      ) {
        setActiveQuestionId(currentQuizQuestions[0].id);
      }
    }
  }, [selection, currentQuizQuestions, activeQuestionId]);

  // Sync Lesson Form when selectedLesson changes
  useEffect(() => {
    if (selectedLesson) {
      setLFormTitle(selectedLesson.title || "");
      setLFormNumber(String(selectedLesson.lesson_number ?? 1));
      setLFormImage(selectedLesson.lesson_image || "");
      setLFormSectionId(selectedLesson.section_id || "");
    }
  }, [selectedLesson]);

  // Sync Chapter Form when selectedChapter changes
  useEffect(() => {
    if (selectedChapter) {
      setCFormTitle(selectedChapter.title || "");
      setCFormNumber(String(selectedChapter.chapter_number ?? 1));
      setCFormImage(selectedChapter.image || "");
    }
  }, [selectedChapter]);

  // Sync Question Form when activeQuestion changes
  useEffect(() => {
    if (activeQuestion) {
      setQFormTitle(activeQuestion.title || "");
      const padded = [...(activeQuestion.choice || [])];
      while (padded.length < 4) padded.push("");
      setQFormChoices(padded.slice(0, 4));
      setQFormAnswer(Number(activeQuestion.choice_answer ?? 0));
      setQFormChapterId(activeQuestion.chapter_id || chapters[0]?.id || "");
      setQFormImage(activeQuestion.image || "");
      setQFormNumber(
        activeQuestion.question_numbers !== null && activeQuestion.question_numbers !== undefined
          ? String(activeQuestion.question_numbers)
          : ""
      );
    }
  }, [activeQuestion, chapters]);

  // Helper to get translated text or original
  const getText = useCallback(
    (key: string, original: string) => {
      if (activeLang === "Kinyarwanda") return original;
      return translations[activeLang]?.[key] || original;
    },
    [activeLang, translations]
  );

  // Translate visible items when activeLang is English or French
  const translateItemsBatch = useCallback(
    async (items: { key: string; text: string }[], targetLang: SupportedLang) => {
      if (targetLang === "Kinyarwanda" || items.length === 0) return;

      const existing = translations[targetLang] || {};
      const missing = items.filter((it) => it.text?.trim() && !existing[it.key]);
      if (missing.length === 0) return;

      setIsTranslating(true);
      try {
        const batch = missing.slice(0, 45);
        const res = await fetch("/api/external-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "translate",
            sourceLang: "Kinyarwanda",
            targetLang,
            items: batch,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.translations) {
          setTranslations((prev) => ({
            ...prev,
            [targetLang]: {
              ...(prev[targetLang] || {}),
              ...data.translations,
            },
          }));
        }
      } catch (err) {
        console.warn("Translation batch error:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [translations]
  );

  useEffect(() => {
    if (activeLang === "Kinyarwanda") return;

    const itemsToTranslate: { key: string; text: string }[] = [];
    chapters.forEach((c) => {
      itemsToTranslate.push({ key: `chap_${c.id}`, text: c.title });
    });

    if (selectedChapter) {
      const chapLessons = lessonsByChapter.get(selectedChapter.id) || [];
      chapLessons.slice(0, 35).forEach((l) => {
        itemsToTranslate.push({ key: `lesson_${l.id}`, text: l.title });
      });
    }

    if (selectedLesson) {
      itemsToTranslate.push({ key: `lesson_${selectedLesson.id}`, text: selectedLesson.title });
    }

    if (activeQuestion) {
      itemsToTranslate.push({ key: `q_${activeQuestion.id}_title`, text: activeQuestion.title });
      (activeQuestion.choice || []).forEach((c, idx) => {
        itemsToTranslate.push({ key: `q_${activeQuestion.id}_c_${idx}`, text: c });
      });
    }

    if (itemsToTranslate.length > 0) {
      void translateItemsBatch(itemsToTranslate, activeLang);
    }
  }, [
    activeLang,
    chapters,
    selectedChapter,
    selectedLesson,
    activeQuestion,
    lessonsByChapter,
    translateItemsBatch,
  ]);

  // Toggle chapter dropdown in left sidebar
  const toggleChapterExpand = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const expandAllChapters = () => {
    setExpandedChapters(new Set(chapters.map((c) => c.id)));
  };

  const collapseAllChapters = () => {
    setExpandedChapters(new Set());
  };

  // Trigger 1-click file upload for any Question, Lesson, or Chapter
  const triggerDirectImageUpload = (type: "question" | "lesson" | "chapter", id: string) => {
    setUploadingTarget({ type, id });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleDirectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTarget) return;

    const { type, id } = uploadingTarget;
    setUploadingId(id);
    const toastId = toast.loading("Uploading and updating picture in external database...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", type);
      formData.append("entityId", id);

      const res = await fetch("/api/external-courses", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      const newUrl =
        data.updatedRecord?.image || data.updatedRecord?.lesson_image || data.publicUrl;
      if (id && !data.updatedRecord) {
        throw new Error("Image uploaded, but database row update returned no record.");
      }

      if (type === "question") {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, ...(data.updatedRecord || {}), image: newUrl } : q
          )
        );
        if (activeQuestion?.id === id) setQFormImage(newUrl);
      } else if (type === "lesson") {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === id ? { ...l, ...(data.updatedRecord || {}), lesson_image: newUrl } : l
          )
        );
        if (selectedLesson?.id === id) setLFormImage(newUrl);
      } else if (type === "chapter") {
        setChapters((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ...(data.updatedRecord || {}), image: newUrl } : c
          )
        );
        if (selectedChapter?.id === id) setCFormImage(newUrl);
      }

      toast.success("Picture saved in external database!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update picture", { id: toastId });
    } finally {
      setUploadingId(null);
      setUploadingTarget(null);
    }
  };

  // Save modified Lesson
  const handleSaveLesson = async () => {
    if (!selectedLesson) return;
    if (!lFormTitle.trim()) {
      toast.error("Lesson content is required");
      return;
    }
    setSavingLesson(true);
    try {
      const payload = {
        title: lFormTitle.trim(),
        lesson_number: Number(lFormNumber) || 1,
        lesson_image: lFormImage.trim() || null,
        section_id: lFormSectionId || selectedLesson.section_id,
      };
      const res = await fetch("/api/external-courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lesson",
          id: selectedLesson.id,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update lesson");
      setLessons((prev) =>
        prev.map((l) => (l.id === selectedLesson.id ? { ...l, ...data.data } : l))
      );
      toast.success("Lesson saved to external database!");
    } catch (err: any) {
      toast.error(err.message || "Error saving lesson");
    } finally {
      setSavingLesson(false);
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lesson: ExternalLesson) => {
    setDeletingLessonId(lesson.id);
    try {
      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_lesson", id: lesson.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete lesson");

      const sec = sectionMap.get(lesson.section_id);
      const chapId = sec?.chapter_id || chapters[0]?.id || "";
      const remaining = lessons.filter((l) => l.id !== lesson.id);
      setLessons(remaining);
      toast.success("Lesson deleted from external database");

      // Select next lesson in the same chapter or fallback to chapter
      const nextInChap = remaining.find((l) => sectionMap.get(l.section_id)?.chapter_id === chapId);
      if (nextInChap) {
        setSelection({ type: "lesson", chapterId: chapId, lessonId: nextInChap.id });
      } else {
        setSelection({ type: "chapter", chapterId: chapId });
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting lesson");
    } finally {
      setDeletingLessonId(null);
    }
  };

  // Save modified Chapter (Course)
  const handleSaveChapter = async () => {
    if (!selectedChapter) return;
    if (!cFormTitle.trim()) {
      toast.error("Course title is required");
      return;
    }
    setSavingChapter(true);
    try {
      const res = await fetch("/api/external-courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chapter",
          id: selectedChapter.id,
          payload: {
            title: cFormTitle.trim(),
            chapter_number: Number(cFormNumber) || 1,
            image: cFormImage.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update course");
      setChapters((prev) =>
        prev.map((c) => (c.id === selectedChapter.id ? { ...c, ...data.data } : c))
      );
      toast.success("Course updated in external database!");
    } catch (err: any) {
      toast.error(err.message || "Error updating course");
    } finally {
      setSavingChapter(false);
    }
  };

  // Save modified Quiz Question
  const handleSaveQuestion = async () => {
    if (!activeQuestion) return;
    if (!qFormTitle.trim()) {
      toast.error("Question text is required");
      return;
    }
    setSavingQuestion(true);
    try {
      const payload = {
        title: qFormTitle.trim(),
        choice: qFormChoices.map((c) => c.trim()),
        choice_answer: Number(qFormAnswer),
        chapter_id: qFormChapterId || activeQuestion.chapter_id,
        image: qFormImage.trim() || null,
        question_numbers: qFormNumber.trim() ? Number(qFormNumber.trim()) : null,
      };
      const res = await fetch("/api/external-courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "question",
          id: activeQuestion.id,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update quiz question");
      setQuestions((prev) =>
        prev.map((q) => (q.id === activeQuestion.id ? { ...q, ...data.data } : q))
      );
      toast.success("Quiz question saved to external database!");
    } catch (err: any) {
      toast.error(err.message || "Error saving quiz question");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete Quiz Question
  const handleDeleteQuestion = async (id: string) => {
    setDeletingQuestionId(id);
    try {
      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_question", id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete question");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Quiz question deleted from external database");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete question");
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // Create New Course (Chapter)
  const handleCreateCourse = async () => {
    if (!newCourseTitle.trim()) {
      toast.error("Course title is required");
      return;
    }
    setCreatingCourse(true);
    try {
      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_chapter",
          payload: {
            title: newCourseTitle.trim(),
            chapter_number: Number(newCourseNumber) || chapters.length + 1,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create course");
      setChapters((prev) => [...prev, data.data]);
      if (data.section) {
        setSections((prev) => [...prev, data.section]);
      }
      setExpandedChapters((prev) => new Set(prev).add(data.data.id));
      setSelection({ type: "chapter", chapterId: data.data.id });
      setCreateCourseOpen(false);
      setNewCourseTitle("");
      toast.success("New course created in external database!");
    } catch (err: any) {
      toast.error(err.message || "Error creating course");
    } finally {
      setCreatingCourse(false);
    }
  };

  // Open Create Lesson Modal for a specific Chapter
  const openCreateLessonModal = (chapterId: string) => {
    const chapSections = sections.filter((s) => s.chapter_id === chapterId);
    const chapLessons = lessonsByChapter.get(chapterId) || [];
    setNewLessonChapterId(chapterId);
    setNewLessonSectionId(chapSections[0]?.id || "");
    setNewLessonTitle("");
    setNewLessonNumber(String(chapLessons.length + 1));
    setNewLessonImage("");
    setCreateLessonOpen(true);
  };

  const handleCreateLesson = async () => {
    if (!newLessonTitle.trim()) {
      toast.error("Lesson content is required");
      return;
    }
    setCreatingLesson(true);
    try {
      let targetSectionId = newLessonSectionId;
      // If chapter has no sections yet, create one automatically
      if (!targetSectionId && newLessonChapterId) {
        const secRes = await fetch("/api/external-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_section",
            payload: {
              title: "Section 1",
              section_number: 1,
              chapter_id: newLessonChapterId,
            },
          }),
        });
        const secData = await secRes.json();
        if (secRes.ok && secData.success && secData.data) {
          setSections((prev) => [...prev, secData.data]);
          targetSectionId = secData.data.id;
        }
      }

      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_lesson",
          payload: {
            title: newLessonTitle.trim(),
            lesson_number: Number(newLessonNumber) || 1,
            lesson_image: newLessonImage.trim() || null,
            section_id: targetSectionId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create lesson");
      setLessons((prev) => [...prev, data.data]);
      setExpandedChapters((prev) => new Set(prev).add(newLessonChapterId));
      setSelection({
        type: "lesson",
        chapterId: newLessonChapterId,
        lessonId: data.data.id,
      });
      setCreateLessonOpen(false);
      toast.success("Lesson added to course!");
    } catch (err: any) {
      toast.error(err.message || "Error creating lesson");
    } finally {
      setCreatingLesson(false);
    }
  };

  // Open Create Question Modal for a specific Chapter
  const openCreateQuestionModal = (chapterId: string) => {
    const validChapId =
      chapterId === "all" || chapterId === "unassigned" ? chapters[0]?.id || "" : chapterId;
    const chapQs = questionsByChapter.get(validChapId) || [];
    setNewQChapterId(validChapId);
    setNewQTitle("");
    setNewQChoices(["", "", "", ""]);
    setNewQAnswer(0);
    setNewQNumber(String(questions.length + 1));
    setNewQImage("");
    setCreateQuestionOpen(true);
    if (chapQs.length >= 0) {
      // ensure chapter quiz is selected after creation
    }
  };

  const handleCreateQuestion = async () => {
    if (!newQTitle.trim()) {
      toast.error("Question text is required");
      return;
    }
    setCreatingQuestion(true);
    try {
      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_question",
          payload: {
            title: newQTitle.trim(),
            choice: newQChoices.map((c) => c.trim()),
            choice_answer: Number(newQAnswer),
            chapter_id: newQChapterId || chapters[0]?.id,
            image: newQImage.trim() || null,
            question_numbers: newQNumber.trim() ? Number(newQNumber.trim()) : null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create question");
      setQuestions((prev) => [data.data, ...prev]);
      setSelection({
        type: "quiz",
        chapterId: newQChapterId || "all",
        questionId: data.data.id,
      });
      setActiveQuestionId(data.data.id);
      setCreateQuestionOpen(false);
      toast.success("Quiz question created in external database!");
    } catch (err: any) {
      toast.error(err.message || "Error creating question");
    } finally {
      setCreatingQuestion(false);
    }
  };

  // Start Interactive Quiz Practice
  const startPracticeQuiz = (pool: ExternalQuestion[], label: string) => {
    if (pool.length === 0) {
      toast.info("No quiz questions found for this selection.");
      return;
    }
    const selected = pool.slice(0, 25);
    setPracticeQuestions(selected);
    setPracticeIndex(0);
    setPracticeAnswers({});
    setPracticeRevealed({});
    setPracticeFinished(false);
    setPracticeModeLabel(label);
    setPracticeActive(true);
  };

  // Sync quiz duration/question inputs when quizScopeTarget changes
  useEffect(() => {
    if (quizScopeTarget === "all") {
      setCourseQuizDurationInput(globalQuizDuration);
      setCourseQuizQuestionsInput(globalQuizQuestionCount);
    } else {
      const override = perCourseQuizSettings[quizScopeTarget];
      setCourseQuizDurationInput(String(override?.durationMinutes ?? globalQuizDuration));
      setCourseQuizQuestionsInput(String(override?.questionCount ?? globalQuizQuestionCount));
    }
  }, [quizScopeTarget, globalQuizDuration, globalQuizQuestionCount, perCourseQuizSettings]);

  const handleSavePublishSettings = async (customPayload?: Record<string, any>, successMsg?: string) => {
    setSavingPublishSettings(true);
    try {
      const payload = customPayload || {
        examPublished,
        examTitle,
        examDurationMinutes: Number(examDurationMinutes) || 20,
        examQuestionCount: Number(examQuestionCount) || 20,
        coursePublished,
        courseTitle,
        quizSettings: {
          globalDurationMinutes: Number(globalQuizDuration) || 20,
          globalQuestionCount: Number(globalQuizQuestionCount) || 20,
          perCourse: perCourseQuizSettings,
        },
      };

      const res = await fetch("/api/external-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_publish_settings",
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update publish settings");
      }
      toast.success(successMsg || "Publish & Quiz settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save publish settings");
    } finally {
      setSavingPublishSettings(false);
    }
  };

  const handleToggleExamPublish = async (nextVal: boolean) => {
    setExamPublished(nextVal);
    await handleSavePublishSettings(
      {
        examPublished: nextVal,
        examTitle,
        examDurationMinutes: Number(examDurationMinutes) || 20,
        examQuestionCount: Number(examQuestionCount) || 20,
      },
      nextVal
        ? "External DB Questions published to Navo's Mock Exam!"
        : "External DB Questions unpublished from Navo's Mock Exam"
    );
  };

  const handleToggleCoursePublish = async (nextVal: boolean) => {
    setCoursePublished(nextVal);
    await handleSavePublishSettings(
      {
        coursePublished: nextVal,
        courseTitle,
        quizSettings: {
          globalDurationMinutes: Number(globalQuizDuration) || 20,
          globalQuestionCount: Number(globalQuizQuestionCount) || 20,
          perCourse: perCourseQuizSettings,
        },
      },
      nextVal
        ? "External Course published as single course (Courses = Modules, Lessons = Lessons)!"
        : "External Course unpublished"
    );
  };

  const handleApplyQuizSettings = async (applyToAll: boolean) => {
    const dur = Math.max(1, Number(courseQuizDurationInput) || 20);
    const qCnt = Math.max(1, Number(courseQuizQuestionsInput) || 20);

    let nextGlobalDur = Number(globalQuizDuration) || 20;
    let nextGlobalCnt = Number(globalQuizQuestionCount) || 20;
    let nextPerCourse = { ...perCourseQuizSettings };

    if (applyToAll || quizScopeTarget === "all") {
      nextGlobalDur = dur;
      nextGlobalCnt = qCnt;
      setGlobalQuizDuration(String(dur));
      setGlobalQuizQuestionCount(String(qCnt));
      // When applying to all courses, clear overrides so all courses use the new timer & question count
      if (applyToAll) {
        nextPerCourse = {};
        setPerCourseQuizSettings({});
      }
    } else {
      nextPerCourse[quizScopeTarget] = {
        durationMinutes: dur,
        questionCount: qCnt,
      };
      setPerCourseQuizSettings(nextPerCourse);
    }

    await handleSavePublishSettings(
      {
        quizSettings: {
          globalDurationMinutes: nextGlobalDur,
          globalQuestionCount: nextGlobalCnt,
          perCourse: nextPerCourse,
        },
      },
      applyToAll || quizScopeTarget === "all"
        ? `Quiz settings (${dur} min, ${qCnt} questions) applied to ALL courses!`
        : `Quiz settings (${dur} min, ${qCnt} questions) saved for selected course!`
    );
  };

  const totalQuestionsWithImages = useMemo(
    () => questions.filter((q) => hasValidImage(q.image)).length,
    [questions]
  );
  const totalLessonsWithImages = useMemo(
    () => lessons.filter((l) => hasValidImage(l.lesson_image)).length,
    [lessons]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-3 p-8 rounded-2xl border bg-card/60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading External Courses, Lessons &amp; Quizzes from database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden File Input for 1-Click Picture Updates */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDirectFileChange}
      />

      {/* Top Studio Header Bar */}
      <div className="rounded-xl border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
            title={sidebarOpen ? "Collapse courses sidebar" : "Expand courses sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                External Courses Studio
              </h2>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {chapters.length} Courses · {lessons.length} Lessons ({totalLessonsWithImages} w/ pic) · {questions.length} Quizzes ({totalQuestionsWithImages} w/ pic)
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Language Switcher + Add Course + Sync DB */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-muted border border-border/60 text-xs">
            {(["Kinyarwanda", "English", "French"] as SupportedLang[]).map((lang) => {
              const active = activeLang === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setActiveLang(lang)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                    active
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{lang === "Kinyarwanda" ? "🇷🇼" : lang === "English" ? "🇬🇧" : "🇫🇷"}</span>
                  <span>{lang === "French" ? "Français" : lang}</span>
                  {isTranslating && active && lang !== "Kinyarwanda" && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setNewCourseTitle("");
                setNewCourseNumber(String(chapters.length + 1));
                setCreateCourseOpen(true);
              }}
              className="h-8 text-xs gap-1.5 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Course</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchExternalData(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 rounded-lg"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Sync DB</span>
          </Button>
        </div>
      </div>

      {/* Admin Publish & Quiz Settings Control Panel */}
      {isAdmin && (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div
            onClick={() => setPublishPanelOpen((p) => !p)}
            className="px-4 py-2.5 bg-muted/30 border-b flex items-center justify-between gap-3 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <Settings2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-foreground">
                Publishing &amp; Quiz Configuration
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded border",
                  coursePublished
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                External Course: {coursePublished ? "Published (Single Course)" : "Unpublished"}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded border",
                  examPublished
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                Mock Exam: {examPublished ? "Published" : "Unpublished"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{publishPanelOpen ? "Hide" : "Configure"}</span>
              {publishPanelOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </div>

          {publishPanelOpen && (
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 bg-card">
              {/* 1. Publish External Course Card */}
              <div className="rounded-xl border p-3.5 bg-muted/10 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <h4 className="text-xs font-bold text-foreground">
                        Publish External Course
                      </h4>
                    </div>
                    <button
                      type="button"
                      disabled={savingPublishSettings}
                      onClick={() => handleToggleCoursePublish(!coursePublished)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        coursePublished ? "bg-emerald-600" : "bg-muted-foreground/30"
                      )}
                      role="switch"
                      aria-checked={coursePublished}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          coursePublished ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Publishes as a <strong>Single Course</strong> for students: each{" "}
                    <strong>Course (1–{chapters.length})</strong> is treated as a{" "}
                    <strong>Module</strong> and its <strong>Lessons</strong> directly as{" "}
                    <strong>Lessons</strong> (Course &amp; Lesson only).
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Published Course Title
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="Official Traffic Rules & Road Signs Course"
                      className="h-8 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingPublishSettings}
                      onClick={() =>
                        handleSavePublishSettings(
                          { courseTitle, coursePublished },
                          "External course title saved!"
                        )
                      }
                      className="h-8 px-2.5 text-xs shrink-0"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. Publish External Questions to Navo's Mock Exam Card */}
              <div className="rounded-xl border p-3.5 bg-muted/10 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                      <h4 className="text-xs font-bold text-foreground">
                        Publish in Navo&apos;s Individual Exam
                      </h4>
                    </div>
                    <button
                      type="button"
                      disabled={savingPublishSettings}
                      onClick={() => handleToggleExamPublish(!examPublished)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        examPublished ? "bg-emerald-600" : "bg-muted-foreground/30"
                      )}
                      role="switch"
                      aria-checked={examPublished}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          examPublished ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Toggle ON/OFF to publish all {questions.length} external DB questions as a mock
                    exam in Navo&apos;s Individual &amp; Group Exam without changing student exam pages.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Exam Minutes
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={examDurationMinutes}
                        onChange={(e) => setExamDurationMinutes(e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Exam Questions
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={examQuestionCount}
                        onChange={(e) => setExamQuestionCount(e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      placeholder="Navo's Mock Exam (External DB)"
                      className="h-8 text-xs bg-background"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingPublishSettings}
                      onClick={() =>
                        handleSavePublishSettings(
                          {
                            examPublished,
                            examTitle,
                            examDurationMinutes: Number(examDurationMinutes) || 20,
                            examQuestionCount: Number(examQuestionCount) || 20,
                          },
                          "Mock exam configuration saved!"
                        )
                      }
                      className="h-8 px-2.5 text-xs shrink-0"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3. Course Quiz Duration & Question Count (Apply to All or Individual Course) */}
              <div className="rounded-xl border p-3.5 bg-muted/10 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-amber-500 shrink-0" />
                      <h4 className="text-xs font-bold text-foreground">
                        Course Quiz Minutes &amp; Questions
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Default: {globalQuizDuration}m / {globalQuizQuestionCount}Q
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target Scope (All Courses or Individual Course)
                    </label>
                    <select
                      value={quizScopeTarget}
                      onChange={(e) => setQuizScopeTarget(e.target.value)}
                      className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium"
                    >
                      <option value="all">Apply to All Courses (Global Default)</option>
                      {chapters.map((c) => {
                        const ov = perCourseQuizSettings[c.id];
                        const totalQs = (questionsByChapter.get(c.id) || []).length;
                        return (
                          <option key={c.id} value={c.id}>
                            Course {c.chapter_number}: {getText(`chap_${c.id}`, c.title)} ({totalQs} Qs
                            {ov ? ` · Custom: ${ov.durationMinutes}m/${ov.questionCount}Q` : ""})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Quiz Minutes
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={courseQuizDurationInput}
                        onChange={(e) => setCourseQuizDurationInput(e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Quiz Questions
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={courseQuizQuestionsInput}
                        onChange={(e) => setCourseQuizQuestionsInput(e.target.value)}
                        className="h-8 text-xs font-mono bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {quizScopeTarget !== "all" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingPublishSettings}
                        onClick={() => handleApplyQuizSettings(false)}
                        className="h-8 flex-1 text-xs"
                      >
                        Save for Course
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={quizScopeTarget === "all" ? "default" : "outline"}
                      disabled={savingPublishSettings}
                      onClick={() => handleApplyQuizSettings(true)}
                      className="h-8 flex-1 text-xs"
                    >
                      Apply to All Courses
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Master-Detail Split Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start min-h-[calc(100vh-12rem)]">
        {/* LEFT SIDEBAR: Courses -> Dropdown Lessons + Quiz at Bottom */}
        {sidebarOpen && (
          <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0 rounded-xl border bg-card flex flex-col lg:h-[calc(100vh-11.5rem)] lg:sticky lg:top-16 overflow-hidden shadow-xs">
            {/* Sidebar Search & Filter Header */}
            <div className="p-3 border-b space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Courses &amp; Lessons
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={expandAllChapters}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Expand all courses"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={collapseAllChapters}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Collapse all courses"
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Filter courses or lessons..."
                  className="h-8 pl-8 pr-7 text-xs rounded-lg bg-background"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter lessons by picture status */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted text-[11px]">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "with_picture", label: "With Pic" },
                    { id: "without_picture", label: "No Pic" },
                  ] as { id: PictureFilter; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSidebarPicFilter(tab.id)}
                    className={cn(
                      "py-1 px-2 rounded-md font-medium transition-colors cursor-pointer truncate",
                      sidebarPicFilter === tab.id
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Courses Tree */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[520px] lg:max-h-none">
              {chapters.map((chapter) => {
                const rawChapLessons = lessonsByChapter.get(chapter.id) || [];
                const chapQuestions = questionsByChapter.get(chapter.id) || [];
                const chapQuestionsWithPic = chapQuestions.filter((q) => hasValidImage(q.image)).length;

                // Filter lessons inside this chapter by search & picture filter
                const filteredChapLessons = rawChapLessons.filter((l) => {
                  const hasImg = hasValidImage(l.lesson_image);
                  if (sidebarPicFilter === "with_picture" && !hasImg) return false;
                  if (sidebarPicFilter === "without_picture" && hasImg) return false;
                  if (sidebarSearch.trim()) {
                    const q = sidebarSearch.toLowerCase();
                    const lText = getText(`lesson_${l.id}`, l.title).toLowerCase();
                    const cText = getText(`chap_${chapter.id}`, chapter.title).toLowerCase();
                    const numMatch = String(l.lesson_number || "").includes(q);
                    return lText.includes(q) || cText.includes(q) || numMatch;
                  }
                  return true;
                });

                const chapTitle = getText(`chap_${chapter.id}`, chapter.title);
                const matchesChapterSearch =
                  !sidebarSearch.trim() ||
                  chapTitle.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                  filteredChapLessons.length > 0;

                if (!matchesChapterSearch) return null;

                const isExpanded =
                  expandedChapters.has(chapter.id) || Boolean(sidebarSearch.trim());
                const isChapterSelected =
                  selection?.type === "chapter" && selection.chapterId === chapter.id;
                const isQuizSelected =
                  selection?.type === "quiz" && selection.chapterId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    className="rounded-lg border border-border/70 bg-muted/15 overflow-hidden transition-colors"
                  >
                    {/* Course / Chapter Row */}
                    <div
                      onClick={() => {
                        setExpandedChapters((prev) => new Set(prev).add(chapter.id));
                        setSelection({ type: "chapter", chapterId: chapter.id });
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 text-left cursor-pointer transition-colors select-none",
                        isChapterSelected
                          ? "bg-primary/10 text-foreground font-semibold"
                          : "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChapterExpand(chapter.id);
                        }}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {chapter.chapter_number}. {chapTitle}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono tabular-nums">
                          {rawChapLessons.length} lessons · {chapQuestions.length} quiz
                        </div>
                      </div>

                      {hasValidImage(chapter.image) && (
                        <ImageIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>

                    {/* Expanded Dropdown: All Lessons + Bottom Quiz Item */}
                    {isExpanded && (
                      <div className="px-2 pb-2 pt-1 space-y-1 border-t border-border/50 bg-background/50">
                        {/* Lessons List */}
                        {filteredChapLessons.length === 0 ? (
                          <div className="px-3 py-2 text-[11px] text-muted-foreground italic">
                            No matching lessons in this course
                          </div>
                        ) : (
                          <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-0.5">
                            {filteredChapLessons.map((lesson) => {
                              const isLessonSelected =
                                selection?.type === "lesson" && selection.lessonId === lesson.id;
                              const hasImg = hasValidImage(lesson.lesson_image);
                              const lTitle = getText(`lesson_${lesson.id}`, lesson.title);

                              return (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() =>
                                    setSelection({
                                      type: "lesson",
                                      chapterId: chapter.id,
                                      lessonId: lesson.id,
                                    })
                                  }
                                  className={cn(
                                    "w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-left text-xs transition-colors cursor-pointer",
                                    isLessonSelected
                                      ? "bg-primary text-primary-foreground font-medium shadow-2xs"
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                  )}
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                  <span className="font-mono text-[10px] opacity-75 shrink-0">
                                    #{lesson.lesson_number}
                                  </span>
                                  <span className="flex-1 min-w-0 truncate">{lTitle}</span>
                                  {hasImg && (
                                    <ImageIcon
                                      className={cn(
                                        "h-3 w-3 shrink-0",
                                        isLessonSelected ? "text-primary-foreground" : "text-amber-500"
                                      )}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Lesson Quick Button (Admin) */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openCreateLessonModal(chapter.id)}
                            className="w-full flex items-center gap-1.5 pl-4 pr-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add Lesson</span>
                          </button>
                        )}

                        {/* BOTTOM OF COURSE DROPDOWN: Course Quiz Item */}
                        <div className="pt-1 mt-1 border-t border-border/50">
                          <button
                            type="button"
                            onClick={() => {
                              setSelection({ type: "quiz", chapterId: chapter.id });
                              setActiveQuestionId(chapQuestions[0]?.id || null);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between gap-2 pl-4 pr-2.5 py-2 rounded-md text-left text-xs font-medium transition-colors cursor-pointer",
                              isQuizSelected
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "text-foreground/90 hover:bg-muted/70"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ClipboardList className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">Course Quiz</span>
                            </div>
                            <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                              {chapQuestions.length} Qs
                              {chapQuestionsWithPic > 0 ? ` · ${chapQuestionsWithPic} pic` : ""}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pinned Bottom Sidebar Section: Master Quiz Bank (All Quizzes) */}
            <div className="p-2.5 border-t bg-muted/30 space-y-1">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quiz Bank
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelection({ type: "quiz", chapterId: "all" });
                  setActiveQuestionId(questions[0]?.id || null);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer",
                  selection?.type === "quiz" && selection.chapterId === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background hover:bg-muted text-foreground border border-border/70"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <HelpCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">All Course Quizzes</span>
                </div>
                <span className="text-[11px] font-mono tabular-nums opacity-85 shrink-0">
                  {questions.length} Qs ({totalQuestionsWithImages} pic)
                </span>
              </button>
            </div>
          </aside>
        )}

        {/* RIGHT MAIN WORKSPACE: Modify Selected Course, Lesson, or Quiz */}
        <main className="flex-1 min-w-0 w-full rounded-xl border bg-card p-4 sm:p-6 shadow-xs min-h-[calc(100vh-11.5rem)]">
          {/* 1. LESSON WORKSPACE */}
          {selection?.type === "lesson" && selectedLesson && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Breadcrumb & Top Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() =>
                        setSelection({ type: "chapter", chapterId: selection.chapterId })
                      }
                      className="hover:text-foreground transition-colors truncate max-w-[240px]"
                    >
                      {selectedChapter
                        ? `Course ${selectedChapter.chapter_number}: ${getText(`chap_${selectedChapter.id}`, selectedChapter.title)}`
                        : "Course"}
                    </button>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-foreground font-medium">
                      Lesson #{selectedLesson.lesson_number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    Modify Lesson #{selectedLesson.lesson_number}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <QuestionTTSButton
                    entityId={`ext_lesson_${selectedLesson.id}`}
                    text={getText(`lesson_${selectedLesson.id}`, lFormTitle || selectedLesson.title)}
                    language={activeLang}
                  />
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteLesson(selectedLesson)}
                        disabled={deletingLessonId === selectedLesson.id}
                        className="h-9 text-xs gap-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/30"
                      >
                        {deletingLessonId === selectedLesson.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Delete Lesson</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveLesson}
                        disabled={savingLesson}
                        className="h-9 text-xs gap-1.5 px-4"
                      >
                        {savingLesson ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Save Lesson</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Prev / Next Lesson Navigation Strip */}
              {(() => {
                const chapLessons = lessonsByChapter.get(selection.chapterId) || [];
                const idx = chapLessons.findIndex((l) => l.id === selectedLesson.id);
                const prevL = idx > 0 ? chapLessons[idx - 1] : null;
                const nextL =
                  idx >= 0 && idx < chapLessons.length - 1 ? chapLessons[idx + 1] : null;
                return (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!prevL}
                      onClick={() =>
                        prevL &&
                        setSelection({
                          type: "lesson",
                          chapterId: selection.chapterId,
                          lessonId: prevL.id,
                        })
                      }
                      className="h-8 gap-1.5 text-xs"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Previous Lesson</span>
                    </Button>
                    <span className="text-muted-foreground font-mono tabular-nums">
                      Lesson {idx + 1} of {chapLessons.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!nextL}
                      onClick={() =>
                        nextL &&
                        setSelection({
                          type: "lesson",
                          chapterId: selection.chapterId,
                          lessonId: nextL.id,
                        })
                      }
                      className="h-8 gap-1.5 text-xs"
                    >
                      <span>Next Lesson</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })()}

              {/* Lesson Picture Panel */}
              <div className="rounded-xl border p-4 bg-muted/15 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="text-xs font-semibold text-foreground">
                      Lesson Picture / Traffic Sign
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Upload a new image or paste an image URL to update the external database directly.
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => triggerDirectImageUpload("lesson", selectedLesson.id)}
                        disabled={uploadingId === selectedLesson.id}
                        className="h-8 text-xs gap-1.5"
                      >
                        {uploadingId === selectedLesson.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>{hasValidImage(lFormImage) ? "Replace Picture" : "Upload Picture"}</span>
                      </Button>
                      {hasValidImage(lFormImage) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setLFormImage("")}
                          className="h-8 text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {hasValidImage(lFormImage) ? (
                  <div className="rounded-lg border bg-background p-4 flex items-center justify-center min-h-[180px] max-h-[300px] overflow-hidden">
                    <img
                      src={lFormImage}
                      alt="Lesson visual"
                      className="max-h-[260px] w-auto object-contain rounded cursor-zoom-in"
                      onClick={() => setPreviewImageUrl(lFormImage)}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed bg-background/50 py-8 text-center text-xs text-muted-foreground">
                    No picture attached to this lesson.
                  </div>
                )}

                {isAdmin && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Picture URL
                      </label>
                      <Input
                        value={lFormImage}
                        onChange={(e) => setLFormImage(e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        Lesson Number
                      </label>
                      <Input
                        type="number"
                        value={lFormNumber}
                        onChange={(e) => setLFormNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Content Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Lesson Text / Notes (Database Source)
                  </label>
                  {activeLang !== "Kinyarwanda" && (
                    <span className="text-[11px] text-primary font-medium">
                      Viewing {activeLang} translation below
                    </span>
                  )}
                </div>

                {isAdmin ? (
                  <textarea
                    rows={8}
                    value={lFormTitle}
                    onChange={(e) => setLFormTitle(e.target.value)}
                    placeholder="Enter lesson content..."
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                ) : (
                  <div className="rounded-xl border bg-background p-4 text-sm leading-relaxed whitespace-pre-line">
                    {getText(`lesson_${selectedLesson.id}`, selectedLesson.title)}
                  </div>
                )}

                {activeLang !== "Kinyarwanda" && isAdmin && (
                  <div className="rounded-xl border bg-muted/30 p-3.5 space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground">
                      {activeLang} AI Translation Preview:
                    </div>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                      {getText(`lesson_${selectedLesson.id}`, selectedLesson.title)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. COURSE / CHAPTER OVERVIEW & EDITOR WORKSPACE */}
          {selection?.type === "chapter" && selectedChapter && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Course #{selectedChapter.chapter_number}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {getText(`chap_${selectedChapter.id}`, selectedChapter.title)}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openCreateLessonModal(selectedChapter.id)}
                        className="h-9 text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Lesson</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveChapter}
                        disabled={savingChapter}
                        className="h-9 text-xs gap-1.5 px-4"
                      >
                        {savingChapter ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>Save Course</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Course Form */}
              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border p-4 bg-muted/15">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold">Course Title</label>
                    <Input
                      value={cFormTitle}
                      onChange={(e) => setCFormTitle(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Course Number</label>
                    <Input
                      type="number"
                      value={cFormNumber}
                      onChange={(e) => setCFormNumber(e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold">Course Cover Picture</label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => triggerDirectImageUpload("chapter", selectedChapter.id)}
                        disabled={uploadingId === selectedChapter.id}
                        className="h-8 text-xs gap-1.5"
                      >
                        {uploadingId === selectedChapter.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        <span>Upload Cover Picture</span>
                      </Button>
                    </div>
                    <Input
                      value={cFormImage}
                      onChange={(e) => setCFormImage(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Quick List of Lessons in this Course */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">
                    Lessons in this Course ({(lessonsByChapter.get(selectedChapter.id) || []).length})
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelection({ type: "quiz", chapterId: selectedChapter.id })
                    }
                    className="h-8 text-xs gap-1.5"
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      Open Course Quiz ({(questionsByChapter.get(selectedChapter.id) || []).length} Qs)
                    </span>
                  </Button>
                </div>

                <div className="divide-y rounded-xl border bg-background overflow-hidden">
                  {(lessonsByChapter.get(selectedChapter.id) || []).map((lesson) => {
                    const hasImg = hasValidImage(lesson.lesson_image);
                    return (
                      <div
                        key={lesson.id}
                        onClick={() =>
                          setSelection({
                            type: "lesson",
                            chapterId: selectedChapter.id,
                            lessonId: lesson.id,
                          })
                        }
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            #{lesson.lesson_number}
                          </span>
                          {hasImg && (
                            <img
                              src={lesson.lesson_image!}
                              alt=""
                              className="h-9 w-9 rounded object-contain border bg-muted/30 shrink-0"
                            />
                          )}
                          <p className="text-xs sm:text-sm text-foreground line-clamp-1">
                            {getText(`lesson_${lesson.id}`, lesson.title)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasImg && (
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Has Picture
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. QUIZ WORKSPACE (Course Quiz or All Quizzes) */}
          {selection?.type === "quiz" && (
            <div className="space-y-5">
              {/* Quiz Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {selection.chapterId === "all"
                      ? "Master Question Bank"
                      : selectedChapter
                      ? `Course ${selectedChapter.chapter_number}: ${getText(`chap_${selectedChapter.id}`, selectedChapter.title)}`
                      : "Course Quiz"}
                  </div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-amber-500" />
                    <span>
                      {selection.chapterId === "all"
                        ? "All External Quizzes"
                        : "Course Quiz Questions"}
                    </span>
                    <span className="text-xs font-mono font-normal text-muted-foreground">
                      ({currentQuizQuestions.length} questions)
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      startPracticeQuiz(
                        currentQuizQuestions,
                        selection.chapterId === "all"
                          ? "All External Quizzes"
                          : selectedChapter
                          ? `Course ${selectedChapter.chapter_number} Quiz`
                          : "Course Quiz"
                      )
                    }
                    className="h-9 text-xs gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Practice Quiz</span>
                  </Button>

                  {isAdmin && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openCreateQuestionModal(selection.chapterId)}
                      className="h-9 text-xs gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Quiz Question</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter & Question Selector Bar */}
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* Left Question List inside Quiz Workspace */}
                <div className="w-full md:w-[300px] lg:w-[320px] shrink-0 rounded-xl border bg-muted/10 flex flex-col max-h-[680px] overflow-hidden">
                  <div className="p-3 border-b space-y-2 bg-muted/20">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        value={quizSearch}
                        onChange={(e) => setQuizSearch(e.target.value)}
                        placeholder="Search quiz questions..."
                        className="h-8 pl-8 text-xs bg-background"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted text-[11px]">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "with_picture", label: "With Pic" },
                          { id: "without_picture", label: "No Pic" },
                        ] as { id: PictureFilter; label: string }[]
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setQuizPicFilter(tab.id)}
                          className={cn(
                            "py-1 px-2 rounded-md font-medium transition-colors cursor-pointer truncate",
                            quizPicFilter === tab.id
                              ? "bg-background text-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y">
                    {currentQuizQuestions.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No quiz questions match this filter.
                      </div>
                    ) : (
                      currentQuizQuestions.map((q, idx) => {
                        const isSelected = activeQuestion?.id === q.id;
                        const hasImg = hasValidImage(q.image);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuestionId(q.id)}
                            className={cn(
                              "w-full flex items-start gap-2.5 p-3 text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/10 text-foreground font-medium"
                                : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span className="text-[11px] font-mono tabular-nums shrink-0 mt-0.5">
                              #{q.question_numbers ?? idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs line-clamp-2 leading-snug text-foreground">
                                {getText(`q_${q.id}_title`, q.title)}
                              </p>
                            </div>
                            {hasImg && (
                              <ImageIcon className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Selected Quiz Question Editor */}
                <div className="flex-1 min-w-0 w-full">
                  {activeQuestion ? (
                    <div className="rounded-xl border p-4 sm:p-5 space-y-5 bg-background">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            Question #{activeQuestion.question_numbers ?? activeQuestion.id.slice(0, 6)}
                          </span>
                          {hasValidImage(qFormImage) && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" />
                              Has Picture
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <QuestionTTSButton
                            entityId={`ext_q_${activeQuestion.id}`}
                            text={getText(`q_${activeQuestion.id}_title`, qFormTitle)}
                            language={activeLang}
                            readOptions={true}
                            options={qFormChoices.map((c, idx) => ({
                              opt: ["A", "B", "C", "D"][idx] || String(idx + 1),
                              text: getText(`q_${activeQuestion.id}_c_${idx}`, c),
                            }))}
                          />
                          {isAdmin && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteQuestion(activeQuestion.id)}
                                disabled={deletingQuestionId === activeQuestion.id}
                                className="h-8 text-xs gap-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/30"
                              >
                                {deletingQuestionId === activeQuestion.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                <span>Delete</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveQuestion}
                                disabled={savingQuestion}
                                className="h-8 text-xs gap-1.5 px-3.5"
                              >
                                {savingQuestion ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                <span>Save Question</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Question Picture Section */}
                      <div className="rounded-xl border p-3.5 bg-muted/15 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label className="text-xs font-semibold">Question Picture</label>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  triggerDirectImageUpload("question", activeQuestion.id)
                                }
                                disabled={uploadingId === activeQuestion.id}
                                className="h-8 text-xs gap-1.5"
                              >
                                {uploadingId === activeQuestion.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                <span>
                                  {hasValidImage(qFormImage) ? "Replace Picture" : "Upload Picture"}
                                </span>
                              </Button>
                              {hasValidImage(qFormImage) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setQFormImage("")}
                                  className="h-8 text-xs text-red-500"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {hasValidImage(qFormImage) ? (
                          <div className="rounded-lg border bg-background p-3 flex items-center justify-center min-h-[160px] max-h-[260px]">
                            <img
                              src={qFormImage}
                              alt="Question illustration"
                              className="max-h-[230px] w-auto object-contain rounded cursor-zoom-in"
                              onClick={() => setPreviewImageUrl(qFormImage)}
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed bg-background/50 py-6 text-center text-xs text-muted-foreground">
                            No picture attached to this question.
                          </div>
                        )}

                        {isAdmin && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="sm:col-span-2 space-y-1">
                              <label className="text-[11px] text-muted-foreground">
                                Picture URL
                              </label>
                              <Input
                                value={qFormImage}
                                onChange={(e) => setQFormImage(e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] text-muted-foreground">
                                Question #
                              </label>
                              <Input
                                type="number"
                                value={qFormNumber}
                                onChange={(e) => setQFormNumber(e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Question Prompt & Course Assignment */}
                      <div className="space-y-3">
                        {isAdmin && (
                          <div className="space-y-1">
                            <label className="text-xs font-semibold">Assigned Course</label>
                            <select
                              value={qFormChapterId}
                              onChange={(e) => setQFormChapterId(e.target.value)}
                              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs"
                            >
                              {chapters.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Course {c.chapter_number}: {getText(`chap_${c.id}`, c.title)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold">Question Prompt</label>
                          {isAdmin ? (
                            <textarea
                              rows={3}
                              value={qFormTitle}
                              onChange={(e) => setQFormTitle(e.target.value)}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-snug"
                            />
                          ) : (
                            <p className="text-sm font-semibold text-foreground">
                              {getText(`q_${activeQuestion.id}_title`, activeQuestion.title)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Answer Choices (Click radio to set correct answer) */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold">
                          Answer Options {isAdmin && "(Select the correct answer)"}
                        </label>
                        <div className="space-y-2">
                          {qFormChoices.map((choiceVal, idx) => {
                            const isCorrect = Number(qFormAnswer) === idx;
                            const letter = ["A", "B", "C", "D"][idx] || String(idx + 1);
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors",
                                  isCorrect
                                    ? "border-emerald-500/60 bg-emerald-500/10"
                                    : "border-border bg-muted/15"
                                )}
                              >
                                <button
                                  type="button"
                                  disabled={!isAdmin}
                                  onClick={() => isAdmin && setQFormAnswer(idx)}
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer",
                                    isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-muted text-muted-foreground border"
                                  )}
                                  title="Mark as correct answer"
                                >
                                  {letter}
                                </button>
                                {isAdmin ? (
                                  <Input
                                    value={choiceVal}
                                    onChange={(e) => {
                                      const next = [...qFormChoices];
                                      next[idx] = e.target.value;
                                      setQFormChoices(next);
                                    }}
                                    placeholder={`Option ${letter}`}
                                    className="h-8 text-xs bg-background"
                                  />
                                ) : (
                                  <span className="text-xs sm:text-sm flex-1">
                                    {getText(`q_${activeQuestion.id}_c_${idx}`, choiceVal)}
                                  </span>
                                )}
                                {isCorrect && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
                      Select a quiz question on the left to view or modify it.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Image Zoom Lightbox Dialog */}
      <Dialog open={Boolean(previewImageUrl)} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">Picture Preview</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <div className="flex items-center justify-center p-2 bg-muted/20 rounded-xl max-h-[75vh] overflow-auto">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Course Modal */}
      <Dialog open={createCourseOpen} onOpenChange={setCreateCourseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New External Course</DialogTitle>
            <DialogDescription>
              Add a new course chapter to the external database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Course Title</label>
              <Input
                value={newCourseTitle}
                onChange={(e) => setNewCourseTitle(e.target.value)}
                placeholder="e.g. Amategeko y'umuhanda"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Course Number</label>
              <Input
                type="number"
                value={newCourseNumber}
                onChange={(e) => setNewCourseNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCourseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCourse} disabled={creatingCourse}>
              {creatingCourse && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Lesson Modal */}
      <Dialog open={createLessonOpen} onOpenChange={setCreateLessonOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Lesson to Course</DialogTitle>
            <DialogDescription>
              Create a new lesson inside the selected external course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Lesson Number</label>
                <Input
                  type="number"
                  value={newLessonNumber}
                  onChange={(e) => setNewLessonNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Picture URL (optional)</label>
                <Input
                  value={newLessonImage}
                  onChange={(e) => setNewLessonImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Lesson Content</label>
              <textarea
                rows={5}
                value={newLessonTitle}
                onChange={(e) => setNewLessonTitle(e.target.value)}
                placeholder="Enter lesson text..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateLessonOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateLesson} disabled={creatingLesson}>
              {creatingLesson && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Quiz Question Modal */}
      <Dialog open={createQuestionOpen} onOpenChange={setCreateQuestionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Quiz Question</DialogTitle>
            <DialogDescription>
              Create a new multiple-choice question in the external database.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Course</label>
                <select
                  value={newQChapterId}
                  onChange={(e) => setNewQChapterId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      Course {c.chapter_number}: {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Question #</label>
                <Input
                  type="number"
                  value={newQNumber}
                  onChange={(e) => setNewQNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Question Text</label>
              <textarea
                rows={3}
                value={newQTitle}
                onChange={(e) => setNewQTitle(e.target.value)}
                placeholder="Enter question prompt..."
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Picture URL (optional)</label>
              <Input
                value={newQImage}
                onChange={(e) => setNewQImage(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">
                Choices (Click letter to mark correct answer)
              </label>
              {newQChoices.map((c, idx) => {
                const isCorrect = newQAnswer === idx;
                const letter = ["A", "B", "C", "D"][idx];
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewQAnswer(idx)}
                      className={cn(
                        "w-7 h-7 rounded-full text-xs font-bold shrink-0 cursor-pointer",
                        isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground border"
                      )}
                    >
                      {letter}
                    </button>
                    <Input
                      value={c}
                      onChange={(e) => {
                        const next = [...newQChoices];
                        next[idx] = e.target.value;
                        setNewQChoices(next);
                      }}
                      placeholder={`Choice ${letter}`}
                      className="h-8 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateQuestionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuestion} disabled={creatingQuestion}>
              {creatingQuestion && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Practice Quiz Runner Modal */}
      <Dialog open={practiceActive} onOpenChange={setPracticeActive}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{practiceModeLabel}</DialogTitle>
            <DialogDescription>
              Interactive quiz practice from external database
            </DialogDescription>
          </DialogHeader>

          {practiceFinished ? (
            <div className="py-6 text-center space-y-4">
              <div className="text-3xl font-bold font-mono">
                {
                  practiceQuestions.filter(
                    (q) => practiceAnswers[q.id] === Number(q.choice_answer)
                  ).length
                }{" "}
                / {practiceQuestions.length}
              </div>
              <p className="text-sm text-muted-foreground">Quiz Practice Completed</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setPracticeActive(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setPracticeIndex(0);
                    setPracticeAnswers({});
                    setPracticeRevealed({});
                    setPracticeFinished(false);
                  }}
                >
                  Restart Quiz
                </Button>
              </div>
            </div>
          ) : (
            (() => {
              const currentQ = practiceQuestions[practiceIndex];
              if (!currentQ) return null;
              const selectedAns = practiceAnswers[currentQ.id];
              const isRevealed = Boolean(practiceRevealed[currentQ.id]);
              return (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>
                      Question {practiceIndex + 1} of {practiceQuestions.length}
                    </span>
                    <QuestionTTSButton
                      entityId={`prac_${currentQ.id}`}
                      text={getText(`q_${currentQ.id}_title`, currentQ.title)}
                      language={activeLang}
                    />
                  </div>

                  {hasValidImage(currentQ.image) && (
                    <div className="rounded-xl border bg-muted/20 p-3 flex justify-center max-h-[220px]">
                      <img
                        src={currentQ.image!}
                        alt=""
                        className="max-h-[190px] w-auto object-contain rounded"
                      />
                    </div>
                  )}

                  <p className="text-sm sm:text-base font-semibold">
                    {getText(`q_${currentQ.id}_title`, currentQ.title)}
                  </p>

                  <div className="space-y-2">
                    {(currentQ.choice || []).map((c, idx) => {
                      const letter = ["A", "B", "C", "D"][idx] || String(idx + 1);
                      const isPicked = selectedAns === idx;
                      const isCorrect = Number(currentQ.choice_answer) === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPracticeAnswers((prev) => ({ ...prev, [currentQ.id]: idx }));
                            setPracticeRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border text-left text-xs sm:text-sm transition-colors cursor-pointer",
                            isRevealed && isCorrect
                              ? "border-emerald-500 bg-emerald-500/10 font-medium"
                              : isRevealed && isPicked && !isCorrect
                              ? "border-red-500 bg-red-500/10"
                              : isPicked
                              ? "border-primary bg-primary/10"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1">
                            {getText(`q_${currentQ.id}_c_${idx}`, c)}
                          </span>
                          {isRevealed && isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          {isRevealed && isPicked && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={practiceIndex === 0}
                      onClick={() => setPracticeIndex((i) => Math.max(0, i - 1))}
                    >
                      Previous
                    </Button>
                    {practiceIndex < practiceQuestions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={() => setPracticeIndex((i) => i + 1)}
                      >
                        Next Question
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setPracticeFinished(true)}>
                        Finish Quiz
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
