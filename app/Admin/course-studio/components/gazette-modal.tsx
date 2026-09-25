"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  FileText,
  Loader2,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { GazetteAnalysisResult } from "@/lib/ai/gazette-analyzer";

interface GazetteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCourseId: string;
  onImportModule: (result: GazetteAnalysisResult) => Promise<void>;
}

export function GazetteModal({
  open,
  onOpenChange,
  targetCourseId,
  onImportModule,
}: GazetteModalProps) {
  const [gazetteText, setGazetteText] = useState("");
  const [instructions, setInstructions] = useState(
    "Extract newly updated traffic rules, speed limits, roundabout priorities, road signs, and official penalties. Generate lessons with clear notes and exam questions."
  );
  const [language, setLanguage] = useState<"English" | "French" | "Kinyarwanda">("English");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GazetteAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!gazetteText.trim() || gazetteText.length < 20) {
      toast.error("Please paste the text or excerpt from the Rwanda Traffic Gazette.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/admin/courses/gazette-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gazetteText,
          instructions,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data.data);
      toast.success("Gazette analyzed successfully! Review the generated curriculum below.");
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze gazette");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!analysisResult) return;
    setIsImporting(true);
    try {
      await onImportModule(analysisResult);
      toast.success(`Module "${analysisResult.moduleTitle}" imported into course!`);
      onOpenChange(false);
      setAnalysisResult(null);
      setGazetteText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to import module");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)]">
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--admin-border)] bg-[var(--admin-card)]/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Rwanda Traffic Gazette AI (Amategeko y&apos;Umuhanda)
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--admin-muted)]">
                Provide official Rwanda Gazette updates or road traffic laws to auto-generate structured notes, lessons, and practice questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!analysisResult ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--admin-text)] flex items-center justify-between">
                  <span>Gazette Law Text / Official Announcement</span>
                  <span className="text-[11px] text-[var(--admin-muted)]">
                    Paste text or articles from the Official Gazette
                  </span>
                </label>
                <Textarea
                  value={gazetteText}
                  onChange={(e) => setGazetteText(e.target.value)}
                  placeholder="Paste articles, clauses, or updates from the Rwanda Road and Traffic Gazette (Inyandiko z'Amategeko y'Umuhanda mu Rwanda)..."
                  className="min-h-[160px] text-xs font-mono bg-[var(--admin-card)] border-[var(--admin-border)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--admin-text)]">
                    Curriculum Generation Instructions
                  </label>
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Instructions for the AI..."
                    className="h-8 text-xs bg-[var(--admin-card)] border-[var(--admin-border)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--admin-text)]">
                    Primary Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full h-8 text-xs rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] px-2 text-[var(--admin-text)]"
                  >
                    <option value="English">English 🇬🇧</option>
                    <option value="French">Français 🇫🇷</option>
                    <option value="Kinyarwanda">Kinyarwanda 🇷🇼</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || !gazetteText.trim()}
                  className="admin-btn-primary h-9 text-xs px-4 gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing Gazette with Gemini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze &amp; Generate Notes
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Generated Module: {analysisResult.moduleTitle}
                  </h4>
                  <p className="text-[11px] text-[var(--admin-muted)] mt-0.5">
                    {analysisResult.lessons.length} Lessons •{" "}
                    {analysisResult.lessons.reduce((acc, l) => acc + l.topics.length, 0)} Topics •{" "}
                    {analysisResult.questions.length} Exam Questions
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnalysisResult(null)}
                  className="h-7 text-xs"
                >
                  Edit Input
                </Button>
              </div>

              {analysisResult.keyLawArticlesReferenced.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-[var(--admin-muted)] font-medium">Articles:</span>
                  {analysisResult.keyLawArticlesReferenced.map((art, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)]"
                    >
                      {art}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-[var(--admin-muted)] uppercase tracking-wider">
                  Lessons &amp; Topics Outline
                </h5>
                <div className="space-y-2">
                  {analysisResult.lessons.map((les, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] space-y-1.5"
                    >
                      <div className="flex items-center gap-2 font-medium text-xs text-[var(--admin-text)]">
                        <BookOpen className="h-3.5 w-3.5 text-[var(--admin-primary)]" />
                        <span>Lesson {lIdx + 1}: {les.title}</span>
                      </div>
                      <div className="pl-5 space-y-1">
                        {les.topics.map((tp, tIdx) => (
                          <div
                            key={tIdx}
                            className="flex items-center justify-between text-[11px] text-[var(--admin-muted)] py-0.5"
                          >
                            <span>• {tp.title}</span>
                            <span className="font-mono text-[10px]">{tp.estimated_minutes} min read</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analysisResult.questions.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-[var(--admin-muted)] uppercase tracking-wider">
                    Generated Quiz Questions
                  </h5>
                  <div className="space-y-1.5">
                    {analysisResult.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-2.5 rounded border border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/30 text-xs space-y-1"
                      >
                        <div className="font-medium text-[var(--admin-text)]">
                          {qIdx + 1}. {q.question}
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          Correct: Option {q.correct_answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="p-3 sm:p-4 border-t border-[var(--admin-border)] bg-[var(--admin-card)] flex items-center justify-between">
            <span className="text-xs text-[var(--admin-muted)]">
              Ready to add to your course curriculum
            </span>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="admin-btn-primary h-8 text-xs px-4 gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Import into Course
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
