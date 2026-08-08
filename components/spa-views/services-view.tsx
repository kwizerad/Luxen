"use client";

import { useEffect, useState } from "react";
import { Car, ArrowLeft, Users, Award } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { getServicesConfig } from "@/lib/supabase/queries";

export interface ServicesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function ServicesView({ navigate }: ServicesViewProps) {
  const { t } = useLanguage();
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    getServicesConfig().then((config) => {
      setServiceToggles(config.services);
    }).catch(() => {
      setServiceToggles({});
    });
  }, []);

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
      key: "driver-hub",
      view: "driver-hub",
      icon: Users,
      titleKey: "findDriver",
      descKey: "findDriverDesc",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      openLabelKey: "openDrivers",
    },
    {
      key: "claim-results",
      view: "services/claim-results",
      icon: Award,
      titleKey: "claimResults",
      descKey: "claimResultsDesc",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      openLabelKey: "openClaimResults",
    },
  ];

  const services = serviceToggles
    ? allServices.filter((svc) => serviceToggles[svc.key] ?? true)
    : allServices;

  return (
    <div className="min-h-[calc(100vh-80px)] pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate("home")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("services")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("servicesDesc")}</p>
        </div>

        {/* Services grid */}
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
      </div>
    </div>
  );
}
