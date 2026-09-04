import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  clientIp?: string;
}

function getIpVersion(ip: string): "IPv4" | "IPv6" | undefined {
  if (!ip) return undefined;
  return ip.includes(":") ? "IPv6" : "IPv4";
}

function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.replace(/^::ffff:/, "").trim();
  // IPv4 private ranges
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (clean === "127.0.0.1" || clean === "0.0.0.0" || clean === "localhost") return true;
  // IPv6 loopback and link-local
  if (clean === "::1" || clean.startsWith("fe80:") || clean.startsWith("fc00:") || clean.startsWith("fd00:")) return true;
  // Docker/internal networks
  if (clean.startsWith("172.")) return true;
  return false;
}

function getClientIp(request: NextRequest, clientIpFallback?: string): string | undefined {
  // 1. Primary priority: Client-verified public IP directly fetched by the user's browser.
  // In reverse-proxied / container environments (Google Cloud Run / Kubernetes / Nginx),
  // server headers often reflect the load-balancer or gateway instead of the true client IP.
  if (clientIpFallback && !isPrivateIp(clientIpFallback) && clientIpFallback.length >= 7) {
    return clientIpFallback.trim();
  }

  // 2. Cloudflare Connecting IP
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && !isPrivateIp(cfConnectingIp)) return cfConnectingIp.trim();

  // 3. GCP Cloud Run / AppEngine user IP
  const gcpIp = request.headers.get("x-appengine-user-ip");
  if (gcpIp && !isPrivateIp(gcpIp)) return gcpIp.trim();

  // 4. Fastly / Akamai / standard CDNs
  const fastlyIp = request.headers.get("fastly-client-ip");
  if (fastlyIp && !isPrivateIp(fastlyIp)) return fastlyIp.trim();

  const trueClientIp = request.headers.get("x-true-client-ip");
  if (trueClientIp && !isPrivateIp(trueClientIp)) return trueClientIp.trim();

  // 5. Standard forwarded header (X-Forwarded-For: client, proxy1, proxy2) - first non-private IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (ip && !isPrivateIp(ip)) return ip;
    }
  }

  // 6. Nginx proxy / real ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp && !isPrivateIp(realIp)) return realIp.trim();

  const clientIpHeader = request.headers.get("x-client-ip");
  if (clientIpHeader && !isPrivateIp(clientIpHeader)) return clientIpHeader.trim();

  const clusterIp = request.headers.get("x-cluster-client-ip");
  if (clusterIp && !isPrivateIp(clusterIp)) return clusterIp.trim();

  // 7. Fallback if only private IP found
  if (clientIpFallback) return clientIpFallback.trim();
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  if (realIp) return realIp.trim();

  return undefined;
}

async function getGeoFromIp(ip: string): Promise<Partial<GeoLocationInfo>> {
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  const ipVersion = getIpVersion(cleanIp);

  // Don't lookup geo for private/local IPs
  if (isPrivateIp(cleanIp)) {
    return { ip: cleanIp, ipVersion };
  }

  // Multi-provider GeoIP resolution cascade with fast timeouts

  // Provider 1: ipwho.is (fast, reliable, rich data)
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.country) {
        return {
          ip: cleanIp,
          ipVersion: data.type === "IPv6" ? "IPv6" : ipVersion || "IPv4",
          country: data.country || undefined,
          countryCode: data.country_code || undefined,
          region: data.region || undefined,
          city: data.city || undefined,
          latitude: typeof data.latitude === "number" ? data.latitude : undefined,
          longitude: typeof data.longitude === "number" ? data.longitude : undefined,
        };
      }
    }
  } catch {
    // try next provider
  }

  // Provider 2: freeipapi.com
  try {
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(cleanIp)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.countryName && data.countryName !== "-") {
        return {
          ip: cleanIp,
          ipVersion: data.ipVersion === 6 ? "IPv6" : ipVersion || "IPv4",
          country: data.countryName || undefined,
          countryCode: data.countryCode && data.countryCode !== "-" ? data.countryCode : undefined,
          region: data.regionName && data.regionName !== "-" ? data.regionName : undefined,
          city: data.cityName && data.cityName !== "-" ? data.cityName : undefined,
          latitude: typeof data.latitude === "number" ? data.latitude : undefined,
          longitude: typeof data.longitude === "number" ? data.longitude : undefined,
        };
      }
    }
  } catch {
    // try next provider
  }

  // Provider 3: ip-api.com
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,country,countryCode,regionName,city,lat,lon`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.country) {
        return {
          ip: cleanIp,
          ipVersion,
          country: data.country || undefined,
          countryCode: data.countryCode || undefined,
          region: data.regionName || undefined,
          city: data.city || undefined,
          latitude: typeof data.lat === "number" ? data.lat : undefined,
          longitude: typeof data.lon === "number" ? data.lon : undefined,
        };
      }
    }
  } catch {
    // try next provider
  }

  // Provider 4: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`, {
      headers: { "User-Agent": "Navo/1.0" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.country_name || data.country) {
        return {
          ip: cleanIp,
          ipVersion,
          country: data.country_name || data.country || undefined,
          countryCode: data.country_code || data.country || undefined,
          region: data.region || data.region_code || undefined,
          city: data.city || undefined,
          latitude: typeof data.latitude === "number" ? data.latitude : undefined,
          longitude: typeof data.longitude === "number" ? data.longitude : undefined,
        };
      }
    }
  } catch {
    // GeoIP lookup failed — return IP only
  }

  return { ip: cleanIp, ipVersion };
}

