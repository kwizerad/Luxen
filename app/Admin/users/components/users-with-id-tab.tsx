"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IdCard, ArrowUpDown, RefreshCw, Search, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { toast } from "sonner";
import type { UserWithStatus } from "./types";
import { UserInfoDetailDialog } from "./user-info-detail-dialog";

type SortKey = "full_name" | "national_id" | "created_at";
type SortOrder = "asc" | "desc";

interface UsersWithIdTabProps {
  users: UserWithStatus[];
}

export function UsersWithIdTab({ users }: UsersWithIdTabProps) {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [manualId, setManualId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [savedIds, setSavedIds] = useState<{
    national_id: string;
    created_at: string;
    user_id: string | null;
    user_profiles: {
      full_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      avatar_url: string | null;
      username: string | null;
    } | null;
  }[]>([]);

  useEffect(() => {
    fetch("/api/national-id-records")
      .then((res) => res.json())
      .then((data) => {
        if (data.records) setSavedIds(data.records);
      })
      .catch(() => {});
  }, []);

  const usersWithId = useMemo(
    () => users.filter((u) => u.national_id && u.national_id.length > 0),
    [users]
  );

  const allIdEntries = useMemo(() => {
    const existingIds = new Set(
      users.filter((u) => u.national_id).map((u) => u.national_id)
    );
    const extraRecords: UserWithStatus[] = savedIds
      .filter((r) => !existingIds.has(r.national_id))
      .map((r) => {
        const profile = r.user_profiles;
        const fullName = profile?.full_name ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          null;
        return {
          id: `saved-${r.national_id}`,
          national_id: r.national_id,
          full_name: fullName || "—",
          first_name: profile?.first_name || undefined,
          last_name: profile?.last_name || undefined,
          email: profile?.email || undefined,
          avatar_url: profile?.avatar_url || undefined,
          username: profile?.username || undefined,
          created_at: r.created_at,
          is_online: false,
        } as UserWithStatus;
      });
    return [...usersWithId, ...extraRecords];
  }, [usersWithId, savedIds]);

  const sortedUsers = useMemo(() => {
    const list = [...allIdEntries];
    list.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "full_name") {
        const aName = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.full_name || a.username || a.email || "";
        const bName = [b.first_name, b.last_name].filter(Boolean).join(" ") || b.full_name || b.username || b.email || "";
        return aName.localeCompare(bName) * order;
      }
      if (sortBy === "national_id") {
        return (a.national_id || "").localeCompare(b.national_id || "") * order;
      }
      if (sortBy === "created_at") {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (aDate - bDate) * order;
      }
      return 0;
    });
    return list;
  }, [allIdEntries, sortBy, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const SortHeader = ({
    label,
    sortKey,
    className,
  }: {
    label: string;
    sortKey: SortKey;
    className?: string;
  }) => (
    <TableHead className={className}>
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );

  const getDisplayName = (user: UserWithStatus) => {
    if (user.full_name) return user.full_name;
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(" ");
    }
    return user.username || user.email || "—";
  };

  const getInitials = (user: UserWithStatus) => {
    const name = getDisplayName(user);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (!id) {
      toast.error(t("liveExamEnterId"));
      return;
    }
    if (!/^\d{16}$/.test(id)) {
      toast.error(t("liveExamInvalidId"));
      return;
    }

    setManualLoading(true);

    const existingUser = users.find((u) => u.national_id === id);
    if (existingUser) {
      setSelectedUser(existingUser);
      setManualId("");
      setManualLoading(false);
      return;
    }

    const syntheticUser: UserWithStatus = {
      id: `manual-${id}`,
      national_id: id,
      full_name: t("liveExamNationalId") + ": " + id,
      created_at: new Date().toISOString(),
      is_online: false,
    };

    setSelectedUser(syntheticUser);
    setManualId("");
    setManualLoading(false);
  };

  return (
    <>
      {/* Manual ID lookup */}
      <Card className="mb-4 border">
        <div className="p-4">
          <form onSubmit={handleManualLookup} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("adminManualIdPlaceholder")}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                maxLength={16}
                className="pl-9 font-mono"
              />
            </div>
            <Button type="submit" disabled={manualLoading} size="sm">
              {manualLoading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1.5" />
              )}
              {t("adminLookupId")}
            </Button>
          </form>
        </div>
      </Card>

      <Card className="overflow-hidden border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IdCard className="h-4 w-4" />
            {allIdEntries.length} {t("usersWithId")}
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHeader sortKey="full_name" label={t("fullName")} className="min-w-[200px]" />
                <SortHeader sortKey="national_id" label={t("liveExamNationalId")} className="min-w-[180px]" />
                <SortHeader sortKey="created_at" label={t("joined")} className="w-32" />
                <TableHead className="w-24 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <IdCard className="h-8 w-8 opacity-40" />
                      {t("noUsersWithId")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} alt={getDisplayName(user)} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {getDisplayName(user)}
                          </div>
                          {user.email && (
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {user.national_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setSelectedUser(user)}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {t("update")}
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <UserInfoDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </>
  );
}
