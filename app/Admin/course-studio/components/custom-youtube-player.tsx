"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Play, Pause, ChevronLeft, ChevronRight, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// --- Global YouTube IFrame API loader ---
let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const w = window as any;

    // If script already in DOM, poll for YT availability
    if (document.getElementById("youtube-iframe-api")) {
      const poll = setInterval(() => {
        if (w.YT && w.YT.Player) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      return;
    }

    // Set up callback before loading script
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    const script = document.createElement("script");
    script.id = "youtube-iframe-api";
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiPromise;
}

function extractVideoId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\s]+)/
  );
  return match ? match[1] : url;
}

export function CustomYouTubePlayer({ node, selected, updateAttributes }: NodeViewProps) {
  const { src, width, height, textAlign } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    let mounted = true;
    setReady(false);

    loadYouTubeAPI().then(() => {
      if (!mounted || !containerRef.current) return;

      const id = `yt-${Math.random().toString(36).slice(2)}`;
      const div = document.createElement("div");
      div.id = id;
      div.style.width = "100%";
      div.style.height = "100%";
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(div);

      try {
        playerRef.current = new (window as any).YT.Player(id, {
          videoId: extractVideoId(src),
          playerVars: {
            controls: 0,
            rel: 0,
            fs: 0,
            disablekb: 1,
            iv_load_policy: 3,
            playsinline: 1,
            modestbranding: 1,
            showinfo: 0,
            cc_load_policy: 0,
          },
          events: {
            onReady: () => {
              if (mounted) setReady(true);
            },
            onStateChange: (e: any) => {
              if (!mounted) return;
              const YT = (window as any).YT;
              if (!YT) return;
              setIsPlaying(e.data === YT.PlayerState.PLAYING);
            },
          },
        });
      } catch (err) {
        console.error("YouTube player init error:", err);
      }
    });

    return () => {
      mounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) p.pauseVideo();
      else p.playVideo();
    } catch (err) {
      console.error("togglePlay error:", err);
    }
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const current = p.getCurrentTime?.() ?? 0;
      p.seekTo(Math.max(0, current + seconds), true);
    } catch (err) {
      console.error("seek error:", err);
    }
  }, []);

  // --- Mobile double-tap detection ---
  const lastTapRef = useRef<{ time: number; side: string }>({ time: 0, side: "" });

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const side =
        touch.clientX < rect.left + rect.width / 2 ? "left" : "right";
      const now = Date.now();
      const last = lastTapRef.current;
      if (last.side === side && now - last.time < 300) {
        seek(side === "left" ? -10 : 10);
        lastTapRef.current = { time: 0, side: "" };
      } else {
        lastTapRef.current = { time: now, side };
      }
    },
    [seek]
  );

  // --- Resize handle ---
  const resizeRef = useRef<HTMLDivElement>(null);
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = width || 640;
      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(200, Math.min(1200, startWidth + (ev.clientX - startX)));
        updateAttributes({ width: newWidth });
      };
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [width, updateAttributes]
  );

  const alignStyle: React.CSSProperties =
    textAlign === "center" ? { marginLeft: "auto", marginRight: "auto" }
    : textAlign === "right" ? { marginLeft: "auto", marginRight: "0" }
    : textAlign === "left" ? { marginLeft: "0", marginRight: "auto" }
    : {};

  // Show controls on mouse move, hide after 3s of playing
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
  }, []);

  // Keyboard shortcuts: arrows = seek, space = play/pause
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!ready) return;
      switch (e.key) {
        case " ":
        case "Spacebar":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(10);
          break;
      }
    },
    [ready, togglePlay, seek]
  );

  return (
    <NodeViewWrapper
      className="relative max-w-full"
      style={{ width: width || 640, height: height || undefined, display: "block", ...alignStyle }}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* YouTube iframe container */}
      <div
        ref={containerRef}
        data-youtube-player
        className="rounded-lg overflow-hidden"
        style={{ width: "100%", height: height ? "100%" : undefined, aspectRatio: height ? undefined : "16 / 9" }}
      />

      {/* Transparent overlay to block ALL YouTube native UI interaction */}
      <div className="absolute inset-0 z-10" />

      {/* Selection ring in editor */}
      {selected && (
        <div className="absolute inset-0 ring-2 ring-[var(--admin-primary)] rounded-lg pointer-events-none z-20" />
      )}

      {/* Custom controls overlay */}
      {showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <button
            type="button"
            onClick={() => seek(-10)}
            disabled={!ready}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto disabled:opacity-30"
            title="Back 10s"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!ready}
            className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto disabled:opacity-30"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            type="button"
            onClick={() => seek(10)}
            disabled={!ready}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors pointer-events-auto disabled:opacity-30"
            title="Forward 10s"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Mobile double-tap zones (hidden on desktop, below control buttons) */}
      <div
        className="absolute inset-0 flex md:hidden z-0"
        style={{ touchAction: "pan-y" }}
        onTouchEnd={handleTouchEnd}
      />

      {/* Resize handle (bottom-right corner, editor only) */}
      {selected && (
        <div
          ref={resizeRef}
          onMouseDown={startResize}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-40"
          style={{
            background: "linear-gradient(135deg, transparent 50%, var(--admin-primary) 50%)",
            borderBottomRightRadius: "8px",
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
