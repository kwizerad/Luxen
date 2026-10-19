import React from "react";
import { cn } from "@/lib/utils";

interface CourseTopBarProps {
  title: string;
  className?: string;
}

export function CourseTopBar({ title, className }: CourseTopBarProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 bg-background/80 backdrop-blur-md sticky top-0 z-20",
        className
      )}
    >
      <div className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
        {title}
      </div>
      <div className="flex-1" />
    </header>
  );
}
