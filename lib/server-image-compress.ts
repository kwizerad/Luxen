import sharp from "sharp";

export interface ServerCompressOptions {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
}

export interface CompressedUploadResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
}

/**
 * Compresses and resizes raster images (PNG/JPEG/WebP/TIFF/AVIF) to WebP
 * (default max 1280px, quality 80) on upload using Sharp to drastically reduce exam/lesson load times.
 * Skips SVG, animated GIF, and non-image files. Falls back safely on error.
 */
export async function compressUploadedImage(
  inputBuffer: Buffer,
  mimeType: string,
  originalName = "image.png",
  options: ServerCompressOptions = {}
): Promise<CompressedUploadResult> {
  const {
    maxDimension = 1280,
    quality = 80,
    minBytesToCompress = 12 * 1024,
  } = options;

  const lowerMime = (mimeType || "").toLowerCase();
  const originalExt = originalName.split(".").pop()?.toLowerCase() || "png";
  const originalBytes = inputBuffer.byteLength;

  if (
    !lowerMime.startsWith("image/") ||
    lowerMime === "image/svg+xml" ||
    lowerMime === "image/gif"
  ) {
    return {
      buffer: inputBuffer,
      contentType: mimeType || "image/png",
      extension: originalExt,
      originalBytes,
      compressedBytes: originalBytes,
      savedPercent: 0,
    };
  }

  try {
    const pipeline = sharp(inputBuffer, { failOn: "none" });
    const metadata = await pipeline.metadata().catch(() => null);
    const width = metadata?.width || 0;
    const height = metadata?.height || 0;
    const needsResize = width > maxDimension || height > maxDimension;

    if (!needsResize && originalBytes < minBytesToCompress && lowerMime === "image/webp") {
      return {
        buffer: inputBuffer,
        contentType: "image/webp",
        extension: "webp",
        originalBytes,
        compressedBytes: originalBytes,
        savedPercent: 0,
      };
    }

    if (!needsResize && originalBytes < minBytesToCompress) {
      return {
        buffer: inputBuffer,
        contentType: mimeType || "image/png",
        extension: originalExt,
        originalBytes,
        compressedBytes: originalBytes,
        savedPercent: 0,
      };
    }

    const compressed = await sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer();

    if (compressed.byteLength > 0 && (compressed.byteLength < originalBytes || needsResize)) {
      const savedPercent =
        originalBytes > 0
          ? Math.max(0, Math.round(((originalBytes - compressed.byteLength) / originalBytes) * 100))
          : 0;
      return {
        buffer: compressed,
        contentType: "image/webp",
        extension: "webp",
        originalBytes,
        compressedBytes: compressed.byteLength,
        savedPercent,
      };
    }
  } catch (err) {
    console.warn("[ServerImageCompress] Sharp fallback to original:", err);
  }

  return {
    buffer: inputBuffer,
    contentType: mimeType || "image/png",
    extension: originalExt,
    originalBytes,
    compressedBytes: originalBytes,
    savedPercent: 0,
  };
}
