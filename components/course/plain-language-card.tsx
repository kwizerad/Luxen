"use client";

import React from "react";
import { Lightbulb, CheckCircle2, Car, Award, X, Sparkles, AlertCircle } from "lucide-react";

export interface PlainLanguageData {
  summary: string;
  plainPoints: string[];
  practicalExample: string;
  examTip: string;
}

interface PlainLanguageCardProps {
  data: PlainLanguageData;
  language: string;
  onClose: () => void;
}

export function PlainLanguageCard({ data, language, onClose }: PlainLanguageCardProps) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between border-b border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Plain Terms &amp; Real-World Road Rules</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                Simplified
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Official Rwanda road code translated into practical driver actions.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          title="Close explanation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Core takeaway */}
      <div className="p-3.5 rounded-xl bg-background/80 border border-primary/20 text-xs sm:text-sm font-semibold text-foreground leading-relaxed flex items-start gap-2.5">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>{data.summary}</span>
      </div>

      {/* Key driver bullet points */}
      {data.plainPoints && data.plainPoints.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-foreground">What you must do as a driver:</div>
          <div className="grid grid-cols-1 gap-2">
            {data.plainPoints.map((pt, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">{pt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-world Rwanda driving example */}
      {data.practicalExample && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Car className="h-3.5 w-3.5" />
            <span>Rwanda Real-World Scenario:</span>
          </div>
          <p className="text-foreground leading-relaxed pl-5">{data.practicalExample}</p>
        </div>
      )}

      {/* Police exam tip */}
      {data.examTip && (
        <div className="p-3 rounded-xl bg-primary/15 border border-primary/30 text-xs space-y-1 text-foreground">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Award className="h-3.5 w-3.5 text-primary" />
            <span>Police Exam Tip:</span>
          </div>
          <p className="leading-relaxed pl-5">{data.examTip}</p>
        </div>
      )}
    </div>
  );
}
