"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2, Search, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { ReportThread } from "@/components/report-thread";
import { canAccess, canWrite, type User as PermUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";

export default function AdminReportsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const checkPermAndFetch = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !canAccess(user as PermUser, "drivers")) {
        router.replace("/Admin");
        return;
      }
      setReadOnly(!canWrite(user as PermUser, "drivers"));
      fetchReports();
    };
    checkPermAndFetch();
  }, [router]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/manage");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      await fetch("/api/reports/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, status }),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } catch {
      // ignore
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

  const filtered = reports.filter((r) => {
    const matchesSearch = !search ||
      r.reported?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] pb-28">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Flag className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t("manageReports")}</h1>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="pending">{t("pending")}</option>
            <option value="reviewing">{t("reviewing")}</option>
            <option value="resolved">{t("resolved")}</option>
            <option value="dismissed">{t("dismissed")}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">{t("noReportsFiled")}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {t("reportUser")}: {report.reported?.full_name || report.reported?.username || t("user")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("reportCategory")}: {t(`report_${report.report_type}`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("filedBy")}: {report.reporter?.full_name || report.reporter?.username || t("user")}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[report.status] || statusColors.pending}`}>
                    {t(report.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                {report.admin_note && (
                  <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    <span className="font-medium">{t("adminNote")}:</span> {report.admin_note}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <select
                    value={report.status}
                    onChange={(e) => handleUpdateStatus(report.id, e.target.value)}
                    className="rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="pending">{t("pending")}</option>
                    <option value="reviewing">{t("reviewing")}</option>
                    <option value="resolved">{t("resolved")}</option>
                    <option value="dismissed">{t("dismissed")}</option>
                  </select>
                  <button
                    onClick={() => setSelectedReport(report.id)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {t("reportDiscussion")}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {report.comment_count > 0 && (
                    <span className="text-xs text-muted-foreground">{report.comment_count} {t("writeComment")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
