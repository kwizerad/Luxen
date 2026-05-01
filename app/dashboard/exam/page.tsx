"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Watermark } from "@/components/watermark";
import type { ExamCategory, ExamQuestion } from "@/lib/database.types";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Trophy, ArrowRight, Home, AlertCircle, BookOpen, Eye, Shield, Timer, HelpCircle, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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

  useEffect(() => {
    const load = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch("/api/exam/categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch {
        toast.error("Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, []);

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

  const showExamInstructions = () => {
    if (!categoryId) {
      toast.error("Select a category first");
      return;
    }
    setPendingCategoryId(categoryId);
    setShowInstructions(true);
    setInstructionsAccepted(false);
  };

  const startExam = async () => {
    if (!instructionsAccepted) {
      toast.error("Please read and accept the exam instructions");
      return;
    }
    setShowInstructions(false);
    setLoadingExam(true);
    try {
      const res = await fetch(`/api/exam/take?categoryId=${categoryId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to start exam");
        return;
      }
      setExam(data as TakeResponse);
      setCurrentIndex(0);
      setSecondsLeft((data.settings?.duration_minutes ?? 20) * 60);
      setExamStartTime(Date.now());
      setUserAnswers({});
      setShowResults(false);
      setExamResult(null);
    } catch {
      toast.error("Failed to start exam");
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

  const handleSubmitExam = async () => {
    if (!exam || !examStartTime) return;
    
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

      const res = await fetch("/api/exam/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: exam.categoryId,
          category_name: categories.find((c) => c.id === exam.categoryId)?.name || "Unknown",
          total_questions: exam.questions.length,
          answers,
          duration_seconds: durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to submit exam");
        return;
      }

      setExamResult(data.attempt);
      setShowResults(true);
      toast.success("Exam submitted successfully!");
    } catch {
      toast.error("Failed to submit exam");
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

  return (
    <main className="max-w-4xl mx-auto space-y-6 relative">
      <Watermark />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold brand-protected">Take Exam</h1>
          <p className="text-muted-foreground mt-1">Start an exam using the rules set by the admin</p>
        </div>
        {secondsLeft !== null && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Time left</div>
            <div className={`text-2xl font-bold tabular-nums ${secondsLeft < 60 ? "text-red-600" : ""}`}>
              {formatTime(secondsLeft)}
            </div>
          </div>
        )}
      </div>

      {!exam ? (
        <Card className="navo-card-brand">
          <CardHeader>
            <CardTitle>Start</CardTitle>
            <CardDescription>Select a category and begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Category</div>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingCategories}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={showExamInstructions} disabled={loadingExam || !categoryId}>
                {loadingExam ? "Starting..." : "Start Exam"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-4">
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

          <Card className="navo-card-brand">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>
                  Question {currentIndex + 1} / {exam.questions.length}
                </span>
                <Button variant="outline" size="sm" onClick={reset}>
                  Exit
                </Button>
              </CardTitle>
              <CardDescription>
                Mode: {exam.settings.sorting_mode} · Duration: {exam.settings.duration_minutes}m · Questions: {exam.questions.length}
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
                          className={`rounded-lg border p-3 cursor-pointer transition-all ${
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
                              <div className="text-sm font-semibold mb-2">Option {opt}</div>
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
      )}

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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Time limit applies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span>Questions randomized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Anti-cheating enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span>Auto-submit on timeout</span>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Important Rules
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Once started, the exam cannot be paused. The timer will continue running.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Do not refresh the page or navigate away. This may result in automatic submission.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Each question has exactly one correct answer. Select the best option.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>You can navigate between questions using Previous/Next buttons.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Unanswered questions will be marked as incorrect when time expires.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Your score and detailed results will be shown immediately after submission.</span>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Tips for Success
              </h3>
              <ul className="space-y-1 text-sm text-green-700 dark:text-green-400">
                <li>• Read each question carefully before selecting an answer</li>
                <li>• Manage your time - don't spend too long on one question</li>
                <li>• Review your answers before submitting if time permits</li>
                <li>• Stay calm and focused throughout the exam</li>
              </ul>
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
    </main>
  );
}

