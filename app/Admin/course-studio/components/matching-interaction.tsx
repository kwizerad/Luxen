"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { MatchingPair } from "@/lib/courses-store";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

interface MatchingInteractionProps {
  pairs: MatchingPair[];
  checked: boolean;
  onPairsChange?: (pairs: Record<string, string>) => void;
  readOnly?: boolean;
}

export function MatchingInteraction({
  pairs: dataPairs,
  checked,
  onPairsChange,
  readOnly = false,
}: MatchingInteractionProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const leftIds = dataPairs.map((p) => p.id);
  const rightIds = dataPairs.map((p) => `right-${p.id}`);
  const rightItems = [...dataPairs].map((p) => ({ id: `right-${p.id}`, pairId: p.id, text: p.right, image: p.rightImage }));

  const getCenter = useCallback((el: HTMLDivElement | null) => {
    if (!el || !containerRef.current) return null;
    const elRect = el.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    return {
      x: elRect.left + elRect.width / 2 - containerRect.left,
      y: elRect.top + elRect.height / 2 - containerRect.top,
    };
  }, []);

  const handleLeftClick = (id: string) => {
    if (readOnly) return;
    if (matched[id]) {
      const next = { ...matched };
      delete next[id];
      setMatched(next);
      onPairsChange?.(next);
      return;
    }
    setSelectedLeft(id === selectedLeft ? null : id);
  };

  const handleRightClick = (rightId: string) => {
    if (readOnly) return;
    const pairId = rightId.replace("right-", "");
    const existingLeft = Object.keys(matched).find((k) => matched[k] === rightId);
    if (existingLeft) {
      const next = { ...matched };
      delete next[existingLeft];
      setMatched(next);
      onPairsChange?.(next);
      return;
    }
    if (selectedLeft) {
      const next = { ...matched, [selectedLeft]: rightId };
      setMatched(next);
      onPairsChange?.(next);
      setSelectedLeft(null);
    }
  };

  const handleLeftTouchStart = (e: React.TouchEvent, id: string) => {
    if (readOnly) return;
    if (matched[id]) return;
    setSelectedLeft(id);
    setIsDragging(true);
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setDragPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !selectedLeft) {
      setIsDragging(false);
      return;
    }
    const touch = e.changedTouches[0];
    let hitRight: string | null = null;
    for (const rid of rightIds) {
      const el = rightRefs.current[rid];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        hitRight = rid;
        break;
      }
    }
    if (hitRight) {
      const next = { ...matched, [selectedLeft]: hitRight };
      setMatched(next);
      onPairsChange?.(next);
    }
    setSelectedLeft(null);
    setIsDragging(false);
    setDragPos(null);
  };

  const handleLeftMouseDown = (e: React.MouseEvent, id: string) => {
    if (readOnly) return;
    if (matched[id]) return;
    setSelectedLeft(id);
    setIsDragging(true);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setDragPos({ x: e.clientX, y: e.clientY });
    const onUp = (ev: MouseEvent) => {
      if (selectedLeft && isDragging) {
        let hitRight: string | null = null;
        for (const rid of rightIds) {
          const el = rightRefs.current[rid];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            hitRight = rid;
            break;
          }
        }
        if (hitRight) {
          const next = { ...matched, [selectedLeft]: hitRight };
          setMatched(next);
          onPairsChange?.(next);
        }
      }
      setSelectedLeft(null);
      setIsDragging(false);
      setDragPos(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, selectedLeft, matched, rightIds, onPairsChange]);

  const dragLineStart = selectedLeft ? getCenter(leftRefs.current[selectedLeft]) : null;
  const containerRect = containerRef.current?.getBoundingClientRect();
  const dragLineEnd = dragPos && containerRect
    ? { x: dragPos.x - containerRect.left, y: dragPos.y - containerRect.top }
    : null;

  const isPairCorrect = (leftId: string, rightId: string) => {
    const pair = dataPairs.find((p) => p.id === leftId);
    return pair && `right-${pair.id}` === rightId;
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-6 relative z-10">
        {/* Column A */}
        <div className="space-y-2">
          <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wider font-medium">{t("items") || "Items"}</p>
          {dataPairs.map((pair) => {
            const isMatched = !!matched[pair.id];
            const isSelected = selectedLeft === pair.id;
            const isCorrect = checked && isMatched && isPairCorrect(pair.id, matched[pair.id]);
            const isWrong = checked && isMatched && !isPairCorrect(pair.id, matched[pair.id]);
            return (
              <div
                key={pair.id}
                ref={(el) => { leftRefs.current[pair.id] = el; }}
                onClick={() => handleLeftClick(pair.id)}
                onTouchStart={(e) => handleLeftTouchStart(e, pair.id)}
                onMouseDown={(e) => { e.preventDefault(); handleLeftMouseDown(e, pair.id); }}
                className={cn(
                  "p-3 rounded-lg border text-sm text-[var(--admin-text)] transition-all select-none",
                  readOnly ? "cursor-default" : "cursor-pointer touch-none",
                  isCorrect
                    ? "border-green-500 bg-green-500/10"
                    : isWrong
                    ? "border-red-500 bg-red-500/10"
                    : isMatched
                    ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                    : isSelected
                    ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/15 ring-2 ring-[var(--admin-primary)]/30"
                    : "border-[var(--admin-border)] hover:border-[var(--admin-border-hover)]"
                )}
              >
                {pair.left || "—"}
              </div>
            );
          })}
        </div>

        {/* Column B */}
        <div className="space-y-2">
          <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wider font-medium">{t("matches") || "Matches"}</p>
          {rightItems.map((item) => {
            const matchedLeft = Object.keys(matched).find((k) => matched[k] === item.id);
            const isCorrect = checked && matchedLeft && isPairCorrect(matchedLeft, item.id);
            const isWrong = checked && matchedLeft && !isPairCorrect(matchedLeft, item.id);
            return (
              <div
                key={item.id}
                ref={(el) => { rightRefs.current[item.id] = el; }}
                onClick={() => handleRightClick(item.id)}
                className={cn(
                  "p-3 rounded-lg border text-sm text-[var(--admin-text)] transition-all select-none",
                  readOnly ? "cursor-default" : "cursor-pointer",
                  isCorrect
                    ? "border-green-500 bg-green-500/10"
                    : isWrong
                    ? "border-red-500 bg-red-500/10"
                    : matchedLeft
                    ? "border-[var(--admin-primary)] bg-[var(--admin-primary)]/10"
                    : "border-[var(--admin-border)] hover:border-[var(--admin-border-hover)]"
                )}
              >
                {item.text || "—"}
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG overlay for connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" style={{ overflow: "visible" }}>
        {Object.entries(matched).map(([leftId, rightId]) => {
          const start = getCenter(leftRefs.current[leftId]);
          const end = getCenter(rightRefs.current[rightId]);
          if (!start || !end) return null;
          const isCorrect = isPairCorrect(leftId, rightId);
          const color = checked
            ? isCorrect
              ? "#22c55e"
              : "#ef4444"
            : "var(--admin-primary)";
          return (
            <line
              key={`${leftId}-${rightId}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={checked ? "none" : "4 2"}
            />
          );
        })}
        {/* Drag line (following cursor/touch) */}
        {selectedLeft && dragLineStart && dragLineEnd && (
          <line
            x1={dragLineStart.x}
            y1={dragLineStart.y}
            x2={dragLineEnd.x}
            y2={dragLineEnd.y}
            stroke="var(--admin-primary)"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.6}
          />
        )}
      </svg>
    </div>
  );
}
