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
} from "lucide-react";

interface ExamStudioProps {
  exam: ModuleExam;
  onAddQuestion: (type: ModuleExamQuestionType) => Promise<string | null>;
  onUpdateQuestion: (questionId: string, partial: Partial<ModuleExamQuestionUI>) => void;
  onDeleteQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => Promise<string | null>;
  onMoveQuestion: (questionId: string, direction: "up" | "down") => void;
  onReorderQuestions?: (questionIds: string[]) => void;
}

type FilterType = "all" | ModuleExamQuestionType;

const QUESTION_TYPE_LABELS: Record<ModuleExamQuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  matching: "Matching",
  short_answer: "Short Answer",
};

export function ExamStudio({
  exam,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
  onMoveQuestion,
  onReorderQuestions,
}: ExamStudioProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredQuestions = useMemo(() => {
    return exam.questions
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => {
        const text = extractTextFromTiptapJSON(q.text);
        const matchesSearch =
          !search || text.toLowerCase().includes(search.toLowerCase());
        const matchesType = filter === "all" || q.type === filter;
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">
            {t("examStudio") || "Exam Studio"}
          </h2>
          <p className="text-sm text-[var(--admin-muted)]">
            {exam.questions.length} {t("questions") || "questions"} · {totalPoints} {t("points") || "points"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value="multiple_choice"
            onValueChange={(value) => onAddQuestion(value as ModuleExamQuestionType)}
          >
            <SelectTrigger className="admin-input w-44">
              <Plus className="h-4 w-4 mr-1.5" />
              <SelectValue placeholder={t("addQuestion") || "Add question"} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchQuestions") || "Search questions..."}
            className="admin-input pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger className="admin-input w-full sm:w-44">
            <SelectValue placeholder={t("allTypes") || "All types"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes") || "All types"}</SelectItem>
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 border border-dashed border-[var(--admin-border)] rounded-2xl">
            <ListOrdered className="h-10 w-10 mx-auto mb-3 text-[var(--admin-muted)] opacity-40" />
            <p className="text-[var(--admin-muted)]">
              {search || filter !== "all"
                ? t("noQuestionsMatch") || "No questions match your filters."
                : t("noQuestionsYet") || "No questions yet. Add one to get started."}
            </p>
          </div>
        )}

        {filteredQuestions.map(({ q, index }) => (
          <QuestionCard
            key={q.id}
            q={q}
            number={index + 1}
            isCollapsed={collapsed.has(q.id)}
            isPreview={previewId === q.id}
            isDragged={draggedId === q.id}
            onToggleCollapse={() => toggleCollapse(q.id)}
            onTogglePreview={() => setPreviewId((id) => (id === q.id ? null : q.id))}
            onUpdate={(partial) => onUpdateQuestion(q.id, partial)}
            onDelete={() => {
              if (confirm(t("confirmDeleteQuestion") || "Delete this question?")) {
                onDeleteQuestion(q.id);
              }
            }}
            onDuplicate={() => onDuplicateQuestion(q.id)}
            onMoveUp={() => onMoveQuestion(q.id, "up")}
            onMoveDown={() => onMoveQuestion(q.id, "down")}
            onDragStart={(e) => handleDragStart(e, q.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, q.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface QuestionCardProps {
  q: ModuleExamQuestionUI;
  number: number;
  isCollapsed: boolean;
  isPreview: boolean;
  isDragged: boolean;
  onToggleCollapse: () => void;
  onTogglePreview: () => void;
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
  isCollapsed,
  isPreview,
  isDragged,
  onToggleCollapse,
  onTogglePreview,
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
  const isValid = validateQuestion(q);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border bg-[var(--admin-card)] transition-all",
        isDragged ? "opacity-50 border-dashed border-[var(--admin-primary)]" : "border-[var(--admin-border)] hover:border-[var(--admin-border-hover)]"
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
                <SelectTrigger className="h-7 w-40 border-0 bg-[var(--admin-primary)]/15 px-2 text-xs text-[var(--admin-primary)]">
                  <SelectValue>{typeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-[var(--admin-muted)]">{q.points || 1} pts</span>
              {!isValid && (
                <Badge className="admin-badge-danger flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t("invalid") || "Invalid"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={onTogglePreview} className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
                {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={onDuplicate} className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onToggleCollapse} className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={onMoveUp} className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
                <span className="text-xs font-bold">↑</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={onMoveDown} className="h-8 w-8 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
                <span className="text-xs font-bold">↓</span>
              </Button>
              <Button size="icon" variant="ghost" onClick={onDelete} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isCollapsed && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[var(--admin-text)]">{t("question") || "Question"}</Label>
                <RichEditor
                  content={q.text}
                  onChange={(text) => onUpdate({ text })}
                  placeholder={t("enterQuestion") || "Enter the question..."}
                />
              </div>

              <QuestionTypeFields q={q} onUpdate={onUpdate} />

              <div className="space-y-2">
                <Label className="text-[var(--admin-text)]">{t("explanation") || "Explanation (optional)"}</Label>
                <RichEditor
                  content={q.explanation}
                  onChange={(explanation) => onUpdate({ explanation })}
                  placeholder={t("explainAnswer") || "Explain why this is the correct answer..."}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-[var(--admin-text)]">{t("points") || "Points"}</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={q.points}
                    onChange={(e) => onUpdate({ points: parseFloat(e.target.value) || 0 })}
                    className="admin-input"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-[var(--admin-text)]">{t("tags") || "Tags"}</Label>
                  <TagInput tags={q.tags} onChange={(tags) => onUpdate({ tags })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={q.randomizeAnswerOrder}
                    onCheckedChange={(checked) => onUpdate({ randomizeAnswerOrder: checked })}
                  />
                  <Label className="text-sm text-[var(--admin-text)]">{t("randomizeAnswers") || "Randomize answers"}</Label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isPreview && (
        <div className="border-t border-[var(--admin-border)] px-4 py-4 bg-[var(--admin-hover-bg)]/20">
          <p className="text-xs uppercase tracking-wide text-[var(--admin-muted)] mb-2">{t("preview") || "Preview"}</p>
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
  return <ShortAnswerFields q={q} onUpdate={onUpdate} />;
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

  const addOption = () => {
    if (maxOptions && q.options.length >= maxOptions) return;
    const nextLetter = letters[q.options.length] || String(q.options.length + 1);
    onUpdate({ options: [...q.options, { id: nextLetter, text: "" }] });
  };

  const updateOption = (id: string, patch: Partial<ModuleExamOption>) => {
    onUpdate({ options: q.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });
  };

  const removeOption = (id: string) => {
    const next = q.options.filter((o) => o.id !== id);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[var(--admin-text)]">{t("answerChoices") || "Answer Choices"}</Label>
        {isMulti && (
          <div className="flex items-center gap-2">
            <Switch
              checked={q.partialScoring}
              onCheckedChange={(checked) => onUpdate({ partialScoring: checked })}
            />
            <Label className="text-sm text-[var(--admin-text)]">{t("partialScoring") || "Partial scoring"}</Label>
          </div>
        )}
      </div>
      {q.options.map((option) => (
        <div key={option.id} className="flex items-start gap-2">
          <button type="button" onClick={() => toggleCorrect(option.id)} className="mt-2.5 flex-shrink-0">
            {isMulti ? (
              <Checkbox checked={q.correctOptionIds.includes(option.id)} className="border-[var(--admin-border)] data-[state=checked]:bg-[var(--admin-primary)] data-[state=checked]:border-[var(--admin-primary)]" />
            ) : q.correctOptionId === option.id ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <Circle className="h-5 w-5 text-[var(--admin-muted)]" />
            )}
          </button>
          <div className="flex-1">
            <Input
              value={option.text}
              onChange={(e) => updateOption(option.id, { text: e.target.value })}
              placeholder={t("optionText") || "Option text"}
              className="admin-input"
            />
          </div>
          <ImageUploadButton
            image={option.image}
            onUpload={(image) => updateOption(option.id, { image })}
            onClear={() => updateOption(option.id, { image: undefined })}
            folder={`exams/questions/${q.id}/options`}
          />
          {q.options.length > 2 && (
            <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(option.id)} className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {(!maxOptions || q.options.length < maxOptions) && (
        <Button type="button" variant="outline" size="sm" onClick={addOption} className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]">
          <Plus className="h-4 w-4 mr-1.5" />
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
    <div className="space-y-3">
      <Label className="text-[var(--admin-text)]">{t("matchingPairs") || "Matching Pairs"}</Label>
      {q.matchingPairs.map((pair) => (
        <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            value={pair.left}
            onChange={(e) => updatePair(pair.id, { left: e.target.value })}
            placeholder={t("leftItem") || "Left item"}
            className="admin-input"
          />
          <Input
            value={pair.right}
            onChange={(e) => updatePair(pair.id, { right: e.target.value })}
            placeholder={t("rightItem") || "Right item"}
            className="admin-input"
          />
          <Button type="button" size="icon" variant="ghost" onClick={() => removePair(pair.id)} className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addPair} className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]">
        <Plus className="h-4 w-4 mr-1.5" />
        {t("addPair") || "Add pair"}
      </Button>
    </div>
  );
}

function ShortAnswerFields({ q, onUpdate }: { q: ModuleExamQuestionUI; onUpdate: (partial: Partial<ModuleExamQuestionUI>) => void }) {
  const { t } = useLanguage();
  const sa = q.shortAnswer;

  const updateSA = (patch: Partial<typeof sa>) => onUpdate({ shortAnswer: { ...sa, ...patch } });

  return (
    <div className="space-y-3">
      <Label className="text-[var(--admin-text)]">{t("acceptedAnswers") || "Accepted Answers"}</Label>
      {sa.acceptedAnswers.map((answer, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={answer}
            onChange={(e) => {
              const next = [...sa.acceptedAnswers];
              next[idx] = e.target.value;
              updateSA({ acceptedAnswers: next });
            }}
            placeholder={t("acceptedAnswer") || "Accepted answer"}
            className="admin-input"
          />
          {sa.acceptedAnswers.length > 1 && (
            <Button type="button" size="icon" variant="ghost" onClick={() => updateSA({ acceptedAnswers: sa.acceptedAnswers.filter((_, i) => i !== idx) })} className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => updateSA({ acceptedAnswers: [...sa.acceptedAnswers, ""] })} className="border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]">
        <Plus className="h-4 w-4 mr-1.5" />
        {t("addAcceptedAnswer") || "Add accepted answer"}
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Switch checked={sa.caseSensitive} onCheckedChange={(checked) => updateSA({ caseSensitive: checked })} />
          <Label className="text-sm text-[var(--admin-text)]">{t("caseSensitive") || "Case sensitive"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={sa.ignorePunctuation} onCheckedChange={(checked) => updateSA({ ignorePunctuation: checked })} />
          <Label className="text-sm text-[var(--admin-text)]">{t("ignorePunctuation") || "Ignore punctuation"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={sa.ignoreWhitespace} onCheckedChange={(checked) => updateSA({ ignoreWhitespace: checked })} />
          <Label className="text-sm text-[var(--admin-text)]">{t("ignoreWhitespace") || "Ignore whitespace"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={sa.keywordMatching} onCheckedChange={(checked) => updateSA({ keywordMatching: checked })} />
          <Label className="text-sm text-[var(--admin-text)]">{t("keywordMatching") || "Keyword matching"}</Label>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--admin-muted)]">{t("minChars") || "Min characters"}</Label>
          <Input type="number" min={0} value={sa.minChars ?? ""} onChange={(e) => updateSA({ minChars: e.target.value ? parseInt(e.target.value) : undefined })} className="admin-input h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--admin-muted)]">{t("maxChars") || "Max characters"}</Label>
          <Input type="number" min={0} value={sa.maxChars ?? ""} onChange={(e) => updateSA({ maxChars: e.target.value ? parseInt(e.target.value) : undefined })} className="admin-input h-8" />
        </div>
      </div>
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
      <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
        <ImageIcon className="h-4 w-4" />
      </Button>
      {image && (
        <Button type="button" size="icon" variant="ghost" onClick={onClear} className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/20 min-h-[42px]">
      {tags.map((tag) => (
        <Badge key={tag} className="admin-badge-info flex items-center gap-1">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-red-300">
            <X className="h-3 w-3" />
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
        placeholder="Add tag..."
        className="admin-input border-0 bg-transparent flex-1 min-w-[120px] h-6 px-1 py-0"
      />
    </div>
  );
}

function QuestionPreview({ q }: { q: ModuleExamQuestionUI }) {
  const { t } = useLanguage();

  if (q.type === "matching") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          {q.matchingPairs.map((pair) => (
            <div key={pair.id} className="p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)]">{pair.left || "—"}</div>
          ))}
        </div>
        <div className="space-y-2">
          {q.matchingPairs.map((pair) => (
            <div key={pair.id} className="p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)]">{pair.right || "—"}</div>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "short_answer") {
    return (
      <div className="space-y-2">
        <Input disabled placeholder={t("shortAnswerPlaceholder") || "Type your answer..."} className="admin-input" />
        {q.shortAnswer.acceptedAnswers.length > 0 && (
          <p className="text-sm text-[var(--admin-muted)]">
            {t("acceptedAnswers") || "Accepted"}: {q.shortAnswer.acceptedAnswers.join(", ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {q.options.map((option) => {
        const isCorrect = q.type === "multiple_select" ? q.correctOptionIds.includes(option.id) : q.correctOptionId === option.id;
        return (
          <div
            key={option.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-sm",
              isCorrect
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-[var(--admin-border)] text-[var(--admin-text)]"
            )}
          >
            {isCorrect ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" /> : <Circle className="h-4 w-4 text-[var(--admin-muted)] flex-shrink-0" />}
            <span>{option.text || option.id}</span>
          </div>
        );
      })}
    </div>
  );
}

function validateQuestion(q: ModuleExamQuestionUI): boolean {
  if (q.type === "multiple_select" && q.correctOptionIds.length < 2) return false;
  if ((q.type === "multiple_choice" || q.type === "true_false") && !q.correctOptionId) return false;
  if (q.type === "matching" && q.matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) return false;
  if (q.type === "short_answer" && q.shortAnswer.acceptedAnswers.some((a) => !a.trim())) return false;
  return true;
}
