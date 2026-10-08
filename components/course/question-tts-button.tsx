"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Normalize language name
  const langCode = propLanguage || currentLangCode || "en";
  const targetLanguage =
    langCode.toLowerCase().includes("rw") || langCode.toLowerCase().includes("kinya")
      ? "Kinyarwanda"
      : langCode.toLowerCase().includes("fr") || langCode.toLowerCase().includes("fren")
      ? "French"
      : "English";

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

  const handlePlayToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

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

    try {
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

      const data = await res.json();

      if (!res.ok) {
        if (data.disabled) {
          toast.info(data.error || "Audio is disabled for this language.");
        } else {
          toast.error(data.error || "Could not play audio.");
        }
        return;
      }

      if (data.audioUrl) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = data.audioUrl;
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = () => {
          setIsPlaying(false);
          toast.error("Audio playback error");
        };

        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.warn("TTS fetch error:", err);
      toast.error("Could not load audio narration");
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
