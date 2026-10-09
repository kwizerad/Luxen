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
  Languages,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Play,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
  ExternalLink,
  Check,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
type SubTab = "courses" | "quizzes" | "practice";
type PictureFilter = "grouped" | "with_picture" | "without_picture";

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

  // Navigation & Filtering State
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("courses");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [pictureFilter, setPictureFilter] = useState<PictureFilter>("grouped");
  const [searchQuery, setSearchQuery] = useState("");
  const [quizPage, setQuizPage] = useState(1);
  const QUIZZES_PER_PAGE = 24;

  // Language Translation State
  const [activeLang, setActiveLang] = useState<SupportedLang>("Kinyarwanda");
  const [isTranslating, setIsTranslating] = useState(false);
  // key -> translated string for activeLang
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({
    Kinyarwanda: {},
    English: {},
    French: {},
  });

  // Image Lightbox Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Quick Picture Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<{
    type: "question" | "lesson" | "chapter";
    id: string;
  } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<ExternalQuestion | null>(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [qFormTitle, setQFormTitle] = useState("");
  const [qFormChoices, setQFormChoices] = useState<string[]>(["", "", "", ""]);
  const [qFormAnswer, setQFormAnswer] = useState<number>(0);
  const [qFormChapterId, setQFormChapterId] = useState<string>("");
  const [qFormImage, setQFormImage] = useState<string>("");
  const [qFormNumber, setQFormNumber] = useState<string>("");
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Edit Lesson Modal State
  const [editingLesson, setEditingLesson] = useState<ExternalLesson | null>(null);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [lFormTitle, setLFormTitle] = useState("");
  const [lFormNumber, setLFormNumber] = useState<string>("1");
  const [lFormImage, setLFormImage] = useState<string>("");
  const [lFormSectionId, setLFormSectionId] = useState<string>("");
  const [savingLesson, setSavingLesson] = useState(false);

  // Edit Chapter Modal State
  const [editingChapter, setEditingChapter] = useState<ExternalChapter | null>(null);
  const [cFormTitle, setCFormTitle] = useState("");
  const [cFormNumber, setCFormNumber] = useState<string>("1");
  const [cFormImage, setCFormImage] = useState<string>("");
  const [savingChapter, setSavingChapter] = useState(false);

  // Interactive Quiz Practice Runner State
  const [practiceQuestions, setPracticeQuestions] = useState<ExternalQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, number>>({});
  const [practiceRevealed, setPracticeRevealed] = useState<Record<string, boolean>>({});
  const [practiceFinished, setPracticeFinished] = useState(false);
  const [practiceModeLabel, setPracticeModeLabel] = useState("All Chapters Quiz");

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

      setChapters(data.chapters || []);
      setSections(data.sections || []);
      setLessons(data.lessons || []);
      setQuestions(data.questions || []);
      setQuestionSets(data.questionSets || []);
      if (data.isAdmin || isAdminMode) {
        setIsAdmin(true);
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
        // Send in batches of up to 40 snippets for fast response
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

  // Filtered lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const sec = sectionMap.get(l.section_id);
      if (selectedChapterId !== "all" && sec?.chapter_id !== selectedChapterId) {
        return false;
      }
      if (selectedSectionId !== "all" && l.section_id !== selectedSectionId) {
        return false;
      }
      const hasImg = hasValidImage(l.lesson_image);
      if (pictureFilter === "with_picture" && !hasImg) return false;
      if (pictureFilter === "without_picture" && hasImg) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (l.title || "").toLowerCase().includes(q);
        const transMatch = (translations[activeLang]?.[`lesson_${l.id}`] || "").toLowerCase().includes(q);
        const numMatch = String(l.lesson_number || "").includes(q);
        return titleMatch || transMatch || numMatch;
      }
      return true;
    });
  }, [lessons, sectionMap, selectedChapterId, selectedSectionId, pictureFilter, searchQuery, translations, activeLang]);

  const lessonsWithPictures = useMemo(
    () => filteredLessons.filter((l) => hasValidImage(l.lesson_image)),
    [filteredLessons]
  );
  const lessonsWithoutPictures = useMemo(
    () => filteredLessons.filter((l) => !hasValidImage(l.lesson_image)),
    [filteredLessons]
  );

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedChapterId !== "all" && q.chapter_id !== selectedChapterId) {
        return false;
      }
      const hasImg = hasValidImage(q.image);
      if (pictureFilter === "with_picture" && !hasImg) return false;
      if (pictureFilter === "without_picture" && hasImg) return false;

      if (searchQuery.trim()) {
        const s = searchQuery.toLowerCase();
        const titleMatch = (q.title || "").toLowerCase().includes(s);
        const choiceMatch = (q.choice || []).some((c) => (c || "").toLowerCase().includes(s));
        const numMatch = String(q.question_numbers || "").includes(s);
        return titleMatch || choiceMatch || numMatch;
      }
      return true;
    });
  }, [questions, selectedChapterId, pictureFilter, searchQuery]);

  const questionsWithPictures = useMemo(
    () => filteredQuestions.filter((q) => hasValidImage(q.image)),
    [filteredQuestions]
  );
  const questionsWithoutPictures = useMemo(
    () => filteredQuestions.filter((q) => !hasValidImage(q.image)),
    [filteredQuestions]
  );

  // Reset pagination when filters change
  useEffect(() => {
    setQuizPage(1);
  }, [selectedChapterId, pictureFilter, searchQuery, activeSubTab]);

  // Automatically trigger translation for visible items when activeLang !== "Kinyarwanda"
  useEffect(() => {
    if (activeLang === "Kinyarwanda") return;

    const itemsToTranslate: { key: string; text: string }[] = [];

    // Always translate chapters
    chapters.forEach((c) => {
      itemsToTranslate.push({ key: `chap_${c.id}`, text: c.title });
    });

    if (activeSubTab === "courses") {
      sections
        .filter((s) => selectedChapterId === "all" || s.chapter_id === selectedChapterId)
        .slice(0, 20)
        .forEach((s) => {
          itemsToTranslate.push({ key: `sec_${s.id}`, text: s.title });
        });

      const visibleLessons =
        pictureFilter === "grouped"
          ? [...lessonsWithPictures.slice(0, 20), ...lessonsWithoutPictures.slice(0, 15)]
          : filteredLessons.slice(0, 30);

      visibleLessons.forEach((l) => {
        itemsToTranslate.push({ key: `lesson_${l.id}`, text: l.title });
      });
    } else if (activeSubTab === "quizzes") {
      const orderedQuestions =
        pictureFilter === "grouped"
          ? [...questionsWithPictures, ...questionsWithoutPictures]
          : filteredQuestions;
      const pageItems = orderedQuestions.slice(
        (quizPage - 1) * QUIZZES_PER_PAGE,
        quizPage * QUIZZES_PER_PAGE
      );
      pageItems.slice(0, 10).forEach((q) => {
        itemsToTranslate.push({ key: `q_${q.id}_title`, text: q.title });
        (q.choice || []).forEach((c, idx) => {
          itemsToTranslate.push({ key: `q_${q.id}_c_${idx}`, text: c });
        });
      });
    } else if (activeSubTab === "practice") {
      const currentQ = practiceQuestions[practiceIndex];
      if (currentQ) {
        itemsToTranslate.push({ key: `q_${currentQ.id}_title`, text: currentQ.title });
        (currentQ.choice || []).forEach((c, idx) => {
          itemsToTranslate.push({ key: `q_${currentQ.id}_c_${idx}`, text: c });
        });
      }
    }

    if (itemsToTranslate.length > 0) {
      void translateItemsBatch(itemsToTranslate, activeLang);
    }
  }, [
    activeLang,
    activeSubTab,
    chapters,
    sections,
    selectedChapterId,
    filteredLessons,
    lessonsWithPictures,
    lessonsWithoutPictures,
    filteredQuestions,
    questionsWithPictures,
    questionsWithoutPictures,
    pictureFilter,
    quizPage,
    practiceQuestions,
    practiceIndex,
    translateItemsBatch,
  ]);

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

      const newUrl = data.updatedRecord?.image || data.updatedRecord?.lesson_image || data.publicUrl;
      if (id && !data.updatedRecord) {
        throw new Error("Image uploaded, but database row update returned no record.");
      }

      if (type === "question") {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, ...(data.updatedRecord || {}), image: newUrl } : q))
        );
        if (editingQuestion?.id === id) setQFormImage(newUrl);
      } else if (type === "lesson") {
        setLessons((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...(data.updatedRecord || {}), lesson_image: newUrl } : l))
        );
        if (editingLesson?.id === id) setLFormImage(newUrl);
      } else if (type === "chapter") {
        setChapters((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...(data.updatedRecord || {}), image: newUrl } : c))
        );
        if (editingChapter?.id === id) setCFormImage(newUrl);
      }

      toast.success("Picture updated in external database!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to update picture", { id: toastId });
    } finally {
      setUploadingId(null);
      setUploadingTarget(null);
    }
  };

  // Open Edit Question Modal
  const openEditQuestion = (q: ExternalQuestion) => {
    setIsCreatingQuestion(false);
    setEditingQuestion(q);
    setQFormTitle(q.title || "");
    const padded = [...(q.choice || [])];
    while (padded.length < 4) padded.push("");
    setQFormChoices(padded.slice(0, 4));
    setQFormAnswer(Number(q.choice_answer ?? 0));
    setQFormChapterId(q.chapter_id || chapters[0]?.id || "");
    setQFormImage(q.image || "");
    setQFormNumber(q.question_numbers !== null && q.question_numbers !== undefined ? String(q.question_numbers) : "");
  };

  const openCreateQuestion = () => {
    setIsCreatingQuestion(true);
    setEditingQuestion({
      id: "",
      title: "",
      choice: ["", "", "", ""],
      choice_answer: 0,
      chapter_id: selectedChapterId !== "all" ? selectedChapterId : chapters[0]?.id || "",
      image: "",
      question_numbers: questions.length + 1,
    });
    setQFormTitle("");
    setQFormChoices(["", "", "", ""]);
    setQFormAnswer(0);
    setQFormChapterId(selectedChapterId !== "all" ? selectedChapterId : chapters[0]?.id || "");
    setQFormImage("");
    setQFormNumber(String(questions.length + 1));
  };

  const handleSaveQuestion = async () => {
    if (!qFormTitle.trim()) {
      toast.error("Question title is required");
      return;
    }
    setSavingQuestion(true);
    try {
      const payload = {
        title: qFormTitle.trim(),
        choice: qFormChoices.map((c) => c.trim()),
        choice_answer: Number(qFormAnswer),
        chapter_id: qFormChapterId || chapters[0]?.id,
        image: qFormImage.trim() || null,
        question_numbers: qFormNumber.trim() ? Number(qFormNumber.trim()) : null,
      };

      if (isCreatingQuestion) {
        const res = await fetch("/api/external-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_question", payload }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to create quiz question");
        setQuestions((prev) => [data.data, ...prev]);
        toast.success("Quiz question created in external database!");
      } else if (editingQuestion) {
        const res = await fetch("/api/external-courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "question",
            id: editingQuestion.id,
            payload,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to update quiz question");
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data.data } : q)));
        toast.success("Quiz question updated in external database!");
      }
      setEditingQuestion(null);
      setIsCreatingQuestion(false);
    } catch (err: any) {
      toast.error(err.message || "Error saving quiz question");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
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
    }
  };

  // Open Edit Lesson Modal
  const openEditLesson = (lesson: ExternalLesson) => {
    setIsCreatingLesson(false);
    setEditingLesson(lesson);
    setLFormTitle(lesson.title || "");
    setLFormNumber(String(lesson.lesson_number || 1));
    setLFormImage(lesson.lesson_image || "");
    setLFormSectionId(lesson.section_id || sections[0]?.id || "");
  };

  const openCreateLesson = () => {
    setIsCreatingLesson(true);
    const defaultSec =
      selectedSectionId !== "all"
        ? selectedSectionId
        : sections.find((s) => selectedChapterId === "all" || s.chapter_id === selectedChapterId)?.id ||
          sections[0]?.id ||
          "";
    setEditingLesson({
      id: "",
      title: "",
      lesson_number: lessons.length + 1,
      lesson_image: "",
      section_id: defaultSec,
    });
    setLFormTitle("");
    setLFormNumber(String(lessons.length + 1));
    setLFormImage("");
    setLFormSectionId(defaultSec);
  };

  const handleSaveLesson = async () => {
    if (!lFormTitle.trim()) {
      toast.error("Lesson content/title is required");
      return;
    }
    setSavingLesson(true);
    try {
      const payload = {
        title: lFormTitle.trim(),
        lesson_number: Number(lFormNumber) || 1,
        lesson_image: lFormImage.trim() || null,
        section_id: lFormSectionId,
      };

      if (isCreatingLesson) {
        const res = await fetch("/api/external-courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create_lesson", payload }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to create lesson");
        setLessons((prev) => [...prev, data.data]);
        toast.success("Lesson created in external database!");
      } else if (editingLesson) {
        const res = await fetch("/api/external-courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "lesson",
            id: editingLesson.id,
            payload,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Failed to update lesson");
        setLessons((prev) => prev.map((l) => (l.id === editingLesson.id ? { ...l, ...data.data } : l)));
        toast.success("Lesson updated in external database!");
      }
      setEditingLesson(null);
      setIsCreatingLesson(false);
    } catch (err: any) {
      toast.error(err.message || "Error saving lesson");
    } finally {
      setSavingLesson(false);
    }
  };

  // Open Edit Chapter Modal
  const openEditChapter = (chap: ExternalChapter) => {
    setEditingChapter(chap);
    setCFormTitle(chap.title || "");
    setCFormNumber(String(chap.chapter_number || 1));
    setCFormImage(chap.image || "");
  };

  const handleSaveChapter = async () => {
    if (!editingChapter || !cFormTitle.trim()) return;
    setSavingChapter(true);
    try {
      const res = await fetch("/api/external-courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chapter",
          id: editingChapter.id,
          payload: {
            title: cFormTitle.trim(),
            chapter_number: Number(cFormNumber) || 1,
            image: cFormImage.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update chapter");
      setChapters((prev) => prev.map((c) => (c.id === editingChapter.id ? { ...c, ...data.data } : c)));
      toast.success("Course chapter updated!");
      setEditingChapter(null);
    } catch (err: any) {
      toast.error(err.message || "Error updating chapter");
    } finally {
      setSavingChapter(false);
    }
  };

  // Start Interactive Quiz Practice
  const startPracticeQuiz = (mode: "chapter" | "pictures" | "all", chapId?: string) => {
    let pool = [...questions];
    let label = "All External Quizzes";

    if (mode === "chapter" && chapId && chapId !== "all") {
      pool = questions.filter((q) => q.chapter_id === chapId);
      const ch = chapterMap.get(chapId);
      label = ch ? `Chapter ${ch.chapter_number}: ${getText(`chap_${ch.id}`, ch.title)}` : "Chapter Quiz";
    } else if (mode === "pictures") {
      pool = questions.filter((q) => hasValidImage(q.image));
      label = "Picture Questions Quiz";
    }

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
    setActiveSubTab("practice");
  };

  const totalQuestionsWithImages = useMemo(
    () => questions.filter((q) => hasValidImage(q.image)).length,
    [questions]
  );
  const totalLessonsWithImages = useMemo(
    () => lessons.filter((l) => hasValidImage(l.lesson_image)).length,
    [lessons]
  );

  // Render single Quiz Question Card (used in both With Picture and Without Picture groups)
  const renderQuizCard = (q: ExternalQuestion) => {
    const hasImg = hasValidImage(q.image);
    const chap = chapterMap.get(q.chapter_id);
    const displayTitle = getText(`q_${q.id}_title`, q.title);
    const displayChoices = (q.choice || []).map((c, idx) => getText(`q_${q.id}_c_${idx}`, c));
    const isUploadingThis = uploadingId === q.id;

    return (
      <div
        key={q.id}
        className={cn(
          "rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all bg-card shadow-xs",
          hasImg
            ? "border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.02]"
            : "border-border dark:border-zinc-800"
        )}
      >
        <div className="space-y-3">
          {/* Top Metadata & Action Row */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                #{q.question_numbers ?? q.id.slice(0, 6)}
              </Badge>
              {chap && (
                <Badge variant="secondary" className="text-[10px] max-w-[180px] truncate">
                  Ch.{chap.chapter_number}: {getText(`chap_${chap.id}`, chap.title)}
                </Badge>
              )}
              {hasImg ? (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Has Picture
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  No Picture
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <QuestionTTSButton
                entityId={`ext_q_${q.id}`}
                text={displayTitle}
                language={activeLang}
                readOptions={true}
                options={displayChoices.map((c, idx) => ({
                  opt: ["A", "B", "C", "D"][idx] || String(idx + 1),
                  text: c,
                }))}
              />
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDirectImageUpload("question", q.id)}
                    disabled={isUploadingThis}
                    className="h-7 px-2.5 text-[11px] gap-1 rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    title="Upload & replace picture in external DB"
                  >
                    {isUploadingThis ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    <span>{hasImg ? "Update Picture" : "Add Picture"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditQuestion(q)}
                    className="h-7 px-2.5 text-[11px] gap-1 rounded-lg"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Picture Box (Grouped prominently for visual inspection & update) */}
          {hasImg && (
            <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center p-2 min-h-[150px] max-h-[220px]">
              <img
                src={q.image!}
                alt={displayTitle}
                className="max-h-[196px] w-auto object-contain rounded-lg cursor-zoom-in"
                onClick={() => setPreviewImageUrl(q.image!)}
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2.5 text-[11px] gap-1 shadow-md"
                  onClick={() => setPreviewImageUrl(q.image!)}
                >
                  <Eye className="h-3 w-3" />
                  View
                </Button>
                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                    onClick={() => triggerDirectImageUpload("question", q.id)}
                    disabled={isUploadingThis}
                  >
                    <Upload className="h-3 w-3" />
                    Replace Picture
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Question Text */}
          <p className="text-sm sm:text-base font-semibold text-foreground leading-snug whitespace-pre-line">
            {displayTitle}
          </p>

          {/* Choices List */}
          <div className="space-y-1.5 pt-1">
            {displayChoices.map((choiceText, idx) => {
              const isCorrect = Number(q.choice_answer) === idx;
              const letter = ["A", "B", "C", "D"][idx] || String(idx + 1);
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-xl border text-xs sm:text-sm transition-colors",
                    isCorrect
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5",
                      isCorrect
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground border border-border"
                    )}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 leading-snug">{choiceText}</span>
                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render single Lesson Card
  const renderLessonCard = (lesson: ExternalLesson) => {
    const hasImg = hasValidImage(lesson.lesson_image);
    const sec = sectionMap.get(lesson.section_id);
    const chap = sec ? chapterMap.get(sec.chapter_id) : undefined;
    const displayTitle = getText(`lesson_${lesson.id}`, lesson.title);
    const isUploadingThis = uploadingId === lesson.id;

    return (
      <div
        key={lesson.id}
        className={cn(
          "rounded-2xl border p-4 flex flex-col justify-between gap-3 bg-card transition-all shadow-xs",
          hasImg
            ? "border-amber-500/40 dark:border-amber-500/30 bg-amber-500/[0.02]"
            : "border-border dark:border-zinc-800"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Lesson #{lesson.lesson_number}
              </Badge>
              {chap && (
                <Badge variant="secondary" className="text-[10px] max-w-[160px] truncate">
                  Ch.{chap.chapter_number}
                </Badge>
              )}
              {sec && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                  {getText(`sec_${sec.id}`, sec.title)}
                </span>
              )}
              {hasImg && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Has Picture
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <QuestionTTSButton
                entityId={`ext_lesson_${lesson.id}`}
                text={displayTitle}
                language={activeLang}
              />
              {isAdmin && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDirectImageUpload("lesson", lesson.id)}
                    disabled={isUploadingThis}
                    className="h-7 px-2.5 text-[11px] gap-1 rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                  >
                    {isUploadingThis ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    <span>{hasImg ? "Update Picture" : "Add Picture"}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditLesson(lesson)}
                    className="h-7 px-2.5 text-[11px] gap-1 rounded-lg"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {hasImg && (
            <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-muted/30 flex items-center justify-center p-2.5 min-h-[120px] max-h-[190px]">
              <img
                src={lesson.lesson_image!}
                alt={displayTitle}
                className="max-h-[165px] w-auto object-contain rounded-lg cursor-zoom-in"
                onClick={() => setPreviewImageUrl(lesson.lesson_image!)}
              />
              {isAdmin && (
                <div className="absolute bottom-2 right-2 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                    onClick={() => triggerDirectImageUpload("lesson", lesson.id)}
                    disabled={isUploadingThis}
                  >
                    <Upload className="h-3 w-3" />
                    Replace Picture
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{displayTitle}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] gap-3 p-8 rounded-2xl border bg-card/60">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading External Courses, Lessons &amp; Quizzes from database...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden File Input for 1-Click Picture Updates */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleDirectFileChange}
      />

      {/* Top Control & Language / Mode Header */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                External Courses, Lessons &amp; Quizzes
              </h2>
              <Badge variant="secondary" className="text-xs font-mono">
                {chapters.length} Courses · {lessons.length} Lessons · {questions.length} Quizzes
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Grouped with picture support ({totalLessonsWithImages} lesson pictures &amp; {totalQuestionsWithImages} quiz pictures), multi-language AI translation, and Neural TTS voice.
            </p>
          </div>

          {/* Language Switcher + Refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 rounded-xl bg-muted/80 border border-border/60 text-xs">
              {(["Kinyarwanda", "English", "French"] as SupportedLang[]).map((lang) => {
                const active = activeLang === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
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

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchExternalData(true)}
              disabled={refreshing}
              className="rounded-xl gap-1.5 h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Sync DB</span>
            </Button>
          </div>
        </div>

        {/* Sub-Navigation Tabs + Picture Grouping Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-border/60">
          {/* Primary Sub-Tabs: Courses & Lessons | Quizzes (Grouped by Picture) | Interactive Quiz Practice */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant={activeSubTab === "courses" ? "default" : "outline"}
              onClick={() => setActiveSubTab("courses")}
              className="rounded-xl gap-1.5 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Courses &amp; Lessons ({lessons.length})</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeSubTab === "quizzes" ? "default" : "outline"}
              onClick={() => setActiveSubTab("quizzes")}
              className="rounded-xl gap-1.5 text-xs"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Quizzes &amp; Pictures ({questions.length})</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeSubTab === "practice" ? "default" : "outline"}
              onClick={() => {
                if (practiceQuestions.length === 0) {
                  startPracticeQuiz("all");
                } else {
                  setActiveSubTab("practice");
                }
              }}
              className="rounded-xl gap-1.5 text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Take Practice Quiz</span>
            </Button>
          </div>

          {/* Picture Grouping Filter Pills */}
          {activeSubTab !== "practice" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
                <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                Picture Grouping:
              </span>
              <button
                type="button"
                onClick={() => setPictureFilter("grouped")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  pictureFilter === "grouped"
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                Group With Picture First
              </button>
              <button
                type="button"
                onClick={() => setPictureFilter("with_picture")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  pictureFilter === "with_picture"
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                Only With Picture (
                {activeSubTab === "quizzes" ? totalQuestionsWithImages : totalLessonsWithImages})
              </button>
              <button
                type="button"
                onClick={() => setPictureFilter("without_picture")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                  pictureFilter === "without_picture"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                )}
              >
                Without Picture
              </button>
            </div>
          )}
        </div>

        {/* Chapter Filter & Search Bar */}
        {activeSubTab !== "practice" && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
            <div className="sm:col-span-4">
              <select
                value={selectedChapterId}
                onChange={(e) => {
                  setSelectedChapterId(e.target.value);
                  setSelectedSectionId("all");
                }}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary"
              >
                <option value="all">All 13 External Courses / Chapters</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch.{c.chapter_number}: {getText(`chap_${c.id}`, c.title)}
                  </option>
                ))}
              </select>
            </div>

            {activeSubTab === "courses" && (
              <div className="sm:col-span-3">
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-medium outline-none focus:border-primary"
                >
                  <option value="all">All Sections</option>
                  {sections
                    .filter((s) => selectedChapterId === "all" || s.chapter_id === selectedChapterId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Sec.{s.section_number}: {getText(`sec_${s.id}`, s.title)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className={cn("relative", activeSubTab === "courses" ? "sm:col-span-3" : "sm:col-span-6")}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubTab === "quizzes"
                    ? "Search quiz questions, options, or question number..."
                    : "Search lessons or chapters..."
                }
                className="pl-8 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              {isAdmin && activeSubTab === "quizzes" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateQuestion}
                  className="w-full h-9 rounded-xl gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Quiz</span>
                </Button>
              )}
              {isAdmin && activeSubTab === "courses" && (
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateLesson}
                  className="w-full h-9 rounded-xl gap-1.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Lesson</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: EXTERNAL COURSES (CHAPTERS) & LESSONS
         ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "courses" && (
        <div className="space-y-6">
          {/* Courses / Chapters Horizontal Cards when "all" is selected or header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>External Courses / Chapters ({chapters.length})</span>
              </h3>
              {selectedChapterId !== "all" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedChapterId("all");
                    setSelectedSectionId("all");
                  }}
                  className="h-7 text-xs gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Show All Courses
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {chapters.map((chap) => {
                const isSelected = selectedChapterId === chap.id;
                const chapSections = sections.filter((s) => s.chapter_id === chap.id);
                const secIds = new Set(chapSections.map((s) => s.id));
                const chapLessons = lessons.filter((l) => secIds.has(l.section_id));
                const chapQuestions = questions.filter((q) => q.chapter_id === chap.id);
                const chapImgQuestions = chapQuestions.filter((q) => hasValidImage(q.image)).length;
                const displayChapTitle = getText(`chap_${chap.id}`, chap.title);

                return (
                  <div
                    key={chap.id}
                    onClick={() => setSelectedChapterId(isSelected ? "all" : chap.id)}
                    className={cn(
                      "rounded-2xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-3",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border dark:border-zinc-800 bg-card hover:border-primary/40"
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] font-mono">
                          Course #{chap.chapter_number}
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <QuestionTTSButton
                            entityId={`ext_chap_${chap.id}`}
                            text={displayChapTitle}
                            language={activeLang}
                            size="icon"
                            className="h-6 w-6"
                          />
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openEditChapter(chap)}
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Edit Course Chapter & Picture"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {hasValidImage(chap.image) && (
                        <div className="h-24 w-full rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center p-1.5 overflow-hidden">
                          <img
                            src={chap.image!}
                            alt={displayChapTitle}
                            className="max-h-full max-w-full object-contain rounded"
                          />
                        </div>
                      )}

                      <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug">
                        {displayChapTitle}
                      </h4>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span>{chapLessons.length} Lessons</span>
                        <span>
                          {chapQuestions.length} Quizzes ({chapImgQuestions} 🖼️)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => setSelectedChapterId(chap.id)}
                          className="flex-1 h-7 text-[11px] rounded-lg px-2"
                        >
                          Lessons
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedChapterId(chap.id);
                            setActiveSubTab("quizzes");
                          }}
                          className="flex-1 h-7 text-[11px] rounded-lg px-2"
                        >
                          Quizzes ({chapQuestions.length})
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lessons Grouped by Picture Status */}
          <div className="space-y-6">
            {(pictureFilter === "grouped" || pictureFilter === "with_picture") &&
              lessonsWithPictures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Lessons Grouped With Pictures ({lessonsWithPictures.length})
                      </h3>
                    </div>
                    <span className="text-xs text-amber-800 dark:text-amber-300">
                      All lessons that contain road signs or illustrations grouped together
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {lessonsWithPictures.map(renderLessonCard)}
                  </div>
                </div>
              )}

            {(pictureFilter === "grouped" || pictureFilter === "without_picture") &&
              lessonsWithoutPictures.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-bold text-foreground">
                        Text Lessons Without Picture ({lessonsWithoutPictures.length})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {lessonsWithoutPictures.map(renderLessonCard)}
                  </div>
                </div>
              )}

            {filteredLessons.length === 0 && (
              <div className="text-center py-12 rounded-2xl border border-dashed bg-card/50">
                <p className="text-sm text-muted-foreground">No lessons match your current filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: EXTERNAL QUIZZES & PICTURE GROUPING MANAGER
         ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "quizzes" && (
        <div className="space-y-6">
          {/* Quick Practice Launchers */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border bg-primary/5 border-primary/20 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {filteredQuestions.length} Quiz Questions Found ({questionsWithPictures.length} With Picture ·{" "}
                  {questionsWithoutPictures.length} Without Picture)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Questions with pictures are grouped together so you can inspect and replace any image in 1 click.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startPracticeQuiz("pictures")}
                className="rounded-xl gap-1.5 text-xs border-amber-500/40 text-amber-700 dark:text-amber-300"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Practice Picture Quizzes ({totalQuestionsWithImages})
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => startPracticeQuiz("chapter", selectedChapterId)}
                className="rounded-xl gap-1.5 text-xs"
              >
                <Play className="h-3.5 w-3.5" />
                Start Interactive Quiz
              </Button>
            </div>
          </div>

          {/* GROUP 1: QUIZZES WITH PICTURES */}
          {(pictureFilter === "grouped" || pictureFilter === "with_picture") &&
            questionsWithPictures.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200">
                      Quizzes Grouped With Picture ({questionsWithPictures.length})
                    </h3>
                  </div>
                  <Badge className="bg-amber-500 text-white text-xs">
                    Picture Group
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(pictureFilter === "with_picture"
                    ? questionsWithPictures.slice(0, quizPage * QUIZZES_PER_PAGE)
                    : questionsWithPictures
                  ).map(renderQuizCard)}
                </div>

                {pictureFilter === "with_picture" &&
                  questionsWithPictures.length > quizPage * QUIZZES_PER_PAGE && (
                    <div className="flex justify-center pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setQuizPage((p) => p + 1)}
                        className="rounded-xl"
                      >
                        Load More Picture Questions (
                        {questionsWithPictures.length - quizPage * QUIZZES_PER_PAGE} remaining)
                      </Button>
                    </div>
                  )}
              </div>
            )}

          {/* GROUP 2: QUIZZES WITHOUT PICTURES */}
          {(pictureFilter === "grouped" || pictureFilter === "without_picture") &&
            questionsWithoutPictures.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/60 border border-border">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Quizzes Without Picture ({questionsWithoutPictures.length})
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Text-Only Group
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questionsWithoutPictures
                    .slice(0, quizPage * QUIZZES_PER_PAGE)
                    .map(renderQuizCard)}
                </div>

                {questionsWithoutPictures.length > quizPage * QUIZZES_PER_PAGE && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQuizPage((p) => p + 1)}
                      className="rounded-xl"
                    >
                      Load More Quiz Questions ({questionsWithoutPictures.length - quizPage * QUIZZES_PER_PAGE} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: INTERACTIVE QUIZ PRACTICE RUNNER (WITH TRANSLATION & TTS)
         ───────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "practice" && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveSubTab("quizzes")}
              className="rounded-xl gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to All Quizzes
            </Button>
            <Badge variant="secondary" className="text-xs font-semibold">
              {practiceModeLabel}
            </Badge>
          </div>

          {practiceQuestions.length === 0 ? (
            <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No questions loaded for practice.</p>
              <Button onClick={() => startPracticeQuiz("all")} size="sm">
                Start 25-Question Practice Quiz
              </Button>
            </div>
          ) : practiceFinished ? (
            <div className="rounded-2xl border bg-card p-6 sm:p-8 text-center space-y-5 shadow-sm">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">Practice Quiz Completed!</h3>
                <p className="text-sm text-muted-foreground">
                  You scored{" "}
                  <strong className="text-foreground">
                    {
                      practiceQuestions.filter(
                        (q) => practiceAnswers[q.id] === Number(q.choice_answer)
                      ).length
                    }{" "}
                    / {practiceQuestions.length}
                  </strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setActiveSubTab("quizzes")}>
                  Review All Quizzes
                </Button>
                <Button onClick={() => startPracticeQuiz("all")}>Practice Again</Button>
              </div>
            </div>
          ) : (
            (() => {
              const currentQ = practiceQuestions[practiceIndex];
              const displayTitle = getText(`q_${currentQ.id}_title`, currentQ.title);
              const displayChoices = (currentQ.choice || []).map((c, idx) =>
                getText(`q_${currentQ.id}_c_${idx}`, c)
              );
              const selectedAns = practiceAnswers[currentQ.id];
              const isRevealed = Boolean(practiceRevealed[currentQ.id]);
              const hasImg = hasValidImage(currentQ.image);

              return (
                <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b pb-3">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      Question {practiceIndex + 1} of {practiceQuestions.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <QuestionTTSButton
                        entityId={`ext_prac_${currentQ.id}`}
                        text={displayTitle}
                        language={activeLang}
                        readOptions={true}
                        options={displayChoices.map((c, idx) => ({
                          opt: ["A", "B", "C", "D"][idx] || String(idx + 1),
                          text: c,
                        }))}
                      />
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEditQuestion(currentQ)}
                          className="h-7 text-xs gap-1 rounded-lg"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Quiz
                        </Button>
                      )}
                    </div>
                  </div>

                  {hasImg && (
                    <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-center max-h-[260px] overflow-hidden">
                      <img
                        src={currentQ.image!}
                        alt="Question illustration"
                        className="max-h-[230px] w-auto object-contain rounded-lg"
                      />
                    </div>
                  )}

                  <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug whitespace-pre-line">
                    {displayTitle}
                  </h3>

                  <div className="space-y-2.5">
                    {displayChoices.map((choiceText, idx) => {
                      const isPicked = selectedAns === idx;
                      const isCorrect = Number(currentQ.choice_answer) === idx;
                      const letter = ["A", "B", "C", "D"][idx] || String(idx + 1);

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPracticeAnswers((prev) => ({ ...prev, [currentQ.id]: idx }));
                            setPracticeRevealed((prev) => ({ ...prev, [currentQ.id]: true }));
                          }}
                          className={cn(
                            "w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                            isRevealed && isCorrect
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-semibold"
                              : isRevealed && isPicked && !isCorrect
                              ? "border-red-500 bg-red-500/10 text-red-950 dark:text-red-200"
                              : isPicked
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40 bg-background"
                          )}
                        >
                          <span
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              isRevealed && isCorrect
                                ? "bg-emerald-600 text-white"
                                : isRevealed && isPicked && !isCorrect
                                ? "bg-red-600 text-white"
                                : isPicked
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 text-xs sm:text-sm leading-snug">{choiceText}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={practiceIndex === 0}
                      onClick={() => setPracticeIndex((i) => Math.max(0, i - 1))}
                    >
                      Previous
                    </Button>
                    {practiceIndex < practiceQuestions.length - 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPracticeIndex((i) => i + 1)}
                      >
                        Next Question
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPracticeFinished(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        Finish Practice
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 1: EDIT / CREATE QUIZ QUESTION (ADMIN)
         ───────────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(editingQuestion)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingQuestion(null);
            setIsCreatingQuestion(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingQuestion ? "Create New External Quiz Question" : "Update External Quiz Question & Picture"}
            </DialogTitle>
            <DialogDescription>
              Changes are saved directly to the external Supabase database (`questions` table).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block">Course / Chapter</label>
                <select
                  value={qFormChapterId}
                  onChange={(e) => setQFormChapterId(e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background px-3 text-xs"
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      Ch.{c.chapter_number}: {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Question Number</label>
                <Input
                  type="number"
                  value={qFormNumber}
                  onChange={(e) => setQFormNumber(e.target.value)}
                  placeholder="e.g. 111"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Picture Preview + Upload / URL Editor */}
            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                  Question Picture
                </label>
                {editingQuestion?.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDirectImageUpload("question", editingQuestion.id)}
                    disabled={uploadingId === editingQuestion.id}
                    className="h-7 text-xs gap-1.5"
                  >
                    {uploadingId === editingQuestion.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Upload Image File
                  </Button>
                )}
              </div>

              {hasValidImage(qFormImage) && (
                <div className="rounded-lg border bg-background p-2 flex items-center justify-center max-h-44 overflow-hidden">
                  <img src={qFormImage} alt="Preview" className="max-h-40 object-contain rounded" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={qFormImage}
                  onChange={(e) => setQFormImage(e.target.value)}
                  placeholder="Paste image URL or upload file above..."
                  className="h-8 text-xs flex-1"
                />
                {hasValidImage(qFormImage) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setQFormImage("")}
                    className="h-8 text-xs text-red-500 hover:text-red-600"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Question Text</label>
              <textarea
                value={qFormTitle}
                onChange={(e) => setQFormTitle(e.target.value)}
                rows={3}
                className="w-full rounded-lg border bg-background p-2.5 text-xs sm:text-sm outline-none focus:border-primary"
                placeholder="Enter question title..."
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-xs font-semibold block">
                Answer Choices (Click the radio circle to mark the correct answer)
              </label>
              {qFormChoices.map((choiceVal, idx) => {
                const letter = ["A", "B", "C", "D"][idx] || String(idx + 1);
                const isCorrect = qFormAnswer === idx;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQFormAnswer(idx)}
                      className={cn(
                        "w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 border transition-all cursor-pointer",
                        isCorrect
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                      title={isCorrect ? "Correct Answer" : "Click to set as Correct Answer"}
                    >
                      {letter}
                    </button>
                    <Input
                      value={choiceVal}
                      onChange={(e) => {
                        const next = [...qFormChoices];
                        next[idx] = e.target.value;
                        setQFormChoices(next);
                      }}
                      placeholder={`Option ${letter}...`}
                      className={cn("h-9 text-xs flex-1", isCorrect && "border-emerald-500/60")}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            {!isCreatingQuestion && editingQuestion ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  handleDeleteQuestion(editingQuestion.id);
                  setEditingQuestion(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsCreatingQuestion(false);
                }}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveQuestion} disabled={savingQuestion}>
                {savingQuestion && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Save Quiz Question
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 2: EDIT / CREATE LESSON (ADMIN)
         ───────────────────────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(editingLesson)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLesson(null);
            setIsCreatingLesson(false);
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingLesson ? "Create New External Lesson" : "Update External Lesson & Picture"}
            </DialogTitle>
            <DialogDescription>
              Updates the `lessons` table in the external Supabase database.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold mb-1 block">Section</label>
                <select
                  value={lFormSectionId}
                  onChange={(e) => setLFormSectionId(e.target.value)}
                  className="w-full h-9 rounded-lg border bg-background px-3 text-xs"
                >
                  {sections.map((s) => {
                    const ch = chapterMap.get(s.chapter_id);
                    return (
                      <option key={s.id} value={s.id}>
                        {ch ? `Ch.${ch.chapter_number} - ` : ""}Sec.{s.section_number}: {s.title}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block">Lesson Number</label>
                <Input
                  type="number"
                  value={lFormNumber}
                  onChange={(e) => setLFormNumber(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="rounded-xl border p-3.5 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                  Lesson Picture (`lesson_image`)
                </label>
                {editingLesson?.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDirectImageUpload("lesson", editingLesson.id)}
                    disabled={uploadingId === editingLesson.id}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Upload className="h-3 w-3" />
                    Upload Picture
                  </Button>
                )}
              </div>

              {hasValidImage(lFormImage) && (
                <div className="rounded-lg border bg-background p-2 flex items-center justify-center max-h-44 overflow-hidden">
                  <img src={lFormImage} alt="Lesson preview" className="max-h-40 object-contain rounded" />
                </div>
              )}

              <Input
                value={lFormImage}
                onChange={(e) => setLFormImage(e.target.value)}
                placeholder="Paste lesson image URL or upload file..."
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Lesson Content / Title</label>
              <textarea
                value={lFormTitle}
                onChange={(e) => setLFormTitle(e.target.value)}
                rows={5}
                className="w-full rounded-lg border bg-background p-2.5 text-xs sm:text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingLesson(null);
                setIsCreatingLesson(false);
              }}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveLesson} disabled={savingLesson}>
              {savingLesson && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL 3: EDIT COURSE CHAPTER (ADMIN)
         ───────────────────────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(editingChapter)} onOpenChange={(open) => !open && setEditingChapter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update External Course / Chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold mb-1 block">Chapter Number</label>
              <Input
                type="number"
                value={cFormNumber}
                onChange={(e) => setCFormNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Chapter Title</label>
              <Input
                value={cFormTitle}
                onChange={(e) => setCFormTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Chapter Cover Picture</label>
                {editingChapter && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => triggerDirectImageUpload("chapter", editingChapter.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <Upload className="h-3 w-3" />
                    Upload
                  </Button>
                )}
              </div>
              {hasValidImage(cFormImage) && (
                <div className="rounded-lg border p-2 flex justify-center bg-muted/20">
                  <img src={cFormImage} alt="Chapter" className="max-h-32 object-contain rounded" />
                </div>
              )}
              <Input
                value={cFormImage}
                onChange={(e) => setCFormImage(e.target.value)}
                placeholder="Image URL..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingChapter(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveChapter} disabled={savingChapter}>
              {savingChapter && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Image Preview Dialog */}
      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(o) => !o && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-2xl p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-sm">Picture Preview</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <div className="flex items-center justify-center bg-muted/30 rounded-xl p-4">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
