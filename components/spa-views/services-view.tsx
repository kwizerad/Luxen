"use client";

import { useEffect, useState } from "react";
import { Car, ArrowLeft, Users, Trophy, ShieldAlert, LayoutGrid } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import {
  getCachedServicesConfig,
  isGroupExamEnabled,
  getCachedGroupExamEnabled,
} from "@/lib/feature-flags";
import { ServicesViewSkeleton } from "@/components/skeletons";

export interface ServicesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function ServicesView({ navigate }: ServicesViewProps) {
  const { t } = useLanguage();
  const cachedGroup = getCachedGroupExamEnabled();
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean> | null>(null);
  const [groupExamOn, setGroupExamOn] = useState<boolean>(cachedGroup !== null ? cachedGroup : true);
  const [pageEnabled, setPageEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all([
      getCachedServicesConfig(),
      isGroupExamEnabled(),
    ])
      .then(([config, isGroupEnabled]) => {
        setPageEnabled(config.pageEnabled ?? true);
        setServiceToggles(config.services || {});
        setGroupExamOn(isGroupEnabled);
      })
      .catch(() => {
        setServiceToggles({});
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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

