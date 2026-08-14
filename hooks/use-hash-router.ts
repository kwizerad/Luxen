"use client";

import { useCallback, useEffect, useState } from "react";

export interface HashRoute {
  view: string;
  params: URLSearchParams;
}

function parseHash(): HashRoute {
  if (typeof window === "undefined") return { view: "home", params: new URLSearchParams() };
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { view: "home", params: new URLSearchParams() };

  const [view, queryString] = raw.split("?");
  return {
    view: view || "home",
    params: new URLSearchParams(queryString || ""),
  };
}

export function useHashRouter() {
  const [route, setRoute] = useState<HashRoute>(() => parseHash());

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    const onPopState = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onPopState);
    // Re-parse on mount to catch any hash set during navigation
    setRoute(parseHash());
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const navigate = useCallback((view: string, params?: Record<string, string>) => {
    let hash = `#${view}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      hash = `#${view}?${searchParams.toString()}`;
    }
    if (window.location.hash === hash) {
      // Force re-render even if hash is the same
      setRoute(parseHash());
    } else {
      window.location.hash = hash;
      // Ensure state updates immediately for responsiveness
      setRoute(parseHash());
    }
  }, []);

  return { ...route, navigate };
}
