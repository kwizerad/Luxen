"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, ArrowRight, Search } from "lucide-react";
import { preloadImages } from "@/components/smart-image";
import { Watermark } from "@/components/watermark";
import { ExamReview } from "@/components/exam-review";
import { GroupExamCreation } from "@/components/group-exam-creation";
import { GroupExamLobby } from "@/components/group-exam-lobby";
import { GroupExamResults } from "@/components/group-exam-results";
import { ExamCategorySkeleton, ExamChoiceSkeleton } from "@/components/skeletons";
import { OSExamLauncher } from "@/components/os-exam/os-exam-launcher";
import {
  OSExamWorkspace,
  type TakeExamQuestion,
  type TakeExamResponse,
  type UserAnswer,
} from "@/components/os-exam/os-exam-workspace";
import {
  useExamAnticheat,
  type SubmissionReason,
} from "@/hooks/use-exam-anticheat";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import {
  getCachedGroupExamEnabled,
  isGroupExamEnabled,
  isStandaloneExamEnabled,
} from "@/lib/feature-flags";
import { authFetch } from "@/lib/e2e-crypto";
import {
  DEFAULT_SECURITY_SETTINGS,
  getSecuritySettings,
  type SecuritySettings,
} from "@/lib/security-config";
import { createClient } from "@/lib/supabase/client";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import {
  createExamAttempt,
  getExamCategories,
  getExamForTaking,
} from "@/lib/supabase/queries";
import type {
  ExamAttempt,
  ExamCategory,
  ExamQuestion,
} from "@/lib/database.types";
import { isUUID } from "@/lib/utils";
import { toast } from "sonner";

export interface ExamViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  params?: URLSearchParams;
}

function buildFallbackCategory(): ExamCategory {
  const now = new Date().toISOString();
  return {
    id: EXTERNAL_EXAM_CATEGORY_ID,
    name: "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda",
    description: "Official Traffic Rules & Road Signs Mock Exam",
    created_by: "system",
    is_published: true,
    duration_minutes: 20,
    question_count: 20,
    created_at: now,
    updated_at: now,
  };
}

