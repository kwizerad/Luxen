"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  User,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  Activity,
  Layers,
  ChevronRight,
  Database,
  Calendar,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAdminAuditLogs } from "@/app/Admin/actions/audit";
import { AdminAuditLog, AuditCategory } from "@/lib/admin-audit";

export function AdminAuditLogViewer() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherAdminsOnly, setOtherAdminsOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLogForModal, setSelectedLogForModal] = useState<AdminAuditLog | null>(null);
  const [stats, setStats] = useState({
    totalActions: 0,
    actionsByOtherAdmins: 0,
    actionsByPrimaryAdmin: 0,
    uniqueAdminsCount: 0,
  });

  // Debounce search query for server requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadLogs = async (showToast = false, searchOverride?: string) => {
    try {
      setLoading(true);
      const activeSearch = searchOverride !== undefined ? searchOverride : debouncedSearch;
      const res = await fetchAdminAuditLogs({
        otherAdminsOnly,
        category: selectedCategory === "ALL" ? undefined : selectedCategory,
        search: activeSearch || undefined,
        limit: 250,
      });

      setLogs(res.logs);
      setStats({
        totalActions: res.stats.totalActions,
        actionsByOtherAdmins: res.stats.actionsByOtherAdmins,
        actionsByPrimaryAdmin: res.stats.actionsByPrimaryAdmin,
        uniqueAdminsCount: res.stats.uniqueAdminsCount,
      });

      if (showToast) {
        toast.success("Audit stream synchronized with latest live records");
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      toast.error("Failed to refresh audit log stream");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(false, debouncedSearch);
  }, [otherAdminsOnly, selectedCategory, debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(false, searchQuery);
  };

  // Client-side real-time multi-field search across:
  // 1. Event Titles (action_label, action, title)
  // 2. Subtitles & Descriptions (details, target_label, target_type, category)
  // 3. User & Admin Names (admin_name, admin_email, admin_role, target usernames)
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase().trim();

    return logs.filter((log) => {
      // 1. Event Titles
      const matchesTitle =
        log.action_label?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q);

      // 2. Event Subtitles & Details / Targets
      const matchesSubtitleAndDetails =
        log.details?.toLowerCase().includes(q) ||
        log.target_label?.toLowerCase().includes(q) ||
        log.target_type?.toLowerCase().includes(q) ||
        log.category?.toLowerCase().includes(q);

      // 3. User & Admin Names
      const matchesUserNames =
        log.admin_name?.toLowerCase().includes(q) ||
        log.admin_email?.toLowerCase().includes(q) ||
        log.admin_role?.toLowerCase().includes(q);

      // 4. Metadata Payload (e.g. target user's email, name, etc.)
      const matchesMetadata =
        log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(q);

      return matchesTitle || matchesSubtitleAndDetails || matchesUserNames || matchesMetadata;
    });
  }, [logs, searchQuery]);

  const handleExportCSV = () => {
    const datasetToExport = filteredLogs.length > 0 ? filteredLogs : logs;
    if (datasetToExport.length === 0) {
      toast.error("No audit logs to export");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "Admin Name",
      "Admin Email",
      "Admin Role",
      "Is Primary Admin",
      "Category",
      "Action",
      "Action Label",
      "Target Label",
      "Details",
    ];

    const rows = datasetToExport.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.admin_name}"`,
      `"${l.admin_email}"`,
      `"${l.admin_role}"`,
      l.is_primary_admin ? "YES" : "NO",
      `"${l.category}"`,
      `"${l.action}"`,
      `"${l.action_label}"`,
      `"${l.target_label || ""}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin-audit-log-${otherAdminsOnly ? "other-admins-" : ""}${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${datasetToExport.length} audit records to CSV`);
  };

  const categories: { id: string; label: string }[] = [
    { id: "ALL", label: "All Categories" },
    { id: "USER_MANAGEMENT", label: "User Management" },
    { id: "EXAMS_QUESTIONS", label: "Exams & Questions" },
    { id: "FLEET_DRIVERS", label: "Fleet & Drivers" },
    { id: "COURSE_STUDIO", label: "Course Studio" },
    { id: "REPORTS_SUPPORT", label: "Reports & Retakes" },
    { id: "SETTINGS_SECURITY", label: "Settings & Security" },
    { id: "SYSTEM_CRON", label: "Scheduler & Cron" },
  ];

  const quickSearchFilters = [
    { label: "Delete / Remove", query: "delete" },
    { label: "User Accounts", query: "user" },
    { label: "Exam Updates", query: "exam" },
    { label: "Drivers & Fleet", query: "driver" },
    { label: "Permissions", query: "role" },
  ];

  const getActionBadgeColor = (action: string, category: string) => {
    if (action.includes("DELETE") || action.includes("REMOVE") || action.includes("REJECT") || action.includes("SUSPEND")) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
    if (action.includes("CREATE") || action.includes("INVITE") || action.includes("APPROVE") || action.includes("PUBLISH")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("UPDATE") || action.includes("ROLE") || action.includes("PERMISSIONS")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    if (category === "SYSTEM_CRON" || action.includes("REPORT")) {
      return "bg-indigo-500/10 text-indigo-300 border-indigo-500/20";
    }
    return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        relative: getRelativeTimeString(d),
      };
    } catch {
      return { date: iso, time: "", relative: "" };
    }
  };

  function getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  // Highlight matches function for high scannability
  const renderHighlighted = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const q = query.trim().toLowerCase();
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q ? (
            <mark key={i} className="bg-amber-500/30 text-amber-200 px-0.5 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE AUDIT KPI METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Admin Actions */}
        <div className="p-4 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--admin-muted)] font-medium">
            <span>Total Administrative Events</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--admin-text)] tracking-tight">
            {stats.totalActions}
          </div>
          <div className="text-[11px] text-[var(--admin-muted)] flex items-center gap-1">
            <Database className="w-3 h-3 text-sky-400" />
            <span>Immutable chronological ledger</span>
          </div>
        </div>

        {/* Card 2: Other Admin Actions (Highlighted) */}
        <div
          onClick={() => setOtherAdminsOnly(true)}
          className={`p-4 rounded-2xl border shadow-sm space-y-1 cursor-pointer transition-all ${
            otherAdminsOnly
              ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20"
              : "bg-[var(--admin-card-bg)] border-[var(--admin-border)] hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Actions by Other Admins
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 border border-amber-500/30">
              Filter Active
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {stats.actionsByOtherAdmins}
          </div>
          <div className="text-[11px] text-[var(--admin-muted)]">
            {stats.totalActions > 0
              ? `${Math.round((stats.actionsByOtherAdmins / stats.totalActions) * 100)}% of total platform activity`
              : "Secondary admin activity"}
          </div>
        </div>

        {/* Card 3: Primary Admin Actions */}
        <div className="p-4 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--admin-muted)] font-medium">
            <span>Primary Admin Actions</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {stats.actionsByPrimaryAdmin}
          </div>
          <div className="text-[11px] text-[var(--admin-muted)]">
            System root authority actions
          </div>
        </div>

        {/* Card 4: Unique Active Admins */}
        <div className="p-4 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--admin-muted)] font-medium">
            <span>Active Admin Staff</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-[var(--admin-text)] tracking-tight">
            {stats.uniqueAdminsCount}
          </div>
          <div className="text-[11px] text-[var(--admin-muted)]">
            Distinct administrative actors
          </div>
        </div>
      </div>

      {/* 2. GLOBAL SEARCH & FILTER CONTROLS */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm space-y-4">
        {/* Global Search Input Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--admin-text)] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Global Audit Search</span>
            </label>
            <div className="flex items-center gap-2">
              {searchQuery && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 font-medium">
                  {filteredLogs.length} {filteredLogs.length === 1 ? "match" : "matches"} found
                </span>
              )}
              <span className="text-[11px] text-[var(--admin-muted)] hidden sm:inline-block">
                Searches across Event Titles, Subtitles/Details & User Names
              </span>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title (e.g. User Created, Question Updated), subtitle/details, or user/admin name..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs sm:text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  loadLogs(false, "");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Quick Search Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-[var(--admin-muted)] uppercase tracking-wider font-semibold mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Quick search:
            </span>
            {quickSearchFilters.map((qs) => (
              <button
                key={qs.query}
                type="button"
                onClick={() => setSearchQuery(qs.query)}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium border transition-all ${
                  searchQuery.toLowerCase() === qs.query.toLowerCase()
                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold"
                    : "bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:border-[var(--admin-muted)]"
                }`}
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--admin-border)] pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main Filter Toggle: All Admins vs Other Admins Only */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
            <button
              onClick={() => setOtherAdminsOnly(false)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !otherAdminsOnly
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>All Admin Activity</span>
            </button>
            <button
              onClick={() => setOtherAdminsOnly(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                otherAdminsOnly
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>🚨 Other Admins Only</span>
              {stats.actionsByOtherAdmins > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 ml-1">
                  {stats.actionsByOtherAdmins}
                </span>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadLogs(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-semibold transition-all active:scale-95"
              title="Refresh Audit Stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              <span>Sync</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-semibold transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold"
                  : "bg-[var(--admin-input-bg)] text-[var(--admin-muted)] hover:text-[var(--admin-text)] border border-transparent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. AUDIT LOG LEDGER TABLE */}
      <div className="rounded-2xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[var(--admin-text)]">
              {otherAdminsOnly ? "Secondary Admin Actions Audit Stream" : "Universal Admin Audit Ledger"}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--admin-input-bg)] text-[var(--admin-muted)] font-mono">
              {filteredLogs.length} of {logs.length} events
            </span>
          </div>
          <div className="text-xs text-[var(--admin-muted)] flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Timezone: Local & UTC</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-[var(--admin-muted)] text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Retrieving administrative audit records...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3 text-[var(--admin-muted)]">
            <ShieldCheck className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              {searchQuery ? `No audit entries match "${searchQuery}"` : "No audit entries matching filter"}
            </p>
            <p className="text-xs max-w-sm mx-auto">
              {searchQuery
                ? "Try searching for a different keyword, admin name, entity type, or clear the search filter."
                : "Adjust your category selector or check back later for new administrative activity."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  loadLogs(false, "");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all mt-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Global Search</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-muted)] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Admin / User Actor</th>
                  <th className="py-3 px-3">Event Title & Action</th>
                  <th className="py-3 px-3">Target Entity</th>
                  <th className="py-3 px-3">Event Subtitle / Details</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {filteredLogs.map((log) => {
                  const dt = formatDateTime(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-[var(--admin-hover-bg)] transition-colors ${
                        !log.is_primary_admin ? "bg-amber-500/[0.02]" : ""
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[var(--admin-text)] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{dt.date}</span>
                        </div>
                        <div className="text-[11px] text-[var(--admin-muted)] flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{dt.time}</span>
                          <span className="text-indigo-400 font-sans ml-1">({dt.relative})</span>
                        </div>
                      </td>

                      {/* Admin Actor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                              log.is_primary_admin
                                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {log.admin_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--admin-text)] flex items-center gap-1.5">
                              <span>{renderHighlighted(log.admin_name, searchQuery)}</span>
                              {log.is_primary_admin ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  PRIMARY
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  SUB-ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--admin-muted)] font-mono">
                              {renderHighlighted(log.admin_email, searchQuery)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Event Title & Action Type */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getActionBadgeColor(
                            log.action,
                            log.category
                          )}`}
                        >
                          {renderHighlighted(log.action_label, searchQuery)}
                        </span>
                        <div className="text-[10px] text-[var(--admin-muted)] mt-0.5 font-mono">
                          {log.action}
                        </div>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.target_label ? (
                          <div className="font-medium text-[var(--admin-text)] truncate max-w-[160px]">
                            {renderHighlighted(log.target_label, searchQuery)}
                          </div>
                        ) : (
                          <span className="text-[var(--admin-muted)] italic">System / Config</span>
                        )}
                        {log.target_type && (
                          <div className="text-[10px] text-[var(--admin-muted)] uppercase">
                            {renderHighlighted(log.target_type, searchQuery)}
                          </div>
                        )}
                      </td>

                      {/* Description / Details (Subtitle) */}
                      <td className="py-3 px-3">
                        <p className="text-[var(--admin-text)] line-clamp-2 max-w-md font-normal leading-relaxed">
                          {renderHighlighted(log.details, searchQuery)}
                        </p>
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogForModal(log)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] border border-[var(--admin-border)] text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. MODAL: AUDIT EVENT METADATA INSPECTOR */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--admin-card-bg)] border border-[var(--admin-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-[var(--admin-text)]">
                  Audit Event Inspector: {selectedLogForModal.action_label}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="p-1 rounded-lg text-[var(--admin-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                  <span className="text-[10px] text-[var(--admin-muted)] uppercase font-semibold block">
                    Administrator
                  </span>
                  <div className="font-bold text-[var(--admin-text)] mt-1">
                    {selectedLogForModal.admin_name}
                  </div>
                  <div className="text-[11px] text-[var(--admin-muted)] font-mono">
                    {selectedLogForModal.admin_email}
                  </div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedLogForModal.is_primary_admin ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {selectedLogForModal.is_primary_admin ? "Primary Administrator" : "Secondary Admin"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
                  <span className="text-[10px] text-[var(--admin-muted)] uppercase font-semibold block">
                    Timestamp & Location
                  </span>
                  <div className="font-bold text-[var(--admin-text)] mt-1">
                    {new Date(selectedLogForModal.timestamp).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--admin-muted)] mt-1">
                    Category: <strong>{selectedLogForModal.category}</strong>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[var(--admin-muted)] uppercase font-semibold block mb-1">
                  Full Action Summary
                </span>
                <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium leading-relaxed">
                  {selectedLogForModal.details}
                </div>
              </div>

              {selectedLogForModal.metadata && Object.keys(selectedLogForModal.metadata).length > 0 && (
                <div>
                  <span className="text-[10px] text-[var(--admin-muted)] uppercase font-semibold block mb-1">
                    Action Payload & Metadata Diff (JSON)
                  </span>
                  <pre className="p-3 rounded-xl bg-black/50 border border-[var(--admin-border)] text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLogForModal.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--admin-border)] bg-[var(--admin-input-bg)] flex justify-end">
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
