"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowUpDown,
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { LoginHistoryEntry } from "@/lib/device.types";
import { getUserLoginHistory } from "@/app/Admin/actions/devices";

interface LoginHistoryProps {
  userId: string;
}

type SortKey = "created_at" | "browser" | "os" | "country";
type SortOrder = "asc" | "desc";

function DeviceIcon({ deviceType }: { deviceType?: string }) {
  switch (deviceType) {
    case "Mobile":
      return <Smartphone className="h-4 w-4" />;
    case "Tablet":
      return <Tablet className="h-4 w-4" />;
    case "Laptop":
      return <Laptop className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

export function LoginHistory({ userId }: LoginHistoryProps) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const limit = 10;

  const load = async () => {
    setLoading(true);
    try {
      const res = await getUserLoginHistory(userId, page, limit);
      setEntries(res.entries);
      setCount(res.count);
    } catch {
      // handled by server action
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, page]);

  const filtered = useMemo(() => {
    let list = [...entries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.ip_address?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q) ||
          e.region?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.user_devices?.device_name?.toLowerCase().includes(q) ||
          e.user_devices?.browser?.toLowerCase().includes(q) ||
          e.user_devices?.os?.toLowerCase().includes(q)
      );
    }


    if (dateFilter !== "all") {
      const now = new Date();
      list = list.filter((e) => {
        if (!e.created_at) return false;
        const d = new Date(e.created_at);
        if (dateFilter === "today") return d.toDateString() === now.toDateString();
        if (dateFilter === "week") return now.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === "month") return now.getTime() - d.getTime() <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    list.sort((a, b) => {
      const order = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "created_at") {
        return (
          (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()) * order
        );
      }
      if (sortBy === "browser") {
        return ((a.user_devices?.browser || "").localeCompare(b.user_devices?.browser || "")) * order;
      }
      if (sortBy === "os") {
        return ((a.user_devices?.os || "").localeCompare(b.user_devices?.os || "")) * order;
      }
      if (sortBy === "country") {
        return ((a.country || "").localeCompare(b.country || "")) * order;
      }
      return 0;
    });

    return list;
  }, [entries, searchQuery, dateFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(count / limit);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {t("loginHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 mb-2.5 sm:mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("searchLoginHistory")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 sm:h-9 text-xs sm:text-sm"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder={t("dateFilter")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTime")}</SelectItem>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="week">{t("last7Days")}</SelectItem>
              <SelectItem value="month">{t("last30Days")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHeader sortKey="created_at" label={t("dateTime")} onSort={handleSort} />
                <TableHead className="text-xs">{t("device")}</TableHead>
                <SortHeader sortKey="country" label={t("location")} onSort={handleSort} />
                <TableHead className="text-xs">{t("ipAddress")}</TableHead>
                <TableHead className="text-xs">{t("result")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    <span className="text-sm">{t("loading")}</span>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                    {t("noLoginHistory")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <DeviceIcon deviceType={entry.user_devices?.device_type} />
                        <div className="truncate max-w-[140px] flex flex-col">
                          <span className="font-medium truncate">
                            {entry.user_devices?.device_name || entry.user_devices?.browser || "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {entry.user_devices?.os ? `${entry.user_devices.os} • ` : ""}{entry.user_devices?.browser || ""}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {[entry.city, entry.region, entry.country].filter(Boolean).join(", ") || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm font-mono">
                      {entry.ip_address || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.login_result === "success"
                            ? "default"
                            : entry.login_result === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="gap-1 text-[10px] px-1.5 py-0"
                      >
                        {entry.login_result === "success" ? (
                          <CheckCircle className="h-2.5 w-2.5" />
                        ) : (
                          <XCircle className="h-2.5 w-2.5" />
                        )}
                        {t(entry.login_result)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2.5 sm:mt-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-7 text-xs"
            >
              {t("previous")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("page")} {page} {t("of")} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              {t("next")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortHeader({
  label,
  sortKey,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <TableHead className="text-xs">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
