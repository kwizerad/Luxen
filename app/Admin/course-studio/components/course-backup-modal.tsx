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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-context";
import { Course } from "@/lib/courses-store";
import { Download, Upload, Copy, Check, FileJson, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CourseBackupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | undefined;
  onImportCourseData?: (data: Partial<Course>) => Promise<void>;
}

export function CourseBackupModal({
  open,
  onOpenChange,
  course,
  onImportCourseData,
}: CourseBackupModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const courseJson = course ? JSON.stringify(course, null, 2) : "";

  const handleDownloadJson = () => {
    if (!course) return;
    const blob = new Blob([courseJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("courseExportSuccess") || "Course exported to JSON file successfully!");
  };

  const handleCopyJson = () => {
    if (!course) return;
    navigator.clipboard.writeText(courseJson);
    setCopied(true);
    toast.success(t("jsonCopiedToClipboard") || "Course JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportSubmit = async () => {
    if (!importJson.trim()) return;
    try {
      const parsed = JSON.parse(importJson.trim());
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid JSON structure");
      }
      setIsImporting(true);
      if (onImportCourseData) {
        await onImportCourseData(parsed);
      }
      toast.success(t("courseImportSuccess") || "Course data imported successfully!");
      setImportJson("");
      onOpenChange(false);
    } catch {
      toast.error(t("invalidCourseJson") || "Invalid course JSON format.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-[var(--admin-card)] border-[var(--admin-border)]">
        <DialogHeader className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] flex items-center justify-center">
              <FileJson className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[var(--admin-text)]">
                {t("courseBackupExportImport") || "Course Backup & Export / Import"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--admin-muted)]">
                {course?.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="export" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 border-b border-[var(--admin-border)]">
            <TabsList className="grid grid-cols-2 max-w-xs h-8">
              <TabsTrigger value="export" className="text-xs flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {t("export") || "Export"}
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {t("import") || "Import"}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="export" className="flex-1 p-4 flex flex-col gap-3 m-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--admin-muted)]">
                {t("exportCourseDesc") || "Export the full course hierarchy (modules, lessons, topics, exams) for backup or versioning."}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  className="h-8 text-xs gap-1.5 border-[var(--admin-border)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? (t("copied") || "Copied") : (t("copy") || "Copy")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadJson}
                  className="admin-btn-primary h-8 text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadJson") || "Download JSON"}
                </Button>
              </div>
            </div>

            <Textarea
              readOnly
              value={courseJson}
              className="flex-1 min-h-[260px] font-mono text-xs border-[var(--admin-border)] bg-[var(--admin-hover-bg)]/40 resize-none"
            />
          </TabsContent>

          <TabsContent value="import" className="flex-1 p-4 flex flex-col gap-3 m-0 overflow-hidden">
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {t("importWarning") || "Importing course JSON will update draft contents. Always verify exported backups before applying major overwrites."}
              </span>
            </div>

            <label className="text-xs font-semibold text-[var(--admin-text)]">
              {t("pasteCourseJson") || "Paste Course JSON"}:
            </label>

            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste exported Course JSON here..."
              className="flex-1 min-h-[220px] font-mono text-xs border-[var(--admin-border)] resize-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs text-[var(--admin-muted)]"
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImportSubmit}
                disabled={!importJson.trim() || isImporting}
                className="admin-btn-primary h-8 text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                {isImporting ? (t("importing") || "Importing...") : (t("importCourseData") || "Import Course Data")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
