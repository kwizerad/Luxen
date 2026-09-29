"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  BookOpen,
  Car,
  Clock,
  Calendar,
  ShieldCheck,
  AlertCircle,
  FileText,
  Search,
  Download,
  Printer,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  IdCard,
  Monitor,
  Swords,
  MessageSquare,
  KeyRound,
  Filter,
  ArrowUpDown,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import type { UserActionItem, UserFullReportResponse } from "@/app/api/admin/user-full-report/route";

interface UserFullActionReportProps {
  userId?: string | null;
  nationalId?: string | null;
  userFallback?: any;
  onRefreshParent?: () => void;
}

export function UserFullActionReport({
  userId,
  nationalId,
  userFallback,
  onRefreshParent,
}: UserFullActionReportProps) {
  const { t } = useLanguage();
  const [reportData, setReportData] = useState<UserFullReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [exportingImage, setExportingImage] = useState(false);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const fetchFullReport = async (isManualRefresh = false) => {
    if (!userId && !nationalId) {
      setLoading(false);
      return;
    }

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (nationalId) params.set("nationalId", nationalId);

      const res = await fetch(`/api/admin/user-full-report?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.status === "success") {
        setReportData(json.data);
        if (isManualRefresh) {
          toast.success(t("reportRefreshed") || "Full user action dossier updated!");
        }
      } else {
        throw new Error(json.error || "Failed to load user action report");
      }
    } catch (err: any) {
      toast.error(err.message || "Unable to generate user action dossier.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFullReport();
  }, [userId, nationalId]);

  // Filter and sort action timeline
  const filteredActions = useMemo(() => {
    if (!reportData?.actionsTimeline) return [];

    let actions = [...reportData.actionsTimeline];

    // Filter by Category
    if (categoryFilter !== "all") {
      if (categoryFilter === "exams") {
        actions = actions.filter((a) => a.category === "exam");
      } else if (categoryFilter === "lessons") {
        actions = actions.filter((a) => a.category === "lesson" || a.category === "module");
      } else if (categoryFilter === "challenges") {
        actions = actions.filter((a) => a.category === "challenge");
      } else if (categoryFilter === "bookings") {
        actions = actions.filter((a) => a.category === "booking" || a.category === "application" || a.category === "training");
      } else if (categoryFilter === "reports") {
        actions = actions.filter((a) => a.category === "report");
      } else if (categoryFilter === "security") {
        actions = actions.filter((a) => a.category === "login" || a.category === "security");
      } else if (categoryFilter === "social") {
        actions = actions.filter((a) => a.category === "social");
      }
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      actions = actions.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
          (a.status && a.status.toLowerCase().includes(q)) ||
          (a.ipAddress && a.ipAddress.toLowerCase().includes(q)) ||
          (a.deviceInfo && a.deviceInfo.toLowerCase().includes(q))
      );
    }

    // Sort order
    actions.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return actions;
  }, [reportData, categoryFilter, searchQuery, sortOrder]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData?.actionsTimeline || reportData.actionsTimeline.length === 0) {
      toast.error(t("noActionsToExport") || "No user actions recorded to export.");
      return;
    }

    const headers = ["Timestamp", "Category", "Action Title", "Details / Subtitle", "Status", "Score (%)", "Duration (sec)", "IP Address", "Device"];
    const rows = reportData.actionsTimeline.map((a) => [
      `"${new Date(a.timestamp).toISOString()}"`,
      `"${a.category}"`,
      `"${(a.title || "").replace(/"/g, '""')}"`,
      `"${(a.subtitle || "").replace(/"/g, '""')}"`,
      `"${a.status || ""}"`,
      a.score != null ? a.score : "",
      a.durationSeconds != null ? a.durationSeconds : "",
      `"${a.ipAddress || ""}"`,
      `"${(a.deviceInfo || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const userName = (reportData.user.full_name || reportData.user.username || reportData.user.id).replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_action_dossier_${userName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("csvExportSuccess") || "Action dossier exported as CSV successfully!");
  };

  const handleExportJSON = () => {
    if (!reportData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement("a");
    const userName = (reportData.user.full_name || reportData.user.username || reportData.user.id).replace(/[^a-zA-Z0-9]/g, "_");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `user_full_report_${userName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(t("jsonExportSuccess") || "Full report JSON downloaded!");
  };

  const handleSaveImage = async () => {
    if (!reportContainerRef.current) return;
    setExportingImage(true);
    try {
      const dataUrl = await toPng(reportContainerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#09090b",
      });
      const link = document.createElement("a");
      const userName = (reportData?.user.full_name || reportData?.user.username || "user").replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `user_action_report_${userName}.png`;
      link.href = dataUrl;
      link.click();
      toast.success(t("imageSavedSuccess") || "Report image saved successfully!");
    } catch {
      toast.error(t("imageSaveError") || "Failed to generate image.");
    } finally {
      setExportingImage(false);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs > 0 ? `${secs}s` : ""}`.trim();
    }
    return `${secs}s`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getCategoryIcon = (category: UserActionItem["category"]) => {
    switch (category) {
      case "exam":
        return <Trophy className="h-4 w-4 text-amber-500" />;
      case "lesson":
      case "module":
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case "challenge":
        return <Swords className="h-4 w-4 text-purple-500" />;
      case "booking":
      case "training":
      case "application":
        return <Car className="h-4 w-4 text-emerald-500" />;
      case "report":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "login":
      case "security":
        return <ShieldCheck className="h-4 w-4 text-cyan-500" />;
      case "social":
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string, score?: number | null) => {
    if (!status) return null;
    const s = status.toUpperCase();

    if (s === "PASSED" || s === "VICTORY" || s === "COMPLETED" || s === "CONFIRMED" || s === "SUCCESSFUL") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
          {s} {score != null ? `(${score}%)` : ""}
        </Badge>
      );
    }
    if (s === "FAILED") {
      return (
        <Badge variant="destructive" className="text-[10px] font-bold">
          <XCircle className="h-2.5 w-2.5 mr-1" />
          FAILED {score != null ? `(${score}%)` : ""}
        </Badge>
      );
    }
    if (s === "PENDING" || s === "IN PROGRESS" || s === "STUDYING" || s === "REQUESTED") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium">
          <Clock className="h-2.5 w-2.5 mr-1" />
          {s}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px]">
        {s}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-3">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="text-sm font-semibold text-foreground">{t("generatingUserReport") || "Generating comprehensive action dossier..."}</p>
        <p className="text-xs text-muted-foreground">{t("queryingAuditLedger") || "Aggregating all quizzes, lessons, challenges, bookings, and logins"}</p>
      </div>
    );
  }

  const u = reportData?.user || userFallback || {};
  const s = reportData?.summary || {
    totalActionsCount: 0,
    examsTaken: 0,
    examsPassed: 0,
    examsFailed: 0,
    examPassRate: 0,
    totalStudyTimeSeconds: 0,
    lessonsCompleted: 0,
    modulesCompleted: 0,
    challengesJoined: 0,
    challengesWon: 0,
    bookingsCount: 0,
    reportsSubmitted: 0,
    totalLogins: 0,
    knownDevicesCount: 0,
    firstActiveDate: null,
    lastActiveDate: null,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/40 p-3 rounded-2xl border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none">{t("userActionReport") || "Comprehensive User Action Dossier"}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {s.totalActionsCount} {t("recordedUserActions") || "total system activities recorded"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchFullReport(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 rounded-xl"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>{t("refresh") || "Refresh"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="h-8 text-xs gap-1.5 rounded-xl"
          >
            <Download className="h-3 w-3" />
            <span>{t("exportCsv") || "Export CSV"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJSON}
            className="h-8 text-xs gap-1.5 rounded-xl"
          >
            <FileText className="h-3 w-3" />
            <span>JSON</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveImage}
            disabled={exportingImage}
            className="h-8 text-xs gap-1.5 rounded-xl"
          >
            <Download className="h-3 w-3" />
            <span>{exportingImage ? "Saving..." : "PNG Image"}</span>
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 rounded-xl bg-primary shadow-xs"
          >
            <Printer className="h-3 w-3" />
            <span>{t("printDossier") || "Print / PDF"}</span>
          </Button>
        </div>
      </div>

      <div ref={reportContainerRef} className="space-y-6">
        {/* Executive User Profile Header Card */}
        <Card className="border shadow-xs overflow-hidden rounded-2xl bg-card">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/20 shadow-xs">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {(u.full_name || u.username || "U")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground tracking-tight">
                      {u.full_name || u.username || t("unnamedUser") || "User Profile"}
                    </h2>
                    <Badge variant={u.role === "Admin" ? "default" : "secondary"} className="text-[10px] uppercase font-bold">
                      {u.role || "Student"}
                    </Badge>
                    {u.banned ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t("suspended") || "Suspended"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t("active") || "Active"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-mono">
                    {u.email && <span>{u.email}</span>}
                    {u.national_id && (
                      <span className="inline-flex items-center gap-1 text-primary font-bold">
                        <IdCard className="h-3.5 w-3.5" />
                        {u.national_id}
                      </span>
                    )}
                    {u.phone && <span>{u.phone}</span>}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {t("joined") || "Joined"}: {formatDate(u.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("lastActive") || "Last Active"}: {formatDate(s.lastActiveDate || u.last_seen)}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-level Health/Activity Score Indicator */}
              <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {t("engagementScore") || "Action Volume"}
                  </span>
                  <p className="text-2xl font-black text-primary tabular-nums">
                    {s.totalActionsCount}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px] bg-muted">
                    {s.knownDevicesCount} {s.knownDevicesCount === 1 ? "Device" : "Devices"} • {s.totalLogins} Logins
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6 Key Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Exam Pass Rate */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("examPassRate") || "Pass Rate"}</span>
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{s.examPassRate}%</p>
            <p className="text-[10px] text-muted-foreground">
              {s.examsPassed} passed / {s.examsTaken} total
            </p>
            <Progress value={s.examPassRate} className="h-1.5 mt-1" />
          </div>

          {/* Study Duration */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("studyDuration") || "Study Time"}</span>
              <Clock className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{formatDuration(s.totalStudyTimeSeconds)}</p>
            <p className="text-[10px] text-muted-foreground">
              across all course lessons
            </p>
          </div>

          {/* Lessons Finished */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("lessonsCompleted") || "Lessons"}</span>
              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{s.lessonsCompleted}</p>
            <p className="text-[10px] text-muted-foreground">
              {s.modulesCompleted} modules completed
            </p>
          </div>

          {/* Multiplayer Battles */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("challengesWon") || "Battles"}</span>
              <Swords className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{s.challengesWon}</p>
            <p className="text-[10px] text-muted-foreground">
              victories / {s.challengesJoined} joined
            </p>
          </div>

          {/* Driving Bookings */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("drivingSessions") || "Driving"}</span>
              <Car className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{s.bookingsCount}</p>
            <p className="text-[10px] text-muted-foreground">
              instructor bookings made
            </p>
          </div>

          {/* Reports & Tickets */}
          <div className="p-3.5 rounded-2xl border bg-card/60 space-y-1 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("issueReports") || "Reports"}</span>
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-xl font-black tabular-nums text-foreground">{s.reportsSubmitted}</p>
            <p className="text-[10px] text-muted-foreground">
              question tickets submitted
            </p>
          </div>
        </div>

        {/* Detailed Action Timeline & Ledger Filter Bar */}
        <Card className="border shadow-xs rounded-2xl">
          <CardHeader className="p-4 pb-3 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{t("actionAuditTrail") || "Detailed Action Audit Trail & History"}</span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {filteredActions.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {t("actionAuditTrailDesc") || "Every single action performed by this candidate across exams, courses, bookings, and sessions."}
              </CardDescription>
            </div>

            {/* Search Input & Sort Order */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("filterActions") || "Search actions, scores, devices..."}
                  className="h-8 pl-8 text-xs rounded-xl bg-background"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="h-8 px-2.5 text-xs gap-1 rounded-xl shrink-0"
                title={sortOrder === "desc" ? "Newest First" : "Oldest First"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
              </Button>
            </div>
          </CardHeader>

          {/* Category Filter Pills */}
          <div className="px-4 py-2 border-b bg-background flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: "all", label: "All Actions", count: reportData?.actionsTimeline?.length || 0 },
              { id: "exams", label: "Exams & Quizzes", count: reportData?.actionsByCategory?.exams?.length || 0 },
              { id: "lessons", label: "Lessons & Study", count: reportData?.actionsByCategory?.lessons?.length || 0 },
              { id: "challenges", label: "Live Battles", count: reportData?.actionsByCategory?.challenges?.length || 0 },
              { id: "bookings", label: "Driving Hub", count: reportData?.actionsByCategory?.bookings?.length || 0 },
              { id: "reports", label: "Reports", count: reportData?.actionsByCategory?.reports?.length || 0 },
              { id: "security", label: "Logins & Security", count: reportData?.actionsByCategory?.security?.length || 0 },
            ].map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={categoryFilter === cat.id ? "default" : "ghost"}
                onClick={() => setCategoryFilter(cat.id)}
                className={`h-7 px-3 text-xs rounded-lg gap-1.5 shrink-0 font-medium ${
                  categoryFilter === cat.id ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    categoryFilter === cat.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat.count}
                </span>
              </Button>
            ))}
          </div>

          {/* Chronological Action Feed */}
          <CardContent className="p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
            {filteredActions.length === 0 ? (
              <div className="py-14 text-center space-y-2 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-sm font-semibold text-foreground">{t("noMatchingActions") || "No user actions match your filter."}</p>
                <p className="text-xs">{t("tryClearingFilters") || "Try resetting your search query or category filter."}</p>
              </div>
            ) : (
              filteredActions.map((action, idx) => {
                const isExpanded = expandedActionId === action.id;
                const hasMetadata = action.metadata && Object.keys(action.metadata).length > 0;

                return (
                  <div
                    key={action.id || idx}
                    className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-colors space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                          {getCategoryIcon(action.category)}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                              {action.title}
                            </h4>
                            {getStatusBadge(action.status, action.score)}
                          </div>

                          {action.subtitle && (
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                              {action.subtitle}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80 flex-wrap pt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(action.timestamp)}
                            </span>

                            {action.durationSeconds != null && action.durationSeconds > 0 && (
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <Clock className="h-3 w-3 text-primary" />
                                {t("timeSpent") || "Duration"}: {formatDuration(action.durationSeconds)}
                              </span>
                            )}

                            {action.ipAddress && (
                              <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                                IP: {action.ipAddress}
                              </span>
                            )}

                            {action.deviceInfo && (
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <Monitor className="h-3 w-3 text-muted-foreground" />
                                {action.deviceInfo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasMetadata && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                          title="View metadata payload"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>

                    {/* Expandable Technical Metadata / Payload */}
                    {isExpanded && hasMetadata && (
                      <div className="mt-2 pt-2 border-t text-xs space-y-1 bg-muted/30 p-2.5 rounded-lg font-mono text-[11px] text-muted-foreground">
                        <p className="font-semibold text-[10px] uppercase tracking-wider text-foreground">
                          Payload & Metadata:
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(action.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
