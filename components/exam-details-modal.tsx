"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Clock, CheckCircle, XCircle, Trophy, TrendingUp, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import type { ExamAttempt, ExamAnswer, ExamQuestion } from "@/lib/database.types";
import { useLanguage } from "@/lib/language-context";

interface ExamDetailsModalProps {
  attempt: ExamAttempt | null;
  open: boolean;
  onClose: () => void;
}

interface ExtendedExamAnswer extends ExamAnswer {
  question: ExamQuestion | null;
}

export function ExamDetailsModal({ attempt, open, onClose }: ExamDetailsModalProps) {
  const { t } = useLanguage();

  if (!attempt) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'questions'>('overview');

  const answers = attempt.answers as ExtendedExamAnswer[];
  const currentAnswer = answers[currentQuestionIndex];
  const currentQuestion = currentAnswer?.question;

  const nextQuestion = () => {
    if (currentQuestionIndex < answers.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const goToQuestions = () => {
    setCurrentView('questions');
  };

  const goToOverview = () => {
    setCurrentView('overview');
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextQuestion();
    }
    if (isRightSwipe) {
      previousQuestion();
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (open) {
      setCurrentQuestionIndex(0);
      setCurrentView('overview');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] sm:w-full h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-3 py-3 sm:px-6 sm:py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {t("examDetails")} - {attempt.category_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Side Navigation Icons */}
          <div className="flex items-center justify-between absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
            {currentView === 'questions' && currentQuestionIndex > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={previousQuestion}
                className="rounded-full bg-background shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                title={t("previousQuestion")}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
            {currentView === 'overview' ? (
              <Button
                variant="outline"
                size="icon"
                onClick={goToQuestions}
                className="rounded-full bg-background shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                title={t("viewQuestions")}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : currentView === 'questions' && currentQuestionIndex < answers.length - 1 ? (
              <Button
                variant="outline"
                size="icon"
                onClick={nextQuestion}
                className="rounded-full bg-background shadow-lg h-8 w-8 sm:h-10 sm:w-10"
                title={t("nextQuestion")}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            ) : null}
          </div>

          {/* Content Part */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {currentView === 'overview' ? (
              /* Exam Overview Page */
              <div className="flex flex-col p-3 sm:p-4 md:p-6">
                <div className="flex-1">
                  <Card className="rounded-[14px] sm:rounded-[24px]">
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">{t("examDetails.overview")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-6">
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl md:text-3xl font-bold text-primary leading-tight">{attempt.score_percentage}%</div>
                          <div className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">{t("score")}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600 leading-tight">{attempt.correct_answers}</div>
                          <div className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">{t("correct")}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl md:text-3xl font-bold text-red-600 leading-tight">{attempt.total_questions - attempt.correct_answers}</div>
                          <div className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">{t("incorrect")}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg sm:text-2xl md:text-3xl font-bold leading-tight">{formatTime(attempt.duration_seconds)}</div>
                          <div className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">{t("duration")}</div>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-sm text-muted-foreground">
                        <span className="truncate">{t("started")}: {new Date(attempt.started_at).toLocaleString()}</span>
                        {attempt.completed_at && (
                          <span className="truncate">{t("completed")}: {new Date(attempt.completed_at).toLocaleString()}</span>
                        )}
                      </div>

                      {/* Question Summary */}
                      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">{t("questionSummary")}</h3>
                        <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 sm:gap-2">
                          {answers.map((answer, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setCurrentQuestionIndex(index);
                                goToQuestions();
                              }}
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all hover:scale-110 ${
                                answer.is_correct 
                                  ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600' 
                                  : 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                              }`}
                              title={`${t("examDetails.question")} ${index + 1}: ${answer.is_correct ? t("correct") : t("incorrect")}`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-center mt-6 pb-4">
                  <Button
                    onClick={goToQuestions}
                    className="flex items-center gap-2"
                    size="lg"
                  >
                    {t("viewQuestions")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Questions Page */
              <div className="flex flex-col p-3 sm:p-4 md:p-6">
                {/* Toggle Correct Answers */}
                <div className="flex-shrink-0 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-semibold">{t("examDetails.questionReview")}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                      className="h-7 sm:h-8 text-[11px] sm:text-xs"
                    >
                      {showCorrectAnswers ? (
                        <>
                          <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          {t("examDetails.hideAnswers")}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          {t("examDetails.showAnswers")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Question Progress Indicator */}
                <div className="flex-shrink-0">
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <span className="text-[11px] sm:text-sm font-medium text-muted-foreground">
                      {t("examDetails.question")} {currentQuestionIndex + 1} {t("examDetails.of")} {answers.length}
                    </span>
                    <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 sm:gap-2 max-h-20 sm:max-h-24 sm:max-h-32 overflow-y-auto">
                      {answers.map((answer, index) => (
                        <button
                          key={index}
                          onClick={() => goToQuestion(index)}
                          className={`w-6 h-6 sm:w-7 sm:h-7 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-medium transition-all hover:scale-110 ${
                            index === currentQuestionIndex
                              ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                              : answer.is_correct
                                ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600'
                                : 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600'
                          }`}
                          aria-label={`${t("examDetails.goToQuestion")} ${index + 1}`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Single Question Display */}
                <div 
                  className="flex-1 min-h-0"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {currentAnswer && currentQuestion && (
                    <div className={`border rounded-[10px] sm:rounded-lg p-3 sm:p-6 space-y-3 sm:space-y-4 ${
                      currentAnswer.is_correct 
                        ? 'border-green-500/30 bg-green-500/5 dark:border-green-500/40 dark:bg-green-500/10' 
                        : 'border-red-500/30 bg-red-500/5 dark:border-red-500/40 dark:bg-red-500/10'
                    }`}>
                      {/* Question Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg font-bold shrink-0 ${
                            currentAnswer.is_correct 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-red-500 text-white border-red-500'
                          }`}>
                            {currentQuestionIndex + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-sm sm:text-lg">{t("examDetails.question")} {currentQuestionIndex + 1}</span>
                            <div className="text-[11px] sm:text-sm text-muted-foreground">
                              {currentAnswer.is_correct ? t("correct") : t("incorrect")}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={currentAnswer.is_correct ? "default" : "destructive"}
                          className="text-[10px] sm:text-sm shrink-0"
                        >
                          {currentAnswer.is_correct ? (
                            <>
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {t("correct")}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {t("incorrect")}
                            </>
                          )}
                        </Badge>
                      </div>

                      {/* Question Content */}
                      <div className="space-y-3 sm:space-y-4">
                        {/* Question Text */}
                        {currentQuestion.question && (
                          <div className="text-xs sm:text-sm sm:text-base leading-relaxed font-medium">
                            {currentQuestion.question}
                          </div>
                        )}
                        
                        {/* Question Image */}
                        {currentQuestion.question_image && (
                          <div>
                            <img 
                              src={currentQuestion.question_image} 
                              alt={t("examDetails.questionImage")} 
                              className="max-w-full h-auto rounded-[10px] sm:rounded-lg border max-h-36 sm:max-h-48 sm:max-h-64 object-contain"
                            />
                          </div>
                        )}
                        
                        {/* Options */}
                        <div className="space-y-2 sm:space-y-3">
                          {['A', 'B', 'C', 'D'].map((option) => {
                            const optionText = currentQuestion[`option_${option.toLowerCase()}` as keyof ExamQuestion];
                            const optionImage = currentQuestion[`option_${option.toLowerCase()}_image` as keyof ExamQuestion];
                            const isSelected = currentAnswer.selected_answer === option;
                            const isCorrect = currentQuestion.correct_answer === option;
                            
                            if (!optionText && !optionImage) return null;
                            
                            return (
                              <div 
                                key={option}
                                className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-[10px] sm:rounded-lg border ${
                                  isSelected 
                                    ? isCorrect 
                                      ? 'bg-green-500/10 border-green-500/30 dark:bg-green-500/20 dark:border-green-500/40' 
                                      : 'bg-red-500/10 border-red-500/30 dark:bg-red-500/20 dark:border-red-500/40'
                                    : isCorrect && showCorrectAnswers
                                      ? 'bg-green-500/5 border-green-500/20 dark:bg-green-500/10 dark:border-green-500/30'
                                      : 'bg-muted/50 border-border'
                                }`}
                              >
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[10px] sm:text-sm font-bold flex-shrink-0 mt-0.5 ${
                                  isSelected 
                                    ? isCorrect 
                                      ? 'bg-green-600 text-white border-green-600' 
                                      : 'bg-red-600 text-white border-red-600'
                                    : isCorrect && showCorrectAnswers
                                      ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30'
                                }`}>
                                  {option}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {optionText && (
                                    <div className="text-xs sm:text-base break-words">{optionText}</div>
                                  )}
                                  {optionImage && (
                                    <img 
                                      src={optionImage as string} 
                                      alt={`${t("examDetails.option")} ${option}`} 
                                      className="mt-1.5 sm:mt-2 max-w-full h-auto rounded border max-h-32 sm:max-h-40 object-contain border-border"
                                    />
                                  )}
                                </div>
                                {isSelected && (
                                  <Badge variant="outline" className="text-[10px] sm:text-sm ml-1.5 sm:ml-2 flex-shrink-0">
                                    {t("yourAnswer")}
                                  </Badge>
                                )}
                                {isCorrect && showCorrectAnswers && !isSelected && (
                                  <Badge variant="default" className="text-[10px] sm:text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-600 ml-1.5 sm:ml-2 flex-shrink-0">
                                    {t("correct")}
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Explanation */}
                        {showCorrectAnswers && currentQuestion.explanation && (
                          <div className="bg-blue-500/10 border border-blue-500/30 dark:bg-blue-500/20 dark:border-blue-500/40 rounded-[10px] sm:rounded-lg p-3 sm:p-4">
                            <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-1.5 sm:mb-2">{t("examDetails.explanation")}:</div>
                            <div className="text-xs sm:text-base text-blue-800 dark:text-blue-200">{currentQuestion.explanation}</div>
                          </div>
                        )}
                        
                        {/* Time spent */}
                        {currentAnswer.time_spent_seconds && (
                          <div className="text-[11px] sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {t("examDetails.timeSpent")}: {formatTime(currentAnswer.time_spent_seconds)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex-shrink-0 pt-3 sm:pt-4 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                    >
                      <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{t("previous")}</span>
                    </Button>
                    
                    <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {currentQuestionIndex + 1} / {answers.length}
                    </div>
                    
                    <Button
                      variant="outline"
                      onClick={nextQuestion}
                      disabled={currentQuestionIndex === answers.length - 1}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                    >
                      <span className="hidden sm:inline">{t("next")}</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
