"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookOpen, Layers, Languages, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { CourseManagementView } from "../course-management/CourseManagementView";
import { CourseStudioView } from "../course-studio/CourseStudioView";
import { CourseTranslationStatusView } from "./CourseTranslationStatusView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { canAccess, type User as PermUser } from "@/lib/permissions";
import { translationQueue } from "@/lib/translation-queue";

type CourseTab = "management" | "translation" | "studio";

const VALID_TABS: CourseTab[] = ["management", "translation", "studio"];

export default function CoursePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [canViewManagement, setCanViewManagement] = useState(true);
  const [canViewStudio, setCanViewStudio] = useState(true);
  const [runningTranslationCount, setRunningTranslationCount] = useState(0);

  useEffect(() => {
    const unsub = translationQueue.subscribe((jobs) => {
      setRunningTranslationCount(jobs.filter((j) => j.status === "running").length);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  // Sync activeTab when the URL ?tab= changes externally (e.g. Manage link or Translation Status link).
  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if ((VALID_TABS as string[]).includes(fromUrl || "") && fromUrl !== activeTab) {
      setActiveTab(fromUrl as CourseTab);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = useCallback(
    (tab: CourseTab, extraParams?: Record<string, string>) => {
      setActiveTab(tab);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", tab);
      if (extraParams) {
        Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const canViewTranslation = canViewManagement || canViewStudio;

  const tabs: { id: CourseTab; label: string; icon: typeof BookOpen; badgeCount?: number }[] = [
    ...(canViewManagement
      ? [
          {
            id: "management" as CourseTab,
            label: t("courseManagementNav") || "Course Management",
            icon: BookOpen,
          },
        ]
      : []),
    ...(canViewTranslation
      ? [
          {
            id: "translation" as CourseTab,
            label: "Translation",
            icon: Languages,
            badgeCount: runningTranslationCount,
          },
        ]
      : []),
    ...(canViewStudio
      ? [
          {
            id: "studio" as CourseTab,
            label: t("courseStudioNav") || "Course Studio",
            icon: Layers,
          },
        ]
      : []),
  ];

  return (
    <div className="course-page space-y-4 sm:space-y-5">
      {/* Tab switcher — permanently stable at top, theme-adaptive with curved corners */}
      <div
        className="sticky top-0 z-30 -mx-1 px-2.5 py-2 flex flex-wrap items-center gap-2 rounded-2xl backdrop-blur-md bg-white/95 dark:bg-[#0B1020]/95 border border-[var(--admin-border)] shadow-xs pr-20 sm:pr-24 md:pr-28"
        role="tablist"
        aria-label={t("courseManagementNav") || "Course"}
      >
        {tabs.map(({ id, label, icon: Icon, badgeCount }) => (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            variant={activeTab === id ? "default" : "outline"}
            className="gap-2 text-xs sm:text-sm rounded-xl"
            onClick={() => switchTab(id)}
          >
            {id === "translation" && badgeCount && badgeCount > 0 ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-blue-400" />
            ) : (
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
            <span className="truncate">{label}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold bg-blue-500 text-white animate-pulse">
                {badgeCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Tab panels — kept mounted to preserve state */}
      {canViewManagement && (
        <div
          role="tabpanel"
          hidden={activeTab !== "management"}
          aria-hidden={activeTab !== "management"}
        >
          <CourseManagementView />
        </div>
      )}

      {canViewTranslation && (
        <div
          role="tabpanel"
          hidden={activeTab !== "translation"}
          aria-hidden={activeTab !== "translation"}
        >
          <CourseTranslationStatusView
            onOpenStudioCourse={(courseId) => {
              if (canViewStudio) {
                switchTab("studio", { courseId });
              }
            }}
          />
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
