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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  Trophy,
  Hash,
  ArrowUpDown,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { UserWithStatus } from "./types";

const MotionTableRow = motion(TableRow);

type SortKey = "full_name" | "email" | "role" | "created_at" | "last_seen" | "nationality";
type SortOrder = "asc" | "desc";

interface UserTableProps {
  users: UserWithStatus[];
  selectedRows: Set<string>;
  onSelect: (userId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onView: (user: UserWithStatus) => void;
  onPerformance: (user: UserWithStatus) => void;
  onExamLimit: (user: UserWithStatus) => void;
  onSuspend: (user: UserWithStatus) => void;
  onActivate: (user: UserWithStatus) => void;
  onDelete: (user: UserWithStatus) => void;
}

export function UserTable({
  users,
  selectedRows,
  onSelect,
  onSelectAll,
  onView,
  onPerformance,
  onExamLimit,
  onSuspend,
  onActivate,
  onDelete,
}: UserTableProps) {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const allSelected = users.length > 0 && users.every((u) => selectedRows.has(u.id));

  const sortedUsers = useMemo(() => {
    const list = [...users];
    list.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "full_name") {
        const aName = a.full_name || a.username || a.email || "";
        const bName = b.full_name || b.username || b.email || "";
        return aName.localeCompare(bName) * order;
      }
      if (sortBy === "email") {
        return (a.email || "").localeCompare(b.email || "") * order;
      }
      if (sortBy === "role") {
        return (a.role || "").localeCompare(b.role || "") * order;
      }
      if (sortBy === "nationality") {
        return (a.nationality || "").localeCompare(b.nationality || "") * order;
      }
      if (sortBy === "created_at") {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return (aDate - bDate) * order;
      }
      if (sortBy === "last_seen") {
        const aDate = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const bDate = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return (aDate - bDate) * order;
      }
      return 0;
    });
    return list;
  }, [users, sortBy, sortOrder]);

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

  const formatDate = (date?: string | null) => {
    if (!date) return t("notAvailable");
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return t("notAvailable");
    }
  };

  return (
    <Card className="overflow-hidden border">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                  aria-label={t("selectAll")}
                />
              </TableHead>
              <SortHeader sortKey="full_name" label={t("fullName")} className="min-w-[180px]" />
              <SortHeader sortKey="email" label={t("email")} className="min-w-[200px]" />
              <SortHeader sortKey="role" label={t("role")} className="w-24" />
              <TableHead className="w-24">{t("status")}</TableHead>
              <TableHead className="min-w-[140px]">{t("courses")}</TableHead>
              <TableHead className="min-w-[120px]">{t("progress")}</TableHead>
              <SortHeader sortKey="last_seen" label={t("lastLogin")} className="w-28" />
              <SortHeader sortKey="nationality" label={t("country")} className="w-28" />
              <TableHead className="w-16 text-right">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                  {t("noUsersFound")}
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <MotionTableRow
                  key={user.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(user.id)}
                      onCheckedChange={(checked) => onSelect(user.id, Boolean(checked))}
                      aria-label={`${t("select")} ${user.full_name || user.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => onView(user)}
                      className="flex items-center gap-3 text-left hover:underline"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url} alt={user.full_name || user.email} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name || user.username || user.email}</div>
                        {user.username && <div className="text-xs text-muted-foreground">@{user.username}</div>}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.email || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "Admin" ? "default" : "secondary"}>
                      {user.role === "Admin" ? t("admin") : t("student")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        {t("suspended")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/20">
                        <CheckCircle className="h-3 w-3" />
                        {t("active")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{t("noData")}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{t("noData")}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{formatDate(user.last_seen)}</span>
                      {user.is_online && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                          {t("online")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{user.nationality || "—"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onView(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("viewProfile")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPerformance(user)}>
                          <Trophy className="h-4 w-4 mr-2" />
                          {t("performance")}
                        </DropdownMenuItem>
                        {user.role === "Student" && (
                          <DropdownMenuItem onClick={() => onExamLimit(user)}>
                            <Hash className="h-4 w-4 mr-2" />
                            {t("setExamLimit")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {user.role === "Student" && (
                          <>
                            {user.banned ? (
                              <DropdownMenuItem onClick={() => onActivate(user)}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                {t("activate")}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => onSuspend(user)}>
                                <Ban className="h-4 w-4 mr-2 text-orange-600" />
                                {t("suspend")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => onDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.role === "Admin" && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Admin actions restricted
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </MotionTableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function getInitials(user: UserWithStatus) {
  const name = user.full_name || user.username || user.email || "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
