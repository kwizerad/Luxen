export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${100 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// HOME VIEW SKELETON
// ============================================================================

export function HomeViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {/* Welcome Banner */}
        <div className="mb-5 sm:mb-6 flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-muted animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-5 sm:h-7 w-32 sm:w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 sm:h-4 w-48 sm:w-72 rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border bg-card p-2 sm:p-3 text-center">
              <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-muted animate-pulse" />
              <div className="h-4 sm:h-6 w-12 sm:w-16 rounded bg-muted animate-pulse" />
              <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>

        {/* Progress Bar Card */}
        <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 sm:h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 sm:h-4 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-muted animate-pulse" />
        </div>

        {/* Continue Learning Card */}
        <div className="mb-4 sm:mb-6">
          <div className="flex w-full items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5">
            <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-lg sm:rounded-xl bg-muted animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2.5 sm:h-3 w-24 rounded bg-muted animate-pulse" />
              <div className="h-4 sm:h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-3 sm:h-4 w-56 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5">
              <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3.5 sm:h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-2.5 sm:h-3 w-full rounded bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
          <div className="h-6 w-48 sm:w-64 rounded bg-muted animate-pulse" />
        </div>

        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-muted animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* Module Cards */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[14px] sm:rounded-[24px] border bg-card shadow-sm p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-[10px] bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-8 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-1.5 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
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
    <div className="bg-transparent flex justify-center">
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <div className="flex items-center gap-2 rounded-full border p-2">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <main className="student-page-narrow student-page-no-nav w-full">
        {/* Header */}
        <div className="student-page-header space-y-2">
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>

        {/* Card with sections */}
        <div className="rounded-[14px] sm:rounded-[24px] border bg-card p-3 sm:p-4 lg:p-6 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-b last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              </div>
              {i === 0 && (
                <div className="px-3 pb-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="h-10 w-full rounded border bg-muted/50 animate-pulse" />
                  <div className="h-10 w-full rounded border bg-muted/50 animate-pulse" />
                  <div className="h-9 w-24 rounded bg-muted animate-pulse" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// EXAM CATEGORY SKELETON
// ============================================================================

export function ExamCategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[14px] sm:rounded-[24px] border bg-card overflow-hidden">
          <div className="p-3 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-5 sm:h-6 w-32 sm:w-40 rounded bg-muted animate-pulse" />
            <div className="h-3 sm:h-4 w-full rounded bg-muted animate-pulse" />
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-10 rounded bg-muted animate-pulse" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-full rounded bg-muted animate-pulse mt-2" />
          </div>
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
    <div className="min-h-screen bg-transparent">
      {/* Content area */}
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-56 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-xl border bg-card p-3 flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-24 rounded-xl border bg-card p-4 space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-4 w-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-2 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-2xl border bg-card p-5 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Dock nav placeholder */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pb-2">
        <div className="flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-lg">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
