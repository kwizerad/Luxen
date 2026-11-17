"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  FileText,
  Users,
  Settings,
  Trophy,
  Compass,
  ArrowRight,
  Sparkles,
  Volume2,
  X,
  Languages,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

interface SpotlightItem {
  id: string;
  title: string;
  category: "Apps" | "Courses" | "Exams" | "System";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  badge?: string;
}

interface OSSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (view: string, params?: Record<string, string>) => void;
}

export function OSSpotlight({ isOpen, onClose, navigate }: OSSpotlightProps) {
  const { t, language, setLanguage } = useLanguage();
  const isRw = language === "Kinyarwanda" || language === "rw";
  const isFr = language === "French" || language === "fr";
  const loc = (rw: string, fr: string, en: string) => (isRw ? rw : isFr ? fr : en);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsSmallScreen(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    mq.addListener?.(update);
    return () => mq.removeListener?.(update);
  }, []);

  // Close on Escape or click outside, and forbid opening during exam
  useEffect(() => {
    const isExam = typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true";
    if (isExam && isOpen) {
      onClose();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true") {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const appsLabel = loc("Porogaramu", "Applications", "Apps");
  const coursesCatLabel = loc("Amasomo", "Cours", "Courses");
  const systemLabel = loc("Sisitemu", "Système", "System");

  const items: SpotlightItem[] = useMemo(() => [
    {
      id: "app-home",
      title: isSmallScreen
        ? "nPhone"
        : t("desktop") || loc("Ahabanza ya Navo", "Bureau Navo OS", "Navo Desktop Workspace"),
      category: appsLabel as SpotlightItem["category"],
      icon: Compass,
      action: () => {
        navigate("home");
        onClose();
      },
      shortcut: "⌘1",
    },
    {
      id: "app-course",
      title: t("courses") || loc("Amasomo", "Cours & Leçons", "Courses & Lessons"),
      category: appsLabel as SpotlightItem["category"],
      icon: BookOpen,
      action: () => {
        navigate("course");
        onClose();
      },
      shortcut: "⌘2",
      badge: loc("Amasomo", "Programme", "Curriculum"),
    },
    {
      id: "app-exams",
      title: t("examCenter") || loc("Ikigo cy'Ibizamini", "Centre d'Examen", "Exam Center & Mock Tests"),
      category: appsLabel as SpotlightItem["category"],
      icon: FileText,
      action: () => {
        navigate("exams");
        onClose();
      },
      shortcut: "⌘3",
      badge: loc("Gifite Igihe", "Chronométré", "Timed"),
    },
    {
      id: "app-signs",
      title: t("trafficSignsCatalog") || loc("Ibyapa by'Umuhanda", "Panneaux & Code", "Road Signs & Traffic Regulations"),
      category: coursesCatLabel as SpotlightItem["category"],
      icon: Compass,
      action: () => {
        navigate("course", { module: "signs" });
        onClose();
      },
      badge: loc("Ibyapa", "Signalisation", "Visual Code"),
    },
    {
      id: "app-classmates",
      title: t("classmates") || loc("Abo Mwigana n'Inshuti", "Camarades d'étude", "Classmates & Collaborative Study"),
      category: appsLabel as SpotlightItem["category"],
      icon: Users,
      action: () => {
        navigate("classmates");
        onClose();
      },
      shortcut: "⌘5",
    },
    {
      id: "app-results",
      title: t("resultsAnalytics") || loc("Imitsindire n'Amateka", "Analyses & Historique", "Performance Analytics & History"),
      category: systemLabel as SpotlightItem["category"],
      icon: Trophy,
      action: () => {
        navigate("results");
        onClose();
      },
    },
    {
      id: "app-settings",
      title: t("systemPreferences") || loc("Igenamiterere rya Sisitemu", "Préférences Système", "System Preferences"),
      category: systemLabel as SpotlightItem["category"],
      icon: Settings,
      action: () => {
        navigate("settings");
        onClose();
      },
      shortcut: "⌘,",
    },
    {
      id: "lang-rw",
      title: loc("Hindura Ururimi: Ikinyarwanda", "Changer de langue : Ikinyarwanda", "Switch Language: Ikinyarwanda (Rwanda)"),
      category: systemLabel as SpotlightItem["category"],
      icon: Languages,
      action: () => {
        setLanguage("Kinyarwanda");
        onClose();
      },
      badge: "🇷🇼 RW",
    },
    {
      id: "lang-en",
      title: loc("Hindura Ururimi: English", "Changer de langue : English", "Switch Language: English"),
      category: systemLabel as SpotlightItem["category"],
      icon: Languages,
      action: () => {
        setLanguage("English");
        onClose();
      },
      badge: "🇬🇧 EN",
    },
    {
      id: "lang-fr",
      title: loc("Hindura Ururimi: Français", "Changer de langue : Français", "Switch Language: Français"),
      category: systemLabel as SpotlightItem["category"],
      icon: Languages,
      action: () => {
        setLanguage("French");
        onClose();
      },
      badge: "🇫🇷 FR",
    },
  ], [t, navigate, onClose, setLanguage, isRw, isFr, isSmallScreen, appsLabel, coursesCatLabel, systemLabel]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? filteredItems.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].action();
    }
  };

  if (typeof window !== "undefined" && sessionStorage.getItem("exam-active") === "true") {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            className="relative w-full max-w-2xl bg-card/95 dark:bg-zinc-900/95 text-foreground dark:text-zinc-100 border border-border/70 dark:border-white/15 rounded-2xl shadow-none backdrop-blur-2xl overflow-hidden z-10 flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 dark:border-white/10">
              <Search className="w-5 h-5 text-muted-foreground dark:text-zinc-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={loc(
                  "Shakisha vuba: Fungura porogaramu, amasomo, amategeko...",
                  "Recherche Spotlight : Ouvrir applis, cours, règles...",
                  "Spotlight Search: Launch apps, search modules, rules..."
                )}
                className="w-full bg-transparent border-none outline-hidden text-base text-foreground dark:text-zinc-100 placeholder:text-muted-foreground font-sans"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground dark:text-zinc-400 dark:hover:text-white p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="text-[11px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded border border-border/60 dark:border-white/10 bg-muted/50 dark:bg-white/5">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {loc(
                    "Nta porogaramu cyangwa dosiye ihuye byabonetse.",
                    "Aucune application ni fichier trouvé.",
                    "No matching apps or files found."
                  )}
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-none"
                          : "text-foreground dark:text-zinc-300 hover:bg-muted/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted dark:bg-white/5 text-muted-foreground dark:text-zinc-400 border border-border/60 dark:border-white/10"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p
                            className={`text-[11px] ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {item.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted dark:bg-white/5 text-muted-foreground dark:text-zinc-400 border border-border/60 dark:border-white/10"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.shortcut && (
                          <span
                            className={`text-[11px] font-mono ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Spotlight Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 dark:border-white/10 bg-muted/40 dark:bg-black/20 text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-3">
                <span>↑↓ {loc("Hitamo", "Naviguer", "Navigate")}</span>
                <span>↵ {loc("Fungura", "Ouvrir", "Open")}</span>
              </div>
              <span>{t("spotlightSearch") || "Navo OS Spotlight"}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
