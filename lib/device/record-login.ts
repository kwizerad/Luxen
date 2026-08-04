import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ParsedDeviceInfo,
  GeoLocationInfo,
} from "@/lib/device.types";

export interface RecordLoginRequestBody {
  device: ParsedDeviceInfo;
  loginResult?: "success" | "failed" | "mfa_required" | "suspicious";
  failureReason?: string;
  sessionId?: string;
  authProvider?: string;
}

function getIpVersion(ip: string): "IPv4" | "IPv6" | undefined {
  if (!ip) return undefined;
  return ip.includes(":") ? "IPv6" : "IPv4";
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  // IPv4 private ranges
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip === "127.0.0.1" || ip === "0.0.0.0") return true;
  // IPv6 loopback and link-local
  if (ip === "::1" || ip.startsWith("fe80:")) return true;
  // Docker/internal networks
  if (ip.startsWith("172.")) return true;
  return false;
}

function getClientIp(request: NextRequest): string | undefined {
  // Check headers in order of trustworthiness for various CDN/proxy setups
  // Cloudflare
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && !isPrivateIp(cfConnectingIp)) return cfConnectingIp.trim();

  // Standard forwarded header (X-Forwarded-For: client, proxy1, proxy2)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first non-private IP in the chain
    const ips = forwarded.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (ip && !isPrivateIp(ip)) return ip;
    }
    // If all are private, use the first one (better than nothing)
    if (ips[0]) return ips[0];
  }

  // Nginx proxy
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Other common headers
  const clientIp = request.headers.get("x-client-ip");
  if (clientIp) return clientIp.trim();

  const trueClientIp = request.headers.get("x-true-client-ip");
  if (trueClientIp) return trueClientIp.trim();

  // Fallback to connection info (works only without proxy)
  // NextRequest doesn't expose socket directly, so we rely on headers
  return undefined;
}

async function getGeoFromIp(ip: string): Promise<Partial<GeoLocationInfo>> {
  const ipVersion = getIpVersion(ip);

  // Don't lookup geo for private/local IPs
  if (isPrivateIp(ip)) {
    return { ip, ipVersion };
  }

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "Navo/1.0" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ip, ipVersion };
    const data = await res.json();

    // Only return fields that have actual values — never fabricate
    const result: Partial<GeoLocationInfo> = { ip, ipVersion };

    if (data.country_name && typeof data.country_name === "string") {
      result.country = data.country_name;
    } else if (data.country && typeof data.country === "string" && data.country.length === 2) {
      // Some responses only have the 2-letter code
      result.countryCode = data.country;
    }

    if (data.country_code && typeof data.country_code === "string") {
      result.countryCode = data.country_code;
    } else if (data.country && typeof data.country === "string" && data.country.length === 2) {
      result.countryCode = data.country;
    }

    if (data.region && typeof data.region === "string") {
      result.region = data.region;
    } else if (data.region_code && typeof data.region_code === "string") {
      result.region = data.region_code;
    }

    if (data.city && typeof data.city === "string") {
      result.city = data.city;
    }

    if (typeof data.latitude === "number") {
      result.latitude = data.latitude;
    }

    if (typeof data.longitude === "number") {
      result.longitude = data.longitude;
    }

    return result;
  } catch {
    // GeoIP lookup failed — return IP only, no fabricated data
    return { ip, ipVersion };
  }
}

