"use client";

import { useState, useRef } from "react";
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
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Plus,
  UploadCloud,
  Paperclip,
  X,
  FileCheck,
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

  // File attach & drop states
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; isBinary?: boolean } | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDoc = file.name.toLowerCase().endsWith(".doc") || file.name.toLowerCase().endsWith(".docx");
    const isText = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md") || file.name.toLowerCase().endsWith(".json");

    setAttachedFile({ name: file.name, size: sizeStr, isBinary: isPdf || isDoc });

    if (isPdf || isDoc || !isText) {
      // Read as Data URL (base64) so Gemini can process the PDF directly
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setFileData({
            base64: result,
            mimeType: file.type || "application/pdf",
            name: file.name,
          });
          toast.success(`Attached "${file.name}" (${sizeStr}) - ready for AI extraction!`);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read document.");
      };
      reader.readAsDataURL(file);
    } else {
      // Read as text
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          setGazetteText(content);
          setFileData(null);
          toast.success(`Attached "${file.name}" (${sizeStr}) and loaded content!`);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file contents.");
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
    setFileData(null);
    setGazetteText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    const hasText = gazetteText.trim().length >= 20;
    const hasFile = Boolean(fileData?.base64);

    if (!hasText && !hasFile) {
      toast.error("Please drop/attach a Gazette document (PDF, TXT, etc.) or paste text from the Rwanda Traffic Gazette.");
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
          fileData,
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
      setAttachedFile(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to import module");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background dark:bg-[#0c1120] text-foreground dark:text-slate-100 border border-border dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground dark:text-slate-100">
                Rwanda Traffic Gazette AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5">
                Drop, attach, or paste official Rwanda Gazette updates to auto-generate structured notes, lessons, and practice questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
          {!analysisResult ? (
            <>
              {/* File Dropzone & Attach Controls */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 sm:p-5 transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[0.99]"
                    : "border-border dark:border-slate-800 bg-muted/20 dark:bg-slate-900/40 hover:bg-muted/40 hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".txt,.pdf,.doc,.docx,.md,.json"
                  className="hidden"
                />

                <div className="p-2.5 rounded-full bg-primary/10 text-primary mb-0.5">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground dark:text-slate-100">
                    Drag and drop Gazette document here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="h-3.5 w-3.5 inline" /> browse file
                    </button>
                  </p>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-0.5">
                    Supports .txt, .pdf, .md, .doc, .docx, .json official gazette files
                  </p>
                </div>

                {/* Attached File Chip */}
                {attachedFile && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate max-w-xs">{attachedFile.name}</span>
                    <span className="text-[10px] text-muted-foreground">({attachedFile.size})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="hover:text-red-500 transition-colors ml-1 p-0.5 cursor-pointer"
                      title="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea for Direct Paste or Review */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground dark:text-slate-200">
                  <span>Gazette Law Text / Official Content</span>
                  <span className="text-[11px] font-normal text-muted-foreground dark:text-slate-400">
                    {gazetteText.length > 0 ? `${gazetteText.length.toLocaleString()} characters` : "Or paste directly below"}
                  </span>
                </div>
                <Textarea
                  value={gazetteText}
                  onChange={(e) => setGazetteText(e.target.value)}
                  placeholder="Paste articles, clauses, or updates from the Official Rwanda Road and Traffic Gazette..."
                  className="min-h-[140px] text-xs font-mono bg-background dark:bg-slate-900/70 border-border dark:border-slate-800 text-foreground dark:text-slate-100 shadow-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground dark:text-slate-200">
                    Curriculum Generation Instructions
                  </label>
                  <Input
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Instructions for the AI..."
                    className="h-9 text-xs bg-background dark:bg-slate-900/70 border-border dark:border-slate-800 text-foreground dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground dark:text-slate-200">
                    Primary Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full h-9 text-xs rounded-md bg-background dark:bg-slate-900/70 border border-border dark:border-slate-800 px-2.5 text-foreground dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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
                  disabled={isLoading || (!gazetteText.trim() && !fileData)}
                  className="h-9 text-xs px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
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
            /* Analysis Result Preview */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Curriculum Generated Successfully</span>
                </div>
                <h4 className="text-base font-bold text-foreground dark:text-slate-100">
                  {analysisResult.moduleTitle}
                </h4>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {analysisResult.moduleDescription}
                </p>
              </div>

              {/* Lessons Preview */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-foreground dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  Lessons &amp; Generated Topics ({analysisResult.lessons?.length || 0})
                </h5>
                <div className="space-y-2">
                  {analysisResult.lessons?.map((les, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground dark:text-slate-100">
                          {idx + 1}. {les.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {les.topics?.length || 0} topics
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {les.topics?.map((tp, tpIdx) => (
                          <span
                            key={tpIdx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-background dark:bg-slate-800 border border-border/80 dark:border-slate-700 text-muted-foreground dark:text-slate-300"
                          >
                            {tp.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Questions Preview */}
              {analysisResult.questions?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-foreground dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                    Practice Exam Questions ({analysisResult.questions.length})
                  </h5>
                  <div className="space-y-1.5">
                    {analysisResult.questions.slice(0, 3).map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 text-xs text-foreground dark:text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="font-bold text-primary shrink-0">Q{idx + 1}:</span>
                        <span>{q.question}</span>
                      </div>
                    ))}
                    {analysisResult.questions.length > 3 && (
                      <p className="text-[11px] text-muted-foreground dark:text-slate-400 italic pl-1">
                        + {analysisResult.questions.length - 3} more questions included
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="p-3 sm:p-4 border-t border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalysisResult(null)}
              disabled={isImporting}
              className="text-xs h-8"
            >
              Back to Input
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="h-8 text-xs px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importing to Course...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Import Module into Course
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
