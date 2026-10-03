"use client";

import { useState } from "react";
import {
  IdCard,
  Search,
  Loader2,
  BookOpen,
  Wrench,
  AlertCircle,
  ShieldCheck,
  User,
  Calendar,
  ArrowRight,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  MapPin,
  Award,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type {
  ExamResultDetails,
} from "@/lib/live-exam/types";

interface ExamSearchTabProps {
  resultCache: Record<string, ExamResultDetails>;
  onViewResult: (code: string) => void;
  onCopy: (text: string) => void;
  onResultsLoaded: (results: Record<string, ExamResultDetails>) => void;
}

interface CodesResponse {
  status: "success" | "error";
  code?: string;
  message?: string;
  candidateName?: string;
  nationalId?: string;
  practical_codes?: string[];
  theory_codes?: string[];
  results?: Record<string, ExamResultDetails>;
}

// Bumped cache prefix to v3 so any previously misclassified Theory/Practical caches are cleared
const EXAM_CACHE_PREFIX = "luxen:exam-codes:v3:";

function setCachedExamData(id: string, data: CodesResponse): void {
  try {
    localStorage.setItem(EXAM_CACHE_PREFIX + id, JSON.stringify({ _ts: Date.now(), data }));
  } catch {
    // storage full or unavailable — silently skip
  }
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
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [theoryCodes, setTheoryCodes] = useState<string[]>([]);
  const [practicalCodes, setPracticalCodes] = useState<string[]>([]);
  const [localResults, setLocalResults] = useState<Record<string, ExamResultDetails>>({});
  const [noCodesMessage, setNoCodesMessage] = useState(false);

  // Mandatory Popout Verification Modal State (triggered automatically on 16th digit)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"name" | "dob">("name");
  const [singleName, setSingleName] = useState("");
  const [dob, setDob] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleNationalIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 16);
    setNationalId(digitsOnly);

    if (digitsOnly.length < 16) {
      setShowCodes(false);
      setNoCodesMessage(false);
      setVerifyModalOpen(false);
    } else if (digitsOnly.length === 16) {
      // Automatically & directly show popout modal when user reaches the 16th digit
      setVerifyError(null);
      setVerifyModalOpen(true);
    }
  };

  const handleOpenVerifyModal = (e: React.FormEvent) => {
    e.preventDefault();
    const searchValue = nationalId.trim().replace(/\D/g, "");

    if (!searchValue) {
      toast.error(t("liveExamEnterId"));
      return;
    }

    if (searchValue.length !== 16) {
      toast.error(t("liveExamInvalidId"));
      return;
    }

    setVerifyError(null);
    setVerifyModalOpen(true);
  };

  const handleVerifyAndFetchResults = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchValue = nationalId.trim().replace(/\D/g, "");

    if (searchValue.length !== 16) {
      setVerifyError(t("liveExamInvalidId") || "Please enter a valid 16-digit National ID.");
      return;
    }

    const verificationValue =
      verificationMethod === "name" ? singleName.trim() : dob.trim();

    if (!verificationValue || (verificationMethod === "name" && verificationValue.length < 2)) {
      setVerifyError(
        verificationMethod === "name"
          ? t("singleNameHint") || "Please enter at least one of your names (First or Last Name)."
          : t("dobHint") || "Please enter your Date of Birth."
      );
      return;
    }

    setLoading(true);
    setCodesLoading(true);
    setVerifyError(null);
    setTheoryCodes([]);
    setPracticalCodes([]);
    setLocalResults({});
    setCandidateName(null);
    setNoCodesMessage(false);

    try {
      const response = await fetch("/api/check-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          national_id: searchValue,
          verification_type: verificationMethod,
          verification_value: verificationValue,
          ...(verificationMethod === "name"
            ? { name: verificationValue }
            : { dob: verificationValue }),
        }),
      });
      const data: CodesResponse = await response.json();

      if (data.status === "success") {
        setVerifyModalOpen(false);
        setShowCodes(true);
        setCachedExamData(searchValue, data);
        fetch("/api/save-national-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ national_id: searchValue }),
        }).catch(() => {});

        const tCodes = data.theory_codes || [];
        const pCodes = data.practical_codes || [];

        if (data.results) {
          setLocalResults(data.results);
          onResultsLoaded(data.results);
        }
        if (data.candidateName && data.candidateName !== "N/A") {
          setCandidateName(data.candidateName);
        }

        setTheoryCodes(tCodes);
        setPracticalCodes(pCodes);

        if (tCodes.length === 0 && pCodes.length === 0) {
          toast.error(t("liveExamNoCategory"));
          setNoCodesMessage(true);
        } else {
          toast.success(
            t("liveExamCodesFound").replace("{count}", String(tCodes.length + pCodes.length))
          );
        }
      } else if (data.code === "VERIFICATION_FAILED") {
        const msg =
          data.message ||
          (verificationMethod === "name"
            ? "The name you entered does not match this National ID."
            : "The Date of Birth you entered does not match this National ID.");
        setVerifyError(msg);
        toast.error(msg);
      } else if (data.status === "error") {
        setVerifyModalOpen(false);
        toast.error(data.message || t("liveExamNoCategory"));
        setShowCodes(false);
        setNoCodesMessage(true);
      } else {
        setVerifyError(t("liveExamUnexpectedResponse"));
        toast.error(t("liveExamUnexpectedResponse"));
      }
    } catch {
      setVerifyError(t("liveExamConnectionError"));
      toast.error(t("liveExamConnectionError"));
    } finally {
      setLoading(false);
      setCodesLoading(false);
    }
  };

  const renderCodeList = (codes: string[], type: "theory" | "practical") => {
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
      <div className="space-y-2.5">
        {codes.map((code) => {
          const detail = localResults[code] || resultCache[code];
          const passed = detail?.passed;
          const hasResult = detail && detail.status !== "N/A";

          return (
            <div
              key={code}
              className="rounded-xl border bg-card/80 p-3 transition-all hover:border-primary/40 hover:shadow-md"
            >
              {/* Top Row: Code + Pass/Fail Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs sm:text-sm font-bold text-foreground break-all">
                  {code}
                </span>
                {hasResult && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold shrink-0 ${
                      passed
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                        : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25"
                    }`}
                  >
                    {passed ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        {t("liveExamPassed") || "PASSED"}
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        {t("liveExamFailed") || "FAILED"}
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Inline Result Summary */}
              {hasResult && (
                <div className="mb-2.5 space-y-1 rounded-lg bg-muted/50 px-2.5 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Award className="h-3 w-3 text-primary" />
                      {t("liveExamScore") || "Score"}:
                    </span>
                    <span className="font-bold text-foreground">
                      <span className={passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                        {detail.marksObtained}
                      </span>
                      {" / "}
                      {detail.totalMarks || 20}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        (Pass: {detail.passMark || (type === "practical" ? 20 : 12)})
                      </span>
                    </span>
                  </div>

                  {detail.licenseCategory && detail.licenseCategory !== "N/A" && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t("liveExamLicenseCategory") || "Category"}:
                      </span>
                      <span className="font-semibold text-foreground">
                        {detail.licenseCategory}
                      </span>
                    </div>
                  )}

                  {detail.examDate && detail.examDate !== "N/A" && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {t("liveExamDate") || "Date"}:
                      </span>
                      <span className="font-medium text-foreground text-right truncate">
                        {detail.examDate}
                      </span>
                    </div>
                  )}

                  {detail.testCenter && detail.testCenter !== "N/A" && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {t("liveExamTestCenter") || "Center"}:
                      </span>
                      <span className="font-medium text-foreground text-right truncate">
                        {detail.testCenter}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onCopy(code)}
                  title={t("copy")}
                  className="inline-flex items-center justify-center rounded-lg border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewResult(code)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                >
                  <Eye className="h-3 w-3" />
                  {t("view") || "View Full Details"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <form onSubmit={handleOpenVerifyModal}>
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-bold text-muted-foreground">
              <IdCard className="mr-1.5 inline h-4 w-4 text-primary" />
              {t("liveExamNationalId")}
            </label>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {nationalId.length}/16
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={16}
            value={nationalId}
            onChange={handleNationalIdChange}
            placeholder={t("liveExamIdPlaceholder")}
            required
            className="w-full rounded-xl border bg-card px-3.5 py-3 text-[15px] transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12 font-mono tracking-wider"
          />
        </div>
        <button
          type="submit"
          disabled={loading || nationalId.length !== 16}
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

      {/* Mandatory Popout Modal — Automatically appears when 16th digit is entered */}
      <Dialog
        open={verifyModalOpen}
        onOpenChange={(open) => {
          if (!loading) setVerifyModalOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[440px] p-5 sm:p-6 rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                  {t("verifyNationalId") || "Verify Your Identity"}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-zinc-400">
                  ID: {nationalId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleVerifyAndFetchResults} className="space-y-4 pt-2">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {t("verifyIdDesc") ||
                "To view your exam results, please confirm your identity by entering either any of your Names or your Date of Birth:"}
            </p>

            {verifyError && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Toggle Between Any Name OR Date of Birth */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setVerificationMethod("name");
                  setVerifyError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  verificationMethod === "name"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>{t("verifyByName") || "Any Name"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerificationMethod("dob");
                  setVerifyError(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  verificationMethod === "dob"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{t("verifyByDob") || "Date of Birth"}</span>
              </button>
            </div>

            {verificationMethod === "name" ? (
              <div className="space-y-1.5">
                <Label htmlFor="exam_verify_name" className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{t("oneNameLabel") || "Enter Any Name (First or Last Name)"}</span>
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="exam_verify_name"
                  type="text"
                  required
                  autoFocus
                  disabled={loading}
                  value={singleName}
                  onChange={(e) => {
                    setSingleName(e.target.value);
                    if (verifyError) setVerifyError(null);
                  }}
                  placeholder={t("singleNamePlaceholder") || "e.g. Jean or Mugisha"}
                  className="h-10 rounded-xl text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="exam_verify_dob" className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{t("dateOfBirth") || "Date of Birth"}</span>
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="exam_verify_dob"
                  type="date"
                  required
                  autoFocus
                  disabled={loading}
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    if (verifyError) setVerifyError(null);
                  }}
                  className="h-10 rounded-xl text-sm bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={
                loading ||
                (verificationMethod === "name" ? singleName.trim().length < 2 : !dob.trim())
              }
              className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("liveExamSearching") || "Verifying & Loading Results..."}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t("liveExamFetchCodes") || "Verify & Show Results"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {showCodes && (
        <div className="mt-5 space-y-4">
          {candidateName && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t("candidate") || "Candidate"}
                  </p>
                  <p className="text-sm font-bold text-foreground">{candidateName}</p>
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{nationalId}</span>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border-2">
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
        </div>
      )}

      {/* No codes message */}
      {noCodesMessage && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
            {t("liveExamNoCategory")}
          </p>
        </div>
      )}
    </div>
  );
}

