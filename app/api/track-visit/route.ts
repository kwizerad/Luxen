import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

function getClientIP() {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return h.get("x-real-ip") || h.get("remote-addr") || "unknown";
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
    } = body || {};

    if (!fingerprint) {
      return NextResponse.json({ error: "Missing fingerprint" }, { status: 400 });
    }

    const ipAddress = getClientIP();
    const { os, browser, browserVersion } = parseBrowserInfo(userAgent || "");

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("anonymous_visits")
      .select("id, visit_count")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    const now = new Date().toISOString();

    if (existing) {
      await supabase
        .from("anonymous_visits")
        .update({
          ip_address: ipAddress,
          user_agent: userAgent,
          os,
          browser,
          browser_version: browserVersion,
          screen_width: screenWidth,
          screen_height: screenHeight,
          device_type: deviceType,
          language,
          timezone,
          referrer,
          landing_page: landingPage,
          touch_support: touchSupport,
          cookies_enabled: cookiesEnabled,
          visit_count: (existing.visit_count || 0) + 1,
          last_seen: now,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("anonymous_visits").insert({
        fingerprint,
        ip_address: ipAddress,
        user_agent: userAgent,
        os,
        browser,
        browser_version: browserVersion,
        screen_width: screenWidth,
        screen_height: screenHeight,
        device_type: deviceType,
        language,
        timezone,
        referrer,
        landing_page: landingPage,
        touch_support: touchSupport,
        cookies_enabled: cookiesEnabled,
        visit_count: 1,
        first_seen: now,
        last_seen: now,
        updated_at: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[track-visit] error:", error);
    return NextResponse.json({ error: "Failed to track visit" }, { status: 500 });
  }
}
