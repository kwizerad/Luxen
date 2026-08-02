"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Trophy, Settings, Home, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { isStandaloneExamEnabled } from "@/lib/supabase/queries";
import { useEffect, useState } from "react";

const LEARNING_LANGUAGES = ["English", "French", "Kinyarwanda"] as const;
type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

const isLearningLanguage = (language: string | null | undefined): language is LearningLanguage =>
  !!language && LEARNING_LANGUAGES.includes(language as LearningLanguage);

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileBottomNavProps {
  hide?: boolean;
}

export function MobileBottomNav({ hide = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language: interfaceLanguage } = useLanguage();
  const { user } = useAuth();
  const [isExamActive, setIsExamActive] = useState(false);
  const [hasPublishedCourse, setHasPublishedCourse] = useState<boolean | null>(null);
  const [examEnabled, setExamEnabled] = useState<boolean>(false);

  // Hide the Courses tab when no published course is available for the student.
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
        console.error("Failed to check published courses:", error);
        setHasPublishedCourse(true); // fail open so the tab remains reachable
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

  // Check if exam is active
  useEffect(() => {
    const checkExamActive = () => {
      const isActive = sessionStorage.getItem('exam-active') === 'true';
      setIsExamActive(isActive);
    };

    checkExamActive();

    const handleExamStateChange = () => {
      checkExamActive();
    };

    window.addEventListener('exam-state-change', handleExamStateChange);
    window.addEventListener('storage', handleExamStateChange);

    return () => {
      window.removeEventListener('exam-state-change', handleExamStateChange);
      window.removeEventListener('storage', handleExamStateChange);
    };
  }, []);

  const navItems: NavItem[] = [
    { href: "/dashboard", labelKey: "home", icon: LayoutDashboard },
    { href: "/dashboard/course", labelKey: "courses", icon: BookOpen },
    ...(examEnabled ? [{ href: "/dashboard/exam", labelKey: "exam", icon: Trophy }] : []),
    { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
  ];

  const visibleNavItems = hasPublishedCourse === false
    ? navItems.filter((item) => item.href !== "/dashboard/course")
    : navItems;

  if (hide) return null;

  // Hide during any active exam
  if (isExamActive) return null;

  // Helper to check if a nav item is active (works with nested routes)
  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") {
      // Dashboard is only active on exact match
      return pathname === href;
    }
    // Other routes are active if pathname starts with the href
    return pathname.startsWith(href);
  };

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-50 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
    >
      {/* Glassmorphism container */}
      <div className="premium-glass-panel student-nav-pill border rounded-[20px] h-14 overflow-hidden shadow-lg">
        <div className={cn("grid h-full", visibleNavItems.length === 4 ? "grid-cols-4" : "grid-cols-5")}>
          {visibleNavItems.map((item) => {
            const isActive = isNavItemActive(item.href);
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "student-nav-btn flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative rounded-xl mx-1 my-1",
                  isActive && "student-nav-active font-semibold"
                )}
                aria-label={t(item.labelKey)}
                aria-current={isActive ? "page" : undefined}
              >
                <div className={cn(
                  "student-nav-icon-wrap p-1.5 rounded-full transition-all duration-200"
                )}>
                  <Icon className={cn(
                    "h-4 w-4 transition-all duration-200",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "text-xs font-medium transition-all duration-200",
                  isActive && "scale-105"
                )}>
                  {t(item.labelKey)}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
