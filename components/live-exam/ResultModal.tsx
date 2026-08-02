"use client";

import {
  X,
  FileText,
  IdCard,
  Key,
  Tag,
  Calendar,
  MapPin,
  Star,
  Flag,
  Award,
  Wrench,
  BookOpen,
  Copy,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/language-context";
import type { ExamResultDetails } from "@/lib/live-exam/types";

interface ResultModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ExamResultDetails | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export default function ResultModal({
  open,
  loading,
  error,
  data,
  onClose,
  onCopy,
}: ResultModalProps) {
  const { t } = useLanguage();

  const statusColors: Record<string, { bg: string; text: string }> = {
    approved: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
    pending: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
    rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
  };

  const getStatusBadge = (status: string) => {
    if (!status || status === "N/A") return null;
    const colors = statusColors[status.toLowerCase()] || {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-600 dark:text-red-400",
    };
    return (
      <span
        className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}
      >
        {status}
      </span>
    );
  };

  const modalTitle = data
    ? `${data.isPractical ? t("liveExamPractical") : t("liveExamTheory")} ${t("liveExamResults")}`
    : error
      ? t("error")
      : t("liveExamResults");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-primary px-6 py-4 text-primary-foreground">
          <div className="pointer-events-none absolute -top-1/2 -right-20 h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-60 -left-10 h-[150px] w-[150px] rounded-full bg-white/[0.04]" />
          <DialogHeader className="relative z-1 space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <FileText className="h-4 w-4" />
                </div>
                <DialogTitle className="text-base font-bold tracking-[-0.3px]">
                  {modalTitle}
                </DialogTitle>
              </div>
              <button
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-all hover:bg-white/25"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="max-h-[500px] overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-medium text-muted-foreground">
                {t("liveExamLoadingResults")}
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-10 text-center">
              <AlertCircle className="mx-auto mb-3 h-12 w-12 text-destructive" />
              <div className="text-base font-bold text-destructive">{error}</div>
              <div className="mt-3 text-sm text-muted-foreground">
                <Info className="mr-1 inline h-4 w-4" />
                {t("liveExamTryAgain")}
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <div>
              {/* Candidate Info */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-4 py-3">
                <div>
                  <div className="text-base font-bold">
                    {data.candidateName || "N/A"}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IdCard className="h-3.5 w-3.5" />
                    {data.nationalId || "N/A"}
                  </div>
                </div>
                <div>
                  {data.isPractical ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Wrench className="h-3 w-3" />
                      {t("liveExamPractical")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                      <BookOpen className="h-3 w-3" />
                      {t("liveExamTheory")}
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Rows */}
              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Key className="h-3.5 w-3.5" />
                  {t("liveExamRegCodeLabel")}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-sm font-semibold">
                  {data.registrationCode || "N/A"}
                  <button
                    className="rounded border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground"
                    onClick={() => onCopy(data.registrationCode || "")}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              </div>

              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  {t("liveExamLicenseCategory")}
                </span>
                <span className="text-sm font-semibold">
                  {data.licenseCategory || "N/A"}
                </span>
              </div>

              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("liveExamDate")}
                </span>
                <span className="text-sm font-semibold">
                  {data.examDate || "N/A"}
                </span>
              </div>

              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("liveExamTestCenter")}
                </span>
                <span className="text-right text-sm font-semibold">
                  {data.testCenter || "N/A"}
                </span>
              </div>

              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  {t("liveExamScore")}
                </span>
                <span className="text-sm font-semibold">
                  <span className="text-base text-primary">
                    {data.marksObtained || 0}
                  </span>{" "}
                  / {data.totalMarks || 20}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({t("liveExamPassMark")}: {data.passMark || 20})
                  </span>
                </span>
              </div>

              <div className="flex justify-between border-b py-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Flag className="h-3.5 w-3.5" />
                  {t("liveExamResult")}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    data.passed ? "text-success" : "text-destructive"
                  }`}
                >
                  {data.passed ? `✅ ${t("liveExamPassed")}` : `❌ ${t("liveExamFailed")}`}
                  {getStatusBadge(data.status) && (
                    <span className="ml-1.5">
                      {getStatusBadge(data.status)}
                    </span>
                  )}
                </span>
              </div>

              {data.grade && data.grade !== "N/A" && (
                <div className="flex justify-between py-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Award className="h-3.5 w-3.5" />
                    {t("liveExamGrade")}
                  </span>
                  <span className="text-sm font-semibold">
                    {data.grade}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-muted/30 px-6 py-3">
          <button
            className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px"
            onClick={onClose}
          >
            <span className="flex items-center gap-1.5">
              <X className="h-4 w-4" />
              {t("close")}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
