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

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const triggerViolation = useCallback(
    (type: ViolationType, message: string, count: number) => {
      if (!settings.violationMeasuresEnabled) return;
      if (autoSubmitTriggeredRef.current) return;
      setViolationType(type);
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

    const handleFullscreenChange = () => {
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

      if (e.key === "Escape" || e.key === "F11") {
        if (settings.fullscreenEnabled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      if (e.ctrlKey && e.key === "w") {
        if (settings.tabSwitchEnabled) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      if (e.altKey && e.key === "Tab") {
        if (settings.tabSwitchEnabled) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      if (
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "G" ||
            e.key === "g" ||
            e.key === "B" ||
            e.key === "b" ||
            e.key === "Y" ||
            e.key === "y")) ||
        (e.altKey && (e.key === "i" || e.key === "I"))
      ) {
        if (settings.aiDetectionEnabled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toast.error(t("aiShortcutBlocked"));
          return false;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.length === 1) {
        if (settings.aiDetectionEnabled) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }

      const allowedKeys = ["ArrowLeft", "ArrowRight", "Enter", " "];
      if (!allowedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
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
      setViolationType("copy");
      setCheatingWarningMessage(t("copyAttemptDetected"));
      setShowCheatingWarning(true);
      toast.error(t("copyNotAllowed"));
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.copyPasteEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      setViolationType("paste");
      setCheatingWarningMessage(t("pasteAttemptDetected"));
      setShowCheatingWarning(true);
      toast.error(t("pasteNotAllowed"));
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.copyPasteEnabled || !examActive() || resultsShown()) return;
      e.preventDefault();
      setViolationType("other");
      setCheatingWarningMessage(t("cutAttemptDetected"));
      setShowCheatingWarning(true);
      toast.error(t("cutNotAllowed"));
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
      if (!settings.violationMeasuresEnabled || !settings.tabSwitchEnabled || !examActive() || resultsShown() || !document.hidden) return;
      const newCount = cheatingAttemptsRef.current + 1;
      cheatingAttemptsRef.current = newCount;
      setCheatingAttempts(newCount);

      triggerViolation(
        "tabswitch",
        newCount === 1
          ? t("tabSwitchViolation1")
          : newCount < settings.maxViolations
          ? t("tabSwitchViolation2")
          : t("tabSwitchViolationFinal"),
        newCount
      );

      if (newCount === 1) toast.error(t("tabSwitchWarning1"));
      else if (newCount < settings.maxViolations) toast.error(t("tabSwitchWarning2"));
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
            const newCount = cheatingAttemptsRef.current + 1;
            cheatingAttemptsRef.current = newCount;
            setCheatingAttempts(newCount);
            triggerViolation(
              "resize",
              newCount === 1
                ? t("resizeViolation1")
                : newCount < settings.maxViolations
                ? t("resizeViolation2")
                : t("resizeViolationFinal"),
              newCount
            );
            if (newCount === 1) toast.error(t("resizeWarning1"));
            else if (newCount < settings.maxViolations) toast.error(t("resizeWarning2"));
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
      window.focus();
      if (violationDebounceRef.current) return;
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        if (!document.hasFocus() && !violationDebounceRef.current) {
          window.focus();
          violationDebounceRef.current = true;
          const newCount = cheatingAttemptsRef.current + 1;
          cheatingAttemptsRef.current = newCount;
          setCheatingAttempts(newCount);
          triggerViolation(
            "blur",
            newCount === 1
              ? t("blurViolation1")
              : newCount < settings.maxViolations
              ? t("blurViolation2")
              : t("blurViolationFinal"),
            newCount
          );
          if (newCount === 1) toast.error(t("blurWarning1"));
          else if (newCount < settings.maxViolations) toast.error(t("blurWarning2"));
          setTimeout(() => {
            violationDebounceRef.current = false;
          }, 3000);
        }
      }, 1000);
    };

    const handleWindowFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
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
          '#__edge_copilot, [data-ai-sidebar], gemini-sidebar, [aria-label*="Copilot" i], [aria-label*="Gemini" i]'
        );
        if (found.length > 0) {
          violationDebounceRef.current = true;
          const newCount = cheatingAttemptsRef.current + 1;
          cheatingAttemptsRef.current = newCount;
          setCheatingAttempts(newCount);
          triggerViolation("aishortcut", t("aiSidebarDetected"), newCount);
          toast.error(t("aiSidebarDetected"));
          setTimeout(() => {
            violationDebounceRef.current = false;
          }, 3000);
        }
      } catch {
        /* invalid selector — ignore */
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
    aiDomPollRef.current = setInterval(checkAiExtensionDom, 3000);
    focusPollRef.current = settings.tabSwitchEnabled
      ? setInterval(() => {
          if (examActive() && !resultsShown() && !document.hasFocus()) {
            window.focus();
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

  // Keyboard navigation shortcuts prevention
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isActive || !settings.violationMeasuresEnabled || !settings.tabSwitchEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.violationMeasuresEnabled || !settings.tabSwitchEnabled) return;
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isActive, settings]);

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
