"use client";

import { useEffect, useState } from "react";
import {
  Car,
  ArrowLeft,
  Users,
  Trophy,
  ShieldAlert,
  LayoutGrid,
  Clock,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  getCachedServicesConfig,
  isGroupExamEnabled,
  getCachedGroupExamEnabled,
} from "@/lib/feature-flags";
import { spaCache } from "@/lib/spa-cache";
import { ServicesViewSkeleton } from "@/components/skeletons";

export interface ServicesViewProps {
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function ServicesView({ navigate }: ServicesViewProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Instant in-memory cache read
  const cachedData = spaCache.get<{
    serviceToggles: Record<string, boolean>;
    groupExamOn: boolean;
    pageEnabled: boolean;
    ongoingCount: number;
    ongoingExam: any;
  }>("spa_services_view");

  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean> | null>(cachedData?.serviceToggles || null);
  const [groupExamOn, setGroupExamOn] = useState<boolean>(cachedData ? cachedData.groupExamOn : true);
  const [pageEnabled, setPageEnabled] = useState<boolean>(cachedData ? cachedData.pageEnabled : true);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData);
  const [ongoingCount, setOngoingCount] = useState<number>(cachedData?.ongoingCount || 0);
  const [ongoingExam, setOngoingExam] = useState<any | null>(cachedData?.ongoingExam || null);
  const [rawChallenges, setRawChallenges] = useState<any[]>([]);

