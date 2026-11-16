"use client";

import { getSignedUploadUrl, deleteStorageObject } from "@/app/Admin/actions/courses";
import { compressImageFile } from "@/lib/image-compression";

const VALID_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_MB = 50;

export interface UploadResult {
  publicUrl: string;
  path: string;
}

export function validateFile(file: File): { valid: true } | { valid: false; error: string } {
  if (!VALID_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    return { valid: false, error: `File type not supported: ${file.type}` };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File exceeds ${MAX_SIZE_MB}MB limit.` };
  }
  return { valid: true };
}

export async function uploadCourseFile(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Automatically compress raster images client-side first, then route through
  // `/api/course/upload` where Sharp encodes optimized WebP (max 1280px, 1yr cache).
  if (file.type.startsWith("image/")) {
    const compressedFile = await compressImageFile(file, {
      maxDimension: 1280,
      quality: 0.80,
      minBytesToCompress: 15 * 1024,
    });

    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("folder", folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/course/upload", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && (parsed.publicUrl || parsed.url)) {
            resolve({
              publicUrl: parsed.publicUrl || parsed.url,
              path: parsed.path || "",
            });
          } else {
            reject(new Error(parsed.error || `Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        } catch {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed due to network error."));
      xhr.onabort = () => reject(new Error("Upload aborted."));

      xhr.send(formData);
    });
  }

  const extension = file.name.split(".").pop() || "";
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").slice(0, 40);
  const path = `${folder}/${Date.now()}-${sanitizedName}.${extension}`;

  const result = await getSignedUploadUrl(path);
  if (!result.success) {
    throw new Error(result.error);
  }

  const { signedUrl, publicUrl } = result.data;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ publicUrl, path });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed due to network error."));
    xhr.onabort = () => reject(new Error("Upload aborted."));

    xhr.send(file);
  });
}

export async function deleteCourseFile(path: string): Promise<void> {
  const result = await deleteStorageObject(path);
  if (!result.success) {
    throw new Error(result.error);
  }
}
