import { LoadingLogo } from "@/components/loading-logo";

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-zinc-800/60 animate-pulse" style={{ width: `${100 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="md:hidden">
          <LoadingLogo size="md" />
        </div>
        <div className="hidden md:block relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground font-mono">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// HOME VIEW SKELETON
// ============================================================================

export function HomeViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8 space-y-5">
        {/* Welcome Banner */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="md:hidden"><LoadingLogo size="md" /></div>
          <div className="hidden md:block h-14 w-14 shrink-0 rounded-xl bg-zinc-800/80 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 sm:h-7 w-36 sm:w-52 rounded-lg bg-zinc-800/80 animate-pulse" />
            <div className="h-3 sm:h-4 w-48 sm:w-72 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 text-center">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-zinc-800/80 animate-pulse" />
              <div className="h-5 sm:h-6 w-14 sm:w-20 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-2.5 sm:h-3 w-16 sm:w-24 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Progress Bar Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-3 sm:h-4 w-28 rounded bg-zinc-800/70 animate-pulse" />
            <div className="h-3 sm:h-4 w-12 rounded bg-zinc-800/70 animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden animate-pulse" />
        </div>

        {/* Continue Learning Card */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-zinc-800/80 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 sm:h-3 w-24 rounded bg-zinc-800/60 animate-pulse" />
            <div className="h-4 sm:h-5 w-44 rounded bg-zinc-800/80 animate-pulse" />
            <div className="h-3 sm:h-3.5 w-60 rounded bg-zinc-800/50 animate-pulse" />
          </div>
          <div className="hidden sm:block h-9 w-28 rounded-lg bg-zinc-800/70 shrink-0 animate-pulse" />
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2.5 sm:gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5 sm:p-5">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-zinc-800/80 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 sm:h-4 w-24 rounded bg-zinc-800/80 animate-pulse" />
                <div className="h-2.5 sm:h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COURSE VIEW SKELETON
// ============================================================================

export function CourseViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Title Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-40 rounded bg-zinc-800/50 animate-pulse hidden sm:block" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-32 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-7 sm:h-9 w-52 sm:w-72 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 sm:h-4 w-72 sm:w-96 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>

      {/* Progress Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3 shadow-none">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 rounded bg-zinc-800/70 animate-pulse" />
          <div className="h-3.5 w-16 rounded bg-zinc-800/70 animate-pulse" />
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden animate-pulse" />
        <div className="flex items-center gap-4 pt-1">
          <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
          <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
          <div className="h-3 w-16 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>

      {/* Continue Learning Resume Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-3 w-28 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-5 w-48 rounded bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-64 rounded bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
      </div>

      {/* Modules Structured Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-36 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-3.5 w-16 rounded bg-zinc-800/50 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-lg bg-zinc-800/80 animate-pulse shrink-0" />
                  <div className="h-5 w-20 rounded bg-zinc-800/60 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-5 w-4/5 rounded bg-zinc-800/90 animate-pulse" />
                  <div className="h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-zinc-800/40 animate-pulse" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-3 w-16 rounded bg-zinc-800/50 animate-pulse" />
                  <div className="h-3 w-16 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                <div className="flex justify-between">
                  <div className="h-2.5 w-14 rounded bg-zinc-800/50 animate-pulse" />
                  <div className="h-2.5 w-10 rounded bg-zinc-800/50 animate-pulse" />
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS VIEW SKELETON
// ============================================================================

export function SettingsViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-48 rounded bg-zinc-800/50 animate-pulse hidden sm:block" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-36 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-7 sm:h-9 w-48 sm:w-64 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 sm:h-4 w-72 sm:w-96 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>

      {/* Bento Container for Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-5">
        {/* User Profile Header Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3.5">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-zinc-800/80 shrink-0 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-3.5 w-48 rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-4 w-20 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-lg bg-zinc-800/70 shrink-0 animate-pulse" />
        </div>

        {/* Section Cards */}
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 rounded bg-zinc-800/80 animate-pulse" />
                  <div className="h-3 w-56 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-7 rounded-lg bg-zinc-800/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAM CATEGORY SKELETON
// ============================================================================

export function ExamCategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/80 animate-pulse" />
            <div className="h-5 w-16 rounded bg-zinc-800/60 animate-pulse" />
          </div>
          <div className="h-5 w-40 rounded bg-zinc-800/90 animate-pulse" />
          <div className="h-3.5 w-full rounded bg-zinc-800/50 animate-pulse" />
          <div className="space-y-2 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-3 w-10 rounded bg-zinc-800/50 animate-pulse" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-zinc-800/50 animate-pulse" />
              <div className="h-3 w-12 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-full rounded-lg bg-zinc-800/70 animate-pulse mt-2" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DASHBOARD LAYOUT SKELETON
// ============================================================================

export function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="md:hidden"><LoadingLogo size="md" /></div>
          <div className="hidden md:block h-12 w-12 rounded-xl bg-zinc-800/80 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-zinc-800/90 animate-pulse" />
            <div className="h-4 w-56 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-zinc-800/80 animate-pulse" />
              <div className="h-5 w-16 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-zinc-800/70 animate-pulse" />
            <div className="h-4 w-10 rounded bg-zinc-800/70 animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-800/80 animate-pulse" />
              <div className="h-4 w-24 rounded bg-zinc-800/80 animate-pulse" />
              <div className="h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRIVERS LIST VIEW SKELETON
// ============================================================================

export function DriversListViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 h-5 w-32 rounded bg-zinc-800/60 animate-pulse" />
        <div className="mb-6 space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-800/90 animate-pulse" />
          <div className="h-4 w-72 rounded bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="mb-6 flex gap-3">
          <div className="h-11 flex-1 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          <div className="h-11 w-32 rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800/80 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-800/80 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between border-t border-zinc-800/60 pt-3">
                <div className="h-4 w-16 rounded bg-zinc-800/50 animate-pulse" />
                <div className="h-4 w-20 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRIVER DETAIL VIEW SKELETON
// ============================================================================

export function DriverDetailViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="h-5 w-32 rounded bg-zinc-800/60 animate-pulse" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-zinc-800/80 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-40 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-4 w-56 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/60">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-40 rounded bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-zinc-800/90 animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-800/70 animate-pulse" />
            ))}
          </div>
          <div className="h-12 rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DRIVER PANEL VIEW SKELETON
