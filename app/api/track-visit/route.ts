import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.replace(/^::ffff:/, "").trim();
  if (clean === "127.0.0.1" || clean === "0.0.0.0" || clean === "localhost" || clean === "::1") return true;
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (clean.startsWith("fe80:") || clean.startsWith("fc00:") || clean.startsWith("fd00:")) return true;
  return false;
}

function getClientIP(req: Request, clientIpFallback?: string): string {
  const headers = req.headers;

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp && !isPrivateIp(cfConnectingIp)) return cfConnectingIp.trim();

  const gcpIp = headers.get("x-appengine-user-ip");
  if (gcpIp && !isPrivateIp(gcpIp)) return gcpIp.trim();

  const fastlyIp = headers.get("fastly-client-ip");
  if (fastlyIp && !isPrivateIp(fastlyIp)) return fastlyIp.trim();

  const trueClientIp = headers.get("x-true-client-ip");
  if (trueClientIp && !isPrivateIp(trueClientIp)) return trueClientIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim());
    for (const ip of ips) {
      if (ip && !isPrivateIp(ip)) return ip;
    }
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && !isPrivateIp(realIp)) return realIp.trim();

  const clientIp = headers.get("x-client-ip");
  if (clientIp && !isPrivateIp(clientIp)) return clientIp.trim();

  if (clientIpFallback && !isPrivateIp(clientIpFallback)) {
    return clientIpFallback.trim();
  }

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  if (realIp) return realIp.trim();
  if (clientIpFallback) return clientIpFallback.trim();

  return "unknown";
}