export function ExamView({ navigate, params }: ExamViewProps) {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const paramChallengeId = params?.get("challenge_id") || "";
  const paramCategoryId = params?.get("category_id") || "";
  const paramMode = params?.get("mode") || "";
  const paramFrom = params?.get("from") || "";

  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>(paramCategoryId);
  const [challengeId, setChallengeId] = useState<string>(paramChallengeId);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const cachedGroup = getCachedGroupExamEnabled();
  const [accessChecked, setAccessChecked] = useState(false);
  const [standaloneEnabled, setStandaloneEnabled] = useState(true);
  const [groupExamEnabled, setGroupExamEnabled] = useState(
    cachedGroup !== null ? cachedGroup : true
  );
  const [hasExamHistory, setHasExamHistory] = useState(false);

  const [examMode, setExamMode] = useState<"launcher" | "group" | "lobby">(
    paramChallengeId ? "lobby" : paramMode === "group" ? "group" : "launcher"
  );
  const [selectedExamLanguage, setSelectedExamLanguage] =
    useState<string>("Kinyarwanda");

  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [exam, setExam] = useState<TakeExamResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>(
    {}
  );
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);
  const [isSoloGroupAttempt, setIsSoloGroupAttempt] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    DEFAULT_SECURITY_SETTINGS
  );

  // Dialog states
  const [showPreSubmitModal, setShowPreSubmitModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<
    "info" | "warning" | "error" | "success"
  >("info");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(
    null
  );

  const submittingExamRef = useRef(false);
  const showResultsRef = useRef(false);
  const handleSubmitExamRef = useRef<
    ((isAutoSubmit?: boolean, reason?: SubmissionReason) => Promise<void>) | null
  >(null);
  const resetRef = useRef<(() => void) | null>(null);

  const anticheat = useExamAnticheat({
    isActive: Boolean(exam && !showResults),
    showResults,
    securitySettings,
    onAutoSubmit: (reason) => {
      void handleSubmitExamRef.current?.(true, reason);
    },
  });

  // Sync URL/hash route parameters and check Admin feature flags
  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const resolvedChallengeId =
      paramChallengeId || urlParams.get("challenge_id") || "";
    const resolvedCategoryId =
      paramCategoryId || urlParams.get("category_id") || "";
    const resolvedMode = paramMode || urlParams.get("mode") || "";

    if (resolvedChallengeId) {
      setChallengeId(resolvedChallengeId);
      setExamMode("lobby");
    } else if (resolvedMode === "group") {
      setExamMode("group");
    } else {
      setExamMode("launcher");
    }

    if (resolvedCategoryId) {
      setCategoryId(resolvedCategoryId);
    }

    Promise.all([isStandaloneExamEnabled(), isGroupExamEnabled()])
      .then(([standalone, group]) => {
        setStandaloneEnabled(standalone);
        setGroupExamEnabled(group);
        setAccessChecked(true);
      })
      .catch(() => {
        setAccessChecked(true);
      });
  }, [authLoading, paramChallengeId, paramCategoryId, paramMode]);

  // If arriving with challengeId but no categoryId, resolve category from challenge row
  useEffect(() => {
    if (!challengeId || categoryId) return;
    const fetchChallengeCategory = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("exam_challenges")
        .select("category_id")
        .eq("id", challengeId)
        .maybeSingle();
      if (data?.category_id) {
        setCategoryId(data.category_id);
      }
    };
    void fetchChallengeCategory();
  }, [challengeId, categoryId]);

  // Check if student has past exam history for quick navigation button
  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const checkExamHistory = async () => {
      const supabase = createClient();
      const [res1, res2] = await Promise.allSettled([
        supabase
          .from("exam_attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("module_exam_attempts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      const count1 = res1.status === "fulfilled" ? (res1.value.count ?? 0) : 0;
      const count2 = res2.status === "fulfilled" ? (res2.value.count ?? 0) : 0;
      setHasExamHistory(count1 + count2 > 0);
    };
    void checkExamHistory();
  }, [user]);

  // Load published exam categories and admin security settings
  useEffect(() => {
    if (typeof window === "undefined" || !accessChecked) return;

    const loadInitialData = async () => {
      setLoadingCategories(true);
      try {
        const data = await getExamCategories();
        const cats = data.categories || [];
        if (cats.length === 0) {
          setCategories([buildFallbackCategory()]);
        } else {
          setCategories(cats);
        }
      } catch (error) {
        console.error("[ExamView] Error loading exam categories:", error);
        setCategories([buildFallbackCategory()]);
      } finally {
        setLoadingCategories(false);
      }
    };

    const loadSecurity = async () => {
      try {
        const settings = await getSecuritySettings();
        setSecuritySettings(settings);
      } catch (error) {
        console.error("[ExamView] Failed to load security settings:", error);
      }
    };

    void loadInitialData();
    void loadSecurity();
  }, [accessChecked]);

  // Auto-select first category if none selected yet
  useEffect(() => {
    if (!loadingCategories && categories.length > 0 && !categoryId && !exam) {
      const firstValid =
        categories.find((c) => isUUID(c.id))?.id || categories[0].id;
      setCategoryId(firstValid);
    }
  }, [loadingCategories, categories, categoryId, exam]);

  // Keep sessionStorage exam-active flag strictly in sync with active exam state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isInProgress = Boolean(exam && !showResults);
    if (isInProgress) {
      sessionStorage.setItem("exam-active", "true");
    } else {
      sessionStorage.removeItem("exam-active");
    }
    window.dispatchEvent(new CustomEvent("exam-state-change"));
  }, [exam, showResults]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
    };
  }, []);

  // Prevent browser back/forward cache leaving stale results screen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && showResultsRef.current) {
        resetRef.current?.();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Lock history back when viewing results so student returns cleanly to OS Exam Center
  useEffect(() => {
    if (typeof window === "undefined" || !accessChecked || !showResults) return;
    for (let i = 0; i < 3; i++) {
      window.history.pushState(
        { resultsBuffer: true, index: i },
        "",
        window.location.href
      );
    }
    const handlePopState = () => {
      resetRef.current?.();
      window.history.replaceState(
        { categoriesBuffer: true },
        "",
        window.location.href
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [accessChecked, showResults]);

  // Handle SPA back requests cleanly inside OS window
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRequestBack = (e: Event) => {
      if (exam && !showResults) {
        e.preventDefault();
        return;
      }
      if (showResults) {
        e.preventDefault();
        resetRef.current?.();
        return;
      }
      if (!exam && (examMode === "group" || examMode === "lobby")) {
        e.preventDefault();
        setChallengeId("");
        setExamMode("launcher");
      }
    };
    window.addEventListener("app:request-back", handleRequestBack);
    return () =>
      window.removeEventListener("app:request-back", handleRequestBack);
  }, [exam, showResults, examMode]);

  const activeQuestion = useMemo<TakeExamQuestion | null>(() => {
    if (!exam?.questions?.length) return null;
    return exam.questions[currentIndex] ?? null;
  }, [exam, currentIndex]);

  const handleSelectAnswer = useCallback(
    (answer: "A" | "B" | "C" | "D") => {
      if (!activeQuestion) return;
      setUserAnswers((prev) => ({
        ...prev,
        [activeQuestion.id]: {
          questionId: activeQuestion.id,
          selectedAnswer: answer,
          timeStarted: prev[activeQuestion.id]?.timeStarted || Date.now(),
        },
      }));
    },
    [activeQuestion]
  );

  // Desktop keyboard navigation (Left/Right + A-D/1-4)
  useEffect(() => {
    if (typeof window === "undefined" || !exam || showResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentIndex((i) =>
          Math.min((exam?.questions.length || 1) - 1, i + 1)
        );
      } else if (activeQuestion) {
        if (["a", "A", "1"].includes(e.key)) handleSelectAnswer("A");
        else if (["b", "B", "2"].includes(e.key)) handleSelectAnswer("B");
        else if (["c", "C", "3"].includes(e.key)) handleSelectAnswer("C");
        else if (["d", "D", "4"].includes(e.key)) handleSelectAnswer("D");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exam, showResults, activeQuestion, handleSelectAnswer]);

  // Horizontal touch / trackpad swipe navigation between questions
  useEffect(() => {
    if (typeof window === "undefined" || !exam || showResults) return;

    let startX: number | null = null;
    let startY: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX === null || startY === null || e.changedTouches.length !== 1)
        return;
      const deltaX = startX - e.changedTouches[0].clientX;
      const deltaY = startY - e.changedTouches[0].clientY;
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1));
        } else {
          setCurrentIndex((i) => Math.max(0, i - 1));
        }
      }
      startX = null;
      startY = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (
        Math.abs(e.deltaX) > 40 &&
        Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5
      ) {
        if (e.deltaX > 0) {
          setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1));
        } else {
          setCurrentIndex((i) => Math.max(0, i - 1));
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [exam, showResults]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || showResults) return;
    if (secondsLeft <= 0) {
      anticheat.submissionReasonRef.current = "time_expired";
      void handleSubmitExamRef.current?.(true, "time_expired");
      return;
    }
    const id = setInterval(
      () => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))),
      1000
    );
    return () => clearInterval(id);
  }, [secondsLeft, showResults, anticheat]);

  // Direct exam start — opens Question 1 immediately without any pre-exam instructions
  const startExam = async (catId?: string, examLang?: string) => {
    if (
      securitySettings.violationMeasuresEnabled &&
      securitySettings.fullscreenEnabled
    ) {
      await anticheat.enterFullscreen();
    }

    const activeLang = examLang || selectedExamLanguage || "Kinyarwanda";
    if (examLang) {
      setSelectedExamLanguage(examLang);
    }

    let targetCategoryId = catId || categoryId;

    if (
      !targetCategoryId ||
      targetCategoryId === "fallback-id" ||
      !isUUID(targetCategoryId)
    ) {
      const matched = categories.find((c) => isUUID(c.id));
      targetCategoryId = matched ? matched.id : EXTERNAL_EXAM_CATEGORY_ID;
      setCategoryId(targetCategoryId);
    }

    if (challengeId) {
      try {
        await authFetch(`/api/exam-challenges/${challengeId}/start`, {
          method: "POST",
        });
      } catch (err) {
        console.error("[ExamView] Failed to mark challenge active:", err);
      }
    }

    setLoadingExam(true);
    try {
      const data = await getExamForTaking(
        targetCategoryId,
        challengeId || undefined,
        activeLang
      );

      if (!data?.questions || data.questions.length === 0) {
        toast.error(
          t("noQuestionsInExam") || "No questions found for this exam category."
        );
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("exam-active");
          window.dispatchEvent(new CustomEvent("exam-state-change"));
        }
        return;
      }

      const imageUrls = data.questions
        .flatMap((q: Record<string, unknown>) => [
          q.question_image,
          q.option_a_image,
          q.option_b_image,
          q.option_c_image,
          q.option_d_image,
        ])
        .filter(Boolean) as string[];
      preloadImages(imageUrls);

      anticheat.resetSecurity();
      setExam(data as TakeExamResponse);
      setCurrentIndex(0);
      setSecondsLeft((data.settings?.duration_minutes ?? 20) * 60);
      setExamStartTime(Date.now());
      setUserAnswers({});
      setShowResults(false);
      showResultsRef.current = false;
      setExamResult(null);
      setIsSoloGroupAttempt(false);
      submittingExamRef.current = false;
      setShowPreSubmitModal(false);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("exam-active", "true");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
        for (let i = 0; i < 3; i++) {
          window.history.pushState(
            { exam: true, index: i },
            "",
            window.location.href
          );
        }
      }
    } catch (error) {
      console.error("[ExamView] Error loading questions in startExam:", error);
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || String(error);
      toast.error(message || t("failedToStartExam"));
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
    } finally {
      setLoadingExam(false);
    }
  };

  const handleSubmitExam = async (
    isAutoSubmit = false,
    reasonOverride?: SubmissionReason
  ) => {
    if (!exam || !examStartTime) return;
    if (submittingExamRef.current || showResultsRef.current) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0 && !isAutoSubmit) {
      setAlertTitle(t("noAnswersSelected"));
      setAlertMessage(t("noAnswersSelectedMessage"));
      setAlertType("warning");
      setShowAlert(true);
      return;
    }

    if (reasonOverride) {
      anticheat.submissionReasonRef.current = reasonOverride;
    }

    setSubmittingExam(true);
    submittingExamRef.current = true;
    anticheat.isSubmittingOnExitRef.current = true;
    anticheat.setIsSubmittingOnExit(true);
    setShowPreSubmitModal(false);

    let submitSuccess = false;
    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);
      const answers = exam.questions.map((q) => {
        const userAnswer = userAnswers[q.id];
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          is_correct: false,
          time_spent_seconds: userAnswer
            ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000)
            : 0,
        };
      });

      const categoryName =
        categories.find((c) => c.id === exam.categoryId)?.name || t("unknown");
      const status: "completed" | "abandoned" =
        answeredCount > 0 ? "completed" : "abandoned";
      const violationSummary =
        anticheat.violationMessagesRef.current.length > 0
          ? anticheat.violationMessagesRef.current.join("; ")
          : undefined;

      const data = await createExamAttempt({
        category_id: exam.categoryId,
        category_name: categoryName,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status,
        submission_reason: anticheat.submissionReasonRef.current,
        violation_summary: violationSummary,
        is_group_challenge: !!challengeId,
        challenge_id: challengeId || undefined,
      });

      const attempt = data.attempt as ExamAttempt;
      const questionDetails: Record<
        string,
        { correct_answer: string; explanation?: string }
      > = data.questionDetails || {};

      setExam((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) => ({
                ...q,
                correct_answer: (questionDetails[q.id]?.correct_answer ??
                  q.correct_answer) as ExamQuestion["correct_answer"],
                explanation:
                  questionDetails[q.id]?.explanation ?? q.explanation,
              })),
            }
          : prev
      );

      setExamResult(attempt);
      setShowResults(true);
      showResultsRef.current = true;
      submitSuccess = true;

      if (challengeId) {
        try {
          if (status === "abandoned") {
            await authFetch(`/api/exam-challenges/${challengeId}/abandon`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          } else {
            const completeRes = await authFetch(
              `/api/exam-challenges/${challengeId}/complete`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ exam_attempt_id: attempt.id }),
              }
            );
            if (completeRes.ok) {
              const completeData = await completeRes.json();
              if (completeData?.is_solo_attempt) {
                setIsSoloGroupAttempt(true);
              }
            }
          }
        } catch (challengeError) {
          console.error(
            "[ExamView] Failed to update challenge status:",
            challengeError
          );
        }
      }

      try {
        await authFetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "exam_submitted",
            title: t("examSubmittedNotificationTitle"),
            message: t("examSubmittedNotificationMessage") + " " + categoryName,
            target_role: "admin",
            data: {
              attempt_id: attempt.id,
              category_id: exam.categoryId,
              category_name: categoryName,
            },
          }),
        });
      } catch (notifErr) {
        console.error("[ExamView] Failed to notify admins:", notifErr);
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
      await anticheat.exitFullscreenSafe();
      toast.success(t("examSubmittedSuccess"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || String(error);
      toast.error(`${t("failedToSubmitExam")}: ${message}`);
    } finally {
      setSubmittingExam(false);
      submittingExamRef.current = false;
      if (!submitSuccess) {
        anticheat.isSubmittingOnExitRef.current = false;
        anticheat.setIsSubmittingOnExit(false);
      }
    }
  };
  handleSubmitExamRef.current = handleSubmitExam;

  const reset = () => {
    setExam(null);
    setCurrentIndex(0);
    setSecondsLeft(null);
    setExamStartTime(null);
    setUserAnswers({});
    setShowResults(false);
    showResultsRef.current = false;
    setExamResult(null);
    setIsSoloGroupAttempt(false);
    submittingExamRef.current = false;
    setChallengeId("");
    setExamMode("launcher");
    setShowPreSubmitModal(false);
    setShowAlert(false);
    setShowConfirm(false);
    setConfirmCallback(null);
    anticheat.resetSecurity();

    if (
      typeof window !== "undefined" &&
      window.location.hash.includes("challenge_id=")
    ) {
      try {
        window.history.replaceState(null, "", "/dashboard#exam");
        window.dispatchEvent(new CustomEvent("navo-hash-route-change"));
      } catch {
        window.location.hash = "#exam";
      }
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }
  };
  resetRef.current = reset;

  const handleRetake = () => {
    const prevCatId = categoryId || exam?.categoryId;
    reset();
    if (prevCatId) {
      void startExam(prevCatId, selectedExamLanguage);
    }
  };

  const handleInitiateManualSubmit = () => {
    if (!exam) return;
    const count = Object.keys(userAnswers).length;
    if (count === 0) {
      setAlertTitle(t("noAnswersSelected") || "No answers selected");
      setAlertMessage(
        t("noAnswersSelectedMessage") ||
          "Please select at least one answer before submitting the exam."
      );
      setAlertType("warning");
      setShowAlert(true);
      return;
    }
    setShowPreSubmitModal(true);
  };

  // Loading gate while verifying flags/auth
  if (!accessChecked || authLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        {challengeId ? <ExamCategorySkeleton count={3} /> : <ExamChoiceSkeleton />}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
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
                : "Amasomo yose n'ibibazo by'ibizamini bibikiwe abanyeshuri binjiye muri konti zabo. Injira kugira ngo ukore ibizamini."}
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

  // Group Exam Creation Flow (preserved, respects Admin group_exam_enabled toggle)
  if (examMode === "group" && !exam && groupExamEnabled) {
    return (
      <GroupExamCreation
        onBack={() => setExamMode("launcher")}
        onStartExam={async (selectedCatId, inviteeIds) => {
          setCategoryId(selectedCatId);
          const catName =
            categories.find((c) => c.id === selectedCatId)?.name || "Exam";
          try {
            const res = await authFetch("/api/exam-challenges", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category_id: selectedCatId,
                category_name: catName,
                invite_user_ids: inviteeIds,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              toast.error(
                data?.error ||
                  t("failedToStartExam") ||
                  "Failed to create group exam"
              );
              return;
            }
            if (data?.challenge?.id) {
              setChallengeId(data.challenge.id);
              setExamMode("lobby");
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            toast.error(
              `${t("failedToStartExam") || "Failed to create group exam"}: ${message}`
            );
          }
        }}
      />
    );
  }

  // Group Exam Lobby (preserved — clicking start enters Question 1 directly)
  if (examMode === "lobby" && !exam) {
    const selectedCat = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCat?.name || "Exam";
    return (
      <GroupExamLobby
        challengeId={challengeId}
        categoryName={categoryName}
        durationMinutes={selectedCat?.duration_minutes}
        questionCount={selectedCat?.question_count}
        securitySettings={{
          fullscreenEnabled: securitySettings.fullscreenEnabled,
          tabSwitchEnabled: securitySettings.tabSwitchEnabled,
          rightClickEnabled: securitySettings.rightClickEnabled,
          aiDetectionEnabled: securitySettings.aiDetectionEnabled,
        }}
        onStart={() => {
          void startExam(categoryId || EXTERNAL_EXAM_CATEGORY_ID);
        }}
        onCancel={() => {
          const from =
            paramFrom ||
            (typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("from") || ""
              : "");
          if (from === "classmates") {
            navigate("classmates");
            return;
          }
          if (from === "services") {
            navigate("services/group-exam");
            return;
          }
          if (from === "dashboard") {
            navigate("home");
            return;
          }
          setChallengeId("");
          setExamMode("launcher");
        }}
      />
    );
  }

  // Post-Submission Results & Group Challenge Leaderboard (preserved)
  if (showResults && examResult) {
    const effectiveChallengeId =
      challengeId ||
      examResult.challenge_id ||
      paramChallengeId ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("challenge_id") || ""
        : "");

    if (effectiveChallengeId && !isSoloGroupAttempt) {
      return (
        <GroupExamResults
          challengeId={effectiveChallengeId}
          examResult={{ ...examResult, challenge_id: effectiveChallengeId }}
          questions={(exam?.questions || []) as ExamQuestion[]}
          onReset={reset}
          onRetake={handleRetake}
        />
      );
    }

    return (
      <ExamReview
        examResult={examResult}
        questions={(exam?.questions || []) as ExamQuestion[]}
        onReset={reset}
        onRetake={handleRetake}
        passingPercentage={exam?.settings?.passing_percentage}
      />
    );
  }

  // Fetching questions overlay inside Navo OS window
  if (loadingExam) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-foreground">
          {language === "Kinyarwanda" ||
          language === "rw" ||
          selectedExamLanguage === "Kinyarwanda"
            ? "Tegereza gato..."
            : t("starting") || "Loading exam questions..."}
        </p>
      </div>
    );
  }

  // Active Exam Workspace inside Navo OS window (no pre-exam instructions)
  if (exam) {
    const categoryTitle =
      categories.find((c) => c.id === exam.categoryId)?.name ||
      categories[0]?.name ||
      t("exams") ||
      "Exam";

    return (
      <>
        <Watermark />
        <OSExamWorkspace
          exam={exam}
          categoryTitle={categoryTitle}
          examLanguage={selectedExamLanguage}
          currentIndex={currentIndex}
          onChangeIndex={setCurrentIndex}
          secondsLeft={secondsLeft}
          userAnswers={userAnswers}
          onSelectAnswer={handleSelectAnswer}
          submittingExam={submittingExam}
          onRequestQuit={() => {
            setConfirmTitle(t("quitExamTitle") || "Quit Exam?");
            setConfirmMessage(
              t("quitExamMessage") ||
                "Are you sure you want to finish and submit your current answers now?"
            );
            setConfirmCallback(
              () => () => void handleSubmitExamRef.current?.(true, "manual")
            );
            setShowConfirm(true);
          }}
          onInitiateSubmit={handleInitiateManualSubmit}
          onConfirmSubmit={() => {
            anticheat.submissionReasonRef.current = "manual";
            void handleSubmitExam(false, "manual");
          }}
          showPreSubmitModal={showPreSubmitModal}
          setShowPreSubmitModal={setShowPreSubmitModal}
          challengeId={challengeId || undefined}
          currentUserId={user?.id}
          securitySettings={securitySettings}
          totalViolations={anticheat.totalViolations}
          cheatingAttempts={anticheat.cheatingAttempts}
          fullscreenRetryCount={anticheat.fullscreenRetryCount}
          violationType={anticheat.violationType}
          showFullscreenWarning={anticheat.showFullscreenWarning}
          setShowFullscreenWarning={anticheat.setShowFullscreenWarning}
          showCheatingWarning={anticheat.showCheatingWarning}
          setShowCheatingWarning={anticheat.setShowCheatingWarning}
          cheatingWarningMessage={anticheat.cheatingWarningMessage}
          countdownSeconds={anticheat.countdownSeconds}
          onEnterFullscreen={anticheat.enterFullscreen}
          showAlert={showAlert}
          setShowAlert={setShowAlert}
          alertTitle={alertTitle}
          alertMessage={alertMessage}
          alertType={alertType}
          showConfirm={showConfirm}
          setShowConfirm={setShowConfirm}
          confirmTitle={confirmTitle}
          confirmMessage={confirmMessage}
          onConfirmAction={() => {
            const cb = confirmCallback;
            setShowConfirm(false);
            setConfirmCallback(null);
            cb?.();
          }}
          onCancelConfirm={() => {
            setShowConfirm(false);
            setConfirmCallback(null);
          }}
        />
      </>
    );
  }

  // Default: Native Navo OS Exam Center Launcher (No Pre-Exam Instructions)
  return (
    <OSExamLauncher
      standaloneEnabled={standaloneEnabled}
      groupExamEnabled={groupExamEnabled}
      hasExamHistory={hasExamHistory}
      categories={categories}
      selectedCategoryId={categoryId}
      onSelectCategory={setCategoryId}
      loadingCategories={loadingCategories}
      loadingExam={loadingExam}
      selectedExamLanguage={selectedExamLanguage}
      onStartExam={(catId, lang) => {
        void startExam(catId, lang);
      }}
      onOpenGroupChallenge={() => setExamMode("group")}
      navigate={navigate}
    />
  );
}
