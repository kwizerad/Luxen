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
import { AdminRegistrationPanel } from "./admin-registration-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { isPrimaryAdmin } from "@/lib/permissions";
import { UserExamLimitDialog } from "@/components/user-exam-limit-dialog";
import { UserPerformanceModal } from "@/components/user-performance-modal";
import { getAllUsers, getUserStats, getUserGrowth } from "../../actions/users";

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
  const [users, setUsers] = useState<UserWithStatus[]>(initialUsers);
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [growth, setGrowth] = useState<GrowthPoint[]>(initialGrowth);
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const userIsPrimaryAdmin = isPrimaryAdmin(currentUser);

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "administrators" && !userIsPrimaryAdmin) return false;
    return true;
  });

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        const [u, s, g] = await Promise.all([getAllUsers(), getUserStats(), getUserGrowth(30)]);
        setUsers(u);
        setStats(s);
        setGrowth(g);
        setSelectedRows(new Set());
      } catch (err) {
        toast.error(t("failedToLoadUsers") + ": " + getErrorMessage(err));
      }
    });
  }, [t]);

  // Realtime: refresh stats every 30 seconds for live online count
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const s = await getUserStats();
        setStats(s);
        // Only refresh user list if no modal/dialog is open (to avoid disrupting UI)
        const u = await getAllUsers();
        setUsers(u);
      } catch {
        // Silently fail
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-user-profiles")
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
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("userManagement")}</h1>
          <p className="text-muted-foreground">{t("userManagementDescription")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
          <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap md:flex-nowrap rounded-xl p-1.5 gap-1">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <span className="flex items-center gap-1.5">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 rounded-lg border border-primary/20 -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
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
            className="flex flex-col md:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchUsers")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeFiltersCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={resetFilters}
                className="gap-1"
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
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">{t("allRoles")}</option>
                <option value="Student">{t("student")}</option>
                <option value="Admin">{t("admin")}</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">{t("allStatuses")}</option>
                <option value="active">{t("active")}</option>
                <option value="suspended">{t("suspended")}</option>
              </select>
              <select
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
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
          className="flex items-center justify-between bg-muted/60 p-3 rounded-xl border"
        >
          <span className="text-sm font-medium">
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
          {activeTab === "users-with-id" && <UsersWithIdTab users={users} />}
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
            />
          )}
        </motion.div>
      </AnimatePresence>

      <UserProfileDrawer
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
        onSuspend={(u: UserWithStatus) => setConfirm({ action: "suspend", user: u })}
        onActivate={(u: UserWithStatus) => setConfirm({ action: "activate", user: u })}
        onDelete={(u: UserWithStatus) => setConfirm({ action: "delete", user: u })}
        onPerformance={(u: UserWithStatus) => setPerformanceUser(u)}
        onExamLimit={(u: UserWithStatus) => setExamLimitDialog({ open: true, user: u })}
      />

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
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600",
    purple: "bg-purple-500/10 text-purple-600",
    green: "bg-green-500/10 text-green-600",
    red: "bg-red-500/10 text-red-600",
    orange: "bg-orange-500/10 text-orange-600",
    teal: "bg-teal-500/10 text-teal-600",
  };

  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
