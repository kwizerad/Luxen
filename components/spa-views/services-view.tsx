"use client";

import { useEffect, useState } from "react";
import { Car, ArrowLeft, Users, Trophy, ShieldAlert, LayoutGrid, History, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import {
  getCachedServicesConfig,
  isGroupExamEnabled,
  getCachedGroupExamEnabled,
} from "@/lib/feature-flags";
import { ServicesViewSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";

export interface ServicesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function ServicesView({ navigate }: ServicesViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const cachedGroup = getCachedGroupExamEnabled();
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean> | null>(null);
  const [groupExamOn, setGroupExamOn] = useState<boolean>(cachedGroup !== null ? cachedGroup : true);
  const [pageEnabled, setPageEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [ongoingCount, setOngoingCount] = useState<number>(0);
  const [ongoingExam, setOngoingExam] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all([
      getCachedServicesConfig(),
      isGroupExamEnabled(),
      user ? fetch("/api/exam-challenges").then((r) => r.json()).catch(() => ({ challenges: [] })) : Promise.resolve({ challenges: [] }),
    ])
      .then(([config, isGroupEnabled, challengesData]) => {
        setPageEnabled(config.pageEnabled ?? true);
        setServiceToggles(config.services || {});
        setGroupExamOn(isGroupEnabled);

        const list = (challengesData as any)?.challenges || [];
        const activeList = list.filter((c: any) => {
          if (!user) return false;
          const p = c.participants?.find((x: any) => x.user_id === user.id);
          const hasCompleted = p?.status === "completed" || Boolean(p?.exam_attempt_id) || c.status === "completed";
          if (hasCompleted) return false;
          const isParticipantOrCreator = p?.status === "joined" || p?.status === "ready" || p?.status === "pending" || p?.status === "in_progress" || c.creator_id === user.id;
          return isParticipantOrCreator && (c.status === "active" || c.status === "pending");
        });

        setOngoingCount(activeList.length);
        if (activeList.length > 0) {
          setOngoingExam(activeList[0]);
        }
      })
      .catch(() => {
        setServiceToggles({});
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  // During loading / permission evaluation, display skeleton without exposing any restricted UI
  if (isLoading) {
    return <ServicesViewSkeleton />;
  }

  // If the entire services page is disabled by admin
  if (!pageEnabled) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
        <div className="container mx-auto max-w-xl px-4 py-12 text-center">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back") || t("backToHome") || "Back"}
          </button>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t("services") || "Services"}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {t("servicesDisabledMessage") || "Services are currently disabled by administration."}
          </p>
        </div>
      </div>
    );
  }

  const allServices = [
    {
      key: "live-exam",
      view: "services/live-exam",
      icon: Car,
      titleKey: "liveExamResults",
      descKey: "liveExamResultsDesc",
      color: "text-primary",
      bg: "bg-primary/10",
      openLabelKey: "liveExamOpen",
    },
    {
      key: "group-exam",
      view: "services/group-exam",
      icon: Trophy,
      titleKey: "groupExamService",
      descKey: "groupExamServiceDesc",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      openLabelKey: "groupExamOpen",
    },
    {
      key: "exam-history",
      view: "exam-history",
      icon: History,
      titleKey: "examHistory",
      descKey: "examHistoryDesc",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      openLabelKey: "examHistory",
    },
    {
      key: "driver-hub",
      view: "driver-hub",
      icon: Users,
      titleKey: "findDriver",
      descKey: "findDriverDesc",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      openLabelKey: "openDrivers",
    },
  ];

  const services = allServices.filter((svc) => {
    if (svc.key === "group-exam" && !groupExamOn) return false;
    if (serviceToggles && serviceToggles[svc.key] === false) return false;
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
      <div className="container mx-auto max-w-2xl px-4 py-3 sm:py-5">
        {/* Back link */}
        <button
          onClick={() => navigate("back", { fallback: "home" })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back") || t("backToHome") || "Back"}
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("services")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("servicesDesc")}</p>
        </div>

        {/* Ongoing Exams Banner */}
        {ongoingCount > 0 && (
          <div
            onClick={() => navigate("classmates", { tab: "invitations" })}
            className="mb-6 flex items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-primary/5 border border-amber-500/30 hover:border-amber-500/50 cursor-pointer shadow-xs transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {t("ongoingExams") || "Ongoing Exams & Invitations"}
                  </h3>
                  <Badge variant="default" className="bg-amber-600 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 shrink-0">
                    {ongoingCount} {t("active") || "Active"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {ongoingExam?.category_name ? `${ongoingExam.category_name} • ` : ""}{t("viewOngoingOrJoin") || "Click to view active challenges and join your session."}
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
        )}

        {/* Services grid */}
        {services.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-base">{t("noServicesAvailable") || "No services currently available"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("noServicesDesc") || "Please check back later or explore other sections."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.view}
                  onClick={() => navigate(service.view)}
                  className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5 text-left"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${service.bg} ${service.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{t(service.titleKey)}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {t(service.descKey)}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {t(service.openLabelKey)}
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

