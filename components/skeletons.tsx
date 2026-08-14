import { LoadingLogo } from "@/components/loading-logo";

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
        {/* Small devices: rounded corners logo; Larger: spinner */}
        <div className="md:hidden">
          <LoadingLogo size="md" />
        </div>
        <div className="hidden md:block relative h-10 w-10">
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
          <div className="md:hidden"><LoadingLogo size="md" /></div>
          <div className="hidden md:block h-14 w-14 shrink-0 rounded-xl bg-muted animate-pulse" />
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
          <LoadingLogo size="sm" />
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
          <div className="md:hidden"><LoadingLogo size="md" /></div>
          <div className="hidden md:block h-12 w-12 rounded-xl bg-muted animate-pulse" />
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

// ============================================================================
// DRIVERS LIST VIEW SKELETON
// ============================================================================

export function DriversListViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="mb-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-2" />
          <div className="h-4 w-72 rounded bg-muted animate-pulse" />
        </div>
        <div className="mb-6 flex gap-3">
          <div className="h-11 flex-1 rounded-xl bg-muted animate-pulse" />
          <div className="h-11 w-32 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="mb-6 rounded-2xl border bg-card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-40 rounded bg-muted animate-pulse" />
              <div className="h-4 w-56 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-40 rounded bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <div className="mb-6 rounded-2xl border bg-card p-6">
          <div className="h-6 w-32 rounded bg-muted animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-12 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="h-6 w-24 rounded bg-muted animate-pulse mb-4" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-b pb-3 mb-3 last:border-0">
              <div className="flex gap-2 mb-2">
                <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <div className="h-8 w-40 rounded bg-muted animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-4">
              <div className="mx-auto mb-2 h-6 w-6 rounded bg-muted animate-pulse" />
              <div className="mx-auto h-8 w-16 rounded bg-muted animate-pulse" />
              <div className="mx-auto mt-1 h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-28 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-36 rounded bg-muted animate-pulse" />
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
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-muted animate-pulse" />
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
        <div className="h-5 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="h-12 w-48 rounded-2xl bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="border-t px-4 py-3 flex items-center gap-2">
        <div className="h-11 flex-1 rounded-xl bg-muted animate-pulse" />
        <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// CHAT LIST VIEW SKELETON
// ============================================================================

export function ChatListViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-40 rounded bg-muted animate-pulse" />
          <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <div key={i}>
              <div className="h-5 w-32 rounded bg-muted animate-pulse mb-3" />
              {[0, 1].map((j) => (
                <div key={j} className="rounded-2xl border bg-card p-4 mb-2">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-5 w-32 rounded bg-muted animate-pulse" />
        <div className="mb-6">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="mb-6 flex gap-2 rounded-xl border p-1">
          <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
          <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-4">
              <div className="mx-auto h-8 w-16 rounded bg-muted animate-pulse" />
              <div className="mx-auto mt-1 h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-1 py-2">
            <div className="mr-2 h-8 w-8 rounded-lg bg-muted animate-pulse" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <div className="mb-6 flex gap-3">
          <div className="h-11 flex-1 rounded-xl bg-muted animate-pulse" />
          <div className="h-11 w-32 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
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
// EXAM HISTORY VIEW SKELETON
// ============================================================================

export function ExamHistorySkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-8 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLASSMATES VIEW SKELETON
// ============================================================================

export function ClassmatesViewSkeleton() {
  return (
    <div className="flex h-[calc(100vh-80px)]">
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <div className="h-8 w-20 rounded-md bg-muted-foreground/20 animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-muted-foreground/20 animate-pulse" />
          </div>
          <div className="h-9 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden sm:flex flex-1 items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// ============================================================================
// GROUP EXAM VIEW SKELETON
// ============================================================================

export function GroupExamViewSkeleton() {
  return (
    <div className="min-h-[calc(100vh-80px)] pb-20">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="h-4 w-24 rounded bg-muted animate-pulse mb-6" />
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 w-64 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border-2 border-primary/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-7 w-7 rounded-full bg-muted animate-pulse" />
                ))}
              </div>
              <div className="h-8 w-full rounded-lg bg-muted animate-pulse" />
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
    <div className="min-h-[calc(100vh-80px)] pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="h-9 rounded-lg bg-muted animate-pulse mb-4 w-48" />
        <div className="rounded-xl border bg-card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-muted/50">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-10 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4 mb-3">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse mb-3" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-muted animate-pulse mb-2" />
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
    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-3 sm:p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 w-7 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
        <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
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
          <div key={i} className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border bg-card p-2 sm:p-3 text-center">
            <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 sm:h-6 w-12 sm:w-16 rounded bg-muted animate-pulse" />
            <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 sm:h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 sm:h-4 w-10 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-2 rounded-full bg-muted animate-pulse" />
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
      <div className="group flex w-full items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5">
        <div className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 rounded-lg sm:rounded-xl bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-56 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
