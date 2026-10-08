"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, Loader2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

// Session memory cache to make re-listening during exams instant (0 ms latency)
const ttsSessionCache = new Map<string, string>();
let ttsSessionDisabled = false;
let ttsStatusCheckedForLang = new Map<string, boolean>();

export function markTTSDisabledForSession() {
  ttsSessionDisabled = true;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("luxen_tts_disabled", "true");
    } catch {}
    window.dispatchEvent(new CustomEvent("luxen-tts-disabled"));
  }
}

export function clearTTSDisabledForSession() {
  ttsSessionDisabled = false;
  ttsStatusCheckedForLang.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("luxen_tts_disabled");
    } catch {}
    window.dispatchEvent(new CustomEvent("luxen-tts-enabled"));
  }
}

interface QuestionTTSButtonProps {
  text: string;
  entityId: string;
  language?: string;
  className?: string;
  readOptions?: boolean;
  options?: { opt: string; text?: string }[];
  size?: "sm" | "default" | "icon";
}

export function QuestionTTSButton({
  text,
  entityId,
  language: propLanguage,
  className = "",
  readOptions = false,
  options = [],
  size = "sm",
}: QuestionTTSButtonProps) {
  const { language: currentLangCode } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(() => {
    if (ttsSessionDisabled) return true;
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("luxen_tts_disabled") === "true";
      } catch {}
    }
    return false;
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Normalize language name
  const langCode = propLanguage || currentLangCode || "en";
  const targetLanguage =
    langCode.toLowerCase().includes("rw") || langCode.toLowerCase().includes("kinya")
      ? "Kinyarwanda"
      : langCode.toLowerCase().includes("fr") || langCode.toLowerCase().includes("fren")
      ? "French"
      : "English";

  // Sync with global TTS disable/enable events and verify server TTS config
  useEffect(() => {
    const handleDisabled = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
      setIsDisabled(true);
    };
    const handleEnabled = () => {
      setIsDisabled(false);
    };

    window.addEventListener("luxen-tts-disabled", handleDisabled);
    window.addEventListener("luxen-tts-enabled", handleEnabled);

    if (!ttsStatusCheckedForLang.has(targetLanguage)) {
      ttsStatusCheckedForLang.set(targetLanguage, true);
      fetch(`/api/ai/tts?scope=exam&language=${encodeURIComponent(targetLanguage)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.enabled === false) {
            markTTSDisabledForSession();
          } else if (data && data.enabled === true) {
            ttsSessionDisabled = false;
            try {
              sessionStorage.removeItem("luxen_tts_disabled");
            } catch {}
            setIsDisabled(false);
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("luxen-tts-disabled", handleDisabled);
      window.removeEventListener("luxen-tts-enabled", handleEnabled);
    };
  }, [targetLanguage]);

  // Cleanup when entityId changes (student switches questions)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, [entityId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isDisabled) {
    return null;
  }

  const handlePlayToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isDisabled) return;

    // If already playing, stop
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Build speech script (Question + Options if requested)
    let fullScript = text;
    if (readOptions && options.length > 0) {
      const optionsText = options
        .filter((o) => o.text)
        .map((o) => `Option ${o.opt}: ${o.text}`)
        .join(". ");
      fullScript = `${text}. ${optionsText}`;
    }

    const cacheKey = `${entityId}:${targetLanguage}:${fullScript}`;

    try {
      let audioUrl = ttsSessionCache.get(cacheKey);

      if (!audioUrl) {
        setIsLoading(true);

        const res = await fetch("/api/ai/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId,
            text: fullScript,
            language: targetLanguage,
            scope: "exam",
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.disabled || data.quotaExceeded || !data.audioUrl) {
          // Do not show any error message inside the exam; automatically disable TTS feature
          markTTSDisabledForSession();
          setIsDisabled(true);
          return;
        }

        audioUrl = data.audioUrl;
        ttsSessionCache.set(cacheKey, audioUrl!);
      }

      if (audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setIsPlaying(false);
        };

        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.warn("TTS fetch error:", err);
      markTTSDisabledForSession();
      setIsDisabled(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={handlePlayToggle}
      disabled={isLoading}
      title={isPlaying ? "Pause audio" : `Listen in ${targetLanguage}`}
      className={`rounded-full transition-all cursor-pointer ${
        isPlaying
          ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white shadow-sm shadow-indigo-500/20"
          : "border-border/60 hover:border-indigo-500/40 hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400"
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Play Text to Speech</span>
    </Button>
  );
}
