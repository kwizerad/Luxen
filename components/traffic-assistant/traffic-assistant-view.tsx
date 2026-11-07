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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  Car,
  Home,
  Check,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
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
    { label: "Overtaking Prohibitions", query: "When and where is overtaking strictly prohibited by Rwandan traffic law?" },
    { label: "Road Signs Classification", query: "What is the difference between warning signs and prohibitory signs?" },
    { label: "Drink Driving Penalties", query: "What are the legal fines and penalties for driving under the influence in Rwanda?" },
  ],
  fr: [
    { label: "Priorité au rond-point", query: "Qui a la priorité de passage dans un carrefour à sens giratoire au Rwanda ?" },
    { label: "Vitesse en agglomération", query: "Quelle est la vitesse maximale autorisée en agglomération au Rwanda ?" },
    { label: "Interdiction de dépasser", query: "Quelles sont les règles et interdictions strictes concernant le dépassement ?" },
    { label: "Panneaux de signalisation", query: "Comment différencier les panneaux de danger et les panneaux d'interdiction ?" },
    { label: "Alcool au volant et amendes", query: "Quelles sont les sanctions et amendes prévues pour conduite en état d'ivresse ?" },
  ],
};

export function TrafficAssistantView({ initialQuery = "" }: TrafficAssistantViewProps) {
  const { language: siteLang } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<"auto" | SupportedLanguage>("auto");
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
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

  // Active language determination
  const effectiveLang: SupportedLanguage =
    selectedLang === "auto"
      ? (siteLang === "french" ? "fr" : siteLang === "english" ? "en" : "rw")
      : selectedLang;

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
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

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Traffic Assistant error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const toggleQuestionReveal = (id: string) => {
    setRevealedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isServiceEnabled === false) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-border p-8 bg-card shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Traffic Rules & Gazette Assistant</h2>
          <p className="text-sm text-muted-foreground">
            This service is currently disabled by administration.
          </p>
          <a
            href="/dashboard#services"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Services
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Top Header Bar */}
      <header className="border-b border-border/80 sticky top-0 z-30 bg-background/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                <Car className="h-4 w-4" />
              </div>
              <span>Navo</span>
            </a>
            <span className="text-muted-foreground/60 text-xs hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground hidden sm:inline font-mono lowercase">
              rwanda traffic code assistant
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selection */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg border border-border bg-muted/40 text-xs">
              <button
                onClick={() => setSelectedLang("auto")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  selectedLang === "auto"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setSelectedLang("rw")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  selectedLang === "rw"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                RW
              </button>
              <button
                onClick={() => setSelectedLang("en")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  selectedLang === "en"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setSelectedLang("fr")}
                className={`px-2 py-1 rounded-md transition-colors ${
                  selectedLang === "fr"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                FR
              </button>
            </div>

            <a
              href="/dashboard#exam"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-xs"
            >
              <span>Practice Exams</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Title & Introduction */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground tracking-wide lowercase">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <span>official gazette of rwanda · legal code explorer</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight text-balance">
            {effectiveLang === "rw"
              ? "Shakisha amategeko y'umuhanda mu Rwanda n'ibisubizo by'ibizamini"
              : effectiveLang === "fr"
              ? "Recherchez le Code de la route rwandais et les réponses d'examen"
              : "Search Rwanda Road Traffic Rules, Laws & Exam Solutions"}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {effectiveLang === "rw"
              ? "Baza ikibazo icyo aricyo cyose cyerekeye amategeko yo gutwara, ibyapa, n'uburenganzira bwo gutambuka uhite ubona ingingo nyakuri y'iteka rya Perezida."
              : effectiveLang === "fr"
              ? "Posez toute question sur la circulation, les priorités et panneaux pour obtenir l'article juridique officiel de l'Arrêté Présidentiel rwandais."
              : "Ask any question about road traffic regulations, right of way, or traffic signs to get direct answers backed by official Rwandan presidential decrees."}
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative max-w-3xl mx-auto">
          <div className="relative flex items-center rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Search className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder={
                effectiveLang === "rw"
                  ? "Baza ikibazo (urugero: Ni nde utambuka mbere mu masangano azunguruka?)"
                  : effectiveLang === "fr"
                  ? "Posez votre question (ex: Qui a la priorité dans un rond-point ?)"
                  : "Ask a traffic question (e.g., Who has priority at a roundabout?)"
              }
              className="w-full bg-transparent px-3 py-2.5 text-sm sm:text-base outline-none placeholder:text-muted-foreground/70"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors mr-1"
                title="Clear"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="h-10 sm:h-11 px-5 rounded-xl font-semibold shrink-0 gap-1.5 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </Button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-muted-foreground scrollbar-none">
            <span className="shrink-0 font-medium">Quick topics:</span>
            {QUICK_TOPICS[effectiveLang].map((t, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(t.query);
                  handleSearch(t.query);
                }}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors shrink-0"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded-md w-1/4"></div>
            <div className="h-7 bg-muted rounded-md w-3/4"></div>
            <div className="h-4 bg-muted rounded-md w-full"></div>
            <div className="h-4 bg-muted rounded-md w-5/6"></div>
            <div className="h-28 bg-muted/40 rounded-xl mt-6 border border-border/60"></div>
          </div>
        )}

        {/* Search Results Display */}
        {!loading && result && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
            {/* 1. Direct Answer Card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verified Traffic Rule Answer</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground lowercase">
                  {result.source === "ai_grounded"
                    ? "AI Grounded · Rwanda Gazette"
                    : "High-Availability Code Similarity"}
                </span>
              </div>

              <div className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                {result.directAnswer}
              </div>
            </div>

            {/* 2. Official Rwanda Gazette Citation Box */}
            {result.gazetteArticles && result.gazetteArticles.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3.5 shadow-xs">
                <div
                  className="flex items-center justify-between gap-2 cursor-pointer select-none"
                  onClick={() => setExpandedGazette(!expandedGazette)}
                >
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      Official Gazette of Rwanda Legal Citation
                    </h3>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    {expandedGazette ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expandedGazette && (
                  <div className="space-y-4 pt-1">
                    {result.gazetteArticles.map((article) => (
                      <div
                        key={article.id}
                        className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400">
                            {article.articleNumber} · {article.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {article.decreeRef}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed font-serif">
                          {article.excerpt}
                        </p>

                        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
                          <div className="pt-2 border-t border-emerald-500/15 space-y-1">
                            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                              Key Takeaways:
                            </span>
                            <ul className="space-y-1">
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Matched Course Lessons */}
            {result.matchedLessons && result.matchedLessons.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    Related Study Lessons in Navo
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {result.matchedLessons.map((lesson) => (
                    <a
                      key={lesson.id}
                      href="/dashboard#courses"
                      className="p-3.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/50 hover:border-border transition-colors group flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {lesson.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {lesson.summary}
                        </p>
                      </div>
                      <span className="mt-2 text-[10px] font-medium text-primary flex items-center gap-1">
                        <span>Study Lesson</span>
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Real Exam Questions Preview */}
            {result.sampleQuestions && result.sampleQuestions.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">
                      Practice Questions on This Rule
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground lowercase">
                    official exam format
                  </span>
                </div>

                <div className="space-y-3">
                  {result.sampleQuestions.map((sq, sIdx) => {
                    const isRevealed = Boolean(revealedQuestions[sq.id]);
                    return (
                      <div
                        key={sq.id}
                        className="p-4 rounded-xl border border-border/80 bg-muted/15 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {sIdx + 1}. {sq.question}
                          </span>
                        </div>

                        {sq.options && sq.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {sq.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`text-xs px-3 py-1.5 rounded-lg border text-muted-foreground ${
                                  isRevealed && (opt === sq.correctAnswer || String(oIdx + 1) === sq.correctAnswer)
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium"
                                    : "bg-background/60 border-border/60"
                                }`}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                          <button
                            onClick={() => toggleQuestionReveal(sq.id)}
                            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{isRevealed ? "Hide Explanation" : "Reveal Answer & Explanation"}</span>
                            {isRevealed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>

                          {isRevealed && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              Correct: {sq.correctAnswer}
                            </span>
                          )}
                        </div>

                        {isRevealed && sq.explanation && (
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-foreground/90 leading-relaxed">
                            <span className="font-semibold text-primary">Explanation: </span>
                            {sq.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Exam Invitation CTA Card */}
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1.5 max-w-lg">
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  Rwanda National Police Exam Preparation
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  Ready to test your knowledge with real mock exams?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Practice timed 20-question provisional theory tests matching the official Irembo exam standards, with instant scores and explanations.
                </p>
              </div>

              <a
                href="/dashboard#exam"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-sm shrink-0"
              >
                <span>Take Full Mock Exam</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
