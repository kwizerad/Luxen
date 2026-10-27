"use client";

import { useState, useEffect, useCallback } from "react";

export interface DesktopWidgetConfig {
  id: string;
  title: string;
  description: string;
}

export const AVAILABLE_DESKTOP_WIDGETS: DesktopWidgetConfig[] = [
  {
    id: "exam-readiness",
    title: "Exam Readiness Score",
    description: "Official readiness probability ring and 20Q test simulator shortcut",
  },
  {
    id: "daily-rule",
    title: "Daily Traffic Code Snippet",
    description: "Rwanda Law No. 55/2013 traffic rule of the day with quick link",
  },
  {
    id: "quick-stats",
    title: "Learning Statistics",
    description: "Completed modules and passed exam metrics",
  },
  {
    id: "resume-session",
    title: "Active Session Banner",
    description: "Resume your last active curriculum lesson or test session",
  },
];

const STORAGE_KEY = "navo_os_dismissed_widgets";
const CHANGE_EVENT = "navo-widgets-changed";

export function getStoredDismissedWidgets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissDesktopWidget(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredDismissedWidgets();
    if (!current.includes(id)) {
      const updated = [...current, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { hidden: updated } }));
    }
  } catch (err) {
    console.error("Failed to dismiss desktop widget:", err);
  }
}

export function restoreDesktopWidget(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredDismissedWidgets();
    const updated = current.filter((item) => item !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { hidden: updated } }));
  } catch (err) {
    console.error("Failed to restore desktop widget:", err);
  }
}

export function restoreAllDesktopWidgets(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { hidden: [] } }));
  } catch (err) {
    console.error("Failed to restore all desktop widgets:", err);
  }
}

export function useDesktopWidgets() {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial load from storage - Never auto-restores
    const initial = getStoredDismissedWidgets();
    setDismissed(initial);
    setIsLoaded(true);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ hidden?: string[] }>;
      if (customEvent.detail && Array.isArray(customEvent.detail.hidden)) {
        setDismissed(customEvent.detail.hidden);
      } else {
        setDismissed(getStoredDismissedWidgets());
      }
    };

    window.addEventListener(CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const hide = useCallback((id: string) => {
    dismissDesktopWidget(id);
  }, []);

  const restore = useCallback((id: string) => {
    restoreDesktopWidget(id);
  }, []);

  const restoreAll = useCallback(() => {
    restoreAllDesktopWidgets();
  }, []);

  const isHidden = useCallback(
    (id: string) => {
      return dismissed.includes(id);
    },
    [dismissed]
  );

  return {
    dismissed,
    isLoaded,
    hide,
    restore,
    restoreAll,
    isHidden,
    availableWidgets: AVAILABLE_DESKTOP_WIDGETS,
  };
}
