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
  const [violationType, setViolationType] = useState<"fullscreen" | "tabswitch" | "copy" | "paste" | "other">("other");
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

  useEffect(() => {
    const load = async () => {
      setLoadingCategories(true);
      try {
        const data = await getExamCategories();
        setCategories(data.categories || []);
      } catch (error: any) {
        toast.error("Failed to load categories: " + error.message);
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
            ? "You have exited fullscreen mode. This is a violation of exam rules. Please re-enter fullscreen immediately."
            : newCount === 2
            ? "SECOND VIOLATION: You exited fullscreen again! One more violation and your exam will be automatically submitted."
            : "FINAL VIOLATION: Your exam is being submitted due to repeated fullscreen violations."
        );
        setShowCheatingWarning(true);
        
        // Auto-submit exam after 3 attempts
        if (newCount >= 3) {
          setTimeout(() => {
            toast.error("Exam automatically submitted due to repeated fullscreen violations.");
            handleSubmitExam();
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
        e.returnValue = 'Leaving the exam will submit your answers. Are you sure?';
        
        // Auto-submit exam when user tries to close/refresh
        setIsSubmittingOnExit(true);
        handleSubmitExam();
        return e.returnValue;
      }
    };

    // Prevent copy, paste, cut, and select during exam
    const handleCopy = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("copy");
        setCheatingWarningMessage("COPY ATTEMPT DETECTED!\n\nCopying content is strictly prohibited during the exam. This incident has been recorded.");
        setShowCheatingWarning(true);
        toast.error("Copy is not allowed during the exam!");
        return false;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("paste");
        setCheatingWarningMessage("PASTE ATTEMPT DETECTED!\n\nPasting content is strictly prohibited during the exam. This incident has been recorded.");
        setShowCheatingWarning(true);
        toast.error("Paste is not allowed during the exam!");
        return false;
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (exam && !showResults && violationMeasuresEnabled) {
        e.preventDefault();
        setViolationType("other");
        setCheatingWarningMessage("CUT ATTEMPT DETECTED!\n\nCutting content is strictly prohibited during the exam. This incident has been recorded.");
        setShowCheatingWarning(true);
        toast.error("Cut is not allowed during the exam!");
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
            ? "TAB SWITCHING DETECTED! (1/3)\n\nYou have switched tabs or minimized the browser. This is considered cheating."
            : newCount === 2
            ? "TAB SWITCHING DETECTED AGAIN! (2/3)\n\nThis is your SECOND violation. One more attempt and your exam will be submitted automatically!"
            : "CHEATING DETECTED! (3/3)\n\nYour exam is being submitted due to repeated tab switching violations."
        );
        setShowCheatingWarning(true);
        
        if (newCount === 1) {
          toast.error("Warning: Tab switching detected! (1/3)");
        } else if (newCount === 2) {
          toast.error("Warning: Tab switching detected again! (2/3) - Final warning!");
        } else if (newCount >= 3) {
          setTimeout(() => {
            toast.error("Cheating detected! Exam will be submitted automatically.");
            handleSubmitExam();
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

  const activeQuestion = useMemo(() => {
    if (!exam?.questions?.length) return null;
    return exam.questions[currentIndex] ?? null;
  }, [exam, currentIndex]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleSubmitExam();
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Force hide sidebar via DOM manipulation when exam is active
  useEffect(() => {
    const hideSidebar = () => {
      const sidebars = document.querySelectorAll('aside');
      sidebars.forEach(sidebar => {
        (sidebar as HTMLElement).style.display = 'none';
        (sidebar as HTMLElement).style.setProperty('display', 'none', 'important');
      });
      
      // Also hide floating header
      const floatingHeaders = document.querySelectorAll('[class*="floating"]');
      floatingHeaders.forEach(header => {
        (header as HTMLElement).style.display = 'none';
      });
    };

    const showSidebar = () => {
      const sidebars = document.querySelectorAll('aside');
      sidebars.forEach(sidebar => {
        (sidebar as HTMLElement).style.display = '';
        (sidebar as HTMLElement).style.removeProperty('display');
      });
      
      // Show floating header
      const floatingHeaders = document.querySelectorAll('[class*="floating"]');
      floatingHeaders.forEach(header => {
        (header as HTMLElement).style.display = '';
      });
    };

    if (exam && !showResults) {
      hideSidebar();
      // Force hide every 100ms to be sure
      const intervalId = setInterval(hideSidebar, 100);
      return () => {
        clearInterval(intervalId);
        showSidebar();
      };
    } else {
      showSidebar();
    }
  }, [exam, showResults]);

  const showExamInstructions = async () => {
    if (!categoryId) {
      toast.error("Select a category first");
      return;
    }
    setLoadingExam(true);
    try {
      const data = await getExamForTaking(categoryId);
      setExam(data);
      setShowInstructions(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load exam");
    } finally {
      setLoadingExam(false);
    }
  };

  const startExam = async () => {
    if (!instructionsAccepted) {
      toast.error("Please read and accept the exam instructions");
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
    } catch (error: any) {
      toast.error(error.message || "Failed to start exam");
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

  const handleSubmitExam = async () => {
    if (!exam || !examStartTime) return;
    
    // Check if user has answered at least one question
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0) {
      setAlertTitle("No Answers Selected");
      setAlertMessage("You haven't answered any questions yet. Please select at least one answer before submitting the exam.");
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
        category_name: categories.find((c) => c.id === exam.categoryId)?.name || "Unknown",
        total_questions: exam.questions.length,
        answers,
        duration_seconds: durationSeconds,
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
      
      toast.success("Exam submitted successfully!");
    } catch (error: any) {
      toast.error("Failed to submit exam: " + error.message);
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
      <main className="max-w-4xl mx-auto space-y-6 relative">
        <Watermark />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold brand-protected">Exam Results</h1>
            <p className="text-muted-foreground mt-1">Your performance summary</p>
          </div>
          <Button variant="outline" onClick={reset}>
            <Home className="h-4 w-4 mr-2" />
            Back to Exams
          </Button>
        </div>

        <Card className="border-primary/20 navo-card-brand">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              {examResult.category_name}
            </CardTitle>
            <CardDescription>
              Completed on {new Date(examResult.completed_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-primary">{examResult.score_percentage}%</div>
                <div className="text-sm text-muted-foreground mt-1">Score</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-green-600">{examResult.correct_answers}</div>
                <div className="text-sm text-muted-foreground mt-1">Correct</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold text-red-600">{examResult.total_questions - examResult.correct_answers}</div>
                <div className="text-sm text-muted-foreground mt-1">Incorrect</div>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <div className="text-3xl font-bold">{formatTime(examResult.duration_seconds)}</div>
                <div className="text-sm text-muted-foreground mt-1">Time</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Answer Breakdown</h3>
              {examResult.answers.map((answer: any, idx: number) => {
                const question = exam?.questions?.find((q) => q.id === answer.question_id);
                if (!question) return null;
                
                return (
                  <div key={answer.question_id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={answer.is_correct ? "default" : "destructive"}>
                            {answer.is_correct ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {answer.is_correct ? "Correct" : "Incorrect"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Question {idx + 1}</span>
                        </div>
                        {question.question && (
                          <p className="text-sm mb-2">{question.question}</p>
                        )}
                        <div className="text-sm">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={answer.is_correct ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {answer.selected_answer || "Not answered"}
                          </span>
                          {!answer.is_correct && (
                            <span className="text-muted-foreground ml-2">
                              (Correct: {question.correct_answer})
                            </span>
                          )}
                        </div>
                        {question.explanation && (
                          <div className="mt-2 p-2 bg-secondary rounded text-sm">
                            <span className="font-medium">Explanation: </span>
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
    <div className={`min-h-screen bg-background ${isExamActive ? 'select-none' : ''}`}>
      {/* Floating Navo Button */}
      {!isExamActive && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 bg-background/95 backdrop-blur-sm shadow-lg p-2">
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
      
      
      <main className="max-w-7xl mx-auto space-y-6 relative p-4 md:p-8">
        <Watermark />
        
        {/* Exam Categories - Top Left */}
        {!exam && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 lg:max-w-3xl">
              {categories.length === 0 ? (
                // Loading or no exams
                <div className="text-center py-8">
                  {loadingCategories ? (
                    <>
                      <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">Please wait...</p>
                      <p className="text-sm text-muted-foreground">Loading exam categories</p>
                    </>
                  ) : (
                    <>
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">Please wait...</p>
                      <p className="text-sm text-muted-foreground">Exams are being prepared</p>
                    </>
                  )}
                </div>
              ) : (
                // Display all exams in consistent grid layout
                <>
                  <div className="text-sm font-medium mb-6">Select Exam Category</div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                    {categories.map((category) => (
                      <Card 
                        key={category.id}
                        className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.03] hover:border-primary/60 border border-border/20 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/20"
                        onClick={() => {
                          setCategoryId(category.id);
                          setPendingCategoryId(category.id);
                          setShowInstructions(true);
                          setInstructionsAccepted(false);
                        }}
                      >
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                              Available
                            </Badge>
                          </div>
                          <CardTitle className="text-xl font-bold mt-3">{category.name}</CardTitle>
                          <CardDescription className="text-sm">
                            Click to start your exam in this category
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Questions</span>
                              <span className="font-medium">Multiple Choice</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Duration</span>
                              <span className="font-medium">Timed</span>
                            </div>
                            <Button 
                              className="w-full mt-4 group-hover:bg-primary/90 transition-colors"
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
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Exam
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
            <div className="lg:flex-1 lg:max-w-md">
              {/* This space can be used for future content like exam tips, statistics, etc. */}
            </div>
          </div>
        )}
        
        {/* Time Display - Only show during active exam */}
        {isExamActive && exam && (
          <div className="flex items-center justify-between gap-4 bg-card border rounded-lg p-4 select-none">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Progress</span>
                <span>{answeredCount} / {exam.questions.length}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Time left</div>
              <div className={`text-2xl font-bold tabular-nums ${secondsLeft < 60 ? "text-red-600" : ""}`}>
                {formatTime(secondsLeft)}
              </div>
            </div>
          </div>
        )}

      {exam ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmTitle("Quit Exam?");
                setConfirmMessage("Are you sure you want to quit? Your exam will be submitted with your current answers. This action cannot be undone.");
                setConfirmCallback(() => () => handleSubmitExam());
                setShowConfirm(true);
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Quit
            </Button>
            <Button 
              onClick={handleSubmitExam}
              disabled={submittingExam || answeredCount === 0}
              className="min-w-[120px]"
            >
              {submittingExam ? (
                "Submitting..."
              ) : (
                <>
                  Submit
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <Card 
            className="navo-card-brand select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>
                  Question {currentIndex + 1} / {exam.questions.length}
                </span>
              </CardTitle>
              <CardDescription>
                Mode: {exam.settings.sorting_mode} · Duration: {exam.settings.duration_minutes}m · Questions: {exam.questions.length}
                <span className="md:hidden text-xs text-muted-foreground ml-2">(Swipe to navigate)</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeQuestion ? (
                <>
                  {activeQuestion.question_image && (
                    <img src={activeQuestion.question_image} alt="Question" className="w-full max-h-[320px] object-contain rounded-lg border" />
                  )}
                  {activeQuestion.question && (
                    <div className="text-base font-medium">{activeQuestion.question}</div>
                  )}

                  <div className="grid gap-3">
                    {(["A", "B", "C", "D"] as const).map((opt) => {
                      const text = activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}`];
                      const img = activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}_image` as keyof ExamQuestion] as string | undefined;
                      const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                      
                      return (
                        <div 
                          key={opt} 
                          className={`rounded-lg border p-3 cursor-pointer transition-all select-none ${
                            isSelected 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handleSelectAnswer(opt)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                              isSelected ? "border-primary bg-primary text-white" : "border-border"
                            }`}>
                              {opt}
                            </div>
                            <div className="flex-1">
                              {img && <img src={img} alt={`Option ${opt}`} className="w-full max-h-[240px] object-contain rounded-md border mb-2" />}
                              {text && <div className="text-sm">{text}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      disabled={currentIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                      disabled={currentIndex >= exam.questions.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No questions returned for this category.</div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
      </main>
      
      {/* Bottom Navigation - Completely removed during active exam */}
      {!isExamActive && <MobileBottomNav />}

      {/* Exam Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="h-6 w-6 text-primary" />
              Exam Instructions
            </DialogTitle>
            <DialogDescription>
              Please read the following instructions carefully before starting your exam
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Exam Overview */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Exam Overview
              </h3>
              <div className="space-y-2 text-sm">
                <p>• This exam consists of multiple-choice questions</p>
                <p>• You will have a limited time to complete all questions</p>
                <p>• Each question has four possible answers (A, B, C, D)</p>
                <p>• Select the best answer for each question</p>
                <p>• You can navigate between questions using the Next/Previous buttons</p>
                <p>• Your answers are automatically saved</p>
              </div>
            </div>

            {/* Rules and Guidelines */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-4 w-4" />
                Important Rules - READ CAREFULLY
              </h3>
              <div className="space-y-2 text-sm text-yellow-700">
                <p>• Do not refresh the page during the exam (will auto-submit)</p>
                <p>• Do not open multiple tabs or windows (cheating detection active)</p>
                <p>• Do not switch tabs or minimize the browser (3 strikes = auto-submit)</p>
                <p>• Complete the exam in one sitting</p>
                <p>• Make sure you have a stable internet connection</p>
                <p>• You must remain in fullscreen mode during the entire exam</p>
                <p>• Exiting fullscreen 3 times will automatically submit your exam</p>
                <p>• The sidebar and all floating controls will be hidden during exam</p>
              </div>
            </div>

            {/* Security Restrictions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-red-700">
                <Shield className="h-4 w-4" />
                Security Restrictions (Strictly Enforced)
              </h3>
              <div className="space-y-2 text-sm text-red-700">
                <p>• Copy, Paste, and Cut are disabled during the exam</p>
                <p>• Text selection is limited to answer options only</p>
                <p>• Right-click context menu is disabled</p>
                <p>• Drag and drop is disabled</p>
                <p>• ESC key and F11 are blocked</p>
                <p>• Alt+Tab and Ctrl+W are blocked</p>
                <p>• Any attempt to leave the exam will trigger auto-submit</p>
                <p>• Clicking "Quit" will submit your exam immediately</p>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                <Monitor className="h-4 w-4" />
                Technical Requirements
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• Use a modern web browser (Chrome, Firefox, Safari, Edge)</p>
                <p>• Ensure JavaScript is enabled</p>
                <p>• Allow popups from this site if needed</p>
                <p>• Fullscreen mode is required and will be enforced</p>
                <p>• Do not use browser extensions that may interfere</p>
              </div>
            </div>

            {/* Acceptance */}
            <div className="flex items-start gap-3 pt-2 border-t">
              <Checkbox
                id="accept"
                checked={instructionsAccepted}
                onCheckedChange={(checked) => setInstructionsAccepted(checked as boolean)}
              />
              <label
                htmlFor="accept"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have read and understood the exam instructions. I agree to follow all rules and guidelines.
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInstructions(false)}>
              Cancel
            </Button>
            <Button
              onClick={startExam}
              disabled={!instructionsAccepted}
              className="min-w-[120px]"
            >
              {loadingExam ? "Starting..." : "Begin Exam"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Warning Dialog - NON-CLOSABLE */}
      <Dialog open={showFullscreenWarning} onOpenChange={() => {
        // Prevent closing - force user to re-enter fullscreen
        if (showFullscreenWarning) {
          toast.error("You must re-enter fullscreen to continue the exam!");
        }
      }}>
        <DialogContent 
          className="max-w-md" 
          onPointerDownOutside={(e) => {
            e.preventDefault();
            toast.error("Click outside is not allowed! Please re-enter fullscreen.");
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            toast.error("ESC is not allowed! Please re-enter fullscreen.");
          }}
          hideCloseButton={true}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
              <AlertCircle className="h-6 w-6" />
              Fullscreen Required - Action Required!
            </DialogTitle>
            <DialogDescription className="text-red-600 font-medium">
              You MUST re-enter fullscreen mode to continue. Closing this dialog is not allowed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">
                {fullscreenRetryCount === 1 
                  ? "You have exited fullscreen mode. Please re-enter fullscreen to continue your exam. You cannot close this dialog."
                  : fullscreenRetryCount === 2
                  ? "WARNING: Repeatedly exiting fullscreen may result in exam termination. Click the button below NOW."
                  : "FINAL WARNING: Exit fullscreen again and your exam will be automatically submitted. Re-enter fullscreen immediately!"
                }
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="font-medium mb-2 text-yellow-800">You MUST click this button:</p>
              <p className="text-yellow-700">• The X button is hidden</p>
              <p className="text-yellow-700">• Clicking outside is blocked</p>
              <p className="text-yellow-700">• Pressing ESC is blocked</p>
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
                  toast.error("Failed to enter fullscreen. Please try again or press F11.");
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              <Monitor className="h-5 w-5 mr-2" />
              CLICK HERE TO RE-ENTER FULLSCREEN
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
            toast.error("You must re-enter fullscreen mode first!");
          }
        } else {
          setShowCheatingWarning(false);
        }
      }}>
        <DialogContent 
          className="max-w-md border-red-500 border-2" 
          onPointerDownOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
          hideCloseButton={violationType === "fullscreen" || violationType === "tabswitch"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
              <AlertTriangle className="h-6 w-6" />
              {violationType === "fullscreen" || violationType === "tabswitch" 
                ? "⚠️ CHEATING VIOLATION DETECTED!" 
                : "⚠️ Prohibited Action Detected"}
            </DialogTitle>
            <DialogDescription className="text-red-600 font-medium whitespace-pre-line">
              {cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-semibold">
                Violation Count:
              </p>
              <p className="text-sm text-red-700">
                • Fullscreen Violations: {fullscreenRetryCount}/3
              </p>
              <p className="text-sm text-red-700">
                • Tab Switching Violations: {cheatingAttempts}/3
              </p>
              <p className="text-xs text-red-600 mt-2">
                3 violations of any type will result in automatic exam submission.
              </p>
            </div>
            
            {(violationType === "fullscreen" || violationType === "tabswitch") && fullscreenRetryCount < 3 && cheatingAttempts < 3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 font-medium">
                  Action Required:
                </p>
                <p className="text-sm text-yellow-700">
                  {violationType === "fullscreen" 
                    ? "Click the button below to re-enter fullscreen mode."
                    : "Return to this tab immediately and click acknowledge."}
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
                        toast.error("Failed to enter fullscreen. Please try again or press F11.");
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <Monitor className="h-5 w-5 mr-2" />
                    RE-ENTER FULLSCREEN NOW
                  </Button>
                )}
                {violationType === "tabswitch" && (
                  <Button 
                    onClick={() => {
                      setShowCheatingWarning(false);
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    size="lg"
                  >
                    <Shield className="h-5 w-5 mr-2" />
                    I ACKNOWLEDGE - STAY ON THIS TAB
                  </Button>
                )}
              </>
            ) : (
              <Button 
                onClick={() => setShowCheatingWarning(false)}
                className="w-full"
                variant={fullscreenRetryCount >= 3 || cheatingAttempts >= 3 ? "destructive" : "default"}
              >
                {fullscreenRetryCount >= 3 || cheatingAttempts >= 3 
                  ? "Exam Being Submitted..." 
                  : "I Understand"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Alert Dialog */}
      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-xl ${
              alertType === "error" ? "text-red-600" :
              alertType === "warning" ? "text-yellow-600" :
              alertType === "success" ? "text-green-600" :
              "text-blue-600"
            }`}>
              {alertType === "error" && <AlertCircle className="h-6 w-6" />}
              {alertType === "warning" && <AlertTriangle className="h-6 w-6" />}
              {alertType === "success" && <CheckCircle className="h-6 w-6" />}
              {alertType === "info" && <HelpCircle className="h-6 w-6" />}
              {alertTitle}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {alertMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setShowAlert(false)}
              className={`w-full ${
                alertType === "error" ? "bg-red-600 hover:bg-red-700" :
                alertType === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
                alertType === "success" ? "bg-green-600 hover:bg-green-700" :
                "bg-blue-600 hover:bg-blue-700"
              } text-white`}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md border-amber-500 border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-amber-700">
              <AlertTriangle className="h-6 w-6" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-base mt-2 whitespace-pre-line">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-4">
            <p className="text-sm text-amber-800 font-medium text-center">
              Please confirm your action
            </p>
          </div>
          <DialogFooter className="flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmCallback(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowConfirm(false);
                confirmCallback?.();
                setConfirmCallback(null);
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

