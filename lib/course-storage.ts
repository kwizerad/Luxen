"use client";

import { getSignedUploadUrl, deleteStorageObject } from "@/app/Admin/actions/courses";

const VALID_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
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
  if (!VALID_TYPES.includes(file.type)) {
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
