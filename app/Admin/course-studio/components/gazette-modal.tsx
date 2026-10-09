"use client";

import { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  Search,
  RefreshCw,
  ShieldAlert,
  Footprints,
  Eye,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { GazetteAnalysisResult } from "@/lib/ai/gazette-analyzer";

interface SignCatalogItem {
  path: string;
  publicUrl: string;
  title_en: string;
  title_rw: string;
  title_fr: string;
  category: string;
  shape_color: string;
  meaning_en: string;
  meaning_rw: string;
  meaning_fr: string;
  pedestrian_relevant: boolean;
  pedestrian_rule_en?: string;
  pedestrian_rule_rw?: string;
  pedestrian_rule_fr?: string;
  topics: string[];
  inspectedByVision?: boolean;
}

interface GazetteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCourseId: string;
  onImportModule: (result: GazetteAnalysisResult) => Promise<void>;
}

const PRESET_COMMANDS = [
  {
    label: "Pedestrians Module + Signs (Gazette 2026)",
    icon: Footprints,
    prompt:
      "Generate a complete module from the Rwanda Traffic Gazette 2026 that refers or belongs to pedestrians, including pedestrian rules, rights, crossings, prohibited entry zones, and all road signs every pedestrian must know from the repository [images] folder.",
  },
  {
    label: "Regulatory & Prohibition Signs",
    icon: ShieldAlert,
    prompt:
      "Generate a complete module on Regulatory, Mandatory, and Prohibition Signs from the Rwanda Traffic Gazette 2026, matching the official sign images from the repository [images] folder with notes and visual practice questions.",
  },
  {
    label: "Priority, Intersections & Speed Limits",
    icon: BookOpen,
    prompt:
      "Extract priority rules at intersections, roundabouts, stop/yield signs, and urban/rural speed limits from the Rwanda Traffic Gazette 2026 with matched road signs from the [images] folder.",
  },
];

