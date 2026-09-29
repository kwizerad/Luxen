"use client";

import { useState, useEffect, useRef } from "react";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  unoptimized?: boolean;
  sizes?: string;
}

/**
 * Drop-in replacement for next/image or plain <img> in exam/course contexts.
 *
 * Key differences:
 * - Remounts on src change (via key) so the old image is cleared instantly
 *   instead of lingering while the new one loads.
 * - Shows a shimmering skeleton placeholder until the image is fully loaded.
 * - Uses a native <img> under the hood for maximum compatibility with
 *   Supabase storage URLs (no Next.js image optimizer round-trip).
 */
export function SmartImage({
  src,
  alt,
  className,
  width,
  height,
  sizes: _sizes,
  unoptimized: _unoptimized,
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If the browser already has the image cached (e.g. preloaded),
  // complete will be true immediately on mount — detect that.
  useEffect(() => {
    setLoaded(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div
      key={src}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={width && height ? { aspectRatio: `${width} / ${height}` } : undefined}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-[inherit]" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-contain transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

/**
 * Preloads an array of image URLs in the background so they're
 * cached by the time the user navigates to that question.
 */
export function preloadImages(urls: string[]) {
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.src = url;
    img.decoding = "async";
  }
}
