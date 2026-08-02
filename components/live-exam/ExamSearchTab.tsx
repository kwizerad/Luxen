"use client";

import { useState } from "react";
import { IdCard, Search, Loader2, BookOpen, Wrench } from "lucide-react";
import CodeItem from "./CodeItem";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { ExamResultDetails } from "@/lib/live-exam/types";

interface ExamSearchTabProps {
  resultCache: Record<string, ExamResultDetails>;
  onViewResult: (code: string) => void;
  onCopy: (text: string) => void;
  onResultsLoaded: (results: Record<string, ExamResultDetails>) => void;
}

interface CodesResponse {
  status: "success" | "error";
  message?: string;
  candidateName?: string;
  nationalId?: string;
  practical_codes?: string[];
  theory_codes?: string[];
  results?: Record<string, ExamResultDetails>;
}

export default function ExamSearchTab({
  resultCache,
  onViewResult,
  onCopy,
  onResultsLoaded,
}: ExamSearchTabProps) {
  const { t } = useLanguage();
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [codesLoading, setCodesLoading] = useState(false);
  const [theoryCodes, setTheoryCodes] = useState<string[]>([]);
  const [practicalCodes, setPracticalCodes] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchValue = nationalId.trim();

    if (!searchValue) {
      toast.error(t("liveExamEnterId"));
      return;
    }

    if (!/^\d{16}$/.test(searchValue)) {
      toast.error(t("liveExamInvalidId"));
      return;
    }

    setLoading(true);
    setCodesLoading(true);
    setShowCodes(true);
    setTheoryCodes([]);
    setPracticalCodes([]);

    try {
      const response = await fetch("/api/check-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: searchValue }),
      });
      const data: CodesResponse = await response.json();

      if (data.status === "success") {
        fetch("/api/save-national-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ national_id: searchValue }),
        }).catch(() => {});
        const tCodes = data.theory_codes || [];
        const pCodes = data.practical_codes || [];

        if (data.results) {
          onResultsLoaded(data.results);
        }

        setTheoryCodes(tCodes);
        setPracticalCodes(pCodes);

        if (tCodes.length === 0 && pCodes.length === 0) {
          toast.error(t("liveExamNoCodes"));
        } else {
          toast.success(t("liveExamCodesFound").replace("{count}", String(tCodes.length + pCodes.length)));
        }
      } else if (data.status === "error") {
        toast.error(data.message || t("liveExamNoRecords"));
        setShowCodes(false);
      } else {
        toast.error(t("liveExamUnexpectedResponse"));
      }
    } catch {
      toast.error(t("liveExamConnectionError"));
    } finally {
      setLoading(false);
      setCodesLoading(false);
    }
  };

  const renderCodeList = (codes: string[], type: string) => {
    if (codesLoading) {
      return (
        <div className="animate-pulse rounded-xl border bg-card p-3">
          <div className="mb-2 h-2.5 w-full rounded-full bg-muted" />
          <div className="mb-2 h-2.5 w-3/4 rounded-full bg-muted" />
          <div className="h-2.5 w-2/5 rounded-full bg-muted" />
        </div>
      );
    }

    if (!codes || codes.length === 0) {
      return (
        <div className="py-5 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-1.5 h-6 w-6 opacity-40" />
          {t("liveExamNoCodesType").replace("{type}", type)}
        </div>
      );
    }

    return (
      <div>
        {codes.map((code) => (
          <CodeItem
            key={code}
            code={code}
            onView={onViewResult}
            onCopy={onCopy}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-bold text-muted-foreground">
            <IdCard className="mr-1.5 inline h-4 w-4 text-primary" />
            {t("liveExamNationalId")}
          </label>
          <input
            type="text"
            maxLength={50}
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            placeholder={t("liveExamIdPlaceholder")}
            required
            className="w-full rounded-xl border bg-card px-3.5 py-3 text-[15px] transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[15px] font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
              {t("liveExamSearching")}
            </>
          ) : (
            <>
              <Search className="h-[18px] w-[18px]" />
              {t("liveExamFetchCodes")}
            </>
          )}
        </button>
      </form>

      {showCodes && (
        <div className="mt-5 overflow-hidden rounded-xl border-2">
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            {/* Theory Column */}
            <div className="border-b-2 px-4 py-4 sm:border-b-0 sm:border-r-2">
              <div className="mb-3 flex items-center gap-2 border-b-2 pb-2 text-sm font-bold text-violet-600 dark:text-violet-400">
                <BookOpen className="h-4 w-4" />
                {t("liveExamTheoryCodes")}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {codesLoading ? "•" : theoryCodes.length}
                </span>
              </div>
              {renderCodeList(theoryCodes, "theory")}
            </div>

            {/* Practical Column */}
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center gap-2 border-b-2 pb-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <Wrench className="h-4 w-4" />
                {t("liveExamPracticalCodes")}
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {codesLoading ? "•" : practicalCodes.length}
                </span>
              </div>
              {renderCodeList(practicalCodes, "practical")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
