"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SmartImage, preloadImages } from "@/components/smart-image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { useBrandingConfig } from "@/lib/branding-config";
import { getExamCategories, getExamForTaking, createExamAttempt } from "@/lib/supabase/queries";
import {
  isGroupExamEnabled,
  isStandaloneExamEnabled,
  getCachedGroupExamEnabled,
} from "@/lib/feature-flags";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getSecuritySettings, DEFAULT_SECURITY_SETTINGS, type SecuritySettings } from "@/lib/security-config";
import { toast } from "sonner";
import { ExamCategorySkeleton, ExamChoiceSkeleton } from "@/components/skeletons";
import { useLanguage } from "@/lib/language-context";
import { CheckCircle, XCircle, Trophy, ArrowRight, Home, AlertCircle, AlertTriangle, BookOpen, Shield, ShieldAlert, HelpCircle, FileText, Play, LogOut, Monitor, Clock, Hash, ArrowLeft, History } from "lucide-react";
import { ExamReview } from "@/components/exam-review";
import { ExamChoiceScreen } from "@/components/exam-choice-screen";
import { GroupExamCreation } from "@/components/group-exam-creation";
import { GroupExamLobby } from "@/components/group-exam-lobby";
import { GroupExamResults } from "@/components/group-exam-results";
import { GroupExamLiveHUD } from "@/components/group-exam-live-hud";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import type { ExamCategory, ExamQuestion, ExamAttempt, ExamAnswer } from "@/lib/database.types";

// Before submission, correct_answer/explanation are stripped server-side so
// the answer key is never sent to the client ahead of grading.
type TakeExamQuestion = Omit<ExamQuestion, "correct_answer" | "explanation"> &
  Partial<Pick<ExamQuestion, "correct_answer" | "explanation">>;

type TakeResponse = {
  categoryId: string;
  settings: {
    question_count: number;
    duration_minutes: number;
    sorting_mode: string;
    passing_percentage?: number;
    available_from: string | null;
    available_to: string | null;
  };
  questions: TakeExamQuestion[];
  serverTime: string;
};

