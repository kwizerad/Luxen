"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Lock,
  LogIn,
  UserPlus,
  BookmarkCheck,
  Home,
  ArrowRight,
  X,
  Clock,
} from "lucide-react";
import { preloadImages } from "@/components/smart-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { OSWindow } from "@/components/os/os-window";
import { OSExamLauncher } from "@/components/os-exam/os-exam-launcher";
import {
  OSExamWorkspace,
  type TakeExamQuestion,
  type TakeExamResponse,
  type UserAnswer,
} from "@/components/os-exam/os-exam-workspace";
import { ExamReview } from "@/components/exam-review";
import { ExamStartVerificationCard } from "@/components/exam-start-verification-card";
import {
  PostExamLanguageGate,
  normalizeExamLanguage,
  type ExamLangOption,
} from "@/components/exam/post-exam-language-gate";
import {
  useExamAnticheat,
  type SubmissionReason,
} from "@/hooks/use-exam-anticheat";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { secureApiPost } from "@/lib/e2e-crypto";
import {
  DEFAULT_SECURITY_SETTINGS,
  getSecuritySettings,
  type SecuritySettings,
} from "@/lib/security-config";
import {
  getGuestDeviceId,
  savePendingGuestExam,
  claimPendingGuestExamIfAny,
  type PendingGuestExamPayload,
} from "@/lib/guest-exam-client";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import type {
  ExamAttempt,
  ExamCategory,
  ExamQuestion,
} from "@/lib/database.types";
import { toast } from "sonner";

interface GuestQuotaState {
  usedCount: number;
  remainingCount: number;
  maxAllowed: number;
  exhausted: boolean;
  resetValue?: number;
  resetUnit?: "hours" | "days";
  resetAt?: string;
  resetInSeconds?: number;
}

