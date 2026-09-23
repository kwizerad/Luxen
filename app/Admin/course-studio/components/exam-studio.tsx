"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { uploadCourseFile } from "@/lib/course-storage";
import { AudioUpload } from "@/components/audio-upload";
import {
  ModuleExam,
  ModuleExamQuestionUI,
  ModuleExamQuestionType,
  ModuleExamOption,
  MatchingPair,
  createModuleExamQuestion,
  extractTextFromTiptapJSON,
} from "@/lib/courses-store";
import { RichEditor } from "./rich-editor";
import { MatchingInteraction } from "./matching-interaction";
import { BulkQuestionModal } from "./bulk-question-modal";
import {
  GripVertical,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Search,
  ImageIcon,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  ListOrdered,
  ListChecks,
  ToggleLeft,
  ArrowLeftRight,
  UploadCloud,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface ExamStudioProps {
  exam: ModuleExam;
  activeQuestionId?: string | null;
  onActiveQuestionChange?: (id: string | null) => void;
  onAddQuestion: (type: ModuleExamQuestionType) => Promise<string | null>;
  onUpdateQuestion: (questionId: string, partial: Partial<ModuleExamQuestionUI>) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => Promise<string | null>;
  onMoveQuestion: (questionId: string, direction: "up" | "down") => void;
  onReorderQuestions?: (questionIds: string[]) => void;
  onTitleChange?: (title: string) => void;
  onBulkAddQuestions?: (questions: ModuleExamQuestionUI[]) => Promise<void>;
}

type FilterType = "all" | ModuleExamQuestionType | "issues" | "no_audio";

const QUESTION_TYPE_LABELS: Record<ModuleExamQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  matching: "Matching",
};

const QUESTION_TYPE_ICONS: Record<ModuleExamQuestionType, typeof CheckCircle2> = {
  multiple_choice: CheckCircle2,
  multiple_select: ListChecks,
  true_false: ToggleLeft,
  matching: ArrowLeftRight,
};