// ============================================================================

export function DriverPanelViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 space-y-2">
          <div className="h-8 w-40 rounded-lg bg-zinc-800/90 animate-pulse" />
          <div className="h-4 w-64 rounded bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-2">
              <div className="mx-auto h-6 w-6 rounded bg-zinc-800/80 animate-pulse" />
              <div className="mx-auto h-8 w-16 rounded bg-zinc-800/90 animate-pulse" />
              <div className="mx-auto h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-zinc-800/80 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-28 rounded bg-zinc-800/80 animate-pulse" />
                  <div className="h-3 w-36 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT CONVERSATION VIEW SKELETON
// ============================================================================

export function ChatConversationViewSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-in fade-in duration-200">
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3 bg-zinc-900/40">
        <div className="h-5 w-5 rounded bg-zinc-800/60 animate-pulse" />
        <div className="h-10 w-10 rounded-full bg-zinc-800/80 animate-pulse" />
        <div className="h-5 w-32 rounded bg-zinc-800/80 animate-pulse" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="h-12 w-48 sm:w-64 rounded-2xl bg-zinc-900 border border-zinc-800/60 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 px-4 py-3 flex items-center gap-2 bg-zinc-900/40">
        <div className="h-11 flex-1 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
        <div className="h-11 w-11 rounded-xl bg-zinc-800/80 animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// CHAT LIST VIEW SKELETON
// ============================================================================

export function ChatListViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-8 w-40 rounded-lg bg-zinc-800/90 animate-pulse" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-800/80 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-zinc-800/80 animate-pulse" />
                <div className="h-3 w-48 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MY REPORTS VIEW SKELETON
// ============================================================================

