"use client";

import { secureApiPost } from "@/lib/e2e-crypto";

const DEVICE_STORAGE_KEY = "navo_device_fp";
const DEVICE_COOKIE_NAME = "navo_device_fp";
const PENDING_EXAM_KEY = "navo_pending_guest_exam";

export interface PendingGuestExamPayload {
  category_id: string;
  category_name: string;
  total_questions: number;
  answers: Array<{
    question_id: string;
    selected_answer: "A" | "B" | "C" | "D" | null;
    time_spent_seconds: number;
  }>;
  duration_seconds: number;
  status: "completed" | "abandoned";
  submission_reason?: string;
  violation_summary?: string;
  score_percentage?: number;
  savedAt: number;
}

function hashString32(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${part1}${part2}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

function writeCookie(name: string, val: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {}
}

export function getGuestDeviceId(): string {
  if (typeof window === "undefined") return "server-ssr";

  // Deterministic browser + hardware traits so incognito / cleared storage on the same device maps consistently
  const traits = [
    navigator.userAgent || "",
    navigator.platform || "",
    navigator.language || "",
    String(screen?.width || 0),
    String(screen?.height || 0),
    String(screen?.colorDepth || 0),
    String(navigator.hardwareConcurrency || 0),
    Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "",
  ].join("|");
  const deterministicSig = hashString32(traits);

  let stored: string | null = null;
  try {
    stored = localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {}
  if (!stored) {
    stored = readCookie(DEVICE_COOKIE_NAME);
  }

  // Always prefer deterministic + persistent signature on the device
  const deviceId =
    stored && stored.startsWith(`nd_${deterministicSig}`)
      ? stored
      : `nd_${deterministicSig}`;

  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  } catch {}
  writeCookie(DEVICE_COOKIE_NAME, deviceId);

  return deviceId;
}

export function savePendingGuestExam(payload: PendingGuestExamPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_EXAM_KEY, JSON.stringify(payload));
  } catch {}
}

export function getPendingGuestExam(): PendingGuestExamPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_EXAM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.answers)) return null;
    return parsed as PendingGuestExamPayload;
  } catch {
    return null;
  }
}

export function clearPendingGuestExam(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_EXAM_KEY);
  } catch {}
}

let isClaimingInFlight = false;

export async function claimPendingGuestExamIfAny(): Promise<{
  claimed: boolean;
  is_saved?: boolean;
}> {
  if (typeof window === "undefined" || isClaimingInFlight) {
    return { claimed: false };
  }
  const pending = getPendingGuestExam();
  if (!pending) return { claimed: false };

  isClaimingInFlight = true;
  try {
    const { ok, data } = await secureApiPost("/api/guest-exam", {
      action: "claim",
      attemptData: pending,
    });
    if (ok && data?.success) {
      clearPendingGuestExam();
      return { claimed: true, is_saved: Boolean(data.is_saved) };
    }
    return { claimed: false };
  } catch {
    return { claimed: false };
  } finally {
    isClaimingInFlight = false;
  }
}
