"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export type AdminViewId =
  | "dashboard"
  | "course"
  | "course-studio"
  | "course-management"
  | "exams"
  | "questions"
  | "retake-requests"
  | "users"
  | "drivers"
  | "reports"
  | "notifications"
  | "audit"
  | "settings";

export interface AdminRouteState {
  view: AdminViewId;
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
}

interface AdminSpaContextValue extends AdminRouteState {
  navigateAdmin: (hrefOrView: string, options?: { replace?: boolean }) => void;
}

const ADMIN_SPA_EVENT = "luxen:admin-spa-navigate";

export function resolveAdminViewFromPath(pathname: string): AdminViewId {
  const clean = pathname.replace(/\/+$/, "") || "/Admin";
  const lower = clean.toLowerCase();

  if (lower === "/admin") return "dashboard";
  if (lower === "/admin/course" || lower === "/admin/courses") return "course";
  if (lower === "/admin/course-studio") return "course-studio";
  if (lower === "/admin/course-management") return "course-management";
  if (lower === "/admin/exams" || lower === "/admin/categories") return "exams";
  if (lower === "/admin/questions") return "questions";
  if (lower === "/admin/retake-requests") return "retake-requests";
  if (lower === "/admin/users") return "users";
  if (lower === "/admin/drivers") return "drivers";
  if (lower === "/admin/reports") return "reports";
  if (lower === "/admin/notifications") return "notifications";
  if (lower === "/admin/audit") return "audit";
  if (lower === "/admin/settings") return "settings";

  return "dashboard";
}

export function resolvePathFromAdminInput(input: string): { pathname: string; search: string } {
  if (input.startsWith("/")) {
    const [pathPart, queryPart] = input.split("?");
    // Normalize common aliases
    let normalizedPath = pathPart;
    if (pathPart === "/Admin/courses") normalizedPath = "/Admin/course?tab=studio";
    if (pathPart === "/Admin/Categories") normalizedPath = "/Admin/exams";
    if (pathPart === "/Admin/Questions") normalizedPath = "/Admin/questions";

    if (normalizedPath.includes("?")) {
      const [np, nq] = normalizedPath.split("?");
      const combinedQuery = [nq, queryPart].filter(Boolean).join("&");
      return {
        pathname: np,
        search: combinedQuery ? `?${combinedQuery}` : "",
      };
    }

    return {
      pathname: normalizedPath,
      search: queryPart ? `?${queryPart}` : "",
    };
  }

  // View ID shorthand
  const [viewPart, queryPart] = input.replace(/^#/, "").split("?");
  const map: Record<string, string> = {
    dashboard: "/Admin",
    overview: "/Admin",
    course: "/Admin/course",
    "course-studio": "/Admin/course-studio",
    "course-management": "/Admin/course-management",
    exams: "/Admin/exams",
    questions: "/Admin/questions",
    "retake-requests": "/Admin/retake-requests",
    users: "/Admin/users",
    drivers: "/Admin/drivers",
    reports: "/Admin/reports",
    notifications: "/Admin/notifications",
    audit: "/Admin/audit",
    settings: "/Admin/settings",
  };

  const pathname = map[viewPart] || "/Admin";
  return {
    pathname,
    search: queryPart ? `?${queryPart}` : "",
  };
}

function readWindowAdminRoute(): AdminRouteState {
  if (typeof window === "undefined") {
    return {
      view: "dashboard",
      pathname: "/Admin",
      search: "",
      searchParams: new URLSearchParams(),
    };
  }

  const pathname = window.location.pathname || "/Admin";
  const search = window.location.search || "";
  const view = resolveAdminViewFromPath(pathname);
  return {
    view,
    pathname,
    search,
    searchParams: new URLSearchParams(search),
  };
}

const AdminSpaContext = createContext<AdminSpaContextValue>({
  view: "dashboard",
  pathname: "/Admin",
  search: "",
  searchParams: new URLSearchParams(),
  navigateAdmin: () => {},
});

export function useAdminSpa() {
  return useContext(AdminSpaContext);
}

export function dispatchAdminSpaNavigate(hrefOrView: string, options?: { replace?: boolean }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ADMIN_SPA_EVENT, {
      detail: { hrefOrView, replace: options?.replace ?? false },
    })
  );
}

export function AdminSpaProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<AdminRouteState>(() => readWindowAdminRoute());

  const syncFromWindow = useCallback(() => {
    const next = readWindowAdminRoute();
    setRoute((prev) => {
      if (prev.view === next.view && prev.pathname === next.pathname && prev.search === next.search) {
        return prev;
      }
      return next;
    });
  }, []);

  const navigateAdmin = useCallback((hrefOrView: string, options?: { replace?: boolean }) => {
    if (typeof window === "undefined") return;
    const { pathname, search } = resolvePathFromAdminInput(hrefOrView);
    const fullUrl = `${pathname}${search}`;
    const view = resolveAdminViewFromPath(pathname);

    try {
      if (options?.replace) {
        window.history.replaceState(null, "", fullUrl);
      } else if (window.location.pathname + window.location.search !== fullUrl) {
        window.history.pushState(null, "", fullUrl);
      }
    } catch {
      // Fallback if history API is restricted
    }

    setRoute({
      view,
      pathname,
      search,
      searchParams: new URLSearchParams(search),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncFromWindow();

    const handlePopState = () => {
      syncFromWindow();
    };

    const handleCustomNavigate = (e: Event) => {
      const custom = e as CustomEvent<{ hrefOrView: string; replace?: boolean }>;
      if (custom.detail?.hrefOrView) {
        navigateAdmin(custom.detail.hrefOrView, { replace: custom.detail.replace });
      }
    };

    // Global click interceptor for any <a href="/Admin..."> inside the Admin portal
    // Converts all Next.js <Link> and <a> tags targeting /Admin into 0ms client-side SPA transitions!
    const handleDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download")) return;

      if (href.startsWith("/Admin") || href.startsWith("/admin")) {
        e.preventDefault();
        e.stopPropagation();
        navigateAdmin(href);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(ADMIN_SPA_EVENT, handleCustomNavigate);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(ADMIN_SPA_EVENT, handleCustomNavigate);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [navigateAdmin, syncFromWindow]);

  const contextValue = useMemo<AdminSpaContextValue>(
    () => ({
      ...route,
      navigateAdmin,
    }),
    [route, navigateAdmin]
  );

  return <AdminSpaContext.Provider value={contextValue}>{children}</AdminSpaContext.Provider>;
}
