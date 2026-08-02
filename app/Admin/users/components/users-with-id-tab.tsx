"use client";

import { useMemo, useState } from "react";
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
import { IdCard, ArrowUpDown, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
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

  const usersWithId = useMemo(
    () => users.filter((u) => u.national_id && u.national_id.length > 0),
    [users]
  );

  const sortedUsers = useMemo(() => {
    const list = [...usersWithId];
    list.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "full_name") {
        const aName = a.full_name || a.username || a.email || "";
        const bName = b.full_name || b.username || b.email || "";
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
  }, [usersWithId, sortBy, sortOrder]);

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

  const getInitials = (user: UserWithStatus) => {
    const name = user.full_name || user.username || user.email || "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card className="overflow-hidden border">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IdCard className="h-4 w-4" />
            {usersWithId.length} {t("usersWithId")}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
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
                          <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                          <AvatarFallback>{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {user.full_name || user.username || user.email}
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