function formatResetCountdown(totalSeconds: number, isFr = false): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(safe / 86400);
  const h = Math.floor((safe % 86400) / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const hms = `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (d > 0) {
    return `${d}${isFr ? "j" : "d"} ${hms}`;
  }
  return hms;
}

export function GuestExamClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [standaloneEnabled, setStandaloneEnabled] = useState(true);
  const [quota, setQuota] = useState<GuestQuotaState>({
    usedCount: 0,
    remainingCount: 3,
    maxAllowed: 3,
    exhausted: false,
  });
  const [resetCountdownSec, setResetCountdownSec] = useState<number | null>(null);
  const [categories, setCategories] = useState<ExamCategory[]>([
    {
      id: EXTERNAL_EXAM_CATEGORY_ID,
      name: isFr
        ? "Examen Blanc Officiel du Code de la Route"
        : isRw
        ? "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda"
        : "Rwanda Traffic Rules Mock Exam",
      description: isFr
        ? "Examen officiel d'entraînement aux règles de circulation et panneaux"
        : isRw
        ? "Ikizamini cy'imyitozo cy'amategeko y'umuhanda n'ibyapa"
        : "Official Traffic Rules & Road Signs Mock Exam",
      created_by: "system",
      is_published: true,
      duration_minutes: 20,
      question_count: 20,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    EXTERNAL_EXAM_CATEGORY_ID
  );
  const [selectedExamLanguage, setSelectedExamLanguage] =
    useState("Kinyarwanda");
  const [pendingStartExam, setPendingStartExam] = useState<{
    categoryId: string;
    language: string;
  } | null>(null);

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
  const [postExamLangConfirmed, setPostExamLangConfirmed] = useState(false);
  const [translatingPostExamLang, setTranslatingPostExamLang] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);
  const [pendingPayload, setPendingPayload] =
    useState<PendingGuestExamPayload | null>(null);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);
  const [guestGroupSelectedLang, setGuestGroupSelectedLang] = useState<string>("Kinyarwanda");
  const [showGuestGroupDialog, setShowGuestGroupDialog] = useState(false);

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

  // Redirect already authenticated students cleanly to dashboard exam view
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void claimPendingGuestExamIfAny().finally(() => {
      if (!cancelled) {
        router.replace("/dashboard#exam");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  // Load guest quota status, admin toggles & security settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    const loadStatus = async () => {
      try {
        const deviceId = getGuestDeviceId();
        const [statusRes, secSettings] = await Promise.all([
          fetch(
            `/api/guest-exam?deviceId=${encodeURIComponent(deviceId)}&language=${encodeURIComponent(language)}`,
            {
              cache: "no-store",
            }
          ).then((r) => (r.ok ? r.json() : null)),
          getSecuritySettings("official").catch(() => DEFAULT_SECURITY_SETTINGS),
        ]);

        if (!mounted) return;
        setSecuritySettings(secSettings);
        if (statusRes) {
          setStandaloneEnabled(statusRes.standaloneEnabled !== false);
          if (statusRes.quota) {
            setQuota(statusRes.quota);
          }
          if (statusRes.examMeta?.title) {
            setCategories((prev) =>
              prev.map((c) => ({
                ...c,
                name: statusRes.examMeta.title || c.name,
                duration_minutes:
                  statusRes.examMeta.durationMinutes || c.duration_minutes,
                question_count:
                  statusRes.examMeta.questionCount || c.question_count,
              }))
            );
          }
        }
      } catch (err) {
        console.error("[GuestExam] Failed loading status:", err);
      } finally {
        if (mounted) setCheckingStatus(false);
      }
    };

    void loadStatus();
    return () => {
      mounted = false;
    };
  }, [language]);

  const anticheat = useExamAnticheat({
    isActive: Boolean(exam && !showResults),
    showResults,
    securitySettings,
    onAutoSubmit: (reason) => {
      void handleSubmitExamRef.current?.(true, reason);
    },
  });

  // Keep sessionStorage exam-active in sync so OSWindow hides top controls cleanly
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

  const activeQuestion = useMemo<TakeExamQuestion | null>(() => {
    if (!exam?.questions?.length) return null;
    const safeIdx = Math.min(Math.max(0, currentIndex), exam.questions.length - 1);
    return exam.questions[safeIdx] ?? null;
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

  // Keyboard navigation during active exam
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

  // Quota reset countdown ticker
  useEffect(() => {
    if (quota.usedCount <= 0) {
      setResetCountdownSec(null);
      return;
    }
    const computeSeconds = () => {
      if (quota.resetAt) {
        return Math.max(0, Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000));
      }
      if (typeof quota.resetInSeconds === "number") {
        return Math.max(0, quota.resetInSeconds);
      }
      return null;
    };

    setResetCountdownSec(computeSeconds());
    const id = setInterval(() => {
      if (quota.resetAt) {
        const next = Math.max(0, Math.ceil((new Date(quota.resetAt).getTime() - Date.now()) / 1000));
        setResetCountdownSec(next);
      } else {
        setResetCountdownSec((prev) => (prev === null ? null : Math.max(0, prev - 1)));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [quota.usedCount, quota.resetAt, quota.resetInSeconds]);

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

  const startGuestExam = async (catId?: string, examLang?: string) => {
    if (quota.exhausted) {
      return;
    }

    const activeLang = normalizeExamLanguage(
      examLang || selectedExamLanguage || language || "Kinyarwanda"
    );
    setSelectedExamLanguage(activeLang);

    if (
      securitySettings.violationMeasuresEnabled &&
      securitySettings.fullscreenEnabled
    ) {
      await anticheat.enterFullscreen();
    }

    setLoadingExam(true);
    try {
      const deviceId = getGuestDeviceId();
      const { ok, status, data } = await secureApiPost("/api/guest-exam", {
        action: "start",
        categoryId: catId || selectedCategoryId || EXTERNAL_EXAM_CATEGORY_ID,
        language: activeLang,
        deviceId,
      });

      if (status === 429 || data?.error === "LIMIT_REACHED") {
        if (data?.quota) setQuota(data.quota);
        else
          setQuota((prev) => ({
            usedCount: prev.maxAllowed,
            remainingCount: 0,
            maxAllowed: prev.maxAllowed,
            exhausted: true,
            resetValue: prev.resetValue,
            resetUnit: prev.resetUnit,
          }));
        setExam(null);
        toast.error(
          data?.message ||
            (isRw
              ? "Wasoje ibizamini by'ubuntu wemerewe! Iyandikishe ku buntu kugira ngo ubike amateka yawe kandi ukomeze kwimenyereza."
              : isFr
              ? "Vous avez utilisé vos examens gratuits autorisés ! Inscrivez-vous gratuitement pour continuer."
              : "You have used your allowed free practice exams! Sign up for free to save your results and continue.")
        );
        return;
      }

      if (!ok || !data?.questions || data.questions.length === 0) {
        toast.error(data?.message || data?.error || t("failedToStartExam"));
        return;
      }

      if (data.quota) {
        setQuota(data.quota);
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
      setPostExamLangConfirmed(false);
      setTranslatingPostExamLang(null);
      showResultsRef.current = false;
      setExamResult(null);
      setPendingPayload(null);
      setSavePromptDismissed(false);
      submittingExamRef.current = false;
      setShowPreSubmitModal(false);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("exam-active", "true");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("failedToStartExam"));
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
          time_spent_seconds: userAnswer
            ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000)
            : 0,
        };
      });

      const categoryName =
        categories.find((c) => c.id === exam.categoryId)?.name ||
        (isRw
          ? "Ikizamini cy'Imyitozo cy'Amategeko y'Umuhanda"
          : isFr
          ? "Examen Blanc Officiel du Code de la Route"
          : "Official Traffic Rules & Road Signs Mock Exam");
      const status: "completed" | "abandoned" =
        answeredCount > 0 ? "completed" : "abandoned";
      const violationSummary =
        anticheat.violationMessagesRef.current.length > 0
          ? anticheat.violationMessagesRef.current.join("; ")
          : undefined;

      const deviceId = getGuestDeviceId();
      const attemptPayload = {
        category_id: exam.categoryId,
        category_name: categoryName,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status,
        submission_reason: anticheat.submissionReasonRef.current,
        violation_summary: violationSummary,
      };

      const { ok, data } = await secureApiPost("/api/guest-exam", {
        action: "submit",
        language: selectedExamLanguage || language,
        deviceId,
        attemptData: attemptPayload,
      });

      if (!ok || !data?.attempt) {
        throw new Error(data?.error || "Failed to grade exam");
      }

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

      if (data.quota) {
        setQuota(data.quota);
      }

      setPendingPayload({
        ...attemptPayload,
        score_percentage: attempt.score_percentage,
        savedAt: Date.now(),
      });
      setExamResult(attempt);
      setPostExamLangConfirmed(false);
      setTranslatingPostExamLang(null);
      setShowResults(true);
      showResultsRef.current = true;
      setSavePromptDismissed(false);
      submitSuccess = true;

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("exam-active");
        window.dispatchEvent(new CustomEvent("exam-state-change"));
      }
      await anticheat.exitFullscreenSafe();
      toast.success(t("examSubmittedSuccess"));
    } catch (error: any) {
      toast.error(`${t("failedToSubmitExam")}: ${error?.message || error}`);
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
    setPostExamLangConfirmed(false);
    setTranslatingPostExamLang(null);
    showResultsRef.current = false;
    setExamResult(null);
    setPendingPayload(null);
    setPendingStartExam(null);
    setSavePromptDismissed(false);
    submittingExamRef.current = false;
    setShowPreSubmitModal(false);
    setShowAlert(false);
    setShowConfirm(false);
    setConfirmCallback(null);
    anticheat.resetSecurity();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("exam-active");
      window.dispatchEvent(new CustomEvent("exam-state-change"));
    }
  };

  const handleSaveAndRedirect = (target: "login" | "register") => {
    if (pendingPayload) {
      savePendingGuestExam(pendingPayload);
    }
    router.push(`/?auth=${target}`);
  };

  const handleRetake = () => {
    if (quota.exhausted) {
      reset();
      return;
    }
    const prevCat = selectedCategoryId;
    reset();
    void startGuestExam(prevCat, selectedExamLanguage);
  };

  const resetVal = quota.resetValue ?? 1;
  const resetUnit = quota.resetUnit ?? "days";
  const windowLabelEn =
    resetUnit === "hours"
      ? `${resetVal} hour${resetVal === 1 ? "" : "s"}`
      : resetVal === 1
      ? "today"
      : `${resetVal} days`;
  const windowLabelFr =
    resetUnit === "hours"
      ? `${resetVal} heure${resetVal === 1 ? "" : "s"}`
      : resetVal === 1
      ? "aujourd'hui"
      : `${resetVal} jours`;
  const windowLabelRw =
    resetUnit === "hours"
      ? `mu masaha ${resetVal}`
      : resetVal === 1
      ? "uyu munsi"
      : `mu minsi ${resetVal}`;

  const resetTimerLabel =
    resetCountdownSec !== null && resetCountdownSec > 0 && quota.maxAllowed > 0
      ? isRw
        ? `Amahirwe mashya azafunguka nyuma ya ${formatResetCountdown(resetCountdownSec, false)}`
        : isFr
        ? `Réinitialisation dans ${formatResetCountdown(resetCountdownSec, true)}`
        : `Resets in ${formatResetCountdown(resetCountdownSec, false)}`
      : null;

  const footerQuotaText = isRw
    ? `Ibizamini bisigaye ${windowLabelRw}: ${quota.remainingCount} / ${quota.maxAllowed}${resetTimerLabel ? ` · ${resetTimerLabel}` : ""}`
    : isFr
    ? `Examens gratuits restants (${windowLabelFr}) : ${quota.remainingCount} / ${quota.maxAllowed}${resetTimerLabel ? ` · ${resetTimerLabel}` : ""}`
    : `Free exams remaining (${windowLabelEn}): ${quota.remainingCount} / ${quota.maxAllowed}${resetTimerLabel ? ` · ${resetTimerLabel}` : ""}`;

  const toolbarRight = (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground hidden xs:inline whitespace-nowrap">
        {quota.remainingCount}/{quota.maxAllowed}
      </span>
      <button
        type="button"
        onClick={() => router.push("/?auth=login")}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer whitespace-nowrap"
      >
        <LogIn className="w-3 h-3 shrink-0" />
        <span>{isRw ? "Injira" : isFr ? "Connexion" : "Sign In"}</span>
      </button>
    </div>
  );

  const handlePostExamLanguageSwitch = async (targetLang: ExamLangOption) => {
    const normalizedCurrent = normalizeExamLanguage(
      selectedExamLanguage || language
    );
    if (targetLang === normalizedCurrent) {
      setPostExamLangConfirmed(true);
      return;
    }

    setTranslatingPostExamLang(targetLang);
    try {
      if (exam?.questions?.length) {
        const deviceId = getGuestDeviceId();
        const { ok, data } = await secureApiPost("/api/guest-exam", {
          action: "translate_questions",
          deviceId,
          questions: exam.questions,
          language: targetLang,
          sourceLanguage: normalizedCurrent,
        });
        if (ok && Array.isArray(data?.questions)) {
          const translatedById = new Map<string, any>();
          for (const tq of data.questions) {
            if (tq?.id) translatedById.set(String(tq.id), tq);
          }
          setExam((prev) =>
            prev
              ? {
                  ...prev,
                  questions: prev.questions.map((q, idx) => {
                    const matched =
                      translatedById.get(String(q.id)) || data.questions[idx];
                    if (!matched) return q;
                    return {
                      ...q,
                      question: matched.question || q.question,
                      option_a: matched.option_a || q.option_a,
                      option_b: matched.option_b || q.option_b,
                      option_c: matched.option_c || q.option_c,
                      option_d: matched.option_d || q.option_d,
                      explanation: matched.explanation ?? q.explanation,
                    };
                  }),
                }
              : prev
          );
        }
      }
      setSelectedExamLanguage(targetLang);
      setPostExamLangConfirmed(true);
    } catch (err) {
      console.error("[GuestExam] Post-exam translation error:", err);
      setSelectedExamLanguage(targetLang);
      setPostExamLangConfirmed(true);
    } finally {
      setTranslatingPostExamLang(null);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-center bg-slate-100/80 dark:bg-zinc-950 px-2 sm:px-4 py-2 sm:py-4 overflow-x-hidden">
      {/* Navo OS Subtle Wallpaper Backdrop */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />

      <OSWindow
        title={t("examCenter") || "Exam Center"}
        subtitle="Navo OS"
        icon={FileText}
        onClose={() => router.push("/")}
        onMinimize={() => router.push("/")}
        toolbarRight={toolbarRight}
      >
        {checkingStatus ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : showResults && examResult ? (
          !postExamLangConfirmed ? (
            <PostExamLanguageGate
              currentLanguage={selectedExamLanguage || language}
              translatingLanguage={translatingPostExamLang}
              onContinueCurrent={() => {
                const norm = normalizeExamLanguage(selectedExamLanguage || language);
                setSelectedExamLanguage(norm);
                setPostExamLangConfirmed(true);
              }}
              onSelectLanguage={(targetLang) => {
                void handlePostExamLanguageSwitch(targetLang);
              }}
            />
          ) : (
          <div className="flex-1 flex flex-col">
            {/* Post-Exam Save History Prompt Banner (Guest mode does not save automatically, only shown while quota is not exhausted) */}
            {!savePromptDismissed && !quota.exhausted && (
              <div className="mx-auto w-full max-w-4xl px-3.5 sm:px-6 pt-4">
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/[0.07] dark:bg-emerald-500/10 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <BookmarkCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-foreground">
                        {isRw
                          ? "Urashaka kubika amateka n'amanota y'iki kizamini?"
                          : isFr
                          ? "Voulez-vous enregistrer l'historique de cet examen ?"
                          : "Do you want to save your exam history?"}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {isRw
                          ? "Kuko utarinjira muri konti, aya manota ntabwo yabitswe. Niba ushaka kuyabika, injira cyangwa wiyandikishe."
                          : isFr
                          ? "Cet examen n'est pas encore enregistré car vous n'êtes pas connecté. Connectez-vous ou inscrivez-vous pour le sauvegarder."
                          : "Your results are not saved while unauthenticated. Log in or register now to save this exam to your history."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleSaveAndRedirect("register")}
                      className="rounded-xl gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>
                        {isRw
                          ? "Yego, Iyandikishe"
                          : isFr
                          ? "Oui, S'inscrire"
                          : "Yes, Sign Up"}
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveAndRedirect("login")}
                      className="rounded-xl gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>
                        {isRw
                          ? "Injira"
                          : isFr
                          ? "Se connecter"
                          : "Log In"}
                      </span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSavePromptDismissed(true)}
                      aria-label="Dismiss"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>
                        {isRw ? "Oya" : isFr ? "Non" : "No, thanks"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ExamReview
              examResult={examResult}
              questions={(exam?.questions || []) as ExamQuestion[]}
              onReset={reset}
              onRetake={handleRetake}
              passingPercentage={exam?.settings?.passing_percentage}
              canRetake={!quota.exhausted}
              quotaExhausted={quota.exhausted}
              quotaMaxAllowed={quota.maxAllowed}
              quotaResetValue={quota.resetValue}
              quotaResetUnit={quota.resetUnit}
              quotaResetAt={quota.resetAt}
              quotaResetInSeconds={quota.resetInSeconds}
              onSignUp={() => handleSaveAndRedirect("register")}
              onSignIn={() => handleSaveAndRedirect("login")}
            />
          </div>
          )
        ) : loadingExam ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] gap-3 p-6">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">
              {isRw
                ? "Tegereza gato..."
                : isFr
                ? "Préparation de l'examen..."
                : t("starting") || "Loading exam..."}
            </p>
          </div>
        ) : exam ? (
          <OSExamWorkspace
            exam={exam}
            categoryTitle={
              categories.find((c) => c.id === exam.categoryId)?.name ||
              (isRw
                ? "Ikizamini cy'Imyitozo"
                : isFr
                ? "Examen Blanc"
                : "Mock Practice Exam")
            }
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
            onInitiateSubmit={() => {
              const count = Object.keys(userAnswers).length;
              if (count === 0) {
                setAlertTitle(t("noAnswersSelected"));
                setAlertMessage(t("noAnswersSelectedMessage"));
                setAlertType("warning");
                setShowAlert(true);
                return;
              }
              setShowPreSubmitModal(true);
            }}
            onConfirmSubmit={() => {
              anticheat.submissionReasonRef.current = "manual";
              void handleSubmitExam(false, "manual");
            }}
            showPreSubmitModal={showPreSubmitModal}
            setShowPreSubmitModal={setShowPreSubmitModal}
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
        ) : quota.exhausted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
            <div className="max-w-md w-full space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {quota.maxAllowed === 0
                    ? isRw
                      ? "Injira cyangwa wiyandikishe gukora ikizamini"
                      : isFr
                      ? "Connectez-vous pour passer l'examen"
                      : "Sign Up or Log In to Take the Exam"
                    : isRw
                    ? `Wasoje ibizamini ${quota.maxAllowed} wemerewe ${windowLabelRw}`
                    : isFr
                    ? `Vos ${quota.maxAllowed} examen(s) gratuit(s) sont terminés`
                    : `You've Used Your ${quota.maxAllowed} Free Exam${quota.maxAllowed === 1 ? "" : "s"}`}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {quota.maxAllowed === 0
                    ? isRw
                      ? "Ubu usabwa kwinjira cyangwa kwiyandikisha ku buntu kugira ngo ukore ikizamini kandi ubike amateka yawe."
                      : isFr
                      ? "Veuillez créer un compte gratuit ou vous connecter pour accéder aux examens d'entraînement et enregistrer vos progrès."
                      : "Please create a free account or sign in to take practice exams and save your scores."
                    : isRw
                    ? `Byiza cyane! Wasoje amahirwe ${quota.maxAllowed} yo kwimenyereza mu bizamini utari winjira muri konti (${windowLabelRw}). Ushobora gutegereza igihe gishya cyangwa ukiyandikisha ku buntu kugira ngo ubike amateka yawe kandi ukomeze kwiga nta nkomyi.`
                    : isFr
                    ? `Bravo pour votre entraînement ! Sans compte, vous disposez de ${quota.maxAllowed} examen(s) gratuit(s) par ${windowLabelFr}. Revenez après la réinitialisation ou créez un compte gratuit pour enregistrer vos résultats et continuer librement.`
                    : `Great job practicing! Visitors enjoy ${quota.maxAllowed} free practice exam${quota.maxAllowed === 1 ? "" : "s"} every ${resetUnit === "days" && resetVal === 1 ? "day" : windowLabelEn}. Wait for the reset timer below or create a free account now to save your results and keep practicing without limits.`}
                </p>

                {resetCountdownSec !== null && resetCountdownSec > 0 && quota.maxAllowed > 0 && (
                  <div className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-mono font-semibold tabular-nums mx-auto">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {isRw
                        ? `Ibizamini by'ubuntu bizagaruka mu gihe cya: ${formatResetCountdown(resetCountdownSec, false)}`
                        : isFr
                        ? `Nouveaux examens gratuits dans : ${formatResetCountdown(resetCountdownSec, true)}`
                        : `Next free exams unlock in: ${formatResetCountdown(resetCountdownSec, false)}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  onClick={() => router.push("/?auth=register")}
                  className="flex-1 rounded-xl gap-2 text-xs sm:text-sm font-semibold h-10 whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>
                    {isRw
                      ? "Iyandikishe ku buntu"
                      : isFr
                      ? "S'inscrire gratuitement"
                      : "Sign Up for Free"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/?auth=login")}
                  className="flex-1 rounded-xl gap-2 text-xs sm:text-sm font-medium h-10 whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>
                    {isRw
                      ? "Injira muri konti"
                      : isFr
                      ? "Se connecter"
                      : "Log In"}
                  </span>
                </Button>
              </div>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer pt-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>
                  {isRw
                    ? "Subira ahabanza"
                    : isFr
                    ? "Retour à l'accueil"
                    : "Back to Home"}
                </span>
              </button>
            </div>
          </div>
        ) : pendingStartExam ? (
          <div className="flex-1 flex flex-col justify-center py-4">
            <ExamStartVerificationCard
              examTitle={
                categories.find((c) => c.id === pendingStartExam.categoryId)
                  ?.name ||
                categories[0]?.name ||
                "Official Mock Exam"
              }
              durationMinutes={
                categories.find((c) => c.id === pendingStartExam.categoryId)
                  ?.duration_minutes ?? 20
              }
              totalQuestions={
                categories.find((c) => c.id === pendingStartExam.categoryId)
                  ?.question_count ?? 20
              }
              examLanguage={pendingStartExam.language}
              loading={loadingExam}
              onConfirmStart={() => {
                const next = pendingStartExam;
                setPendingStartExam(null);
                void startGuestExam(next.categoryId, next.language);
              }}
              onCancel={() => setPendingStartExam(null)}
            />
          </div>
        ) : (
          <OSExamLauncher
            standaloneEnabled={standaloneEnabled}
            groupExamEnabled={true}
            hasExamHistory={false}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            loadingCategories={false}
            loadingExam={loadingExam}
            selectedExamLanguage={selectedExamLanguage}
            onStartExam={(catId, lang) => {
              const normalizedLang = normalizeExamLanguage(lang);
              setSelectedCategoryId(catId);
              setSelectedExamLanguage(normalizedLang);
              setPendingStartExam({ categoryId: catId, language: normalizedLang });
            }}
            onOpenGroupChallenge={(_catId, lang) => {
              const norm = normalizeExamLanguage(lang || selectedExamLanguage);
              setGuestGroupSelectedLang(norm);
              setShowGuestGroupDialog(true);
            }}
            navigate={(view) => {
              if (view === "home") router.push("/");
              else router.push("/?auth=login");
            }}
            footerNote={footerQuotaText}
          />
        )}

        {/* Guest Group Exam Sign-In Prompt Modal */}
        <Dialog open={showGuestGroupDialog} onOpenChange={setShowGuestGroupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <LogIn className="h-5 w-5 text-primary" />
                <span>
                  {isRw
                    ? "Kwinjira Birakenewe ku Kizamini cy'Itsinda"
                    : isFr
                    ? "Connexion Requise pour l'Examen de Groupe"
                    : "Sign In Required for Group Exam"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm pt-2 leading-relaxed text-muted-foreground">
                {isRw
                  ? `Kugira ngo ukore ikizamini cy'itsinda n'abandi banyeshuri mu gihe nyacyo mu rurimi rw'${guestGroupSelectedLang}, banza winjire cyangwa ufungure konti nshya ku buntu.`
                  : isFr
                  ? `Pour participer à un défi multijoueur en direct en ${guestGroupSelectedLang} avec vos camarades, veuillez vous connecter ou créer un compte gratuit.`
                  : `To participate in real-time group exams with your classmates in ${guestGroupSelectedLang}, please sign in or register for a free account.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuestGroupDialog(false)}
                className="w-full sm:w-auto text-xs"
              >
                {isRw ? "Reka" : isFr ? "Annuler" : "Cancel"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      "intended-dashboard-view",
                      `exam?mode=group&language=${encodeURIComponent(guestGroupSelectedLang)}`
                    );
                  } catch {}
                  router.push("/?auth=login");
                }}
                className="w-full sm:w-auto text-xs font-semibold"
              >
                <LogIn className="h-4 w-4 mr-1.5" />
                <span>{isRw ? "Injira / Iyandikishe" : isFr ? "Se connecter" : "Sign In / Register"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </OSWindow>
    </div>
  );
}
