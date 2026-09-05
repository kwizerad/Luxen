"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/language-context";
import {
  ModuleExamQuestionUI,
  ModuleExamQuestionType,
  createModuleExamQuestion,
} from "@/lib/courses-store";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface BulkQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: ModuleExamQuestionUI[]) => Promise<void>;
}

const TEMPLATE_MULTIPLE_CHOICE = `1. What is the standard speed limit in Rwandan urban areas?
A) 40 km/h
B) 60 km/h
C) 80 km/h
D) 100 km/h
Answer: A
Explanation: In urban built-up areas in Rwanda, the speed limit is 40 km/h unless otherwise signed.
Points: 1

2. When approaching a roundabout, who has the right of way?
A) Vehicles entering the roundabout
B) Vehicles already inside the roundabout*
C) The largest vehicle
D) Vehicles turning left
Answer: B
Explanation: Drivers entering a roundabout must yield right of way to traffic circulating inside.
Points: 1`;

const TEMPLATE_TRUE_FALSE = `1. Wearing a seatbelt is mandatory for all passengers in Rwanda.
A) True*
B) False
Answer: A
Explanation: Law requires all vehicle occupants to wear seatbelts at all times.
Points: 1

2. You may overtake on a solid continuous center white line.
A) True
B) False*
Answer: B
Explanation: A continuous solid white line strictly prohibits overtaking and lane crossing.
Points: 1`;

function parseBulkText(rawText: string): { questions: ModuleExamQuestionUI[]; errors: string[] } {
  const questions: ModuleExamQuestionUI[] = [];
  const errors: string[] = [];

  const rawBlocks = rawText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  rawBlocks.forEach((block, idx) => {
    try {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      let questionTitle = "";
      const options: { id: string; text: string; isCorrect: boolean }[] = [];
      let explicitAnswer = "";
      let explanation = "";
      let points = 1;

      // Extract lines
      lines.forEach((line) => {
        // Check for Points: X
        const pointsMatch = line.match(/^points?:\s*(\d+)/i);
        if (pointsMatch) {
          points = parseInt(pointsMatch[1], 10) || 1;
          return;
        }

        // Check for Explanation: ...
        const explMatch = line.match(/^explanation:\s*(.+)/i);
        if (explMatch) {
          explanation = explMatch[1].trim();
          return;
        }

        // Check for Answer: A or Answer: B
        const ansMatch = line.match(/^answers?:\s*([A-Za-z0-9,\s]+)/i);
        if (ansMatch) {
          explicitAnswer = ansMatch[1].trim().toUpperCase();
          return;
        }

        // Check for Option: A) ... or A. ... or [A] ...
        const optMatch = line.match(/^([A-Da-d])[\)\.\]\s\-]+(.*)/);
        if (optMatch) {
          const letter = optMatch[1].toUpperCase();
          let optText = optMatch[2].trim();
          let isCorrect = false;

          if (optText.endsWith("*") || optText.includes("(correct)") || optText.includes("(Correct)")) {
            isCorrect = true;
            optText = optText.replace(/\*|\(correct\)|\(Correct\)/gi, "").trim();
          }

          options.push({ id: letter, text: optText, isCorrect });
          return;
        }

        // Otherwise if we don't have a question title yet, this is the question text
        if (!questionTitle) {
          // Strip leading numbering like "1.", "1)", "Q1:"
          questionTitle = line.replace(/^\d+[\.\)\:\-]\s*|^[Qq]\d+[\.\)\:\-]\s*/, "").trim();
        } else {
          // Append to question title if not an option
          questionTitle += " " + line;
        }
      });

      if (!questionTitle) {
        errors.push(`Block ${idx + 1}: Missing question text`);
        return;
      }

      // Determine type
      let type: ModuleExamQuestionType = "multiple_choice";
      if (options.length === 2 && options.some((o) => o.text.toLowerCase().includes("true")) && options.some((o) => o.text.toLowerCase().includes("false"))) {
        type = "true_false";
      }

      // Determine correct answer
      let correctOptionId = "A";
      let correctOptionIds: string[] = [];

      if (explicitAnswer) {
        // e.g. "A" or "A, B"
        const parts = explicitAnswer.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
        if (parts.length > 1) {
          type = "multiple_select";
          correctOptionIds = parts;
        } else if (parts.length === 1) {
          correctOptionId = parts[0];
          correctOptionIds = [parts[0]];
        }
      } else {
        const markedOptions = options.filter((o) => o.isCorrect);
        if (markedOptions.length > 1) {
          type = "multiple_select";
          correctOptionIds = markedOptions.map((o) => o.id);
        } else if (markedOptions.length === 1) {
          correctOptionId = markedOptions[0].id;
          correctOptionIds = [markedOptions[0].id];
        }
      }

      // Ensure options standard set
      if (options.length === 0) {
        if (type === "true_false") {
          options.push({ id: "A", text: "True", isCorrect: correctOptionId === "A" });
          options.push({ id: "B", text: "False", isCorrect: correctOptionId === "B" });
        } else {
          options.push({ id: "A", text: "Option A", isCorrect: false });
          options.push({ id: "B", text: "Option B", isCorrect: false });
          options.push({ id: "C", text: "Option C", isCorrect: false });
          options.push({ id: "D", text: "Option D", isCorrect: false });
        }
      }

      const qDoc = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: questionTitle }] }],
      });

      const explDoc = explanation
        ? JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: explanation }] }],
          })
        : JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

      const newQ = createModuleExamQuestion(type, {
        id: crypto.randomUUID(),
        text: qDoc,
        options: options.map((o) => ({ id: o.id, text: o.text })),
        correctOptionId,
        correctOptionIds,
        explanation: explDoc,
        points,
      });

      questions.push(newQ);
    } catch {
      errors.push(`Block ${idx + 1}: Failed to parse format.`);
    }
  });

  return { questions, errors };
}

