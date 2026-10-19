import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface CourseSidebarProps {
  modules: any[]; // Replace with proper type
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
  className?: string;
}

export function CourseSidebar({ modules, selectedModuleId, onSelectModule, className }: CourseSidebarProps) {
  return (
    <aside className={cn("w-64 border-r border-slate-200 p-4 bg-slate-50", className)}>
      <h2 className="text-sm font-semibold text-slate-500 mb-4 px-2">Modules</h2>
      <div className="space-y-1">
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onSelectModule(mod.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedModuleId === mod.id
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {mod.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
