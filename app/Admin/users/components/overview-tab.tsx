"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-context";
import type { UserStats, GrowthPoint } from "./types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OverviewTabProps {
  stats: UserStats;
  growth: GrowthPoint[];
}

export function OverviewTab({ stats, growth }: OverviewTabProps) {
  const { t } = useLanguage();

  const cards = [
    { label: t("totalUsers"), value: stats.totalUsers, color: "bg-primary" },
    { label: t("students"), value: stats.students, color: "bg-blue-500" },
    { label: t("administrators"), value: stats.administrators, color: "bg-purple-500" },
    { label: t("onlineUsers"), value: stats.onlineUsers, color: "bg-green-500" },
    { label: t("suspendedUsers"), value: stats.suspendedUsers, color: "bg-red-500" },
    { label: t("pendingVerification"), value: stats.pendingVerification, color: "bg-orange-500" },
    { label: t("newUsersThisWeek"), value: stats.newUsersThisWeek, color: "bg-teal-500" },
  ];

  const distribution = [
    { name: t("student"), value: stats.students, fill: "hsl(var(--primary))" },
    { name: t("admin"), value: stats.administrators, fill: "hsl(var(--secondary))" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-4 w-full">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="min-w-0"
          >
            <Card className="overflow-hidden min-w-0 border shadow-none">
              <CardContent className="p-1 sm:p-2.5 md:p-5 relative flex flex-col items-center justify-center text-center min-w-0">
                <div className={`absolute top-0 left-0 w-0.5 sm:w-1 h-full ${card.color}`} />
                <div className="text-xs sm:text-lg md:text-3xl font-bold tracking-tight truncate max-w-full">{card.value}</div>
                <p className="text-[8px] sm:text-[10px] md:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate max-w-full leading-tight font-medium" title={card.label}>{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("userGrowth")}</CardTitle>
            <CardDescription>{t("registrationsLast30Days")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("userDistribution")}</CardTitle>
            <CardDescription>{t("studentsVsAdmins")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {distribution.map((d) => (
              <div key={d.name} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{d.value}</span>
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: d.fill }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 text-sm text-muted-foreground">
              {stats.totalUsers > 0
                ? `${Math.round((stats.students / stats.totalUsers) * 100)}% ${t("students")}`
                : t("noData")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
