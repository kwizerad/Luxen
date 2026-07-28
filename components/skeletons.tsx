"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
export { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

// ------------------------------------------------------------------
// Fade-in wrapper for smooth skeleton → content transitions
// ------------------------------------------------------------------
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Admin Dashboard Skeleton
// ------------------------------------------------------------------
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton variant="admin" className="h-9 w-64" />
        <Skeleton variant="admin" className="h-4 w-48" />
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-stat-card">
            <div className="flex items-start justify-between mb-4">
              <Skeleton variant="admin" className="h-4 w-24" />
              <Skeleton variant="admin" className="h-11 w-11 rounded-xl" />
            </div>
            <Skeleton variant="admin" className="h-8 w-20 mb-2" />
            <Skeleton variant="admin" className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="admin-card lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton variant="admin" className="h-5 w-36 mb-2" />
              <Skeleton variant="admin" className="h-3 w-52" />
            </div>
            <Skeleton variant="admin" className="h-8 w-28" />
          </div>
          <Skeleton variant="admin" className="h-[260px] w-full rounded-2xl" />
        </div>
        <div className="admin-card p-6">
          <Skeleton variant="admin" className="h-5 w-32 mb-2" />
          <Skeleton variant="admin" className="h-3 w-40 mb-8" />
          <div className="flex justify-center">
            <Skeleton variant="admin" className="h-40 w-40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Distribution + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <Skeleton variant="admin" className="h-5 w-36 mb-6" />
          <div className="flex justify-center">
            <Skeleton variant="admin" className="h-48 w-48 rounded-full" />
          </div>
        </div>
        <div className="admin-card lg:col-span-2 p-6">
          <Skeleton variant="admin" className="h-5 w-32 mb-2" />
          <Skeleton variant="admin" className="h-3 w-48 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="admin" className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton variant="admin" className="h-4 w-3/4" />
                  <Skeleton variant="admin" className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System status + quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <Skeleton variant="admin" className="h-5 w-36 mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton variant="admin" className="h-4 w-24" />
                <Skeleton variant="admin" className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="admin-card lg:col-span-2 p-6">
          <Skeleton variant="admin" className="h-5 w-40 mb-2" />
          <Skeleton variant="admin" className="h-3 w-56 mb-6" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-input-bg)]">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton variant="admin" className="h-10 w-10 rounded-xl" />
                  <Skeleton variant="admin" className="h-4 w-24" />
                </div>
                <Skeleton variant="admin" className="h-3 w-full mb-1" />
                <Skeleton variant="admin" className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Student Dashboard Skeleton
