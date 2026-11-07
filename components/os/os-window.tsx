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

  // If active full-screen proctored exam is running, lock controls and enforce full viewport
  if (isExamActive) {
    return (
      <div className="fixed inset-0 z-50 w-full h-full bg-background overflow-hidden p-0 m-0 border-none select-none">
        <div className="w-full h-full flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className={`flex flex-col border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
        isMaximized
          ? "fixed top-14 bottom-16 left-2 right-2 md:left-4 md:right-4 z-40 rounded-2xl m-0 p-0"
          : "rounded-2xl w-full max-w-7xl mx-auto min-h-[calc(100vh-8.5rem)] my-2 z-30"
      } ${className}`}
    >
      {/* OS Window Header / Title Bar */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="h-11 px-3 sm:px-4 border-b border-slate-200/60 dark:border-white/10 bg-slate-100/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between select-none shrink-0 relative z-20"
      >
        {/* Left: Window App Icon & Title */}
        <div className="flex items-center gap-2 truncate max-w-[60%] sm:max-w-md">
          <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-foreground truncate">
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

        {/* Right: Toolbar Controls + Top-Right Window Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {toolbarRight}

          {/* Top-Right OS Control Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 ml-1 pl-1 border-l border-slate-200 dark:border-zinc-800">
            {/* Minimize Button */}
            <button
              type="button"
              onClick={onMinimize || onClose}
              title="Minimize Window"
              className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Maximize / Restore Button */}
            <button
              type="button"
              onClick={toggleMaximize}
              title={isMaximized ? "Restore Window Size" : "Maximize Window"}
              className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Window (Return to Desktop)"
              className="w-7 h-7 rounded-lg hover:bg-rose-500/15 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Window Body Canvas */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {children}
      </div>
    </motion.div>
  );
}

export default OSWindow;
