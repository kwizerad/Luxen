"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface HashRoute {
  view: string;
  params: URLSearchParams;
}

export interface NavigateOptions {
  replace?: boolean;
  fallback?: string;
}

function parseHash(): HashRoute {
  if (typeof window === "undefined") return { view: "home", params: new URLSearchParams() };

  // Check if an intended view was set before a cross-page route transition
  const intended = sessionStorage.getItem("intended-dashboard-view");
  let raw = window.location.hash.replace(/^#/, "");

  if (!raw && intended) {
    raw = intended;
    sessionStorage.removeItem("intended-dashboard-view");
    // Ensure hash is set on window without adding extra history if possible
    try {
      window.history.replaceState(null, "", `#${raw}`);
    } catch {
      window.location.hash = raw;
    }
  } else if (intended && raw === intended) {
    sessionStorage.removeItem("intended-dashboard-view");
  }

  if (!raw) return { view: "home", params: new URLSearchParams() };

  const [view, queryString] = raw.split("?");
  return {
    view: view || "home",
    params: new URLSearchParams(queryString || ""),
  };
}

const HASH_CHANGE_EVENT = "navo-hash-route-change";

export function useHashRouter() {
  const [route, setRoute] = useState<HashRoute>(() => parseHash());
  const historyCountRef = useRef(0);

  const syncRoute = useCallback(() => {
    setRoute(parseHash());
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      syncRoute();
    };
    const onPopState = () => {
      syncRoute();
    };
    const onCustomChange = () => {
      syncRoute();
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(HASH_CHANGE_EVENT, onCustomChange);

    // Initial sync
    syncRoute();

    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(HASH_CHANGE_EVENT, onCustomChange);
    };
  }, [syncRoute]);

  const goBack = useCallback((fallbackView: string = "home") => {
    if (typeof window === "undefined") return;

    // Check if an active sub-view/modal handler handles this back request
    const customBackEvent = new CustomEvent("app:request-back", { cancelable: true, bubbles: true });
    const handled = !window.dispatchEvent(customBackEvent);
    if (handled) {
      return;
    }

    // Check if there is browser history to go back to
    if (window.history.length > 1 && historyCountRef.current > 0) {
      historyCountRef.current = Math.max(0, historyCountRef.current - 1);
      window.history.back();
    } else {
      let hash = `#${fallbackView}`;
      if (window.location.hash === hash) {
        setRoute(parseHash());
      } else {
        window.location.hash = hash;
        setRoute(parseHash());
      }
      window.dispatchEvent(new CustomEvent(HASH_CHANGE_EVENT));
    }
  }, []);

  const navigate = useCallback(
    (view: string, params?: Record<string, string>, options?: NavigateOptions) => {
      if (view === "back" || view === "-1") {
        goBack(options?.fallback || "home");
        return;
      }

      let hash = `#${view}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        hash = `#${view}?${searchParams.toString()}`;
      }

      if (options?.replace) {
        if (window.location.hash !== hash) {
          window.location.replace(hash);
        }
        setRoute(parseHash());
      } else {
        if (window.location.hash !== hash) {
          historyCountRef.current += 1;
          window.location.hash = hash;
        }
        setRoute(parseHash());
      }

      // Notify all useHashRouter instances synchronously
      window.dispatchEvent(new CustomEvent(HASH_CHANGE_EVENT));
    },
    [goBack]
  );

  // Global keyboard shortcuts & mouse button listeners for desktop/computers
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input, textarea, select, or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox");

      // Shortcut 1: Alt + Left Arrow (Standard browser back on Windows / Linux)
      const isAltLeft = e.altKey && (e.key === "ArrowLeft" || e.key === "Left");

      // Shortcut 2: Cmd + [ or Cmd + Left Arrow (Standard browser back on macOS)
      const isCmdBack = (e.metaKey || (e.ctrlKey && !e.altKey && !e.shiftKey)) && (e.key === "[" || (e.metaKey && e.key === "ArrowLeft"));

      // Shortcut 3: Backspace key when NOT in an input field
      const isBackspaceBack = e.key === "Backspace" && !isInput && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;

      if (isAltLeft || isCmdBack || isBackspaceBack) {
        e.preventDefault();
        e.stopPropagation();
        goBack();
      }
    };

    // Mouse back button (Button 3 or 4) on computers
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        goBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("mouseup", handleMouseUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, [goBack]);

  return { ...route, navigate, goBack };
}