  useEffect(() => {
    if (!user || rawChallenges.length === 0) return;
    const checkOngoing = () => {
      const now = Date.now();
      const activeList = rawChallenges.filter((c: any) => {
        if (!c?.created_at) return false;
        if (c.status === "completed" || c.status === "cancelled" || c.status === "expired") return false;

        const p = c.participants?.find((x: any) => x.user_id === user.id);
        const hasCompleted =
          p?.status === "completed" ||
          p?.status === "abandoned" ||
          p?.status === "rejected" ||
          p?.status === "declined" ||
          p?.status === "expired" ||
          Boolean(p?.exam_attempt_id);
        if (hasCompleted) return false;

        const isCreator = c.creator_id === user.id;
        const ageMs = now - new Date(c.created_at).getTime();

        if (c.status === "pending") {
          if (isCreator) return ageMs <= 60 * 1000;
          if (p?.status === "pending") return ageMs <= 30 * 1000;
          if (p?.status === "joined" || p?.status === "ready") return ageMs <= 60 * 1000;
          return false;
        }

        if (c.status === "active") {
          const isParticipantOrCreator = isCreator || p?.status === "joined" || p?.status === "ready" || p?.status === "in_progress";
          return isParticipantOrCreator && ageMs <= 30 * 60 * 1000;
        }

        return false;
      });
      setOngoingCount(activeList.length);
      setOngoingExam(activeList.length > 0 ? activeList[0] : null);
    };
    const timer = setInterval(checkOngoing, 1000);
    return () => clearInterval(timer);
  }, [rawChallenges, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    Promise.all([
      getCachedServicesConfig(),
      isGroupExamEnabled(),
      user ? fetch("/api/exam-challenges").then((r) => r.json()).catch(() => ({ challenges: [] })) : Promise.resolve({ challenges: [] }),
    ])
      .then(([config, isGroupEnabled, challengesData]) => {
        const pEnabled = config.pageEnabled ?? true;
        const sToggles = config.services || {};
        setPageEnabled(pEnabled);
        setServiceToggles(sToggles);
        setGroupExamOn(isGroupEnabled);

        const list = (challengesData as any)?.challenges || [];
        setRawChallenges(list);
        const now = Date.now();
        const activeList = list.filter((c: any) => {
          if (!user || !c?.created_at) return false;
          if (c.status === "completed" || c.status === "cancelled" || c.status === "expired") return false;

          const p = c.participants?.find((x: any) => x.user_id === user.id);
          const hasCompleted = p?.status === "completed" || p?.status === "abandoned" || p?.status === "rejected" || p?.status === "declined" || p?.status === "expired" || Boolean(p?.exam_attempt_id);
          if (hasCompleted) return false;

          const isCreator = c.creator_id === user.id;
          const ageMs = now - new Date(c.created_at).getTime();

          // Pending challenge: creator/lobby has 60s, pending invitee has 30s
          if (c.status === "pending") {
            if (isCreator) return ageMs <= 60 * 1000;
            if (p?.status === "pending") return ageMs <= 30 * 1000;
            if (p?.status === "joined" || p?.status === "ready") return ageMs <= 60 * 1000;
            return false;
          }

          // Active exam: standard duration is 20m, max active lifetime is 30m
          if (c.status === "active") {
            const isParticipantOrCreator = isCreator || p?.status === "joined" || p?.status === "ready" || p?.status === "in_progress";
            return isParticipantOrCreator && ageMs <= 30 * 60 * 1000;
          }

          return false;
        });

        const count = activeList.length;
        const firstExam = count > 0 ? activeList[0] : null;
        setOngoingCount(count);
        setOngoingExam(firstExam);

        // Store into SPA in-memory cache for instant subsequent tab switching
        spaCache.set("spa_services_view", {
          serviceToggles: sToggles,
          groupExamOn: isGroupEnabled,
          pageEnabled: pEnabled,
          ongoingCount: count,
          ongoingExam: firstExam,
        });
      })
      .catch(() => {
        setServiceToggles({});
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  const fetchServicesConfig = () => {
    getCachedServicesConfig()
      .then((config) => {
        setPageEnabled(config.pageEnabled ?? true);
        setServiceToggles(config.services || {});
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleConfigChange = () => {
      spaCache.delete("spa_services_view");
      fetchServicesConfig();
    };

    window.addEventListener("config-changed", handleConfigChange);
    window.addEventListener("system-config-updated", handleConfigChange);
    return () => {
      window.removeEventListener("config-changed", handleConfigChange);
      window.removeEventListener("system-config-updated", handleConfigChange);
    };
  }, []);

  const tr = (key: string, fallback: string) => {
    const val = t(key);
    return val && val !== key ? val : fallback;
  };

  // During initial cold load without cache, display skeleton
  if (isLoading && !cachedData) {
    return <ServicesViewSkeleton />;
  }

  // If the entire services page is disabled by admin
  if (!pageEnabled) {
    return (
      <div className="min-h-[calc(100vh-80px)] pb-24 animate-in fade-in duration-200">
        <div className="w-full max-w-6xl mx-auto px-4 py-12 text-center">
          <button
            onClick={() => navigate("back", { fallback: "home" })}
            className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-border dark:border-zinc-800 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{tr("back", tr("backToHome", "Subira inyuma"))}</span>
          </button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-zinc-100">
            {tr("services", "Serivisi")}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-md mx-auto">
            {tr("servicesDisabledMessage", "Serivisi zahagaritswe by'agateganyo n'ubuyobozi.")}
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
      titleFallback: "Serivisi yo Gusuzuma Amanota y'Ikizamini Cyemewe",
      descFallback: "Gusuzuma amanota n'ibyavuye mu kizamini cyemewe cy'uruhushya rw'agateganyo na burundu.",
      iconBox: "bg-primary/10 border border-primary/20 text-primary",
      btnClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
      openLabelKey: "liveExamOpen",
      openFallback: "Reba Amanota",
    },
    {
      key: "traffic-assistant",
      view: "external:/traffic-assistant",
      icon: Scale,
      titleKey: "trafficAssistantTitle",
      descKey: "trafficAssistantDesc",
      titleFallback: "Ishakiro ry'Amategeko y'Umuhanda",
      descFallback:
        "Shakisha ibisubizo by'amategeko y'umuhanda mu Rwanda mu rurimi ushaka wifashishije amasomo ya Navo.",
      iconBox: "bg-primary/10 border border-primary/20 text-primary",
      btnClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
      openLabelKey: "openTrafficAssistant",
      openFallback: "Baza Ikibazo",
    },
    {
      key: "driver-hub",
      view: "driver-hub",
      icon: Users,
      titleKey: "findDriver",
      descKey: "findDriverDesc",
      titleFallback: "Shaka Abarimu b'Imyitozo",
      descFallback:
        "Huza n'abarimu babigize umwuga bagufasha kwitoza gutwara ibinyabiziga mu muhanda.",
      iconBox: "bg-primary/10 border border-primary/20 text-primary",
      btnClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
      openLabelKey: "openDrivers",
      openFallback: "Reba Abarimu",
    },
  ];

  // Display only services toggled on by admin. Hide services toggled off by admin.
  const services = allServices.filter((svc) => {
    if (serviceToggles && serviceToggles[svc.key] !== undefined) {
      return serviceToggles[svc.key] === true;
    }

    // Default fallback if not yet configured in system_config:
    if (svc.key === "live-exam") return true;
    if (svc.key === "traffic-assistant") return true;
    if (svc.key === "driver-hub") return false;
    return false;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] pb-28 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="w-full max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
        {/* Navigation & Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("back", { fallback: "home" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-border dark:border-zinc-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{tr("back", tr("backToHome", "Subira inyuma"))}</span>
            </button>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground dark:text-zinc-100">
              {tr("services", "Serivisi")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-2xl leading-snug">
              {tr(
                "servicesDesc",
                "Hitamo serivisi ushaka: ishakiro ry'amategeko y'umuhanda cyangwa gusuzuma amanota y'ikizamini."
              )}
            </p>
          </div>
        </div>

        {/* Ongoing Active Exam Telemetry Banner */}
        {ongoingCount > 0 && (
          <div
            onClick={() => navigate("classmates", { tab: "invitations" })}
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 p-3.5 sm:p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground dark:text-zinc-100 truncate">
                    {tr("ongoingExams", "Ibizamini biri kuba")}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-300">
                    {ongoingCount} {tr("active", "Biri gukora")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground dark:text-zinc-400 truncate">
                  {ongoingExam?.category_name ? `${ongoingExam.category_name} · ` : ""}
                  {tr("viewOngoingOrJoin", "Kanda winjire mu kizamini cy'itsinda.")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
              <span>{tr("join", "Injira")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* Services List */}
        {services.length === 0 ? (
          <div className="rounded-2xl border border-border dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/30 p-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-400">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground dark:text-zinc-200">
              {tr("noServicesAvailable", "Nta serivisi ziriho ubu")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400">
              {tr("noServicesDesc", "Ongera ugerageze nyuma cyangwa ukomeze kwiga.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {services.map((service) => {
              const Icon = service.icon;
              const isLiveExam = service.view === "services/live-exam";
              const isVerified = Boolean(user?.user_metadata?.national_id);

              const handleServiceClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (service.view.startsWith("external:")) {
                  window.location.href = service.view.replace("external:", "");
                } else {
                  navigate(service.view);
                }
              };

              return (
                <div
                  key={service.view}
                  onClick={handleServiceClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleServiceClick(e as any);
                  }}
                  className="rounded-2xl border border-border/90 dark:border-zinc-800/90 bg-card hover:bg-muted/40 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/60 hover:border-border dark:hover:border-zinc-700 p-4 sm:p-5 transition-colors cursor-pointer group flex flex-col justify-between gap-4 select-none"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${service.iconBox}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-foreground dark:text-zinc-100 group-hover:text-primary transition-colors leading-snug">
                          {tr(service.titleKey, service.titleFallback)}
                        </h2>
                        {isLiveExam && (
                          <span
                            className={`text-[11px] font-medium shrink-0 inline-flex items-center gap-1 ${
                              isVerified
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{tr("verified", "Byemejwe")}</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{tr("idRequired", "Indangamuntu")}</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 leading-relaxed line-clamp-2">
                        {tr(service.descKey, service.descFallback)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <Button
                      size="sm"
                      onClick={handleServiceClick}
                      className={`w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 justify-center whitespace-nowrap transition-colors ${service.btnClass || "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
                    >
                      <span>{tr(service.openLabelKey, service.openFallback)}</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}


