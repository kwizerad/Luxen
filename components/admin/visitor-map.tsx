"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  MapPin,
  Smartphone,
  Laptop,
  Tablet,
  RefreshCw,
  Activity,
  Layers,
  Search,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  getVisitorGeoDistribution,
  type VisitorGeoData,
  type VisitorLocationPoint,
} from "@/app/Admin/actions/visitor-geo";
import { motion, AnimatePresence } from "framer-motion";

// Dynamically import Leaflet inner map with SSR disabled
const VisitorMapInner = dynamic(
  () => import("@/components/admin/visitor-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex flex-col items-center justify-center gap-3 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Globe className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-xs font-medium text-[var(--admin-muted)]">Loading Interactive Visitor Map…</p>
      </div>
    ),
  }
);

export function VisitorGeoMap() {
  const [data, setData] = useState<VisitorGeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<VisitorLocationPoint | null>(null);
  const [filterDevice, setFilterDevice] = useState<"all" | "desktop" | "mobile" | "tablet">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getVisitorGeoDistribution();
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.points.length > 0) {
          setSelectedPoint(res.data.points[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load visitor map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered points by device category and search query
  const filteredPoints = useMemo(() => {
    if (!data?.points) return [];
    return data.points.filter((point) => {
      const matchesDevice =
        filterDevice === "all" ||
        point.deviceType.toLowerCase().includes(filterDevice);

      const matchesSearch =
        !searchQuery ||
        point.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.ip.includes(searchQuery) ||
        point.path?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDevice && matchesSearch;
    });
  }, [data?.points, filterDevice, searchQuery]);

  return (
    <div className="admin-card p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="admin-card-title text-base sm:text-lg font-bold">
                Visitor Geographic Distribution
              </h3>
              <p className="text-xs text-[var(--admin-muted)]">
                Real-time geographic and device telemetry logged from{" "}
                <code className="px-1.5 py-0.5 rounded bg-[var(--admin-input-bg)] text-emerald-400 font-mono text-[11px]">
                  visitor_logs
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Device Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs">
            <button
              onClick={() => setFilterDevice("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterDevice === "all"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterDevice("desktop")}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterDevice === "desktop"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setFilterDevice("mobile")}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterDevice === "mobile"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile
            </button>
            <button
              onClick={() => setFilterDevice("tablet")}
              className={`px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterDevice === "tablet"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              Tablet
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] hover:bg-[var(--admin-hover-bg)] text-[var(--admin-text)] transition-colors disabled:opacity-50"
            title="Refresh Map Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--admin-muted)] font-medium">Logged Visits</p>
            <p className="text-base sm:text-lg font-bold text-[var(--admin-text)] truncate">
              {data?.totalLogs ?? "…"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--admin-muted)] font-medium">Countries</p>
            <p className="text-base sm:text-lg font-bold text-[var(--admin-text)] truncate">
              {data?.uniqueCountries ?? "…"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--admin-muted)] font-medium">Active Cities</p>
            <p className="text-base sm:text-lg font-bold text-[var(--admin-text)] truncate">
              {data?.uniqueCities ?? "…"}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--admin-muted)] font-medium">Top Region</p>
            <p className="text-base sm:text-lg font-bold text-[var(--admin-text)] truncate">
              {data?.topCities[0]?.city || "Global Hub"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Map & Breakdown Layout */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Map Container (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="relative h-[440px] w-full rounded-2xl border border-[var(--admin-border)] overflow-hidden shadow-inner">
            <VisitorMapInner
              points={filteredPoints}
              selectedPoint={selectedPoint}
              onSelectPoint={setSelectedPoint}
            />

            {/* Map Legend Floating Overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/85 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl flex items-center gap-3 text-[11px] text-slate-200">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80]" />
                Desktop
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                Mobile
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
                Tablet
              </span>
            </div>
          </div>

          {/* Search within map points */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by country, city, path, or IP…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] text-xs text-[var(--admin-text)] placeholder-[var(--admin-muted)] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Sidebar Breakdown & Activity (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Top Countries Leaderboard */}
          <div className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-xs text-[var(--admin-text)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Geographic Distribution
              </h4>
              <span className="text-[11px] text-[var(--admin-muted)]">
                {data?.countryStats?.length || 0} regions
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[190px] pr-1">
              {data?.countryStats && data.countryStats.length > 0 ? (
                data.countryStats.map((item) => (
                  <div key={item.country} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--admin-text)] truncate max-w-[150px]">
                        {item.country}
                      </span>
                      <span className="text-[var(--admin-muted)] font-mono text-[11px]">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--admin-hover-bg)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-[var(--admin-muted)]">
                  No regional logs recorded yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Visitor Stream */}
          <div className="p-4 rounded-2xl bg-[var(--admin-input-bg)] border border-[var(--admin-border)] flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-xs text-[var(--admin-text)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Live Visitor Activity
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">
                Live Feed
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[170px] pr-1">
              {data?.recentLogs && data.recentLogs.length > 0 ? (
                data.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      const matched = data.points.find((p) => p.id === log.id);
                      if (matched) setSelectedPoint(matched);
                    }}
                    className="p-2 rounded-xl bg-[var(--admin-card-bg)] border border-[var(--admin-border)] hover:border-emerald-500/40 cursor-pointer transition-all text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--admin-text)] truncate">
                        {log.location}
                      </p>
                      <p className="text-[10px] text-[var(--admin-muted)] truncate">
                        {log.device} • <span className="font-mono text-emerald-400">{log.path}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--admin-muted)] flex-shrink-0">
                      {new Date(log.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[var(--admin-muted)]">
                  Awaiting visitor traffic…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