type UserAnswer = {
  questionId: string;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  timeStarted: number;
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

export default function TakeExamPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [challengeId, setChallengeId] = useState<string>("");
  const [pendingInviteeIds, setPendingInviteeIds] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const cachedGroup = getCachedGroupExamEnabled();
  const [accessChecked, setAccessChecked] = useState(false);
  const [groupExamEnabled, setGroupExamEnabled] = useState(cachedGroup !== null ? cachedGroup : true);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;

    // Parse challenge_id and category_id from URL params (group exam challenge)
    const urlParams = new URLSearchParams(window.location.search);
    const urlChallengeId = urlParams.get("challenge_id");
    const urlCategoryId = urlParams.get("category_id");
    if (urlChallengeId) {
      setChallengeId(urlChallengeId);
      setExamMode("lobby");
      setShowInstructions(false);
      setInstructionsAccepted(true);
    }
    if (urlCategoryId) {
      setCategoryId(urlCategoryId);
    }

    Promise.all([
      isStandaloneExamEnabled(),
      isGroupExamEnabled(),
    ]).then(([standaloneEnabled, groupEnabled]) => {
      if (!standaloneEnabled) {
        router.replace("/dashboard#course");
        return;
      }
      setGroupExamEnabled(groupEnabled);
      if (!groupEnabled && !urlChallengeId) {
        setExamMode("individual");
        setShowInstructions(false);
      }
      setAccessChecked(true);
    }).catch(() => {
      setAccessChecked(true);
    });
  }, [router, authLoading]);

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

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const checkExamHistory = async () => {
      const supabase = createClient();
      const { count } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setHasExamHistory((count ?? 0) > 0);
    };
    void checkExamHistory();
  }, [user]);

  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [hasExamHistory, setHasExamHistory] = useState(false);
  const [exam, setExam] = useState<TakeResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);
  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [isSubmittingOnExit, setIsSubmittingOnExit] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [cheatingWarningMessage, setCheatingWarningMessage] = useState("");
  const [violationType, setViolationType] = useState<"fullscreen" | "tabswitch" | "copy" | "paste" | "backnavigation" | "ai_detection" | "other">("other");
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Custom alert/confirm dialog states
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"info" | "warning" | "error" | "success">("info");
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [showQuestionPalette, setShowQuestionPalette] = useState(true);
  const [examMode, setExamMode] = useState<"choice" | "individual" | "group" | "lobby">("choice");

  const cheatingAttemptsRef = useRef(cheatingAttempts);
  const fullscreenRetryCountRef = useRef(fullscreenRetryCount);
  const violationTypeRef = useRef(violationType);
  const isSubmittingOnExitRef = useRef(isSubmittingOnExit);
  const submittingExamRef = useRef(false);
  const showResultsRef = useRef(false);
  const handleSubmitExamRef = useRef<((isAutoSubmit?: boolean) => Promise<void>) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const lastViolationAtRef = useRef(0);
  const focusViolationSentRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastViewportWidthRef = useRef(0);
  const baselineViewportWidthRef = useRef(0);
  const [currentViewportWidth, setCurrentViewportWidth] = useState(0);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submissionReasonRef = useRef<'manual' | 'page_closed' | 'cheating_violation' | 'time_expired'>('manual');
  const violationMessagesRef = useRef<string[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (typeof window === "undefined" || !accessChecked) return;
    
    const load = async () => {
      setLoadingCategories(true);
      try {
        const data = await getExamCategories();
        const cats = data.categories || [];
        setCategories(cats);
        if (cats.length === 0) {
          toast.error(t("noExamsAvailable") || "No exams or module tests are currently available.");
          router.replace("/dashboard#course");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`${t("failedToLoadCategories")}: ${message}`);
        router.replace("/dashboard#course");
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
    
    // Load security settings
    const loadSecuritySettings = async () => {
      try {
        const settings = await getSecuritySettings();
        setSecuritySettings(settings);
      } catch (error) {
        console.error("Failed to load security settings:", error);
      }
    };
    loadSecuritySettings();

    // Clean up exam-active flag when component unmounts
    return () => {
      sessionStorage.removeItem('exam-active');
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Exam component unmounted - exam-active removed');
    };
  }, [accessChecked, t]);

  // Auto-select the single category when there's only one
  useEffect(() => {
    if (!loadingCategories && categories.length === 1 && !categoryId && instructionsAccepted && !exam) {
      setCategoryId(categories[0].id);
    }
  }, [loadingCategories, categories, categoryId, instructionsAccepted, exam]);
  
  useEffect(() => {
    const getCountMessage = (base: string, count: number) =>
      count === 1
        ? t(`${base}Violation1` as any)
        : count < securitySettings.maxViolations
        ? t(`${base}Violation2` as any)
        : t(`${base}ViolationFinal` as any);

    const getCountToast = (base: string, count: number) =>
      count === 1
        ? t(`${base}Warning1` as any)
        : count < securitySettings.maxViolations
        ? t(`${base}Warning2` as any)
        : t(`${base}WarningFinal` as any);

    const recordViolation = (message: string, type: "fullscreen" | "tabswitch" | "copy" | "paste" | "backnavigation" | "ai_detection" | "other" = "other", toastMessage?: string) => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled || isSubmittingOnExitRef.current) return;

      const now = Date.now();
      if (now - lastViolationAtRef.current < 800) return;
      lastViolationAtRef.current = now;

      const newCount = cheatingAttemptsRef.current + 1;
      cheatingAttemptsRef.current = newCount;
      setCheatingAttempts(newCount);
      setViolationType(type);
      violationTypeRef.current = type;
      setCheatingWarningMessage(message);
      setShowCheatingWarning(true);

      // Track violation messages for summary
      if (toastMessage && !violationMessagesRef.current.includes(toastMessage)) {
        violationMessagesRef.current.push(toastMessage);
      }

      if (toastMessage && newCount < securitySettings.maxViolations) {
        toast.error(toastMessage);
      }

      if (newCount >= securitySettings.maxViolations) {
        submissionReasonRef.current = 'cheating_violation';
        // Start 15-second countdown then auto-submit
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
        setCountdownSeconds(15);
        countdownRef.current = setInterval(() => {
          setCountdownSeconds((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        toast.error(t("examAutoSubmitted"));
      }
    };

    const handleFullscreenChange = () => {
      // If user re-enters fullscreen, auto-close all warnings and continue exam
      if (exam && document.fullscreenElement && !showResults) {
        setShowFullscreenWarning(false);
        if (violationTypeRef.current === "fullscreen") {
          setShowCheatingWarning(false);
        }
        return;
      }
      // If user tries to exit full screen during exam, show warning and prevent
      if (exam && !document.fullscreenElement && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.fullscreenEnabled) {
        const newCount = fullscreenRetryCountRef.current + 1;
        fullscreenRetryCountRef.current = newCount;
        setFullscreenRetryCount(newCount);

        // Show cheating warning modal
        setViolationType("fullscreen");
        violationTypeRef.current = "fullscreen";
        setCheatingWarningMessage(
          newCount === 1
            ? t("fullscreenViolation1")
            : newCount < securitySettings.maxViolations
            ? t("fullscreenViolation2")
            : t("fullscreenViolationFinal")
        );
        setShowCheatingWarning(true);

        // Auto-submit exam after max violation attempts
        if (newCount >= securitySettings.maxViolations) {
          submissionReasonRef.current = 'cheating_violation';
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
          setCountdownSeconds(15);
          countdownRef.current = setInterval(() => {
            setCountdownSeconds((prev) => {
              if (prev === null) return null;
              if (prev <= 1) {
                if (countdownRef.current) clearInterval(countdownRef.current);
                countdownRef.current = null;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          toast.error(t("examAutoSubmitted"));
        } else {
          // Show fullscreen warning too
          setShowFullscreenWarning(true);
        }
      }
    };

    const isInsideDialog = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('[role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"]');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled) return;

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Escape / F11 may leave fullscreen
      if (e.key === 'Escape' || e.key === 'F11') {
        if (securitySettings.fullscreenEnabled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      // Allow bare modifier keys (don't count as violations on their own)
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      // Allow ONLY arrow keys for question navigation (no modifiers)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && !ctrlOrCmd && !e.altKey && !e.shiftKey) return;

      // Allow Tab/Enter/Space/Escape only while inside a dialog
      if ((e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && isInsideDialog(e.target)) {
        return;
      }

      // Tab / window switching shortcuts
      if (securitySettings.tabSwitchEnabled) {
        if (
          (ctrlOrCmd && (e.key === 't' || e.key === 'T' || e.key === 'w' || e.key === 'W' || e.key === 'n' || e.key === 'N' || e.key === 'Tab')) ||
          (e.altKey && e.key === 'Tab') ||
          (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
          ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === ']')) ||
          e.key === 'F5' ||
          (ctrlOrCmd && (e.key === 'r' || e.key === 'R'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            getCountMessage('tabSwitch', nextCount),
            'tabswitch',
            getCountToast('tabSwitch', nextCount)
          );
          return false;
        }
      }

      // Dev tools / print / save
      if (securitySettings.aiDetectionEnabled) {
        if (
          e.key === 'F12' ||
          e.key === 'F10' ||
          (ctrlOrCmd && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) ||
          (ctrlOrCmd && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordViolation(t('aiShortcutBlocked'), 'other', t('aiShortcutBlocked'));
          return false;
        }
      }

      // Known AI shortcuts — includes Alt+G (Gemini), Ctrl+Shift+G, etc.
      if (securitySettings.aiDetectionEnabled) {
        if (
          (ctrlOrCmd &&
            e.shiftKey &&
            (e.key === 'G' || e.key === 'g' ||
             e.key === 'B' || e.key === 'b' ||
             e.key === 'Y' || e.key === 'y' ||
             e.key === 'I' || e.key === 'i' ||
             e.key === 'J' || e.key === 'j' ||
             e.key === 'C' || e.key === 'c' ||
             e.key === 'A' || e.key === 'a' ||
             e.key === 'L' || e.key === 'l' ||
             e.key === 'E' || e.key === 'e' ||
             e.key === ' ')) ||
          (e.altKey && (e.key === 'i' || e.key === 'I' || e.key === 'g' || e.key === 'G' || e.key === 'b' || e.key === 'B' || e.key === 'y' || e.key === 'Y' || e.key === 'a' || e.key === 'A' || e.key === 'l' || e.key === 'L' || e.key === 'e' || e.key === 'E'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordViolation(t('aiShortcutBlocked'), 'other', t('aiShortcutBlocked'));
          return false;
        }
      }

      // All other keys are blocked — only arrow keys are allowed for navigation
      // Do NOT count as a cheating violation; just block and warn
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      toast.warning(t('examSecurity.keyboardLocked'));
      return false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu during exam
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.rightClickEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (exam && !showResults && !isSubmittingOnExitRef.current) {
        // Auto-submit exam when user tries to close/refresh the page
        submissionReasonRef.current = 'page_closed';
        isSubmittingOnExitRef.current = true;
        setIsSubmittingOnExit(true);
        handleSubmitExamRef.current?.(true);

        // Show confirmation dialog (browser-dependent)
        if (securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
          e.preventDefault();
          e.returnValue = t("leaveExamConfirm");
          return e.returnValue;
        }
      }
    };

    // Prevent copy, paste, cut, and select during exam
    const handleCopy = (e: ClipboardEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.copyPasteEnabled) {
        e.preventDefault();
        recordViolation(t("copyAttemptDetected"), "copy", t("copyNotAllowed"));
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.copyPasteEnabled) {
        e.preventDefault();
        recordViolation(t("pasteAttemptDetected"), "paste", t("pasteNotAllowed"));
        return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.copyPasteEnabled) {
        e.preventDefault();
        recordViolation(t("cutAttemptDetected"), "other", t("cutNotAllowed"));
        return false;
      }
    };

    // Prevent ALL text selection during exam
    const handleSelectStart = (e: Event) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.textSelectionEnabled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent double/triple click selection
    const handleMouseDown = (e: MouseEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.textSelectionEnabled) {
        // Prevent text selection via double/triple click
        if (e.detail > 1) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Track tab visibility changes (cheating detection)
    const handleVisibilityChange = () => {
      if (exam && !showResults && document.hidden && securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
        if (focusViolationSentRef.current) return;
        focusViolationSentRef.current = true;

        const nextCount = cheatingAttemptsRef.current + 1;
        recordViolation(
          getCountMessage('tabSwitch', nextCount),
          'tabswitch',
          getCountToast('tabSwitch', nextCount)
        );
      }
    };

    const handleWindowBlur = () => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled || !securitySettings.tabSwitchEnabled || focusViolationSentRef.current) return;

      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (!document.hasFocus() && exam && !showResults) {
          focusViolationSentRef.current = true;
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            getCountMessage('blur', nextCount),
            'tabswitch',
            getCountToast('blur', nextCount)
          );
        }
      }, 800);
    };

    const handleWindowFocus = () => {
      focusViolationSentRef.current = false;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.dragDropEnabled) {
        e.preventDefault();
        return false;
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (exam && !showResults && securitySettings.violationMeasuresEnabled && securitySettings.dragDropEnabled) {
        e.preventDefault();
        return false;
      }
    };

    const handleViewportResize = () => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled || !securitySettings.aiDetectionEnabled) return;

      const currentWidth = window.innerWidth;
      const baselineWidth = lastViewportWidthRef.current;
      if (baselineWidth === 0) {
        lastViewportWidthRef.current = currentWidth;
        return;
      }
      const delta = baselineWidth - currentWidth;
      if (delta >= 120) {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
          const stillShrunk = baselineWidth - window.innerWidth >= 120;
          if (stillShrunk) {
            const nextCount = cheatingAttemptsRef.current + 1;
            recordViolation(
              getCountMessage('resize', nextCount),
              'ai_detection',
              getCountToast('resize', nextCount)
            );
          }
          lastViewportWidthRef.current = window.innerWidth;
        }, 1500);
      } else {
        lastViewportWidthRef.current = currentWidth;
      }
    };

    const checkAiExtensionDom = () => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled || !securitySettings.aiDetectionEnabled) return;
      try {
        const found = document.querySelectorAll(
          '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
        );
        if (found.length > 0) {
          recordViolation(t("aiSidebarDetected"), 'ai_detection', t("aiSidebarDetected"));
        }
        // Detect AI sidebar input fields with content — warn but do NOT count as violation
        const aiInputs = document.querySelectorAll(
          'textarea[aria-label*="Copilot" i], textarea[aria-label*="Gemini" i], textarea[aria-label*="Bard" i], textarea[aria-label*="ChatGPT" i], textarea[aria-label*="Claude" i], textarea[aria-label*="Perplexity" i], input[aria-label*="Copilot" i], input[aria-label*="Gemini" i], input[aria-label*="Bard" i], input[aria-label*="ChatGPT" i], input[aria-label*="Claude" i], input[aria-label*="Perplexity" i], [contenteditable="true"][aria-label*="Copilot" i], [contenteditable="true"][aria-label*="Gemini" i]'
        );
        aiInputs.forEach((el) => {
          const text = (el as HTMLInputElement | HTMLTextAreaElement).value || (el as HTMLElement).textContent || "";
          if (text.trim().length > 0) {
            // Clear the AI input field to prevent typing
            const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
            if (inputEl.value !== undefined) inputEl.value = "";
            if (el instanceof HTMLElement) el.textContent = "";
            // Show warning toast only — do NOT record as a violation
            toast.warning(t("aiTypingDetected"));
          }
        });
      } catch {
        /* invalid selector — ignore */
      }
    };

    // Detect and block typing into AI extension elements via input events
    const handleAiInput = (e: Event) => {
      if (!exam || showResults || !securitySettings.violationMeasuresEnabled || !securitySettings.aiDetectionEnabled) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check if the input is happening inside an AI sidebar/extension element
      const aiElement = target.closest(
        '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
      );
      if (aiElement) {
        // Block the input — prevent typing from reaching the AI element
        e.preventDefault();
        e.stopPropagation();
        // Clear any text that was entered
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
          if (inputEl.value !== undefined) inputEl.value = "";
          if (target instanceof HTMLElement) target.textContent = "";
        // Show warning toast only — do NOT record as a violation
        toast.warning(t("aiTypingDetected"));
      }
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('input', handleAiInput, true); // AI typing detection
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clipboard protection
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('mousedown', handleMouseDown, true);

    // Tab/window visibility and focus tracking
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Drag and drop prevention
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('drop', handleDrop, true);

    // AI sidebar / resize detection
    window.addEventListener('resize', handleViewportResize);
    const aiDomPoll = setInterval(checkAiExtensionDom, 3000);
    focusPollRef.current = securitySettings.tabSwitchEnabled
      ? setInterval(() => {
          if (exam && !showResults && !document.hasFocus() && !focusViolationSentRef.current) {
            handleWindowBlur();
          }
        }, 500)
      : null;

    return () => {
      // Clean up event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('input', handleAiInput, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Remove clipboard protection
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('mousedown', handleMouseDown, true);

      // Remove tab/window tracking
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);

      // Remove drag prevention
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('drop', handleDrop, true);

      // Remove resize / AI polling
      window.removeEventListener('resize', handleViewportResize);
      clearInterval(aiDomPoll);
      if (focusPollRef.current) {
        clearInterval(focusPollRef.current);
        focusPollRef.current = null;
      }
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [exam, showResults, securitySettings, t]);

  // Auto-dismiss cheating warning for minor violations (copy, paste, keyboard, etc.)
  // Fullscreen, tabswitch, and ai_detection violations require manual action
  useEffect(() => {
    if (!showCheatingWarning) return;
    if (violationType === "fullscreen" || violationType === "tabswitch" || violationType === "ai_detection") return;
    if (fullscreenRetryCount >= securitySettings.maxViolations || cheatingAttempts >= securitySettings.maxViolations) return;

    const timer = setTimeout(() => {
      setShowCheatingWarning(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showCheatingWarning, violationType, fullscreenRetryCount, cheatingAttempts, securitySettings.maxViolations]);

  // Auto-close AI detection and resize warnings ONLY when screen size is restored and AI tab is closed
  useEffect(() => {
    if (!showCheatingWarning || (violationType !== "ai_detection" && violationType !== "other")) {
      return;
    }

    const checkRestoration = () => {
      if (typeof window === "undefined") return;
      const currentW = window.innerWidth;
      setCurrentViewportWidth(currentW);
      const baselineW = baselineViewportWidthRef.current || 1000;

      let aiFound = false;
      try {
        const found = document.querySelectorAll(
          '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
        );
        aiFound = found.length > 0;
      } catch {
        aiFound = false;
      }

      // If screen width is restored (within 40px of baseline) and no AI DOM extensions are detected
      if (currentW >= baselineW - 40 && !aiFound) {
        setShowCheatingWarning(false);
        toast.success(t("screenRestoredSuccess") || "Screen size restored / AI tab closed. Resuming exam.");
      }
    };

    checkRestoration();
    const interval = setInterval(checkRestoration, 350);
    window.addEventListener("resize", checkRestoration);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", checkRestoration);
    };
  }, [showCheatingWarning, violationType, t]);

  // Countdown watcher — auto-submit when countdown reaches 0
  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds === 0) {
      handleSubmitExamRef.current?.(true);
      setCountdownSeconds(null);
    }
  }, [countdownSeconds]);

  // Prevent back button / smartphone back gesture during exam
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!exam || showResults || !securitySettings.violationMeasuresEnabled || !securitySettings.tabSwitchEnabled) return;

    const handlePopState = () => {
      // Push multiple history states back so the user cannot navigate away
      if (typeof window !== 'undefined') {
        for (let i = 0; i < 3; i++) {
          window.history.pushState({ exam: true, index: Date.now() + i }, '', window.location.href);
        }
      }

      const newCount = cheatingAttemptsRef.current + 1;
      cheatingAttemptsRef.current = newCount;
      setCheatingAttempts(newCount);
      setViolationType('backnavigation');
      violationTypeRef.current = 'backnavigation';
      setCheatingWarningMessage(
        newCount === 1
          ? t("backNavigationViolation1")
          : newCount < securitySettings.maxViolations
          ? t("backNavigationViolation2")
          : t("backNavigationViolationFinal")
      );
      setShowCheatingWarning(true);

      if (newCount === 1) {
        toast.error(t("backNavigationWarning1"));
      } else if (newCount < securitySettings.maxViolations) {
        toast.error(t("backNavigationWarning2"));
      } else if (newCount >= securitySettings.maxViolations) {
        submissionReasonRef.current = 'cheating_violation';
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
        setCountdownSeconds(15);
        countdownRef.current = setInterval(() => {
          setCountdownSeconds((prev) => {
            if (prev === null) return null;
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              countdownRef.current = null;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        toast.error(t("backNavigationWarningFinal"));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [exam, showResults, securitySettings, t]);

  // Handle back button when viewing results: go to exam categories instead of leaving
  // Also prevent forward navigation back to exam results after leaving
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessChecked || !showResults) return;

    // Push multiple history states so user can't go back to exam questions
    for (let i = 0; i < 3; i++) {
      window.history.pushState({ resultsBuffer: true, index: i }, "", window.location.href);
    }

    const handlePopState = () => {
      // Reset exam state and replace URL to remove exam from history
      resetRef.current?.();
      // Replace the current history entry to prevent forward navigation back to results
      window.history.replaceState({ categoriesBuffer: true }, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [accessChecked, showResults]);

  // Navigate questions with Left/Right arrow keys
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!exam || showResults) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if any modifier key is pressed (we handle Alt+Arrow for back navigation separately)
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min((exam?.questions.length || 1) - 1, i + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exam, showResults]);

  const activeQuestion = useMemo(() => {
    if (!exam?.questions?.length) return null;
    return exam.questions[currentIndex] ?? null;
  }, [exam, currentIndex]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submissionReasonRef.current = 'time_expired';
      handleSubmitExamRef.current?.(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const startExam = async (catId?: string) => {
    let targetCategoryId = catId || categoryId;

    // If targetCategoryId is missing but we have a challengeId, look it up immediately
    if (!targetCategoryId && challengeId) {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("exam_challenges")
          .select("category_id")
          .eq("id", challengeId)
          .maybeSingle();
        if (data?.category_id) {
          targetCategoryId = data.category_id;
          setCategoryId(data.category_id);
        }
      } catch (e) {
        console.error("Failed to fetch challenge category before starting exam:", e);
      }
    }

    if (!targetCategoryId) {
      toast.error(t("pleaseAcceptExamInstructions") || "Please select an exam category to start");
      return;
    }
    setShowInstructions(false);
    setInstructionsAccepted(true);
    setLoadingExam(true);

    // If this is a group exam created from creation wizard, create the challenge first
    // (skip if challenge already exists — e.g. from lobby flow)
    if (pendingInviteeIds.length > 0 && !challengeId) {
      try {
        const categoryName = categories.find((c) => c.id === targetCategoryId)?.name || "Exam";
        const res = await fetch("/api/exam-challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: targetCategoryId,
            category_name: categoryName,
            invite_user_ids: pendingInviteeIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const errorMsg = data?.error || "Failed to create group exam";
          toast.error(errorMsg);
          setLoadingExam(false);
          return;
        }
        if (data?.challenge?.id) {
          setChallengeId(data.challenge.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : (error as any)?.message || String(error);
        console.error("Failed to create group exam challenge:", error);
        toast.error(`${t("failedToStartExam") || "Failed to create group exam"}: ${message}`);
        setLoadingExam(false);
        return;
      }
    }

    // If challenge already exists (from lobby flow), ensure it is marked as active and participant is marked as in_progress
    if (challengeId) {
      try {
        await fetch(`/api/exam-challenges/${challengeId}/start`, {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to mark challenge as active:", error);
      }
    }

    try {
      const data = await getExamForTaking(targetCategoryId, challengeId || undefined);
      setExam(data as TakeResponse);
      setCurrentIndex(0);
      setSecondsLeft((data.settings?.duration_minutes ?? 20) * 60);

      // Preload all question + option images so navigation feels instant
      const allImageUrls = (data.questions || []).flatMap((q: Record<string, unknown>) => [
        q.question_image,
        q.option_a_image,
        q.option_b_image,
        q.option_c_image,
        q.option_d_image,
      ]).filter(Boolean) as string[];
      preloadImages(allImageUrls);
      setExamStartTime(Date.now());
      setUserAnswers({});
      setShowResults(false);
      showResultsRef.current = false;
      setExamResult(null);
      setShowFullscreenWarning(false);
      setFullscreenRetryCount(0);
      fullscreenRetryCountRef.current = 0;
      setCheatingAttempts(0);
      cheatingAttemptsRef.current = 0;
      setIsSubmittingOnExit(false);
      isSubmittingOnExitRef.current = false;
      submittingExamRef.current = false;
      
      // Enter full screen mode only if violation measures and fullscreen are enabled
      if (securitySettings.violationMeasuresEnabled && securitySettings.fullscreenEnabled) {
        try {
          const el = document.documentElement as FullscreenElement;
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          } else if (el.msRequestFullscreen) {
            await el.msRequestFullscreen();
          }
        } catch (fsErr) {
          console.warn("Fullscreen entry prevented or failed:", fsErr);
          setShowFullscreenWarning(true);
        }
      }
      
      // Mark exam as active in sessionStorage (for sidebar hiding)
      sessionStorage.setItem('exam-active', 'true');
      
      // Store baseline viewport width for AI sidebar / screen shrink auto-resolution
      if (typeof window !== "undefined") {
        lastViewportWidthRef.current = window.innerWidth;
        baselineViewportWidthRef.current = window.innerWidth;
        setCurrentViewportWidth(window.innerWidth);
      }

      // Dispatch custom event to notify layout
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Exam started - exam-active set');

      // Push multiple history states to trap the back button / smartphone back gesture
      if (typeof window !== 'undefined') {
        for (let i = 0; i < 3; i++) {
          window.history.pushState({ exam: true, index: i }, '', window.location.href);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as any)?.message || String(error);
      toast.error(message || t("failedToStartExam"));
    } finally {
      setLoadingExam(false);
    }
  };

  const handleSelectAnswer = (answer: "A" | "B" | "C" | "D") => {
    if (!activeQuestion) return;
    
    setUserAnswers((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        questionId: activeQuestion.id,
        selectedAnswer: answer,
        timeStarted: prev[activeQuestion.id]?.timeStarted || Date.now(),
      },
    }));
  };

  // Swipe functionality for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);
  const minSwipeDistance = 75;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = useCallback(() => {
    if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Only swipe if horizontal movement is clearly dominant over vertical scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > minSwipeDistance) {
      const isLeftSwipe = deltaX > 0;
      const isRightSwipe = deltaX < 0;

      if (isLeftSwipe && exam && currentIndex < exam.questions.length - 1) {
        setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1));
      }
      if (isRightSwipe && currentIndex > 0) {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    }
    // reset after handling
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  }, [touchStartX, touchEndX, touchStartY, touchEndY, exam, currentIndex]);

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!exam || !examStartTime) return;
    if (submittingExamRef.current || showResultsRef.current) return;

    const answeredCount = Object.keys(userAnswers).length;

    // Manual submit requires at least one answer; auto-submit (e.g. exit/back) saves even with no answers
    if (answeredCount === 0 && !isAutoSubmit) {
      setAlertTitle(t("noAnswersSelected"));
      setAlertMessage(t("noAnswersSelectedMessage"));
      setAlertType("warning");
      setShowAlert(true);
      return;
    }

    setSubmittingExam(true);
    submittingExamRef.current = true;
    isSubmittingOnExitRef.current = true;
    setIsSubmittingOnExit(true);
    let submitSuccess = false;
    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);

      // Note: correct_answer isn't in exam.questions (stripped before the
      // exam started) — is_correct is always graded server-side below, so
      // it never needs to be computed (or trusted) on the client.
      const answers = exam.questions.map((q) => {
        const userAnswer = userAnswers[q.id];
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          is_correct: false,
          time_spent_seconds: userAnswer ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000) : 0,
        };
      });

      const categoryName = categories.find((c) => c.id === exam.categoryId)?.name || t("unknown");
      const status: 'completed' | 'abandoned' = answeredCount > 0 ? 'completed' : 'abandoned';
      const violationSummary = violationMessagesRef.current.length > 0
        ? violationMessagesRef.current.join("; ")
        : undefined;

      const data = await createExamAttempt({
        category_id: exam.categoryId,
        category_name: categoryName,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status,
        submission_reason: submissionReasonRef.current,
        violation_summary: violationSummary,
        is_group_challenge: !!challengeId,
        challenge_id: challengeId || undefined,
      });
      const attempt = data.attempt as ExamAttempt;
      const questionDetails: Record<string, { correct_answer: string; explanation?: string }> = data.questionDetails || {};

      // Now that the exam is over, merge the real correct_answer/explanation
      // back into the locally-held questions so the review screen can render them.
      setExam((prev) =>
        prev
          ? {
              ...prev,
              questions: prev.questions.map((q) => ({
                ...q,
                correct_answer: (questionDetails[q.id]?.correct_answer ?? q.correct_answer) as ExamQuestion["correct_answer"],
                explanation: questionDetails[q.id]?.explanation ?? q.explanation,
              })),
            }
          : prev
      );

      setExamResult(attempt);
      setShowResults(true);
      showResultsRef.current = true;
      submitSuccess = true;

      // If this exam is part of a group challenge, mark participation as completed or abandoned
      if (challengeId) {
        try {
          if (status === 'abandoned') {
            await fetch(`/api/exam-challenges/${challengeId}/abandon`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          } else {
            await fetch(`/api/exam-challenges/${challengeId}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ exam_attempt_id: attempt.id }),
            });
          }
        } catch (challengeError) {
          console.error("Failed to update challenge participation status:", challengeError);
        }
      }

      // Notify admins about the exam submission
      try {
          await fetch("/api/notifications", {
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
        } catch (error) {
          console.error("Failed to notify admins about exam submission:", error);
        }

      // Remove exam-active flag
      sessionStorage.removeItem('exam-active');
      
      // Dispatch custom event to notify layout
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Exam submitted - exam-active removed');
      
      // Exit full screen mode when exam is completed
      if (document.fullscreenElement) {
        const doc = document as FullscreenDocument;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
      
      toast.success(t("examSubmittedSuccess"));
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as any)?.message || String(error);
      toast.error(`${t("failedToSubmitExam")}: ${message}`);
    } finally {
      setSubmittingExam(false);
      submittingExamRef.current = false;
      if (!submitSuccess) {
        isSubmittingOnExitRef.current = false;
        setIsSubmittingOnExit(false);
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
    setShowFullscreenWarning(false);
    setFullscreenRetryCount(0);
    fullscreenRetryCountRef.current = 0;
    setCheatingAttempts(0);
    cheatingAttemptsRef.current = 0;
    setIsSubmittingOnExit(false);
    isSubmittingOnExitRef.current = false;
    submittingExamRef.current = false;
    setShowCheatingWarning(false);
    setCheatingWarningMessage("");
    setViolationType("other");
    violationTypeRef.current = "other";
    submissionReasonRef.current = 'manual';
    violationMessagesRef.current = [];
    setPendingInviteeIds([]);
    setChallengeId("");
    setCountdownSeconds(null);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    
    // Reset custom dialogs
    setShowAlert(false);
    setShowConfirm(false);
    setConfirmCallback(null);
    
    // Remove exam-active flag
    sessionStorage.removeItem('exam-active');
    
    // Dispatch custom event to notify layout
    window.dispatchEvent(new CustomEvent('exam-state-change'));
    console.log('Exam reset - exam-active removed');

  };
  resetRef.current = reset;

  const handleRetake = () => {
    reset();
    if (categoryId) {
      startExam(categoryId);
    }
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progress = exam ? (answeredCount / exam.questions.length) * 100 : 0;
  const totalViolations = cheatingAttempts + fullscreenRetryCount;

  const getViolationLabel = (type: string) => {
    switch (type) {
      case "fullscreen":
        return t("violationLabels.fullscreen") || "Fullscreen exited";
      case "tabswitch":
        return t("violationLabels.tabswitch") || "Tab switch detected";
      case "copy":
        return t("violationLabels.copy") || "Copy attempt";
      case "paste":
        return t("violationLabels.paste") || "Paste attempt";
      case "backnavigation":
        return t("violationLabels.backnavigation") || "Back navigation attempt";
      case "ai_detection":
        return t("violationLabels.ai_detection") || "AI Assistant detected";
      case "aishortcut":
        return t("violationLabels.aishortcut") || "Restricted shortcut / AI tool";
      case "blur":
        return t("violationLabels.blur") || "Window focus lost";
      case "resize":
        return t("violationLabels.resize") || "AI assistant detected";
      default:
        return t("violationLabels.other") || "Security violation";
    }
  };

  // Prevent layout shift / flashing while permissions and flags are being evaluated
  if (!accessChecked || authLoading) {
    if (challengeId || examMode === "individual") {
      return (
        <div className="min-h-[calc(100vh-80px)] p-4 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="mb-8 space-y-2">
              <div className="h-7 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            </div>
            <ExamCategorySkeleton count={6} />
          </div>
        </div>
      );
    }
    return <ExamChoiceSkeleton />;
  }

  // Show exam choice screen first (skip if group exam is disabled)
  if (examMode === "choice") {
    if (!groupExamEnabled) {
      setExamMode("individual");
      setShowInstructions(false);
      return (
        <div className="min-h-[calc(100vh-80px)] p-4 animate-in fade-in duration-200">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="mb-8 space-y-2">
              <div className="h-7 w-48 rounded bg-muted animate-pulse" />
              <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            </div>
            <ExamCategorySkeleton count={6} />
          </div>
        </div>
      );
    }
    return (
      <ExamChoiceScreen
        groupExamEnabled={groupExamEnabled}
        onNavigate={(choice) => {
          if (choice === "individual") {
            setExamMode("individual");
            setShowInstructions(false);
          } else if (choice === "group") {
            setExamMode("group");
          }
        }}
      />
    );
  }

  // Show category selection for individual exam
  if (examMode === "individual" && !showInstructions && !instructionsAccepted && !exam) {
    return (
      <div className="min-h-[calc(100vh-80px)] p-4 animate-in fade-in duration-200">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => {
              if (groupExamEnabled && examMode === "individual") {
                setExamMode("choice");
              } else {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/dashboard");
                }
              }
            }}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || t("backToDashboard") || "Back"}
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">{t("selectExamCategory") || "Select Exam Category"}</h1>
            <p className="text-muted-foreground">{t("chooseCategoryToStart") || "Choose a category to start your individual exam"}</p>
          </div>

          {/* Categories */}
          {loadingCategories ? (
            <ExamCategorySkeleton count={6} />
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">{t("noCategoriesAvailable") || "No exam categories available"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card 
                  key={category.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-primary rounded-[14px] sm:rounded-[24px]"
                  onClick={() => {
                    setCategoryId(category.id);
                    setShowInstructions(true);
                    setInstructionsAccepted(false);
                  }}
                >
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] sm:text-xs">
                        {t("available") || "Available"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold">{category.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {category.description || t("examCategoryDescription") || "Take exam in this category"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <div className="space-y-2 mb-4 pt-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {t("examDurationLabel") || "Exam Time"}
                        </span>
                        <span className="font-semibold">
                          {category.duration_minutes ? `${category.duration_minutes} ${t("minutes") || "min"}` : `20 ${t("minutes") || "min"}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-primary" />
                          {t("examQuestionsLabel") || "Questions"}
                        </span>
                        <span className="font-semibold">{category.question_count ?? 20}</span>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" size="sm">
                      {t("select") || "Select"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show group exam creation (only when exam hasn't started yet)
  if (examMode === "group" && !exam) {
    return (
      <GroupExamCreation
        onBack={() => setExamMode("choice")}
        onStartExam={async (selectedCategoryId, inviteeIds) => {
          setCategoryId(selectedCategoryId);
          setPendingInviteeIds(inviteeIds);

          // Create the challenge immediately
          const categoryName = categories.find((c) => c.id === selectedCategoryId)?.name || "Exam";
          try {
            const res = await fetch("/api/exam-challenges", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                category_id: selectedCategoryId,
                category_name: categoryName,
                invite_user_ids: inviteeIds,
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data?.error || t("failedToStartExam") || "Failed to create group exam");
              return;
            }
            if (data?.challenge?.id) {
              setChallengeId(data.challenge.id);
              setExamMode("lobby");
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(`${t("failedToStartExam") || "Failed to create group exam"}: ${message}`);
          }
        }}
      />
    );
  }

  // Show group exam lobby (waiting room)
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
          if (categoryId) {
            startExam(categoryId);
          }
        }}
        onCancel={() => {
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const from = urlParams.get("from");
            if (from === "classmates") {
              router.push("/dashboard#classmates");
              return;
            }
            if (from === "services") {
              router.push("/dashboard#services/group-exam");
              return;
            }
          }
          setExamMode("choice");
          setPendingInviteeIds([]);
          setChallengeId("");
        }}
      />
    );
  }

  if (showResults && examResult) {
    const effectiveChallengeId =
      challengeId ||
      examResult.challenge_id ||
      (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("challenge_id") || "" : "");

    // If this is a group exam, show group results with leaderboard
    if (effectiveChallengeId) {
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

  const isExamActive = exam !== null && secondsLeft !== null;

  return (
    <div className={`bg-transparent ${isExamActive ? 'select-none' : ''}`}>
      {/* Floating Navo Button */}
      {!isExamActive && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden relative">
              {config.logoUrl ? (
                <Image src={config.logoUrl} alt={config.systemName} fill unoptimized className="object-cover" sizes="32px" />
              ) : (
                <span className="text-xs font-bold">{config.logoText || "N"}</span>
              )}
            </div>
            <span className="text-sm font-medium pr-1">{config.systemName}</span>
          </Link>
        </div>
      )}
      
      
      <main className={isExamActive ? "relative mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-5 md:px-6 md:py-6" : "student-page student-page-no-nav !mx-auto max-w-5xl"}>
        <Watermark />
        
        {/* Exam Categories - Top Left */}
        {!exam && examMode !== "individual" && (
          <section className="student-section">
            <div className="hidden md:block mb-6">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {t("backToHome")}
              </Link>
            </div>
            <div className="student-page-header">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="student-page-title">{t("exams")}</h1>
                  <p className="student-page-description">{t("selectExamCategory")}</p>
                </div>
                {hasExamHistory && (
                  <Link
                    href="/dashboard#results"
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("examHistory")}</span>
                  </Link>
                )}
              </div>
            </div>
            <div>
              {categories.length === 0 ? (
                // Loading or no exams
                <div className="text-center py-8">
                  {loadingCategories ? (
                    <ExamCategorySkeleton />
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">{t("pleaseWait")}</p>
                      <p className="text-sm text-muted-foreground">{t("examsBeingPrepared")}</p>
                    </>
                  )}
                </div>
              ) : categories.length === 1 ? (
                // Single category — display directly without selection grid
                <div className="max-w-md">
                  <Card className="group h-full rounded-[14px] sm:rounded-[24px]">
                    <CardHeader className="p-3 sm:pb-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] sm:text-xs">
                          {t("available")}
                        </Badge>
                      </div>
                      <CardTitle className="text-base sm:text-xl font-bold mt-2 sm:mt-3 line-clamp-2">{categories[0].name}</CardTitle>
                      <CardDescription className="text-[11px] sm:text-sm line-clamp-2">
                        {t("clickToStartExamInCategory")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center justify-between text-[11px] sm:text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {t("questions")}
                          </span>
                          <span className="font-medium">{categories[0].question_count ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] sm:text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {t("duration")}
                          </span>
                          <span className="font-medium">{categories[0].duration_minutes ? `${categories[0].duration_minutes} ${t("minutes")}` : t("timed")}</span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3 sm:mt-4"
                          disabled={loadingExam}
                          onClick={() => {
                            setCategoryId(categories[0].id);
                            startExam(categories[0].id);
                          }}
                        >
                          {loadingExam ? (
                            <>
                              <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                              {t("starting")}
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              {t("startExam")}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // Display all exams in consistent grid layout
                <>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                      <Card 
                        key={category.id}
                        className="group cursor-pointer h-full rounded-[14px] sm:rounded-[24px]"
                        onClick={() => {
                          setCategoryId(category.id);
                          startExam(category.id);
                        }}
                      >
                        <CardHeader className="p-3 sm:pb-4 sm:p-6">
                          <div className="flex items-center justify-between">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] sm:text-xs">
                              {t("available")}
                            </Badge>
                          </div>
                          <CardTitle className="text-base sm:text-xl font-bold mt-2 sm:mt-3 line-clamp-2">{category.name}</CardTitle>
                          <CardDescription className="text-[11px] sm:text-sm line-clamp-2">
                            {t("clickToStartExamInCategory")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between text-[11px] sm:text-sm">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {t("questions")}
                              </span>
                              <span className="font-medium">{category.question_count ?? "—"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] sm:text-sm">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {t("duration")}
                              </span>
                              <span className="font-medium">{category.duration_minutes ? `${category.duration_minutes} ${t("minutes")}` : t("timed")}</span>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full mt-3 sm:mt-4 group-hover:bg-primary/90 transition-colors"
                              disabled={loadingExam}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryId(category.id);
                                startExam(category.id);
                              }}
                            >
                              {loadingExam ? (
                                <>
                                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                                  {t("starting")}
                                </>
                              ) : (
                                <>
                                  <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                  {t("startExam")}
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Right side content - can be used for additional info or empty */}
            <div className="hidden">
              {/* This space can be used for future content like exam tips, statistics, etc. */}
            </div>
          </section>
        )}
        
        {/* Sticky Time & Progress Bar - Only show during active exam */}
        {isExamActive && exam && (
          <div className="sticky top-0 z-30 -mx-4 sm:-mx-5 md:-mx-6 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-background/80 backdrop-blur-md border-b select-none">
            <div className="flex items-center justify-between gap-3 sm:gap-6 max-w-5xl mx-auto">
              {/* Progress (left) */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] sm:text-sm mb-1 sm:mb-1.5">
                  <span className="font-medium">{t("progress")}</span>
                  <span className="text-muted-foreground tabular-nums">{answeredCount} / {exam.questions.length}</span>
                </div>
                <div className="relative h-2 sm:h-2.5 rounded-full overflow-hidden border border-white/10 dark:border-white/5 bg-white/30 dark:bg-white/5 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-1px_2px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),inset_0_-1px_2px_rgba(0,0,0,0.4)]">
                  <div
                    className="relative h-full rounded-full transition-all duration-300 bg-gradient-to-r from-primary/80 via-primary to-primary/90 shadow-[0_0_12px_rgba(0,0,0,0.15)] overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    {/* Glass sheen overlay */}
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/10" />
                    {/* Animated shimmer */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </div>
                </div>
              </div>
              {/* Timer (right) */}
              <div className="text-right shrink-0">
                <div className="text-[10px] sm:text-xs text-muted-foreground leading-none mb-0.5">{t("timeLeft")}</div>
                <div className={`text-lg sm:text-2xl font-bold tabular-nums leading-tight ${secondsLeft !== null && secondsLeft < 60 ? "text-red-600 animate-pulse" : ""}`}>
                  {formatTime(secondsLeft)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Group Exam Participants HUD */}
        {isExamActive && challengeId && user && exam && (
          <GroupExamLiveHUD
            challengeId={challengeId}
            currentUserId={user.id}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            totalQuestions={exam.questions.length}
            isExamActive={isExamActive}
          />
        )}

      {exam ? (
        <>
          {/* Top action bar: Cheating Violations Counter (replaces back button, only shown if user has violations) + Quit + Submit */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {totalViolations > 0 && (
                <div
                  id="exam-cheating-violations-counter"
                  className="inline-flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-red-500/10 dark:bg-red-950/40 border border-red-500/30 text-red-700 dark:text-red-300 text-xs shadow-sm animate-in fade-in slide-in-from-left-2 duration-300 max-w-full"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 font-semibold text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {t("cheatingViolations") || "Violations"}:{" "}
                      <span className="font-bold tabular-nums">
                        {totalViolations}
                        {securitySettings.maxViolations ? ` / ${securitySettings.maxViolations}` : ""}
                      </span>
                    </span>
                  </div>
                  <span className="text-red-300 dark:text-red-700 select-none">|</span>
                  <div className="flex items-center gap-1 min-w-0 truncate text-[11px] sm:text-xs">
                    <span className="text-muted-foreground shrink-0 font-medium">
                      {t("lastViolation") || "Last"}:
                    </span>
                    <span className="font-medium truncate text-red-800 dark:text-red-200">
                      {getViolationLabel(violationType)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmTitle(t("quitExamTitle"));
                  setConfirmMessage(t("quitExamMessage"));
                  setConfirmCallback(() => () => handleSubmitExamRef.current?.(true));
                  setShowConfirm(true);
                }}
                className="gap-2"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("quit")}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitExamRef.current?.()}
                disabled={submittingExam || answeredCount === 0}
                className="min-w-[100px] sm:min-w-[120px]"
              >
                {submittingExam ? (
                  t("submitting")
                ) : (
                  <>
                    {t("submit")}
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card
            className="navo-card-brand select-none rounded-[14px] sm:rounded-[24px]"
          >
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm sm:text-base">
                  {t("question")} {currentIndex + 1} {t("of")} {exam.questions.length}
                </CardTitle>
                {/* Question palette toggle (desktop: always visible grid; mobile: collapsible) */}
                <button
                  type="button"
                  onClick={() => setShowQuestionPalette((v) => !v)}
                  className="md:hidden flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary/60"
                  aria-label="Toggle question palette"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>{answeredCount}/{exam.questions.length}</span>
                </button>
              </div>
              <CardDescription className="text-[11px] sm:text-sm">
                {t("examDurationLabel")}: {exam.settings.duration_minutes}m · {t("examQuestionsLabel")}: {exam.questions.length}
                <span className="md:hidden text-xs text-muted-foreground ml-2">{t("swipeToNavigate")}</span>
              </CardDescription>

              {/* Question palette — always visible on md+, collapsible on mobile */}
              <div className={`${showQuestionPalette ? "block" : "hidden"} md:block mt-3 sm:mt-4`}>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {exam.questions.map((q, i) => {
                    const isAnswered = !!userAnswers[q.id]?.selectedAnswer;
                    const isCurrent = i === currentIndex;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentIndex(i)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : isAnswered
                            ? "bg-primary/15 text-primary hover:bg-primary/25"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                        aria-label={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
              {activeQuestion ? (
                <>
                  <div
                    className="touch-pan-y space-y-3 sm:space-y-4"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {activeQuestion.question && (
                      <div className="text-base sm:text-lg font-medium">{activeQuestion.question}</div>
                    )}
                    {activeQuestion.question_image && (
                      <SmartImage src={activeQuestion.question_image} alt={t("question")} width={800} height={600} className="w-full max-h-[240px] sm:max-h-[320px] object-contain rounded-[10px] sm:rounded-lg" />
                    )}

                    {(() => {
                      const opts = (["A", "B", "C", "D"] as const).map((opt) => ({
                        opt,
                        text: activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}`],
                        img: activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}_image` as keyof ExamQuestion] as string | undefined,
                      }));
                      const hasImageOptions = opts.some((o) => !!o.img);

                      if (hasImageOptions) {
                        return (
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {opts.map(({ opt, text, img }) => {
                              const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                              return (
                                <div
                                  key={opt}
                                  className={`relative rounded-[10px] sm:rounded-lg border p-2 cursor-pointer transition-all select-none flex flex-col ${
                                    isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => handleSelectAnswer(opt)}
                                >
                                  <div className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-sm font-medium shrink-0 ${
                                    isSelected ? "border-primary bg-primary text-white" : "border-border bg-background"
                                  }`}>
                                    {opt}
                                  </div>
                                  {img && (
                                    <SmartImage src={img} alt={`${t("option")} ${opt}`} width={800} height={600} className="w-full h-24 sm:h-36 object-contain rounded-md border mb-1.5 bg-muted/20" />
                                  )}
                                  {text && <div className="text-xs sm:text-sm text-center line-clamp-2 mt-auto font-medium">{text}</div>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      }

                      return (
                        <div className="grid gap-2 sm:gap-3">
                          {opts.map(({ opt, text, img }) => {
                            const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                            return (
                              <div
                                key={opt}
                                className={`rounded-[10px] sm:rounded-lg border p-2.5 sm:p-3 cursor-pointer transition-all select-none ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => handleSelectAnswer(opt)}
                              >
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-sm font-medium shrink-0 ${
                                    isSelected ? "border-primary bg-primary text-white" : "border-border"
                                  }`}>
                                    {opt}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {img && <SmartImage src={img} alt={`${t("option")} ${opt}`} width={800} height={600} className="w-full max-h-[180px] sm:max-h-[240px] object-contain rounded-md mb-2" />}
                                    {text && <div className="text-xs sm:text-sm">{text}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                </div>

                <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    {t("previous")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                    disabled={currentIndex >= exam.questions.length - 1}
                  >
                    {t("next")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t("noQuestionsReturned")}</div>
            )}
          </CardContent>
          </Card>
        </>
      ) : null}
      </main>
      
      {/* Exam Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {t("examInstructions")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("readInstructionsCarefully")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            {/* Exam Overview - Only Exam Time and Number of Questions */}
            {(() => {
              const selectedCat = categories.find((c) => c.id === categoryId) || (categories.length === 1 ? categories[0] : null);
              const duration = selectedCat?.duration_minutes ?? exam?.settings.duration_minutes ?? 20;
              const questionCount = selectedCat?.question_count ?? exam?.questions.length ?? 20;

              return (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 sm:p-4 space-y-2.5">
                  <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-primary">
                    <HelpCircle className="h-4 w-4" />
                    {t("examOverview") || "Exam Overview"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/90 border">
                      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("examDurationLabel") || "Exam Time"}</p>
                        <p className="text-sm sm:text-base font-semibold">
                          {duration} {t("minutes") || "minutes"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/90 border">
                      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                        <Hash className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("examQuestionsLabel") || "Number of Questions"}</p>
                        <p className="text-sm sm:text-base font-semibold">
                          {questionCount} {t("questions") || "questions"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Important Rules */}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3.5 sm:p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-yellow-800 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                {t("examRules.title") || "Important Rules"}
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-yellow-800/90 dark:text-yellow-300">
                <p>• {t("examRules.noRefresh") || "Do not refresh the page during the exam"}</p>
                <p>• {t("examRules.noMultipleTabs") || "Do not open multiple tabs or windows"}</p>
                <p>• {t("examRules.noTabSwitch") || "Do not switch tabs or leave the exam window"}</p>
                <p>• {t("examRules.stayFullscreen") || "You must remain in fullscreen mode during the entire exam"}</p>
                <p>• {t("examRules.oneSitting") || "Complete the exam in one sitting"}</p>
                <p>• {t("examRules.stableInternet") || "Make sure you have a stable internet connection"}</p>
              </div>
            </div>

            {/* Security Restrictions (Alone - No Technical Requirements) */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3.5 sm:p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-red-700 dark:text-red-400">
                <Shield className="h-4 w-4" />
                {t("examSecurity.title") || "Security Restrictions"}
              </h3>
              <div className="space-y-1.5 text-xs sm:text-sm text-red-700 dark:text-red-300">
                <p>• {t("examSecurity.copyPasteCutDisabled") || "Copy, paste, and cut are disabled during the exam"}</p>
                <p>• {t("examSecurity.textSelectionLimited") || "Text selection is restricted during the exam"}</p>
                <p>• {t("examSecurity.rightClickDisabled") || "Right-click context menu is disabled"}</p>
                <p>• {t("examSecurity.noAISidebars") || "AI assistants, sidebars, and unauthorized tools are prohibited"}</p>
                <p>• {t("examSecurity.shortcutsBlocked") || "Unauthorized navigation shortcuts and browser keys are blocked"}</p>
                <p>• {t("examSecurity.leaveTriggersSubmit") || "Repeated violations or leaving the exam triggers automatic submission"}</p>
              </div>
            </div>

            {/* Acceptance */}
            <div className="flex items-start gap-2.5 sm:gap-3 pt-3 border-t">
              <Checkbox
                id="accept"
                checked={instructionsAccepted}
                onCheckedChange={(checked) => setInstructionsAccepted(checked as boolean)}
              />
              <label
                htmlFor="accept"
                className="text-xs sm:text-sm font-medium leading-normal cursor-pointer select-none"
              >
                {t("acceptExamInstructions")}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" onClick={() => setShowInstructions(false)} className="w-full sm:w-auto">
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                if (categoryId) {
                  startExam(categoryId);
                } else {
                  setShowInstructions(false);
                }
              }}
              disabled={!instructionsAccepted}
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {loadingExam ? t("starting") : categoryId ? t("beginExam") : t("proceedToExams")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Warning Dialog - NON-CLOSABLE */}
      <Dialog open={showFullscreenWarning} onOpenChange={() => {
        // Prevent closing - force user to re-enter fullscreen
        if (showFullscreenWarning) {
          toast.error(t("reEnterFullscreenToContinue"));
        }
      }}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            toast.error(t("clickOutsideNotAllowed"));
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            toast.error(t("escNotAllowed"));
          }}
          hideCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl text-red-600">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              {t("fullscreenRequiredTitle") || "Fullscreen Required"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-red-600 font-medium">
              {t("fullscreenRequiredDesc") || "You have exited fullscreen mode. Please re-enter fullscreen mode to continue your exam."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              onClick={async () => {
                try {
                  const el = document.documentElement as FullscreenElement;
                  if (el.requestFullscreen) {
                    await el.requestFullscreen();
                  } else if (el.webkitRequestFullscreen) {
                    await el.webkitRequestFullscreen();
                  } else if (el.msRequestFullscreen) {
                    await el.msRequestFullscreen();
                  }
                  setShowFullscreenWarning(false);
                } catch (error) {
                  console.error('Failed to enter fullscreen:', error);
                  toast.error(t("failedToEnterFullscreen"));
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <Monitor className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              {t("reEnterFullscreenButton") || "Re-enter Fullscreen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cheating Warning Modal - Shows after any violation */}
      <Dialog open={showCheatingWarning} onOpenChange={(open) => {
        // Prevent closing by clicking outside or pressing Escape for ALL violation types
        // The dialog should only close via explicit buttons or auto-dismiss timer
        if (!open) {
          // Only allow closing if fullscreen is restored for fullscreen violations
          if (violationType === "fullscreen" && document.fullscreenElement) {
            setShowCheatingWarning(false);
          }
          // For all other violations, do nothing — auto-dismiss handles minor violations
          return;
        }
        setShowCheatingWarning(open);
      }}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto border-red-500 border-2"
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl text-red-600">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              {violationType === "fullscreen" || violationType === "tabswitch"
                ? t("cheatingViolationDetected") || "Exam Warning"
                : violationType === "ai_detection"
                ? t("aiDetectionDetected") || "AI Detected"
                : t("prohibitedActionDetected") || "Exam Warning"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-foreground/90 font-medium whitespace-pre-line">
              {cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col gap-2 pt-2">
            {violationType === "ai_detection" ? (
              <div className="w-full text-center py-2.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100/50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-900/50">
                <div className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                <span>{t("waitingForScreenRestore") || "Please close AI to continue your exam..."}</span>
              </div>
            ) : (violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < securitySettings.maxViolations && cheatingAttempts < securitySettings.maxViolations ? (
              <>
                {violationType === "fullscreen" && (
                  <Button
                    onClick={async () => {
                      try {
                        const el = document.documentElement as FullscreenElement;
                        if (el.requestFullscreen) {
                          await el.requestFullscreen();
                        } else if (el.webkitRequestFullscreen) {
                          await el.webkitRequestFullscreen();
                        } else if (el.msRequestFullscreen) {
                          await el.msRequestFullscreen();
                        }
                        setShowCheatingWarning(false);
                        setShowFullscreenWarning(false);
                      } catch (error) {
                        console.error('Failed to enter fullscreen:', error);
                        toast.error(t("failedToEnterFullscreen"));
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Monitor className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("reEnterFullscreenNow") || "Re-enter Fullscreen"}
                  </Button>
                )}
                {violationType === "tabswitch" && (
                  <Button
                    onClick={() => {
                      setShowCheatingWarning(false);
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {t("acknowledgeStayOnTab") || "Acknowledge & Continue"}
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full text-center py-2 space-y-2">
                {countdownSeconds !== null && countdownSeconds > 0 ? (
                  <>
                    <p className="text-sm font-medium text-red-600">
                      {t("examAutoSubmitCountdown") || "Exam will be auto-submitted in:"}
                    </p>
                    <div className="text-3xl font-bold text-red-600 tabular-nums">
                      {countdownSeconds}s
                    </div>
                  </>
                ) : (
                  <p className="text-sm font-medium text-red-600">
                    {fullscreenRetryCount >= securitySettings.maxViolations || cheatingAttempts >= securitySettings.maxViolations
                      ? (t("examBeingSubmitted") || "Exam is being submitted...")
                      : (t("warningWillCloseAutomatically") || "This warning will close automatically.")}
                  </p>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Alert Dialog */}
      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-base sm:text-xl ${
              alertType === "error" ? "text-red-600" :
              alertType === "warning" ? "text-yellow-600" :
              alertType === "success" ? "text-green-600" :
              "text-blue-600"
            }`}>
              {alertType === "error" && <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              {alertType === "warning" && <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />}
              {alertType === "success" && <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              {alertType === "info" && <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
              {alertTitle}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-1.5 sm:mt-2">
              {alertMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowAlert(false)}
              size="sm"
              className={`w-full ${
                alertType === "error" ? "bg-red-600 hover:bg-red-700" :
                alertType === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
                alertType === "success" ? "bg-green-600 hover:bg-green-700" :
                "bg-blue-600 hover:bg-blue-700"
              } text-white`}
            >
              {t("ok")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto border-amber-500 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl text-amber-700 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-1.5 sm:mt-2 whitespace-pre-line">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5 sm:p-3 my-3 sm:my-4">
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-400 font-medium text-center">
              {t("pleaseConfirmYourAction")}
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowConfirm(false);
                setConfirmCallback(null);
              }}
              className="w-full sm:flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowConfirm(false);
                confirmCallback?.();
                setConfirmCallback(null);
              }}
              className="w-full sm:flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

