"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Trophy, LayoutGrid, Settings, ArrowRight, Play, BookOpenCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { isStandaloneExamEnabled } from "@/lib/supabase/queries";
import { getContinueLearningData, type ContinueLearningData } from "@/app/dashboard/actions/course";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, language: interfaceLanguage } = useLanguage();
  const { config } = useBrandingConfig();
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [examEnabled, setExamEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    const loadData = async () => {
      try {
        const [data, enabled] = await Promise.all([
          getContinueLearningData(interfaceLanguage),
          isStandaloneExamEnabled(),
        ]);
        if (mounted) {
          setContinueData(data);
          setExamEnabled(enabled);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [authLoading, user, interfaceLanguage]);

  const getDisplayName = () => {
    const meta = user?.user_metadata;
    if (meta?.first_name && meta?.last_name) return `${meta.first_name} ${meta.last_name}`;
    return meta?.full_name || meta?.username || user?.email || t("user");
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
      </div>
    );
  }

  const quickLinks = [
    {
      href: "/dashboard/course",
      icon: BookOpen,
      titleKey: "courses",
      descKey: "coursesDesc",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    ...(examEnabled ? [{
      href: "/dashboard/exam",
      icon: Trophy,
      titleKey: "exam",
      descKey: "examDesc",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    }] : []),
    {
      href: "/dashboard/services",
      icon: LayoutGrid,
      titleKey: "services",
      descKey: "servicesDesc",
      iconBg: "bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
      titleKey: "settings",
      descKey: "settingsDesc",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] pb-20 sm:pb-24">
      <div className="container mx-auto max-w-4xl px-4 py-5 sm:py-8">
        {/* Welcome Banner with Logo + System Name */}
        <div className="mb-5 sm:mb-6 flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-primary overflow-hidden shadow-sm relative">
            {config.logoUrl ? (
              <Image
                src={config.logoUrl}
                alt={config.systemName}
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <span className="text-primary-foreground font-bold text-lg sm:text-xl">{config.logoText}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">
              <span className="text-primary">{config.systemName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {t("welcomeBack")}, {getDisplayName().split(" ")[0]} — {t("continueLearningDesc")}
            </p>
          </div>
        </div>

        {/* Continue Learning Card */}
        <div className="mb-4 sm:mb-6">
          {continueData ? (
            <Link
              href={`/dashboard/course?lesson=${continueData.lessonId}`}
              className="group flex items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <Play className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("continueLearning")}
                </p>
                <h3 className="mt-0.5 font-semibold sm:font-bold text-sm sm:text-base truncate">
                  {continueData.lessonTitle}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {continueData.moduleTitle} — {continueData.courseTitle}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <Link
              href="/dashboard/course"
              className="group flex items-center gap-2.5 sm:gap-4 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <BookOpenCheck className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold sm:font-bold text-sm sm:text-base">
                  {t("startLearning")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t("continueLearningDesc")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-5 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h3 className="font-semibold sm:font-bold text-sm sm:text-base leading-tight">{t(item.titleKey)}</h3>
                  <p className="mt-0.5 text-[11px] sm:text-sm text-muted-foreground line-clamp-2">
                    {t(item.descKey)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
