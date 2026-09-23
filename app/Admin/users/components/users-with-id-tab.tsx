"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  IdCard,
  ArrowUpDown,
  Eye,
  Search,
  Loader2,
  Users,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Globe,
  CheckCircle2,
  UserCheck,
  Calendar,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Filter,
  Shield,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { UserWithStatus } from "./types";
import { UserInfoDetailDialog } from "./user-info-detail-dialog";
import { getAllNationalIdRecords } from "@/app/Admin/actions/users";

export interface CheckedAccountItem {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  checked_at: string;
  ip_address?: string | null;
  is_verified?: boolean;
}

export interface GroupedIdRecord {
  national_id: string;
  created_at: string;
  updated_at?: string;
  first_checked_at?: string;
  last_checked_at?: string;
  check_count: number;
  is_verified: boolean;
  primary_user?: UserWithStatus | null;
  checked_accounts: CheckedAccountItem[];
}

type SortKey = "national_id" | "primary_user" | "check_count" | "last_checked_at" | "created_at";
type SortOrder = "asc" | "desc";
type FilterType = "all" | "verified" | "multi" | "linked";

interface UsersWithIdTabProps {
  users: UserWithStatus[];
}

export function UsersWithIdTab({ users }: UsersWithIdTabProps) {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState<SortKey>("last_checked_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserWithStatus | null>(null);
  const [selectedGroupForAccounts, setSelectedGroupForAccounts] = useState<GroupedIdRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [manualId, setManualId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const records = await getAllNationalIdRecords();
      if (records && records.length > 0) {
        setSavedRecords(records);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback
    }

    fetch("/api/national-id-records")
      .then((res) => res.json())
      .then((data) => {
        if (data.records) {
          setSavedRecords(data.records);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Group records by National ID
  const groupedIdRecords = useMemo(() => {
    const map = new Map<string, GroupedIdRecord>();

    // 1. Users from props
    for (const u of users) {
      const cleanId = (u.national_id || "").trim();
      if (!cleanId || cleanId.length !== 16) continue;

      const fullName =
        u.full_name ||
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.username ||
        u.email ||
        "Registered User";

      const userAccountItem: CheckedAccountItem = {
        user_id: u.id,
        email: u.email || null,
        full_name: fullName,
        avatar_url: u.avatar_url || null,
        username: u.username || null,
        checked_at: u.created_at || new Date().toISOString(),
        is_verified: true,
      };

      map.set(cleanId, {
        national_id: cleanId,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.created_at || new Date().toISOString(),
        first_checked_at: u.created_at || new Date().toISOString(),
        last_checked_at: u.created_at || new Date().toISOString(),
        check_count: 1,
        is_verified: true,
        primary_user: u,
        checked_accounts: [userAccountItem],
      });
    }

    // 2. Saved database records
    for (const r of savedRecords) {
      const cleanId = (r.national_id || "").trim();
      if (!cleanId || cleanId.length !== 16) continue;

      const profile = r.user_profiles;
      const profileName =
        profile?.full_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        profile?.username ||
        profile?.email ||
        null;

      const rawCheckedList: CheckedAccountItem[] = Array.isArray(r.checked_accounts)
        ? r.checked_accounts
        : [];

      if (!map.has(cleanId)) {
        const foundUser = users.find((u) => u.national_id === cleanId || u.id === r.user_id || u.id === r.verified_user_id);
        const matchingUser: UserWithStatus | null = foundUser
          ? { ...foundUser, national_id: cleanId }
          : profile
          ? ({
              id: r.user_id || `user-${cleanId}`,
              national_id: cleanId,
              full_name: profileName || "—",
              first_name: profile?.first_name || undefined,
              last_name: profile?.last_name || undefined,
              email: profile?.email || undefined,
              avatar_url: profile?.avatar_url || undefined,
              username: profile?.username || undefined,
              created_at: r.created_at,
              is_online: false,
            } as UserWithStatus)
          : null;

        const initialAccounts: CheckedAccountItem[] = [...rawCheckedList];
        if (matchingUser && !initialAccounts.some((a) => a.user_id === matchingUser.id)) {
          initialAccounts.unshift({
            user_id: matchingUser.id,
            email: matchingUser.email || null,
            full_name:
              matchingUser.full_name ||
              [matchingUser.first_name, matchingUser.last_name].filter(Boolean).join(" ") ||
              matchingUser.username ||
              matchingUser.email ||
              null,
            avatar_url: matchingUser.avatar_url || null,
            username: matchingUser.username || null,
            checked_at: r.last_checked_at || r.created_at || new Date().toISOString(),
            is_verified: true,
          });
        }

        map.set(cleanId, {
          national_id: cleanId,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
          first_checked_at: r.first_checked_at || r.created_at || new Date().toISOString(),
          last_checked_at: r.last_checked_at || r.updated_at || r.created_at || new Date().toISOString(),
          check_count: Math.max(r.check_count || 1, initialAccounts.length || 1),
          is_verified: Boolean(r.verified_user_id || (matchingUser && matchingUser.national_id === cleanId)),
          primary_user: matchingUser,
          checked_accounts: initialAccounts,
        });
      } else {
        const existing = map.get(cleanId)!;
        const mergedAccounts = [...existing.checked_accounts];

        for (const acct of rawCheckedList) {
          if (!mergedAccounts.some((a) => a.user_id === acct.user_id)) {
            mergedAccounts.push(acct);
          }
        }

        const foundUser = users.find((u) => u.national_id === cleanId || u.id === r.user_id || u.id === r.verified_user_id);
        const primaryUser =
          (existing.primary_user ? { ...existing.primary_user, national_id: cleanId } : null) ||
          (foundUser ? { ...foundUser, national_id: cleanId } : null) ||
          null;

        const effectiveLastChecked =
          r.last_checked_at && new Date(r.last_checked_at).getTime() > new Date(existing.last_checked_at || 0).getTime()
            ? r.last_checked_at
            : existing.last_checked_at;

        map.set(cleanId, {
          ...existing,
          primary_user: primaryUser,
          last_checked_at: effectiveLastChecked,
          check_count: Math.max(existing.check_count, r.check_count || 1, mergedAccounts.length),
          is_verified: existing.is_verified || Boolean(r.verified_user_id),
          checked_accounts: mergedAccounts,
        });
      }
    }

    return Array.from(map.values());
  }, [users, savedRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let result = groupedIdRecords;

    if (filterType === "verified") {
      result = result.filter((r) => r.is_verified);
    } else if (filterType === "multi") {
      result = result.filter((r) => r.checked_accounts.length > 1 || r.check_count > 1);
    } else if (filterType === "linked") {
      result = result.filter((r) => r.primary_user !== null);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter((r) => {
      if (r.national_id.includes(q)) return true;
      if (r.primary_user?.full_name?.toLowerCase().includes(q)) return true;
      if (r.primary_user?.email?.toLowerCase().includes(q)) return true;
      if (r.primary_user?.username?.toLowerCase().includes(q)) return true;
      return r.checked_accounts.some((a) =>
        (a.full_name || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q) ||
        (a.username || "").toLowerCase().includes(q)
      );
    });
  }, [groupedIdRecords, searchQuery, filterType]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "national_id") {
        return a.national_id.localeCompare(b.national_id) * order;
      }
      if (sortBy === "check_count") {
        return (a.check_count - b.check_count) * order;
      }
      if (sortBy === "last_checked_at") {
        const aDate = a.last_checked_at ? new Date(a.last_checked_at).getTime() : 0;
        const bDate = b.last_checked_at ? new Date(b.last_checked_at).getTime() : 0;
        return (aDate - bDate) * order;
      }
      if (sortBy === "created_at") {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (aDate - bDate) * order;
      }
      if (sortBy === "primary_user") {
        const aName = a.primary_user?.full_name || a.primary_user?.email || "";
        const bName = b.primary_user?.full_name || b.primary_user?.email || "";
        return aName.localeCompare(bName) * order;
      }
      return 0;
    });
    return list;
  }, [filteredRecords, sortBy, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`${t("copied") || "Copied"}: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) {
      toast.error(t("liveExamEnterId") || "Please enter a 16-digit National ID");
      return;
    }
    if (!/^\d{16}$/.test(id)) {
      toast.error(t("liveExamInvalidId") || "National ID must be exactly 16 digits");
      return;
    }

    setManualLoading(true);

    const existingGroup = groupedIdRecords.find((g) => g.national_id === id);
    if (existingGroup?.primary_user) {
      setSelectedUserForDetail({
        ...existingGroup.primary_user,
        national_id: id,
      });
    } else {
      const syntheticUser: UserWithStatus = {
        id: `manual-${id}`,
        national_id: id,
        full_name: (t("liveExamNationalId") || "National ID") + ": " + id,
        created_at: new Date().toISOString(),
        is_online: false,
      };
      setSelectedUserForDetail(syntheticUser);
    }

    setManualId("");
    setManualLoading(false);
  };

  // Quick sync from Irembo for a row
  const handleQuickSync = async (record: GroupedIdRecord) => {
    setSyncingId(record.national_id);
    try {
      const res = await fetch("/api/admin/sync-irembo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ national_id: record.national_id, user_id: record.primary_user?.id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`${record.national_id} updated from Irembo API`);
        fetchRecords();
      } else {
        toast.error(data.message || "Failed to update from Irembo");
      }
    } catch {
      toast.error("Network error during Irembo sync");
    } finally {
      setSyncingId(null);
    }
  };

  // Summary Metrics
  const totalUnique = groupedIdRecords.length;
  const totalVerified = groupedIdRecords.filter((r) => r.is_verified).length;
  const totalMulti = groupedIdRecords.filter((r) => r.checked_accounts.length > 1 || r.check_count > 1).length;
  const totalLinked = groupedIdRecords.filter((r) => r.primary_user !== null).length;

  return (
    <div className="space-y-4">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-xs p-3.5 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("uniqueNationalIds") || "Unique IDs"}
            </span>
            <IdCard className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalUnique}</p>
        </Card>

        <Card className="border shadow-xs p-3.5 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("verifiedProfiles") || "Verified"}
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{totalVerified}</p>
        </Card>

        <Card className="border shadow-xs p-3.5 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("linkedAccounts") || "Linked Users"}
            </span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalLinked}</p>
        </Card>

        <Card className="border shadow-xs p-3.5 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {t("multiAccountChecks") || "Multi-Check"}
            </span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{totalMulti}</p>
        </Card>
      </div>

      {/* Search, Filter chips and Manual Lookup */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchNationalIdOrUser") || "Search by National ID, Name, or Email..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className="h-10 text-xs rounded-xl px-3"
            >
              {t("all") || "All"} ({groupedIdRecords.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === "verified" ? "default" : "outline"}
              onClick={() => setFilterType("verified")}
              className="h-10 text-xs rounded-xl px-3 gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              {t("verified") || "Verified"} ({totalVerified})
            </Button>
            <Button
              size="sm"
              variant={filterType === "multi" ? "default" : "outline"}
              onClick={() => setFilterType("multi")}
              className="h-10 text-xs rounded-xl px-3 gap-1"
            >
              <Users className="h-3.5 w-3.5 text-amber-500" />
              {t("multiAccount") || "Multi-Check"} ({totalMulti})
            </Button>
          </div>
        </div>

        {/* 16-digit Direct Lookup Form */}
        <form onSubmit={handleManualLookup} className="flex gap-2">
          <Input
            placeholder={t("adminManualIdPlaceholder") || "Enter 16-digit ID..."}
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            maxLength={16}
            className="font-mono text-xs h-10 w-44 rounded-xl"
          />
          <Button type="submit" disabled={manualLoading} size="sm" className="h-10 px-3.5 rounded-xl shrink-0">
            {manualLoading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-1.5" />
            )}
            {t("adminLookupId") || "Inspect"}
          </Button>
        </form>
      </div>

      {/* Main Deduplicated Table */}
      <Card className="overflow-hidden border shadow-xs rounded-2xl bg-card">
        <Table className="min-w-[900px]" containerClassName="max-h-[calc(100vh-340px)] overflow-y-auto">
          <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-xs">
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px]">
                  <button
                    onClick={() => handleSort("national_id")}
                    className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>{t("liveExamNationalId") || "National ID"}</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>

                <TableHead className="min-w-[220px]">
                  <button
                    onClick={() => handleSort("primary_user")}
                    className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>{t("accountOwner") || "Account / Linked User"}</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>

                <TableHead className="w-36 text-center">
                  <button
                    onClick={() => handleSort("check_count")}
                    className="flex items-center justify-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground mx-auto"
                  >
                    <span>{t("accountsChecked") || "Accounts Checked"}</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>

                <TableHead className="w-36">
                  <button
                    onClick={() => handleSort("last_checked_at")}
                    className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span>{t("lastChecked") || "Last Checked"}</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>

                <TableHead className="w-56 text-right font-semibold text-xs text-muted-foreground">
                  {t("actions") || "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">{t("loadingNationalIds") || "Loading National ID records..."}</p>
                  </TableCell>
                </TableRow>
              ) : sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-44 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <IdCard className="h-9 w-9 opacity-30" />
                      <p className="text-sm font-medium">{t("noUsersWithId") || "No matching National ID records found"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedRecords.map((record) => {
                  const primaryUser = record.primary_user;
                  const checkedCount = record.checked_accounts.length;
                  const displayName =
                    primaryUser?.full_name ||
                    [primaryUser?.first_name, primaryUser?.last_name].filter(Boolean).join(" ") ||
                    primaryUser?.username ||
                    primaryUser?.email;

                  const isCurrentlySyncing = syncingId === record.national_id;

                  return (
                    <TableRow key={record.national_id} className="transition-colors hover:bg-muted/40">
                      {/* National ID with Copy & Status */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(record.national_id)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-muted/80 hover:bg-muted border transition-colors group text-foreground"
                            title={t("clickToCopyId") || "Click to copy National ID"}
                          >
                            <span>{record.national_id}</span>
                            {copiedId === record.national_id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                            )}
                          </button>

                          {record.is_verified && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium"
                              title={t("verifiedNationalId") || "Verified & linked"}
                            >
                              <ShieldCheck className="h-3 w-3 mr-0.5 inline" />
                              {t("verified") || "Verified"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Primary / Linked User Account */}
                      <TableCell>
                        {primaryUser && displayName ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={primaryUser.avatar_url} alt={displayName} />
                              <AvatarFallback className="text-xs font-semibold">
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs truncate">
                                {displayName}
                              </div>
                              {primaryUser.email && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {primaryUser.email}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : checkedCount > 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserCheck className="h-4 w-4 text-blue-500 shrink-0" />
                            <span>Checked by {checkedCount} account(s)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {t("unlinkedRecord") || "Unlinked Record"}
                          </span>
                        )}
                      </TableCell>

                      {/* Accounts Checked Badge / Modal trigger */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGroupForAccounts(record)}
                          className="h-7 text-xs px-2.5 font-medium hover:border-primary/50 rounded-lg"
                        >
                          <Users className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          <span className="font-bold">{checkedCount}</span>
                          <span className="ml-1 text-muted-foreground">
                            {checkedCount === 1 ? t("account") || "Account" : t("accounts") || "Accounts"}
                          </span>
                        </Button>
                      </TableCell>

                      {/* Last Checked / Activity */}
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <div>
                            {record.last_checked_at
                              ? new Date(record.last_checked_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </div>
                          {record.check_count > 1 && (
                            <div className="text-[11px] text-muted-foreground/80">
                              {record.check_count} checks
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuickSync(record)}
                            disabled={isCurrentlySyncing}
                            className="h-8 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg"
                            title={t("updateFromIrembo") || "Sync with Irembo API"}
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isCurrentlySyncing ? "animate-spin" : ""}`} />
                            <span className="sr-only">Sync</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const targetUser: UserWithStatus = {
                                ...(record.primary_user || {}),
                                id: record.primary_user?.id || `national-id-${record.national_id}`,
                                national_id: record.national_id || record.primary_user?.national_id || "",
                                full_name:
                                  record.primary_user?.full_name ||
                                  `National ID: ${record.national_id}`,
                                created_at: record.primary_user?.created_at || record.created_at,
                                is_online: Boolean(record.primary_user?.is_online),
                              };
                              setSelectedUserForDetail(targetUser);
                            }}
                            className="h-8 text-xs px-2.5 font-medium rounded-lg"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            {t("viewDetails") || "View Details"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </Card>

      {/* Checked Accounts Dialog (Shows which accounts checked this ID without duplication) */}
      <Dialog
        open={Boolean(selectedGroupForAccounts)}
        onOpenChange={(open) => !open && setSelectedGroupForAccounts(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              <span>{t("accountsCheckedThisId") || "Accounts that Checked this ID"}</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-foreground">
              National ID: {selectedGroupForAccounts?.national_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {selectedGroupForAccounts?.checked_accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("noCheckedAccountsRecorded") || "No account details recorded for this check."}
              </div>
            ) : (
              selectedGroupForAccounts?.checked_accounts.map((acct, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={acct.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold">
                        {(acct.full_name || acct.email || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1.5">
                        <span>{acct.full_name || acct.username || "Anonymous User"}</span>
                        {acct.is_verified && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            Verified
                          </Badge>
                        )}
                      </div>
                      {acct.email && <div className="text-xs text-muted-foreground">{acct.email}</div>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{new Date(acct.checked_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-muted-foreground/70">{new Date(acct.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgraded Multi-tab Detail Modal */}
      {selectedUserForDetail && (
        <UserInfoDetailDialog
          user={selectedUserForDetail}
          onClose={() => setSelectedUserForDetail(null)}
          onUpdated={fetchRecords}
        />
      )}
    </div>
  );
}