async function getGeoFromIp(ip: string): Promise<{
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}> {
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  if (!cleanIp || isPrivateIp(cleanIp) || cleanIp === "unknown") {
    return {};
  }

  // Provider 1: ipwho.is
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success !== false && data.country) {
        return {
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
    // try next
  }

  // Provider 2: freeipapi.com
  try {
    const res = await fetch(`https://freeipapi.com/api/json/${encodeURIComponent(cleanIp)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.countryName && data.countryName !== "-") {
        return {
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
    // try next
  }

  // Provider 3: ip-api.com
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,country,countryCode,regionName,city,lat,lon`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === "success" && data.country) {
        return {
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
    // GeoIP failed
  }

  return {};
}

function parseBrowserInfo(userAgent: string) {
  let os = "unknown";
  let browser = "unknown";
  let browserVersion = "unknown";

  const osMatch = userAgent.match(/\(([^)]+)\)/);
  if (osMatch) {
    os = osMatch[1];
  }

  if (/Chrome\/([\d.]+)/i.test(userAgent)) {
    browser = "Chrome";
    browserVersion = userAgent.match(/Chrome\/([\d.]+)/i)?.[1] || "";
  } else if (/Edg\/([\d.]+)/i.test(userAgent)) {
    browser = "Edge";
    browserVersion = userAgent.match(/Edg\/([\d.]+)/i)?.[1] || "";
  } else if (/Safari\/([\d.]+)/i.test(userAgent) && /Version\/([\d.]+)/i.test(userAgent)) {
    browser = "Safari";
    browserVersion = userAgent.match(/Version\/([\d.]+)/i)?.[1] || "";
  } else if (/Firefox\/([\d.]+)/i.test(userAgent)) {
    browser = "Firefox";
    browserVersion = userAgent.match(/Firefox\/([\d.]+)/i)?.[1] || "";
  } else if (/OPR\/([\d.]+)|Opera\/([\d.]+)/i.test(userAgent)) {
    browser = "Opera";
    browserVersion =
      userAgent.match(/OPR\/([\d.]+)/i)?.[1] ||
      userAgent.match(/Opera\/([\d.]+)/i)?.[1] ||
      "";
  }

  return { os, browser, browserVersion };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fingerprint,
      screenWidth,
      screenHeight,
      deviceType,
      language,
      timezone,
      referrer,
      landingPage,
      userAgent,
      touchSupport,
      cookiesEnabled,
      clientIp,
      userId,
      browser: customBrowser,
      browserVersion: customBrowserVersion,
      os: customOs,
    } = body || {};

    if (!fingerprint) {
      return NextResponse.json({ error: "Missing fingerprint" }, { status: 400 });
    }

    const ipAddress = getClientIP(req, clientIp);
    const parsed = parseBrowserInfo(userAgent || "");
    const browser = customBrowser || parsed.browser;
    const browserVersion = customBrowserVersion || parsed.browserVersion;
    const os = customOs || parsed.os;

    const geo = await getGeoFromIp(ipAddress);

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ ok: true, ip: ipAddress, unconfigured: true });
    }

    const supabase = createAdminClient();
    const { data: existing, error: selectError } = await supabase
      .from("anonymous_visits")
      .select("id, visit_count, linked_user_id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (selectError) {
      if (!selectError.message?.includes("fetch failed")) {
        console.warn("[track-visit] anonymous_visits query warning:", selectError.message);
      }
      return NextResponse.json({ ok: false, warning: selectError.message }, { status: 200 });
    }

    const now = new Date().toISOString();

    const visitPayload = {
      fingerprint,
      ip_address: ipAddress !== "unknown" ? ipAddress : null,
      user_agent: userAgent || null,
      os: os || null,
      browser: browser || null,
      browser_version: browserVersion || null,
      screen_width: screenWidth || null,
      screen_height: screenHeight || null,
      device_type: deviceType || null,
      language: language || null,
      timezone: timezone || null,
      referrer: referrer || null,
      landing_page: landingPage || null,
      touch_support: typeof touchSupport === "boolean" ? touchSupport : null,
      cookies_enabled: typeof cookiesEnabled === "boolean" ? cookiesEnabled : null,
      country: geo.country || null,
      region: geo.region || null,
      city: geo.city || null,
      latitude: geo.latitude ?? null,
      longitude: geo.longitude ?? null,
      linked_user_id: userId || existing?.linked_user_id || null,
      last_seen: now,
      updated_at: now,
    };

    const effectiveUserId = userId || existing?.linked_user_id || null;

    if (existing) {
      const { error: updateError } = await supabase
        .from("anonymous_visits")
        .update({
          ...visitPayload,
          linked_user_id: effectiveUserId,
          visit_count: (existing.visit_count || 0) + 1,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.warn("[track-visit] anonymous_visits update warning:", updateError.message);
      }
    } else {
      const { error: insertError } = await supabase.from("anonymous_visits").insert({
        ...visitPayload,
        linked_user_id: effectiveUserId,
        visit_count: 1,
        first_seen: now,
      });

      if (insertError) {
        console.warn("[track-visit] anonymous_visits insert warning:", insertError.message);
      }
    }

    // If a user ID is known, ensure user_profiles and user_devices are kept up to date
    if (effectiveUserId) {
      try {
        const resolvedIp = ipAddress !== "unknown" ? ipAddress : null;

        // 1. Update user profile
        const profileUpdate: Record<string, any> = {
          last_seen: now,
          updated_at: now,
        };
        if (resolvedIp) profileUpdate.last_ip = resolvedIp;
        if (deviceType) profileUpdate.device_type = deviceType;
        if (browser) profileUpdate.browser = browser;
        if (os) profileUpdate.os = os;

        await supabase
          .from("user_profiles")
          .update(profileUpdate)
          .eq("id", effectiveUserId);

        // 2. Fetch existing device or upsert
        const { data: existingDevice } = await supabase
          .from("user_devices")
          .select("id, first_seen_ip, ip_history")
          .eq("user_id", effectiveUserId)
          .eq("fingerprint", fingerprint)
          .maybeSingle();

        const priorIpHistory: string[] = Array.isArray(existingDevice?.ip_history)
          ? (existingDevice.ip_history as string[])
          : [];
        const ipHistory = resolvedIp
          ? [...priorIpHistory.filter((h) => h !== resolvedIp), resolvedIp].slice(-20)
          : priorIpHistory;

        const screenResolution = screenWidth && screenHeight ? `${screenWidth}x${screenHeight}` : null;

        const devicePayload = {
          user_id: effectiveUserId,
          fingerprint,
          device_type: deviceType || null,
          browser: browser || null,
          browser_version: browserVersion || null,
          os: os || null,
          screen_resolution: screenResolution,
          language: language || null,
          timezone: timezone || null,
          touch_support: typeof touchSupport === "boolean" ? touchSupport : null,
          cookies_enabled: typeof cookiesEnabled === "boolean" ? cookiesEnabled : null,
          last_seen: now,
          last_seen_ip: resolvedIp,
          first_seen_ip: existingDevice?.first_seen_ip || resolvedIp,
          country: geo.country || null,
          country_code: geo.countryCode || null,
          region: geo.region || null,
          city: geo.city || null,
          latitude: geo.latitude ?? null,
          longitude: geo.longitude ?? null,
          ip_history: ipHistory,
          updated_at: now,
        };

        if (existingDevice?.id) {
          await supabase
            .from("user_devices")
            .update(devicePayload)
            .eq("id", existingDevice.id);
        } else {
          await supabase
            .from("user_devices")
            .upsert(devicePayload, { onConflict: "user_id,fingerprint" });
        }
      } catch (userTrackErr) {
        console.warn("[track-visit] user device recording non-critical warning:", userTrackErr);
      }
    }

    return NextResponse.json({ ok: true, ip: ipAddress });
  } catch (error: any) {
    console.warn("[track-visit] non-critical error:", error?.message || error);
    return NextResponse.json({ ok: false, error: "Failed to track visit" }, { status: 200 });
  }
}

