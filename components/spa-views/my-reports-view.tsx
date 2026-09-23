"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Flag, Loader2, Plus, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { ReportThread } from "@/components/report-thread";
import { ReportModal } from "@/components/report-modal";

export interface MyReportsViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
  embedded?: boolean;
}

export function MyReportsView({ navigate, embedded = false }: MyReportsViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [filed, setFiled] = useState<any[]>([]);
  const [against, setAgainst] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setFiled(data.filed || []);
      setAgainst(data.against || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (selectedReport) {
    return (
      <div className="min-h-[calc(100vh-80px)]">
        <ReportThread reportId={selectedReport} onBack={() => setSelectedReport(null)} />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-orange-500/10 text-orange-600",
    reviewing: "bg-blue-500/10 text-blue-600",
    resolved: "bg-green-500/10 text-green-600",
    dismissed: "bg-muted text-muted-foreground",
  };

  const content = (
    <>
      <div className="mb-6 flex items-center justify-between">
        {!embedded && <h1 className="text-2xl font-bold tracking-tight">{t("myReports")}</h1>}
        <button
          onClick={() => setShowReportModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("fileReport")}
        </button>
      </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filed by me */}
            <div>
              <h2 className="mb-3 font-bold">{t("reportsFiledByMe")}</h2>
              {filed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("noReportsFiled")}</p>
              ) : (
                <div className="space-y-2">
                  {filed.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReport(r.id)}
                      className="w-full rounded-2xl border bg-card p-4 text-left hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {r.reported?.full_name || r.reported?.username || t("user")}
                            </p>
                            <p className="text-xs text-muted-foreground">{t(`report_${r.report_type}`)}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || statusColors.pending}`}>
                          {t(r.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filed against me */}
            <div>
              <h2 className="mb-3 font-bold">{t("reportsAgainstMe")}</h2>
              {against.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("noReportsAgainst")}</p>
              ) : (
                <div className="space-y-2">
                  {against.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReport(r.id)}
                      className="w-full rounded-2xl border bg-card p-4 text-left hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium">
                              {r.reporter?.full_name || r.reporter?.username || t("user")}
                            </p>
                            <p className="text-xs text-muted-foreground">{t(`report_${r.report_type}`)}</p>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || statusColors.pending}`}>
                          {t(r.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                      {r.admin_note && (
                        <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                          <span className="font-medium">{t("adminNote")}:</span> {r.admin_note}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      {showReportModal && user && (
        <ReportModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedId=""
        />
      )}
    </>
  );

  if (embedded) {
    return <div className="py-4">{content}</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <button
          onClick={() => navigate("back", { fallback: "home" })}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("backToHome") || "Back"}
        </button>
        {content}
      </div>
    </div>
  );
}
