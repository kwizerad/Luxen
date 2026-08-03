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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t("loginHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchLoginHistory")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHeader sortKey="created_at" label={t("dateTime")} onSort={handleSort} />
                <TableHead>{t("device")}</TableHead>
                <TableHead>{t("browser")}</TableHead>
                <TableHead>{t("operatingSystem")}</TableHead>
                <SortHeader sortKey="country" label={t("location")} onSort={handleSort} />
                <TableHead>{t("ipAddress")}</TableHead>
                <TableHead>{t("authMethod")}</TableHead>
                <TableHead>{t("result")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                    {t("loading")}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {t("noLoginHistory")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <DeviceIcon deviceType={entry.user_devices?.device_type} />
                        {entry.user_devices?.device_type || t("unknown")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.user_devices?.browser || "—"} {entry.user_devices?.browser_version || ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.user_devices?.os || "—"} {entry.user_devices?.os_version || ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {[entry.city, entry.region, entry.country_code ? `${entry.country} (${entry.country_code})` : entry.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {entry.ip_address || "—"}
                      {entry.ip_version && <span className="text-muted-foreground ml-1">({entry.ip_version})</span>}
                    </TableCell>
                    <TableCell className="text-sm">{entry.auth_provider || t("email")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.login_result === "success"
                            ? "default"
                            : entry.login_result === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="gap-1 text-xs"
                      >
                        {entry.login_result === "success" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
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
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("previous")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("page")} {page} {t("of")} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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
    <TableHead>
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
