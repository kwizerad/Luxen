import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_GUEST_FREE_EXAM_LIMIT = 3;
export const DEFAULT_GUEST_RESET_VALUE = 1;
export const DEFAULT_GUEST_RESET_UNIT: GuestResetUnit = "days";

export const MAX_GUEST_EXAMS_PER_DAY = DEFAULT_GUEST_FREE_EXAM_LIMIT;
export const MAX_GUEST_EXAMS = DEFAULT_GUEST_FREE_EXAM_LIMIT;
export const GUEST_QUOTA_COOKIE_NAME = "navo_gq_seal";
const QUOTA_TIMEZONE = "Africa/Kigali";

export type GuestResetUnit = "hours" | "days";

export interface GuestQuotaPolicy {
  maxAllowed: number;
  resetValue: number;
  resetUnit: GuestResetUnit;
  windowMs: number;
}

export interface GuestQuotaStatus {
  usedCount: number;
  remainingCount: number;
  maxAllowed: number;
  exhausted: boolean;
  resetValue: number;
  resetUnit: GuestResetUnit;
  windowStart: string;
  ipHash: string;
  dayKey: string;
  resetAt: string;
  resetInSeconds: number;
}

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
 * Returns YYYY-MM-DD for a Date in Africa/Kigali timezone.
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
  windowStartMs: number
): string {
  const windowStartSec = Math.floor(windowStartMs / 1000);
  const payload = `v2:${count}:${windowStartSec}:${ipHash.slice(0, 16)}`;
  const sig = crypto
    .createHmac("sha256", getQuotaSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return `${payload}:${sig}`;
}

export function verifyQuotaCookieValue(
  cookieVal: string | undefined,
  windowMs: number,
  expectedDayKey: string = getKigaliDayKey(),
  nowMs: number = Date.now()
): { count: number; windowStartMs: number | null } {
  if (!cookieVal) return { count: 0, windowStartMs: null };
  const parts = cookieVal.split(":");

  // New v2 cookie: v2:count:windowStartSec:ipPrefix:sig
  if (parts.length === 5 && parts[0] === "v2") {
    const count = Number(parts[1]);
    const windowStartSec = Number(parts[2]);
    const ipPrefix = parts[3];
    const sig = parts[4];
    if (
      !Number.isFinite(count) ||
      count < 0 ||
      !Number.isFinite(windowStartSec) ||
      windowStartSec <= 0 ||
      !ipPrefix ||
      !sig
    ) {
      return { count: 0, windowStartMs: null };
    }
    const payload = `v2:${count}:${windowStartSec}:${ipPrefix}`;
    const expectedSig = crypto
      .createHmac("sha256", getQuotaSecret())
      .update(payload)
      .digest("hex")
      .slice(0, 24);
    if (sig !== expectedSig) return { count: 0, windowStartMs: null };

    const startMs = windowStartSec * 1000;
    if (nowMs - startMs >= windowMs) {
      return { count: 0, windowStartMs: null };
    }
    return { count, windowStartMs: startMs };
  }

  // Legacy v1 cookie compatibility: count:compactDay:ipPrefix:sig
  if (parts.length === 4) {
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
      return { count: 0, windowStartMs: null };
    }
    const expectedSig = crypto
      .createHmac("sha256", getQuotaSecret())
      .update(`${count}:${compactDay}:${ipPrefix}`)
      .digest("hex")
      .slice(0, 24);
    if (sig !== expectedSig) return { count: 0, windowStartMs: null };
    const dayStartMs = new Date(`${expectedDayKey}T00:00:00+02:00`).getTime();
    if (Number.isFinite(dayStartMs) && nowMs - dayStartMs >= windowMs) {
      return { count: 0, windowStartMs: null };
    }
    return { count, windowStartMs: Number.isFinite(dayStartMs) ? dayStartMs : nowMs };
  }

  return { count: 0, windowStartMs: null };
}

function parsePolicy(configMap: Map<string, string>): GuestQuotaPolicy {
  const rawLimit = Number(configMap.get("guest_free_exam_limit"));
  const maxAllowed =
    Number.isFinite(rawLimit) && rawLimit >= 0 && rawLimit <= 100
      ? Math.floor(rawLimit)
      : DEFAULT_GUEST_FREE_EXAM_LIMIT;

  const rawResetVal = Number(configMap.get("guest_exam_reset_value"));
  const resetValue =
    Number.isFinite(rawResetVal) && rawResetVal >= 1 && rawResetVal <= 365
      ? Math.floor(rawResetVal)
      : DEFAULT_GUEST_RESET_VALUE;

  const rawUnit = String(configMap.get("guest_exam_reset_unit") || "")
    .trim()
    .toLowerCase();
  const resetUnit: GuestResetUnit = rawUnit === "hours" ? "hours" : "days";

  const windowMs =
    resetUnit === "days"
      ? resetValue * 86_400_000
      : resetValue * 3_600_000;

  return { maxAllowed, resetValue, resetUnit, windowMs };
}

