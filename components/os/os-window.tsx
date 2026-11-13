"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Compass,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export interface OSWindowProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose?: () => void;
  onMinimize?: () => void;
  children: React.ReactNode;
  toolbarRight?: React.ReactNode;
  className?: string;
}

export function OSWindow({
  title,
  subtitle,
  icon: Icon = Compass,
  onClose,
  onMinimize,
  children,
  toolbarRight,
  className = "",
}: OSWindowProps) {
  const { isRTL } = useLanguage();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);

  const checkExamState = useCallback(() => {
    if (typeof window === "undefined") return;
    const active = sessionStorage.getItem("exam-active") === "true";
    setIsExamActive(active);
  }, []);

  useEffect(() => {
    checkExamState();
    window.addEventListener("exam-state-change", checkExamState);
    window.addEventListener("storage", checkExamState);
    return () => {
      window.removeEventListener("exam-state-change", checkExamState);
      window.removeEventListener("storage", checkExamState);
    };
  }, [checkExamState]);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const isExamSessionActive = isExamActive;

  return (
    <div
      className={`flex flex-col select-none transition-all duration-200 ${
        isExamSessionActive
          ? `fixed inset-0 z-50 w-screen h-[100dvh] max-w-none m-0 rounded-none border-0 bg-background dark:bg-zinc-950 overflow-hidden ${className}`
          : isMaximized
          ? `border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden w-full max-w-none flex-1 min-h-[calc(100dvh-6.5rem)] h-full my-0 rounded-xl sm:rounded-2xl z-30 ${className}`
          : `border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-xl sm:rounded-2xl w-full max-w-7xl mx-auto min-h-[calc(100dvh-7.5rem)] sm:min-h-[calc(100vh-8.5rem)] my-1 sm:my-2 z-30 ${className}`
      }`}
    >
      {/* OS Window Header / Title Bar — Hidden completely during full-screen active exam */}
      {!isExamSessionActive && (
        <div
          dir={isRTL ? "rtl" : "ltr"}
          className="h-9 sm:h-10 px-2.5 sm:px-3.5 border-b border-slate-200/60 dark:border-white/10 bg-slate-100/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between select-none shrink-0 relative z-20"
        >
          {/* Left: Window App Icon & Title */}
          <div className="flex items-center gap-2 truncate max-w-[65%] sm:max-w-md">
            <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs sm:text-[13px] text-foreground truncate">
              {title}
            </span>
            {subtitle && (
              <>
                <span className="text-muted-foreground/40 text-[10px] hidden sm:inline">/</span>
                <span className="text-[11px] text-muted-foreground truncate hidden md:inline">
                  {subtitle}
                </span>
              </>
            )}
          </div>

          {/* Right: Toolbar Controls + Compact macOS-style Window Controls */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {toolbarRight}

            <div className="group/controls flex items-center gap-1.5 sm:gap-2 ml-1.5 pl-2 border-l border-slate-200/80 dark:border-zinc-800">
              {/* Minimize Button (macOS Amber) */}
              <button
                type="button"
                onClick={() => (onMinimize || onClose)?.()}
                title="Minimize Window"
                aria-label="Minimize Window"
                className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#FEBC2E] hover:bg-[#F5B01C] text-amber-950/90 flex items-center justify-center transition-transform cursor-pointer border border-[#E0A11B]/70 shadow-xs active:scale-90 after:content-[''] after:absolute after:-inset-1.5"
              >
                <Minus className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3] opacity-70 group-hover/controls:opacity-100 transition-opacity" />
              </button>

              {/* Maximize / Restore Button (macOS Emerald) */}
              <button
                type="button"
                onClick={toggleMaximize}
                title={isMaximized ? "Restore Window Size" : "Maximize Window"}
                aria-label={isMaximized ? "Restore Window Size" : "Maximize Window"}
                className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#28C840] hover:bg-[#1FB835] text-emerald-950/90 flex items-center justify-center transition-transform cursor-pointer border border-[#1FA834]/70 shadow-xs active:scale-90 after:content-[''] after:absolute after:-inset-1.5"
              >
                {isMaximized ? (
                  <Minimize2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[2.75] opacity-70 group-hover/controls:opacity-100 transition-opacity" />
                ) : (
                  <Maximize2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[2.75] opacity-70 group-hover/controls:opacity-100 transition-opacity" />
                )}
              </button>

              {/* Close Button (macOS Coral Red) */}
              <button
                type="button"
                onClick={() => onClose?.()}
                title="Close Window (Return to Desktop)"
                aria-label="Close Window"
                className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#FF5F57] hover:bg-[#F04D45] text-rose-950/90 flex items-center justify-center transition-transform cursor-pointer border border-[#E0443E]/70 shadow-xs active:scale-90 after:content-[''] after:absolute after:-inset-1.5"
              >
                <X className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3] opacity-70 group-hover/controls:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Window Body Canvas */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto relative">
        {children}
      </div>
    </div>
  );
}

export default OSWindow;
