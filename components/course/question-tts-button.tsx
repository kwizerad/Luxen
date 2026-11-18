"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, Loader2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

// Session memory cache to make re-listening during exams instant (0 ms latency)
const ttsSessionCache = new Map<string, string>();
let ttsSessionDisabled = false;

interface CachedTTSStatus {
  enabled: boolean;
  masterEnabled: boolean;
  checkedAt: number;
}

const STATUS_CACHE_TTL_MS = 15_000;
const ttsStatusCache = new Map<string, CachedTTSStatus>();
const ttsStatusInFlight = new Map<string, Promise<CachedTTSStatus>>();

export function markTTSDisabledForSession() {
  ttsSessionDisabled = true;
  ttsStatusCache.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("luxen_tts_disabled", "true");
    } catch {}
    window.dispatchEvent(new CustomEvent("luxen-tts-disabled"));
  }
}

export function clearTTSDisabledForSession() {
  ttsSessionDisabled = false;
  ttsStatusCache.clear();
  ttsStatusInFlight.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("luxen_tts_disabled");
    } catch {}
    window.dispatchEvent(new CustomEvent("luxen-tts-enabled"));
  }
}

async function fetchTTSStatus(
  scope: "exam" | "learning",
  targetLanguage: string,
  entityId: string,
  bypassCache: boolean
): Promise<CachedTTSStatus> {
  const statusKey = `${scope}:${targetLanguage}:${entityId || "*"}`;
  const now = Date.now();

  if (!bypassCache) {
    const cached = ttsStatusCache.get(statusKey);
    if (cached && now - cached.checkedAt < STATUS_CACHE_TTL_MS) {
      return cached;
    }
    const pending = ttsStatusInFlight.get(statusKey);
    if (pending) {
      return pending;
    }
  }

  const reqPromise = (async (): Promise<CachedTTSStatus> => {
    try {
      const qs = new URLSearchParams({
        scope,
        language: targetLanguage,
      });
      if (entityId) {
        qs.set("entityId", entityId);
      }
      const res = await fetch(`/api/ai/tts?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        return { enabled: false, masterEnabled: true, checkedAt: Date.now() };
      }
      const data = await res.json().catch(() => null);
      if (!data) {
        return { enabled: false, masterEnabled: true, checkedAt: Date.now() };
      }
      const result: CachedTTSStatus = {
        enabled: data.enabled === true,
        masterEnabled: data.masterEnabled !== false && data.quotaExceeded !== true,
        checkedAt: Date.now(),
      };
      ttsStatusCache.set(statusKey, result);
      return result;
    } catch {
      return { enabled: false, masterEnabled: true, checkedAt: Date.now() };
    } finally {
      ttsStatusInFlight.delete(statusKey);
    }
  })();

  ttsStatusInFlight.set(statusKey, reqPromise);
  return reqPromise;
}

interface QuestionTTSButtonProps {
  text: string;
  entityId: string;
  language?: string;
  scope?: "exam" | "learning";
  className?: string;
  readOptions?: boolean;
  options?: { opt: string; text?: string }[];
  size?: "sm" | "default" | "icon";
}

export function QuestionTTSButton({
  text,
  entityId,
  language: propLanguage,
  scope = "exam",
  className = "",
  readOptions = false,
  options = [],
  size = "sm",
}: QuestionTTSButtonProps) {
  const { language: currentLangCode } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Fail closed until verified enabled by server
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
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
    let active = true;

    const stopPlaybackAndHide = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
      setIsEnabled(false);
    };

    const checkServerStatus = async (bypassCache = false) => {
      if (
        !bypassCache &&
        (ttsSessionDisabled ||
          (typeof window !== "undefined" &&
            (() => {
              try {
                return sessionStorage.getItem("luxen_tts_disabled") === "true";
              } catch {
                return false;
              }
            })()))
      ) {
        if (active) stopPlaybackAndHide();
        return;
      }

      const result = await fetchTTSStatus(scope, targetLanguage, entityId, bypassCache);
      if (!active) return;

      if (!result.masterEnabled) {
        markTTSDisabledForSession();
        stopPlaybackAndHide();
        return;
      }

      ttsSessionDisabled = false;
      try {
        sessionStorage.removeItem("luxen_tts_disabled");
      } catch {}

      if (result.enabled) {
        setIsEnabled(true);
      } else {
        stopPlaybackAndHide();
      }
    };

    const handleEnabled = () => {
      ttsStatusCache.clear();
      void checkServerStatus(true);
    };

    const handleConfigUpdated = () => {
      ttsStatusCache.clear();
      void checkServerStatus(true);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "luxen_tts_updated_at" || e.key === "luxen_tts_disabled") {
        ttsStatusCache.clear();
        void checkServerStatus(true);
      }
    };

    window.addEventListener("luxen-tts-disabled", stopPlaybackAndHide);
    window.addEventListener("luxen-tts-enabled", handleEnabled);
    window.addEventListener("system-config-updated", handleConfigUpdated);
    window.addEventListener("luxen-tts-config-updated", handleConfigUpdated);
    window.addEventListener("storage", handleStorage);

    void checkServerStatus(false);

    return () => {
      active = false;
      window.removeEventListener("luxen-tts-disabled", stopPlaybackAndHide);
      window.removeEventListener("luxen-tts-enabled", handleEnabled);
      window.removeEventListener("system-config-updated", handleConfigUpdated);
      window.removeEventListener("luxen-tts-config-updated", handleConfigUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [scope, targetLanguage, entityId]);

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

  if (!isEnabled) {
    return null;
  }

  const handlePlayToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isEnabled) return;

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

    const cacheKey = `${scope}:${entityId}:${targetLanguage}:${fullScript}`;

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
            scope,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.disabled || data.quotaExceeded || !data.audioUrl) {
          ttsStatusCache.delete(`${scope}:${targetLanguage}:${entityId || "*"}`);
          if (data.masterEnabled === false || data.quotaExceeded) {
            markTTSDisabledForSession();
          }
          setIsEnabled(false);
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
      setIsEnabled(false);
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