export function MyReportsViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-40 rounded-lg bg-zinc-800/90 animate-pulse" />
          <div className="h-10 w-28 rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-32 rounded bg-zinc-800/60 animate-pulse" />
              {[0, 1].map((j) => (
                <div key={j} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-28 rounded bg-zinc-800/80 animate-pulse" />
                    <div className="h-5 w-16 rounded-full bg-zinc-800/60 animate-pulse" />
                  </div>
                  <div className="h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REQUEST CODE VIEW SKELETON
// ============================================================================

export function RequestCodeViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-5 w-32 rounded bg-zinc-800/60 animate-pulse" />
        <div className="mb-6 space-y-2">
          <div className="h-8 w-48 rounded-lg bg-zinc-800/90 animate-pulse" />
          <div className="h-4 w-64 rounded bg-zinc-800/50 animate-pulse" />
        </div>
        <div className="mb-6 flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
          <div className="h-10 flex-1 rounded-lg bg-zinc-800/70 animate-pulse" />
          <div className="h-10 flex-1 rounded-lg bg-zinc-800/70 animate-pulse" />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <div className="h-11 w-full rounded-xl bg-zinc-800/60 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STUDENT TRAINING VIEW SKELETON
// ============================================================================

export function StudentTrainingViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-8 w-40 rounded-lg bg-zinc-800/90 animate-pulse" />
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center space-y-2">
              <div className="mx-auto h-8 w-16 rounded bg-zinc-800/90 animate-pulse" />
              <div className="mx-auto h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-zinc-800/80 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-zinc-800/80 animate-pulse" />
                <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-zinc-800/50 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DRIVER HUB VIEW SKELETON
// ============================================================================

export function DriverHubViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="sticky top-0 z-30 border-b border-zinc-800 bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-1 py-2">
            <div className="mr-2 h-8 w-8 rounded-lg bg-zinc-800/80 animate-pulse" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <div className="mb-6 flex gap-3">
          <div className="h-11 flex-1 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          <div className="h-11 w-32 rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800/80 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-800/80 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAM HISTORY VIEW SKELETON (Matches 4-6 column Bento Layout)
// ============================================================================

export function ExamHistorySkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-44 rounded bg-zinc-800/50 animate-pulse hidden sm:block" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-zinc-800/60 animate-pulse" />
            <div className="h-7 sm:h-9 w-48 sm:w-64 rounded-lg bg-zinc-800/80 animate-pulse" />
          </div>

          {/* Quick Search, Grouping, Filter & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="h-8 w-44 sm:w-48 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
            <div className="h-8 w-28 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
            <div className="h-8 w-16 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
            <div className="flex items-center p-0.5 rounded-lg border border-zinc-800 bg-zinc-900/80 gap-1">
              <div className="h-7 w-7 rounded-md bg-zinc-800/80 animate-pulse" />
              <div className="h-7 w-7 rounded-md bg-zinc-800/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Stats Grid (4 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="h-5 w-12 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 flex-1 rounded-lg bg-zinc-800/60 animate-pulse shrink-0"
          />
        ))}
      </div>

      {/* 4 to 6 Columns Dossier Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-3.5 flex flex-col justify-between space-y-3 min-h-[170px]"
          >
            <div className="space-y-2.5">
              {/* Top Row: File Icon & Score Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="h-8 w-8 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
                <div className="h-4.5 w-11 rounded bg-zinc-800/70 shrink-0 animate-pulse" />
              </div>

              {/* Title & Tag */}
              <div className="space-y-1">
                <div className="h-3.5 w-4/5 rounded bg-zinc-800/90 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>

            {/* Bottom Meta & Progress Meter */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/60">
              <div className="h-1 rounded-full bg-zinc-800 animate-pulse" />
              <div className="flex items-center justify-between">
                <div className="h-2.5 w-16 rounded bg-zinc-800/50 animate-pulse" />
                <div className="h-3 w-3 rounded bg-zinc-800/40 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CLASSMATES VIEW SKELETON
// ============================================================================

export function ClassmatesViewSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)] overflow-hidden animate-in fade-in duration-200">
      {/* Left Sidebar */}
      <div className="w-full sm:w-80 border-r border-zinc-800 flex flex-col bg-background h-full shrink-0">
        {/* Back Link */}
        <div className="p-3 pb-0">
          <div className="h-4 w-16 rounded bg-zinc-800/60 animate-pulse" />
        </div>

        {/* Tab Switcher & Visibility */}
        <div className="p-3 border-b border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 border border-zinc-800/60 flex-1">
              <div className="h-7 flex-1 rounded-lg bg-zinc-800/70 animate-pulse" />
              <div className="h-7 flex-1 rounded-lg bg-zinc-800/40 animate-pulse" />
            </div>
            <div className="h-7 w-7 rounded-lg bg-zinc-800/60 animate-pulse shrink-0" />
          </div>

          {/* Search Input */}
          <div className="h-9 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
        </div>

        {/* Classmates Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800/80 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="h-3.5 w-28 rounded bg-zinc-800/90 animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-zinc-800/50 animate-pulse" />
              </div>
              <div className="h-7 w-12 rounded-lg bg-zinc-800/50 animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Chat & Preview Area */}
      <div className="hidden sm:flex flex-1 flex-col h-full bg-zinc-950/20">
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zinc-800/80 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-zinc-800/90 animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-800/60 animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-zinc-800/70 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-12 w-52 sm:w-64 rounded-2xl bg-zinc-900 border border-zinc-800/60 animate-pulse" />
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 p-3 flex items-center gap-2 bg-zinc-900/40">
          <div className="h-10 flex-1 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
          <div className="h-10 w-10 rounded-xl bg-zinc-800/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GROUP EXAM VIEW SKELETON
// ============================================================================

export function GroupExamViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="h-4 w-24 rounded bg-zinc-800/60 animate-pulse" />
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-7 sm:h-8 w-48 rounded-lg bg-zinc-800/90 animate-pulse" />
            <div className="h-3.5 w-64 rounded bg-zinc-800/50 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-zinc-800/80 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-zinc-800/80 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 rounded bg-zinc-800/90 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
                </div>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-7 w-7 rounded-full bg-zinc-800/70 animate-pulse" />
                ))}
              </div>
              <div className="h-9 w-full rounded-lg bg-zinc-800/80 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GROUP EXAM RESULTS SKELETON
