"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AINeuralVoicePlayerProps {
  audioUrl: string | null;
  isLoading: boolean;
  language: string;
  topicTitle: string;
  onClose: () => void;
  onRetry: () => void;
}

export function AINeuralVoicePlayer({
  audioUrl,
  isLoading,
  language,
  topicTitle,
  onClose,
  onRetry,
}: AINeuralVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleRateChange = () => {
    if (!audioRef.current) return;
    const rates = [1.0, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-md p-3 sm:p-4 shadow-lg space-y-3 animate-in fade-in-0 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
              <span>AI Cloud Voice</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
                {language}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">{topicTitle}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          title="Close voice reader"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-2 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Generating human neural voice in {language}...</span>
        </div>
      ) : audioUrl ? (
        <div className="space-y-2">
          {/* Progress slider */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 rounded-lg appearance-none bg-muted accent-primary cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={togglePlay}
                className="h-8 px-3 rounded-xl gap-1.5 text-xs font-semibold"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRateChange}
                className="h-8 px-2.5 rounded-xl text-xs font-mono font-medium"
                title="Playback Speed"
              >
                {playbackRate}x
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                title="Regenerate Voice"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-muted-foreground">Ready to read note aloud</span>
          <Button size="sm" onClick={onRetry} className="h-7 text-xs rounded-lg">
            Start Reading
          </Button>
        </div>
      )}
    </div>
  );
}
