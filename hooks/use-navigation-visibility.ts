"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLearningLanguages } from "@/hooks/use-learning-languages";
import {
  isStandaloneExamEnabled,
  getCachedStandaloneExamEnabled,
  getCachedServicesConfig,
  getSyncServicesConfig,
} from "@/lib/feature-flags";
import { canRead, isPrimaryAdmin, type User as PermUser } from "@/lib/permissions";

export type StudentNavId =
  | "course"
  | "exam"
  | "classmates"
  | "home"
  | "services"
  | "results"
  | "settings";

export type AdminNavId =
  | "admin-home"
  | "admin-course"
  | "admin-exams"
  | "admin-users"
  | "admin-drivers"
  | "admin-reports"
  | "admin-settings";

const LANG_NORMALIZE_MAP: Record<string, string> = {
  en: "English",
  english: "English",
  fr: "French",
  french: "French",
  rw: "Kinyarwanda",
  kinyarwanda: "Kinyarwanda",
};

function normalizeLanguageName(lang?: string | null): string {
  if (!lang) return "English";
  return LANG_NORMALIZE_MAP[lang.toLowerCase()] || lang;
}

// In-memory cache of published course languages to avoid flicker on navigation
let cachedPublishedCourses: Set<string> | null = null;
let cachedNavToggles: Record<string, boolean> = {};
let cachedUserLearningLanguage: string | null = null;