export async function recordLoginEvent(
  request: NextRequest,
  body: RecordLoginRequestBody,
  userId: string
): Promise<NextResponse> {
  const supabase = await createClient();
  const device = body.device;

  const ip = getClientIp(request) || "";
  const geo = ip ? await getGeoFromIp(ip) : { ip: "" };

  // Update existing user profile with latest activity timestamp
  await supabase
    .from("user_profiles")
    .update({ last_seen: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", userId);

  // Check whether this device fingerprint already exists for the user so we can
  // reliably detect genuinely new devices (the upsert row timestamps come from
  // different clocks, so comparing them is unreliable).
  const { data: existingDevice } = await supabase
    .from("user_devices")
    .select("id, first_seen_ip, ip_history")
    .eq("user_id", userId)
    .eq("fingerprint", device.fingerprint)
    .maybeSingle();

  const isNewDevice = !existingDevice;
  const resolvedIp = geo.ip || ip || null;

  const priorIpHistory: string[] = Array.isArray(existingDevice?.ip_history)
    ? (existingDevice.ip_history as string[])
    : [];
  const ipHistory = resolvedIp
    ? [...priorIpHistory.filter((h) => h !== resolvedIp), resolvedIp].slice(-20)
    : priorIpHistory;

  // Upsert device by (user_id, fingerprint)
  const { data: upsertedDevice, error: deviceError } = await supabase
    .from("user_devices")
    .upsert(
      {
        user_id: userId,
        fingerprint: device.fingerprint,
        device_type: device.deviceType,
        device_name: device.deviceName || null,
        browser: device.browser,
        browser_version: device.browserVersion,
        os: device.os,
        os_version: device.osVersion,
        cpu_architecture: device.cpuArchitecture || null,
        screen_resolution: device.screenResolution,
        viewport_size: device.viewportSize,
        device_pixel_ratio: device.devicePixelRatio,
        language: device.language,
        timezone: device.timezone,
        touch_support: device.touchSupport,
        cookies_enabled: device.cookiesEnabled,
        last_seen: new Date().toISOString(),
        last_seen_ip: resolvedIp,
        first_seen_ip: existingDevice?.first_seen_ip || resolvedIp,
        ip_version: geo.ipVersion || null,
        country: geo.country || null,
        country_code: geo.countryCode || null,
        region: geo.region || null,
        city: geo.city || null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        ip_history: ipHistory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,fingerprint" }
    )
    .select("id")
    .single();

  if (deviceError || !upsertedDevice) {
    console.error("recordLoginEvent device upsert error:", deviceError);
    return NextResponse.json(
      { error: "Failed to record device" },
      { status: 500 }
    );
  }

  const deviceId = upsertedDevice.id;

  // Look up prior successful logins (before inserting the current one) so we can
  // detect logins from a country/region never seen for this user before.
  const { data: priorLogins } = await supabase
    .from("login_history")
    .select("country, region")
    .eq("user_id", userId)
    .eq("login_result", "success")
    .not("country", "is", null);

  const hasPriorHistory = (priorLogins || []).length > 0;
  const isNewCountry =
    hasPriorHistory &&
    !!geo.country &&
    !(priorLogins || []).some((l) => l.country === geo.country);
  const isNewRegion =
    hasPriorHistory &&
    !!geo.region &&
    !isNewCountry &&
    !(priorLogins || []).some((l) => l.country === geo.country && l.region === geo.region);

  // Insert login history
  const { error: loginError } = await supabase.from("login_history").insert({
    user_id: userId,
    device_id: deviceId,
    ip_address: geo.ip || ip || null,
    ip_version: geo.ipVersion || null,
    country: geo.country || null,
    country_code: geo.countryCode || null,
    region: geo.region || null,
    city: geo.city || null,
    latitude: geo.latitude ?? null,
    longitude: geo.longitude ?? null,
    auth_provider: body.authProvider || null,
    login_result: body.loginResult || "success",
    failure_reason: body.failureReason || null,
    session_id: body.sessionId || null,
  });

  if (loginError) {
    return NextResponse.json(
      { error: "Failed to record login" },
      { status: 500 }
    );
  }

  // Security events
  const securityEvents: {
    user_id: string;
    device_id: number;
    event_type: string;
    severity: string;
    details: Record<string, unknown>;
    ip_address: string | null;
  }[] = [];

  if (isNewDevice) {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "new_device",
      severity: "warning",
      details: { browser: device.browser, os: device.os, deviceType: device.deviceType },
      ip_address: geo.ip || ip || null,
    });
  }

  if (isNewCountry) {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "new_country",
      severity: "warning",
      details: { country: geo.country, region: geo.region, city: geo.city },
      ip_address: geo.ip || ip || null,
    });
  } else if (isNewRegion) {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "new_region",
      severity: "safe",
      details: { country: geo.country, region: geo.region, city: geo.city },
      ip_address: geo.ip || ip || null,
    });
  }

  if (body.loginResult === "failed") {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "failed_login",
      severity: "warning",
      details: { reason: body.failureReason },
      ip_address: geo.ip || ip || null,
    });
  } else if (body.loginResult === "suspicious") {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "suspicious_login",
      severity: "critical",
      details: { reason: body.failureReason },
      ip_address: geo.ip || ip || null,
    });
  }

  // VPN/proxy heuristic (very coarse)
  const isReservedIp =
    ip?.startsWith("10.") ||
    ip?.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip || "") ||
    ip === "127.0.0.1";
  if (geo.country && !isReservedIp && (geo.country === "Tor" || body.loginResult === "suspicious")) {
    securityEvents.push({
      user_id: userId,
      device_id: deviceId,
      event_type: "vpn_proxy",
      severity: "warning",
      details: { country: geo.country },
      ip_address: geo.ip || ip || null,
    });
  }

  if (securityEvents.length > 0) {
    await supabase.from("security_events").insert(securityEvents);
  }

  // Multiple countries detection: count distinct countries in last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentLogins } = await supabase
    .from("login_history")
    .select("country")
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo)
    .not("country", "is", null);

  const distinctCountries = new Set(
    (recentLogins || []).map((l) => l.country).filter(Boolean)
  );
  if (distinctCountries.size > 1) {
    await supabase.from("security_events").insert({
      user_id: userId,
      device_id: deviceId,
      event_type: "multiple_countries",
      severity: "warning",
      details: { countries: Array.from(distinctCountries) },
      ip_address: geo.ip || ip || null,
    });
  }

  return NextResponse.json({ success: true });
}
