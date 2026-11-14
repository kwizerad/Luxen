import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_GUEST_EXAMS_PER_DAY = 3;
export const MAX_GUEST_EXAMS = MAX_GUEST_EXAMS_PER_DAY;
export const GUEST_QUOTA_COOKIE_NAME = "navo_gq_seal";
const QUOTA_TIMEZONE = "Africa/Kigali";

function getQuotaSecret(): string {
  return (
    process.env.GUEST_QUOTA_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_E2E_KEY ||
    "navo-guest-quota-hmac-secret-2026"
  );
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Returns YYYY-MM-DD for a Date in Africa/Kigali timezone so daily quotas reset consistently at midnight Kigali time.
 */
export function getKigaliDayKey(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: QUOTA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value || "2026";
    const m = parts.find((p) => p.type === "month")?.value || "01";
    const d = parts.find((p) => p.type === "day")?.value || "01";
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Returns the next midnight timestamp (ISO UTC) and remaining seconds in Africa/Kigali (UTC+2).
 */
export function getNextKigaliMidnight(now: Date = new Date()): {
  resetAt: string;
  resetInSeconds: number;
} {
  const dayKey = getKigaliDayKey(now);
  // Africa/Kigali is permanently UTC+02:00 (no DST)
  const todayMidnightMs = new Date(`${dayKey}T00:00:00+02:00`).getTime();
  const nextMidnightMs = Number.isFinite(todayMidnightMs)
    ? todayMidnightMs + 86_400_000
    : now.getTime() + 86_400_000;
  return {
    resetAt: new Date(nextMidnightMs).toISOString(),
    resetInSeconds: Math.max(0, Math.ceil((nextMidnightMs - now.getTime()) / 1000)),
  };
}

export function extractNormalizedClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const candidates = [
    forwardedFor ? forwardedFor.split(",")[0] : null,
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("true-client-ip"),
    req.headers.get("x-visitor-ip"),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let cleaned = raw.trim();
    if (!cleaned || cleaned.toLowerCase() === "unknown") continue;
    if (cleaned.startsWith("::ffff:")) cleaned = cleaned.slice(7);
    if (cleaned === "::1" || cleaned === "0:0:0:0:0:0:0:1") cleaned = "127.0.0.1";
    // Strip port if IPv4:port
    if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(cleaned)) {
      cleaned = cleaned.split(":")[0];
    }
    return cleaned;
  }

  return "unknown-ip";
}

export function sanitizeDeviceId(rawDeviceId?: string | null): string | null {
  if (!rawDeviceId || typeof rawDeviceId !== "string") return null;
  const trimmed = rawDeviceId.trim().slice(0, 128);
  if (trimmed.length < 8) return null;
  return trimmed;
}

