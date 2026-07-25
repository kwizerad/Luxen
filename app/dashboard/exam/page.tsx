"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useBrandingConfig } from "@/lib/branding-config";
import { getExamCategories, getExamForTaking, createExamAttempt, areViolationMeasuresEnabled } from "@/lib/supabase/queries";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight, Home, AlertCircle, AlertTriangle, BookOpen, Eye, Shield, Timer, HelpCircle, ChevronRight, FileText, Play, LogOut, Monitor } from "lucide-react";
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
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";

type TakeResponse = {
  categoryId: string;
  settings: {
    question_count: number;
    duration_minutes: number;
    sorting_mode: string;
    available_from: string | null;
    available_to: string | null;
  };
  questions: ExamQuestion[];
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

export default function TakeExamPage() {
  const { config } = useBrandingConfig();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<ExamCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [loadingExam, setLoadingExam] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [exam, setExam] = useState<TakeResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [examStartTime, setExamStartTime] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [showResults, setShowResults] = useState(false);
  const [examResult, setExamResult] = useState<any>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [pendingCategoryId, setPendingCategoryId] = useState<string>("");
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenRetryCount, setFullscreenRetryCount] = useState(0);
  const [cheatingAttempts, setCheatingAttempts] = useState(0);
  const [isSubmittingOnExit, setIsSubmittingOnExit] = useState(false);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [cheatingWarningMessage, setCheatingWarningMessage] = useState("");
  const [violationType, setViolationType] = useState<"fullscreen" | "tabswitch" | "copy" | "paste" | "backnavigation" | "other">("other");
  const [violationMeasuresEnabled, setViolationMeasuresEnabled] = useState(true);
  
  // Custom alert/confirm dialog states
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"info" | "warning" | "error" | "success">("info");
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const load = async () => {
      setLoadingCategories(true);
      try {
        const data = await getExamCategories();
        setCategories(data.categories || []);
      } catch (error: any) {
        toast.error(`${t("failedToLoadCategories")}: ${error.message}`);
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
    
    // Load violation measures status
    const loadViolationStatus = async () => {
      try {
        const enabled = await areViolationMeasuresEnabled();
        setViolationMeasuresEnabled(enabled);
      } catch (error) {
        console.error("Failed to load violation measures status:", error);
      }
    };
    loadViolationStatus();

    // Clean up exam-active flag when component unmounts
    return () => {
      sessionStorage.removeItem('exam-active');
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Exam component unmounted - exam-active removed');
    };
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      // If user tries to exit full screen during exam, show warning and prevent
      if (exam && !document.fullscreenElement && !showResults && violationMeasuresEnabled) {
        const newCount = fullscreenRetryCount + 1;
        setFullscreenRetryCount(newCount);
        
        // Show cheating warning modal
        setViolationType("fullscreen");
        setCheatingWarningMessage(
          newCount === 1 
            ? t("fullscreenViolation1")
            : newCount === 2
            ? t("fullscreenViolation2")
            : t("fullscreenViolationFinal")
        );
        setShowCheatingWarning(true);
        
        // Auto-submit exam after 3 attempts
        if (newCount >= 3) {
          setTimeout(() => {
            toast.error(t("examAutoSubmitted"));
            handleSubmitExam(true);
          }, 3000);
        } else {
          // Show fullscreen warning too
          setShowFullscreenWarning(true);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC key and other fullscreen exit keys during exam
      if (exam && !showResults && violationMeasuresEnabled) {
        if (e.key === 'Escape' || e.key === 'F11') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Prevent other common exit shortcuts
        if (e.ctrlKey && e.key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu during exam
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (exam && !showResults && !isSubmittingOnExit && violationMeasuresEnabled) {
        e.preventDefault();
        e.returnValue = t("leaveExamConfirm");
        
        // Auto-submit exam when user tries to close/refresh
        setIsSubmittingOnExit(true);
        handleSubmitExam(true);
        return e.returnValue;
      }
    };

    // Prevent copy, paste, cut, and select during exam
    const handleCopy = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("copy");
        setCheatingWarningMessage(t("copyAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("copyNotAllowed"));
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("paste");
        setCheatingWarningMessage(t("pasteAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("pasteNotAllowed"));
        return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("other");
        setCheatingWarningMessage(t("cutAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("cutNotAllowed"));
        return false;
      }
    };

    // Prevent ALL text selection during exam
    const handleSelectStart = (e: Event) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent double/triple click selection
    const handleMouseDown = (e: MouseEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        // Prevent text selection via double/triple click
        if (e.detail > 1) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Track tab visibility changes (cheating detection)
    const handleVisibilityChange = () => {
      if (exam && !showResults && document.hidden && violationMeasuresEnabled) {
        const newCount = cheatingAttempts + 1;
        setCheatingAttempts(newCount);
        
        // Show cheating warning modal
        setViolationType("tabswitch");
        setCheatingWarningMessage(
          newCount === 1 
            ? t("tabSwitchViolation1")
            : newCount === 2
            ? t("tabSwitchViolation2")
            : t("tabSwitchViolationFinal")
        );
        setShowCheatingWarning(true);
        
        if (newCount === 1) {
          toast.error(t("tabSwitchWarning1"));
        } else if (newCount === 2) {
          toast.error(t("tabSwitchWarning2"));
        } else if (newCount >= 3) {
          setTimeout(() => {
            toast.error(t("tabSwitchWarningFinal"));
            handleSubmitExam(true);
          }, 3000);
        }
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        return false;
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clipboard protection
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    // Tab visibility tracking
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Drag and drop prevention
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('drop', handleDrop, true);

    return () => {
      // Clean up event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Remove clipboard protection
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      
      // Remove visibility tracking
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Remove drag prevention
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('drop', handleDrop, true);
    };
  }, [exam, showResults, violationMeasuresEnabled]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // If user tries to exit full screen during exam, show warning and prevent
      if (exam && !document.fullscreenElement && !showResults && violationMeasuresEnabled) {
        const newCount = fullscreenRetryCount + 1;
        setFullscreenRetryCount(newCount);
        
        // Show cheating warning modal
        setViolationType("fullscreen");
        setCheatingWarningMessage(
          newCount === 1 
            ? t("fullscreenViolation1")
            : newCount === 2
            ? t("fullscreenViolation2")
            : t("fullscreenViolationFinal")
        );
        setShowCheatingWarning(true);
        
        // Auto-submit exam after 3 attempts
        if (newCount >= 3) {
          setTimeout(() => {
            toast.error(t("examAutoSubmitted"));
            handleSubmitExam(true);
          }, 3000);
        } else {
          // Show fullscreen warning too
          setShowFullscreenWarning(true);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent ESC key and other fullscreen exit keys during exam
      if (exam && !showResults && violationMeasuresEnabled) {
        if (e.key === 'Escape' || e.key === 'F11') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        
        // Prevent other common exit shortcuts
        if (e.ctrlKey && e.key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent right-click context menu during exam
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (exam && !showResults && !isSubmittingOnExit && violationMeasuresEnabled) {
        e.preventDefault();
        e.returnValue = t("leaveExamConfirm");
        
        // Auto-submit exam when user tries to close/refresh
        setIsSubmittingOnExit(true);
        handleSubmitExam(true);
        return e.returnValue;
      }
    };

    // Prevent copy, paste, cut, and select during exam
    const handleCopy = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("copy");
        setCheatingWarningMessage(t("copyAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("copyNotAllowed"));
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("paste");
        setCheatingWarningMessage(t("pasteAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("pasteNotAllowed"));
        return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("other");
        setCheatingWarningMessage(t("cutAttemptDetected"));
        setShowCheatingWarning(true);
        toast.error(t("cutNotAllowed"));
        return false;
      }
    };

    // Prevent ALL text selection during exam
    const handleSelectStart = (e: Event) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent double/triple click selection
    const handleMouseDown = (e: MouseEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        // Prevent text selection via double/triple click
        if (e.detail > 1) {
          e.preventDefault();
          return false;
        }
      }
    };

    // Track tab visibility changes (cheating detection)
    const handleVisibilityChange = () => {
      if (exam && !showResults && document.hidden && violationMeasuresEnabled) {
        const newCount = cheatingAttempts + 1;
        setCheatingAttempts(newCount);
        
        // Show cheating warning modal
        setViolationType("tabswitch");
        setCheatingWarningMessage(
          newCount === 1 
            ? t("tabSwitchViolation1")
            : newCount === 2
            ? t("tabSwitchViolation2")
            : t("tabSwitchViolationFinal")
        );
        setShowCheatingWarning(true);
        
        if (newCount === 1) {
          toast.error(t("tabSwitchWarning1"));
        } else if (newCount === 2) {
          toast.error(t("tabSwitchWarning2"));
        } else if (newCount >= 3) {
          setTimeout(() => {
            toast.error(t("tabSwitchWarningFinal"));
            handleSubmitExam(true);
          }, 3000);
        }
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e: DragEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        return false;
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clipboard protection
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('cut', handleCut, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    // Tab visibility tracking
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Drag and drop prevention
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('drop', handleDrop, true);

    return () => {
      // Clean up event listeners
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Remove clipboard protection
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('cut', handleCut, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      
      // Remove visibility tracking
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Remove drag prevention
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('drop', handleDrop, true);
    };
  }, [exam, showResults, violationMeasuresEnabled]);

  // Prevent back button / smartphone back gesture during exam
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!exam || showResults || !violationMeasuresEnabled) return;

    const handlePopState = (e: PopStateEvent) => {
      // Push multiple history states back so the user cannot navigate away
      if (typeof window !== 'undefined') {
        for (let i = 0; i < 3; i++) {
          window.history.pushState({ exam: true, index: Date.now() + i }, '', window.location.href);
        }
      }

      const newCount = cheatingAttempts + 1;
      setCheatingAttempts(newCount);
      setViolationType('backnavigation');
      setCheatingWarningMessage(
        newCount === 1
          ? t("backNavigationViolation1")
          : newCount === 2
          ? t("backNavigationViolation2")
          : t("backNavigationViolationFinal")
      );
      setShowCheatingWarning(true);

      if (newCount === 1) {
        toast.error(t("backNavigationWarning1"));
      } else if (newCount === 2) {
        toast.error(t("backNavigationWarning2"));
      } else if (newCount >= 3) {
        setTimeout(() => {
          toast.error(t("backNavigationWarningFinal"));
          handleSubmitExam(true);
        }, 3000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [exam, showResults, violationMeasuresEnabled, cheatingAttempts]);

  // Prevent keyboard navigation shortcuts (Alt+Left/Right, Cmd+[/]) during exam
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!exam || showResults || !violationMeasuresEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Left/Right arrow (browser back/forward in many browsers)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Cmd/Ctrl + [ or ] (back/forward on macOS and some browsers)
      if ((e.metaKey || e.ctrlKey) && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [exam, showResults, violationMeasuresEnabled]);

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
      handleSubmitExam(true);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const showExamInstructions = async () => {
    if (!categoryId) {
      toast.error(t("selectCategoryFirst"));
      return;
    }
    setLoadingExam(true);
    try {
      const data = await getExamForTaking(categoryId);
      setExam(data);
      setShowInstructions(true);
    } catch (error: any) {
      toast.error(error.message || t("failedToLoadExam"));
    } finally {
      setLoadingExam(false);
    }
  };

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
      setExamStartTime(Date.now());
      setUserAnswers({});
      setShowResults(false);
      setExamResult(null);
      setShowFullscreenWarning(false);
      setFullscreenRetryCount(0);
      
      // Enter full screen mode only if violation measures are enabled
      if (violationMeasuresEnabled) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
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
    } catch (error: any) {
      toast.error(error.message || t("failedToStartExam"));
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
  }, [touchStart, touchEnd, exam, currentIndex]);

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!exam || !examStartTime) return;

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
    try {
      const durationSeconds = Math.floor((Date.now() - examStartTime) / 1000);

      const answers = exam.questions.map((q) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer?.selectedAnswer === q.correct_answer;
        return {
          question_id: q.id,
          selected_answer: userAnswer?.selectedAnswer || null,
          is_correct: isCorrect,
          time_spent_seconds: userAnswer ? Math.floor((Date.now() - userAnswer.timeStarted) / 1000) : 0,
        };
      });

      const data = await createExamAttempt({
        category_id: exam.categoryId,
        category_name: categories.find((c) => c.id === exam.categoryId)?.name || t("unknown"),
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
        status: answeredCount > 0 ? 'completed' : 'abandoned',
      });

      setExamResult(data.attempt);
      setShowResults(true);
      
      // Remove exam-active flag
      sessionStorage.removeItem('exam-active');
      
      // Dispatch custom event to notify layout
      window.dispatchEvent(new CustomEvent('exam-state-change'));
      console.log('Exam submitted - exam-active removed');
      
      // Exit full screen mode when exam is completed
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
      
      toast.success(t("examSubmittedSuccess"));
    } catch (error: any) {
      toast.error(`${t("failedToSubmitExam")}: ${error.message}`);
    } finally {
      setSubmittingExam(false);
    }
  };

  const reset = () => {
    setExam(null);
    setCurrentIndex(0);
    setSecondsLeft(null);
    setExamStartTime(null);
    setUserAnswers({});
    setShowResults(false);
    setExamResult(null);
    setShowFullscreenWarning(false);
    setFullscreenRetryCount(0);
    setCheatingAttempts(0);
    setIsSubmittingOnExit(false);
    setShowCheatingWarning(false);
    setCheatingWarningMessage("");
    setViolationType("other");
    
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

  const answeredCount = Object.keys(userAnswers).length;
  const progress = exam ? (answeredCount / exam.questions.length) * 100 : 0;

  if (showResults && examResult) {
    return (
      <main className="student-page student-page-no-nav relative !mx-auto max-w-5xl">        <Watermark />
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold brand-protected">{t("examResults")}</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">{t("yourPerformanceSummary")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            {t("backToExams")}
          </Button>
        </div>

        <Card className="border-primary/20 navo-card-brand rounded-[14px] sm:rounded-[24px]">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              {examResult.category_name}
            </CardTitle>
            <CardDescription className="text-[11px] sm:text-sm">
              {t("completedOn")} {new Date(examResult.completed_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-primary leading-tight">{examResult.score_percentage}%</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("score")}</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-green-600 leading-tight">{examResult.correct_answers}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("correct")}</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold text-red-600 leading-tight">{examResult.total_questions - examResult.correct_answers}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("incorrect")}</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-secondary rounded-[10px] sm:rounded-lg">
                <div className="text-xl sm:text-3xl font-bold leading-tight">{formatTime(examResult.duration_seconds)}</div>
                <div className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{t("time")}</div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-sm sm:text-base">{t("answerBreakdown")}</h3>
              {examResult.answers.map((answer: any, idx: number) => {
                const question = exam?.questions?.find((q) => q.id === answer.question_id);
                if (!question) return null;
                
                return (
                  <div key={answer.question_id} className="p-2.5 sm:p-4 border rounded-[10px] sm:rounded-lg">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2 flex-wrap">
                          <Badge variant={answer.is_correct ? "default" : "destructive"} className="text-[10px] sm:text-xs">
                            {answer.is_correct ? (
                              <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            ) : (
                              <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                            )}
                            {answer.is_correct ? t("correct") : t("incorrect")}
                          </Badge>
                          <span className="text-[11px] sm:text-sm text-muted-foreground">{t("question")} {idx + 1}</span>
                        </div>
                        {question.question && (
                          <p className="text-xs sm:text-sm mb-1.5 sm:mb-2">{question.question}</p>
                        )}
                        <div className="text-xs sm:text-sm">
                          <span className="text-muted-foreground">{t("yourAnswer")}: </span>
                          <span className={answer.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {answer.selected_answer || t("notAnswered")}
                          </span>
                          {!answer.is_correct && (
                            <span className="text-muted-foreground ml-2">
                              ({t("correctColon")} {question.correct_answer})
                            </span>
                          )}
                        </div>
                        {question.explanation && (
                          <div className="mt-1.5 sm:mt-2 p-2 bg-secondary rounded text-xs sm:text-sm">
                            <span className="font-medium">{t("explanationColon")} </span>
                            {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isExamActive = exam !== null && secondsLeft !== null;

  return (
    <div className={`bg-transparent ${isExamActive ? 'select-none' : ''}`}>
      {/* Floating Navo Button */}
      {!isExamActive && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Link href="/dashboard" className="premium-glass-panel flex items-center gap-2 rounded-full border p-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.systemName} className="w-full h-full object-cover" />
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
                    <>
                      <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">{t("pleaseWait")}</p>
                      <p className="text-sm text-muted-foreground">{t("loadingExamCategories")}</p>
                    </>
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
                          setPendingCategoryId(category.id);
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
                              <span className="text-muted-foreground">{t("questions")}</span>
                              <span className="font-medium">{t("multipleChoice")}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] sm:text-sm">
                              <span className="text-muted-foreground">{t("duration")}</span>
                              <span className="font-medium">{t("timed")}</span>
                            </div>
                            <Button 
                              size="sm"
                              className="w-full mt-3 sm:mt-4 group-hover:bg-primary/90 transition-colors"
                              disabled={loadingExam}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryId(category.id);
                                setPendingCategoryId(category.id);
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
                <div className="h-1.5 sm:h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
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
          {/* Top action bar: quit + submit */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmTitle(t("quitExamTitle"));
                setConfirmMessage(t("quitExamMessage"));
                setConfirmCallback(() => () => handleSubmitExam(true));
                setShowConfirm(true);
              }}
              className="gap-2"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t("quit")}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmitExam()}
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

          <Card
            className="navo-card-brand select-none rounded-[14px] sm:rounded-[24px]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
                {t("examModeLabel")}: {exam.settings.sorting_mode} · {t("examDurationLabel")}: {exam.settings.duration_minutes}m · {t("examQuestionsLabel")}: {exam.questions.length}
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
                  {activeQuestion.question_image && (
                    <img src={activeQuestion.question_image} alt={t("question")} className="w-full max-h-[240px] sm:max-h-[320px] object-contain rounded-[10px] sm:rounded-lg border" />
                  )}
                  {activeQuestion.question && (
                    <div className="text-sm sm:text-base font-medium">{activeQuestion.question}</div>
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
                              {img && <img src={img} alt={`${t("option")} ${opt}`} className="w-full max-h-[180px] sm:max-h-[240px] object-contain rounded-md border mb-2" />}
                              {text && <div className="text-xs sm:text-sm">{text}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1.5 sm:pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                    >
                      {t("previous")}
                    </Button>
                    <Button
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
      
      {/* Bottom Navigation - Completely removed during active exam */}
      {!isExamActive && <MobileBottomNav hide />}

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
                  : fullscreenRetryCount === 2
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
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    await (document.documentElement as any).webkitRequestFullscreen();
                  } else if ((document.documentElement as any).msRequestFullscreen) {
                    await (document.documentElement as any).msRequestFullscreen();
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
      <Dialog open={showCheatingWarning} onOpenChange={() => {
        // Prevent closing if it's a serious violation (fullscreen or tabswitch)
        if ((violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < 3 && cheatingAttempts < 3) {
          // Allow closing only if user is re-entering fullscreen
          if (document.fullscreenElement) {
            setShowCheatingWarning(false);
          } else {
            toast.error(t("reEnterFullscreenFirst"));
          }
        } else {
          setShowCheatingWarning(false);
        }
      }}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[calc(100dvh-6rem)] sm:max-h-[90vh] overflow-y-auto border-red-500 border-2"
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
          hideCloseButton={violationType === "fullscreen" || violationType === "tabswitch"}
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
                • {t("violationCount.fullscreen")}: {fullscreenRetryCount}/3
              </p>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">
                • {t("violationCount.tabSwitch")}: {cheatingAttempts}/3
              </p>
              <p className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 mt-1.5 sm:mt-2">
                {t("violationCount.autoSubmitWarning")}
              </p>
            </div>

            {(violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < 3 && cheatingAttempts < 3 && (
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
            {(violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < 3 && cheatingAttempts < 3 ? (
              <>
                {violationType === "fullscreen" && (
                  <Button
                    onClick={async () => {
                      try {
                        if (document.documentElement.requestFullscreen) {
                          await document.documentElement.requestFullscreen();
                        } else if ((document.documentElement as any).webkitRequestFullscreen) {
                          await (document.documentElement as any).webkitRequestFullscreen();
                        } else if ((document.documentElement as any).msRequestFullscreen) {
                          await (document.documentElement as any).msRequestFullscreen();
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
              <Button
                onClick={() => setShowCheatingWarning(false)}
                className="w-full"
                size="sm"
                variant={fullscreenRetryCount >= 3 || cheatingAttempts >= 3 ? "destructive" : "default"}
              >
                {fullscreenRetryCount >= 3 || cheatingAttempts >= 3
                  ? t("examBeingSubmitted")
                  : t("iUnderstand")}
              </Button>
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

