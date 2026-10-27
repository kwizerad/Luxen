"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Compass,
  Search,
  Volume2,
  VolumeX,
  Wifi,
  Moon,
  Sun,
  Laptop,
  Maximize,
  Minimize,
  LogOut,
  Settings,
  HelpCircle,
  Sparkles,
  BookOpen,
  FileText,
  Languages,
  Check,
  ChevronDown,
  LayoutGrid,
  Eye,
  EyeOff,
  RotateCcw,
  CloudSun,
  Battery,
  BatteryCharging,
  SlidersHorizontal,
  Calendar as CalendarIcon,
  Bell,
  CheckCircle2,
  Car,
  Award,
  Play,
  RotateCw,
  Bookmark,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useBrandingConfig } from "@/lib/branding-config";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { useDesktopWidgets } from "@/lib/desktop-widgets";
import { formatLocalizedDate } from "@/lib/date-utils";

interface OSSystemBarProps {
  activeView: string;
  navigate: (view: string, params?: Record<string, string>) => void;
  onOpenSpotlight: () => void;
}

export function OSSystemBar({ activeView, navigate, onOpenSpotlight }: OSSystemBarProps) {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { config } = useBrandingConfig();
  const { theme, setTheme } = useTheme();
  const { dismissed, hide, restore, restoreAll, isHidden, availableWidgets } = useDesktopWidgets();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/";
  };

  const [mounted, setMounted] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(80);
  const [isWifiConnected, setIsWifiConnected] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isCharging, setIsCharging] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"Category A" | "Category B" | "Category C">("Category B");
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsWifiConnected(navigator.onLine);
      const updateOnlineStatus = () => setIsWifiConnected(navigator.onLine);
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      // Attempt live Battery API query if supported by the browser
      if ("getBattery" in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
          battery.addEventListener("chargingchange", () => {
            setIsCharging(battery.charging);
          });
        }).catch(() => {});
      }

      return () => {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      };
    }
  }, []);

  // Live Kigali Rwanda Clock (GMT+2) and localized date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          timeZone: "Africa/Kigali",
          hour: "numeric",
          minute: "2-digit",
        })
      );
      setDateStr(
        formatLocalizedDate(now, language, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const appDisplayName = useMemo(() => {
    switch (activeView) {
      case "course":
      case "terminal":
      case "traffic-rules":
        return t("courseStudio") || "Course Studio";
      case "exam":
      case "exams":
        return t("examCenter") || "Exam Center";
      case "driver-hub":
      case "services/drivers":
        return t("driverHub") || "Driver Hub";
      case "classmates":
        return t("classmates") || "Classmates";
      case "results":
        return t("resultsAnalytics") || "Analytics";
      case "settings":
        return t("systemPreferences") || "System Preferences";
      case "services":
        return t("services") || "Services";
      default:
        return t("desktop") || "Navo OS";
    }
  }, [activeView, t]);

  const langCode = language === "French" ? "FR" : language === "Kinyarwanda" ? "RW" : "EN";
  const langFlag = language === "French" ? "🇫🇷" : language === "Kinyarwanda" ? "🇷🇼" : "🇬🇧";

  const isExamView = activeView === "exam" || activeView === "exams";
  const isCourseView = activeView === "course" || activeView === "traffic-rules" || activeView === "terminal";
  const isDriverView = activeView === "driver-hub" || activeView === "services/drivers";

  return (
    <header className="fixed top-0 left-0 right-0 h-9 z-[80] bg-card/90 dark:bg-black/85 backdrop-blur-xl border-b border-border/60 dark:border-white/10 text-foreground dark:text-zinc-200 select-none flex items-center justify-between px-3 text-xs font-sans transition-colors">
      {/* Left: Navo OS System Menu + App Name + Context-Aware Menus */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Navo System Logo Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer font-bold transition-colors outline-hidden shadow-none"
            >
              <div className="w-4 h-4 rounded bg-emerald-500 text-black flex items-center justify-center font-black text-[10px] leading-none shadow-none">
                N
              </div>
              <span className="font-semibold tracking-tight hidden sm:inline text-foreground dark:text-white">Navo</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]"
          >
            <DropdownMenuLabel className="text-[11px] font-mono text-muted-foreground dark:text-zinc-400 px-2 py-1">
              Navo OS v2.4 (Rwanda Traffic Code)
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={() => navigate("home")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t("desktop") || "Desktop Workspace"}</span>
              <span className="font-mono text-[10px] text-muted-foreground">⌘1</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("course")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t("courseStudio") || "Course Studio"}</span>
              <span className="font-mono text-[10px] text-muted-foreground">⌘2</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("exams")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t("examCenter") || "Exam Center"}</span>
              <span className="font-mono text-[10px] text-muted-foreground">⌘3</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("settings")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t("systemPreferences") || "System Preferences..."}</span>
              <span className="font-mono text-[10px] text-muted-foreground">⌘,</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={toggleFullscreen}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
              <span className="font-mono text-[10px] text-muted-foreground">F11</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onOpenSpotlight()}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span>{t("spotlightSearch") || "Spotlight Search"}</span>
              <span className="font-mono text-[10px] text-muted-foreground">⌘K</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-rose-500 dark:text-rose-400 cursor-pointer hover:bg-rose-500/15"
            >
              <span>{t("logOut") || "Sign Out"}</span>
              <LogOut className="w-3.5 h-3.5" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Active Application Name in bold */}
        <span className="font-bold text-foreground dark:text-white px-2 py-0.5 rounded tracking-tight">
          {appDisplayName}
        </span>

        {/* Context-Aware OS Menu Items */}
        <div className="hidden md:flex items-center gap-0.5 text-muted-foreground dark:text-zinc-300">
          {/* Dynamic App-Specific Menu 1: If Inside Exam Center */}
          {isExamView ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden shadow-none font-semibold text-foreground dark:text-white">
                  Exam
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]">
                <DropdownMenuItem
                  onClick={() => navigate("exams")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Official 20-Question Simulation
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("results")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  View Performance Transcripts
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate("home")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Exit Exam & Return to Desktop
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isCourseView ? (
            /* Dynamic App-Specific Menu 2: If Inside Course Studio */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden shadow-none font-semibold text-foreground dark:text-white">
                  Curriculum
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]">
                <DropdownMenuItem
                  onClick={() => navigate("course")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Full Traffic Modules List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("course", { module: "signs" })}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Traffic Signs Visual Catalog
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("course", { module: "rules" })}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Rwanda Traffic Code (Law 55/2013)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Standard Desktop File Menu */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden shadow-none">
                  File
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]">
                <DropdownMenuItem
                  onClick={() => navigate("course")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Open Course Studio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("exams")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Take Practice Exam
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("results")}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Study Transcripts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden shadow-none">
                View
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]">
              <DropdownMenuItem
                onClick={() => navigate("home")}
                className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
              >
                Desktop Workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
              >
                {isFullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
              </DropdownMenuItem>
              {dismissed.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      restoreAll();
                      if (activeView !== "home") navigate("home");
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <span>Restore All Hidden Cards</span>
                    <span className="font-mono text-[10px]">{dismissed.length}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* OS-Bar Widgets Menu (Allows user to selectively restore dismissed cards) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden transition-colors shadow-none text-muted-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white"
              >
                <span>Widgets</span>
                {dismissed.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-mono leading-none">
                    {dismissed.length} hidden
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1.5 z-[150]">
              <div className="flex items-center justify-between px-2 py-1">
                <DropdownMenuLabel className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground dark:text-zinc-400 p-0">
                  Desktop Widgets
                </DropdownMenuLabel>
                {dismissed.length > 0 && (
                  <button
                    type="button"
                    onClick={restoreAll}
                    className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 shadow-none"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Restore All</span>
                  </button>
                )}
              </div>
              <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10 my-1" />

              {availableWidgets.map((w) => {
                const hidden = isHidden(w.id);
                return (
                  <DropdownMenuItem
                    key={w.id}
                    onClick={() => {
                      if (hidden) {
                        restore(w.id);
                      } else {
                        hide(w.id);
                      }
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {hidden ? (
                        <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className={hidden ? "text-muted-foreground line-through truncate text-[11px]" : "text-foreground dark:text-zinc-200 truncate text-[11px]"}>
                        {w.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        hidden
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "text-muted-foreground"
                      }`}
                    >
                      {hidden ? "Restore" : "Visible"}
                    </span>
                  </DropdownMenuItem>
                );
              })}

              <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10 my-1" />
              <div className="px-2 py-1 text-[10px] text-muted-foreground dark:text-zinc-400 leading-tight">
                Cards removed with &apos;x&apos; are never restored automatically unless you decide here.
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-0.5 rounded hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer outline-hidden shadow-none">
                Help
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]">
              <DropdownMenuItem
                onClick={() => onOpenSpotlight()}
                className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
              >
                Spotlight Search (⌘K)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("course", { module: "rules" })}
                className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
              >
                Rwanda Traffic Regulations Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right: Realistic OS System Tray (Weather, Connectivity, Battery, Control Center, Clock, User) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Kigali Live Weather Widget */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Kigali, Rwanda Weather"
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 text-muted-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer text-[11px] shadow-none"
            >
              <CloudSun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="font-medium">24°C</span>
              <span className="text-[10px] text-muted-foreground hidden xl:inline">Kigali</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-2.5 z-[150]"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border/60 dark:border-white/10">
              <span className="font-semibold text-xs text-foreground dark:text-white">Kigali, Rwanda</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <CloudSun className="w-6 h-6 text-amber-500" />
                <div>
                  <div className="text-base font-bold text-foreground dark:text-white">24°C</div>
                  <div className="text-[10px] text-muted-foreground">Sunny Intervals</div>
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground space-y-0.5">
                <div>Humidity: 62%</div>
                <div>Wind: 8 km/h</div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Real Network & Wi-Fi Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={isWifiConnected ? "Network: Connected (Online)" : "Network: Disconnected (Offline)"}
              className="p-1 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 text-muted-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer shadow-none"
            >
              <Wifi className={`w-3.5 h-3.5 ${isWifiConnected ? "text-emerald-500" : "text-rose-500"}`} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-2 z-[150]"
          >
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-foreground dark:text-white">Network Connection</span>
              <span className={`text-[10px] font-mono ${isWifiConnected ? "text-emerald-500" : "text-rose-500"}`}>
                {isWifiConnected ? "Online" : "Offline"}
              </span>
            </div>
            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10 my-1" />
            <div className="px-2 py-1 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Status:</span>
                <span className={isWifiConnected ? "text-emerald-600 dark:text-emerald-400 font-mono" : "text-rose-500 font-mono"}>
                  {isWifiConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Type:</span>
                <span className="font-semibold text-foreground dark:text-white font-mono">Browser Network</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Battery Status Indicator */}
        <div
          title={`Battery: ${batteryLevel}% ${isCharging ? "(Charging)" : ""}`}
          className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono text-muted-foreground dark:text-zinc-300"
        >
          {isCharging ? (
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Battery className="w-3.5 h-3.5 text-foreground dark:text-zinc-300" />
          )}
          <span className="text-[10px] font-medium">{batteryLevel}%</span>
        </div>

        {/* Spotlight Trigger */}
        <button
          type="button"
          onClick={onOpenSpotlight}
          title="Spotlight Search (⌘K)"
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 text-muted-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer shadow-none"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] hidden md:inline text-muted-foreground">⌘K</span>
        </button>

        {/* Global Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 text-foreground dark:text-zinc-200 transition-colors cursor-pointer font-mono text-[11px] shadow-none"
            >
              <span>{langFlag}</span>
              <span className="font-semibold">{langCode}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1 z-[150]"
          >
            <DropdownMenuLabel className="text-[10px] font-mono uppercase text-muted-foreground dark:text-zinc-400 px-2 py-1">
              Select Language
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setLanguage("Kinyarwanda")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <div className="flex items-center gap-2">
                <span>🇷🇼</span>
                <span>Ikinyarwanda</span>
              </div>
              {language === "Kinyarwanda" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("English")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <div className="flex items-center gap-2">
                <span>🇬🇧</span>
                <span>English</span>
              </div>
              {language === "English" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLanguage("French")}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              <div className="flex items-center gap-2">
                <span>🇫🇷</span>
                <span>Français</span>
              </div>
              {language === "French" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* OS Control Center Modal (Volume, Display, Sound, Focus Mode) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Navo OS Control Center"
              className="p-1 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 text-muted-foreground dark:text-zinc-300 hover:text-foreground dark:hover:text-white transition-colors cursor-pointer shadow-none"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-2xl shadow-none p-3 z-[150] space-y-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/60 dark:border-white/10">
              <span className="font-bold text-xs text-foreground dark:text-white">Control Center</span>
              <span className="text-[10px] font-mono text-muted-foreground">Kigali Workspace</span>
            </div>

            {/* Quick Toggle 1: Theme Switcher Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Appearance</span>
              <div className="grid grid-cols-3 gap-1.5 bg-muted/50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-none ${
                    theme === "light"
                      ? "bg-card text-foreground font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-none ${
                    theme === "dark"
                      ? "bg-card text-foreground font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-none ${
                    theme === "system"
                      ? "bg-card text-foreground font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Laptop className="w-3 h-3 text-emerald-500" />
                  <span>Auto</span>
                </button>
              </div>
            </div>

            {/* Quick Toggle 2: Audio Volume Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Sound & Voice</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {isAudioMuted ? "Muted" : `${audioVolume}%`}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="p-1 rounded-md text-foreground hover:bg-muted cursor-pointer shadow-none"
                >
                  {isAudioMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-500" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isAudioMuted ? 0 : audioVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAudioVolume(val);
                    if (val > 0 && isAudioMuted) setIsAudioMuted(false);
                    if (val === 0) setIsAudioMuted(true);
                  }}
                  className="w-full h-1.5 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Quick Toggle 3: Focus Study Mode */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block text-foreground dark:text-white">Exam Focus Mode</span>
                <span className="text-[10px] text-muted-foreground block">Mute popups & study distraction-free</span>
              </div>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer p-0.5 shadow-none flex items-center ${
                  focusMode ? "bg-emerald-600 justify-end" : "bg-muted-foreground/30 justify-start"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-none" />
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Dropdown */}
        <div className="rounded-md hover:bg-muted/70 dark:hover:bg-white/10 p-0.5 transition-colors">
          <NotificationsDropdown />
        </div>

        {/* Live Kigali Clock with Calendar Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning
              title="Kigali, Rwanda Local Time (GMT+2)"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted/70 dark:hover:bg-white/10 cursor-pointer font-mono text-[11px] text-foreground dark:text-zinc-200 shadow-none transition-colors"
            >
              <span suppressHydrationWarning className="hidden lg:inline text-muted-foreground dark:text-zinc-400">
                {mounted ? dateStr : ""}
              </span>
              <span suppressHydrationWarning className="font-semibold text-foreground dark:text-white">
                {mounted ? timeStr : "12:00 PM"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-2xl shadow-none p-3 z-[150] space-y-2"
          >
            <div className="flex items-center justify-between pb-1 border-b border-border/60 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-xs text-foreground dark:text-white">{dateStr}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">Kigali (GMT+2)</span>
            </div>
            <div className="text-center py-2 bg-muted/40 rounded-xl space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground dark:text-white">{timeStr}</div>
              <p className="text-[10px] text-muted-foreground font-mono">Central Africa Time (CAT)</p>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              Official study sessions, mock exam timers, and instructor bookings follow Kigali local time.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar & Licensing Category Menu (NO Police Credentials / Registration code) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-emerald-500/30 transition-all cursor-pointer outline-hidden shadow-none"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] overflow-hidden shadow-none">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-60 bg-popover dark:bg-zinc-900/95 backdrop-blur-2xl border-border/80 dark:border-white/10 text-popover-foreground dark:text-zinc-200 rounded-xl shadow-none p-1.5 z-[150]"
          >
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-foreground dark:text-white truncate">
                {user?.user_metadata?.full_name || user?.email || "Student Account"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || "Signed In"}</p>
            </div>

            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />

            {/* Target Driving License Category Selector */}
            <div className="px-2 py-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
                Target License Goal
              </span>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {selectedCategory}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {selectedCategory === "Category B" ? "Light Vehicles" : selectedCategory === "Category A" ? "Motorcycles" : "Heavy Vehicles"}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />

            <DropdownMenuItem
              onClick={() => navigate("results")}
              className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              {t("myReports") || "My Performance & Reports"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("settings")}
              className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10 dark:hover:text-white"
            >
              {t("systemPreferences") || "Account Preferences"}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border/60 dark:bg-white/10" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="px-2.5 py-1.5 rounded-lg text-xs text-rose-500 dark:text-rose-400 cursor-pointer hover:bg-rose-500/15 flex items-center justify-between"
            >
              <span>{t("logOut") || "Sign Out"}</span>
              <LogOut className="w-3.5 h-3.5" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