export function ExamStudio({
  exam,
  activeQuestionId,
  onActiveQuestionChange,
  onAddQuestion: _onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestion,
  onReorderQuestions,
  onTitleChange,
  onBulkAddQuestions,
}: ExamStudioProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const filteredQuestions = useMemo(() => {
    return exam.questions
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => {
        const text = extractTextFromTiptapJSON(q.text);
        const matchesSearch =
          !search || text.toLowerCase().includes(search.toLowerCase());

        let matchesType = true;
        if (filter === "all") matchesType = true;
        else if (filter === "issues") matchesType = !validateQuestion(q);
        else if (filter === "no_audio") matchesType = !q.audio;
        else matchesType = q.type === filter;

        return matchesSearch && matchesType;
      });
  }, [exam.questions, search, filter]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPoints = useMemo(
    () => exam.questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [exam.questions]
  );

  const invalidCount = useMemo(
    () => exam.questions.filter((q) => !validateQuestion(q)).length,
    [exam.questions]
  );

  const typeCounts = useMemo(() => {
    const counts = { multiple_choice: 0, multiple_select: 0, true_false: 0, matching: 0 };
    exam.questions.forEach((q) => {
      if (counts[q.type] !== undefined) counts[q.type]++;
    });
    return counts;
  }, [exam.questions]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, questionId: string) => {
    setDraggedId(questionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId || !onReorderQuestions) return;
    const ids = exam.questions.map((q) => q.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderQuestions(next);
    setDraggedId(null);
  };

  const handleExportQuestionsJSON = () => {
    const data = JSON.stringify(exam.questions, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-${exam.id || "questions"}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("questionsExportedSuccess") || "Questions exported successfully!");
  };

  const handleBulkImport = async (questions: ModuleExamQuestionUI[]) => {
    if (onBulkAddQuestions) {
      await onBulkAddQuestions(questions);
    } else {
      // Fallback if bulk handler not provided
      for (const q of questions) {
        const id = await _onAddQuestion(q.type);
        if (id) {
          onUpdateQuestion(id, q);
        }
      }
    }
  };

  const activeIndex = activeQuestionId
    ? filteredQuestions.findIndex(({ q }) => q.id === activeQuestionId)
    : -1;
  const activeQuestion = activeIndex >= 0 ? filteredQuestions[activeIndex] : null;

  return (
    <div className="space-y-4">
      {/* Top Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)]">
        <div className="space-y-1 flex-1 min-w-0">
          {onTitleChange ? (
            <input
              type="text"
              value={exam.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t("examTitle") || "Exam Title"}
              className="text-base sm:text-lg font-bold text-[var(--admin-text)] bg-transparent border-none outline-none w-full truncate placeholder:text-[var(--admin-muted)] focus:ring-1 focus:ring-[var(--admin-primary)]/30 rounded px-1 -ml-1"
            />
          ) : (
            <h2 className="text-base sm:text-lg font-bold text-[var(--admin-text)]">
              {exam.title || t("examStudio") || "Exam Studio"}
            </h2>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--admin-muted)]">
            <span className="font-semibold text-[var(--admin-text)]">
              {exam.questions.length} {t("questions") || "questions"}
            </span>
            <span>•</span>
            <span>{totalPoints} {t("points") || "points"}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {typeCounts.multiple_choice} MC • {typeCounts.true_false} T/F • {typeCounts.matching} Match
            </span>
            {invalidCount > 0 && (
              <>
                <span>•</span>
                <span className="text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} {t("needAttention") || "need attention"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBulkModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/40 hover:bg-[var(--admin-hover-bg)]"
          >
            <UploadCloud className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
            <span className="hidden sm:inline">{t("bulkImport") || "Bulk Import"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportQuestionsJSON}
            disabled={exam.questions.length === 0}
            className="h-8 text-xs gap-1.5 border-[var(--admin-border)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("export") || "Export"}</span>
          </Button>
        </div>
      </div>

      {/* === LIST VIEW: all questions (no active question) === */}
      {!activeQuestion && (
        <>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--admin-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchQuestions") || "Search questions by keyword..."}
                className="admin-input pl-8 h-9 text-xs"
              />
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <SelectTrigger className="admin-input w-full sm:w-48 h-9 text-xs">
                <SelectValue placeholder={t("allTypes") || "All types"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allQuestions") || "All Questions"} ({exam.questions.length})</SelectItem>
                <SelectItem value="multiple_choice">Multiple Choice ({typeCounts.multiple_choice})</SelectItem>
                <SelectItem value="true_false">True / False ({typeCounts.true_false})</SelectItem>
                <SelectItem value="multiple_select">Multiple Select ({typeCounts.multiple_select})</SelectItem>
                <SelectItem value="matching">Matching ({typeCounts.matching})</SelectItem>
                {invalidCount > 0 && (
                  <SelectItem value="issues" className="text-red-500 font-medium">⚠️ {t("hasIssues") || "Has Issues"} ({invalidCount})</SelectItem>
                )}
                <SelectItem value="no_audio">🎙️ {t("missingAudio") || "Missing Audio"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredQuestions.length === 0 && (
              <div className="text-center py-12 border border-dashed border-[var(--admin-border)] rounded-xl bg-[var(--admin-card)]">
                <ListOrdered className="h-8 w-8 mx-auto mb-2 text-[var(--admin-muted)] opacity-40" />
                <p className="text-xs text-[var(--admin-muted)]">
                  {search || filter !== "all"
                    ? t("noQuestionsMatch") || "No questions match your filters."
                    : t("noQuestionsYet") || "No questions yet. Use the buttons below or Bulk Import to get started."}
                </p>
              </div>
            )}

            {filteredQuestions.map(({ q, index }) => {
              const Icon = QUESTION_TYPE_ICONS[q.type];
              const text = extractTextFromTiptapJSON(q.text);
              const validation = getQuestionValidationDetails(q);

              return (
                <div
                  key={q.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, q.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, q.id)}
                  onClick={() => onActiveQuestionChange?.(q.id)}
                  className={cn(
                    "rounded-xl border bg-[var(--admin-card)] p-3 flex items-center gap-3 cursor-pointer transition-all",
                    draggedId === q.id
                      ? "opacity-50 border-dashed border-[var(--admin-primary)]"
                      : "border-[var(--admin-border)] hover:border-[var(--admin-border-hover)] hover:bg-[var(--admin-hover-bg)]/40"
                  )}
                >
                  <div className="pt-0.5 cursor-grab active:cursor-grabbing text-[var(--admin-muted)]">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 text-[var(--admin-muted)] flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-[var(--admin-text)] truncate flex-1 min-w-0">
                    {text.trim() || <span className="text-[var(--admin-muted)] italic">{t("untitledQuestion") || "Untitled question"}</span>}
                  </span>
                  <span className="text-[11px] text-[var(--admin-muted)] flex-shrink-0 hidden sm:inline">{QUESTION_TYPE_LABELS[q.type]}</span>
                  <span className="text-[11px] text-[var(--admin-muted)] flex-shrink-0">{q.points || 1} pts</span>
                  {!validation.isValid && (
                    <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-600 dark:text-red-400 flex items-center gap-1 flex-shrink-0">
                      <AlertCircle className="h-3 w-3" />
                      <span className="hidden md:inline">{validation.reason}</span>
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* === SINGLE QUESTION EDITOR VIEW === */}
      {activeQuestion && (
        <div className="space-y-3">
          {/* Back to list + navigation */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)]">
            <button
              type="button"
              onClick={() => onActiveQuestionChange?.(null)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors px-2 py-1"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-90" />
              {t("allQuestions") || "Back to Question List"}
            </button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex <= 0}
                onClick={() => onActiveQuestionChange?.(filteredQuestions[activeIndex - 1].q.id)}
                className="h-7 text-xs border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                {t("previous") || "Prev"}
              </Button>
              <span className="text-xs text-[var(--admin-muted)] font-mono">
                {activeIndex + 1} / {filteredQuestions.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex >= filteredQuestions.length - 1}
                onClick={() => onActiveQuestionChange?.(filteredQuestions[activeIndex + 1].q.id)}
                className="h-7 text-xs border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                {t("next") || "Next"}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Single question card */}
          <QuestionCard
            q={activeQuestion.q}
            number={activeIndex + 1}
            isActive={true}
            isCollapsed={collapsed.has(activeQuestion.q.id)}
            isPreview={previewId === activeQuestion.q.id}
            isDragged={draggedId === activeQuestion.q.id}
            onToggleCollapse={() => toggleCollapse(activeQuestion.q.id)}
            onTogglePreview={() => setPreviewId((id) => (id === activeQuestion.q.id ? null : activeQuestion.q.id))}
            onActivate={() => {}}
            onUpdate={(partial) => onUpdateQuestion(activeQuestion.q.id, partial)}
            onDelete={() => {
              if (confirm(t("confirmDeleteQuestion") || "Delete this question?")) {
                onDeleteQuestion(activeQuestion.q.id);
                onActiveQuestionChange?.(null);
              }
            }}
            onDuplicate={async () => {
              const newId = await onDuplicateQuestion(activeQuestion.q.id);
              if (newId) onActiveQuestionChange?.(newId);
            }}
            onMoveUp={() => onMoveQuestion(activeQuestion.q.id, "up")}
            onMoveDown={() => onMoveQuestion(activeQuestion.q.id, "down")}
            onDragStart={(e) => handleDragStart(e, activeQuestion.q.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, activeQuestion.q.id)}
          />
        </div>
      )}

      {/* Bulk Question Importer Modal */}
      <BulkQuestionModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        onImport={handleBulkImport}
      />
    </div>
  );
}

interface QuestionCardProps {
  q: ModuleExamQuestionUI;
  number: number;
  isActive: boolean;
  isCollapsed: boolean;
  isPreview: boolean;
  isDragged: boolean;
  onToggleCollapse: () => void;
  onTogglePreview: () => void;
  onActivate: () => void;
  onUpdate: (partial: Partial<ModuleExamQuestionUI>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

function QuestionCard({
  q,
  number,
  isActive,
  isCollapsed,
  isPreview,
  isDragged,
  onToggleCollapse,
  onTogglePreview,
  onActivate,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: QuestionCardProps) {
  const { t } = useLanguage();
  const typeLabel = QUESTION_TYPE_LABELS[q.type];
  const validation = getQuestionValidationDetails(q);
  const isQuestionEmpty = !extractTextFromTiptapJSON(q.text).trim();
  const hasExplanation = !!extractTextFromTiptapJSON(q.explanation).trim();
  const [showExplanation, setShowExplanation] = useState(hasExplanation);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onActivate}
      className={cn(
        "rounded-2xl border bg-[var(--admin-card)] transition-all cursor-pointer",
        isDragged
          ? "opacity-50 border-dashed border-[var(--admin-primary)]"
          : isActive
          ? "border-[var(--admin-primary)] ring-1 ring-[var(--admin-primary)]/20 shadow-md"
          : "border-[var(--admin-border)] hover:border-[var(--admin-border-hover)]"
      )}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="pt-1 cursor-grab active:cursor-grabbing text-[var(--admin-muted)]">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--admin-primary)]/15 text-[var(--admin-primary)] text-xs font-semibold">
                {number}
              </span>
              <Select
                value={q.type}
                onValueChange={(type) => {
                  const next = createModuleExamQuestion(type as ModuleExamQuestionType, {
                    id: q.id,
                    text: q.text,
                    explanation: q.explanation,
                    points: q.points,
                    tags: q.tags,
                  });
                  onUpdate(next);
                }}
              >
                <SelectTrigger className="h-7 w-36 border-0 bg-[var(--admin-primary)]/15 px-2 text-xs text-[var(--admin-primary)] font-medium">
                  <SelectValue>{typeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-[var(--admin-muted)] font-mono">{q.points || 1} pts</span>
              {!validation.isValid && (
                <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400 text-[10px] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validation.reason}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onTogglePreview}
                title={isPreview ? "Hide Preview" : "Preview Question"}
                className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              >
                {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDuplicate}
                title="Duplicate Question"
                className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expand" : "Collapse"}
                className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onMoveUp}
                title="Move Up"
                className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              >
                <span className="text-xs font-bold">↑</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onMoveDown}
                title="Move Down"
                className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              >
                <span className="text-xs font-bold">↓</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                title="Delete Question"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="space-y-4 pt-2">
              {isQuestionEmpty && (
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--admin-text)] font-semibold">{t("chooseQuestionType") || "Choose question type"}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(QUESTION_TYPE_LABELS) as ModuleExamQuestionType[]).map((type) => {
                      const Icon = QUESTION_TYPE_ICONS[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const next = createModuleExamQuestion(type, {
                              id: q.id,
                              text: q.text,
                              explanation: q.explanation,
                              points: q.points,
                              tags: q.tags,
                            });
                            onUpdate(next);
                          }}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                            q.type === type
                              ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/10 text-[var(--admin-primary)]"
                              : "border-[var(--admin-border)] text-[var(--admin-muted)] hover:border-[var(--admin-border-hover)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-medium">{QUESTION_TYPE_LABELS[type]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-[var(--admin-text)] font-semibold">{t("question") || "Question Prompt"}</Label>
                <RichEditor
                  content={q.text}
                  onChange={(text) => onUpdate({ text })}
                  placeholder={t("enterQuestion") || "Enter the question prompt..."}
                />
                <AudioUpload
                  value={q.audio}
                  onChange={(audio) => onUpdate({ audio: audio || undefined })}
                  folder={`exams/questions/${q.id || "new"}/audio`}
                  label={t("questionAudio") || "Question audio"}
                />
              </div>

              <QuestionTypeFields q={q} onUpdate={onUpdate} />

              {showExplanation ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[var(--admin-text)] font-semibold">{t("explanation") || "Explanation (optional)"}</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowExplanation(false);
                        onUpdate({ explanation: "" });
                      }}
                      className="text-xs text-[var(--admin-muted)] hover:text-red-400 transition-colors"
                    >
                      {t("remove") || "Remove"}
                    </button>
                  </div>
                  <RichEditor
                    content={q.explanation}
                    onChange={(explanation) => onUpdate({ explanation })}
                    placeholder={t("explainAnswer") || "Explain why this is the correct answer..."}
                    stickyToolbar={false}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExplanation(true)}
                  className="flex items-center gap-1.5 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] transition-colors py-1"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                  {t("addExplanation") || "Add Answer Explanation"}
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-[var(--admin-border)]/60">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[var(--admin-text)]">{t("points") || "Points"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={q.points}
                    onChange={(e) => onUpdate({ points: parseFloat(e.target.value) || 0 })}
                    className="admin-input h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-[var(--admin-text)]">{t("tags") || "Tags"}</Label>
                  <TagInput tags={q.tags} onChange={(tags) => onUpdate({ tags })} />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch
                    checked={q.randomizeAnswerOrder}
                    onCheckedChange={(checked) => onUpdate({ randomizeAnswerOrder: checked })}
                  />
                  <Label className="text-xs text-[var(--admin-text)]">{t("randomizeAnswers") || "Shuffle Choices"}</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isPreview && (
        <div className="border-t border-[var(--admin-border)] px-4 py-4 bg-[var(--admin-hover-bg)]/20">
          <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)] mb-2 font-semibold">{t("preview") || "Preview"}</p>
          <QuestionPreview q={q} />
        </div>
      )}
    </div>
  );
}

function QuestionTypeFields({
  q,
  onUpdate,
}: {
  q: ModuleExamQuestionUI;
  onUpdate: (partial: Partial<ModuleExamQuestionUI>) => void;
}) {
  if (q.type === "true_false") {
    return <ChoiceOptions q={q} onUpdate={onUpdate} maxOptions={2} />;
  }
  if (q.type === "multiple_choice" || q.type === "multiple_select") {
    return <ChoiceOptions q={q} onUpdate={onUpdate} />;
  }
  if (q.type === "matching") {
    return <MatchingFields q={q} onUpdate={onUpdate} />;
  }
  return null;
}

function ChoiceOptions({
  q,
  onUpdate,
  maxOptions,
}: {
  q: ModuleExamQuestionUI;
  onUpdate: (partial: Partial<ModuleExamQuestionUI>) => void;
  maxOptions?: number;
}) {
  const { t } = useLanguage();
  const isMulti = q.type === "multiple_select";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const options = q.options || [];

  const addOption = () => {
    if (maxOptions && options.length >= maxOptions) return;
    const nextLetter = letters[options.length] || String(options.length + 1);
    onUpdate({ options: [...options, { id: nextLetter, text: "" }] });
  };

  const updateOption = (id: string, patch: Partial<ModuleExamOption>) => {
    onUpdate({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  };

  const removeOption = (id: string) => {
    const next = options.filter((o) => o.id !== id);
    if (isMulti) {
      onUpdate({
        options: next,
        correctOptionIds: q.correctOptionIds.filter((cid) => next.some((o) => o.id === cid)),
      });
    } else {
      const stillCorrect = q.correctOptionId === id;
      onUpdate({
        options: next,
        correctOptionId: stillCorrect ? next[0]?.id : q.correctOptionId,
      });
    }
  };

  const toggleCorrect = (id: string) => {
    if (isMulti) {
      const set = new Set(q.correctOptionIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      onUpdate({ correctOptionIds: Array.from(set) });
    } else {
      onUpdate({ correctOptionId: id });
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-[var(--admin-text)] font-semibold">{t("answerChoices") || "Answer Choices"}</Label>
        {isMulti && (
          <div className="flex items-center gap-2">
            <Switch
              checked={q.partialScoring}
              onCheckedChange={(checked) => onUpdate({ partialScoring: checked })}
            />
            <Label className="text-xs text-[var(--admin-text)]">{t("partialScoring") || "Partial scoring"}</Label>
          </div>
        )}
      </div>
      {options.map((option) => (
        <div key={option.id} className="flex items-start gap-2">
          <button type="button" onClick={() => toggleCorrect(option.id)} className="mt-2.5 flex-shrink-0" title="Toggle Correct Answer">
            {isMulti ? (
              <Checkbox checked={q.correctOptionIds.includes(option.id)} className="border-[var(--admin-border)] data-[state=checked]:bg-[var(--admin-primary)] data-[state=checked]:border-[var(--admin-primary)]" />
            ) : q.correctOptionId === option.id ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-[var(--admin-muted)]" />
            )}
          </button>
          <div className="flex-1">
            <Input
              value={option.text}
              onChange={(e) => updateOption(option.id, { text: e.target.value })}
              placeholder={t("optionText") || "Option text"}
              className="admin-input h-9 text-xs"
            />
          </div>
          <ImageUploadButton
            image={option.image}
            onUpload={(image) => updateOption(option.id, { image })}
            onClear={() => updateOption(option.id, { image: undefined })}
            folder={`exams/questions/${q.id}/options`}
          />
          {options.length > 2 && (
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(option.id)} className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {(!maxOptions || options.length < maxOptions) && (
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="h-7 text-xs border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]">
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t("addOption") || "Add option"}
        </Button>
      )}
    </div>
  );
}

function MatchingFields({ q, onUpdate }: { q: ModuleExamQuestionUI; onUpdate: (partial: Partial<ModuleExamQuestionUI>) => void }) {
  const { t } = useLanguage();

  const updatePairs = (pairs: MatchingPair[]) => onUpdate({ matchingPairs: pairs });

  const addPair = () => updatePairs([...q.matchingPairs, { id: `p${Date.now()}`, left: "", right: "" }]);

  const updatePair = (id: string, patch: Partial<MatchingPair>) => {
    updatePairs(q.matchingPairs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePair = (id: string) => updatePairs(q.matchingPairs.filter((p) => p.id !== id));

  return (
    <div className="space-y-2.5">
      <Label className="text-xs text-[var(--admin-text)] font-semibold">{t("matchingPairs") || "Matching Pairs"}</Label>
      {q.matchingPairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            value={pair.left}
            onChange={(e) => updatePair(pair.id, { left: e.target.value })}
            placeholder={t("leftItem") || "Left item / Key"}
            className="admin-input h-9 text-xs"
          />
          <Input
            value={pair.right}
            onChange={(e) => updatePair(pair.id, { right: e.target.value })}
            placeholder={t("rightItem") || "Right item / Match"}
            className="admin-input h-9 text-xs"
          />
          <Button type="button" size="icon" variant="ghost" onClick={() => removePair(pair.id)} className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addPair} className="h-7 text-xs border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]">
        <Plus className="h-3.5 w-3.5 mr-1" />
        {t("addPair") || "Add pair"}
      </Button>
    </div>
  );
}

function ImageUploadButton({
  image,
  onUpload,
  onClear,
  folder,
}: {
  image?: string;
  onUpload: (url: string) => void;
  onClear: () => void;
  folder: string;
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("imageUpload.selectImageFile") || "Please select an image file.");
      return;
    }
    try {
      const result = await uploadCourseFile(file, folder);
      onUpload(result.publicUrl);
      toast.success(t("imageUploadedSuccess") || "Image uploaded");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t("imageUpload.failed") || "Failed to upload image.");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-9 w-9 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
        <ImageIcon className="h-4 w-4" />
      </Button>
      {image && (
        <Button type="button" size="icon" variant="ghost" onClick={onClear} className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20 min-h-[34px]">
      {tags.map((tag) => (
        <Badge key={tag} className="admin-badge-info text-[10px] py-0 flex items-center gap-1">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-red-300">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        placeholder="Tag..."
        className="admin-input border-0 bg-transparent flex-1 min-w-[80px] h-5 px-1 py-0 text-xs"
      />
    </div>
  );
}

function QuestionPreview({ q }: { q: ModuleExamQuestionUI }) {
  const { t } = useLanguage();

  if (q.type === "matching") {
    return (
      <MatchingInteraction
        pairs={q.matchingPairs}
        checked={false}
        readOnly
      />
    );
  }

  return (
    <div className="space-y-2">
      {q.audio && (
        <audio
          controls
          src={q.audio}
          className="w-full h-10 rounded-lg mb-2"
          onError={() => toast.error(t("audioUpload.loadError") || "Failed to load audio.")}
        />
      )}
      {(q.options || []).map((option) => {
        const isCorrect = q.type === "multiple_select" ? q.correctOptionIds.includes(option.id) : q.correctOptionId === option.id;
        return (
          <div
            key={option.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-xs sm:text-sm",
              isCorrect
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-[var(--admin-border)] text-[var(--admin-text)]"
            )}
          >
            {isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" /> : <Circle className="h-4 w-4 text-[var(--admin-muted)] flex-shrink-0" />}
            <span>{option.text || option.id}</span>
          </div>
        );
      })}
    </div>
  );
}

function getQuestionValidationDetails(q: ModuleExamQuestionUI): { isValid: boolean; reason?: string } {
  if (q.type === "multiple_select") {
    if (!q.correctOptionIds || q.correctOptionIds.length === 0) return { isValid: false, reason: "No options selected" };
  }
  if (q.type === "multiple_choice" || q.type === "true_false") {
    if (!q.correctOptionId) return { isValid: false, reason: "No correct answer marked" };
  }
  if (q.type === "matching") {
    if (!q.matchingPairs || q.matchingPairs.length < 2) return { isValid: false, reason: "Need at least 2 pairs" };
    if (q.matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) return { isValid: false, reason: "Incomplete pairs" };
  }
  return { isValid: true };
}

function validateQuestion(q: ModuleExamQuestionUI): boolean {
  return getQuestionValidationDetails(q).isValid;
}
