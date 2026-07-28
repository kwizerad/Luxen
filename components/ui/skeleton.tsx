import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "admin";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        variant === "admin" ? "admin-skeleton" : "skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  variant?: "default" | "admin";
}

export function SkeletonText({
  lines = 1,
  className,
  variant = "default",
  ...props
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant={variant} className="h-4 w-full rounded-md" />
      ))}
    </div>
  );
}

interface SkeletonCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  variant?: "default" | "admin";
}

export function SkeletonCircle({
  size = 40,
  className,
  variant = "default",
  ...props
}: SkeletonCircleProps) {
  return (
    <Skeleton
      variant={variant}
      className={cn("rounded-full", className)}
      style={{ width: size, height: size, ...props.style }}
      {...props}
    />
  );
}
