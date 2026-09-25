"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, X, Loader2, Volume2, BookOpen } from "lucide-react";

interface TermLookupTooltipProps {
  term: string;
  context?: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TermLookupTooltip({ term, context = "", position, onClose }: TermLookupTooltipProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    term: string;
    definition: string;
    translations: { English?: string; Kinyarwanda?: string; French?: string };
    tip?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchTermDefinition() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/course/explain-term", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term, context }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to define term");
        }
        if (isMounted) {
          setData(json.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to look up term");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTermDefinition();
    return () => {
      isMounted = false;
    };
  }, [term, context]);

  // Adjust position so it doesn't overflow screen
  const left = Math.max(16, Math.min(position.x - 140, window.innerWidth - 300));
  const top = Math.max(10, position.y - 10);

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-72 sm:w-80 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl p-4 text-xs space-y-2.5 animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
          <span className="truncate max-w-[180px]">{term}</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Searching Rwanda Road Code...</span>
        </div>
      ) : error ? (
        <div className="text-rose-500 py-2">{error}</div>
      ) : data ? (
        <div className="space-y-2.5">
          <p className="text-foreground font-medium leading-relaxed">{data.definition}</p>

          {data.translations && (
            <div className="p-2 rounded-xl bg-muted/60 space-y-1 text-[11px]">
              <div className="font-semibold text-muted-foreground mb-1">Translations:</div>
              {data.translations.Kinyarwanda && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">🇷🇼 Kinyarwanda:</span>
                  <span className="font-medium text-foreground">{data.translations.Kinyarwanda}</span>
                </div>
              )}
              {data.translations.English && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">🇬🇧 English:</span>
                  <span className="font-medium text-foreground">{data.translations.English}</span>
                </div>
              )}
              {data.translations.French && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">🇫🇷 Français:</span>
                  <span className="font-medium text-foreground">{data.translations.French}</span>
                </div>
              )}
            </div>
          )}

          {data.tip && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
              <span>{data.tip}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