export function GazetteModal({
  open,
  onOpenChange,
  targetCourseId,
  onImportModule,
}: GazetteModalProps) {
  const [activeTab, setActiveTab] = useState<"generator" | "catalog">("generator");
  const [gazetteText, setGazetteText] = useState("");
  const [instructions, setInstructions] = useState(
    "Generate a complete module from the Rwanda Traffic Gazette 2026 that refers or belongs to pedestrians, with the road signs every pedestrian must know from the [images] folder."
  );
  const [language, setLanguage] = useState<"English" | "French" | "Kinyarwanda">("English");
  const [useRepoSignCatalog, setUseRepoSignCatalog] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GazetteAnalysisResult | null>(null);

  // Sign catalog states
  const [catalog, setCatalog] = useState<SignCatalogItem[]>([]);
  const [catalogStats, setCatalogStats] = useState<{
    total: number;
    pedestrianCount: number;
    visionInspectedCount: number;
  } | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogReindexing, setCatalogReindexing] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<"all" | "pedestrian" | "vision">("all");

  // File attach & drop states
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; isBinary?: boolean } | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSignCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/courses/sign-catalog");
      const data = await res.json();
      if (data.success) {
        setCatalog(data.catalog || []);
        setCatalogStats({
          total: data.total || 0,
          pedestrianCount: data.pedestrianCount || 0,
          visionInspectedCount: data.visionInspectedCount || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load sign catalog:", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (open && catalog.length === 0) {
      fetchSignCatalog();
    }
  }, [open, catalog.length]);

  const handleReindexVision = async () => {
    setCatalogReindexing(true);
    try {
      const res = await fetch("/api/admin/courses/sign-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reindexUninspected: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Vision scan failed");
      }
      setCatalog(data.catalog || []);
      toast.success(
        `AI Vision inspected ${data.updatedCount || 0} new/unverified images (${data.total || 0} total signs indexed)!`
      );
      await fetchSignCatalog();
    } catch (err: any) {
      toast.error(err.message || "Failed to run AI Vision sign inspection");
    } finally {
      setCatalogReindexing(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDoc = file.name.toLowerCase().endsWith(".doc") || file.name.toLowerCase().endsWith(".docx");
    const isText =
      file.type.startsWith("text/") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".md") ||
      file.name.toLowerCase().endsWith(".json");

    setAttachedFile({ name: file.name, size: sizeStr, isBinary: isPdf || isDoc });

    if (isPdf || isDoc || !isText) {
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
    const hasInstructions = instructions.trim().length >= 5;

    if (!hasText && !hasFile && !hasInstructions) {
      toast.error("Please provide AI instructions, attach a Gazette PDF, or paste Gazette text.");
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
          useRepoSignCatalog,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysisResult(data.data);
      toast.success(
        `Generated "${data.data.moduleTitle}" in ${language} with ${
          data.data.matchedSigns?.length || 0
        } repository road signs!`
      );
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
    } catch (err: any) {
      toast.error(err.message || "Failed to import module");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    if (catalogFilter === "pedestrian" && !item.pedestrian_relevant) return false;
    if (catalogFilter === "vision" && !item.path.toLowerCase().includes("gemini_generated")) return false;
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase();
    return (
      item.title_en.toLowerCase().includes(q) ||
      item.title_rw.toLowerCase().includes(q) ||
      item.title_fr.toLowerCase().includes(q) ||
      item.meaning_en.toLowerCase().includes(q) ||
      item.path.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background dark:bg-[#0c1120] text-foreground dark:text-slate-100 border border-border dark:border-slate-800 shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
                  <span>Rwanda Traffic Gazette 2026 &amp; AI Vision Sign Studio</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5">
                  Generate modules in Kinyarwanda, English, or French with automatic AI Vision sign matching from your repository{" "}
                  <code className="px-1 py-0.5 rounded bg-muted dark:bg-slate-800 text-[11px]">/images</code> folder.
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-muted/70 dark:bg-slate-900 p-1 rounded-lg border border-border dark:border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("generator")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "generator"
                    ? "bg-background dark:bg-slate-800 text-foreground dark:text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                AI Module Generator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "catalog"
                    ? "bg-background dark:bg-slate-800 text-foreground dark:text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                Sign Vision Catalog ({catalogStats?.total || 100})
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
          {activeTab === "catalog" ? (
            /* Sign Vision Catalog Browser */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>Visual AI Sign Inspection Active (Filename-Independent)</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                    Even files named <code className="text-foreground">Gemini_Generated_Image_*.png</code>,{" "}
                    <code className="text-foreground">Screenshot*.png</code>, or foreign codes (<code className="text-foreground">B9a</code>,{" "}
                    <code className="text-foreground">C22</code>) are visually inspected by Gemini Vision and mapped to Kinyarwanda, English &amp; French titles.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReindexVision}
                  disabled={catalogReindexing}
                  className="h-8 text-xs shrink-0 gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${catalogReindexing ? "animate-spin" : ""}`} />
                  {catalogReindexing ? "Scanning with Vision..." : "Re-Scan Folder"}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search signs in English, Kinyarwanda, French, or filename..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCatalogFilter("all")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                      catalogFilter === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    All Signs ({catalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter("pedestrian")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer flex items-center gap-1 ${
                      catalogFilter === "pedestrian"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    <Footprints className="h-3 w-3" />
                    Pedestrian Signs ({catalog.filter((c) => c.pedestrian_relevant).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogFilter("vision")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer ${
                      catalogFilter === "vision"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-muted/40 border-border text-muted-foreground"
                    }`}
                  >
                    Unlabeled / Gemini Files (
                    {catalog.filter((c) => c.path.toLowerCase().includes("gemini_generated")).length})
                  </button>
                </div>
              </div>

              {catalogLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Loading visual sign catalog...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[52vh] overflow-y-auto pr-1">
                  {filteredCatalog.map((sign) => (
                    <div
                      key={sign.path}
                      className="p-3 rounded-xl border border-border dark:border-slate-800 bg-muted/20 dark:bg-slate-900/50 flex gap-3 items-start hover:border-primary/40 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-lg bg-white p-1.5 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={sign.publicUrl}
                          alt={sign.title_en}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h6 className="text-xs font-bold text-foreground dark:text-slate-100 leading-tight">
                            {language === "Kinyarwanda"
                              ? sign.title_rw
                              : language === "French"
                              ? sign.title_fr
                              : sign.title_en}
                          </h6>
                          {sign.pedestrian_relevant && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-bold shrink-0">
                              Pedestrian
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground dark:text-slate-400 line-clamp-2">
                          {language === "Kinyarwanda"
                            ? sign.meaning_rw
                            : language === "French"
                            ? sign.meaning_fr
                            : sign.meaning_en}
                        </p>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                          {sign.path.split("/").pop()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !analysisResult ? (
            <>
              {/* Quick Command Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground dark:text-slate-200 flex items-center justify-between">
                  <span>1. Choose or Customize AI Command</span>
                  <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                    ✓ Built-in Rwanda Gazette 2026 + 100 Repo Road Signs Ready
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRESET_COMMANDS.map((preset, idx) => {
                    const Icon = preset.icon;
                    const isSelected = instructions === preset.prompt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInstructions(preset.prompt)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-foreground dark:text-white shadow-xs"
                            : "border-border dark:border-slate-800 bg-muted/20 dark:bg-slate-900/40 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold leading-snug">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Command & Language Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground dark:text-slate-200">
                    AI Command / Topic Focus
                  </label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Generate a module from the whole Gazette that refers to pedestrians with the signs every pedestrian must know from [images] folder..."
                    className="min-h-[68px] text-xs bg-background dark:bg-slate-900/70 border-border dark:border-slate-800 text-foreground dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground dark:text-slate-200 flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5 text-primary" />
                      Output Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full h-9 text-xs rounded-md bg-background dark:bg-slate-900/70 border border-border dark:border-slate-800 px-2.5 text-foreground dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="Kinyarwanda">Kinyarwanda 🇷🇼</option>
                      <option value="English">English 🇬🇧</option>
                      <option value="French">Français 🇫🇷</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-foreground dark:text-slate-200 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={useRepoSignCatalog}
                      onChange={(e) => setUseRepoSignCatalog(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Auto-embed matched signs from `/images`</span>
                  </label>
                </div>
              </div>

              {/* Optional PDF / Text Override Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-3.5 transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
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

                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground dark:text-slate-100">
                    Optional: Attach additional Gazette PDF/TXT or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Paperclip className="h-3 w-3 inline" /> browse file
                    </button>
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                  Leave empty to use the built-in Official Rwanda Traffic Gazette 2026 &amp; 100 AI-inspected repository road signs.
                </p>

                {attachedFile && (
                  <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

              {/* Optional Textarea for Direct Paste */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground dark:text-slate-200">
                  <span>Optional Extra Gazette Articles / Notes</span>
                  <span className="text-[11px] font-normal text-muted-foreground dark:text-slate-400">
                    {gazetteText.length > 0
                      ? `${gazetteText.length.toLocaleString()} characters`
                      : "Uses Official Gazette 2026 automatically if left blank"}
                  </span>
                </div>
                <Textarea
                  value={gazetteText}
                  onChange={(e) => setGazetteText(e.target.value)}
                  placeholder="Optional: Paste specific articles or leave blank to generate directly from Rwanda Traffic Gazette 2026..."
                  className="min-h-[85px] text-xs font-mono bg-background dark:bg-slate-900/70 border-border dark:border-slate-800 text-foreground dark:text-slate-100 shadow-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-1 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Generates lessons, rich notes with embedded sign images, and visual exam questions in{" "}
                  <strong className="text-foreground">{language}</strong>.
                </span>
                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || (!gazetteText.trim() && !fileData && !instructions.trim())}
                  className="h-9 text-xs px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating {language} Module &amp; Matching Signs...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate {language} Module &amp; Signs
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Analysis Result Preview */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Curriculum Generated in {language}</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-semibold">
                    {analysisResult.matchedSigns?.length || 0} Road Signs Embedded
                  </span>
                </div>
                <h4 className="text-base font-bold text-foreground dark:text-slate-100">
                  {analysisResult.moduleTitle}
                </h4>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {analysisResult.moduleDescription}
                </p>
              </div>

              {/* Matched Signs Preview Strip */}
              {analysisResult.matchedSigns && analysisResult.matchedSigns.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-foreground dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                    Matched Road Signs from Repository ({analysisResult.matchedSigns.length})
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {analysisResult.matchedSigns.slice(0, 8).map((sign, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl border border-border dark:border-slate-800 bg-muted/30 dark:bg-slate-900/60 flex items-center gap-2"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center">
                          <img
                            src={sign.publicUrl}
                            alt={sign.title}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-foreground dark:text-slate-100 truncate">
                            {sign.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{sign.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    {analysisResult.questions.slice(0, 4).map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 text-xs text-foreground dark:text-slate-200 flex items-center gap-3"
                      >
                        {q.question_image && (
                          <div className="w-9 h-9 rounded bg-white p-1 border border-slate-200 shrink-0 flex items-center justify-center">
                            <img
                              src={q.question_image}
                              alt="Question sign"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-primary mr-1.5">Q{idx + 1}:</span>
                          <span>{q.question}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {activeTab === "generator" && analysisResult && (
          <div className="p-3 sm:p-4 border-t border-border dark:border-slate-800 bg-muted/40 dark:bg-slate-900/60 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnalysisResult(null)}
              disabled={isImporting}
              className="text-xs h-8"
            >
              Back to Prompt
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
