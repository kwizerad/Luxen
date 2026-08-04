"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Trophy, LayoutGrid, Settings, ArrowRight, Play, BookOpenCheck, CheckCircle2, Layers, Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { isStandaloneExamEnabled, getExamAttempts } from "@/lib/supabase/queries";
import { getContinueLearningData, getDashboardStats, type ContinueLearningData, type DashboardStats } from "@/app/dashboard/actions/course";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, language: interfaceLanguage } = useLanguage();
  const { config } = useBrandingConfig();
  const [continueData, setContinueData] = useState<ContinueLearningData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<{ id: string; category_name: string; score_percentage: number; completed_at: string }[]>([]);
  const [examEnabled, setExamEnabled] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    const loadData = async () => {
      try {
        const [data, enabled, dashboardStats, examData] = await Promise.all([
          getContinueLearningData(interfaceLanguage),
          isStandaloneExamEnabled(),
          getDashboardStats(interfaceLanguage),
          getExamAttempts().catch(() => ({ attempts: [] })),
        ]);
        if (mounted) {
          setContinueData(data);
          setExamEnabled(enabled);
          setStats(dashboardStats);
          const attempts = (examData?.attempts || []).slice(0, 3).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            category_name: a.category_name as string,
            score_percentage: a.score_percentage as number,
            completed_at: a.completed_at as string,
          }));
          setRecentAttempts(attempts);
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

  const lessonProgressPercent = stats && stats.totalLessons > 0
    ? Math.round((stats.lessonsCompleted / stats.totalLessons) * 100)
    : 0;

  const statCards = [
    {
      icon: CheckCircle2,
      value: stats ? `${stats.lessonsCompleted}/${stats.totalLessons}` : "—",
      labelKey: "lessonsCompleted",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      icon: Layers,
      value: stats ? `${stats.modulesCompleted}/${stats.totalModules}` : "—",
      labelKey: "modulesCompleted",
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-500",
    },
    {
      icon: Trophy,
      value: stats ? String(stats.examAttemptsCount) : "—",
      labelKey: "examsTaken",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
    {
      icon: Award,
      value: stats?.bestExamScore != null ? `${stats.bestExamScore}%` : "—",
      labelKey: "bestScore",
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
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">
              <span className="text-primary">{config.systemName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {t("welcomeBack")}, {getDisplayName().split(" ")[0]} — {t("continueLearningDesc")}
            </p>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="mb-4 sm:mb-6 grid grid-cols-4 gap-2 sm:gap-3">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border bg-card p-2 sm:p-3 text-center">
                <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${stat.iconBg} ${stat.iconColor}`}>
                  <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </div>
                <div className="font-bold text-sm sm:text-lg leading-none">{stat.value}</div>
                <div className="text-[9px] sm:text-[11px] text-muted-foreground leading-tight line-clamp-1">{t(stat.labelKey)}</div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {stats && stats.totalLessons > 0 && (
          <div className="mb-4 sm:mb-6 rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t("overallProgress")}</span>
              <span className="text-xs sm:text-sm font-bold text-primary">{lessonProgressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${lessonProgressPercent}%` }} />
            </div>
          </div>
        )}

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

        {/* Recent Exam Attempts */}
        {recentAttempts.length > 0 && (
          <div className="mt-4 sm:mt-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm sm:text-base font-semibold">{t("recentExams")}</h2>
            </div>
            <div className="space-y-2">
              {recentAttempts.map((attempt) => (
                <Link
                  key={attempt.id}
                  href="/dashboard/exam"
                  className="flex items-center justify-between rounded-lg sm:rounded-xl border bg-card p-2.5 sm:p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium truncate">{attempt.category_name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold shrink-0 ml-2 ${
                    attempt.score_percentage >= 80 ? "text-green-500" : attempt.score_percentage >= 50 ? "text-orange-500" : "text-red-500"
                  }`}>
                    {attempt.score_percentage}%
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