export async function getGuestQuotaPolicy(
  adminSb: ReturnType<typeof createAdminClient> = createAdminClient()
): Promise<GuestQuotaPolicy> {
  try {
    const { data } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", [
        "guest_free_exam_limit",
        "guest_exam_reset_value",
        "guest_exam_reset_unit",
      ]);

    const map = new Map<string, string>();
    for (const row of data || []) {
      if (row?.key && row?.value !== undefined && row?.value !== null) {
        map.set(String(row.key), String(row.value));
      }
    }
    return parsePolicy(map);
  } catch {
    return parsePolicy(new Map());
  }
}

export async function getGuestExamQuota(
  req: NextRequest,
  rawDeviceId?: string | null
): Promise<GuestQuotaStatus> {
  const adminSb = createAdminClient();
  const nowMs = Date.now();
  const nowDate = new Date(nowMs);
  const dayKey = getKigaliDayKey(nowDate);
  const compactDay = dayKey.replace(/-/g, "");
  const ip = extractNormalizedClientIp(req);
  const ipHash = sha256Hex(`ip:${ip}`);
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;

  const v2IpKey = `guest_quota_v2_ip_${ipHash}`;
  const v2DevKey = devHash ? `guest_quota_v2_dev_${devHash}` : null;
  const legacyIpKey = `guest_quota_d_${compactDay}_ip_${ipHash}`;
  const legacyDevKey = devHash ? `guest_quota_d_${compactDay}_dev_${devHash}` : null;

  const keysToFetch = [
    "guest_free_exam_limit",
    "guest_exam_reset_value",
    "guest_exam_reset_unit",
    v2IpKey,
    legacyIpKey,
    ...(v2DevKey ? [v2DevKey] : []),
    ...(legacyDevKey ? [legacyDevKey] : []),
  ];

  const configMap = new Map<string, string>();
  try {
    const { data } = await adminSb
      .from("system_config")
      .select("key, value")
      .in("key", keysToFetch);

    for (const row of data || []) {
      if (row?.key && row?.value !== undefined && row?.value !== null) {
        configMap.set(String(row.key), String(row.value));
      }
    }
  } catch (err) {
    console.warn("[GuestQuota] Failed reading system_config quota:", err);
  }

  const policy = parsePolicy(configMap);

  let bestCount = 0;
  let earliestActiveWindowStartMs: number | null = null;

  const considerUsage = (count: number, windowStartMs: number | null) => {
    if (!Number.isFinite(count) || count <= 0) return;
    const effectiveStart = windowStartMs ?? nowMs;
    if (nowMs - effectiveStart >= policy.windowMs) return;
    if (count > bestCount) bestCount = count;
    if (
      earliestActiveWindowStartMs === null ||
      effectiveStart < earliestActiveWindowStartMs
    ) {
      earliestActiveWindowStartMs = effectiveStart;
    }
  };

  // Evaluate v2 persistent tracking keys
  for (const k of [v2IpKey, v2DevKey].filter(Boolean) as string[]) {
    const rawVal = configMap.get(k);
    if (!rawVal) continue;
    try {
      const parsed = JSON.parse(rawVal);
      const count = Number(parsed?.count ?? 0);
      const startMs = parsed?.windowStart ? Date.parse(String(parsed.windowStart)) : NaN;
      if (Number.isFinite(startMs)) {
        considerUsage(count, startMs);
      }
    } catch {
      // ignore malformed
    }
  }

  // Fallback compatibility with today's legacy v1 daily keys
  for (const k of [legacyIpKey, legacyDevKey].filter(Boolean) as string[]) {
    const rawVal = configMap.get(k);
    if (!rawVal) continue;
    try {
      const parsed = JSON.parse(rawVal);
      const count = Number(parsed?.count ?? 0);
      const updatedMs = parsed?.updatedAt ? Date.parse(String(parsed.updatedAt)) : nowMs;
      considerUsage(count, Number.isFinite(updatedMs) ? updatedMs : nowMs);
    } catch {
      // ignore
    }
  }

  // Also inspect anonymous_exam_attempts within current rolling window
  try {
    if (deviceId || ip !== "unknown-ip") {
      const { data: anonRows } = await adminSb
        .from("anonymous_exam_attempts")
        .select("attempt_count, first_attempt_at, last_attempt_at")
        .or(
          [
            deviceId ? `fingerprint.eq.${deviceId}` : null,
            ip !== "unknown-ip" ? `ip_address.eq.${ip}` : null,
          ]
            .filter(Boolean)
            .join(",")
        );

      for (const r of anonRows || []) {
        const refTs = r?.first_attempt_at || r?.last_attempt_at;
        if (!refTs) continue;
        const startMs = Date.parse(String(refTs));
        if (!Number.isFinite(startMs)) continue;
        considerUsage(Number(r?.attempt_count ?? 0), startMs);
      }
    }
  } catch {
    // Optional table
  }

  // Check HMAC cookie
  const cookieInfo = verifyQuotaCookieValue(
    req.cookies.get(GUEST_QUOTA_COOKIE_NAME)?.value,
    policy.windowMs,
    dayKey,
    nowMs
  );
  considerUsage(cookieInfo.count, cookieInfo.windowStartMs);

  const usedCount = Math.min(policy.maxAllowed, bestCount);
  const remainingCount = Math.max(0, policy.maxAllowed - usedCount);
  const activeStartMs =
    usedCount > 0 && earliestActiveWindowStartMs !== null
      ? earliestActiveWindowStartMs
      : nowMs;
  const resetAtMs = activeStartMs + policy.windowMs;
  const resetInSeconds =
    usedCount > 0 ? Math.max(0, Math.ceil((resetAtMs - nowMs) / 1000)) : 0;

  return {
    usedCount,
    remainingCount,
    maxAllowed: policy.maxAllowed,
    exhausted: usedCount >= policy.maxAllowed,
    resetValue: policy.resetValue,
    resetUnit: policy.resetUnit,
    windowStart: new Date(activeStartMs).toISOString(),
    ipHash,
    dayKey,
    resetAt: new Date(resetAtMs).toISOString(),
    resetInSeconds,
  };
}

