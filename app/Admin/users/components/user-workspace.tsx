"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Download,
  Users,
  GraduationCap,
  Shield,
  Wifi,
  Ban,
  AlertCircle,
  Activity,
  BarChart3,
  LayoutDashboard,
  X,
  Filter,
  Check,
  Trash2,
  IdCard,
  Mail,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { createClient } from "@/lib/supabase/client";
import type { UserWithStatus, UserStats, GrowthPoint } from "./types";
import { UserTable } from "./user-table";
import { UserProfileDrawer } from "./user-profile-drawer";
import { OverviewTab } from "./overview-tab";
import { AnalyticsTab } from "./analytics-tab";
import { ActivityTab } from "./activity-tab";
import { UsersWithIdTab } from "./users-with-id-tab";
import { UserInfoDetailDialog } from "./user-info-detail-dialog";
import { AdminRegistrationPanel } from "./admin-registration-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRouter } from "next/navigation";
import { isPrimaryAdmin, canAccess } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserExamLimitDialog } from "@/components/user-exam-limit-dialog";
import { UserPerformanceModal } from "@/components/user-performance-modal";
import { AdminSendEmailModal, type EmailRecipient } from "@/components/admin/admin-send-email-modal";
import { getUserStats, getUsersWorkspaceData } from "../../actions/users";

let cachedWorkspaceUsers: UserWithStatus[] | null = null;
let cachedWorkspaceStats: UserStats | null = null;
let cachedWorkspaceGrowth: GrowthPoint[] | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type TabId =
  | "overview"
  | "all"
  | "students"
  | "administrators"
  | "online"
  | "suspended"
  | "verification"
  | "users-with-id"
  | "activity"
  | "analytics";

interface UserWorkspaceProps {
  initialUsers: UserWithStatus[];
  initialStats: UserStats;
  initialGrowth: GrowthPoint[];
}

interface FilterState {
  role: string;
  status: string;
  online: string;
  country: string;
  course: string;
  verified: string;
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "all", label: "All Users", icon: <Users className="h-4 w-4" /> },
  { id: "students", label: "Students", icon: <GraduationCap className="h-4 w-4" /> },
  { id: "administrators", label: "Administrators", icon: <Shield className="h-4 w-4" /> },
  { id: "online", label: "Online", icon: <Wifi className="h-4 w-4" /> },
  { id: "suspended", label: "Suspended", icon: <Ban className="h-4 w-4" /> },
  { id: "verification", label: "Verification", icon: <AlertCircle className="h-4 w-4" /> },
  { id: "users-with-id", label: "Users with ID", icon: <IdCard className="h-4 w-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
];

const COUNTRIES = ["All", "Rwanda", "Kenya", "Uganda", "Burundi", "DRC", "Tanzania", "Nigeria", "Ghana", "Other"];

