import * as React from "react";
import { cn } from "@/lib/utils";

export type SkeletonTone = "default" | "subtle" | "strong" | "accent";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: SkeletonTone;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const TONE_CLASSES: Record<SkeletonTone, string> = {
  default: "skeleton-shimmer",
  subtle: "skeleton-shimmer opacity-70",
  strong: "skeleton-shimmer brightness-[0.96] dark:brightness-110",
  accent: "skeleton-shimmer bg-primary/15 dark:bg-primary/20",
};

const RADIUS_CLASSES: Record<NonNullable<SkeletonProps["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export function Skeleton({
  className,
  tone = "default",
  rounded = "md",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(TONE_CLASSES[tone], RADIUS_CLASSES[rounded], className)}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineHeight?: "xs" | "sm" | "md" | "lg";
  lastLineWidth?: string;
  gap?: "tight" | "normal" | "relaxed";
}

const TEXT_HEIGHT: Record<NonNullable<SkeletonTextProps["lineHeight"]>, string> = {
  xs: "h-2.5",
  sm: "h-3",
  md: "h-3.5",
  lg: "h-4",
};

const TEXT_GAP: Record<NonNullable<SkeletonTextProps["gap"]>, string> = {
  tight: "space-y-1.5",
  normal: "space-y-2",
  relaxed: "space-y-2.5",
};

export function SkeletonText({
  lines = 2,
  lineHeight = "md",
  lastLineWidth = "w-3/4",
  gap = "tight",
  className,
  ...props
}: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={cn(TEXT_GAP[gap], className)} {...props}>
      {Array.from({ length: lines }).map((_, idx) => {
        const isLast = idx === lines - 1 && lines > 1;
        return (
          <Skeleton
            key={idx}
            tone={idx === 0 ? "default" : "subtle"}
            className={cn(TEXT_HEIGHT[lineHeight], isLast ? lastLineWidth : "w-full")}
          />
        );
      })}
    </div>
  );
}

export interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
}

const AVATAR_SIZES: Record<NonNullable<SkeletonAvatarProps["size"]>, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-10 w-10 sm:h-11 sm:w-11",
  lg: "h-12 w-12",
  xl: "h-14 w-14 sm:h-16 sm:w-16",
};

export function SkeletonAvatar({
  size = "md",
  shape = "circle",
  className,
  ...props
}: SkeletonAvatarProps) {
  return (
    <Skeleton
      rounded={shape === "circle" ? "full" : "2xl"}
      className={cn("shrink-0", AVATAR_SIZES[size], className)}
      {...props}
    />
  );
}

export interface SkeletonBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  tone?: SkeletonTone;
}

export function SkeletonBadge({
  width = "w-20",
  height = "h-5",
  tone = "subtle",
  className,
  ...props
}: SkeletonBadgeProps) {
  return (
    <Skeleton
      rounded="full"
      tone={tone}
      className={cn("shrink-0", height, width, className)}
      {...props}
    />
  );
}

export interface SkeletonButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  tone?: SkeletonTone;
}

const BUTTON_SIZES: Record<NonNullable<SkeletonButtonProps["size"]>, string> = {
  sm: "h-8 w-24",
  md: "h-9 w-32",
  lg: "h-11 w-40",
};

export function SkeletonButton({
  size = "md",
  fullWidth = false,
  tone = "default",
  className,
  ...props
}: SkeletonButtonProps) {
  return (
    <Skeleton
      rounded="xl"
      tone={tone}
      className={cn(BUTTON_SIZES[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}

export interface SkeletonStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  withProgress?: boolean;
}

export function SkeletonStatCard({
  withProgress = false,
  className,
  ...props
}: SkeletonStatCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl border border-border/80 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-3 flex items-center gap-3",
        className
      )}
      {...props}
    >
      <Skeleton rounded="lg" className="h-9 w-9 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-16" />
        {withProgress ? (
          <Skeleton rounded="full" tone="subtle" className="h-1.5 w-full" />
        ) : (
          <Skeleton tone="subtle" className="h-2.5 w-20" />
        )}
      </div>
    </div>
  );
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  withHeaderBadge?: boolean;
  withFooter?: boolean;
}

export function SkeletonCard({
  lines = 2,
  withHeaderBadge = true,
  withFooter = true,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-2xl border border-border/70 dark:border-zinc-800 bg-card dark:bg-zinc-900/50 p-4 sm:p-5 flex flex-col justify-between space-y-4",
        className
      )}
      {...props}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton rounded="xl" className="h-10 w-10 shrink-0" />
          {withHeaderBadge && <SkeletonBadge width="w-16" />}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 sm:h-5 w-3/4" />
          <SkeletonText lines={lines} lineHeight="sm" />
        </div>
      </div>
      {withFooter && (
        <div className="pt-3 border-t border-border/60 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <Skeleton tone="subtle" className="h-3 w-20" />
          <SkeletonButton size="sm" className="w-24" />
        </div>
      )}
    </div>
  );
}

export interface SkeletonTableRowProps extends React.HTMLAttributes<HTMLDivElement> {
  hasAvatar?: boolean;
  hasTrailingBadge?: boolean;
  hasAction?: boolean;
}

export function SkeletonTableRow({
  hasAvatar = true,
  hasTrailingBadge = true,
  hasAction = false,
  className,
  ...props
}: SkeletonTableRowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("px-3.5 py-3 flex items-center justify-between gap-3", className)}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {hasAvatar && <SkeletonAvatar size="md" />}
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36 sm:w-48 max-w-full" />
          <Skeleton tone="subtle" className="h-2.5 w-24 sm:w-36 max-w-full" />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasTrailingBadge && <SkeletonBadge width="w-14" height="h-5" />}
        {hasAction && <Skeleton rounded="lg" tone="subtle" className="h-7 w-7" />}
      </div>
    </div>
  );
}

export function SkeletonProfileHeader({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 dark:border-zinc-800 bg-card p-5 sm:p-6 shadow-xs",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
          <SkeletonAvatar size="xl" shape="square" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBadge tone="accent" width="w-24" />
              <SkeletonBadge width="w-28" />
            </div>
            <Skeleton className="h-6 sm:h-7 w-44 sm:w-60" />
            <Skeleton tone="subtle" className="h-3.5 w-48 sm:w-72" />
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <SkeletonButton size="md" tone="accent" className="h-10 w-32" />
          <SkeletonButton size="md" className="h-10 w-36" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonNavBar({
  withRightTelemetry = true,
  className,
}: {
  withRightTelemetry?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex items-center justify-between gap-3", className)}>
      <Skeleton rounded="lg" className="h-8 w-20" />
      {withRightTelemetry && <Skeleton tone="subtle" className="h-3.5 w-44 hidden sm:block" />}
    </div>
  );
}
