"use client";

import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  reportedId: string;
}

export function ReportModal({ open, onClose, reportedId }: ReportModalProps) {
  const { t } = useLanguage();
  const [reportType, setReportType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const categories = [
    { value: "harassment", labelKey: "reportHarassment" },
    { value: "fraud", labelKey: "reportFraud" },
    { value: "unsafe_behavior", labelKey: "reportUnsafeBehavior" },
    { value: "other", labelKey: "reportOther" },
  ];

  const handleSubmit = async () => {
    if (!reportType || !description.trim()) {
      setError(t("reportRequiredFields"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reported_id: reportedId, report_type: reportType, description }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        onClose();
        setReportType("");
        setDescription("");
      }
    } catch {
      setError(t("reportFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/50 dark:border-border/30 bg-card shadow-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold">{t("reportUser")}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">{t("reportCategory")}</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setReportType(cat.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    reportType === cat.value
                      ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "hover:border-muted-foreground"
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t("reportDescription")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("reportDescriptionPlaceholder")}
              rows={4}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-red-500 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submitting")}
              </span>
            ) : (
              t("submitReport")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
