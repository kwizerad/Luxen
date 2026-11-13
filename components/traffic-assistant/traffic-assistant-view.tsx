"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Scale,
  BookOpen,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Car,
  Check,
  RotateCcw,
  ShieldAlert,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { getCachedServicesConfig } from "@/lib/feature-flags";
import { SupportedLanguage, AssistantAnswerResult } from "@/lib/search-similarity";

interface TrafficAssistantViewProps {
  initialQuery?: string;
}

const QUICK_TOPICS: Record<SupportedLanguage, Array<{ label: string; query: string }>> = {
  rw: [
    { label: "Amasangano azunguruka", query: "Ni nde ufite uburenganzira bwo gutambuka mbere mu masangano azunguruka (rond-point)?" },
    { label: "Umuvuduko mu nsisiro", query: "Umuvuduko ntarengwa w'ikinyabiziga mu nsisiro cyangwa mu migi ni uwuhe?" },
    { label: "Kunyuranaho mu muhanda", query: "Ni ryari biba bibujijwe kunyuranaho ku wundi muyobozi w'ikinyabiziga?" },
    { label: "Ibyapa by'integuza", query: "Ibyapa by'integuza n'ibibuzwa bitandukaniye he mu ishusho n'amabara?" },
    { label: "Ibihano byo gutwara wasinze", query: "Ibihano biteganyijwe ku mushoferi watwaye ikinyabiziga yanyoye ibisindisha ni ibihe?" },
  ],
  en: [
    { label: "Roundabout Right of Way", query: "Who has the right of way at a roundabout in Rwanda?" },
    { label: "Speed Limits in Town", query: "What is the maximum legal speed limit inside urban and built-up areas?" },
    { label: "Overtaking Rules", query: "When and where is overtaking strictly prohibited by Rwandan traffic law?" },
    { label: "Road Signs Types", query: "What is the difference between warning signs and prohibitory signs?" },
    { label: "Drink Driving Fines", query: "What are the legal fines and penalties for driving under the influence in Rwanda?" },
  ],
  fr: [
    { label: "Priorité au rond-point", query: "Qui a la priorité de passage dans un carrefour à sens giratoire au Rwanda ?" },
    { label: "Vitesse en agglomération", query: "Quelle est la vitesse maximale autorisée en agglomération au Rwanda ?" },
    { label: "Interdiction de dépasser", query: "Quelles sont les règles et interdictions strictes concernant le dépassement ?" },
    { label: "Panneaux de signalisation", query: "Comment différencier les panneaux de danger et les panneaux d'interdiction ?" },
    { label: "Alcool au volant", query: "Quelles sont les sanctions et amendes prévues pour conduite en état d'ivresse ?" },
  ],
};

