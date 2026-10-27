"use client";

import { useState } from "react";
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

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 6 }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      className={`flex flex-col rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-200 z-30 ${
        isMaximized
          ? "fixed inset-x-0 top-9 bottom-16 sm:inset-x-2 sm:top-10 sm:bottom-18 rounded-none sm:rounded-2xl"
          : "w-full max-w-7xl mx-auto min-h-[calc(100vh-8.5rem)] my-2"
      } ${className}`}
    >
      {/* OS Window Header / Title Bar */}
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="h-11 px-4 border-b border-slate-200/60 dark:border-white/10 bg-slate-100/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between select-none shrink-0"
      >
        {/* macOS Traffic Light Buttons */}
        <div className="flex items-center gap-2 w-20">
          <button
            type="button"
            onClick={onClose}
            title="Close Window (Return to Desktop)"
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center group cursor-pointer shadow-none"
          >
            <X className="w-2 h-2 text-rose-950 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={onMinimize || onClose}
            title="Minimize to Dock"
            className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center group cursor-pointer shadow-none"
          >
            <Minus className="w-2 h-2 text-amber-950 opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            title={isMaximized ? "Restore Size" : "Maximize Window"}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center group cursor-pointer shadow-none"
          >
            {isMaximized ? (
              <Minimize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
            ) : (
              <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
            )}
          </button>
        </div>

        {/* Window Center Title & App Icon */}
        <div className="flex items-center gap-2 truncate max-w-md text-center">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-foreground truncate">
            {title}
          </span>
          {subtitle && (
            <>
              <span className="text-muted-foreground/40 text-[10px]">/</span>
              <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                {subtitle}
              </span>
            </>
          )}
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center justify-end gap-2 min-w-20">
          {toolbarRight}
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
