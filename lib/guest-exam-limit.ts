import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_GUEST_EXAMS = 3;
export const GUEST_QUOTA_COOKIE_NAME = "navo_gq_seal";

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

export function signQuotaCookieValue(count: number, ipHash: string): string {
  const payload = `${count}:${ipHash.slice(0, 16)}`;
  const sig = crypto
    .createHmac("sha256", getQuotaSecret())
    .update(payload)
    .digest("hex")
    .slice(0, 24);
  return `${payload}:${sig}`;
}

export function verifyQuotaCookieValue(cookieVal: string | undefined): number {
  if (!cookieVal) return 0;
  const parts = cookieVal.split(":");
  if (parts.length !== 3) return 0;
  const count = Number(parts[0]);
  const ipPrefix = parts[1];
  const sig = parts[2];
  if (!Number.isFinite(count) || count < 0 || !ipPrefix || !sig) return 0;
  const expectedSig = crypto
    .createHmac("sha256", getQuotaSecret())
    .update(`${count}:${ipPrefix}`)
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
  const ip = extractNormalizedClientIp(req);
  const ipHash = sha256Hex(`ip:${ip}`);
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;

  const keysToCheck = [`guest_quota_ip_${ipHash}`];
  if (devHash) {
    keysToCheck.push(`guest_quota_dev_${devHash}`);
  }

  let dbCount = 0;
  try {
    dbCount = await readCountFromSystemConfig(adminSb, keysToCheck);
  } catch (err) {
    console.warn("[GuestQuota] Failed reading system_config quota:", err);
  }

  // Also check anonymous_exam_attempts if present in database
  try {
    if (deviceId || ip !== "unknown-ip") {
      const { data: anonRows } = await adminSb
        .from("anonymous_exam_attempts")
        .select("attempt_count")
        .or(
          [
            deviceId ? `fingerprint.eq.${deviceId}` : null,
            ip !== "unknown-ip" ? `ip_address.eq.${ip}` : null,
          ]
            .filter(Boolean)
            .join(",")
        );
      for (const r of anonRows || []) {
        const c = Number(r?.attempt_count ?? 0);
        if (Number.isFinite(c) && c > dbCount) dbCount = c;
      }
    }
  } catch {
    // Table may not be migrated in this environment; system_config tracking already enforces quota
  }

  const cookieCount = verifyQuotaCookieValue(
    req.cookies.get(GUEST_QUOTA_COOKIE_NAME)?.value
  );

  const usedCount = Math.min(MAX_GUEST_EXAMS, Math.max(dbCount, cookieCount));
  const remainingCount = Math.max(0, MAX_GUEST_EXAMS - usedCount);

  return {
    usedCount,
    remainingCount,
    maxAllowed: MAX_GUEST_EXAMS,
    exhausted: usedCount >= MAX_GUEST_EXAMS,
    ipHash,
  };
}

export async function incrementGuestExamQuota(
  req: NextRequest,
  rawDeviceId?: string | null
): Promise<GuestQuotaStatus> {
  const current = await getGuestExamQuota(req, rawDeviceId);
  const nextCount = Math.min(MAX_GUEST_EXAMS, current.usedCount + 1);
  const adminSb = createAdminClient();
  const ip = extractNormalizedClientIp(req);
  const ipHash = current.ipHash;
  const deviceId = sanitizeDeviceId(rawDeviceId);
  const devHash = deviceId ? sha256Hex(`dev:${deviceId}`) : null;
  const nowIso = new Date().toISOString();

  const upserts: Array<{ key: string; value: string; description: string; updated_at: string }> = [
    {
      key: `guest_quota_ip_${ipHash}`,
      value: JSON.stringify({ count: nextCount, updatedAt: nowIso }),
      description: "Server-enforced guest exam attempt quota per IP",
      updated_at: nowIso,
    },
  ];

  if (devHash) {
    upserts.push({
      key: `guest_quota_dev_${devHash}`,
      value: JSON.stringify({ count: nextCount, ipHash, updatedAt: nowIso }),
      description: "Server-enforced guest exam attempt quota per device fingerprint",
      updated_at: nowIso,
    });
  }

  try {
    await adminSb.from("system_config").upsert(upserts, { onConflict: "key" });
  } catch (err) {
    console.warn("[GuestQuota] Failed persisting quota to system_config:", err);
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

  return {
    usedCount: nextCount,
    remainingCount: Math.max(0, MAX_GUEST_EXAMS - nextCount),
    maxAllowed: MAX_GUEST_EXAMS,
    exhausted: nextCount >= MAX_GUEST_EXAMS,
    ipHash,
  };
}

export function attachGuestQuotaCookie(
  res: NextResponse,
  quota: GuestQuotaStatus
): NextResponse {
  res.cookies.set(
    GUEST_QUOTA_COOKIE_NAME,
    signQuotaCookieValue(quota.usedCount, quota.ipHash),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    }
  );
  return res;
}
