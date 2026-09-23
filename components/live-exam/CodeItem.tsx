"use client";

import { Key, Copy, Eye } from "lucide-react";

interface CodeItemProps {
  code: string;
  onView: (code: string) => void;
  onCopy: (code: string) => void;
}

export default function CodeItem({ code, onView, onCopy }: CodeItemProps) {
  return (
    <div
      className="mb-1.5 flex cursor-pointer flex-wrap items-center justify-between gap-2.5 rounded-lg border bg-muted/50 px-3 py-2 transition-all hover:border-primary hover:bg-card"
      onClick={() => onView(code)}
    >
      <button
        type="button"
        className="flex w-full items-center overflow-hidden text-left"
        onClick={(e) => {
          e.stopPropagation();
          onView(code);
        }}
      >
        <Key className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm font-semibold tracking-[0.3px]">
          {code}
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-3 py-1 text-xs font-semibold text-muted-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(code);
          }}
          title="Copy code"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            onView(code);
          }}
          title="View results"
        >
          <Eye className="h-3 w-3" />
          View
        </button>
      </div>
    </div>
  );
}