export async function recordLoginEvent(
  request: NextRequest,
  body: RecordLoginRequestBody,
  userId: string
): Promise<NextResponse> {
  const supabase = createAdminClient();
  const device = body.device;

  const rawIp = getClientIp(request, body.clientIp) || "";
  const geo = rawIp ? await getGeoFromIp(rawIp) : { ip: "" };
  const ip = geo.ip || rawIp;
  const resolvedIp = geo.ip || ip || null;

  // Update user profile with latest activity
  try {
    const profileUpdate: Record<string, any> = {
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (resolvedIp) profileUpdate.last_ip = resolvedIp;
    if (device.deviceType) profileUpdate.device_type = device.deviceType;
    if (device.browser) profileUpdate.browser = device.browser;
    if (device.os) profileUpdate.os = device.os;

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update(profileUpdate)
      .eq("id", userId);

    if (profileErr) {
      await supabase
        .from("user_profiles")
        .update({ last_seen: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", userId);
    }
  } catch {
    // Non-critical profile update
  }

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

  const priorIpHistory: string[] = Array.isArray(existingDevice?.ip_history)
    ? (existingDevice.ip_history as string[])
    : [];
  const ipHistory = resolvedIp
    ? [...priorIpHistory.filter((h) => h !== resolvedIp), resolvedIp].slice(-20)
    : priorIpHistory;

  // Save/Update device by user_id and fingerprint
  const devicePayload = {
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
  };

  let deviceId: number | null = null;

  if (existingDevice?.id) {
    const { data: updated, error: updateErr } = await supabase
      .from("user_devices")
      .update(devicePayload)
      .eq("id", existingDevice.id)
      .select("id")
      .maybeSingle();

    if (!updateErr && updated?.id) {
      deviceId = updated.id;
    }
  }

  if (!deviceId) {
    const { data: inserted, error: insertErr } = await supabase
      .from("user_devices")
      .insert(devicePayload)
      .select("id")
      .maybeSingle();

    if (!insertErr && inserted?.id) {
      deviceId = inserted.id;
    } else {
      // Fallback: upsert on conflict
      const { data: upserted, error: upsertErr } = await supabase
        .from("user_devices")
        .upsert(devicePayload, { onConflict: "user_id,fingerprint" })
        .select("id")
        .maybeSingle();

      if (!upsertErr && upserted?.id) {
        deviceId = upserted.id;
      }
    }
  }

  if (!deviceId) {
    // Secondary fallback: select the device id if it was created
    const { data: fallbackDev } = await supabase
      .from("user_devices")
      .select("id")
      .eq("user_id", userId)
      .eq("fingerprint", device.fingerprint)
      .maybeSingle();
    deviceId = fallbackDev?.id || null;
  }

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
    device_id?: number | null;
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
