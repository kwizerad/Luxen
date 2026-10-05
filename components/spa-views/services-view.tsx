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
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
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
            <span>{t("back") || t("backToHome") || "Back"}</span>
          </button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground dark:text-zinc-100">{t("services") || "Services"}</h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-md mx-auto">
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
      tag: "service · live exam check",
      badge: "Real-Time Registry",
      titleKey: "liveExamResults",
      descKey: "liveExamResultsDesc",
      titleFallback: "Live Exam Check",
      descFallback: "Verify live national driving test status, check your pass credentials, and retrieve certified exam outcome badges.",
      accentColor: "emerald",
      iconBox: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
      btnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
      openLabelKey: "liveExamOpen",
      openFallback: "Check Status",
    },
    {
      key: "group-exam",
      view: "services/group-exam",
      icon: Trophy,
      tag: "service · multiplayer arena",
      badge: "Live Arena",
      titleKey: "groupExamService",
      descKey: "groupExamServiceDesc",
      titleFallback: "Group Exam Battles",
      descFallback: "Engage in timed head-to-head multiplayer driving test battles with peers and classmates in real-time.",
      accentColor: "amber",
      iconBox: "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400",
      btnClass: "bg-amber-600 hover:bg-amber-500 text-white",
      openLabelKey: "groupExamOpen",
      openFallback: "Enter Arena",
    },
    {
      key: "driver-hub",
      view: "driver-hub",
      icon: Users,
      tag: "network · professional drivers",
      badge: "Driver Directory",
      titleKey: "findDriver",
      descKey: "findDriverDesc",
      titleFallback: "Find Driving Instructors",
      descFallback: "Connect with certified driving instructors and experienced drivers for personalized on-road training.",
      accentColor: "violet",
      iconBox: "bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400",
      badgeClass: "bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400",
      btnClass: "bg-violet-600 hover:bg-violet-500 text-white",
      openLabelKey: "openDrivers",
      openFallback: "Browse Drivers",
    },
  ];

  const services = allServices.filter((svc) => {
    if (svc.key === "group-exam" && !groupExamOn) return false;
    if (serviceToggles && serviceToggles[svc.key] === false) return false;
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] pb-32 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-200">
        
        {/* Navigation & Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("back", { fallback: "home" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:text-foreground/80 bg-card hover:bg-muted/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-border dark:border-zinc-800 transition-colors shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("back") || t("backToHome") || "Back"}</span>
            </button>

            <span className="text-[11px] font-mono tracking-wider text-muted-foreground dark:text-zinc-400 lowercase hidden sm:inline-block">
              services · ecosystem &amp; tools
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-mono tracking-wider text-muted-foreground dark:text-zinc-400 lowercase">
              transport &amp; exam services
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground dark:text-zinc-100">
              {t("services")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 max-w-3xl leading-snug">
              {t("servicesDesc") || "Explore comprehensive traffic, mock driving exam, and verified driver solutions."}
            </p>
          </div>
        </div>

        {/* Ongoing Active Exam Telemetry Banner */}
        {ongoingCount > 0 && (
          <div
            onClick={() => navigate("classmates", { tab: "invitations" })}
            className="rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 p-3.5 sm:p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5 sm:h-5 sm:w-5 animate-pulse" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-100 truncate">
                    {t("ongoingExams") || "Ongoing Exams & Invitations"}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                    {ongoingCount} {t("active") || "Active"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">
                  {ongoingExam?.category_name ? `${ongoingExam.category_name} • ` : ""}{t("viewOngoingOrJoin") || "Click to view active challenges and join your session."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 shrink-0">
              <span>Join Session</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* Services Grid List */}
        {services.length === 0 ? (
          <div className="rounded-2xl border border-border dark:border-zinc-800 bg-card/60 dark:bg-zinc-900/30 p-12 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-400">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground dark:text-zinc-200">{t("noServicesAvailable") || "No services currently available"}</h3>
            <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-400">
              {t("noServicesDesc") || "Please check back later or explore other sections."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {services.map((service) => {
              const Icon = service.icon;
              const isLiveExam = service.view === "services/live-exam";
              const isVerified = Boolean(user?.user_metadata?.national_id);

              return (
                <div
                  key={service.view}
                  onClick={() => navigate(service.view)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(service.view);
                  }}
                  className="rounded-2xl border border-border/90 dark:border-zinc-800/90 bg-card hover:bg-muted/40 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/60 hover:border-border dark:hover:border-zinc-700 p-4 sm:p-5 transition-all duration-150 cursor-pointer group flex flex-col justify-between select-none shadow-xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${service.iconBox}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {isLiveExam ? (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${
                          isVerified
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                        }`}>
                          {isVerified ? (
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {t("verified") || "Verified"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              {t("idRequired") || "ID Check"}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted dark:bg-zinc-800/80 text-muted-foreground dark:text-zinc-400 border border-border/80 dark:border-zinc-700/60 shrink-0 lowercase">
                          {service.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-wide text-muted-foreground dark:text-zinc-400 lowercase block truncate">
                        {service.tag}
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-foreground dark:text-zinc-100 group-hover:text-primary transition-colors leading-snug">
                        {t(service.titleKey) || service.titleFallback}
                      </h2>
                    </div>

                    <p className="text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed line-clamp-3">
                      {t(service.descKey) || service.descFallback}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80 dark:border-zinc-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-400 lowercase">
                      {service.key}
                    </span>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 dark:text-zinc-300 group-hover:text-primary transition-colors">
                      <span>{t(service.openLabelKey) || service.openFallback}</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
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