export function BulkQuestionModal({
  open,
  onOpenChange,
  onImport,
}: BulkQuestionModalProps) {
  const { t } = useLanguage();
  const [rawText, setRawText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const { questions: parsedQuestions, errors } = parseBulkText(rawText);

  const handleLoadTemplate = (type: "mc" | "tf") => {
    if (type === "mc") setRawText(TEMPLATE_MULTIPLE_CHOICE);
    if (type === "tf") setRawText(TEMPLATE_TRUE_FALSE);
  };

  const handleImport = async () => {
    if (parsedQuestions.length === 0) {
      toast.error(t("noValidQuestionsParsed") || "No valid questions found to import.");
      return;
    }

    setIsImporting(true);
    try {
      await onImport(parsedQuestions);
      toast.success(
        `${parsedQuestions.length} ${t("questionsImported") || "questions imported successfully!"}`
      );
      setRawText("");
      onOpenChange(false);
    } catch {
      toast.error(t("failedToImportQuestions") || "Failed to import questions.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-[var(--admin-card)] border-[var(--admin-border)]">
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex items-center justify-center">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[var(--admin-text)] flex items-center gap-2">
                  {t("bulkImportQuestions") || "Bulk Question Importer"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--admin-muted)]">
                  {t("bulkImportDesc") || "Paste multiple choice or true/false questions in formatted text or markdown."}
                </DialogDescription>
              </div>
            </div>

            {/* Template loaders */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wider">{t("template") || "Template"}:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadTemplate("mc")}
                className="h-7 text-xs px-2 border-[var(--admin-border)]"
              >
                {t("multipleChoice") || "Multiple Choice"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleLoadTemplate("tf")}
                className="h-7 text-xs px-2 border-[var(--admin-border)]"
              >
                {t("trueFalse") || "True/False"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden">
          {/* Left: Input Textarea */}
          <div className="p-4 flex flex-col border-b md:border-b-0 md:border-r border-[var(--admin-border)] bg-[var(--admin-card)]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--admin-text)] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                {t("pasteQuestionsHere") || "Paste Questions"}
              </label>
              <span className="text-[10px] text-[var(--admin-muted)]">
                {rawText.length} {t("characters") || "chars"}
              </span>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`1. What does a stop sign require?\nA) Slow down\nB) Complete stop*\nC) Yield to traffic\nAnswer: B\nExplanation: Vehicles must make a complete stop before the stop line.\nPoints: 1`}
              className="flex-1 min-h-[220px] md:min-h-[300px] text-xs font-mono resize-none border-[var(--admin-border)] focus:ring-[var(--admin-primary)]/20"
            />

            <div className="mt-2.5 p-2 rounded-md bg-[var(--admin-hover-bg)]/60 text-[11px] text-[var(--admin-muted)] space-y-1">
              <p className="font-semibold text-[var(--admin-text)]">💡 {t("formatHintTitle") || "Quick Tips"}:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>{t("formatHint1") || "Separate questions with an empty blank line."}</li>
                <li>{t("formatHint2") || "Put an asterisk * on the correct option or write Answer: A."}</li>
                <li>{t("formatHint3") || "Optionally add Explanation: ... and Points: 1."}</li>
              </ul>
            </div>
          </div>

          {/* Right: Live Parsed Preview */}
          <div className="p-4 flex flex-col bg-[var(--admin-hover-bg)]/20 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--admin-text)] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                {t("parsedPreview") || "Parsed Preview"} ({parsedQuestions.length})
              </label>
              {errors.length > 0 && (
                <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {errors.length} {t("parseWarnings") || "warnings"}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[340px] pr-2 overflow-y-auto">
              {parsedQuestions.length === 0 ? (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center text-[var(--admin-muted)]">
                  <HelpCircle className="h-10 w-10 opacity-30 mb-2" />
                  <p className="text-xs">{t("noQuestionsParsedYet") || "Type or paste questions on the left to see live preview."}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parsedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--admin-primary)]">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {q.type.replace("_", " ")}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {q.points} {q.points === 1 ? "pt" : "pts"}
                          </Badge>
                        </div>
                      </div>

                      <div className="font-medium text-[var(--admin-text)]">
                        {JSON.parse(q.text).content?.[0]?.content?.[0]?.text || "Untitled Question"}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                        {q.options.map((opt) => {
                          const isCorrect =
                            q.type === "multiple_select"
                              ? q.correctOptionIds?.includes(opt.id)
                              : q.correctOptionId === opt.id;

                          return (
                            <div
                              key={opt.id}
                              className={`px-2 py-1 rounded text-[11px] flex items-center gap-1.5 ${
                                isCorrect
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30"
                                  : "bg-[var(--admin-hover-bg)] text-[var(--admin-muted)]"
                              }`}
                            >
                              <span className="text-[10px] font-bold">{opt.id})</span>
                              <span className="truncate">{opt.text}</span>
                              {isCorrect && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-3 sm:p-4 border-t border-[var(--admin-border)] flex-shrink-0 bg-[var(--admin-card)] flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-[var(--admin-muted)] text-xs h-8"
          >
            {t("cancel") || "Cancel"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={parsedQuestions.length === 0 || isImporting}
            className="admin-btn-primary h-8 text-xs px-4 gap-1.5"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {isImporting
              ? (t("importing") || "Importing...")
              : `${t("import") || "Import"} ${parsedQuestions.length} ${t("questions") || "Questions"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
