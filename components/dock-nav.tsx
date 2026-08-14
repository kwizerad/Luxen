"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, FileText, History, Settings, BookOpen, LayoutGrid, Car, Users } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";
import Dock, { type DockItemData } from "@/components/Dock";
import { useHashRouter } from "@/hooks/use-hash-router";
import { useLearningLanguages } from "@/hooks/use-learning-languages";

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

const isLearningLanguage = (language: string | null | undefined): language is LearningLanguage =>
  !!language && LEARNING_LANGUAGES.includes(language as LearningLanguage);

export function DockNav({ hide = false, hideOnMobile = false }: { hide?: boolean; hideOnMobile?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { view: hashView, navigate } = useHashRouter();
  const { t, language: interfaceLanguage } = useLanguage();
  const { user } = useAuth();
  const { enabledLanguages } = useLearningLanguages();
  const [isExamActive, setIsExamActive] = useState(false);
  const [hasPublishedCourse, setHasPublishedCourse] = useState<boolean | null>(null);
  const [examEnabled, setExamEnabled] = useState<boolean>(false);
  const [servicesEnabled, setServicesEnabled] = useState<boolean>(true);
  const [hasExamHistory, setHasExamHistory] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const checkPublishedCourse = async () => {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("learning_language")
        .eq("id", user.id)
        .maybeSingle();

      const savedLanguage = profile?.learning_language;
      const effectiveLanguage = isLearningLanguage(savedLanguage)
        ? savedLanguage
        : isLearningLanguage(interfaceLanguage)
        ? interfaceLanguage
        : null;

      const languagesToCheck = effectiveLanguage
        ? (enabledLanguages.includes(effectiveLanguage as any) ? [effectiveLanguage] : [])
        : enabledLanguages;
      const { data: courses, error } = await supabase
        .from("course_languages")
        .select("id")
        .in("language", languagesToCheck)
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(1);

      if (error) {
        console.error("[DockNav] Error checking published courses:", error.message);
        setHasPublishedCourse(false);
        return;
      }

      setHasPublishedCourse((courses?.length ?? 0) > 0);
    };

    void checkPublishedCourse();
  }, [user, interfaceLanguage, enabledLanguages]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const supabase = createClient();
    const checkExamHistory = async () => {
      const { count } = await supabase
        .from("exam_attempts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setHasExamHistory((count ?? 0) > 0);
    };
    void checkExamHistory();
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Batch both system_config lookups into a single query
    const supabase = createClient();
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["standalone_exam_enabled", "services_page_enabled"]);

      for (const row of data || []) {
        if (row.key === "standalone_exam_enabled") {
          setExamEnabled(row.value === "true");
        } else if (row.key === "services_page_enabled") {
          setServicesEnabled(row.value === "true");
        }
      }
    };
    void fetchConfig();

    const channel = supabase
      .channel("system_config_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_config", filter: "key=eq.standalone_exam_enabled" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newValue = (payload.new as { value?: string } | undefined)?.value;
          setExamEnabled(newValue === "true");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_config", filter: "key=eq.services_page_enabled" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newValue = (payload.new as { value?: string } | undefined)?.value;
          setServicesEnabled(newValue === "true");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const checkExamActive = () => {
      const isActive = sessionStorage.getItem("exam-active") === "true";
      setIsExamActive(isActive);
    };

    checkExamActive();

    const handleExamStateChange = () => {
      checkExamActive();
    };

    window.addEventListener("exam-state-change", handleExamStateChange);
    window.addEventListener("storage", handleExamStateChange);

    return () => {
      window.removeEventListener("exam-state-change", handleExamStateChange);
      window.removeEventListener("storage", handleExamStateChange);
    };
  }, []);

  if (hide || isExamActive) return null;

  type NavItem = { view?: string; href?: string; labelKey: string; icon: React.ReactNode; badge?: number };

  const userRole = user?.user_metadata?.role;
  const isDriverRole = userRole === "Driver";

  const allItems: NavItem[] = [
    { view: "home", labelKey: "home", icon: <Home size={18} /> },
    { view: "course", labelKey: "courses", icon: <BookOpen size={18} /> },
    ...(examEnabled ? [{ href: "/dashboard/exam", labelKey: "exam", icon: <FileText size={18} /> }] : []),
    { view: "results", labelKey: "examHistory", icon: <History size={18} /> },
    { view: "classmates", labelKey: "classmates", icon: <Users size={18} /> },
    { view: "services", labelKey: "services", icon: <LayoutGrid size={18} /> },
    ...(isDriverRole ? [{ view: "driver-panel", labelKey: "driverPanel", icon: <Car size={18} /> }] : []),
    { view: "settings", labelKey: "settings", icon: <Settings size={18} /> },
  ];

  const visibleItems = useMemo(() => allItems.filter((item) => {
    if (item.view === "course" && hasPublishedCourse !== true) return false;
    if (item.view === "services" && !servicesEnabled) return false;
    if (item.view === "results" && hasExamHistory !== true) return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [hasPublishedCourse, servicesEnabled, examEnabled, isDriverRole, hasExamHistory]);

  const isNavItemActive = (item: NavItem) => {
    if (item.href) return pathname === item.href;
    if (pathname !== "/dashboard") return false;
    // Handle sub-route matching (e.g. "services/live-exam" matches "services")
    if (item.view === "home") return hashView === "home" || hashView === "";
    if (item.view === "services") return hashView === "services" || hashView.startsWith("services/");
    if (item.view === "driver-panel") return hashView === "driver-panel" || hashView.startsWith("driver-panel/");
    if (item.view === "classmates") return hashView === "classmates" || hashView.startsWith("classmates/");
    return hashView === item.view;
  };

  const dockItems: DockItemData[] = useMemo(() => visibleItems.map((item) => ({
    icon: (
      <div className="relative">
        {item.icon}
        {item.badge ? (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
      </div>
    ),
    label: t(item.labelKey),
    onClick: () => {
      if (item.href) {
        router.push(item.href);
      } else if (item.view) {
        if (pathname === "/dashboard") {
          navigate(item.view);
        } else {
          // We're on a separate route (e.g. /dashboard/exam) — navigate to
          // /dashboard first, then set the hash after the page loads.
          // Using router.push with hash can be unreliable in Next.js.
          router.push(`/dashboard#${item.view}`);
          // Fallback: also set the hash directly in case Next.js strips it
          setTimeout(() => {
            if (window.location.pathname === "/dashboard") {
              if (window.location.hash !== `#${item.view}`) {
                window.location.hash = item.view!;
              }
            }
          }, 100);
        }
      }
    },
    className: isNavItemActive(item)
      ? "bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/15 dark:border-white/15"
      : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white",
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [visibleItems, t, router, pathname, hashView, navigate]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 justify-center pointer-events-none ${hideOnMobile ? "hidden sm:flex" : "flex"}`}>
      <div className="pointer-events-auto">
        <Dock
          items={dockItems}
          panelHeight={68}
          baseItemSize={50}
          magnification={70}
        />
      </div>
    </div>
  );
}
