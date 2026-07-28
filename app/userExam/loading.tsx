import { TableSkeleton } from "@/components/skeletons";

export default function UserExamsLoading() {
  return (
    <main className="student-page">
      <div className="student-page-header">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-8 w-48 rounded-lg" />
          <div className="skeleton-shimmer h-4 w-64 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-24 rounded-[12px] sm:rounded-[24px]" />
        ))}
      </div>
      <TableSkeleton rows={5} columns={4} hasSearch={false} hasFilters={false} />
    </main>
  );
}