export function UserWorkspace({
  initialUsers,
  initialStats,
  initialGrowth,
}: UserWorkspaceProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithStatus[]>(
    initialUsers.length > 0 ? initialUsers : cachedWorkspaceUsers || []
  );
  const [stats, setStats] = useState<UserStats>(
    initialUsers.length > 0 ? initialStats : cachedWorkspaceStats || initialStats
  );
  const [growth, setGrowth] = useState<GrowthPoint[]>(
    initialGrowth.length > 0 ? initialGrowth : cachedWorkspaceGrowth || []
  );
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    role: "all",
    status: "all",
    online: "all",
    country: "all",
    course: "all",
    verified: "all",
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drawerUser, setDrawerUser] = useState<UserWithStatus | null>(null);
  const [selectedUserForIdDetail, setSelectedUserForIdDetail] = useState<UserWithStatus | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [confirm, setConfirm] = useState<{
    action: "delete" | "suspend" | "activate";
    user: UserWithStatus;
  } | null>(null);
  const [examLimitDialog, setExamLimitDialog] = useState<{
    open: boolean;
    user: UserWithStatus;
  } | null>(null);
  const [performanceUser, setPerformanceUser] = useState<UserWithStatus | null>(null);
  const [emailModalState, setEmailModalState] = useState<{
    open: boolean;
    recipient: EmailRecipient | null;
  }>({ open: false, recipient: null });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const userIsPrimaryAdmin = isPrimaryAdmin(currentUser);

  useEffect(() => {
    if (!currentUser) return;
    if (!userIsPrimaryAdmin && (activeTab === "users-with-id" || activeTab === "administrators")) {
      setActiveTab("students");
    }
  }, [userIsPrimaryAdmin, currentUser, activeTab]);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "administrators" && !userIsPrimaryAdmin) return false;
    if (tab.id === "users-with-id" && !userIsPrimaryAdmin) return false;
    return true;
  });

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const { users: u, stats: s, growth: g } = await getUsersWorkspaceData(30);
        if (u) {
          cachedWorkspaceUsers = u;
          setUsers(u);
        }
        if (s) {
          cachedWorkspaceStats = s;
          setStats(s);
        }
        if (g) {
          cachedWorkspaceGrowth = g;
          setGrowth(g);
        }
        setSelectedRows(new Set());
      } catch (err) {
        const msg = getErrorMessage(err);
        if (
          msg &&
          !msg.includes("Server Components render") &&
          !msg.includes("Unauthorized") &&
          !msg.includes("digest")
        ) {
          toast.error(t("failedToLoadUsers") + ": " + msg);
        }
      }
    });
  }, [t]);

  // Initial fetch if server provided empty initial data
  useEffect(() => {
    if (initialUsers.length === 0) {
      refresh();
    }
  }, [initialUsers.length, refresh]);

  // Realtime: refresh lightweight stats every 45 seconds for live online count
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const s = await getUserStats();
        if (s) setStats(s);
      } catch {
        // Silently fail
      }
    }, 45000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `admin-user-profiles-${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    let list = users;

    // Tab filtering
    if (activeTab === "students") list = list.filter((u) => u.role === "Student");
    if (activeTab === "administrators") list = list.filter((u) => u.role === "Admin");
    if (activeTab === "online") list = list.filter((u) => u.is_online);
    if (activeTab === "suspended") list = list.filter((u) => u.banned);
    if (activeTab === "verification") list = list.filter((u) => !u.email); // placeholder until verified field is available

    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.nationality?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.role !== "all") list = list.filter((u) => u.role === filters.role);
    if (filters.status !== "all") {
      const banned = filters.status === "suspended";
      list = list.filter((u) => (u.banned ? true : false) === banned);
    }
    if (filters.online !== "all") {
      const online = filters.online === "online";
      list = list.filter((u) => u.is_online === online);
    }
    if (filters.country !== "all") {
      list = list.filter(
        (u) =>
          u.nationality?.toLowerCase() === filters.country.toLowerCase() ||
          (filters.country === "Other" && !COUNTRIES.slice(1).includes(u.nationality || ""))
      );
    }

    return list;
  }, [users, activeTab, searchQuery, filters]);

  const handleSelect = useCallback((userId: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) setSelectedRows(new Set(filteredUsers.map((u) => u.id)));
      else setSelectedRows(new Set());
    },
    [filteredUsers]
  );

  const updateUserStatus = useCallback(async (userId: string, payload: { banned?: boolean; role?: string }) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(t("userUpdatedSuccess"));
      refresh();
    } catch (err) {
      toast.error(t("failedToUpdateUser") + getErrorMessage(err));
    }
  }, [t, refresh]);

  const deleteUser = useCallback(async (user: UserWithStatus) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(t("userDeletedSuccess"));
      setDrawerUser(null);
      refresh();
    } catch (err) {
      toast.error(t("failedToDeleteUser") + getErrorMessage(err));
    }
  }, [t, refresh]);

  const handleBulkAction = useCallback(async (action: "activate" | "suspend" | "delete") => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;

    if (action === "delete") {
      try {
        await Promise.all(ids.map((id) => fetch(`/api/users/${id}`, { method: "DELETE" })));
        toast.success(`${ids.length} ${t("usersDeleted")}`);
      } catch (err) {
        toast.error(t("failedToDeleteUser") + getErrorMessage(err));
      }
    } else {
      try {
        const res = await fetch("/api/users/bulk-ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: ids, ban: action === "suspend" }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed");
        toast.success(`${ids.length} ${t(action === "suspend" ? "usersSuspended" : "usersActivated")}`);
      } catch (err) {
        toast.error(t("failedToUpdateUser") + getErrorMessage(err));
      }
    }
    setSelectedRows(new Set());
    refresh();
  }, [selectedRows, t, refresh]);

  const handleExport = useCallback(() => {
    if (selectedRows.size > 0) {
      const selected = users.filter((u) => selectedRows.has(u.id));
      const headers = ["ID", "Email", "Full Name", "Role", "Status", "Created At"];
      const rows = selected.map((u) => [
        u.id,
        u.email || "",
        u.full_name || "",
        u.role || "",
        u.banned ? "Suspended" : "Active",
        u.created_at || "",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("exportSuccess"));
    } else {
      window.open("/api/users/export", "_blank");
    }
  }, [selectedRows, users, t]);

  const resetFilters = useCallback(() => {
    setFilters({ role: "all", status: "all", online: "all", country: "all", course: "all", verified: "all" });
    setSearchQuery("");
  }, []);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== "all").length;
  }, [filters]);

  const confirmAction = useCallback(() => {
    if (!confirm) return;
    if (confirm.action === "delete") {
      deleteUser(confirm.user);
    } else {
      updateUserStatus(confirm.user.id, { banned: confirm.action === "suspend" });
    }
    setConfirm(null);
  }, [confirm, deleteUser, updateUserStatus]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 pb-24">
      {/* Executive Header */}
      <div className="admin-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--admin-border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--admin-text)]">
                {t("userManagement")}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                Identity & RBAC SPA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--admin-muted)] mt-0.5">
              {t("userManagementDescription")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailModalState({ open: true, recipient: null })}
            className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          >
            <Mail className="h-4 w-4 mr-2 text-primary" />
            Send Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isRefreshing}
            className="rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 font-bold"
          >
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 w-full">
        <StatCard label={t("totalUsers")} value={stats.totalUsers} color="primary" />
        <StatCard label={t("students")} value={stats.students} color="blue" />
        <StatCard label={t("administrators")} value={stats.administrators} color="purple" />
        <StatCard label={t("onlineUsers")} value={stats.onlineUsers} color="green" />
        <StatCard label={t("suspendedUsers")} value={stats.suspendedUsers} color="red" />
        <StatCard label={t("pendingVerification")} value={stats.pendingVerification} color="orange" />
        <StatCard label={t("newUsersThisWeek")} value={stats.newUsersThisWeek} color="teal" />
      </div>

      {/* Tabs */}
      <div className="relative">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap md:flex-nowrap rounded-2xl p-1.5 gap-1 bg-[var(--admin-card-bg)] border border-[var(--admin-border)]">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative rounded-xl px-3.5 py-2 text-xs font-bold text-[var(--admin-muted)] data-[state=active]:bg-[var(--admin-accent)] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Search & Filters */}
      <AnimatePresence mode="wait">
        {activeTab !== "overview" && activeTab !== "analytics" && activeTab !== "activity" && activeTab !== "users-with-id" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="admin-card p-4 flex flex-col md:flex-row gap-3 border border-[var(--admin-border)]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--admin-muted)]" />
              <Input
                placeholder={t("searchUsers")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)]"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={resetFilters}
                className="gap-1 rounded-xl bg-[var(--admin-input-bg)] border-[var(--admin-border)] text-[var(--admin-text)]"
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
                {t("clearFilters")}
              </Button>
              <select
                value={filters.role}
                onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
                className="h-9 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text)] px-3 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("allRoles")}</option>
                <option value="Student" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("student")}</option>
                <option value="Admin" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("admin")}</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="h-9 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text)] px-3 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="all" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("allStatuses")}</option>
                <option value="active" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("active")}</option>
                <option value="suspended" className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">{t("suspended")}</option>
              </select>
              <select
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                className="h-9 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)] text-[var(--admin-text)] px-3 text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-background text-foreground dark:bg-[#141418] dark:text-slate-100">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions */}
      {selectedRows.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-card flex items-center justify-between p-4 border border-indigo-500/40 bg-indigo-500/10"
        >
          <span className="text-sm font-bold text-[var(--admin-text)]">
            {selectedRows.size} {selectedRows.size === 1 ? t("userSelected") : t("usersSelected")}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")}>
              <Check className="h-4 w-4 mr-1" />
              {t("activate")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("suspend")}>
              <Ban className="h-4 w-4 mr-1" />
              {t("suspend")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t("delete")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && <OverviewTab stats={stats} growth={growth} />}
          {activeTab === "analytics" && <AnalyticsTab users={users} growth={growth} />}
          {activeTab === "activity" && <ActivityTab users={users} />}
          {activeTab === "users-with-id" && userIsPrimaryAdmin && <UsersWithIdTab users={users} />}
          {activeTab === "administrators" && userIsPrimaryAdmin ? (
            <AdminRegistrationPanel />
          ) : (activeTab === "all" ||
            activeTab === "students" ||
            activeTab === "online" ||
            activeTab === "suspended" ||
            activeTab === "verification") && (
            <UserTable
              users={filteredUsers}
              selectedRows={selectedRows}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onView={setDrawerUser}
              onPerformance={setPerformanceUser}
              onExamLimit={(u: UserWithStatus) => setExamLimitDialog({ open: true, user: u })}
              onSuspend={(u: UserWithStatus) => setConfirm({ action: "suspend", user: u })}
              onActivate={(u: UserWithStatus) => setConfirm({ action: "activate", user: u })}
              onDelete={(u: UserWithStatus) => setConfirm({ action: "delete", user: u })}
              onSendEmail={(u: UserWithStatus) =>
                setEmailModalState({
                  open: true,
                  recipient: {
                    id: u.id,
                    email: u.email || "",
                    full_name: u.full_name,
                    username: u.username,
                    role: u.role,
                  },
                })
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      {drawerUser && (
        <UserProfileDrawer
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onSuspend={(u: UserWithStatus) => setConfirm({ action: "suspend", user: u })}
          onActivate={(u: UserWithStatus) => setConfirm({ action: "activate", user: u })}
          onDelete={(u: UserWithStatus) => setConfirm({ action: "delete", user: u })}
          onPerformance={(u: UserWithStatus) => setPerformanceUser(u)}
          onExamLimit={(u: UserWithStatus) => setExamLimitDialog({ open: true, user: u })}
          onViewIdDetail={(u: UserWithStatus) => setSelectedUserForIdDetail(u)}
        />
      )}

      {selectedUserForIdDetail && (
        <UserInfoDetailDialog
          user={selectedUserForIdDetail}
          onClose={() => setSelectedUserForIdDetail(null)}
          onUpdated={refresh}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.action === "delete"
            ? t("deleteUserConfirmTitle")
            : confirm?.action === "suspend"
            ? t("suspendUserConfirmTitle")
            : t("activateUserConfirmTitle")
        }
        description={
          confirm?.action === "delete"
            ? `${t("deleteUserConfirmDesc")} ${confirm?.user.email}. ${t("actionCannotBeUndone")}`
            : `${t("userWillBe")} ${confirm?.action === "suspend" ? t("suspended") : t("activated")}: ${confirm?.user.email}`
        }
        confirmLabel={
          confirm?.action === "delete" ? t("delete") : confirm?.action === "suspend" ? t("suspend") : t("activate")
        }
        onConfirm={confirmAction}
        confirmVariant={confirm?.action === "delete" ? "destructive" : "default"}
      />

      {examLimitDialog && (
        <UserExamLimitDialog
          open={examLimitDialog.open}
          onOpenChange={(open) => setExamLimitDialog(open ? examLimitDialog : null)}
          userId={examLimitDialog.user.id}
          userEmail={examLimitDialog.user.email || ""}
          currentLimit={undefined}
          currentIsLimited={false}
        />
      )}

      {performanceUser && (
        <UserPerformanceModal
          open={!!performanceUser}
          onOpenChange={(open) => !open && setPerformanceUser(null)}
          user={{
            id: performanceUser.id,
            email: performanceUser.email || "",
            username: performanceUser.username,
            first_name: performanceUser.first_name,
            last_name: performanceUser.last_name,
            full_name: performanceUser.full_name,
            user_metadata: {
              username: performanceUser.username,
              first_name: performanceUser.first_name,
              last_name: performanceUser.last_name,
              full_name: performanceUser.full_name,
            },
          }}
        />
      )}

      <AdminSendEmailModal
        open={emailModalState.open}
        onOpenChange={(open) => setEmailModalState((prev) => ({ ...prev, open }))}
        recipient={emailModalState.recipient}
        allowCustomRecipient={!emailModalState.recipient}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "primary" | "blue" | "purple" | "green" | "red" | "orange" | "teal";
}) {
  const colorClasses = {
    primary: "text-[var(--admin-text)]",
    blue: "text-sky-400",
    purple: "text-purple-400",
    green: "text-emerald-400",
    red: "text-rose-400",
    orange: "text-amber-400",
    teal: "text-cyan-400",
  };

  return (
    <div className="admin-card p-3 sm:p-4 flex flex-col items-center justify-center text-center min-w-0 border border-[var(--admin-border)]">
      <div className={`text-lg sm:text-xl md:text-2xl font-black tabular-nums ${colorClasses[color]} leading-tight truncate max-w-full`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-[var(--admin-muted)] mt-1 truncate max-w-full leading-tight font-bold uppercase tracking-wider" title={label}>
        {label}
      </div>
    </div>
  );
}
