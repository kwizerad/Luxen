"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { SmartImage } from "@/components/smart-image";
import { cn } from "@/lib/utils";

interface CourseImageStageProps {
  images: string[];
  title: string;
}

/**
 * Exam-style bounded LEFT visual frame for course road signs & lesson diagrams.
 * Uses pure flexbox + margin spacing + bounded heights for Android 5+ compatibility.
 */
export function CourseImageStage({ images, title }: CourseImageStageProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Reset image index when switching lessons/topics
  const imageKey = images.join("|");
  useEffect(() => {
    setActiveIdx(0);
    setIsZoomOpen(false);
  }, [imageKey]);

  // Escape closes lightbox
  useEffect(() => {
    if (!isZoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false);
      else if (e.key === "ArrowLeft" && images.length > 1) {
        setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        setActiveIdx((prev) => (prev + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isZoomOpen, images.length]);

  if (!images || images.length === 0) return null;

  const safeIdx = Math.min(activeIdx, images.length - 1);
  const activeSrc = images[safeIdx];

  return (
    <>
      <div className="w-full rounded-xl border border-border/70 bg-muted/20 dark:bg-zinc-900/70 p-2.5 sm:p-3.5 relative">
        {/* Main Bounded Image Frame (matches exam visual proportions) */}
        <div
          onClick={() => setIsZoomOpen(true)}
          className="relative w-full h-[200px] sm:h-[260px] md:h-[310px] lg:h-[350px] flex items-center justify-center rounded-lg bg-white/95 dark:bg-zinc-950/70 border border-border/40 overflow-hidden cursor-zoom-in p-2"
        >
          <SmartImage
            src={activeSrc}
            alt={title}
            priority
            className="w-full h-full object-contain"
          />

          {/* Zoom trigger icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomOpen(true);
            }}
            aria-label="Enlarge diagram"
            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-background/90 dark:bg-zinc-900/90 border border-border/70 text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Multi-image switcher strip if lesson/topic has more than 1 visual */}
        {images.length > 1 && (
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev - 1 + images.length) % images.length)}
              className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer shrink-0"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center overflow-x-auto no-scrollbar px-2">
              {images.map((src, idx) => (
                <button
                  key={`${src}-${idx}`}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "w-10 h-10 rounded-lg border p-0.5 mx-1 overflow-hidden bg-white dark:bg-zinc-950 shrink-0 cursor-pointer transition-colors",
                    idx === safeIdx
                      ? "border-primary ring-1 ring-primary"
                      : "border-border/60 opacity-70 hover:opacity-100"
                  )}
                >
                  <SmartImage
                    src={src}
                    alt={`${title} ${idx + 1}`}
                    width={96}
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveIdx((prev) => (prev + 1) % images.length)}
              className="p-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted text-foreground cursor-pointer shrink-0"
              aria-label="Next image"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Crisp Lightbox Modal */}
      {isZoomOpen && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            aria-label="Close zoomed image"
            className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-xl bg-zinc-900 text-white border border-white/20 hover:bg-zinc-800 cursor-pointer z-10"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
                }}
                aria-label="Previous zoomed image"
                className="absolute left-3 sm:left-5 p-2 rounded-xl bg-zinc-900 text-white border border-white/20 hover:bg-zinc-800 cursor-pointer z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx((prev) => (prev + 1) % images.length);
                }}
                aria-label="Next zoomed image"
                className="absolute right-3 sm:right-5 p-2 rounded-xl bg-zinc-900 text-white border border-white/20 hover:bg-zinc-800 cursor-pointer z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 rounded-2xl p-3 sm:p-5 border border-white/15"
          >
            <SmartImage
              src={activeSrc}
              alt={title}
              unoptimized
              priority
              className="w-full h-[65vh] max-h-[600px] object-contain"
            />
            {images.length > 1 && (
              <div className="mt-2 text-xs font-mono text-muted-foreground tabular-nums">
                {safeIdx + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
