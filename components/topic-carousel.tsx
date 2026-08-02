"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { LessonContentView } from "@/app/dashboard/course/LessonContentView";

export interface CarouselTopic {
  id: string;
  title: string;
  content: string;
  estimated_minutes?: number;
  flatIndex: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
}

interface TopicCarouselProps {
  topics: CarouselTopic[];
  currentIndex: number;
  onSelectTopic: (flatIndex: number) => void;
  formatMinutes: (mins: number) => string;
  noContentText: string;
  lessonTitle: string;
}

export function TopicCarousel({
  topics,
  currentIndex,
  onSelectTopic,
  formatMinutes,
  noContentText,
  lessonTitle,
}: TopicCarouselProps) {
  const currentTopic = topics[currentIndex];
  const canGoPrev = currentIndex > 0 && topics[currentIndex - 1]?.isUnlocked;
  const canGoNext = currentIndex < topics.length - 1 && topics[currentIndex + 1]?.isUnlocked;

  const goToPrev = () => {
    if (canGoPrev) {
      onSelectTopic(topics[currentIndex - 1].flatIndex);
    }
  };

  const goToNext = () => {
    if (canGoNext) {
      onSelectTopic(topics[currentIndex + 1].flatIndex);
    }
  };

  if (!currentTopic) return null;

  return (
    <div className="rounded-[14px] sm:rounded-[24px] border bg-card shadow-sm overflow-hidden">
      {/* Carousel header with topic navigation */}
      <div className="border-b bg-muted/30 px-5 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
              {lessonTitle}
            </span>
            <span className="text-xs text-muted-foreground/50">·</span>
            <span className="text-xs font-semibold flex-shrink-0">
              {currentIndex + 1} / {topics.length}
            </span>
          </div>

          {/* Arrow controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={goToPrev}
              disabled={!canGoPrev}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full transition-all",
                canGoPrev
                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
                  : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={!canGoNext}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full transition-all",
                canGoNext
                  ? "bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
                  : "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {topics.map((topic, idx) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => topic.isUnlocked && onSelectTopic(topic.flatIndex)}
              disabled={!topic.isUnlocked}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentIndex
                  ? "bg-green-500 w-8"
                  : topic.isCompleted
                    ? "bg-green-500 w-3 hover:w-4"
                    : topic.isUnlocked
                      ? "bg-muted-foreground/40 w-3 hover:w-4"
                      : "bg-muted-foreground/20 w-3 cursor-not-allowed"
              )}
              title={topic.title}
            />
          ))}
        </div>
      </div>

      {/* Carousel slides */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTopic.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="p-5 sm:p-8 space-y-4"
          >
            {/* Topic title and meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {currentTopic.estimated_minutes && currentTopic.estimated_minutes > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatMinutes(currentTopic.estimated_minutes)}
                  </span>
                )}
                {currentTopic.isCompleted && (
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {currentTopic.title}
              </h2>
            </div>

            {/* Topic content */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {currentTopic.content ? (
                <LessonContentView content={currentTopic.content} />
              ) : (
                <p className="text-muted-foreground italic">{noContentText}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom topic strip - clickable thumbnails */}
      <div className="border-t bg-muted/20 px-5 sm:px-8 py-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {topics.map((topic, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => topic.isUnlocked && onSelectTopic(topic.flatIndex)}
                disabled={!topic.isUnlocked}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs whitespace-nowrap transition-all flex-shrink-0",
                  isActive
                    ? "bg-green-500 text-white font-medium"
                    : topic.isCompleted
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                      : topic.isUnlocked
                        ? "bg-muted hover:bg-muted/80 text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {topic.isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                ) : isActive ? (
                  <Circle className="h-3 w-3 flex-shrink-0 fill-primary-foreground/30" />
                ) : topic.isUnlocked ? (
                  <Circle className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <Lock className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="truncate max-w-[120px]">{topic.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
