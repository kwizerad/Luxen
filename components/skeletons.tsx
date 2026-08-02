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
