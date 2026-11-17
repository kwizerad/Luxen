import { extractRawImageUrl } from "@/lib/image-compression";
import type { CourseLesson } from "@/lib/database.types";

export interface ExtractedCourseMedia {
  images: string[];
  cleanContent: string | Record<string, unknown>;
}

const NON_IMAGE_EXT_RE = /\.(mp4|webm|ogg|mp3|wav|m4a|pdf)(\?.*)?$/i;

function isLikelyImageUrl(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (NON_IMAGE_EXT_RE.test(trimmed)) return false;
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  );
}

function addUniqueImage(target: string[], seenRaw: Set<string>, candidate: unknown) {
  if (typeof candidate !== "string") return;
  const trimmed = candidate.trim();
  if (!isLikelyImageUrl(trimmed)) return;
  const canonical = extractRawImageUrl(trimmed) || trimmed;
  if (seenRaw.has(canonical)) return;
  seenRaw.add(canonical);
  target.push(canonical);
}

function walkAndStripTiptap(
  node: unknown,
  images: string[],
  seenRaw: Set<string>
): unknown {
  if (!node) return node;
  if (Array.isArray(node)) {
    const mapped = node
      .map((item) => walkAndStripTiptap(item, images, seenRaw))
      .filter((item) => item !== null && item !== undefined);
    return mapped;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = typeof obj.type === "string" ? obj.type : "";
    const attrs = (obj.attrs && typeof obj.attrs === "object"
      ? (obj.attrs as Record<string, unknown>)
      : undefined);

    if (type === "image" || type === "imageUpload") {
      addUniqueImage(images, seenRaw, attrs?.src ?? obj.src);
      return null;
    }

    const cloned: Record<string, unknown> = { ...obj };
    if (Array.isArray(obj.content)) {
      const strippedChildren = walkAndStripTiptap(obj.content, images, seenRaw) as unknown[];
      cloned.content = strippedChildren;
      // Drop empty paragraphs that only held an inline image
      if (type === "paragraph" && strippedChildren.length === 0) {
        return null;
      }
    }
    return cloned;
  }

  return node;
}

function stripImagesFromHtml(
  html: string,
  images: string[],
  seenRaw: Set<string>
): string {
  // Collect <img src="..."> URLs and strip the tags
  const imgTagRe = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*\/?>/gi;
  let cleaned = html.replace(imgTagRe, (_match, src: string) => {
    addUniqueImage(images, seenRaw, src);
    return "";
  });

  // Also strip markdown image syntax ![alt](url)
  cleaned = cleaned.replace(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, src: string) => {
    addUniqueImage(images, seenRaw, src);
    return "";
  });

  // Clean up now-empty wrapper divs/paragraphs created by external lesson formatter
  cleaned = cleaned
    .replace(/<div[^>]*>\s*<\/div>/gi, "")
    .replace(/<p[^>]*>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .trim();

  return cleaned;
}

/**
 * Extracts all course images (from TipTap JSON, HTML, markdown, and lesson media fields)
 * into a deduplicated `images` array for the LEFT visual stage, while returning
 * `cleanContent` with duplicate inline images removed for the RIGHT explanation pane.
 */
export function extractCourseMediaAndCleanContent(
  lesson: CourseLesson | null | undefined,
  rawContent: unknown
): ExtractedCourseMedia {
  const images: string[] = [];
  const seenRaw = new Set<string>();

  let cleanContent: string | Record<string, unknown> = "";

  if (typeof rawContent === "string") {
    const trimmed = rawContent.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        const stripped = walkAndStripTiptap(parsed, images, seenRaw);
        cleanContent =
          stripped && typeof stripped === "object"
            ? (stripped as Record<string, unknown>)
            : { type: "doc", content: [] };
      } catch {
        cleanContent = stripImagesFromHtml(trimmed, images, seenRaw);
      }
    } else if (trimmed.includes("<") && trimmed.includes(">")) {
      cleanContent = stripImagesFromHtml(trimmed, images, seenRaw);
    } else if (trimmed) {
      cleanContent = trimmed.replace(
        /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
        (_m, src: string) => {
          addUniqueImage(images, seenRaw, src);
          return "";
        }
      ).trim();
    }
  } else if (rawContent && typeof rawContent === "object") {
    const stripped = walkAndStripTiptap(rawContent, images, seenRaw);
    cleanContent =
      stripped && typeof stripped === "object"
        ? (stripped as Record<string, unknown>)
        : { type: "doc", content: [] };
  }

  // Also append lesson-level media URLs if not already collected
  if (lesson) {
    const record = lesson as CourseLesson & {
      image_url?: string | null;
      lesson_image?: string | null;
      thumbnail_url?: string | null;
    };
    addUniqueImage(images, seenRaw, record.media_url);
    addUniqueImage(images, seenRaw, record.image_url);
    addUniqueImage(images, seenRaw, record.lesson_image);
    addUniqueImage(images, seenRaw, record.thumbnail_url);
  }

  return { images, cleanContent };
}

/**
 * Returns the first available image URL for a lesson (for thumbnails / previews).
 */
export function getLessonThumbnail(lesson: CourseLesson | null | undefined): string | null {
  if (!lesson) return null;
  const record = lesson as CourseLesson & {
    image_url?: string | null;
    lesson_image?: string | null;
    thumbnail_url?: string | null;
  };
  for (const cand of [record.lesson_image, record.image_url, record.media_url, record.thumbnail_url]) {
    if (isLikelyImageUrl(cand)) return extractRawImageUrl(cand) || cand;
  }
  const extracted = extractCourseMediaAndCleanContent(lesson, lesson.content);
  if (extracted.images.length > 0) return extracted.images[0];
  if (Array.isArray(lesson.topics)) {
    for (const tp of lesson.topics as Array<{ content?: unknown }>) {
      if (tp && tp.content) {
        const tpMedia = extractCourseMediaAndCleanContent(null, tp.content);
        if (tpMedia.images.length > 0) return tpMedia.images[0];
      }
    }
  }
  return null;
}
