"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import type { SecuritySettings } from "@/lib/security-config";
import { DEFAULT_SECURITY_SETTINGS } from "@/lib/security-config";

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

export type ViolationType =
  | "fullscreen"
  | "tabswitch"
  | "copy"
  | "paste"
  | "backnavigation"
  | "resize"
  | "blur"
  | "aishortcut"
  | "other";

interface UseExamSecurityParams {
  settings?: SecuritySettings;
  fullscreenEnabled?: boolean;
  isActive: boolean;
  onAutoSubmit: () => void;
}

interface UseExamSecurityReturn {
  cheatingAttempts: number;
  showCheatingWarning: boolean;
  cheatingWarningMessage: string;
  violationType: ViolationType;
  fullscreenWarning: boolean;
  fullscreenRetryCount: number;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  dismissCheatingWarning: () => void;
  resetSecurity: () => void;
}

export function useExamSecurity({
  settings: settingsProp = DEFAULT_SECURITY_SETTINGS,
  fullscreenEnabled,
  isActive,
  onAutoSubmit,
}: UseExamSecurityParams): UseExamSecurityReturn {
  const { t } = useLanguage();
  const settings = useMemo(
    () => ({
      ...settingsProp,
      ...(fullscreenEnabled !== undefined ? { fullscreenEnabled } : {}),
    }),
    [settingsProp, fullscreenEnabled]
  );
  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [cheatingWarningMessage, setCheatingWarningMessage] = useState("");
  const [violationType, setViolationType] = useState<ViolationType>("other");
  const violationTypeRef = useRef<ViolationType>("other");
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);

  const lastViewportWidthRef = useRef<number>(0);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiDomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const violationDebounceRef = useRef<boolean>(false);
  const isActiveRef = useRef(isActive);
  const showResultsRef = useRef(false);
  const cheatingAttemptsRef = useRef(0);
  const fullscreenRetryCountRef = useRef(0);
  const autoSubmitTriggeredRef = useRef(false);
  const lastViolationAtRef = useRef(0);
  const focusViolationSentRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const triggerViolation = useCallback(
    (type: ViolationType, message: string, count: number) => {
      if (!settings.violationMeasuresEnabled) return;
      if (autoSubmitTriggeredRef.current) return;
      setViolationType(type);
      violationTypeRef.current = type;
      setCheatingWarningMessage(message);
      setShowCheatingWarning(true);

      const shouldAutoSubmit = count >= settings.maxViolations;

      if (type === "fullscreen") {
        if (!shouldAutoSubmit) {
          setShowFullscreenWarning(true);
        }
      }

      if (shouldAutoSubmit) {
        autoSubmitTriggeredRef.current = true;
        setTimeout(() => {
          toast.error(t("examAutoSubmitted"));
          onAutoSubmit();
        }, 3000);
      }
    },
    [t, onAutoSubmit, settings]
  );

  const requestFullscreen = useCallback(async () => {
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
      setShowCheatingWarning(false);
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
      toast.error(t("failedToEnterFullscreen"));
    }
  }, [t]);

  const exitFullscreen = useCallback(async () => {
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
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    }
  }, []);

  const dismissCheatingWarning = useCallback(() => {
    if (
      (violationType === "fullscreen" || violationType === "tabswitch") &&
      fullscreenRetryCountRef.current < settings.maxViolations &&
      cheatingAttemptsRef.current < settings.maxViolations
    ) {
      if (violationType === "fullscreen" && !document.fullscreenElement && settings.fullscreenEnabled) {
        toast.error(t("reEnterFullscreenFirst"));
        return;
      }
    }
    setShowCheatingWarning(false);
  }, [violationType, settings, t]);

  const resetSecurity = useCallback(() => {
    setCheatingAttempts(0);
    setShowCheatingWarning(false);
    setCheatingWarningMessage("");
    setViolationType("other");
    violationTypeRef.current = "other";
    setShowFullscreenWarning(false);
    setFullscreenRetryCount(0);
    cheatingAttemptsRef.current = 0;
    fullscreenRetryCountRef.current = 0;
    autoSubmitTriggeredRef.current = false;
    showResultsRef.current = false;
  }, []);

  // Main security event listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const examActive = () => isActiveRef.current && !autoSubmitTriggeredRef.current;
    const resultsShown = () => showResultsRef.current || autoSubmitTriggeredRef.current;

    const getCountMessage = (base: string, count: number) =>
      count === 1
        ? t(`${base}Violation1` as any)
        : count < settings.maxViolations
        ? t(`${base}Violation2` as any)
        : t(`${base}ViolationFinal` as any);

    const getCountToast = (base: string, count: number) =>
      count === 1
        ? t(`${base}Warning1` as any)
        : count < settings.maxViolations
        ? t(`${base}Warning2` as any)
        : t(`${base}WarningFinal` as any);

    const recordViolation = (type: ViolationType, message: string, toastMessage?: string) => {
      if (!settings.violationMeasuresEnabled || !examActive() || autoSubmitTriggeredRef.current) return;

      const now = Date.now();
      if (now - lastViolationAtRef.current < 800) return;
      lastViolationAtRef.current = now;

      const newCount = cheatingAttemptsRef.current + 1;
      cheatingAttemptsRef.current = newCount;
      setCheatingAttempts(newCount);

      triggerViolation(type, message, newCount);

      if (toastMessage && newCount < settings.maxViolations) {
        toast.error(toastMessage);
      }
    };

    const isInsideDialog = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return !!target.closest('[role="dialog"], [data-radix-popper-content-wrapper], [data-state="open"]');
    };

    const handleFullscreenChange = () => {
      // Auto-close warnings when fullscreen is restored
      if (document.fullscreenElement && examActive() && !resultsShown()) {
        setShowFullscreenWarning(false);
        if (violationTypeRef.current === "fullscreen") {
          setShowCheatingWarning(false);
        }
        return;
      }
      if (!settings.violationMeasuresEnabled || !settings.fullscreenEnabled || !examActive() || resultsShown()) return;
      if (!document.fullscreenElement) {
        const newCount = fullscreenRetryCountRef.current + 1;
        fullscreenRetryCountRef.current = newCount;
        setFullscreenRetryCount(newCount);

        triggerViolation(
          "fullscreen",
          newCount === 1
            ? t("fullscreenViolation1")
            : newCount < settings.maxViolations
            ? t("fullscreenViolation2")
            : t("fullscreenViolationFinal"),
          newCount
        );
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.violationMeasuresEnabled || !examActive() || resultsShown()) return;

      const isMac = navigator.platform?.toLowerCase().includes("mac");
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      // Escape / F11 may leave fullscreen
      if (e.key === "Escape" || e.key === "F11") {
        if (settings.fullscreenEnabled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordViolation("fullscreen", t("fullscreenViolation1"), t("fullscreenWarning1"));
          return false;
        }
        // Escape only allowed while a dialog is open
        if (e.key === "Escape" && !isInsideDialog(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      // Allow bare modifier keys
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;

      // Allow ONLY arrow keys for question navigation (no modifiers)
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") && !ctrlOrCmd && !e.altKey && !e.shiftKey) return;

      // Allow Tab/Enter/Space/Escape only while inside a dialog
      if (
        (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key === "Escape") &&
        isInsideDialog(e.target)
      ) {
        return;
      }

      // Tab / window switching shortcuts
      if (settings.tabSwitchEnabled) {
        if (
          (ctrlOrCmd && (e.key === "t" || e.key === "T" || e.key === "w" || e.key === "W" || e.key === "n" || e.key === "N" || e.key === "Tab")) ||
          (e.altKey && e.key === "Tab") ||
          (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) ||
          ((e.ctrlKey || e.metaKey) && (e.key === "[" || e.key === "]")) ||
          e.key === "F5" ||
          (ctrlOrCmd && (e.key === "r" || e.key === "R"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            "tabswitch",
            getCountMessage("tabSwitch", nextCount),
            getCountToast("tabSwitch", nextCount)
          );
          return false;
        }
      }

      // Dev tools / print / save
      if (settings.aiDetectionEnabled) {
        if (
          e.key === "F12" ||
          e.key === "F10" ||
          (ctrlOrCmd && e.shiftKey && (e.key === "i" || e.key === "I" || e.key === "j" || e.key === "J" || e.key === "c" || e.key === "C")) ||
          (ctrlOrCmd && (e.key === "p" || e.key === "P" || e.key === "s" || e.key === "S"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordViolation("aishortcut", t("aiShortcutBlocked"), t("aiShortcutBlocked"));
          return false;
        }
      }

      // Known AI shortcuts
      if (settings.aiDetectionEnabled) {
        if (
          (ctrlOrCmd &&
            e.shiftKey &&
            (e.key === "G" ||
              e.key === "g" ||
              e.key === "B" ||
              e.key === "b" ||
              e.key === "Y" ||
              e.key === "y" ||
              e.key === "I" ||
              e.key === "i" ||
              e.key === "J" ||
              e.key === "j" ||
              e.key === "C" ||
              e.key === "c" ||
              e.key === "A" ||
              e.key === "a" ||
              e.key === "L" ||
              e.key === "l" ||
              e.key === "E" ||
              e.key === "e" ||
              e.key === " ")) ||
          (e.altKey && (e.key === "i" || e.key === "I" || e.key === "g" || e.key === "G" || e.key === "b" || e.key === "B" || e.key === "y" || e.key === "Y" || e.key === "a" || e.key === "A" || e.key === "l" || e.key === "L" || e.key === "e" || e.key === "E"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          recordViolation("aishortcut", t("aiShortcutBlocked"), t("aiShortcutBlocked"));
          return false;
        }
      }

      // All other keys are blocked — only arrow keys are allowed for navigation
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      recordViolation("other", t("examSecurity.keyboardLocked"), t("examSecurity.keyboardLocked"));
      return false;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.rightClickEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.tabSwitchEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      e.returnValue = t("leaveExamConfirm");
      return e.returnValue;
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.copyPasteEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      recordViolation("copy", t("copyAttemptDetected"), t("copyNotAllowed"));
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.copyPasteEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      recordViolation("paste", t("pasteAttemptDetected"), t("pasteNotAllowed"));
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.copyPasteEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      recordViolation("other", t("cutAttemptDetected"), t("cutNotAllowed"));
      return false;
    };

    const handleSelectStart = (e: Event) => {
      if (!settings.violationMeasuresEnabled || !settings.textSelectionEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.textSelectionEnabled || !examActive() || resultsShown()) return;
      if (e.detail > 1) {
        e.preventDefault();
        return false;
      }
    };

    const handleVisibilityChange = () => {
      if (!settings.violationMeasuresEnabled || !settings.tabSwitchEnabled || !examActive() || resultsShown()) return;

      if (!document.hidden) {
        focusViolationSentRef.current = false;
        if (blurTimerRef.current) {
          clearTimeout(blurTimerRef.current);
          blurTimerRef.current = null;
        }
        return;
      }

      if (focusViolationSentRef.current) return;
      focusViolationSentRef.current = true;

      const nextCount = cheatingAttemptsRef.current + 1;
      recordViolation(
        "tabswitch",
        getCountMessage("tabSwitch", nextCount),
        getCountToast("tabSwitch", nextCount)
      );
    };

    const handleDragStart = (e: DragEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.dragDropEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      return false;
    };

    const handleDrop = (e: DragEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.dragDropEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      return false;
    };

    const handleViewportResize = () => {
      if (!settings.violationMeasuresEnabled || !settings.aiDetectionEnabled || !examActive() || resultsShown()) return;
      if (violationDebounceRef.current) return;
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
          if (stillShrunk && !violationDebounceRef.current) {
            violationDebounceRef.current = true;
            const nextCount = cheatingAttemptsRef.current + 1;
            recordViolation(
              "resize",
              getCountMessage("resize", nextCount),
              getCountToast("resize", nextCount)
            );
            setTimeout(() => {
              violationDebounceRef.current = false;
            }, 3000);
          }
          lastViewportWidthRef.current = window.innerWidth;
        }, 2000);
      } else {
        lastViewportWidthRef.current = currentWidth;
      }
    };

    const handleWindowBlur = () => {
      if (!settings.violationMeasuresEnabled || !settings.tabSwitchEnabled || !examActive() || resultsShown()) return;

      if (focusViolationSentRef.current) return;
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);

      blurTimerRef.current = setTimeout(() => {
        if (!document.hasFocus() && examActive() && !resultsShown()) {
          focusViolationSentRef.current = true;
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            "blur",
            getCountMessage("blur", nextCount),
            getCountToast("blur", nextCount)
          );
        }
      }, 800);
    };

    const handleWindowFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      focusViolationSentRef.current = false;
    };

    const handleMouseUp = () => {
      if (!settings.violationMeasuresEnabled || !settings.textSelectionEnabled || !examActive() || resultsShown()) return;
      window.getSelection()?.removeAllRanges();
    };

    const checkAiExtensionDom = () => {
      if (!settings.violationMeasuresEnabled || !settings.aiDetectionEnabled || !examActive() || resultsShown()) return;
      if (violationDebounceRef.current) return;
      try {
        const found = document.querySelectorAll(
          '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i], [aria-label*="Bard" i], [aria-label*="ChatGPT" i], [aria-label*="Claude" i], [aria-label*="Perplexity" i]'
        );
        if (found.length > 0) {
          violationDebounceRef.current = true;
          const nextCount = cheatingAttemptsRef.current + 1;
          recordViolation(
            "aishortcut",
            t("aiSidebarDetected"),
            t("aiSidebarDetected")
          );
          setTimeout(() => {
            violationDebounceRef.current = false;
          }, 3000);
          return;
        }
        // Detect AI sidebar input fields with content — warn and clear, do NOT count as violation
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
      if (!settings.violationMeasuresEnabled || !settings.aiDetectionEnabled || !examActive() || resultsShown()) return;
      const target = e.target as HTMLElement;
      if (!target) return;
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
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("drop", handleDrop, true);
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("input", handleAiInput, true);
    aiDomPollRef.current = setInterval(checkAiExtensionDom, 3000);
    focusPollRef.current = settings.tabSwitchEnabled
      ? setInterval(() => {
          if (examActive() && !resultsShown() && !document.hasFocus() && !focusViolationSentRef.current) {
            handleWindowBlur();
          }
        }, 500)
      : null;

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("mouseup", handleMouseUp, true);
      document.removeEventListener("input", handleAiInput, true);
      if (aiDomPollRef.current) {
        clearInterval(aiDomPollRef.current);
        aiDomPollRef.current = null;
      }
      if (focusPollRef.current) {
        clearInterval(focusPollRef.current);
        focusPollRef.current = null;
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };
  }, [settings, t, triggerViolation]);

  // Back button / popstate prevention
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isActive || !settings.tabSwitchEnabled) return;

    const handlePopState = () => {
      if (typeof window !== "undefined") {
        for (let i = 0; i < 3; i++) {
          window.history.pushState(
            { exam: true, index: Date.now() + i },
            "",
            window.location.href
          );
        }
      }

      const newCount = cheatingAttemptsRef.current + 1;
      cheatingAttemptsRef.current = newCount;
      setCheatingAttempts(newCount);
      triggerViolation(
        "backnavigation",
        newCount === 1
          ? t("backNavigationViolation1")
          : newCount < settings.maxViolations
          ? t("backNavigationViolation2")
          : t("backNavigationViolationFinal"),
        newCount
      );

      if (newCount === 1) toast.error(t("backNavigationWarning1"));
      else if (newCount < settings.maxViolations) toast.error(t("backNavigationWarning2"));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isActive, t, triggerViolation, settings]);

  return {
    cheatingAttempts,
    showCheatingWarning,
    cheatingWarningMessage,
    violationType,
    fullscreenWarning: showFullscreenWarning,
    fullscreenRetryCount,
    requestFullscreen,
    exitFullscreen,
    dismissCheatingWarning,
    resetSecurity,
  };
}
