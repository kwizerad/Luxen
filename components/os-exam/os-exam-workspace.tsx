"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  LogOut,
  Monitor,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SmartImage } from "@/components/smart-image";
import { QuestionTTSButton } from "@/components/course/question-tts-button";
import { GroupExamLiveHUD } from "@/components/group-exam-live-hud";
import { useLanguage } from "@/lib/language-context";
import type { ExamQuestion } from "@/lib/database.types";
import type { SecuritySettings } from "@/lib/security-config";
import type { ViolationType } from "@/hooks/use-exam-anticheat";
import { cn } from "@/lib/utils";

export type TakeExamQuestion = Omit<ExamQuestion, "correct_answer" | "explanation"> &
  Partial<Pick<ExamQuestion, "correct_answer" | "explanation">>;

export type TakeExamResponse = {
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

export type UserAnswer = {
  questionId: string;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  timeStarted: number;
};

interface OSExamWorkspaceProps {
  exam: TakeExamResponse;
  categoryTitle: string;
  examLanguage: string;
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  secondsLeft: number | null;
  userAnswers: Record<string, UserAnswer>;
  onSelectAnswer: (answer: "A" | "B" | "C" | "D") => void;
  submittingExam: boolean;
  onRequestQuit: () => void;
  onInitiateSubmit: () => void;
  onConfirmSubmit: () => void;
  showPreSubmitModal: boolean;
  setShowPreSubmitModal: (open: boolean) => void;
  challengeId?: string;
  currentUserId?: string;
  // Security props
  securitySettings: SecuritySettings;
  totalViolations: number;
  cheatingAttempts: number;
  fullscreenRetryCount: number;
  violationType: ViolationType;
  showFullscreenWarning: boolean;
  setShowFullscreenWarning: (open: boolean) => void;
  showCheatingWarning: boolean;
  setShowCheatingWarning: (open: boolean) => void;
  cheatingWarningMessage: string;
  countdownSeconds: number | null;
  onEnterFullscreen: () => Promise<boolean>;
  // Alert / Confirm dialogs
  showAlert: boolean;
  setShowAlert: (open: boolean) => void;
  alertTitle: string;
  alertMessage: string;
  alertType: "info" | "warning" | "error" | "success";
  showConfirm: boolean;
  setShowConfirm: (open: boolean) => void;
  confirmTitle: string;
  confirmMessage: string;
  onConfirmAction: () => void;
  onCancelConfirm: () => void;
}

function formatTime(totalSeconds: number | null) {
  if (totalSeconds === null || totalSeconds === undefined) return "00:00";
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function OSExamWorkspace({
  exam,
  categoryTitle,
  examLanguage,
  currentIndex,
  onChangeIndex,
  secondsLeft,
  userAnswers,
  onSelectAnswer,
  submittingExam,
  onRequestQuit,
  onInitiateSubmit,
  onConfirmSubmit,
  showPreSubmitModal,
  setShowPreSubmitModal,
  challengeId,
  currentUserId,
  securitySettings,
  totalViolations,
  cheatingAttempts,
  fullscreenRetryCount,
  violationType,
  showFullscreenWarning,
  setShowFullscreenWarning,
  showCheatingWarning,
  setShowCheatingWarning,
  cheatingWarningMessage,
  countdownSeconds,
  onEnterFullscreen,
  showAlert,
  setShowAlert,
  alertTitle,
  alertMessage,
  alertType,
  showConfirm,
  setShowConfirm,
  confirmTitle,
  confirmMessage,
  onConfirmAction,
  onCancelConfirm,
}: OSExamWorkspaceProps) {
  const { t, language } = useLanguage();

  const activeQuestion = exam.questions[currentIndex] ?? null;
  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = exam.questions.length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const getViolationLabel = (type: ViolationType) => {
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
      default:
        return t("violationLabels.other") || "Security violation";
    }
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 select-none bg-background dark:bg-zinc-950"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Minimal Edge-to-Edge Top Focus Strip */}
      <header className="sticky top-0 z-20 bg-background/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-12 sm:h-14 flex items-center justify-between gap-2">
          {/* Left: Clean Question Counter & Exam Track */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
              {String(currentIndex + 1).padStart(2, "0")} / {String(totalQuestions).padStart(2, "0")}
            </span>
            <span className="text-muted-foreground/40 hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {categoryTitle} ({examLanguage})
            </span>
          </div>

          {/* Right: Security Alert (if any) · Timer · Quit · Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {totalViolations > 0 && (
              <div
                title={getViolationLabel(violationType)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-mono font-semibold tabular-nums whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {totalViolations}
                  {securitySettings.maxViolations ? `/${securitySettings.maxViolations}` : ""}
                </span>
              </div>
            )}

            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-sm font-mono font-semibold tabular-nums whitespace-nowrap shrink-0",
                secondsLeft !== null && secondsLeft < 60
                  ? "bg-red-500/12 text-red-600 dark:text-red-400"
                  : "bg-muted/60 text-foreground"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 opacity-75" />
              <span>{formatTime(secondsLeft)}</span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRequestQuit}
              className="h-8 px-2 sm:px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden xs:inline sm:inline">{t("quit") || "Quit"}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onInitiateSubmit}
              disabled={submittingExam || answeredCount === 0}
              className="h-8 px-3 sm:px-4 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {submittingExam ? (
                t("submitting") || "Submitting..."
              ) : (
                <>
                  {t("submit") || "Submit"}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hairline Top-Edge Progress Bar */}
        <div className="h-[2px] w-full bg-border/30">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Live Group Challenge HUD */}
      {challengeId && currentUserId && (
        <div className="max-w-5xl w-full mx-auto px-3 sm:px-6 pt-3">
          <GroupExamLiveHUD
            challengeId={challengeId}
            currentUserId={currentUserId}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            totalQuestions={totalQuestions}
            isExamActive={true}
          />
        </div>
      )}

      {/* Focused Editorial Stage (No Cards-Within-Cards, No Cluttered Sidebar) */}
      <div className="flex-1 overflow-y-auto">
        <div
          className={cn(
            "max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8",
            activeQuestion?.question_image
              ? "grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr] gap-5 sm:gap-10 items-start"
              : "max-w-2xl"
          )}
        >
          {activeQuestion ? (
            <>
              {/* Optional Visual Diagram / Road Sign Stage */}
              {activeQuestion.question_image && (
                <div className="rounded-xl border border-border/50 bg-muted/20 dark:bg-zinc-900/50 p-3 sm:p-5 flex items-center justify-center lg:sticky lg:top-20">
                  <SmartImage
                    src={activeQuestion.question_image}
                    alt={t("question") || "Question diagram"}
                    width={800}
                    height={600}
                    className="w-full max-h-[175px] sm:max-h-[270px] object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Question Prompt & Keycap Answer Choices */}
              <div className="space-y-5 sm:space-y-6 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base sm:text-xl font-semibold text-foreground leading-snug tracking-tight break-words">
                    {activeQuestion.question}
                  </h2>
                  {activeQuestion.question && (
                    <QuestionTTSButton
                      entityId={activeQuestion.id}
                      text={activeQuestion.question}
                      className="shrink-0 mt-0.5"
                    />
                  )}
                </div>

                {/* Tactile Answer Options */}
                {(() => {
                  const opts = (["A", "B", "C", "D"] as const).map((opt) => ({
                    opt,
                    text: activeQuestion[`option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}`],
                    img: activeQuestion[
                      `option_${opt.toLowerCase() as "a" | "b" | "c" | "d"}_image` as keyof ExamQuestion
                    ] as string | undefined,
                  }));
                  const hasImageOptions = opts.some((o) => !!o.img);

                  if (hasImageOptions) {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {opts.map(({ opt, text, img }) => {
                          const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => onSelectAnswer(opt)}
                              className={cn(
                                "text-left rounded-xl border p-3 transition-all flex flex-col gap-2.5 cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/[0.08] dark:bg-primary/15"
                                  : "border-border/60 bg-transparent hover:border-foreground/30 hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span
                                  className={cn(
                                    "w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center border transition-colors",
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/70 text-muted-foreground border-border/70"
                                  )}
                                >
                                  {opt}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-primary" />}
                              </div>
                              {img && (
                                <SmartImage
                                  src={img}
                                  alt={`${t("option") || "Option"} ${opt}`}
                                  width={800}
                                  height={600}
                                  className="w-full h-28 sm:h-32 object-contain rounded-lg bg-muted/20"
                                />
                              )}
                              {text && (
                                <span className="text-sm text-foreground font-medium leading-snug">
                                  {text}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden bg-card/40 dark:bg-zinc-900/30">
                      {opts.map(({ opt, text }) => {
                        const isSelected = userAnswers[activeQuestion.id]?.selectedAnswer === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => onSelectAnswer(opt)}
                            className={cn(
                              "w-full text-left px-3.5 py-3.5 sm:px-4 sm:py-4 transition-colors flex items-start gap-3 cursor-pointer",
                              isSelected
                                ? "bg-primary/[0.09] dark:bg-primary/15"
                                : "hover:bg-muted/40"
                            )}
                          >
                            <span
                              className={cn(
                                "w-6 h-6 sm:w-7 sm:h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center border shrink-0 transition-colors mt-0.5",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/60 text-muted-foreground border-border/70"
                              )}
                            >
                              {opt}
                            </span>
                            <span
                              className={cn(
                                "flex-1 text-sm sm:text-[15px] leading-snug pt-0.5",
                                isSelected ? "font-medium text-foreground" : "text-foreground/90"
                              )}
                            >
                              {text}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground py-12 text-center col-span-full">
              {t("noQuestionsReturned") || "No questions available."}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Docked Navigation & Question Number Rail */}
      <footer className="sticky bottom-0 z-20 border-t border-border/50 bg-background/90 dark:bg-zinc-950/90 backdrop-blur-xl px-3 sm:px-6 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChangeIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="rounded-lg h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("previous") || "Previous"}</span>
          </Button>

          {/* Compact Scrollable Question Jump Strip */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-start sm:justify-center gap-1 py-0.5 px-1 w-max mx-auto">
              {exam.questions.map((q, i) => {
                const isCurrent = i === currentIndex;
                const isAnswered = !!userAnswers[q.id]?.selectedAnswer;
                return (
                  <button
                    key={q.id || i}
                    type="button"
                    onClick={() => onChangeIndex(i)}
                    aria-label={`Question ${i + 1}`}
                    className={cn(
                      "w-7 h-7 rounded-md text-[11px] font-mono font-semibold tabular-nums transition-colors border shrink-0 cursor-pointer",
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary"
                        : isAnswered
                        ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25"
                        : "bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {currentIndex === totalQuestions - 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={onInitiateSubmit}
              disabled={submittingExam || answeredCount === 0}
              className="rounded-lg h-8 sm:h-9 px-3 sm:px-4 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span>{submittingExam ? t("submitting") || "..." : t("submit") || "Submit"}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => onChangeIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
              className="rounded-lg h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline">{t("next") || "Next"}</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          )}
        </div>
      </footer>

      {/* Fullscreen Required Warning Modal */}
      <Dialog open={showFullscreenWarning} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t("fullscreenRequiredTitle") || "Fullscreen Required"}
            </DialogTitle>
            <DialogDescription className="text-sm text-red-600 font-medium">
              {t("fullscreenRequiredDesc") ||
                "You have exited fullscreen mode. Re-enter fullscreen mode to continue."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={async () => {
                const entered = await onEnterFullscreen();
                if (entered) setShowFullscreenWarning(false);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="sm"
            >
              <Monitor className="h-4 w-4 mr-2" />
              {t("reEnterFullscreenButton") || "Re-enter Fullscreen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cheating Warning Modal */}
      <Dialog
        open={showCheatingWarning}
        onOpenChange={(open) => {
          if (!open && violationType === "fullscreen" && document.fullscreenElement) {
            setShowCheatingWarning(false);
          }
        }}
      >
        <DialogContent
          className="max-w-md border-red-500 border-2"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {violationType === "ai_detection"
                ? t("aiDetectionDetected") || "AI Tool Detected"
                : t("cheatingViolationDetected") || "Exam Security Warning"}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground whitespace-pre-line">
              {cheatingWarningMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2">
            {violationType === "ai_detection" ? (
              <div className="w-full text-center py-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg border border-amber-500/30">
                {t("waitingForScreenRestore") || "Close AI sidebar or restore window width to continue..."}
              </div>
            ) : (violationType === "fullscreen" || violationType === "tabswitch") &&
              fullscreenRetryCount < securitySettings.maxViolations &&
              cheatingAttempts < securitySettings.maxViolations ? (
              <>
                {violationType === "fullscreen" && (
                  <Button
                    onClick={async () => {
                      const entered = await onEnterFullscreen();
                      if (entered) {
                        setShowCheatingWarning(false);
                        setShowFullscreenWarning(false);
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    {t("reEnterFullscreenNow") || "Re-enter Fullscreen"}
                  </Button>
                )}
                {violationType === "tabswitch" && (
                  <Button
                    onClick={() => setShowCheatingWarning(false)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("acknowledgeStayOnTab") || "Acknowledge & Continue"}
                  </Button>
                )}
              </>
            ) : (
              <div className="w-full text-center py-2 space-y-1">
                {countdownSeconds !== null && countdownSeconds > 0 ? (
                  <>
                    <p className="text-xs font-medium text-red-600">
                      {t("examAutoSubmitCountdown") || "Auto-submitting in:"}
                    </p>
                    <div className="text-2xl font-bold text-red-600 tabular-nums">
                      {countdownSeconds}s
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-medium text-red-600">
                    {t("warningWillCloseAutomatically") || "This warning will close automatically."}
                  </p>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Submission Review Modal */}
      <Dialog open={showPreSubmitModal} onOpenChange={setShowPreSubmitModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t("submitExam") || "Submit Exam"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("reviewQuestionsBeforeSubmit") ||
                "Review your answered and unanswered questions before submitting."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  {t("answered") || "Answered"}
                </span>
                <span className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {answeredCount}/{totalQuestions}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  {t("notAnswered") || "Unanswered"}
                </span>
                <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {unansweredCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {language === "Kinyarwanda" || language === "rw"
                  ? `Ufite ibibazo ${unansweredCount} bitarasubizwa. Kanda ku kibazo ushaka gusubiza.`
                  : `You have ${unansweredCount} unanswered question(s). Click a question below to jump back.`}
              </p>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {exam.questions.map((q, i) => {
                const selectedOpt = userAnswers[q.id]?.selectedAnswer;
                return (
                  <button
                    key={q.id || i}
                    type="button"
                    onClick={() => {
                      setShowPreSubmitModal(false);
                      onChangeIndex(i);
                    }}
                    className={cn(
                      "p-2 rounded-lg border text-xs font-medium tabular-nums flex items-center justify-between cursor-pointer",
                      selectedOpt
                        ? "border-emerald-500/30 bg-emerald-500/10 text-foreground"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    )}
                  >
                    <span>Q{i + 1}</span>
                    <span className="font-bold">{selectedOpt || "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreSubmitModal(false)}
              className="rounded-xl"
            >
              {t("reviewQuestions") || "Review Questions"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingExam}
              onClick={onConfirmSubmit}
              className="rounded-xl font-semibold"
            >
              {submittingExam
                ? t("submitting") || "Submitting..."
                : t("confirmSubmit") || t("submit") || "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={showAlert} onOpenChange={setShowAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {alertType === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
              {alertType === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {alertType === "success" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              {alertType === "info" && <HelpCircle className="h-5 w-5 text-blue-600" />}
              {alertTitle}
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">{alertMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" onClick={() => setShowAlert(false)} className="w-full rounded-xl">
              {t("ok") || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quit Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-sm whitespace-pre-line pt-1">
              {confirmMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelConfirm}
              className="rounded-xl flex-1"
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={onConfirmAction}
              className="rounded-xl flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {t("confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