export function signQuotaCookieValue(
  count: number,
  ipHash: string,
  dayKey: string = getKigaliDayKey()
): string {
  const compactDay = dayKey.replace(/-/g, "");
  const payload = `${count}:${compactDay}:${ipHash.slice(0, 16)}`;
  const sig = crypto
    .createHmac("sha256", getQuotaSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return `${payload}:${sig}`;
}

export function verifyQuotaCookieValue(
  cookieVal: string | undefined,
  expectedDayKey: string = getKigaliDayKey()
): number {
  if (!cookieVal) return 0;
  const parts = cookieVal.split(":");
  if (parts.length !== 4) return 0;
  const count = Number(parts[0]);
  const compactDay = parts[1];
  const ipPrefix = parts[2];
  const sig = parts[3];
  const expectedCompactDay = expectedDayKey.replace(/-/g, "");
  if (
    !Number.isFinite(count) ||
    count < 0 ||
    compactDay !== expectedCompactDay ||
    !ipPrefix ||
    !sig
  ) {
    return 0;
  }
  const expectedSig = crypto
    .createHmac("sha256", getQuotaSecret())
    .update(`${count}:${compactDay}:${ipPrefix}`)
    .digest("hex")
    .slice(0, 24);
  if (sig !== expectedSig) return 0;
  return count;
}

export interface GuestQuotaStatus {
  usedCount: number;
  remainingCount: number;
  maxAllowed: number;
  exhausted: boolean;
  ipHash: string;
  dayKey: string;
  resetAt: string;
  resetInSeconds: number;
}

async function readCountFromSystemConfig(
  adminSb: ReturnType<typeof createAdminClient>,
  keys: string[]
): Promise<number> {
  if (keys.length === 0) return 0;
  const { data } = await adminSb
    .from("system_config")
    .select("key, value")
    .in("key", keys);

  let maxCount = 0;
  for (const row of data || []) {
    if (!row?.value) continue;
    try {
      const parsed = JSON.parse(String(row.value));
      const c = Number(parsed?.count ?? 0);
      if (Number.isFinite(c) && c > maxCount) maxCount = c;
    } catch {
      const n = Number(row.value);
      if (Number.isFinite(n) && n > maxCount) maxCount = n;
    }
  }
  return maxCount;
}

export async function getGuestExamQuota(
  req: NextRequest,
  rawDeviceId?: string | null
): Promise<GuestQuotaStatus> {
  const adminSb = createAdminClient();
  const dayKey = getKigaliDayKey();
  const compactDay = dayKey.replace(/-/g, "");
  const ip = extractNormalizedClientIp(req);
  const ipHash = sha256Hex(`ip:${ip}`);
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;

  const keysToCheck = [`guest_quota_d_${compactDay}_ip_${ipHash}`];
  if (devHash) {
    keysToCheck.push(`guest_quota_d_${compactDay}_dev_${devHash}`);
  }

  let dbCount = 0;
  try {
    dbCount = await readCountFromSystemConfig(adminSb, keysToCheck);
  } catch (err) {
    console.warn("[GuestQuota] Failed reading system_config daily quota:", err);
  }

  // Also inspect anonymous_exam_attempts only if last_attempt_at occurred today (Kigali dayKey)
  try {
    if (deviceId || ip !== "unknown-ip") {
      const { data: anonRows } = await adminSb
        .from("anonymous_exam_attempts")
        .select("attempt_count, last_attempt_at")
        .or(
          [
            deviceId ? `fingerprint.eq.${deviceId}` : null,
            ip !== "unknown-ip" ? `ip_address.eq.${ip}` : null,
          ]
            .filter(Boolean)
            .join(",")
        );
      for (const r of anonRows || []) {
        if (!r?.last_attempt_at) continue;
        const rowDay = getKigaliDayKey(new Date(r.last_attempt_at));
        if (rowDay === dayKey) {
          const c = Number(r?.attempt_count ?? 0);
          if (Number.isFinite(c) && c > dbCount) dbCount = c;
        }
      }
    }
  } catch {
    // Optional table; system_config tracking already enforces daily quota
  }

  const cookieCount = verifyQuotaCookieValue(
    req.cookies.get(GUEST_QUOTA_COOKIE_NAME)?.value,
    dayKey
  );

  const usedCount = Math.min(
    MAX_GUEST_EXAMS_PER_DAY,
    Math.max(dbCount, cookieCount)
  );
  const remainingCount = Math.max(0, MAX_GUEST_EXAMS_PER_DAY - usedCount);
  const { resetAt, resetInSeconds } = getNextKigaliMidnight();

  return {
    usedCount,
    remainingCount,
    maxAllowed: MAX_GUEST_EXAMS_PER_DAY,
    exhausted: usedCount >= MAX_GUEST_EXAMS_PER_DAY,
    ipHash,
    dayKey,
    resetAt,
    resetInSeconds,
  };
}

export async function incrementGuestExamQuota(
  req: NextRequest,
  rawDeviceId?: string | null
): Promise<GuestQuotaStatus> {
  const current = await getGuestExamQuota(req, rawDeviceId);
  const nextCount = Math.min(MAX_GUEST_EXAMS_PER_DAY, current.usedCount + 1);
  const adminSb = createAdminClient();
  const ip = extractNormalizedClientIp(req);
  const ipHash = current.ipHash;
  const dayKey = current.dayKey;
  const compactDay = dayKey.replace(/-/g, "");
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;
  const nowIso = new Date().toISOString();

  const upserts: Array<{
    key: string;
    value: string;
    description: string;
    updated_at: string;
  }> = [
    {
      key: `guest_quota_d_${compactDay}_ip_${ipHash}`,
      value: JSON.stringify({ count: nextCount, dayKey, updatedAt: nowIso }),
      description: "Daily server-enforced guest exam quota",
      updated_at: nowIso,
    },
  ];

  if (devHash) {
    upserts.push({
      key: `guest_quota_d_${compactDay}_dev_${devHash}`,
      value: JSON.stringify({
        count: nextCount,
        dayKey,
        ipHash,
        updatedAt: nowIso,
      }),
      description: "Daily server-enforced guest exam quota",
      updated_at: nowIso,
    });
  }

  try {
    await adminSb.from("system_config").upsert(upserts, { onConflict: "key" });
  } catch (err) {
    console.warn("[GuestQuota] Failed persisting daily quota to system_config:", err);
  }

  // Best-effort sync to anonymous_exam_attempts if table exists
  if (deviceId) {
    try {
      await adminSb.from("anonymous_exam_attempts").upsert(
        {
          fingerprint: deviceId,
          ip_address: ip,
          attempt_count: nextCount,
          last_attempt_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "fingerprint" }
      );
    } catch {
      // Optional migration table
    }
  }

  const { resetAt, resetInSeconds } = getNextKigaliMidnight();

  return {
    usedCount: nextCount,
    remainingCount: Math.max(0, MAX_GUEST_EXAMS_PER_DAY - nextCount),
    maxAllowed: MAX_GUEST_EXAMS_PER_DAY,
    exhausted: nextCount >= MAX_GUEST_EXAMS_PER_DAY,
    ipHash,
    dayKey,
    resetAt,
    resetInSeconds,
  };
}

export function attachGuestQuotaCookie(
  res: NextResponse,
  quota: GuestQuotaStatus
): NextResponse {
  res.cookies.set(
    GUEST_QUOTA_COOKIE_NAME,
    signQuotaCookieValue(quota.usedCount, quota.ipHash, quota.dayKey),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 48,
    }
  );
  return res;
}
