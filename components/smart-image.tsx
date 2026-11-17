"use client";

import { useState, useEffect, useRef } from "react";
import { ImageOff } from "lucide-react";
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
}

const preloadedUrlSet = new Set<string>();

/**
 * Optimized exam/course image renderer:
 * - Rewrites external HTTP(S) URLs to `/_next/image` (WebP resized & compressed by sharp)
 * - Falls back automatically to raw `src` if optimizer errors
 * - Renders a clean static placeholder on broken images (never stuck pulsing)
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
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [fallbackToRaw, setFallbackToRaw] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const targetWidth: OptimizerWidth =
    width && width <= 384 ? 384 : width && width <= 640 ? 640 : 1080;
  const optimizedSrc = unoptimized
    ? src
    : getOptimizedImageUrl(src, targetWidth, 75) || src;
  const activeSrc = fallbackToRaw ? src : optimizedSrc;

  useEffect(() => {
    setFallbackToRaw(false);
    setHasError(false);
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeSrc]);

  if (!src) return null;

  return (
    <div
      key={src}
      onClick={onClick}
      className={`relative overflow-hidden flex items-center justify-center ${className ?? ""}`}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {!loaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-[inherit]" />
      )}
      {hasError ? (
        <div className="w-full h-full min-h-[120px] flex items-center justify-center bg-muted/20 text-muted-foreground/60 p-4">
          <ImageOff className="w-6 h-6" />
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
            if (!fallbackToRaw && activeSrc !== src) {
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
