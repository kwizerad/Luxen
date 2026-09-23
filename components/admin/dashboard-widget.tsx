"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Database, Activity, Users, FileCheck, Zap, Radio, RefreshCw, Layers, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedCounter } from "@/components/animated-counter";

export interface DashboardWidgetProps {
  initialExamAttemptsCount?: number;
  initialUserProfilesCount?: number;
  initialStudentsCount?: number;
  initialDriversCount?: number;
  initialAdminsCount?: number;
  realtimeEventCount?: number;
  className?: string;
  onRealtimeRowChange?: (table: "exam_attempts" | "user_profiles", eventType: string, row: any) => void;
}

interface TableRowCountItem {
  name: string;
  table: string;
  count: number;
  liveDelta: number;
  fill: string;
  category: "exams" | "users";
  description: string;
}

export function DashboardWidget({
  initialExamAttemptsCount = 0,
  initialUserProfilesCount = 0,
  initialStudentsCount = 0,
  initialDriversCount = 0,
  initialAdminsCount = 0,
  realtimeEventCount = 0,
  className = "",
  onRealtimeRowChange,
}: DashboardWidgetProps) {
  // Live row count states synced with Supabase Realtime
  const [examAttempts, setExamAttempts] = useState(initialExamAttemptsCount);
  const [userProfiles, setUserProfiles] = useState(initialUserProfilesCount);
  const [students, setStudents] = useState(initialStudentsCount);
  const [drivers, setDrivers] = useState(initialDriversCount);
  const [admins, setAdmins] = useState(initialAdminsCount);

  // Delta trackers for live session row mutations
  const [examAttemptsDelta, setExamAttemptsDelta] = useState(0);
  const [userProfilesDelta, setUserProfilesDelta] = useState(0);
  const [lastMutatedTable, setLastMutatedTable] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [viewMode, setViewMode] = useState<"primary" | "detailed">("primary");

  // Keep state in sync when parent props update (e.g. from background API polling)
  useEffect(() => {
    if (initialExamAttemptsCount > 0) setExamAttempts(initialExamAttemptsCount);
  }, [initialExamAttemptsCount]);

  useEffect(() => {
    if (initialUserProfilesCount > 0) setUserProfiles(initialUserProfilesCount);
  }, [initialUserProfilesCount]);

  useEffect(() => {
    if (initialStudentsCount > 0) setStudents(initialStudentsCount);
  }, [initialStudentsCount]);

  useEffect(() => {
    if (initialDriversCount > 0) setDrivers(initialDriversCount);
  }, [initialDriversCount]);

  useEffect(() => {
    if (initialAdminsCount > 0) setAdmins(initialAdminsCount);
  }, [initialAdminsCount]);

  // Direct Supabase Realtime Subscription on 'exam_attempts' & 'user_profiles'
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-widget-row-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_attempts" },
        (payload) => {
          setLastMutatedTable("exam_attempts");
          if (payload.eventType === "INSERT") {
            setExamAttempts((prev) => prev + 1);
            setExamAttemptsDelta((prev) => prev + 1);
          } else if (payload.eventType === "DELETE") {
            setExamAttempts((prev) => Math.max(0, prev - 1));
            setExamAttemptsDelta((prev) => prev - 1);
          }
          if (onRealtimeRowChange) {
            onRealtimeRowChange("exam_attempts", payload.eventType, payload.new || payload.old);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        (payload) => {
          setLastMutatedTable("user_profiles");
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (payload.eventType === "INSERT") {
            setUserProfiles((prev) => prev + 1);
            setUserProfilesDelta((prev) => prev + 1);
            if (newRow?.role === "Student") setStudents((prev) => prev + 1);
            else if (newRow?.role === "Driver") setDrivers((prev) => prev + 1);
            else if (newRow?.role === "Admin") setAdmins((prev) => prev + 1);
          } else if (payload.eventType === "DELETE") {
            setUserProfiles((prev) => Math.max(0, prev - 1));
            setUserProfilesDelta((prev) => prev - 1);
            if (oldRow?.role === "Student") setStudents((prev) => Math.max(0, prev - 1));
            else if (oldRow?.role === "Driver") setDrivers((prev) => Math.max(0, prev - 1));
            else if (oldRow?.role === "Admin") setAdmins((prev) => Math.max(0, prev - 1));
          }
          if (onRealtimeRowChange) {
            onRealtimeRowChange("user_profiles", payload.eventType, payload.new || payload.old);
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRealtimeRowChange]);

  // Chart dataset based on selected view mode
  const chartData: TableRowCountItem[] = useMemo(() => {
    if (viewMode === "detailed") {
      return [
        {
          name: "Exam Attempts",
          table: "exam_attempts",
          count: examAttempts,
          liveDelta: examAttemptsDelta,
          fill: "#22C55E", // Emerald
          category: "exams",
          description: "All student test sessions",
        },
        {
          name: "Students",
          table: "user_profiles (Student)",
          count: students || Math.max(0, userProfiles - drivers - admins),
          liveDelta: userProfilesDelta,
          fill: "#6366F1", // Indigo
          category: "users",
          description: "Registered student accounts",
        },
        {
          name: "Drivers",
          table: "user_profiles (Driver)",
          count: drivers,
          liveDelta: 0,
          fill: "#14B8A6", // Teal
          category: "users",
          description: "Verified drivers roster",
        },
        {
          name: "Admins",
          table: "user_profiles (Admin)",
          count: admins,
          liveDelta: 0,
          fill: "#EC4899", // Pink
          category: "users",
          description: "System administrators",
        },
      ];
    }

    // Primary 2-table direct comparison
    return [
      {
        name: "Exam Attempts",
        table: "exam_attempts",
        count: examAttempts,
        liveDelta: examAttemptsDelta,
        fill: "#22C55E", // Emerald
        category: "exams",
        description: "Live exam sessions logged",
      },
      {
        name: "User Profiles",
        table: "user_profiles",
        count: userProfiles,
        liveDelta: userProfilesDelta,
        fill: "#6366F1", // Indigo
        category: "users",
        description: "Total registered accounts",
      },
    ];
  }, [viewMode, examAttempts, userProfiles, students, drivers, admins, examAttemptsDelta, userProfilesDelta]);

  const totalTrackedRows = examAttempts + userProfiles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`admin-card p-5 sm:p-6 space-y-5 relative overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-card-bg)] shadow-sm rounded-2xl ${className}`}
    >
      {/* Header with Realtime Indicator & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--admin-text)] tracking-tight flex items-center gap-2">
                <span>Real-Time Database Row Telemetry</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-[var(--admin-muted)]">
                Direct live row count visualization for <code className="text-indigo-400 font-mono">exam_attempts</code> and <code className="text-emerald-400 font-mono">user_profiles</code>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Live State Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs">
            <button
              onClick={() => setViewMode("primary")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === "primary"
                  ? "bg-[var(--admin-hover-bg)] text-[var(--admin-text)] shadow-sm font-semibold"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              Primary Tables
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === "detailed"
                  ? "bg-[var(--admin-hover-bg)] text-[var(--admin-text)] shadow-sm font-semibold"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              Detailed Split
            </button>
          </div>
        </div>
      </div>

      {/* Row Count KPI Badges Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
          <div className="text-[11px] text-[var(--admin-muted)] font-medium flex items-center justify-between">
            <span>exam_attempts</span>
            {examAttemptsDelta !== 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400">
                +{examAttemptsDelta} live
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
            <AnimatedCounter value={examAttempts} />
          </div>
          <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">Total Attempt Rows</div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
          <div className="text-[11px] text-[var(--admin-muted)] font-medium flex items-center justify-between">
            <span>user_profiles</span>
            {userProfilesDelta !== 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400">
                +{userProfilesDelta} live
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-400 mt-1">
            <AnimatedCounter value={userProfiles} />
          </div>
          <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">Total User Records</div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
          <div className="text-[11px] text-[var(--admin-muted)] font-medium">Activity Stream</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
            <AnimatedCounter value={realtimeEventCount} />
          </div>
          <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">Real-time Events</div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)]">
          <div className="text-[11px] text-[var(--admin-muted)] font-medium">Aggregate Records</div>
          <div className="text-xl sm:text-2xl font-bold text-[var(--admin-text)] mt-1">
            <AnimatedCounter value={totalTrackedRows} />
          </div>
          <div className="text-[10px] text-[var(--admin-muted)] mt-0.5">Sum of Core Tables</div>
        </div>
      </div>

      {/* Recharts BarChart Visualization */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
            barSize={viewMode === "detailed" ? 36 : 54}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} opacity={0.6} />
            <XAxis
              dataKey="name"
              stroke="var(--admin-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "var(--admin-border)" }}
            />
            <YAxis
              stroke="var(--admin-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--admin-hover-bg)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as TableRowCountItem;
                  const pct = totalTrackedRows > 0 ? ((data.count / totalTrackedRows) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="p-3 rounded-xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                      <div className="flex items-center gap-2 font-bold text-[var(--admin-text)]">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
                        <span>{data.name}</span>
                      </div>
                      <div className="text-[11px] text-[var(--admin-muted)] font-mono">
                        Table: <span className="text-[var(--admin-text)]">{data.table}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--admin-border)]">
                        <span className="text-[var(--admin-muted)]">Live Row Count:</span>
                        <span className="font-bold text-[var(--admin-text)] text-sm">{data.count.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[11px]">
                        <span className="text-[var(--admin-muted)]">Database Share:</span>
                        <span className="font-semibold text-indigo-400">{pct}%</span>
                      </div>
                      {data.liveDelta !== 0 && (
                        <div className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                          ⚡ Mutated in this active session: {data.liveDelta > 0 ? `+${data.liveDelta}` : data.liveDelta}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--admin-border)] text-xs text-[var(--admin-muted)]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Realtime Postgres replication enabled on schema <code className="text-zinc-300 font-mono">public</code></span>
        </div>
        {lastMutatedTable && (
          <span className="text-[11px] font-medium text-emerald-400">
            Last live Postgres mutation: <code className="font-mono">{lastMutatedTable}</code>
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default DashboardWidget;
