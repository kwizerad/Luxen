"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookOpen, Layers } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { CourseManagementView } from "../course-management/CourseManagementView";
import { CourseStudioView } from "../course-studio/CourseStudioView";
import { Button } from "@/components/ui/button";

type CourseTab = "management" | "studio";

const VALID_TABS: CourseTab[] = ["management", "studio"];

export default function CoursePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = (() => {
    const fromUrl = searchParams.get("tab");
    return (VALID_TABS as string[]).includes(fromUrl || "")
      ? (fromUrl as CourseTab)
      : "management";
  })();

  const [activeTab, setActiveTab] = useState<CourseTab>(initialTab);
  const [tabsVisible, setTabsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide tabs on scroll down, show on scroll up or mouse near top
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 120) {
        setTabsVisible(false);
      } else {
        setTabsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 120) {
        setTabsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Sync activeTab when the URL ?tab= changes externally (e.g. Manage link).
  // Only updates state — never touches the URL, so no loop.
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if ((VALID_TABS as string[]).includes(fromUrl || "") && fromUrl !== activeTab) {
      setActiveTab(fromUrl as CourseTab);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch tab and update URL in one go — no effect, no loop.
  const switchTab = useCallback(
    (tab: CourseTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const tabs: { id: CourseTab; label: string; icon: typeof BookOpen }[] = [
    { id: "management", label: t("courseManagementNav") || "Course Management", icon: BookOpen },
    { id: "studio", label: t("courseStudioNav") || "Course Studio", icon: Layers },
  ];

  return (
    <div className="course-page space-y-5">
      {/* Tab switcher — sticky at top, auto-hides on scroll down */}
      <div
        className={`sticky top-0 z-30 -mx-1 px-1 py-2 flex flex-wrap gap-2 backdrop-blur-md bg-[#0B1020]/80 border-b border-[var(--admin-border)] transition-transform duration-300 ${tabsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}`}
        role="tablist"
        aria-label={t("courseManagementNav") || "Course"}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            variant={activeTab === id ? "default" : "outline"}
            className="gap-2"
            onClick={() => switchTab(id)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Tab panels — both kept mounted to preserve Course Studio state */}
      <div
        role="tabpanel"
        hidden={activeTab !== "management"}
        aria-hidden={activeTab !== "management"}
      >
        <CourseManagementView />
      </div>
      <div
        role="tabpanel"
        hidden={activeTab !== "studio"}
        aria-hidden={activeTab !== "studio"}
      >
        <CourseStudioView />
      </div>
    </div>
  );
}
