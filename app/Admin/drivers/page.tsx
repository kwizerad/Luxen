"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Car,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Clock,
  Activity,
  MapPin,
  Award,
  RefreshCw,
  Flag,
  LayoutDashboard,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { canAccess, canWrite, type User as PermUser } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { useAdminSpa } from "@/lib/admin-spa-router";

export default function AdminDriversPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { navigateAdmin } = useAdminSpa();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const checkPermAndFetch = async () => {
      const user = await getCurrentUser();
      if (!user || !canAccess(user as PermUser, "drivers")) {
        navigateAdmin("/Admin", { replace: true });
        return;
      }
      setReadOnly(!canWrite(user as PermUser, "drivers"));
      fetchDrivers();
    };
    checkPermAndFetch();
  }, [router, navigateAdmin]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data } = await supabase
        .from("drivers")
        .select("*, profile:user_id(full_name, username, email, avatar_url, role)")
        .order("created_at", { ascending: false });
      setDrivers(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = async (driverId: string, currentStatus: boolean) => {
    if (readOnly) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("drivers")
        .update({ is_approved: !currentStatus })
        .eq("id", driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, is_approved: !currentStatus } : d))
      );
    } catch {
      // ignore
    }
  };

  const toggleActive = async (driverId: string, currentStatus: boolean) => {
    if (readOnly) return;
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("drivers")
        .update({ is_active: !currentStatus })
        .eq("id", driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, is_active: !currentStatus } : d))
      );
    } catch {
      // ignore
    }
  };

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      const matchesSearch =
        !search ||
        d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
        d.training_location?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "approved" && d.is_approved) ||
        (filter === "pending" && !d.is_approved) ||
        (filter === "active" && d.is_active) ||
        (filter === "inactive" && !d.is_active);
      return matchesSearch && matchesFilter;
    });
  }, [drivers, search, filter]);

  const totalDrivers = drivers.length;
  const approvedCount = drivers.filter((d) => d.is_approved).length;
  const pendingCount = drivers.filter((d) => !d.is_approved).length;
  const activeCount = drivers.filter((d) => d.is_active).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Executive Workspace Header */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                {t("manageDrivers") || "Driver Fleet & Instructor Registry"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                SPA Workspace
              </span>
              {readOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                  Read Only
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              Verify driving instructors, manage active duty status, and inspect training locations in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Command Center</span>
          </button>
          <button
            type="button"
            onClick={() => navigateAdmin("/Admin/reports")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--admin-input-bg)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] border border-[var(--admin-border)] transition-all cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span>Safety Reports</span>
          </button>
          <button
            type="button"
            onClick={fetchDrivers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {/* Fleet KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">Total Registered Drivers</p>
            <p className="text-2xl font-bold text-[var(--admin-text)] tabular-nums mt-1">{totalDrivers}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("approved") || "Approved Drivers"}</p>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("pending") || "Pending Review"}</p>
            <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between border border-[var(--admin-border)]">
          <div>
            <p className="text-xs font-medium text-[var(--admin-muted)]">{t("active") || "Active on Duty"}</p>
            <p className="text-2xl font-bold text-indigo-400 tabular-nums mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="admin-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[var(--admin-border)]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchDrivers") || "Search drivers by name, email, or training location..."}
            className="w-full rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] pl-10 pr-4 py-2.5 text-sm text-[var(--admin-text)] placeholder-[var(--admin-muted)] outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] overflow-x-auto">
          {[
            { id: "all", label: t("allLocations") || "All Drivers", count: totalDrivers },
            { id: "approved", label: t("approved") || "Approved", count: approvedCount },
            { id: "pending", label: t("pending") || "Pending", count: pendingCount },
            { id: "active", label: t("active") || "Active", count: activeCount },
            { id: "inactive", label: t("inactive") || "Inactive", count: totalDrivers - activeCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Roster Grid */}
      {loading ? (
        <div className="admin-card py-16 flex flex-col items-center justify-center gap-3 border border-[var(--admin-border)]">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-xs text-[var(--admin-muted)]">Loading registered driver fleet...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card py-16 text-center border border-[var(--admin-border)]">
          <Car className="w-10 h-10 text-[var(--admin-muted)] mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold text-[var(--admin-text)]">{t("noDriversFound") || "No drivers found"}</p>
          <p className="text-xs text-[var(--admin-muted)] mt-1">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((driver) => {
            const displayName = driver.full_name || driver.profile?.full_name || "Unknown Driver";
            return (
              <div
                key={driver.id}
                className="admin-card p-5 border border-[var(--admin-border)] hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {driver.profile?.avatar_url ? (
                      <img
                        src={driver.profile.avatar_url}
                        alt={displayName}
                        className="h-12 w-12 rounded-2xl object-cover border border-[var(--admin-border)] shrink-0"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 font-bold text-base shrink-0">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-[var(--admin-text)] truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs text-[var(--admin-muted)] truncate">
                        {driver.profile?.email || "No email linked"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {driver.years_of_experience ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--admin-input-bg)] text-[var(--admin-text)] border border-[var(--admin-border)]">
                            <Award className="w-3 h-3 text-amber-400" />
                            {driver.years_of_experience} {t("yearsExperience") || "yrs exp"}
                          </span>
                        ) : null}
                        {driver.training_location ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--admin-input-bg)] text-[var(--admin-muted)] border border-[var(--admin-border)]">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {driver.training_location}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleApproval(driver.id, driver.is_approved)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        driver.is_approved
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                      }`}
                    >
                      {driver.is_approved ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {driver.is_approved ? t("approved") || "Approved" : t("pending") || "Pending"}
                    </button>

                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleActive(driver.id, driver.is_active)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        driver.is_active
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25"
                          : "bg-[var(--admin-input-bg)] text-[var(--admin-muted)] border-[var(--admin-border)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          driver.is_active ? "bg-cyan-400 animate-pulse" : "bg-zinc-500"
                        }`}
                      />
                      {driver.is_active ? t("active") || "Active" : t("inactive") || "Inactive"}
                    </button>
                  </div>
                </div>

                {driver.bio && (
                  <p className="text-xs text-[var(--admin-muted)] leading-relaxed line-clamp-2 pt-3 border-t border-[var(--admin-border)]">
                    {driver.bio}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
