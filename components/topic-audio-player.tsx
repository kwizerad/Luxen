"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicAudioPlayerProps {
  audioUrl: string;
  topicTitle: string;
  className?: string;
}

export function TopicAudioPlayer({ audioUrl, topicTitle, className }: TopicAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioUrl, playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.playbackRate = playbackRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipTime = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration || 99999);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={cn(
        "rounded-[16px] border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-3.5 sm:p-4 space-y-2.5 transition-all shadow-xs",
        className
      )}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Volume2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block leading-none">
              Audio Lesson
            </span>
            <p className="text-xs text-foreground/80 truncate font-medium">
              {topicTitle}
            </p>
          </div>
        </div>

        {/* Speed button & badge */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-background border hover:bg-muted text-foreground/80 transition-colors"
            title="Audio speed"
          >
            <Gauge className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>{playbackRate}x</span>
          </button>

          {showSpeedMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-30 flex gap-1 p-1 bg-popover border rounded-xl shadow-lg animate-in fade-in zoom-in-95">
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => changeSpeed(speed)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-semibold transition-all",
                    playbackRate === speed
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress slider */}
      <div className="space-y-1">
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
        />
        <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground font-medium">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => skipTime(-5)}
            className="p-1.5 rounded-full hover:bg-emerald-500/15 text-foreground/80 hover:text-foreground transition-colors"
            title="Rewind 5s"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-transform active:scale-95 shadow-sm"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => skipTime(5)}
            className="p-1.5 rounded-full hover:bg-emerald-500/15 text-foreground/80 hover:text-foreground transition-colors"
            title="Forward 5s"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
