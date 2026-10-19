import React from "react";
import { cn } from "@/lib/utils";

interface StudyInterfaceProps {
  children: React.ReactNode;
  className?: string;
}

export function StudyInterface({ children, className }: StudyInterfaceProps) {
  return (
    <div className={cn("flex-1 p-8 bg-white", className)}>
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}
