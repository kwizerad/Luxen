"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Trophy, Settings, BookOpen, LayoutList } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { isStandaloneExamEnabled } from "@/lib/supabase/queries";
import { useEffect, useState } from "react";
import Dock, { type DockItemData } from "@/components/Dock";

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

const isLearningLanguage = (language: string | null | undefined): language is LearningLanguage =>
  !!language && LEARNING_LANGUAGES.includes(language as LearningLanguage);

export function DockNav({ hide = false }: { hide?: boolean } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language: interfaceLanguage } = useLanguage();
  const { user } = useAuth();
  const [isExamActive, setIsExamActive] = useState(false);
  const [hasPublishedCourse, setHasPublishedCourse] = useState<boolean | null>(null);
  const [examEnabled, setExamEnabled] = useState<boolean>(false);

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

      const languagesToCheck = effectiveLanguage ? [effectiveLanguage] : LEARNING_LANGUAGES;
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
  }, [user, interfaceLanguage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void isStandaloneExamEnabled().then(setExamEnabled);
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

  const allItems: { href: string; labelKey: string; icon: React.ReactNode }[] = [
    { href: "/dashboard", labelKey: "home", icon: <LayoutDashboard size={18} /> },
    { href: "/dashboard/course", labelKey: "courses", icon: <BookOpen size={18} /> },
    ...(examEnabled ? [{ href: "/dashboard/exam", labelKey: "exam", icon: <Trophy size={18} /> }] : []),
    { href: "/dashboard/services", labelKey: "services", icon: <LayoutList size={18} /> },
    { href: "/dashboard/settings", labelKey: "settings", icon: <Settings size={18} /> },
  ];

  const visibleItems = hasPublishedCourse === true
    ? allItems
    : allItems.filter((item) => item.href !== "/dashboard/course");

  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const dockItems: DockItemData[] = visibleItems.map((item) => ({
    icon: item.icon,
    label: t(item.labelKey),
    onClick: () => router.push(item.href),
    className: isNavItemActive(item.href)
      ? "bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/15 dark:border-white/15"
      : "text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white",
  }));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
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
