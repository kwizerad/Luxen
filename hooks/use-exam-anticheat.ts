"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_SECURITY_SETTINGS, type SecuritySettings } from "@/lib/security-config";
import { useLanguage } from "@/lib/language-context";

export type ViolationType =
  | "fullscreen"
  | "tabswitch"
  | "copy"
  | "paste"
  | "backnavigation"
  | "ai_detection"
  | "other";

export type SubmissionReason =
  | "manual"
  | "page_closed"
  | "cheating_violation"
  | "time_expired";

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

interface UseExamAnticheatOptions {
  isActive: boolean;
  showResults: boolean;
  securitySettings: SecuritySettings;
  onAutoSubmit: (reason: SubmissionReason) => void;
}

export function useExamAnticheat({
  isActive,
  showResults,
  securitySettings,
  onAutoSubmit,
}: UseExamAnticheatOptions) {
  const { t } = useLanguage();

  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [cheatingWarningMessage, setCheatingWarningMessage] = useState("");
  const [violationType, setViolationType] = useState<ViolationType>("other");
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isSubmittingOnExit, setIsSubmittingOnExit] = useState(false);

  const cheatingAttemptsRef = useRef(0);
  const fullscreenRetryCountRef = useRef(0);
  const violationTypeRef = useRef<ViolationType>("other");
  const isSubmittingOnExitRef = useRef(false);
  const lastViolationAtRef = useRef(0);
  const focusViolationSentRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastViewportWidthRef = useRef(0);
  const baselineViewportWidthRef = useRef(0);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullscreenEnteredRef = useRef(false);

  const submissionReasonRef = useRef<SubmissionReason>("manual");
  const violationMessagesRef = useRef<string[]>([]);

  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  const enterFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return false;
    if (!securitySettings.violationMeasuresEnabled || !securitySettings.fullscreenEnabled) {
      return false;
    }
    try {
      const el = document.documentElement as FullscreenElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      }
      if (document.fullscreenElement) {
        fullscreenEnteredRef.current = true;
        return true;
      }
    } catch {
      // Browsers or embedded preview iframes can restrict fullscreen API
    }
    return false;
  }, [securitySettings.violationMeasuresEnabled, securitySettings.fullscreenEnabled]);

  const exitFullscreenSafe = useCallback(async () => {
    if (typeof document === "undefined") return;
    fullscreenEnteredRef.current = false;
    if (document.fullscreenElement) {
      try {
        const doc = document as FullscreenDocument;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      } catch {
        // Ignore fullscreen exit errors
      }
    }
  }, []);

  const resetSecurity = useCallback(() => {
    setCheatingAttempts(0);
    cheatingAttemptsRef.current = 0;
    setFullscreenRetryCount(0);
    fullscreenRetryCountRef.current = 0;
    setShowFullscreenWarning(false);
    setShowCheatingWarning(false);
    setCheatingWarningMessage("");
    setViolationType("other");
    violationTypeRef.current = "other";
    setCountdownSeconds(null);
    setIsSubmittingOnExit(false);
    isSubmittingOnExitRef.current = false;
    fullscreenEnteredRef.current = false;
    submissionReasonRef.current = "manual";
    violationMessagesRef.current = [];
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startMaxViolationCountdown = useCallback(() => {
    submissionReasonRef.current = "cheating_violation";
    if (countdownRef.current) clearInterval(countdownRef.current);
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
  }, [t]);

  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds === 0) {
      onAutoSubmitRef.current("cheating_violation");
      setCountdownSeconds(null);
    }
  }, [countdownSeconds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isActive && !showResults) {
      lastViewportWidthRef.current = window.innerWidth;
      baselineViewportWidthRef.current = window.innerWidth;
    }
  }, [isActive, showResults]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isActive || showResults) return;

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

    const recordViolation = (
      message: string,
      type: ViolationType = "other",
      toastMessage?: string
    ) => {
      if (!isActive || showResults || !securitySettings.violationMeasuresEnabled || isSubmittingOnExitRef.current) {
        return;
      }

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

      if (toastMessage && !violationMessagesRef.current.includes(toastMessage)) {
        violationMessagesRef.current.push(toastMessage);
      }

      if (toastMessage && newCount < securitySettings.maxViolations) {
        toast.error(toastMessage);
      }

      if (newCount >= securitySettings.maxViolations) {
        startMaxViolationCountdown();
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        fullscreenEnteredRef.current = true;
        setShowFullscreenWarning(false);
        if (violationTypeRef.current === "fullscreen") {
          setShowCheatingWarning(false);
        }
        return;
      }

      if (
        fullscreenEnteredRef.current &&
        isActive &&
        !showResults &&
        securitySettings.violationMeasuresEnabled &&
        securitySettings.fullscreenEnabled
      ) {
        const newCount = fullscreenRetryCountRef.current + 1;
        fullscreenRetryCountRef.current = newCount;
        setFullscreenRetryCount(newCount);
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

        if (newCount >= securitySettings.maxViolations) {
          startMaxViolationCountdown();
        } else {
          setShowFullscreenWarning(true);
        }
      }
    };

    const isInsideDialog = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('[role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"]');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || showResults) return;
      if (isInsideDialog(e.target)) return;

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (
        !ctrlOrCmd &&
        !e.altKey &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          ["a", "A", "b", "B", "c", "C", "d", "D", "1", "2", "3", "4"].includes(e.key))
      ) {
        return;
      }

      if (securitySettings.violationMeasuresEnabled && securitySettings.copyPasteEnabled) {
        if (ctrlOrCmd && ["c", "C", "v", "V", "x", "X", "a", "A"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          recordViolation(t("copyPasteBlocked"), "copy", t("copyPasteBlocked"));
          return;
        }
      }

      if (securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
        if (
          (e.altKey && e.key === "Tab") ||
          (ctrlOrCmd && (e.key === "Tab" || ["t", "T", "w", "W", "n", "N"].includes(e.key)))
        ) {
          e.preventDefault();
          e.stopPropagation();
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            getCountMessage("tabSwitch", nextCount),
            "tabswitch",
            getCountToast("tabSwitch", nextCount)
          );
          return;
        }
      }

      if (securitySettings.violationMeasuresEnabled && securitySettings.aiDetectionEnabled) {
        if (
          e.key === "F12" ||
          e.key === "F10" ||
          (ctrlOrCmd && e.shiftKey && ["i", "I", "j", "J", "c", "C", "g", "G", "b", "B", "y", "Y", "a", "A", "l", "L", "e", "E", " "].includes(e.key)) ||
          (ctrlOrCmd && ["p", "P", "s", "S"].includes(e.key)) ||
          (e.altKey && ["i", "I", "g", "G", "b", "B", "y", "Y", "a", "A", "l", "L", "e", "E"].includes(e.key))
        ) {
          e.preventDefault();
          e.stopPropagation();
          recordViolation(t("aiShortcutBlocked"), "other", t("aiShortcutBlocked"));
          return;
        }
      }

      if (securitySettings.violationMeasuresEnabled) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning(t("examSecurity.keyboardLocked"));
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (securitySettings.violationMeasuresEnabled && securitySettings.rightClickEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.copyPasteEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      recordViolation(t("copyAttemptDetected"), "copy", t("copyNotAllowed"));
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.copyPasteEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      recordViolation(t("pasteAttemptDetected"), "paste", t("pasteNotAllowed"));
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.copyPasteEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      recordViolation(t("cutAttemptDetected"), "other", t("cutNotAllowed"));
    };

    const handleSelectStart = (e: Event) => {
      if (securitySettings.violationMeasuresEnabled && securitySettings.copyPasteEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      if (securitySettings.violationMeasuresEnabled && securitySettings.dragDropEnabled) {
        e.preventDefault();
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (securitySettings.violationMeasuresEnabled && securitySettings.dragDropEnabled) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
        if (focusViolationSentRef.current) return;
        focusViolationSentRef.current = true;
        const nextCount = cheatingAttemptsRef.current + 1;
        recordViolation(
          getCountMessage("tabSwitch", nextCount),
          "tabswitch",
          getCountToast("tabSwitch", nextCount)
        );
      }
    };

    const handleWindowBlur = () => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.tabSwitchEnabled || focusViolationSentRef.current) {
        return;
      }
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (!document.hasFocus() && isActive && !showResults) {
          focusViolationSentRef.current = true;
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            getCountMessage("blur", nextCount),
            "tabswitch",
            getCountToast("blur", nextCount)
          );
        }
      }, 900);
    };

    const handleWindowFocus = () => {
      focusViolationSentRef.current = false;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const handleViewportResize = () => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.aiDetectionEnabled) return;
      const currentWidth = window.innerWidth;
      const baselineWidth = lastViewportWidthRef.current;
      if (baselineWidth === 0) {
        lastViewportWidthRef.current = currentWidth;
        return;
      }
      if (baselineWidth - currentWidth >= 140) {
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => {
          if (baselineWidth - window.innerWidth >= 140) {
            const nextCount = cheatingAttemptsRef.current + 1;
            recordViolation(
              getCountMessage("resize", nextCount),
              "ai_detection",
              getCountToast("resize", nextCount)
            );
          }
          lastViewportWidthRef.current = window.innerWidth;
        }, 1500);
      } else {
        lastViewportWidthRef.current = currentWidth;
      }
    };

    const checkAiDom = () => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.aiDetectionEnabled) return;
      try {
        const found = document.querySelectorAll(
          '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
        );
        if (found.length > 0) {
          recordViolation(t("aiSidebarDetected"), "ai_detection", t("aiSidebarDetected"));
        }
      } catch {
        // Ignore selector errors
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActive && !showResults && !isSubmittingOnExitRef.current) {
        submissionReasonRef.current = "page_closed";
        isSubmittingOnExitRef.current = true;
        setIsSubmittingOnExit(true);
        onAutoSubmitRef.current("page_closed");
        if (securitySettings.violationMeasuresEnabled && securitySettings.tabSwitchEnabled) {
          e.preventDefault();
          e.returnValue = t("leaveExamConfirm");
          return e.returnValue;
        }
      }
    };

    const handlePopState = () => {
      if (!securitySettings.violationMeasuresEnabled || !securitySettings.tabSwitchEnabled) return;
      for (let i = 0; i < 3; i++) {
        window.history.pushState({ exam: true, index: Date.now() + i }, "", window.location.href);
      }
      const nextCount = cheatingAttemptsRef.current + 1;
      recordViolation(
        getCountMessage("backNavigation", nextCount),
        "backnavigation",
        getCountToast("backNavigation", nextCount)
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    const aiInterval = setInterval(checkAiDom, 2500);
    focusPollRef.current = securitySettings.tabSwitchEnabled
      ? setInterval(() => {
          if (isActive && !showResults && !document.hasFocus() && !focusViolationSentRef.current) {
            handleWindowBlur();
          }
        }, 1200)
      : null;

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("drop", handleDrop, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      clearInterval(aiInterval);
      if (focusPollRef.current) clearInterval(focusPollRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [isActive, showResults, securitySettings, t, startMaxViolationCountdown]);

  // Auto-dismiss minor violations (copy/paste/other)
  useEffect(() => {
    if (!showCheatingWarning) return;
    if (violationType === "fullscreen" || violationType === "tabswitch" || violationType === "ai_detection") return;
    if (fullscreenRetryCount >= securitySettings.maxViolations || cheatingAttempts >= securitySettings.maxViolations) return;

    const timer = setTimeout(() => setShowCheatingWarning(false), 3000);
    return () => clearTimeout(timer);
  }, [showCheatingWarning, violationType, fullscreenRetryCount, cheatingAttempts, securitySettings.maxViolations]);

  // Auto-clear viewport shrink / AI DOM warning when resolved
  useEffect(() => {
    if (!showCheatingWarning || violationType !== "ai_detection") return;
    const checkRestore = () => {
      if (typeof window === "undefined") return;
      const baselineW = baselineViewportWidthRef.current || 1000;
      let aiFound = false;
      try {
        aiFound =
          document.querySelectorAll(
            '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="ChatGPT" i]'
          ).length > 0;
      } catch {
        aiFound = false;
      }
      if (window.innerWidth >= baselineW - 40 && !aiFound) {
        setShowCheatingWarning(false);
      }
    };
    const id = setInterval(checkRestore, 500);
    window.addEventListener("resize", checkRestore);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", checkRestore);
    };
  }, [showCheatingWarning, violationType]);

  const totalViolations = cheatingAttempts + fullscreenRetryCount;

  return {
    cheatingAttempts,
    fullscreenRetryCount,
    totalViolations,
    violationType,
    showFullscreenWarning,
    setShowFullscreenWarning,
    showCheatingWarning,
    setShowCheatingWarning,
    cheatingWarningMessage,
    countdownSeconds,
    isSubmittingOnExit,
    setIsSubmittingOnExit,
    isSubmittingOnExitRef,
    submissionReasonRef,
    violationMessagesRef,
    enterFullscreen,
    exitFullscreenSafe,
    resetSecurity,
  };
}

export { DEFAULT_SECURITY_SETTINGS };
