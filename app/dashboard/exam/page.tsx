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
import { getExamCategories, getExamForTaking, createExamAttempt, isStandaloneExamEnabled } from "@/lib/supabase/queries";
import { useAuth } from "@/lib/auth-context";
import { getSecuritySettings, DEFAULT_SECURITY_SETTINGS, type SecuritySettings } from "@/lib/security-config";
import { toast } from "sonner";
import { ExamCategorySkeleton } from "@/components/skeletons";
import { useLanguage } from "@/lib/language-context";
import { CheckCircle, XCircle, Trophy, ArrowRight, Home, AlertCircle, AlertTriangle, BookOpen, Shield, HelpCircle, FileText, Play, LogOut, Monitor, Clock, Hash, ArrowLeft } from "lucide-react";
import { ExamReview } from "@/components/exam-review";
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
  const { loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [challengeId, setChallengeId] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;

    // Parse challenge_id and category_id from URL params (group exam challenge)
    const urlParams = new URLSearchParams(window.location.search);
    const urlChallengeId = urlParams.get("challenge_id");
    const urlCategoryId = urlParams.get("category_id");
    if (urlChallengeId) setChallengeId(urlChallengeId);
    if (urlCategoryId) {
      setCategoryId(urlCategoryId);
      setShowInstructions(true);
      setInstructionsAccepted(false);
    }

    void isStandaloneExamEnabled().then((enabled) => {
      if (!enabled) {
        router.replace("/dashboard#course");
        return;
      }
      setAccessChecked(true);
    });
  }, [router, authLoading]);

  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [exam, setExam] = useState<TakeResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<ExamAttempt | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);
  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [isSubmittingOnExit, setIsSubmittingOnExit] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [cheatingWarningMessage, setCheatingWarningMessage] = useState("");
  const [violationType, setViolationType] = useState<"fullscreen" | "tabswitch" | "copy" | "paste" | "backnavigation" | "other">("other");
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);

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
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setCategories(data.categories || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`${t("failedToLoadCategories")}: ${message}`);
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

    const recordViolation = (message: string, type: "fullscreen" | "tabswitch" | "copy" | "paste" | "backnavigation" | "other" = "other", toastMessage?: string) => {
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

      if (toastMessage && newCount < securitySettings.maxViolations) {
        toast.error(toastMessage);
      }

      if (newCount >= securitySettings.maxViolations) {
        setTimeout(() => {
          toast.error(t("examAutoSubmitted"));
          handleSubmitExamRef.current?.(true);
        }, 3000);
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
          setTimeout(() => {
            toast.error(t("examAutoSubmitted"));
            handleSubmitExamRef.current?.(true);
          }, 3000);
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
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      recordViolation(t('examSecurity.keyboardLocked'), 'other', t('examSecurity.keyboardLocked'));
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
      if (exam && !showResults && !isSubmittingOnExitRef.current && securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
        e.preventDefault();
        e.returnValue = t("leaveExamConfirm");

        // Auto-submit exam when user tries to close/refresh
        isSubmittingOnExitRef.current = true;
        setIsSubmittingOnExit(true);
        handleSubmitExamRef.current?.(true);
        return e.returnValue;
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
              'other',
              getCountToast('resize', nextCount)
            );
          }
          lastViewportWidthRef.current = window.innerWidth;
        }, 2000);
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
          recordViolation(t("aiSidebarDetected"), 'other', t("aiSidebarDetected"));
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
  // Fullscreen and tabswitch violations require manual action (re-enter fullscreen / acknowledge)
  useEffect(() => {
    if (!showCheatingWarning) return;
    if (violationType === "fullscreen" || violationType === "tabswitch") return;
    if (fullscreenRetryCount >= securitySettings.maxViolations || cheatingAttempts >= securitySettings.maxViolations) return;

    const timer = setTimeout(() => {
      setShowCheatingWarning(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showCheatingWarning, violationType, fullscreenRetryCount, cheatingAttempts, securitySettings.maxViolations]);

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
        setTimeout(() => {
          toast.error(t("backNavigationWarningFinal"));
          handleSubmitExamRef.current?.(true);
        }, 3000);
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

  // Handle back button when on categories page: go to dashboard instead of leaving the site
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessChecked || exam || showResults) return;

    window.history.pushState({ categoriesBuffer: true }, "", window.location.href);

    const handlePopState = () => {
      if (window.location.pathname === "/dashboard/exam") {
        window.history.pushState({ categoriesBuffer: true }, "", window.location.href);
      } else {
        router.replace("/dashboard");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [accessChecked, exam, showResults, router]);

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
      handleSubmitExamRef.current?.(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const startExam = async () => {
    if (!instructionsAccepted) {
      toast.error(t("pleaseAcceptExamInstructions"));
      return;
    }
    setShowInstructions(false);
    setLoadingExam(true);
    try {
      const data = await getExamForTaking(categoryId);
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
        const el = document.documentElement as FullscreenElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      }
      
      // Mark exam as active in sessionStorage (for sidebar hiding)
      sessionStorage.setItem('exam-active', 'true');
      
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
      const message = error instanceof Error ? error.message : String(error);
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && exam && currentIndex < exam.questions.length - 1) {
      setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1));
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex((i) => Math.max(0, i - 1));
    }
    // reset after handling
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, exam, currentIndex]);

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!exam || !examStartTime) return;
    if (submittingExamRef.current || showResultsRef.current) return;
    if (isAutoSubmit && isSubmittingOnExitRef.current) return;

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

      const data = await createExamAttempt({
        category_id: exam.categoryId,
        category_name: categoryName,
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status,
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

      // If this exam is part of a group challenge, mark participation as completed
      if (challengeId) {
        try {
          await fetch(`/api/exam-challenges/${challengeId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exam_attempt_id: attempt.id }),
          });
        } catch (challengeError) {
          console.error("Failed to mark challenge participation as completed:", challengeError);
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
      const message = error instanceof Error ? error.message : String(error);
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
      setShowInstructions(true);
      setInstructionsAccepted(false);
    }
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progress = exam ? (answeredCount / exam.questions.length) * 100 : 0;

  if (!accessChecked) return null;

  if (showResults && examResult) {
    return (
      <ExamReview
        examResult={examResult}
        questions={(exam?.questions || []) as ExamQuestion[]}
        onReset={reset}
        onRetake={handleRetake}
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
        {!exam && (
          <section className="student-section">
            <div className="hidden md:block mb-6">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                {t("backToHome")}
              </Link>
            </div>
            <div className="student-page-header">
              <div>
                <h1 className="student-page-title">{t("exams")}</h1>
                <p className="student-page-description">{t("selectExamCategory")}</p>
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
                          setShowInstructions(true);
                          setInstructionsAccepted(false);
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
                                setShowInstructions(true);
                                setInstructionsAccepted(false);
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

      {exam ? (
        <>
          {/* Top action bar: back + quit + submit */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirmTitle(t("quitExamTitle"));
                  setConfirmMessage(t("quitExamMessage"));
                  setConfirmCallback(() => () => {
                    handleSubmitExamRef.current?.(true);
                    router.push("/dashboard");
                  });
                  setShowConfirm(true);
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("backToHome")}
              </Button>
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

                    <div className="grid gap-2 sm:gap-3">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const text = activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}`];
                        const img = activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}_image` as keyof ExamQuestion] as string | undefined;
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

          <div className="space-y-3 sm:space-y-6 py-2 sm:py-4">
            {/* Exam Overview */}
            <div className="bg-primary/5 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                {t("examOverview")}
              </h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                <p>• {t("examInstruction.multipleChoice")}</p>
                <p>• {t("examInstruction.limitedTime")}</p>
                <p>• {t("examInstruction.fourAnswers")}</p>
                <p>• {t("examInstruction.selectBestAnswer")}</p>
                <p>• {t("examInstruction.navigateButtons")}</p>
                <p>• {t("examInstruction.answersAutoSaved")}</p>
              </div>
            </div>

            {/* Rules and Guidelines */}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                {t("examRules.title")}
              </h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                <p>• {t("examRules.noRefresh")}</p>
                <p>• {t("examRules.noMultipleTabs")}</p>
                <p>• {t("examRules.noTabSwitch")}</p>
                <p>• {t("examRules.oneSitting")}</p>
                <p>• {t("examRules.stableInternet")}</p>
                <p>• {t("examRules.stayFullscreen")}</p>
                <p>• {t("examRules.fullscreenLimit")}</p>
                <p>• {t("examRules.hiddenControls")}</p>
              </div>
            </div>

            {/* Security Restrictions */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-red-700 dark:text-red-400">
                <Shield className="h-4 w-4" />
                {t("examSecurity.title")}
              </h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-red-700 dark:text-red-300">
                <p>• {t("examSecurity.copyPasteCutDisabled")}</p>
                <p>• {t("examSecurity.textSelectionLimited")}</p>
                <p>• {t("examSecurity.rightClickDisabled")}</p>
                <p>• {t("examSecurity.dragDropDisabled")}</p>
                <p>• {t("examSecurity.keysBlocked")}</p>
                <p>• {t("examSecurity.shortcutsBlocked")}</p>
                <p>• {t("examSecurity.leaveTriggersSubmit")}</p>
                <p>• {t("examSecurity.quitSubmits")}</p>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base text-blue-700 dark:text-blue-400">
                <Monitor className="h-4 w-4" />
                {t("examTechnical.title")}
              </h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                <p>• {t("examTechnical.modernBrowser")}</p>
                <p>• {t("examTechnical.javascriptEnabled")}</p>
                <p>• {t("examTechnical.allowPopups")}</p>
                <p>• {t("examTechnical.fullscreenRequired")}</p>
                <p>• {t("examTechnical.noExtensions")}</p>
              </div>
            </div>

            {/* Acceptance */}
            <div className="flex items-start gap-2 sm:gap-3 pt-2 border-t">
              <Checkbox
                id="accept"
                checked={instructionsAccepted}
                onCheckedChange={(checked) => setInstructionsAccepted(checked as boolean)}
              />
              <label
                htmlFor="accept"
                className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
              onClick={startExam}
              disabled={!instructionsAccepted}
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {loadingExam ? t("starting") : t("beginExam")}
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
              {t("fullscreenRequiredTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-red-600 font-medium">
              {t("fullscreenRequiredDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium">
                {fullscreenRetryCount === 1
                  ? t("fullscreenWarning.reenter")
                  : fullscreenRetryCount < securitySettings.maxViolations
                  ? t("fullscreenWarning.repeated")
                  : t("fullscreenWarning.final")
                }
              </p>
            </div>

            <div className="text-xs sm:text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/30 p-2.5 sm:p-3 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <p className="font-medium mb-1.5 sm:mb-2 text-yellow-800 dark:text-yellow-400">{t("fullscreenInstruction.mustClick")}</p>
              <p className="text-yellow-700 dark:text-yellow-300">• {t("fullscreenInstruction.xHidden")}</p>
              <p className="text-yellow-700 dark:text-yellow-300">• {t("fullscreenInstruction.outsideBlocked")}</p>
              <p className="text-yellow-700 dark:text-yellow-300">• {t("fullscreenInstruction.escBlocked")}</p>
            </div>
          </div>

          <DialogFooter>
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
              {t("reEnterFullscreenButton")}
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
                ? t("cheatingViolationDetected")
                : t("prohibitedActionDetected")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-red-600 font-medium whitespace-pre-line">
              {cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-semibold">
                {t("violationCount.title")}
              </p>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                • {t("violationCount.fullscreen")}: {fullscreenRetryCount}/{securitySettings.maxViolations}
              </p>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                • {t("violationCount.tabSwitch")}: {cheatingAttempts}/{securitySettings.maxViolations}
              </p>
              <p className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 mt-1.5 sm:mt-2">
                {t("violationCount.autoSubmitWarning")}
              </p>
            </div>

            {(violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < securitySettings.maxViolations && cheatingAttempts < securitySettings.maxViolations && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-2.5 sm:p-3">
                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-400 font-medium">
                  {t("actionRequired.title")}
                </p>
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                  {violationType === "fullscreen"
                    ? t("actionRequired.reenterFullscreen")
                    : t("actionRequired.returnToTab")}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2">
            {(violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < securitySettings.maxViolations && cheatingAttempts < securitySettings.maxViolations ? (
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
                    {t("reEnterFullscreenNow")}
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
                    {t("acknowledgeStayOnTab")}
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-sm font-medium text-red-600">
                  {fullscreenRetryCount >= securitySettings.maxViolations || cheatingAttempts >= securitySettings.maxViolations
                    ? t("examBeingSubmitted")
                    : t("warningWillCloseAutomatically")}
                </p>
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