// ------------------------------------------------------------------
export function StudentDashboardSkeleton() {
  return (
    <div className="student-page-narrow space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-kpi-card p-4 sm:p-6 min-h-[120px] sm:min-h-[160px]">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="premium-quick-action p-6 min-h-[160px]">
            <Skeleton className="h-12 w-12 rounded-2xl mx-auto mb-4" />
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
        ))}
      </div>
      <div className="flex sm:hidden gap-1.5 -mx-1 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-8 rounded-full" />
        ))}
      </div>

      {/* Profile completion + activity */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="premium-dash-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="premium-dash-card p-4 sm:p-6">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border/40">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="premium-dash-card p-4 sm:p-6">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-3 w-56 mb-6" />
            <Skeleton className="h-[260px] w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Table Skeleton
// ------------------------------------------------------------------
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasSearch?: boolean;
  hasFilters?: boolean;
  variant?: "default" | "admin";
  className?: string;
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
  hasSearch = true,
  hasFilters = true,
  variant = "default",
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(hasSearch || hasFilters) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          {hasSearch && <Skeleton variant={variant} className="h-10 w-full sm:w-72 rounded-xl" />}
          {hasFilters && (
            <div className="flex gap-2">
              <Skeleton variant={variant} className="h-10 w-28 rounded-xl" />
              <Skeleton variant={variant} className="h-10 w-28 rounded-xl" />
            </div>
          )}
        </div>
      )}
      <div
        className={cn(
          "rounded-[18px] border overflow-hidden",
          variant === "admin" ? "border-[var(--admin-border)]" : "border-border"
        )}
      >
        <div className="w-full">
          {/* Header */}
          <div
            className={cn(
              "grid gap-4 px-4 py-3 border-b",
              variant === "admin"
                ? "border-b-[var(--admin-border)] bg-[var(--admin-hover-bg)]"
                : "border-b-border bg-muted/40"
            )}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} variant={variant} className="h-4 w-20" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                "grid gap-4 px-4 py-4 items-center",
                variant === "admin" ? "border-b border-b-[var(--admin-border)]" : "border-b border-b-border"
              )}
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  variant={variant}
                  className={cn("h-4", colIndex === 0 ? "w-4/5" : colIndex === columns - 1 ? "w-16" : "w-24")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Card Skeleton
// ------------------------------------------------------------------
interface CardSkeletonProps {
  header?: boolean;
  lines?: number;
  variant?: "default" | "admin";
  className?: string;
  hasAction?: boolean;
}

export function CardSkeleton({
  header = true,
  lines = 4,
  variant = "default",
  className,
  hasAction = false,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-4 sm:p-6",
        variant === "admin" ? "admin-card" : "premium-dash-card",
        className
      )}
    >
      {header && (
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-2">
            <Skeleton variant={variant} className="h-5 w-40" />
            <Skeleton variant={variant} className="h-3 w-56" />
          </div>
          {hasAction && <Skeleton variant={variant} className="h-9 w-24 rounded-xl" />}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} variant={variant} className={cn("h-4", i % 2 === 0 ? "w-full" : "w-3/4")} />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Profile Skeleton
// ------------------------------------------------------------------
export function ProfileSkeleton({ variant = "default" }: { variant?: "default" | "admin" }) {
  const cardClass = variant === "admin" ? "admin-card" : "premium-dash-card";
  return (
    <div className={cn("space-y-5", variant === "default" && "student-page-narrow")}>
      <div className="student-page-header">
        <Skeleton variant={variant} className="h-16 w-16 sm:h-20 sm:w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton variant={variant} className="h-8 w-48" />
          <Skeleton variant={variant} className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
        <div className={cn(cardClass, "p-4 sm:p-6")}>
          <Skeleton variant={variant} className="h-5 w-40 mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant={variant} className="h-3 w-20" />
                <Skeleton variant={variant} className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className={cn(cardClass, "p-4 sm:p-6")}>
          <Skeleton variant={variant} className="h-5 w-40 mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton variant={variant} className="h-3 w-20" />
                <Skeleton variant={variant} className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Form Skeleton
// ------------------------------------------------------------------
export function FormSkeleton({
  fields = 5,
  variant = "default",
  className,
}: {
  fields?: number;
  variant?: "default" | "admin";
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant={variant} className="h-4 w-24" />
          <Skeleton variant={variant} className="h-11 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton variant={variant} className="h-11 w-32 rounded-xl" />
    </div>
  );
}

// ------------------------------------------------------------------
// Chart Skeleton
// ------------------------------------------------------------------
export function ChartSkeleton({ variant = "default", className }: { variant?: "default" | "admin"; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[20px] p-4 sm:p-6",
        variant === "admin" ? "admin-card" : "premium-dash-card",
        className
      )}
    >
      <Skeleton variant={variant} className="h-5 w-40 mb-2" />
      <Skeleton variant={variant} className="h-3 w-56 mb-6" />
      <Skeleton variant={variant} className="h-[280px] w-full rounded-2xl" />
    </div>
  );
}

// ------------------------------------------------------------------
// Admin Layout Skeleton (shell with sidebar + header)
// ------------------------------------------------------------------
export function AdminLayoutSkeleton() {
  return (
    <div className="admin-portal min-h-screen flex">
      <div className="admin-aurora" />
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[280px] shrink-0 p-6 gap-6 admin-sidebar">
        <div className="flex items-center gap-3">
          <Skeleton variant="admin" className="h-10 w-10 rounded-xl" />
          <Skeleton variant="admin" className="h-5 w-32" />
        </div>
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="admin" className="h-11 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton variant="admin" className="h-11 w-full rounded-xl" />
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="admin-topbar sticky top-0 z-30 flex items-center justify-between px-6 py-4">
          <Skeleton variant="admin" className="h-10 w-48 rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton variant="admin" className="h-10 w-10 rounded-xl" />
            <Skeleton variant="admin" className="h-10 w-10 rounded-xl" />
            <Skeleton variant="admin" className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="admin-content px-6 pb-6">
          <AdminDashboardSkeleton />
        </main>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Student Layout Skeleton (shell with header + bottom nav)
// ------------------------------------------------------------------
export function StudentLayoutSkeleton() {
  return (
    <div className="bg-transparent min-h-screen">
      <header className="premium-glass-panel sticky top-0 left-0 right-0 z-50 border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </header>
      <main className="min-w-0">
        <StudentDashboardSkeleton />
      </main>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
        <Skeleton className="h-14 w-full rounded-full" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Exam / Quiz Skeleton
// ------------------------------------------------------------------
export function ExamSkeleton({ variant = "default" }: { variant?: "default" | "admin" }) {
  const cardClass = variant === "admin" ? "admin-card" : "premium-dash-card";
  return (
    <div className={cn("space-y-5", variant === "default" && "student-page-narrow")}>
      <div className="flex items-center justify-between">
        <Skeleton variant={variant} className="h-9 w-32 rounded-xl" />
        <Skeleton variant={variant} className="h-9 w-24 rounded-xl" />
      </div>
      <div className={cn(cardClass, "p-4 sm:p-6")}>
        <div className="flex items-center justify-between mb-6">
          <Skeleton variant={variant} className="h-6 w-48" />
          <Skeleton variant={variant} className="h-8 w-20 rounded-lg" />
        </div>
        <Skeleton variant={variant} className="h-5 w-full mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant={variant} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Skeleton variant={variant} className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Generic List Skeleton
// ------------------------------------------------------------------
export function ListSkeleton({
  items = 5,
  variant = "default",
  className,
}: {
  items?: number;
  variant?: "default" | "admin";
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 p-3 rounded-xl",
            variant === "admin" ? "border border-[var(--admin-border)]" : "border border-border"
          )}
        >
          <Skeleton variant={variant} className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton variant={variant} className="h-4 w-3/4" />
            <Skeleton variant={variant} className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
