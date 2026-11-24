"use client";

import { useState, useEffect, useRef } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
import { getOptimizedImageUrl, type OptimizerWidth } from "@/lib/image-compression";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  unoptimized?: boolean;
  sizes?: string;
  priority?: boolean;
  onClick?: () => void;
  retryLabel?: string;
}

const preloadedUrlSet = new Set<string>();

/**
 * Optimized exam/course image renderer:
 * - Rewrites external HTTP(S) URLs to `/_next/image` (WebP resized & compressed by sharp)
 * - Falls back automatically to raw `src` if optimizer errors
 * - Renders a clean retryable placeholder on broken images (never stuck pulsing)
 * - Always passes `referrerPolicy="no-referrer"` for external CDNs (e.g. wixstatic)
 */
export function SmartImage({
  src,
  alt,
  className,
  width,
  height,
  sizes: _sizes,
  unoptimized = false,
  priority = false,
  onClick,
  retryLabel = "Tap to reload image",
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [fallbackToRaw, setFallbackToRaw] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const targetWidth: OptimizerWidth =
    width && width <= 384 ? 384 : width && width <= 640 ? 640 : 1080;
  const optimizedSrc = unoptimized
    ? src
    : getOptimizedImageUrl(src, targetWidth, 75) || src;
  const baseSrc = fallbackToRaw ? src : optimizedSrc;
  const activeSrc =
    retryCount > 0
      ? `${baseSrc}${baseSrc.includes("?") ? "&" : "?"}_r=${retryCount}`
      : baseSrc;

  useEffect(() => {
    setFallbackToRaw(false);
    setHasError(false);
    setLoaded(false);
    setRetryCount(0);
  }, [src]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeSrc]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setFallbackToRaw(false);
    setLoaded(false);
    setRetryCount((c) => c + 1);
  };

  if (!src) return null;

  return (
    <div
      key={`${src}-${retryCount}`}
      onClick={onClick}
      className={`relative overflow-hidden flex items-center justify-center ${className ?? ""}`}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {!loaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-[inherit]" />
      )}
      {hasError ? (
        <div className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2.5 bg-muted/25 text-muted-foreground p-4 rounded-[inherit] text-center">
          <ImageOff className="w-6 h-6 opacity-60" />
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-background/90 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{retryLabel}</span>
          </button>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={activeSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!fallbackToRaw && baseSrc !== src) {
              setFallbackToRaw(true);
            } else {
              setHasError(true);
              setLoaded(true);
            }
          }}
          className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

/**
 * Preloads exam images through the WebP optimizer with bounded concurrency
 * so the first 3 questions load immediately without saturating mobile bandwidth.
 */
export function preloadImages(urls: string[]) {
  if (typeof window === "undefined") return;
  const uniqueOptimized: string[] = [];
  for (const raw of urls) {
    if (!raw || typeof raw !== "string") continue;
    const optimized = getOptimizedImageUrl(raw, 1080, 75) || raw;
    if (!optimized || preloadedUrlSet.has(optimized)) continue;
    preloadedUrlSet.add(optimized);
    uniqueOptimized.push(optimized);
  }

  if (uniqueOptimized.length === 0) return;

  // Immediately kick off the first 3 so Question 1-3 display instantaneously
  const immediate = uniqueOptimized.slice(0, 3);
  const rest = uniqueOptimized.slice(3);

  const loadOne = (url: string): Promise<void> =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });

  void Promise.all(immediate.map(loadOne)).then(async () => {
    const CONCURRENCY = 3;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, rest.length) }, async () => {
      while (cursor < rest.length) {
        const idx = cursor++;
        await loadOne(rest[idx]);
      }
    });
    await Promise.all(workers);
  });
}
