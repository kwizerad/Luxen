// Image optimization & compression helpers (works in browser and SSR safely)

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
}

export type OptimizerWidth = 384 | 640 | 750 | 828 | 1080 | 1200;

/**
 * Rewrites external HTTP(S) image URLs to go through Next.js Image Optimizer (`/_next/image`),
 * which uses `sharp` on the server to resize and serve WebP/AVIF at much smaller sizes.
 * Skips data URIs, blob URIs, SVGs, GIFs, local relative icons, and already-optimized URLs.
 */
export function getOptimizedImageUrl(
  src: string | null | undefined,
  width: OptimizerWidth = 1080,
  quality = 75
): string {
  if (!src || typeof src !== "string") return "";
  const trimmed = src.trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/_next/image")
  ) {
    return trimmed;
  }

  // Leave local SVG/GIF static assets and remote SVG/GIF untouched
  const withoutQuery = trimmed.split("?")[0].toLowerCase();
  if (withoutQuery.endsWith(".svg") || withoutQuery.endsWith(".gif")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `/_next/image?url=${encodeURIComponent(trimmed)}&w=${width}&q=${quality}`;
  }

  return trimmed;
}

/**
 * Extracts the raw original external URL from a Next.js `/_next/image?url=...` proxy URL
 * so broken/blocked optimizer requests can cleanly fall back to the direct URL.
 */
export function extractRawImageUrl(src: string | null | undefined): string {
  if (!src || typeof src !== "string") return "";
  if (!src.includes("/_next/image")) return src;
  try {
    const queryStart = src.indexOf("?");
    if (queryStart === -1) return src;
    const params = new URLSearchParams(src.slice(queryStart + 1));
    return params.get("url") || src;
  } catch {
    return src;
  }
}

/**
 * Rewrites all HTTP(S) image URLs inside TipTap JSON or HTML strings to use `/_next/image`
 * (Sharp WebP/AVIF optimization) without mutating stored database records.
 */
export function optimizeContentImages(
  content: any,
  width: OptimizerWidth = 1080,
  quality = 75
): any {
  if (!content) return content;

  if (typeof content === "string") {
    return content.replace(
      /(<img\b[^>]*?\bsrc=["'])(https?:\/\/[^"']+)(["'][^>]*>)/gi,
      (_match, prefix: string, url: string, suffix: string) => {
        const optimized = getOptimizedImageUrl(url, width, quality) || url;
        return `${prefix}${optimized}${suffix}`;
      }
    );
  }

  if (Array.isArray(content)) {
    return content.map((item) => optimizeContentImages(item, width, quality));
  }

  if (typeof content === "object") {
    const node = content as Record<string, any>;
    const cloned: Record<string, any> = { ...node };
    if (node.attrs && typeof node.attrs === "object") {
      const attrs = { ...(node.attrs as Record<string, any>) };
      if (typeof attrs.src === "string" && attrs.src.startsWith("http")) {
        attrs.src = getOptimizedImageUrl(attrs.src, width, quality) || attrs.src;
      }
      cloned.attrs = attrs;
    }
    if (Array.isArray(node.content)) {
      cloned.content = node.content.map((child: any) => optimizeContentImages(child, width, quality));
    }
    return cloned;
  }

  return content;
}

/**
 * Collects unique HTTP(S) image URLs referenced inside TipTap JSON, serialized JSON, or HTML strings.
 */
export function extractContentImageUrls(content: unknown): string[] {
  const urls = new Set<string>();

  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          walk(JSON.parse(trimmed));
          return;
        } catch {
          // Fall through to HTML scan
        }
      }
      const imgRegex = /<img\b[^>]*?\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(trimmed)) !== null) {
        if (match[1]) urls.add(match[1]);
      }
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const attrs = obj.attrs as Record<string, unknown> | undefined;
      if (attrs && typeof attrs.src === "string" && attrs.src.startsWith("http")) {
        urls.add(attrs.src);
      }
      if (typeof obj.src === "string" && obj.src.startsWith("http")) {
        urls.add(obj.src);
      }
      if (Array.isArray(obj.content)) walk(obj.content);
      if (typeof obj.content === "string") walk(obj.content);
    }
  };

  walk(content);
  return Array.from(urls);
}

/**
 * Compresses and resizes a browser File object into WebP (or JPEG fallback)
 * before uploading so course and exam images are small and load quickly.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxDimension = 1280,
    quality = 0.80,
    minBytesToCompress = 15 * 1024,
  } = options;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const lowerType = (file.type || "").toLowerCase();
  // Skip non-images, SVGs, and animated GIFs
  if (
    !lowerType.startsWith("image/") ||
    lowerType === "image/svg+xml" ||
    lowerType === "image/gif"
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
        // Skip already tiny files unless their dimensions exceed maxDimension
        if (file.size <= minBytesToCompress && scale >= 1) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        const targetW = Math.max(1, Math.round(srcW * scale));
        const targetH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const tryEncode = (mimeType: string, ext: string, onFail?: () => void) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                if (onFail) onFail();
                else {
                  URL.revokeObjectURL(objectUrl);
                  resolve(file);
                }
                return;
              }
              URL.revokeObjectURL(objectUrl);
              // Swap whenever we saved bytes or downscaled oversized dimensions
              if (blob.size < file.size || scale < 1) {
                const baseName = file.name.replace(/\.[^/.]+$/, "") || "image";
                resolve(
                  new File([blob], `${baseName}.${ext}`, {
                    type: mimeType,
                    lastModified: Date.now(),
                  })
                );
              } else {
                resolve(file);
              }
            },
            mimeType,
            quality
          );
        };

        tryEncode("image/webp", "webp", () => {
          tryEncode("image/jpeg", "jpg");
        });
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
