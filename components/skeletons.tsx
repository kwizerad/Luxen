import {
  Skeleton,
  SkeletonAvatar,
  SkeletonBadge,
  SkeletonButton,
  SkeletonNavBar,
  SkeletonProfileHeader,
  SkeletonText,
} from "@/components/ui/skeleton";

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return <SkeletonText lines={lines} lineHeight="md" gap="normal" />;
}

export function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-in fade-in duration-200"
      role="status"
      aria-label={message}
    >
      <SkeletonNavBar />
      <SkeletonProfileHeader />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-5 space-y-3"
          >
            <Skeleton rounded="xl" className="h-10 w-10" />
            <Skeleton className="h-5 w-36" />
            <SkeletonText lines={2} lineHeight="sm" />
          </div>
        ))}
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
}

// ============================================================================
// HOME VIEW SKELETON (100% Parity: Profile Banner + 2 Hero Cards + Quick Actions + Recent Assessments & Safety Tip)
// ============================================================================

export function HomeViewSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 px-4 sm:px-6 animate-in fade-in duration-200">
      {/* Comprehensive Student Profile Banner */}
      <SkeletonProfileHeader />

      {/* Primary Hero Row: Theory Curriculum Card + Take Exam Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {[0, 1].map((cardIdx) => (
          <div
            key={cardIdx}
            className="rounded-2xl sm:rounded-3xl border border-border/70 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-6 sm:p-7 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <SkeletonBadge width="w-32" height="h-6" />
                <SkeletonBadge width="w-24" height="h-5" />
              </div>

              <Skeleton rounded="lg" className="h-6 sm:h-7 w-48 sm:w-60 mb-2.5" />
              <SkeletonText lines={2} lineHeight="md" lastLineWidth="w-4/5" className="mb-5" />

              <div className="space-y-3 p-4 rounded-xl bg-muted/40 dark:bg-zinc-900/70 border border-border/50 dark:border-zinc-800/70 mb-6">
                <div className="flex items-center justify-between">
                  <Skeleton tone="subtle" className="h-3 w-28" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                {cardIdx === 0 ? (
                  <>
                    <Skeleton rounded="full" className="h-2 w-full" />
                    <div className="flex items-center justify-between pt-1">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton tone="accent" className="h-3 w-14" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Skeleton tone="subtle" className="h-3.5 w-24" />
                      <Skeleton tone="subtle" className="h-3.5 w-28" />
                    </div>
                    <div className="pt-2 border-t border-border/40 dark:border-zinc-800/70">
                      <Skeleton tone="subtle" className="h-3 w-52 max-w-full" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-2">
              <SkeletonButton size="lg" fullWidth tone="accent" className="h-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Matrix */}
      <div className="space-y-3">
        <Skeleton tone="subtle" className="h-3.5 w-36 mx-1" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-start p-4 rounded-2xl border border-border/60 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 space-y-2.5"
            >
              <Skeleton rounded="xl" className="h-10 w-10" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="h-4 w-24" />
                <Skeleton tone="subtle" className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Bottom Section: Recent Assessments + Highway Safety Tip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Assessments (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton tone="subtle" className="h-3.5 w-36" />
            <Skeleton tone="accent" className="h-3.5 w-20" />
          </div>
          <div className="rounded-2xl border border-border/60 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 overflow-hidden divide-y divide-border/40 dark:divide-zinc-800/80">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44 sm:w-56 max-w-full" />
                  <Skeleton tone="subtle" className="h-3 w-32 sm:w-40" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="space-y-1.5 text-right flex flex-col items-end">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton tone="subtle" className="h-2.5 w-20" />
                  </div>
                  <Skeleton rounded="lg" tone="subtle" className="h-7 w-7" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highway Safety Reference Tip (1 col) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <Skeleton tone="subtle" className="h-3.5 w-32" />
            <Skeleton tone="subtle" className="h-3.5 w-14" />
          </div>
          <div className="rounded-2xl border border-border/60 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-5 space-y-3">
            <SkeletonBadge tone="accent" width="w-24" height="h-5" />
            <Skeleton className="h-5 w-4/5" />
            <SkeletonText lines={3} lineHeight="sm" lastLineWidth="w-2/3" />
          </div>
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
    <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-5 animate-in fade-in duration-200 overflow-x-hidden">
      {/* Course Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center flex-wrap gap-2 lg:hidden">
            <Skeleton rounded="lg" tone="accent" className="h-8 w-28" />
          </div>

          {/* Language Switcher Bar */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-card dark:bg-zinc-900/70 border border-border dark:border-zinc-800 rounded-xl p-1 w-full sm:w-auto sm:ml-auto">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} rounded="lg" tone={i === 0 ? "default" : "subtle"} className="h-7 sm:w-24" />
            ))}
          </div>
        </div>

        {/* Course Title & Meta */}
        <div className="space-y-1.5">
          <Skeleton rounded="lg" className="h-6 sm:h-8 w-52 sm:w-72" />
          <Skeleton tone="subtle" className="h-3.5 sm:h-4 w-56 sm:w-72" />
        </div>
      </div>

      {/* Continue from Last Topic Card (Single unified resume surface) */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <Skeleton tone="accent" className="h-3.5 w-28" />
            <Skeleton tone="subtle" className="h-3 w-8" />
          </div>
          <Skeleton className="h-4 sm:h-5 w-full max-w-md" />
          <Skeleton tone="subtle" className="h-3 w-44 sm:w-64" />
        </div>
        <Skeleton rounded="lg" tone="accent" className="h-10 sm:h-9 w-full sm:w-44 shrink-0" />
      </div>

      {/* Modules Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton tone="subtle" className="h-3.5 w-20" />
          <Skeleton tone="subtle" className="h-3.5 w-16" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-[rgb(15,15,16)] p-4 space-y-3.5 shadow-xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton rounded="lg" className="h-9 w-9 shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton rounded="md" className="h-5 w-8" />
                    <Skeleton rounded="md" tone="subtle" className="h-5 w-14" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 sm:h-5 w-4/5" />
                  <SkeletonText lines={2} lineHeight="sm" lastLineWidth="w-2/3" />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Skeleton tone="subtle" className="h-3 w-16" />
                  <Skeleton tone="subtle" className="h-3 w-14" />
                </div>
              </div>
              <div className="space-y-2.5 pt-2.5 border-t border-border/80 dark:border-zinc-800/80">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton tone="subtle" className="h-2.5 w-14" />
                    <Skeleton tone="subtle" className="h-2.5 w-12" />
                  </div>
                  <Skeleton rounded="full" className="h-1.5 w-full" />
                </div>
                <Skeleton rounded="lg" className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ROAD SIGNS VIEW SKELETON (Matches Road Signs direct grid view in CourseView)
// ============================================================================

export function RoadSignsSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-5 animate-in fade-in duration-200 overflow-x-hidden">
      {/* Navigation Header & Language Bar */}
      <div className="space-y-3 border-b border-border dark:border-zinc-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center flex-wrap gap-2">
            <Skeleton rounded="lg" tone="accent" className="lg:hidden h-8 w-28" />
            <Skeleton rounded="lg" tone="accent" className="h-8 w-28" />
          </div>

          {/* Language Switcher Bar */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-card border border-border dark:border-zinc-800 rounded-xl p-1 shadow-xs w-full sm:w-auto">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                rounded="lg"
                tone={i === 2 ? "accent" : "subtle"}
                className="h-7 sm:w-24"
              />
            ))}
          </div>
        </div>

        {/* Road Signs Heading + Active Module Tag */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
            <Skeleton rounded="lg" className="h-6 sm:h-7 w-28 sm:w-36" />
            <div className="flex items-center gap-1.5">
              <Skeleton rounded="sm" tone="accent" className="h-3.5 w-3.5 shrink-0" />
              <Skeleton tone="accent" className="h-3.5 w-32 sm:w-44" />
            </div>
          </div>
          <Skeleton tone="subtle" className="h-3.5 sm:h-4 w-72 sm:w-96 max-w-full" />
        </div>

        {/* Module Progress Overview Card */}
        <div className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-[rgb(15,15,16)] p-3 sm:p-3.5 space-y-2 mt-2 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <Skeleton tone="subtle" className="h-3 w-16" />
            <Skeleton tone="accent" className="h-3 w-36" />
          </div>
          <Skeleton rounded="full" className="h-1.5 w-full" />
        </div>
      </div>

      {/* File Explorer Grid for Road Signs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton rounded="sm" tone="accent" className="h-3.5 w-3.5 shrink-0" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton tone="subtle" className="h-3 w-20" />
        </div>

        <div className="grid grid-cols-1 min-[340px]:grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-card dark:bg-zinc-900 p-3 sm:p-4"
            >
              {/* Status indicator top corner */}
              <div className="absolute top-2.5 right-2.5">
                <Skeleton rounded="full" tone="subtle" className="h-3.5 w-3.5" />
              </div>

              {/* Road Sign Visual Thumbnail Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/80 dark:bg-zinc-950 border border-border/60 dark:border-zinc-800 p-2 my-1.5 flex items-center justify-center">
                <Skeleton
                  rounded={i % 2 === 0 ? "full" : "lg"}
                  tone="strong"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                />
              </div>

              {/* Item # Index */}
              <Skeleton tone="subtle" className="h-2.5 w-12 mt-1" />

              {/* 2-line Sign Title */}
              <div className="mt-1.5 space-y-1.5 w-full flex flex-col items-center">
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton tone="subtle" className="h-3 w-3/5" />
              </div>

              {/* Bottom Duration Footer */}
              <div className="mt-2.5 pt-2 border-t border-border/40 dark:border-zinc-800/70 w-full flex items-center justify-center">
                <Skeleton tone="subtle" className="h-2.5 w-12" />
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
  const columns = [
    { headingWidth: "w-20", cardCount: 2 },
    { headingWidth: "w-20", cardCount: 2 },
    { headingWidth: "w-24", cardCount: 1 },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header (No Back button) */}
      <div className="space-y-1.5">
        <Skeleton tone="subtle" className="h-3.5 w-52 max-w-full" />
        <Skeleton rounded="lg" className="h-7 sm:h-8 lg:h-9 w-48 sm:w-64" />
        <Skeleton tone="subtle" className="h-3.5 w-80 sm:w-[28rem] max-w-full" />
      </div>

      {/* Bento Container for Settings */}
      <div className="rounded-2xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/40 p-4 sm:p-6 space-y-6 shadow-xs">
        {/* Profile Summary Card */}
        <div className="rounded-xl border border-border/40 dark:border-zinc-800/80 bg-primary/5 p-6">
          <div className="flex items-center gap-6">
            <Skeleton rounded="full" tone="strong" className="h-20 w-20 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton rounded="lg" className="h-7 w-40 sm:w-52 max-w-full" />
              <Skeleton tone="subtle" className="h-4 w-48 sm:w-60 max-w-full" />
              <div className="flex items-center gap-2 pt-0.5">
                <SkeletonBadge width="w-16" height="h-5" />
                <SkeletonBadge width="w-28" height="h-5" />
              </div>
            </div>
            <Skeleton rounded="md" className="h-9 w-9 shrink-0" />
          </div>
        </div>

        {/* Search Settings Bar */}
        <Skeleton rounded="md" className="h-9 w-full" />

        {/* 3-Column Section Grid: Account (2) | Security (2) | Preferences (1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton rounded="md" tone="accent" className="h-5 w-5 shrink-0" />
                <Skeleton className={`h-5 ${col.headingWidth}`} />
              </div>

              {Array.from({ length: col.cardCount }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-xl border border-border/40 dark:border-zinc-800/80 bg-card dark:bg-zinc-900/60 p-6 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-32 sm:w-36" />
                    <Skeleton rounded="md" tone="subtle" className="h-6 w-6 shrink-0" />
                  </div>
                  <Skeleton tone="subtle" className="h-3 w-48 max-w-full" />
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
// EXAM CATEGORY SKELETON
// ============================================================================

export function ExamCategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-border/60 dark:border-zinc-800">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton tone="subtle" className="h-3 w-52" />
        </div>
        <Skeleton rounded="lg" className="h-8 w-24" />
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton rounded="lg" className="w-10 h-10" />
              <SkeletonBadge width="w-16" />
            </div>
            <Skeleton className="h-5 w-40" />
            <SkeletonText lines={2} lineHeight="sm" />
            <div className="space-y-2 pt-2 border-t border-border/60 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <Skeleton tone="subtle" className="h-3 w-20" />
                <Skeleton tone="subtle" className="h-3 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton tone="subtle" className="h-3 w-16" />
                <Skeleton tone="subtle" className="h-3 w-12" />
              </div>
            </div>
            <SkeletonButton size="md" fullWidth className="mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAM CHOICE SKELETON (Matches OSExamLauncher Stage 1: Header + 3 Flag Tracks)
// ============================================================================

export function ExamChoiceSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col min-h-[calc(100dvh-9rem)] animate-in fade-in duration-200">
      {/* Top Action Bar matching OSExamLauncher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/60 dark:border-zinc-800">
        <div className="space-y-1.5 min-w-0">
          <Skeleton className="h-5 sm:h-6 w-36 sm:w-44" />
          <Skeleton tone="subtle" className="h-3 w-52 sm:w-64" />
        </div>
        <Skeleton rounded="lg" className="h-8 w-24 shrink-0" />
      </div>

      {/* Main Content Area: Centered Heading + 3 Flag Track Cards */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2 flex flex-col items-center">
            <Skeleton className="h-4 w-44" />
            <Skeleton tone="subtle" className="h-3.5 w-64 sm:w-80 max-w-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-7">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl p-2 space-y-2.5">
                <Skeleton rounded="xl" className="aspect-[3/2] w-full" />
                <div className="flex items-center justify-between px-1 pt-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton tone="subtle" className="h-3.5 w-14" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle Bottom Hairline Note */}
      <div className="pt-3 border-t border-border/50 dark:border-zinc-800/60 flex justify-center">
        <Skeleton tone="subtle" className="h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD LAYOUT SKELETON (Matches OS System Bar + OSDesktopView + OSDock)
// ============================================================================

export function DashboardLayoutSkeleton() {
  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background text-foreground overflow-x-hidden animate-in fade-in duration-200">
      {/* OS Top System Bar Placeholder */}
      <div className="h-9 border-b border-border/60 dark:border-zinc-800 px-3 flex items-center justify-between bg-card/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Skeleton rounded="md" className="h-5 w-5" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton tone="subtle" className="h-3.5 w-16 hidden sm:block" />
          <SkeletonAvatar size="xs" />
        </div>
      </div>

      {/* Desktop App Launcher Grid Matching OSDesktopView */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 pt-10 sm:pt-12 pb-28">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-6 p-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-2">
              <Skeleton rounded="2xl" className="h-12 w-12 sm:h-14 sm:w-14" />
              <Skeleton tone="subtle" className="h-3 w-14 sm:w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Floating OS Dock Placeholder */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-zinc-900/80 backdrop-blur-xl flex items-center gap-2 sm:gap-2.5 shadow-lg">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} rounded="xl" className="h-9 w-9 sm:h-10 sm:w-10" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW FALLBACK SKELETON (Replaces generic spinner fallback)
// ============================================================================

export function DashboardViewSkeleton() {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 animate-in fade-in duration-200">
      <SkeletonNavBar />
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton tone="subtle" className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton rounded="xl" className="h-10 w-10" />
              <SkeletonBadge width="w-20" />
            </div>
            <Skeleton className="h-5 w-44" />
            <SkeletonText lines={2} lineHeight="sm" />
            <SkeletonButton size="md" fullWidth className="pt-1" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/70 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 divide-y divide-border/50 dark:divide-zinc-800/70">
        {[0, 1, 2].map((r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-44" />
              <Skeleton tone="subtle" className="h-3 w-28" />
            </div>
            <SkeletonBadge width="w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CHAT MESSAGE BUBBLES SKELETON (Reusable inside conversation views & Agora)
// ============================================================================

export function ChatMessageBubblesSkeleton({ count = 5 }: { count?: number }) {
  const bubbleWidths = [
    "w-48 sm:w-64",
    "w-40 sm:w-56",
    "w-56 sm:w-72",
    "w-36 sm:w-48",
    "w-52 sm:w-64",
  ];
  return (
    <div className="space-y-3 py-2 animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, i) => {
        const isOwn = i % 2 === 1;
        return (
          <div key={i} className={`flex flex-col ${isOwn ? "items-end" : "items-start"} gap-1`}>
            <div
              className={`${bubbleWidths[i % bubbleWidths.length]} max-w-[80%] rounded-2xl px-3.5 py-2.5 space-y-1.5 border ${
                isOwn
                  ? "bg-primary/10 border-primary/20 rounded-br-sm"
                  : "bg-card dark:bg-zinc-900/70 border-border/70 dark:border-zinc-800 rounded-bl-sm"
              }`}
            >
              <Skeleton tone={isOwn ? "accent" : "default"} className="h-3.5 w-full" />
              {i % 2 === 0 && (
                <Skeleton tone="subtle" className="h-3 w-3/4" />
              )}
            </div>
            <Skeleton tone="subtle" className="h-2.5 w-12 mx-1" />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// CHAT CONVERSATION VIEW SKELETON
// ============================================================================

export function ChatConversationViewSkeleton() {
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-3.5rem-4rem-max(0.25rem,env(safe-area-inset-bottom,0px)))] sm:h-[calc(100dvh-4rem-4rem-max(0.25rem,env(safe-area-inset-bottom,0px)))] lg:h-[calc(100dvh-4rem)] overflow-hidden animate-in fade-in duration-200">
      <div className="border-b border-border dark:border-zinc-800 px-4 py-2.5 flex items-center gap-3 bg-card dark:bg-zinc-900/50">
        <Skeleton rounded="lg" tone="subtle" className="h-7 w-7" />
        <SkeletonAvatar size="md" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton tone="subtle" className="h-2.5 w-16" />
        </div>
      </div>
      <div className="flex-1 px-4 py-3 overflow-hidden">
        <ChatMessageBubblesSkeleton count={6} />
      </div>
      <div className="border-t border-border dark:border-zinc-800 px-3 py-2 flex items-center gap-2 bg-card dark:bg-zinc-900/50">
        <Skeleton rounded="xl" className="h-10 flex-1" />
        <Skeleton rounded="xl" tone="accent" className="h-10 w-10 shrink-0" />
      </div>
    </div>
  );
}

// ============================================================================
// CHAT LIST VIEW SKELETON (Matches ChatListView max-w-6xl & embedded mode)
// ============================================================================

export function ChatListViewSkeleton({ embedded = false }: { embedded?: boolean }) {
  const list = (
    <>
      {!embedded && (
        <div className="mb-6 flex items-center gap-2.5">
          <Skeleton rounded="lg" tone="accent" className="h-6 w-6 shrink-0" />
          <Skeleton rounded="lg" className="h-7 w-40" />
        </div>
      )}
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 flex items-center gap-3"
          >
            <SkeletonAvatar size="lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-32 sm:w-44" />
                <Skeleton tone="subtle" className="h-3 w-14 shrink-0" />
              </div>
              <Skeleton tone="subtle" className="h-3.5 w-48 sm:w-64 max-w-full" />
            </div>
            {i < 2 && <Skeleton rounded="full" tone="accent" className="h-6 w-6 shrink-0" />}
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="py-4 animate-in fade-in duration-200">{list}</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <Skeleton rounded="lg" tone="subtle" className="mb-6 h-5 w-24" />
        {list}
      </div>
    </div>
  );
}

// ============================================================================
// MY REPORTS VIEW SKELETON (Matches MyReportsView max-w-6xl & embedded mode)
// ============================================================================

export function MyReportsViewSkeleton({ embedded = false }: { embedded?: boolean }) {
  const inner = (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        {!embedded ? <Skeleton rounded="lg" className="h-8 w-40" /> : <div />}
        <SkeletonButton size="md" tone="accent" className="w-32" />
      </div>
      <div className="space-y-6">
        {[0, 1].map((sectionIdx) => (
          <div key={sectionIdx} className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="space-y-2.5">
              {[0, 1].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton rounded="md" className="h-5 w-5 shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton tone="subtle" className="h-3 w-24" />
                      </div>
                    </div>
                    <SkeletonBadge width="w-20" />
                  </div>
                  <SkeletonText lines={2} lineHeight="sm" lastLineWidth="w-4/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <div className="py-4 animate-in fade-in duration-200">{inner}</div>;
  }

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <Skeleton rounded="lg" tone="subtle" className="mb-6 h-5 w-24" />
        {inner}
      </div>
    </div>
  );
}

// ============================================================================
// REQUEST CODE VIEW SKELETON (Matches RequestCodeView max-w-6xl + rounded-3xl Card + Past Requests)
// ============================================================================

export function RequestCodeViewSkeleton({ embedded = false }: { embedded?: boolean }) {
  const inner = (
    <div className={embedded ? "" : "w-full rounded-3xl border border-border/80 dark:border-zinc-800 bg-card/95 dark:bg-zinc-900/60 p-6 sm:p-8 space-y-6"}>
      {!embedded && (
        <div className="flex items-center gap-3 border-b border-border/60 dark:border-zinc-800 pb-4">
          <Skeleton rounded="xl" tone="accent" className="h-12 w-12 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton tone="subtle" className="h-3.5 w-64 max-w-full" />
          </div>
        </div>
      )}

      {/* Theory / Practical Tabs */}
      <div className="flex gap-2 rounded-xl border border-border dark:border-zinc-800 p-1">
        <Skeleton rounded="lg" tone="accent" className="h-9 flex-1" />
        <Skeleton rounded="lg" tone="subtle" className="h-9 flex-1" />
      </div>

      {/* National ID Form Card */}
      <div className="rounded-2xl border border-border/70 dark:border-zinc-800 bg-background/60 dark:bg-zinc-950/40 p-6 space-y-3">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton rounded="xl" className="h-11 w-full" />
        <SkeletonButton size="lg" fullWidth tone="accent" className="h-11" />
      </div>

      {/* Past Requests History Card */}
      <div className="rounded-2xl border border-border/70 dark:border-zinc-800 bg-background/60 dark:bg-zinc-950/40 p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          {[0, 1].map((row) => (
            <div key={row} className="flex items-center justify-between border-b border-border/50 dark:border-zinc-800/60 pb-2.5 last:border-0">
              <div className="flex items-center gap-2.5">
                <Skeleton rounded="md" className="h-4 w-4 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton tone="subtle" className="h-2.5 w-20" />
                </div>
              </div>
              <SkeletonBadge width="w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) return <div className="animate-in fade-in duration-200">{inner}</div>;

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <Skeleton rounded="lg" tone="subtle" className="mb-6 h-5 w-24" />
        {inner}
      </div>
    </div>
  );
}

// ============================================================================
// EXAM HISTORY VIEW SKELETON (Matches Unified Telemetry Strip + Dossier Grid)
// ============================================================================

export function ExamHistorySkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Top Bar Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton tone="subtle" className="h-3 w-32" />
            <Skeleton rounded="lg" className="h-7 sm:h-9 w-48 sm:w-64" />
          </div>

          {/* Search, Grouping, Filter & View Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Skeleton rounded="lg" className="h-8 w-44 sm:w-48" />
            <Skeleton rounded="lg" className="h-8 w-28" />
            <Skeleton rounded="lg" className="h-8 w-16" />
            <div className="flex items-center p-0.5 rounded-lg border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/80 gap-1">
              <Skeleton rounded="md" tone="accent" className="h-7 w-7" />
              <Skeleton rounded="md" tone="subtle" className="h-7 w-7" />
            </div>
          </div>
        </div>
      </div>

      {/* Unified Horizontal Performance Telemetry Strip */}
      <div className="rounded-xl border border-border dark:border-zinc-800 bg-card/70 dark:bg-zinc-900/50 p-2 sm:p-2.5">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 dark:divide-zinc-800/80">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-1.5 sm:py-0">
              <Skeleton rounded="lg" tone="accent" className="h-8 w-8 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                {i === 2 ? (
                  <>
                    <div className="flex items-center justify-between gap-1">
                      <Skeleton tone="subtle" className="h-2.5 w-16" />
                      <Skeleton tone="accent" className="h-3 w-8" />
                    </div>
                    <Skeleton rounded="full" className="h-1.5 w-full" />
                  </>
                ) : (
                  <>
                    <Skeleton tone="subtle" className="h-2.5 w-20" />
                    <Skeleton className="h-5 w-12" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex p-1 bg-muted/60 dark:bg-zinc-900/80 rounded-xl border border-border dark:border-zinc-800 gap-1 overflow-x-auto no-scrollbar">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} rounded="lg" tone={i === 0 ? "accent" : "subtle"} className="h-8 flex-1 min-w-[72px]" />
        ))}
      </div>

      {/* PC File Explorer Icon Grid Skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-2 gap-y-4 sm:gap-x-3 sm:gap-y-5 p-1 sm:p-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-2 sm:p-2.5 space-y-1.5"
          >
            <Skeleton rounded="xl" className="h-[68px] w-14 sm:h-[76px] sm:w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton tone="accent" className="h-2.5 w-12" />
            <Skeleton tone="subtle" className="h-2.5 w-16" />
            <Skeleton tone="subtle" className="h-2 w-12" />
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
    <div className="flex w-full h-[calc(100dvh-3.5rem-4rem-max(0.25rem,env(safe-area-inset-bottom,0px)))] sm:h-[calc(100dvh-4rem-4rem-max(0.25rem,env(safe-area-inset-bottom,0px)))] lg:h-[calc(100dvh-4rem)] overflow-hidden animate-in fade-in duration-200">
      {/* Left Sidebar */}
      <div className="w-full sm:w-96 md:w-[400px] border-r border-border dark:border-zinc-800 flex flex-col bg-background h-full shrink-0">
        {/* Tab Switcher & Visibility */}
        <div className="px-3 py-2 border-b border-border dark:border-zinc-800 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-1">
              <Skeleton rounded="lg" className="h-7 w-7 shrink-0" />
              <div className="flex gap-1 bg-card dark:bg-zinc-900/80 rounded-xl p-1 border border-border/60 dark:border-zinc-800/60 flex-1">
                <Skeleton rounded="lg" className="h-7 flex-1" />
                <Skeleton rounded="lg" tone="subtle" className="h-7 flex-1" />
              </div>
            </div>
            <Skeleton rounded="lg" className="h-7 w-7 shrink-0" />
          </div>

          {/* Search Input */}
          <Skeleton rounded="lg" className="h-9 w-full" />
        </div>

        {/* Classmates Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/50 dark:divide-zinc-800/50">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <SkeletonAvatar size="md" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton tone="subtle" className="h-2.5 w-16" />
              </div>
              <Skeleton rounded="lg" tone="subtle" className="h-7 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Chat & Preview Area */}
      <div className="hidden sm:flex flex-1 flex-col h-full bg-background/60 dark:bg-zinc-950/30">
        <div className="border-b border-border dark:border-zinc-800 px-4 py-3 flex items-center justify-between bg-card dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <SkeletonAvatar size="sm" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton tone="subtle" className="h-2.5 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton rounded="lg" className="h-8 w-8" />
            <SkeletonButton size="sm" className="w-24" />
          </div>
        </div>

        <div className="flex-1 p-5 overflow-hidden">
          <ChatMessageBubblesSkeleton count={5} />
        </div>

        <div className="border-t border-border dark:border-zinc-800 p-3 flex items-center gap-2 bg-card dark:bg-zinc-900/50">
          <Skeleton rounded="xl" className="h-10 flex-1" />
          <Skeleton rounded="xl" tone="accent" className="h-10 w-10 shrink-0" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GROUP EXAM VIEW SKELETON (Matches max-w-6xl Header + Sections + Challenge Cards)
// ============================================================================

export function GroupExamViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton rounded="lg" tone="subtle" className="h-5 w-24" />
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton rounded="lg" className="h-7 sm:h-8 w-48 sm:w-60" />
            <Skeleton tone="subtle" className="h-3.5 w-64 sm:w-80 max-w-full" />
          </div>
          <SkeletonButton size="md" tone="accent" className="w-36 shrink-0" />
        </div>
        <div className="space-y-3">
          <Skeleton tone="subtle" className="h-4 w-40" />
          {[0, 1, 2].map((i) => (
            <ChallengeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GROUP EXAM RESULTS SKELETON (Matches Podium + Toggle + Leaderboard + Question Review)
// ============================================================================

export function GroupExamResultsSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Skeleton rounded="lg" className="h-9 w-9 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-6 w-52" />
            <Skeleton tone="subtle" className="h-3 w-36" />
          </div>
        </div>

        {/* Winner Banner + Top-3 Podium Skeleton */}
        <div className="rounded-2xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 sm:p-6 space-y-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <SkeletonBadge tone="accent" width="w-28" height="h-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 max-w-lg mx-auto pt-2">
            <div className="flex flex-col items-center gap-2">
              <SkeletonAvatar size="md" />
              <Skeleton className="h-3 w-16" />
              <Skeleton rounded="xl" className="h-16 w-full" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <SkeletonAvatar size="lg" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton rounded="xl" tone="accent" className="h-24 w-full" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <SkeletonAvatar size="md" />
              <Skeleton className="h-3 w-16" />
              <Skeleton rounded="xl" tone="subtle" className="h-12 w-full" />
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <Skeleton rounded="lg" className="h-9 w-56" />

        {/* Ranked Leaderboard Table */}
        <div className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border dark:border-zinc-800 bg-muted/40 dark:bg-zinc-900/80">
            <Skeleton className="h-4 w-28" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/40 dark:border-zinc-800/40 last:border-0"
            >
              <SkeletonAvatar size="xs" />
              <SkeletonAvatar size="xs" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton tone="subtle" className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>

        {/* Question Review Cards */}
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 space-y-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-2">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} rounded="lg" tone="subtle" className="h-10 w-full" />
              ))}
            </div>
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
    <div className="rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-3 sm:p-4 mb-3 space-y-3">
      <div className="flex items-center gap-2.5">
        <Skeleton rounded="lg" className="h-8 w-8 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton tone="subtle" className="h-3 w-24" />
        </div>
        <SkeletonBadge width="w-16" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <SkeletonAvatar key={i} size="xs" />
        ))}
      </div>
      <div className="flex gap-2">
        <SkeletonButton size="sm" tone="accent" className="w-24" />
        <SkeletonButton size="sm" className="w-20" />
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
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-2 sm:p-3 text-center"
          >
            <Skeleton rounded="lg" className="h-7 w-7 sm:h-9 sm:w-9" />
            <Skeleton className="h-4 sm:h-6 w-12 sm:w-16" />
            <Skeleton tone="subtle" className="h-2.5 sm:h-3 w-16 sm:w-20" />
          </div>
        ))}
      </div>
      <div className="mb-4 sm:mb-6 rounded-xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 sm:h-4 w-24" />
          <Skeleton className="h-3 sm:h-4 w-10" />
        </div>
        <Skeleton rounded="full" className="h-2 w-full" />
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
      <div className="flex w-full items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-border dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-3 sm:p-5">
        <Skeleton rounded="xl" className="h-10 w-10 sm:h-14 sm:w-14 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton tone="subtle" className="h-2.5 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton tone="subtle" className="h-3 w-56 max-w-full" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SERVICES VIEW SKELETON (Matches max-w-5xl + Ongoing Banner + 2-Column Service Cards)
// ============================================================================

export function ServicesViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-32 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-2.5">
          <SkeletonNavBar />
          <div className="space-y-1.5">
            <Skeleton tone="subtle" className="h-3 w-36" />
            <Skeleton rounded="lg" className="h-7 sm:h-9 w-36 sm:w-48" />
            <Skeleton tone="subtle" className="h-3.5 sm:h-4 w-72 sm:w-96 max-w-full" />
          </div>
        </div>

        {/* Ongoing Active Exam Banner Placeholder */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/15 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton rounded="lg" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40" />
                <SkeletonBadge width="w-16" height="h-4" />
              </div>
              <Skeleton tone="subtle" className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>

        {/* 2-Column Service Cards Grid matching Live ServicesView */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/90 dark:border-zinc-800/90 bg-card dark:bg-zinc-900/50 p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <Skeleton rounded="xl" className="h-10 w-10 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-40" />
                    {i === 0 && <SkeletonBadge width="w-16" height="h-4" />}
                  </div>
                  <SkeletonText lines={2} lineHeight="sm" />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <SkeletonButton size="md" tone="accent" className="w-full sm:w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LIVE EXAM VIEW SKELETON
// ============================================================================

export function LiveExamViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-2xl px-2.5 sm:px-4 py-4 sm:py-6 space-y-4">
        <Skeleton rounded="lg" tone="subtle" className="h-5 w-24" />
        <div className="w-full rounded-2xl border border-border/80 dark:border-zinc-800 bg-card/80 dark:bg-zinc-900/60 p-4 sm:p-6 space-y-5">
          <div className="flex items-start gap-3 border-b border-border/60 dark:border-zinc-800 pb-4">
            <Skeleton rounded="xl" tone="accent" className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 sm:h-6 w-56 max-w-full" />
              <Skeleton tone="subtle" className="h-3.5 w-full max-w-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 dark:bg-zinc-900 border border-border/60 dark:border-zinc-800">
            <Skeleton rounded="lg" className="h-9" />
            <Skeleton rounded="lg" tone="subtle" className="h-9" />
          </div>
          <div className="space-y-3">
            <Skeleton rounded="xl" className="h-11 w-full" />
            <SkeletonButton size="lg" fullWidth tone="accent" className="h-11" />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {[0, 1, 2].map((i) => (
              <SkeletonBadge key={i} width="w-24" height="h-6" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REPORT COMMENTS THREAD SKELETON (Matches left/right comment bubbles)
// ============================================================================

export function ReportCommentsSkeleton() {
  return (
    <div className="space-y-3 py-2 animate-in fade-in duration-200">
      {[
        { isOwn: false, width: "w-56 sm:w-72" },
        { isOwn: true, width: "w-48 sm:w-64" },
        { isOwn: false, width: "w-64 sm:w-80" },
      ].map((item, idx) => (
        <div key={idx} className={`flex flex-col ${item.isOwn ? "items-end" : "items-start"}`}>
          <div
            className={`${item.width} max-w-[80%] rounded-2xl px-4 py-3 space-y-2 ${
              item.isOwn
                ? "bg-primary/15 border border-primary/20"
                : "bg-muted/70 dark:bg-zinc-800/70"
            }`}
          >
            <Skeleton tone={item.isOwn ? "accent" : "default"} className="h-3.5 w-full" />
            <Skeleton tone="subtle" className="h-3.5 w-3/4" />
            <Skeleton tone="subtle" className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