// ============================================================================

export function GroupExamResultsSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-zinc-800/90 animate-pulse" />
            <div className="h-3 w-32 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        </div>
        <div className="h-9 rounded-lg bg-zinc-800/70 animate-pulse w-48" />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
            <div className="h-4 w-24 rounded bg-zinc-800/70 animate-pulse" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/40">
              <div className="h-8 w-8 rounded-full bg-zinc-800/80 animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-zinc-800/80 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-zinc-800/80 animate-pulse" />
                <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
              </div>
              <div className="h-5 w-10 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          ))}
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-zinc-800/80 animate-pulse" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CHALLENGE CARD SKELETON
// ============================================================================

export function ChallengeCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 mb-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-zinc-800/80 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-40 rounded bg-zinc-800/90 animate-pulse" />
          <div className="h-3 w-24 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 w-7 rounded-full bg-zinc-800/70 animate-pulse" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
        <div className="h-8 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// HOME STATS SKELETON (section-specific)
// ============================================================================

export function HomeStatsSkeleton() {
  return (
    <>
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 sm:p-3 text-center">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-zinc-800/80 animate-pulse" />
            <div className="h-4 sm:h-6 w-12 sm:w-16 rounded bg-zinc-800/90 animate-pulse" />
            <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="mb-4 sm:mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3 sm:h-4 w-24 rounded bg-zinc-800/70 animate-pulse" />
          <div className="h-3 sm:h-4 w-10 rounded bg-zinc-800/70 animate-pulse" />
        </div>
        <div className="h-2 rounded-full bg-zinc-800 animate-pulse" />
      </div>
    </>
  );
}

// ============================================================================
// HOME CONTINUE LEARNING SKELETON (section-specific)
// ============================================================================

export function HomeContinueLearningSkeleton() {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex w-full items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 sm:p-5">
        <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-zinc-800/80 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded bg-zinc-800/60 animate-pulse" />
          <div className="h-4 w-40 rounded bg-zinc-800/80 animate-pulse" />
          <div className="h-3 w-56 rounded bg-zinc-800/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SERVICES VIEW SKELETON (Matches Bento Grid Layout)
// ============================================================================

export function ServicesViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-32 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-7 w-20 rounded-lg bg-zinc-800/80 animate-pulse" />
            <div className="h-3.5 w-44 rounded bg-zinc-800/50 animate-pulse hidden sm:block" />
          </div>

          <div className="space-y-1.5">
            <div className="h-3 w-36 rounded bg-zinc-800/60 animate-pulse" />
            <div className="h-7 sm:h-9 w-36 sm:w-48 rounded-lg bg-zinc-800/80 animate-pulse" />
            <div className="h-3.5 sm:h-4 w-72 sm:w-96 rounded bg-zinc-800/50 animate-pulse" />
          </div>
        </div>

        {/* Ongoing Active Exam Telemetry Banner */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 animate-pulse" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-40 rounded bg-zinc-800/90 animate-pulse" />
                <div className="h-4 w-16 rounded bg-amber-500/20 animate-pulse" />
              </div>
              <div className="h-3 w-56 rounded bg-zinc-800/50 animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-24 rounded bg-amber-500/20 animate-pulse" />
        </div>

        {/* Bento Grid Services List (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-28 rounded bg-zinc-800/60 animate-pulse" />
                    <div className="h-5 w-44 rounded bg-zinc-800/90 animate-pulse" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-zinc-800/80 shrink-0 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full rounded bg-zinc-800/50 animate-pulse" />
                  <div className="h-3.5 w-3/4 rounded bg-zinc-800/40 animate-pulse" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="h-3 w-24 rounded bg-zinc-800/60 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXAM CHOICE SKELETON
// ============================================================================

export function ExamChoiceSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-8 w-56 rounded-lg bg-zinc-800/90 animate-pulse mx-auto" />
          <div className="h-4 w-72 rounded bg-zinc-800/50 animate-pulse mx-auto" />
        </div>

        {/* Choice Cards */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-800/80 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-36 rounded bg-zinc-800/90 animate-pulse" />
                <div className="h-4 w-full rounded bg-zinc-800/50 animate-pulse" />
              </div>
              <div className="h-10 w-full rounded-lg bg-zinc-800/70 animate-pulse mt-4" />
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="text-center">
          <div className="h-9 w-24 rounded-lg bg-zinc-800/80 animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
}