if (typeof window !== "undefined") {
  try {
    const rawCourses = sessionStorage.getItem("app_published_course_languages");
    if (rawCourses) {
      cachedPublishedCourses = new Set(JSON.parse(rawCourses));
    }
    const rawToggles = sessionStorage.getItem("app_admin_nav_toggles");
    if (rawToggles) {
      cachedNavToggles = JSON.parse(rawToggles);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Centralized hook that manages navigation visibility rules across the app:
 * 1. Hides the 'Course' tab when the specific language course is not published
 *    (in `course_languages` or `courses`) OR when that learning language is toggled off by the primary admin.
 * 2. Filters out any menu items toggled off by the primary admin via `system_config`
 *    (e.g., `standalone_exam_enabled`, `services_page_enabled`, `course_page_enabled`,
 *    `classmates_page_enabled`, `results_page_enabled`, or `nav_<id>_enabled`)
 *    and enforces role-based permissions for admin menu items.
 */
export function useNavigationVisibility(adminMode = false) {
  const { user } = useAuth();
  const { language: interfaceLanguage } = useLanguage();
  const { enabledLanguages, loading: loadingLangs } = useLearningLanguages();

  const [standaloneExamEnabled, setStandaloneExamEnabled] = useState<boolean>(() => {
    const cached = getCachedStandaloneExamEnabled();
    return cached !== null ? cached : true;
  });

  const [servicesPageEnabled, setServicesPageEnabled] = useState<boolean>(() => {
    const cached = getSyncServicesConfig();
    return cached ? cached.pageEnabled : true;
  });

  const [publishedCourseLanguages, setPublishedCourseLanguages] = useState<Set<string>>(
    () => cachedPublishedCourses || new Set()
  );

  const [adminToggles, setAdminToggles] = useState<Record<string, boolean>>(
    () => cachedNavToggles
  );

  const [userLearningLanguage, setUserLearningLanguage] = useState<string | null>(
    () => cachedUserLearningLanguage
  );

  const refreshVisibility = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      const supabase = createClient();

      const [examEnabled, servicesCfg, courseLangsRes, publishedModulesRes, systemConfigsRes, profileRes] =
        await Promise.all([
          isStandaloneExamEnabled().catch(() => true),
          getCachedServicesConfig().catch(() => ({ pageEnabled: true, services: {} })),
          supabase
            .from("course_languages")
            .select("id, language, status, is_published, deleted_at")
            .is("deleted_at", null),
          supabase
            .from("course_modules")
            .select("id, language_id, status, is_published, deleted_at, lessons:course_lessons(id, status, is_published, deleted_at)")
            .is("deleted_at", null),
          supabase.from("system_config").select("key, value"),
          user?.id
            ? supabase
                .from("user_profiles")
                .select("learning_language")
                .eq("id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      setStandaloneExamEnabled(examEnabled);
      setServicesPageEnabled(servicesCfg.pageEnabled);

      // Build map of course_language.id -> whether it has at least one published module with at least one published lesson
      const courseIdsWithPublishedContent = new Set<string>();
      const hasModulesTableData = Array.isArray(publishedModulesRes.data);

      if (hasModulesTableData) {
        for (const mod of publishedModulesRes.data as any[]) {
          const isModPub =
            !mod.deleted_at &&
            mod.status === "published" &&
            mod.is_published !== false;
          if (!isModPub || !mod.language_id) continue;

          const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];
          const hasPubLesson = lessons.some(
            (l: any) =>
              !l.deleted_at &&
              l.status === "published" &&
              l.is_published !== false
          );
          if (hasPubLesson) {
            courseIdsWithPublishedContent.add(mod.language_id);
          }
        }
      }

      // Determine published course languages from `course_languages`
      if (courseLangsRes.data && courseLangsRes.data.length > 0) {
        const pubSet = new Set<string>();
        for (const row of courseLangsRes.data as any[]) {
          const isPub =
            !row.deleted_at &&
            row.status === "published" &&
            row.is_published !== false;
          const hasContent = hasModulesTableData
            ? courseIdsWithPublishedContent.has(row.id)
            : true;
          if (isPub && hasContent && row.language) {
            pubSet.add(normalizeLanguageName(row.language));
          }
        }
        cachedPublishedCourses = pubSet;
        setPublishedCourseLanguages(pubSet);
        try {
          sessionStorage.setItem(
            "app_published_course_languages",
            JSON.stringify(Array.from(pubSet))
          );
        } catch {}
      } else {
        const emptySet = new Set<string>();
        cachedPublishedCourses = emptySet;
        setPublishedCourseLanguages(emptySet);
        try {
          sessionStorage.setItem("app_published_course_languages", "[]");
        } catch {}
      }

      if (profileRes?.data?.learning_language) {
        const normalized = normalizeLanguageName(profileRes.data.learning_language);
        cachedUserLearningLanguage = normalized;
        setUserLearningLanguage(normalized);
      }

      // Parse any explicit admin toggles from system_config
      if (systemConfigsRes.data) {
        const toggles: Record<string, boolean> = {};
        for (const row of systemConfigsRes.data as Array<{ key: string; value: string }>) {
          const isEnabled = String(row.value).toLowerCase() !== "false";
          toggles[row.key] = isEnabled;
        }
        cachedNavToggles = toggles;
        setAdminToggles(toggles);
        try {
          sessionStorage.setItem("app_admin_nav_toggles", JSON.stringify(toggles));
        } catch {}
      }
    } catch {
      // Ignore transient errors and keep cached state
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshVisibility();

    if (typeof window === "undefined") return;

    const handleRefresh = () => {
      void refreshVisibility();
    };

    window.addEventListener("system-config-updated", handleRefresh);
    window.addEventListener("config-changed", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    const supabase = createClient();
    const channelName = `nav_visibility_${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_config" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_languages" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_modules" },
        handleRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "course_lessons" },
        handleRefresh
      )
      .subscribe();

    return () => {
      window.removeEventListener("system-config-updated", handleRefresh);
      window.removeEventListener("config-changed", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [refreshVisibility, interfaceLanguage]);

  // Active course language strictly follows the selected UI language (interfaceLanguage)
  const activeCourseLanguage = useMemo(() => {
    const normalizedInterface = normalizeLanguageName(interfaceLanguage);
    if (["English", "French", "Kinyarwanda"].includes(normalizedInterface)) {
      return normalizedInterface;
    }
    if (userLearningLanguage && ["English", "French", "Kinyarwanda"].includes(userLearningLanguage)) {
      return userLearningLanguage;
    }
    return "English";
  }, [interfaceLanguage, userLearningLanguage]);

  // Check if the Course tab is visible for the selected UI language:
  // 1) Not explicitly toggled off by primary admin (`course_page_enabled` / `nav_course_enabled`)
  // 2) The specific learning language is enabled by primary admin (`learning_language_<lang>_enabled`)
  // 3) There is a published course for the selected UI language (`publishedCourseLanguages.has(activeCourseLanguage)`)
  const isCourseVisible = useMemo(() => {
    if (
      adminToggles["course_page_enabled"] === false ||
      adminToggles["nav_course_enabled"] === false
    ) {
      return false;
    }

    const langKey = activeCourseLanguage.toLowerCase();
    if (adminToggles[`learning_language_${langKey}_enabled`] === false) {
      return false;
    }

    const isLangEnabledByAdmin = loadingLangs
      ? true
      : enabledLanguages.includes(activeCourseLanguage as any);

    const isCoursePublishedInLang = publishedCourseLanguages.has(activeCourseLanguage);

    return isLangEnabledByAdmin && isCoursePublishedInLang;
  }, [
    adminToggles,
    activeCourseLanguage,
    loadingLangs,
    enabledLanguages,
    publishedCourseLanguages,
  ]);

  /**
   * Centralized check for whether a given navigation item ID should be visible.
   */
  const isNavItemVisible = useCallback(
    (id: string): boolean => {
      // Check generic admin toggle keys `nav_<id>_enabled` or `<id>_page_enabled`
      if (
        adminToggles[`nav_${id}_enabled`] === false ||
        adminToggles[`${id}_page_enabled`] === false ||
        adminToggles[`${id}_enabled`] === false
      ) {
        return false;
      }

      if (adminMode) {
        const permUser = user as PermUser | null;
        const userIsPrimary = isPrimaryAdmin(permUser);
        if (userIsPrimary) return true;

        switch (id) {
          case "admin-home":
            return true;
          case "admin-course":
            return (
              canRead(permUser, "courseManagement") ||
              canRead(permUser, "courseStudio")
            );
          case "admin-exams":
            return canRead(permUser, "exams");
          case "admin-users":
            return canRead(permUser, "students");
          case "admin-drivers":
            return canRead(permUser, "drivers");
          case "admin-reports":
            return canRead(permUser, "notifications");
          case "admin-settings":
            return canRead(permUser, "settings");
          default:
            return true;
        }
      }

      // Student navigation visibility rules
      switch (id) {
        case "course":
          return isCourseVisible;
        case "exam":
          return (
            standaloneExamEnabled &&
            adminToggles["standalone_exam_enabled"] !== false
          );
        case "services":
          return (
            servicesPageEnabled &&
            adminToggles["services_page_enabled"] !== false
          );
        case "classmates":
          return adminToggles["classmates_page_enabled"] !== false;
        case "results":
          return adminToggles["results_page_enabled"] !== false;
        case "home":
        case "settings":
        default:
          return true;
      }
    },
    [
      adminMode,
      adminToggles,
      isCourseVisible,
      servicesPageEnabled,
      standaloneExamEnabled,
      user,
    ]
  );

  /**
   * Filter an array of navigation items dynamically using the centralized visibility check,
   * and guarantee that the Dashboard [Home button] (`id === "home"` or `id === "admin-home"`)
   * is ALWAYS placed at the center index of the visible navigation items.
   */
  const filterNavItems = useCallback(
    <T extends { id: string; visible?: boolean }>(items: T[]): T[] => {
      const visible = items.filter((item) => {
        if (item.visible === false) return false;
        return isNavItemVisible(item.id);
      });

      const homeIdx = visible.findIndex(
        (item) => item.id === "home" || item.id === "admin-home"
      );
      if (homeIdx === -1 || visible.length <= 1) {
        return visible;
      }

      const homeItem = visible[homeIdx];
      const others = visible.filter((_, idx) => idx !== homeIdx);
      const centerIndex = Math.floor(others.length / 2);

      return [
        ...others.slice(0, centerIndex),
        homeItem,
        ...others.slice(centerIndex),
      ];
    },
    [isNavItemVisible]
  );

  return {
    isCourseVisible,
    standaloneExamEnabled:
      standaloneExamEnabled && adminToggles["standalone_exam_enabled"] !== false,
    servicesPageEnabled:
      servicesPageEnabled && adminToggles["services_page_enabled"] !== false,
    activeCourseLanguage,
    publishedCourseLanguages,
    isNavItemVisible,
    filterNavItems,
    refreshVisibility,
  };
}
