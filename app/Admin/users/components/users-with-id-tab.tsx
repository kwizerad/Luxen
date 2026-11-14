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
import { useAuth } from "@/lib/auth-context";
import { isPrimaryAdmin } from "@/lib/permissions";
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
  phone_number?: string | null;
  checked_at: string;
  verified_at?: string | null;
  last_verified_at?: string | null;
  verification_count?: number;
  ip_address?: string | null;
  is_verified?: boolean;
  is_admin_check?: boolean;
}

export interface GroupedIdRecord {
  national_id: string;
  created_at: string;
  updated_at?: string;
  first_checked_at?: string;
  last_checked_at?: string;
  last_verified_at?: string;
  check_count: number;
  verification_count: number;
  is_verified: boolean;
  primary_user?: UserWithStatus | null;
  citizen_summary?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    photo_url?: string | null;
    province?: string | null;
    district?: string | null;
    sector?: string | null;
    license_number?: string | null;
    vehicle_class?: string | null;
    license_status?: string | null;
  };
  verified_accounts: CheckedAccountItem[];
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
  const { user: currentAuthUser } = useAuth();
  const allowedPrimaryAdmin = isPrimaryAdmin(currentAuthUser as any);
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

  // Group records by National ID (O(N+M) with indexed lookups)
  const groupedIdRecords = useMemo(() => {
    const map = new Map<string, GroupedIdRecord>();

    // Pre-index users for instant O(1) lookups
    const userByIdMap = new Map<string, UserWithStatus>();
    const userByNidMap = new Map<string, UserWithStatus>();

    for (const u of users) {
      if (u.id) userByIdMap.set(u.id, u);
      const cleanNid = (u.national_id || "").trim();
      if (cleanNid) userByNidMap.set(cleanNid, u);
    }

    // 1. Verified Users from props (only include verified users or build verified map)
    for (const u of users) {
      const cleanId = (u.national_id || "").trim();
      if (!cleanId || cleanId.length !== 16) continue;
      const isUserVerified = Boolean(u.id_verified || u.provision_verified);

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
        phone_number: u.phone_number || null,
        checked_at: u.created_at || new Date().toISOString(),
        verified_at: isUserVerified ? (u.provision_verified_at || u.updated_at || u.created_at || new Date().toISOString()) : null,
        is_verified: isUserVerified,
      };

      map.set(cleanId, {
        national_id: cleanId,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at || u.created_at || new Date().toISOString(),
        first_checked_at: u.created_at || new Date().toISOString(),
        last_checked_at: u.updated_at || u.created_at || new Date().toISOString(),
        check_count: 1,
        verification_count: isUserVerified ? 1 : 0,
        is_verified: isUserVerified,
        primary_user: u,
        citizen_summary: {
          full_name: fullName,
          first_name: u.first_name || null,
          last_name: u.last_name || null,
          date_of_birth: u.birthdate || null,
          gender: u.gender || null,
          nationality: u.nationality || null,
          photo_url: u.avatar_url || null,
        },
        verified_accounts: isUserVerified ? [userAccountItem] : [],
        checked_accounts: [userAccountItem],
      });
    }

    // 2. Saved canonical database records from national_id_records (never duplicate IDs)
    for (const r of savedRecords) {
      const cleanId = (r.national_id || "").trim();
      if (!cleanId || cleanId.length !== 16) continue;

      const profile = r.user_profiles;
      const citizenInfo = (r.citizen_info && typeof r.citizen_info === "object" ? r.citizen_info : {}) as Record<string, any>;
      const profileName =
        r.full_name ||
        citizenInfo.full_name ||
        r.user_name ||
        profile?.full_name ||
        [r.first_name || profile?.first_name, r.last_name || profile?.last_name].filter(Boolean).join(" ") ||
        profile?.username ||
        profile?.email ||
        null;

      const rawCheckedList: CheckedAccountItem[] = Array.isArray(r.checked_accounts)
        ? r.checked_accounts
        : [];
      const rawVerifiedList: CheckedAccountItem[] = Array.isArray(r.verified_accounts)
        ? r.verified_accounts
        : rawCheckedList.filter((a) => Boolean(a?.is_verified));

      const foundUser =
        userByNidMap.get(cleanId) ||
        (r.verified_user_id ? userByIdMap.get(r.verified_user_id) : undefined) ||
        (r.user_id ? userByIdMap.get(r.user_id) : undefined) ||
        null;

      const recordIsVerified = Boolean(
        r.verified ||
        r.is_verified ||
        r.verified_user_id ||
        rawVerifiedList.length > 0 ||
        foundUser?.id_verified ||
        foundUser?.provision_verified
      );

      const citizenSummary = {
        full_name: r.full_name || citizenInfo.full_name || r.user_name || foundUser?.full_name || null,
        first_name: r.first_name || citizenInfo.first_name || foundUser?.first_name || null,
        last_name: r.last_name || citizenInfo.last_name || foundUser?.last_name || null,
        date_of_birth: r.date_of_birth || citizenInfo.date_of_birth || foundUser?.birthdate || null,
        gender: r.gender || citizenInfo.gender || foundUser?.gender || null,
        nationality: r.nationality || citizenInfo.nationality || foundUser?.nationality || null,
        photo_url: r.photo_url || citizenInfo.photo_url || foundUser?.avatar_url || null,
        province: r.province || citizenInfo.province || null,
        district: r.district || citizenInfo.district || null,
        sector: r.sector || citizenInfo.sector || null,
        license_number: r.license_number || citizenInfo.license_number || null,
        vehicle_class: r.vehicle_class || citizenInfo.vehicle_class || null,
        license_status: r.license_status || citizenInfo.license_status || null,
      };

      if (!map.has(cleanId)) {
        const matchingUser: UserWithStatus | null = foundUser
          ? { ...foundUser, national_id: cleanId }
          : (profile || citizenSummary.full_name)
          ? ({
              id: r.verified_user_id || r.user_id || `national-id-${cleanId}`,
              national_id: cleanId,
              full_name: profileName || "—",
              first_name: r.first_name || profile?.first_name || undefined,
              last_name: r.last_name || profile?.last_name || undefined,
              email: r.user_email || profile?.email || undefined,
              avatar_url: citizenSummary.photo_url || profile?.avatar_url || undefined,
              username: profile?.username || undefined,
              birthdate: citizenSummary.date_of_birth || undefined,
              gender: citizenSummary.gender || undefined,
              nationality: citizenSummary.nationality || undefined,
              id_verified: recordIsVerified,
              created_at: r.created_at,
              is_online: false,
            } as UserWithStatus)
          : null;

        const initialChecked: CheckedAccountItem[] = [...rawCheckedList];
        const initialVerified: CheckedAccountItem[] = [...rawVerifiedList];

        if (matchingUser && !String(matchingUser.id).startsWith("national-id-")) {
          if (!initialChecked.some((a) => a.user_id === matchingUser.id)) {
            initialChecked.unshift({
              user_id: matchingUser.id,
              email: matchingUser.email || null,
              full_name: profileName,
              avatar_url: matchingUser.avatar_url || null,
              username: matchingUser.username || null,
              phone_number: matchingUser.phone_number || null,
              checked_at: r.last_checked_at || r.created_at || new Date().toISOString(),
              verified_at: recordIsVerified ? (r.last_verified_at || r.created_at || new Date().toISOString()) : null,
              is_verified: recordIsVerified,
            });
          }
          if (recordIsVerified && !initialVerified.some((a) => a.user_id === matchingUser.id)) {
            initialVerified.unshift({
              user_id: matchingUser.id,
              email: matchingUser.email || null,
              full_name: profileName,
              avatar_url: matchingUser.avatar_url || null,
              username: matchingUser.username || null,
              phone_number: matchingUser.phone_number || null,
              checked_at: r.last_checked_at || r.created_at || new Date().toISOString(),
              verified_at: r.last_verified_at || r.created_at || new Date().toISOString(),
              is_verified: true,
            });
          }
        }

        map.set(cleanId, {
          national_id: cleanId,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || r.created_at || new Date().toISOString(),
          first_checked_at: r.first_checked_at || r.created_at || new Date().toISOString(),
          last_checked_at: r.last_checked_at || r.updated_at || r.created_at || new Date().toISOString(),
          last_verified_at: r.last_verified_at || undefined,
          check_count: Math.max(r.check_count || 1, initialChecked.length || 1),
          verification_count: Math.max(r.verification_count || 0, initialVerified.length),
          is_verified: recordIsVerified,
          primary_user: matchingUser,
          citizen_summary: citizenSummary,
          verified_accounts: initialVerified,
          checked_accounts: initialChecked,
        });
      } else {
        const existing = map.get(cleanId)!;
        const mergedChecked = [...existing.checked_accounts];
        const mergedVerified = [...existing.verified_accounts];

        for (const acct of rawCheckedList) {
          if (!mergedChecked.some((a) => a.user_id === acct.user_id)) {
            mergedChecked.push(acct);
          }
        }
        for (const vAcct of rawVerifiedList) {
          if (!mergedVerified.some((a) => a.user_id === vAcct.user_id)) {
            mergedVerified.push({ ...vAcct, is_verified: true });
          }
        }

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
          citizen_summary: {
            full_name: citizenSummary.full_name || existing.citizen_summary?.full_name || null,
            first_name: citizenSummary.first_name || existing.citizen_summary?.first_name || null,
            last_name: citizenSummary.last_name || existing.citizen_summary?.last_name || null,
            date_of_birth: citizenSummary.date_of_birth || existing.citizen_summary?.date_of_birth || null,
            gender: citizenSummary.gender || existing.citizen_summary?.gender || null,
            nationality: citizenSummary.nationality || existing.citizen_summary?.nationality || null,
            photo_url: citizenSummary.photo_url || existing.citizen_summary?.photo_url || null,
            province: citizenSummary.province || existing.citizen_summary?.province || null,
            district: citizenSummary.district || existing.citizen_summary?.district || null,
            sector: citizenSummary.sector || existing.citizen_summary?.sector || null,
            license_number: citizenSummary.license_number || existing.citizen_summary?.license_number || null,
            vehicle_class: citizenSummary.vehicle_class || existing.citizen_summary?.vehicle_class || null,
            license_status: citizenSummary.license_status || existing.citizen_summary?.license_status || null,
          },
          last_checked_at: effectiveLastChecked,
          last_verified_at: r.last_verified_at || existing.last_verified_at,
          check_count: Math.max(existing.check_count, r.check_count || 1, mergedChecked.length),
          verification_count: Math.max(existing.verification_count, r.verification_count || 0, mergedVerified.length),
          is_verified: existing.is_verified || recordIsVerified,
          verified_accounts: mergedVerified,
          checked_accounts: mergedChecked,
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
  const totalMulti = groupedIdRecords.filter(
    (r) => r.verified_accounts.length > 1 || r.checked_accounts.length > 1 || r.check_count > 1
  ).length;
  const totalLinked = groupedIdRecords.filter((r) => r.primary_user !== null).length;

  if (!allowedPrimaryAdmin) return null;

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
                  const verifiedAccountsCount = record.verified_accounts.length;
                  const displayName =
                    record.citizen_summary?.full_name ||
                    primaryUser?.full_name ||
                    [primaryUser?.first_name, primaryUser?.last_name].filter(Boolean).join(" ") ||
                    primaryUser?.username ||
                    primaryUser?.email;
                  const displayPhoto =
                    record.citizen_summary?.photo_url || primaryUser?.avatar_url || undefined;
                  const locationText = [record.citizen_summary?.district, record.citizen_summary?.province]
                    .filter(Boolean)
                    .join(", ");

                  const isCurrentlySyncing = syncingId === record.national_id;

                  return (
                    <TableRow key={record.national_id} className="transition-colors hover:bg-muted/40">
                      {/* National ID with Copy & Status */}
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
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
                              title={t("verifiedNationalId") || "Verified & saved"}
                            >
                              <ShieldCheck className="h-3 w-3 mr-0.5 inline" />
                              {t("verified") || "Verified"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Belonging Citizen Info & Primary Linked Account */}
                      <TableCell>
                        {displayName ? (
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={displayPhoto} alt={displayName} />
                              <AvatarFallback className="text-xs font-semibold">
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs truncate">
                                {displayName}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {[
                                  primaryUser?.email,
                                  record.citizen_summary?.date_of_birth,
                                  locationText,
                                  record.citizen_summary?.vehicle_class
                                    ? `Cat: ${record.citizen_summary.vehicle_class}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Saved citizen record"}
                              </div>
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

                      {/* Verified & Checked Accounts Badge / Modal trigger */}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGroupForAccounts(record)}
                          className="h-7 text-xs px-2.5 font-medium hover:border-primary/50 rounded-lg"
                        >
                          <Users className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          <span className="font-bold">
                            {verifiedAccountsCount > 0 ? verifiedAccountsCount : checkedCount}
                          </span>
                          <span className="ml-1 text-muted-foreground">
                            {verifiedAccountsCount > 0
                              ? verifiedAccountsCount === 1
                                ? "Verified"
                                : "Verified"
                              : checkedCount === 1
                              ? t("account") || "Account"
                              : t("accounts") || "Accounts"}
                          </span>
                        </Button>
                      </TableCell>

                      {/* Last Checked / Verified Activity */}
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
                                  record.citizen_summary?.full_name ||
                                  record.primary_user?.full_name ||
                                  `National ID: ${record.national_id}`,
                                first_name: record.citizen_summary?.first_name || record.primary_user?.first_name,
                                last_name: record.citizen_summary?.last_name || record.primary_user?.last_name,
                                birthdate: record.citizen_summary?.date_of_birth || record.primary_user?.birthdate,
                                avatar_url: record.citizen_summary?.photo_url || record.primary_user?.avatar_url,
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

      {/* Accounts History Dialog (Shows saved belonging info + all accounts that verified/checked this ID without duplication) */}
      <Dialog
        open={Boolean(selectedGroupForAccounts)}
        onOpenChange={(open) => !open && setSelectedGroupForAccounts(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border border-border shadow-2xl rounded-2xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-primary" />
              <span>{t("accountsCheckedThisId") || "Accounts Linked & Verified for this National ID"}</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-foreground">
              National ID: {selectedGroupForAccounts?.national_id}
            </DialogDescription>
          </DialogHeader>

          {selectedGroupForAccounts?.citizen_summary?.full_name && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 flex items-center gap-3">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={selectedGroupForAccounts.citizen_summary.photo_url || undefined} />
                <AvatarFallback className="text-xs font-bold">
                  {selectedGroupForAccounts.citizen_summary.full_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-xs space-y-0.5">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>{selectedGroupForAccounts.citizen_summary.full_name}</span>
                  {selectedGroupForAccounts.is_verified && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      Verified ID
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {selectedGroupForAccounts.citizen_summary.date_of_birth && (
                    <span>DOB: {selectedGroupForAccounts.citizen_summary.date_of_birth}</span>
                  )}
                  {selectedGroupForAccounts.citizen_summary.gender && (
                    <span>Gender: {selectedGroupForAccounts.citizen_summary.gender}</span>
                  )}
                  {(selectedGroupForAccounts.citizen_summary.district || selectedGroupForAccounts.citizen_summary.province) && (
                    <span>
                      {[selectedGroupForAccounts.citizen_summary.sector, selectedGroupForAccounts.citizen_summary.district, selectedGroupForAccounts.citizen_summary.province]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  )}
                  {selectedGroupForAccounts.citizen_summary.license_number && (
                    <span>License: {selectedGroupForAccounts.citizen_summary.license_number}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            {selectedGroupForAccounts && selectedGroupForAccounts.verified_accounts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Accounts That Verified This ID ({selectedGroupForAccounts.verified_accounts.length})
                </h4>
                {selectedGroupForAccounts.verified_accounts.map((acct, idx) => (
                  <div
                    key={`ver-${acct.user_id || idx}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={acct.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {(acct.full_name || acct.email || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{acct.full_name || acct.username || "Verified Account"}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                            Verified
                          </Badge>
                          {(acct.verification_count || 0) > 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {acct.verification_count}x
                            </Badge>
                          )}
                        </div>
                        {acct.email && <div className="text-xs text-muted-foreground truncate">{acct.email}</div>}
                        {acct.phone_number && <div className="text-[11px] text-muted-foreground">{acct.phone_number}</div>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0 ml-2">
                      <div>{new Date(acct.last_verified_at || acct.verified_at || acct.checked_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {new Date(acct.last_verified_at || acct.verified_at || acct.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                All Accounts That Checked This ID ({selectedGroupForAccounts?.checked_accounts.length || 0})
              </h4>
              {selectedGroupForAccounts?.checked_accounts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t("noCheckedAccountsRecorded") || "No account details recorded for this check."}
                </div>
              ) : (
                selectedGroupForAccounts?.checked_accounts.map((acct, idx) => (
                  <div
                    key={`chk-${acct.user_id || idx}`}
                    className="flex items-center justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={acct.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-semibold">
                          {(acct.full_name || acct.email || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{acct.full_name || acct.username || "User"}</span>
                          {acct.is_verified && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Verified
                            </Badge>
                          )}
                          {acct.is_admin_check && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              Primary Admin Check
                            </Badge>
                          )}
                        </div>
                        {acct.email && <div className="text-xs text-muted-foreground truncate">{acct.email}</div>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground shrink-0 ml-2">
                      <div>{new Date(acct.checked_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-muted-foreground/70">{new Date(acct.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
