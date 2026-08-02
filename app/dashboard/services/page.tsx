"use client";

import Link from "next/link";
import { Car, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function ServicesPage() {
  const { t } = useLanguage();

  const services = [
    {
      href: "/dashboard/services/live-exam",
      icon: Car,
      titleKey: "liveExamResults",
      descKey: "liveExamResultsDesc",
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>

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
              <Link
                key={service.href}
                href={service.href}
                className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
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
                  {t("liveExamOpen")}
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