export async function incrementGuestExamQuota(
  req: NextRequest,
  rawDeviceId?: string | null
): Promise<GuestQuotaStatus> {
  const current = await getGuestExamQuota(req, rawDeviceId);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const windowStartIso =
    current.usedCount > 0 && current.windowStart ? current.windowStart : nowIso;
  const windowStartMs = Date.parse(windowStartIso) || nowMs;
  const nextCount = Math.min(current.maxAllowed, current.usedCount + 1);

  const adminSb = createAdminClient();
  const ip = extractNormalizedClientIp(req);
  const ipHash = current.ipHash;
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;

  const windowMs =
    current.resetUnit === "days"
      ? current.resetValue * 86_400_000
      : current.resetValue * 3_600_000;
  const resetAtMs = windowStartMs + windowMs;
  const resetInSeconds = Math.max(0, Math.ceil((resetAtMs - nowMs) / 1000));

  const upserts: Array<{
    key: string;
    value: string;
    description: string;
    updated_at: string;
  }> = [
    {
      key: `guest_quota_v2_ip_${ipHash}`,
      value: JSON.stringify({
        count: nextCount,
        windowStart: windowStartIso,
        updatedAt: nowIso,
      }),
      description: "Server-enforced guest exam quota window",
      updated_at: nowIso,
    },
  ];

  if (devHash) {
    upserts.push({
      key: `guest_quota_v2_dev_${devHash}`,
      value: JSON.stringify({
        count: nextCount,
        windowStart: windowStartIso,
        ipHash,
        updatedAt: nowIso,
      }),
      description: "Server-enforced guest exam quota window",
      updated_at: nowIso,
    });
  }

  try {
    await adminSb.from("system_config").upsert(upserts, { onConflict: "key" });
  } catch (err) {
    console.warn("[GuestQuota] Failed persisting quota to system_config:", err);
  }

  if (deviceId) {
    try {
      await adminSb.from("anonymous_exam_attempts").upsert(
        {
          fingerprint: deviceId,
          ip_address: ip,
          attempt_count: nextCount,
          first_attempt_at: windowStartIso,
          last_attempt_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "fingerprint" }
      );
    } catch {
      // Optional migration table
    }
  }

  return {
    usedCount: nextCount,
    remainingCount: Math.max(0, current.maxAllowed - nextCount),
    maxAllowed: current.maxAllowed,
    exhausted: nextCount >= current.maxAllowed,
    resetValue: current.resetValue,
    resetUnit: current.resetUnit,
    windowStart: windowStartIso,
    ipHash,
    dayKey: current.dayKey,
    resetAt: new Date(resetAtMs).toISOString(),
    resetInSeconds,
  };
}

export function attachGuestQuotaCookie(
  res: NextResponse,
  quota: GuestQuotaStatus
): NextResponse {
  const windowStartMs = Date.parse(quota.windowStart) || Date.now();
  const windowSec =
    quota.resetUnit === "days"
      ? quota.resetValue * 86_400
      : quota.resetValue * 3_600;
  res.cookies.set(
    GUEST_QUOTA_COOKIE_NAME,
    signQuotaCookieValue(quota.usedCount, quota.ipHash, windowStartMs),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.max(3600, windowSec + 3600),
    }
  );
  return res;
}
