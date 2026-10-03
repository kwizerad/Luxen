"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookOpen, Layers } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { CourseManagementView } from "../course-management/CourseManagementView";
import { CourseStudioView } from "../course-studio/CourseStudioView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { canAccess, type User as PermUser } from "@/lib/permissions";

type CourseTab = "management" | "studio";

const VALID_TABS: CourseTab[] = ["management", "studio"];

export default function CoursePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<PermUser | null>(null);
  const [canViewManagement, setCanViewManagement] = useState(true);
  const [canViewStudio, setCanViewStudio] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user as PermUser);
      const mgmt = canAccess(user as PermUser, "courseManagement");
      const studio = canAccess(user as PermUser, "courseStudio");
      setCanViewManagement(mgmt);
      setCanViewStudio(studio);
      if (!mgmt && !studio) {
        router.replace("/Admin");
      }
    };
    loadUser();
  }, [router]);

  const initialTab = (() => {
    const fromUrl = searchParams.get("tab");
    return (VALID_TABS as string[]).includes(fromUrl || "")
      ? (fromUrl as CourseTab)
      : "management";
  })();

  const [activeTab, setActiveTab] = useState<CourseTab>(initialTab);

  // Adjust active tab if the selected tab is not visible
  useEffect(() => {
    if (activeTab === "management" && !canViewManagement && canViewStudio) {
      switchTab("studio");
    } else if (activeTab === "studio" && !canViewStudio && canViewManagement) {
      switchTab("management");
    }
  }, [canViewManagement, canViewStudio]); // eslint-disable-line react-hooks/exhaustive-deps

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
    ...(canViewManagement ? [{ id: "management" as CourseTab, label: t("courseManagementNav") || "Course Management", icon: BookOpen }] : []),
    ...(canViewStudio ? [{ id: "studio" as CourseTab, label: t("courseStudioNav") || "Course Studio", icon: Layers }] : []),
  ];

  return (
    <div className="course-page space-y-4 sm:space-y-5">
      {/* Tab switcher — permanently stable at top, theme-adaptive */}
      <div
        className="sticky top-0 z-30 -mx-1 px-2 py-2 flex flex-wrap items-center gap-2 backdrop-blur-md bg-white/95 dark:bg-[#0B1020]/95 border-b border-[var(--admin-border)] shadow-xs pr-20 sm:pr-24 md:pr-28"
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
            className="gap-2 text-xs sm:text-sm"
            onClick={() => switchTab(id)}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>

      {/* Tab panels — both kept mounted to preserve Course Studio state */}
      {canViewManagement && (
        <div
          role="tabpanel"
          hidden={activeTab !== "management"}
          aria-hidden={activeTab !== "management"}
        >
          <CourseManagementView />
        </div>
      )}
      {canViewStudio && (
        <div
          role="tabpanel"
          hidden={activeTab !== "studio"}
          aria-hidden={activeTab !== "studio"}
        >
          <CourseStudioView />
        </div>
      )}
    </div>
  );
}