export function TrafficAssistantView({ initialQuery = "" }: TrafficAssistantViewProps) {
  const { language: siteLang } = useLanguage();
  const { user } = useAuth();
  const [selectedLang, setSelectedLang] = useState<"auto" | SupportedLanguage>("auto");
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantAnswerResult | null>(null);
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});
  const [expandedGazette, setExpandedGazette] = useState<boolean>(true);
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const checkService = () => {
      getCachedServicesConfig()
        .then((cfg) => {
          if (!cfg.pageEnabled || cfg.services["traffic-assistant"] === false) {
            setIsServiceEnabled(false);
          } else {
            setIsServiceEnabled(true);
          }
        })
        .catch(() => {
          setIsServiceEnabled(true);
        });
    };

    checkService();

    window.addEventListener("config-changed", checkService);
    window.addEventListener("system-config-updated", checkService);
    return () => {
      window.removeEventListener("config-changed", checkService);
      window.removeEventListener("system-config-updated", checkService);
    };
  }, []);

  // Active UI language determination (defaults to Kinyarwanda on public browser access)
  const effectiveLang: SupportedLanguage =
    selectedLang === "auto"
      ? siteLang === "French"
        ? "fr"
        : siteLang === "English"
        ? "en"
        : "rw"
      : selectedLang;

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setSearchError(null);
    setRevealedQuestions({});

    try {
      const res = await fetch("/api/traffic-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          language: selectedLang === "auto" ? undefined : selectedLang,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.directAnswer) {
        const msg =
          data?.error ||
          (effectiveLang === "fr"
            ? "Impossible d'effectuer la recherche pour le moment. Veuillez réessayer."
            : effectiveLang === "en"
            ? "Could not complete the search right now. Please try again."
            : "Gushakisha ntibishobotse aka kanya. Ongera ugerageze.");
        setSearchError(msg);
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Traffic Assistant error:", err);
      setSearchError(
        effectiveLang === "fr"
          ? "Erreur de connexion réseau. Vérifiez votre internet et réessayez."
          : effectiveLang === "en"
          ? "Network error while searching. Please check your connection and try again."
          : "Habaye ikibazo cyo guhuza na murandasi. Ongera ugerageze."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const toggleQuestionReveal = (id: string) => {
    setRevealedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isAuthLocked = !user || Boolean(result?.requiresAuthForFullAccess);
  const authRedirectHref = user ? "/dashboard#exam" : "/?auth=login";
  const courseAuthHref = user ? "/dashboard#courses" : "/?auth=login";

  if (isServiceEnabled === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-border p-7 bg-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            {effectiveLang === "fr"
              ? "Assistant du Code de la Route"
              : effectiveLang === "en"
              ? "Traffic Rules & Gazette Assistant"
              : "Ishakiro ry'Amategeko y'Umuhanda"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {effectiveLang === "fr"
              ? "Ce service est actuellement désactivé par l'administration."
              : effectiveLang === "en"
              ? "This service is currently disabled by administration."
              : "Iyi serivisi yahagaritswe by'agateganyo n'ubuyobozi."}
          </p>
          <a
            href={user ? "/dashboard#services" : "/"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            {user ? "Subira kuri Serivisi" : "Subira Ahabanza"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Header Bar */}
      <header className="border-b border-border/80 sticky top-0 z-30 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                <Car className="h-4 w-4" />
              </div>
              <span>Navo</span>
            </a>
            <span className="text-muted-foreground/60 text-xs hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground hidden sm:inline font-mono lowercase truncate">
              ishakiro ry&apos;amategeko y&apos;umuhanda
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selection */}
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-muted/40 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setSelectedLang("auto")}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLang === "auto"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("rw")}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLang === "rw"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                RW
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("en")}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLang === "en"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setSelectedLang("fr")}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLang === "fr"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                FR
              </button>
            </div>

            <a
              href={authRedirectHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <span>
                {user
                  ? effectiveLang === "fr"
                    ? "Examens"
                    : effectiveLang === "en"
                    ? "Practice Exams"
                    : "Ibizamini"
                  : effectiveLang === "fr"
                  ? "Connexion"
                  : effectiveLang === "en"
                  ? "Sign In"
                  : "Injira"}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">
        {/* Title & Description (Default Kinyarwanda per specification) */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground tracking-wide lowercase">
            <Scale className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>igazeti ya leta · isesengura ry&apos;amasomo ya navo</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight text-balance">
            {effectiveLang === "fr"
              ? "Recherchez le Code de la route rwandais dans toute langue"
              : effectiveLang === "en"
              ? "Search Rwanda Road Traffic Rules in Any Language"
              : "Shakisha amategeko y'umuhanda n'ibisubizo mu rurimi urwo ari rwo rwose"}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {effectiveLang === "fr"
              ? "Posez votre question dans n'importe quelle langue pour recevoir une réponse basée sur la similarité avec les cours et questions Navo. Connectez-vous pour accéder aux cours complets et examens."
              : effectiveLang === "en"
              ? "Ask a driving law question in any language to get similarity-matched answers from Navo lessons, exams, and the Rwanda Gazette. Sign in to access full courses and mock tests."
              : "Baza ikibazo mu rurimi urwo ari rwo rwose, sisitemu isesengure amasomo n'ibibazo biri mu bubiko bwa Navo iguhereze igisubizo gihuye neza n'icyo wabajije. Injira muri konti kugira ngo wige amasomo yose n'ibizamini."}
          </p>
        </div>

        {/* Responsive Search Input Box (stacks cleanly on <640px, inline on sm+) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <div className="flex items-center flex-1 min-w-0">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground ml-2 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder={
                  effectiveLang === "fr"
                    ? "Posez votre question (dans toute langue)..."
                    : effectiveLang === "en"
                    ? "Ask a traffic question (in any language)..."
                    : "Andika ikibazo mu rurimi ushaka..."
                }
                className="w-full min-w-0 bg-transparent px-2.5 py-2 text-sm sm:text-base outline-none placeholder:text-muted-foreground/70"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Clear"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="w-full sm:w-auto h-10 px-4 sm:px-5 rounded-xl font-semibold shrink-0 gap-1.5 shadow-xs whitespace-nowrap cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>
                    {effectiveLang === "fr"
                      ? "Recherche..."
                      : effectiveLang === "en"
                      ? "Searching..."
                      : "Gushakisha..."}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    {effectiveLang === "fr"
                      ? "Rechercher"
                      : effectiveLang === "en"
                      ? "Search"
                      : "Shakisha"}
                  </span>
                </>
              )}
            </Button>
          </div>

          {/* Quick Suggestion Chips (wraps cleanly, zero horizontal scrollbar) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80 mr-0.5">
              {effectiveLang === "fr"
                ? "Sujets rapides :"
                : effectiveLang === "en"
                ? "Quick topics:"
                : "Ingingo zihuse:"}
            </span>
            {QUICK_TOPICS[effectiveLang].map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(t.query);
                  handleSearch(t.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors cursor-pointer text-[11px] sm:text-xs"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visible Error Banner if API/Network fails */}
        {searchError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-2.5 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Loading State Skeleton */}
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded-md w-1/3" />
            <div className="h-6 bg-muted rounded-md w-3/4" />
            <div className="h-4 bg-muted rounded-md w-full" />
            <div className="h-4 bg-muted rounded-md w-5/6" />
          </div>
        )}

        {/* Search Results Display */}
        {!loading && result && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. Primary Similarity Answer (Single Elevated Hero Section) */}
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-7 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    {effectiveLang === "fr"
                      ? "Réponse basée sur la similarité"
                      : effectiveLang === "en"
                      ? "Verified Similarity Answer"
                      : "Igisubizo gishingiye ku isesengura ry'ububiko"}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {[
                    result.similarityScore ? `${result.similarityScore}% match` : null,
                    result.detectedLanguageName || null,
                    result.source === "ai_grounded" ? "AI · Gazette & Courses" : "DB Similarity",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>

              <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-line">
                {result.directAnswer}
              </div>
            </section>

            {/* 2. Official Rwanda Gazette Legal Citations */}
            {result.gazetteArticles && result.gazetteArticles.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                  onClick={() => setExpandedGazette(!expandedGazette)}
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      {effectiveLang === "fr"
                        ? "Référence Journal Officiel du Rwanda"
                        : effectiveLang === "en"
                        ? "Official Gazette of Rwanda Reference"
                        : "Ingingo y'Igazeti ya Leta y'u Rwanda"}
                    </h3>
                  </div>
                  <span className="text-muted-foreground hover:text-foreground p-1">
                    {expandedGazette ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {expandedGazette && (
                  <div className="divide-y divide-border/70">
                    {result.gazetteArticles.map((article) => (
                      <div key={article.id} className="pt-3 first:pt-1 space-y-2">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                            {article.articleNumber} · {article.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {article.decreeRef}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                          {article.excerpt}
                        </p>

                        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                          <ul className="space-y-1 pt-1">
                            {article.keyTakeaways.map((takeaway, tIdx) => (
                              <li
                                key={tIdx}
                                className="text-xs text-foreground/80 flex items-start gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{takeaway}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 3. Related Course Lessons Used for Matching (Unified list; login required for full access) */}
            {result.matchedLessons && result.matchedLessons.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      {effectiveLang === "fr"
                        ? "Leçons similaires dans la base Navo"
                        : effectiveLang === "en"
                        ? "Matched Course Lessons in Navo"
                        : "Amasomo afitanye isano mu bubiko bwa Navo"}
                    </h3>
                  </div>
                  {isAuthLocked && (
                    <span className="text-[11px] font-mono text-muted-foreground inline-flex items-center gap-1 shrink-0">
                      <Lock className="h-3 w-3" />
                      <span className="hidden sm:inline">
                        {effectiveLang === "rw" ? "Injira usome byose" : "Login for full lesson"}
                      </span>
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border/70">
                  {result.matchedLessons.map((lesson) => (
                    <a
                      key={lesson.id}
                      href={courseAuthHref}
                      className="py-3 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {lesson.title}
                          </h4>
                          {lesson.similarityPercent ? (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {lesson.similarityPercent}%
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {lesson.summary}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-primary inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        {isAuthLocked ? (
                          <>
                            <Lock className="h-3 w-3" />
                            <span>
                              {effectiveLang === "fr"
                                ? "Se connecter"
                                : effectiveLang === "en"
                                ? "Sign in to study"
                                : "Injira wige isomo"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>
                              {effectiveLang === "fr"
                                ? "Ouvrir la leçon"
                                : effectiveLang === "en"
                                ? "Study Lesson"
                                : "Soma isomo"}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* 4. Practice Questions (Authenticated Users Only) */}
            {!isAuthLocked && result.sampleQuestions && result.sampleQuestions.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <h3 className="text-sm font-bold text-foreground">
                      {effectiveLang === "fr"
                        ? "Questions d'examen correspondantes"
                        : effectiveLang === "en"
                        ? "Matched Practice Exam Questions"
                        : "Ibibazo by'imyitozo bijyanye n'iki kibazo"}
                    </h3>
                  </div>
                </div>

                <div className="divide-y divide-border/70">
                  {result.sampleQuestions.map((sq, sIdx) => {
                    const isRevealed = Boolean(revealedQuestions[sq.id]);
                    return (
                      <div key={sq.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2.5">
                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                          {sIdx + 1}. {sq.question}
                        </p>

                        {sq.options && sq.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {sq.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`text-xs px-3 py-1.5 rounded-lg border text-muted-foreground ${
                                  isRevealed &&
                                  (opt === sq.correctAnswer || String(oIdx + 1) === sq.correctAnswer)
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium"
                                    : "bg-background/60 border-border/60"
                                }`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleQuestionReveal(sq.id)}
                            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>
                              {isRevealed
                                ? effectiveLang === "rw"
                                  ? "Hisha igisubizo"
                                  : "Hide Answer"
                                : effectiveLang === "rw"
                                ? "Reba igisubizo nyakuri"
                                : "Reveal Answer"}
                            </span>
                            {isRevealed ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {isRevealed && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {effectiveLang === "rw" ? "Nyakuri" : "Correct"}: {sq.correctAnswer}
                            </span>
                          )}
                        </div>

                        {isRevealed && sq.explanation && (
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground/90 leading-relaxed">
                            {sq.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 5. Auth / Practice Exam Invitation Strip */}
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 max-w-lg">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  {isAuthLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                  <span>
                    {isAuthLocked
                      ? effectiveLang === "fr"
                        ? "Connectez-vous pour accéder aux cours et examens"
                        : effectiveLang === "en"
                        ? "Sign in to access full courses & mock exams"
                        : "Injira muri konti ubone amasomo yose n'ibizamini"
                      : effectiveLang === "fr"
                      ? "Prêt pour un examen blanc complet ?"
                      : effectiveLang === "en"
                      ? "Ready for a full practice exam?"
                      : "Witeguye gukora ikizamini cy'imyitozo cyose?"}
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {effectiveLang === "fr"
                    ? "Les cours complets et la banque de questions d'examen sont réservés aux membres connectés sur Navo."
                    : effectiveLang === "en"
                    ? "Full interactive traffic courses and timed 20-question official mock exams require an authenticated Navo account."
                    : "Amasomo arambuye y'amategeko y'umuhanda n'ibizamini by'ibibazo 20 bifunguriwe abanyeshuri binjiye muri konti ya Navo."}
                </p>
              </div>

              <a
                href={authRedirectHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shrink-0 whitespace-nowrap"
              >
                <span>
                  {isAuthLocked
                    ? effectiveLang === "fr"
                      ? "Se connecter"
                      : effectiveLang === "en"
                      ? "Sign In to Continue"
                      : "Injira wige & ukore ibizamini"
                    : effectiveLang === "fr"
                    ? "Démarrer l'examen"
                    : effectiveLang === "en"
                    ? "Take Full Mock Exam"
                    : "Kora ikizamini cyose"}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </a>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
