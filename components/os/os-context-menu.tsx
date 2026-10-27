"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  Home,
  Copy,
  Search,
  BookOpen,
  FileText,
  Car,
  BarChart3,
  Settings,
  Maximize,
  Minimize,
  Eye,
  Check,
  Compass,
} from "lucide-react";
import { AgoraIcon } from "@/components/ui/agora-icon";
import { useLanguage } from "@/lib/language-context";
import { useDesktopWidgets } from "@/lib/desktop-widgets";
import { toast } from "sonner";

interface OSContextMenuProps {
  children: React.ReactNode;
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

export function OSContextMenu({ children, navigate, onOpenSpotlight }: OSContextMenuProps) {
  const { t } = useLanguage();
  const { restoreAll, dismissed } = useDesktopWidgets();

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle right-click contextmenu event across the dashboard
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only intercept right-clicks directly on non-form elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest("input, textarea, select, [contenteditable='true']");

    if (isInteractive) {
      // Allow native browser text editing context menu inside input fields
      return;
    }

    e.preventDefault();

    // Bound coordinates within viewport
    const menuWidth = 240;
    const menuHeight = 390;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 12;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 12;
    }

    setPosition({ x, y });
    setIsOpen(true);
  }, []);

  // Close context menu on outside click or scroll or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", () => setIsOpen(false), true);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleRefreshPage = () => {
    setIsRefreshing(true);
    setIsOpen(false);
    toast.info("Refreshing workspace...", { duration: 1500 });
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleGoHome = () => {
    navigate("home");
    setIsOpen(false);
    toast.success("Returned to Desktop Workspace");
  };

  const handleCopyUrl = async () => {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Current URL copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error("Failed to copy URL");
    } finally {
      setIsOpen(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    setIsOpen(false);
  };

  return (
    <div onContextMenu={handleContextMenu} className="relative w-full min-h-full">
      {/* Desktop Refresh Flash Feedback Effect */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-emerald-500/20 pointer-events-none backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {children}

      {/* OS Dashboard Right-Click Context Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -2 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{ top: position.y, left: position.x }}
            className="fixed z-[120] w-64 bg-popover/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-2xl p-1.5 shadow-2xl select-none space-y-1"
          >
            {/* Context Menu Header */}
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-border/60 dark:border-white/10 text-[11px] font-mono text-muted-foreground">
              <span className="font-semibold text-foreground dark:text-white">Navo OS</span>
              <span>Dashboard Actions</span>
            </div>

            {/* Core Navigation Actions */}
            <div className="space-y-0.5 pt-1">
              <button
                type="button"
                onClick={handleRefreshPage}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-medium">Refresh Page</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">F5</span>
              </button>

              <button
                type="button"
                onClick={handleGoHome}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <Home className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-medium">Go Home</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">⌘1</span>
              </button>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-cyan-500" />
                  )}
                  <span className="font-medium">{copied ? "Copied!" : "Copy Current URL"}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">⌘C</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenSpotlight();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">Spotlight Search</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">⌘K</span>
              </button>

              {dismissed.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    restoreAll();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Restore Hidden Cards</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold">{dismissed.length}</span>
                </button>
              )}
            </div>

            <div className="h-px bg-border/60 dark:bg-white/10 my-1" />

            {/* Quick Student App Jump Section */}
            <div className="space-y-0.5">
              <div className="px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
                Student Features
              </div>

              <button
                type="button"
                onClick={() => {
                  navigate("course");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Courses</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("exams");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Exams Center</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("classmates");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left font-semibold text-indigo-500 dark:text-indigo-400"
              >
                <AgoraIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Agora (Community & Chat)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("driver-hub");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <Car className="w-3.5 h-3.5 text-purple-500" />
                <span>Services & Instructors</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("results");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
                <span>Performance Transcripts</span>
              </button>
            </div>

            <div className="h-px bg-border/60 dark:bg-white/10 my-1" />

            {/* Display & Preferences */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  {isFullscreen ? (
                    <Minimize className="w-3.5 h-3.5 text-cyan-500" />
                  ) : (
                    <Maximize className="w-3.5 h-3.5 text-cyan-500" />
                  )}
                  <span>{isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">F11</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate("settings");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white transition-colors cursor-pointer text-left"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>System Preferences</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OSContextMenu;
