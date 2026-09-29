import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import type { ServerVisitorDevicePayload, VisitorLogDbRecord } from "@/lib/tracking/types";
import { isPrivateOrLocalIp } from "@/lib/tracking/server-tracker";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate authorization
    const secret = req.headers.get("x-internal-tracking-secret");
    const expectedSecret = process.env.INTERNAL_ANALYTICS_SECRET || "internal-edge-log";

    if (secret && secret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let payload: ServerVisitorDevicePayload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    if (!payload || !payload.ip) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Supabase not configured" }, { status: 200 });
    }

    const supabase = createAdminClient();
    const now = payload.timestamp || new Date().toISOString();

    // 2. Extract authenticated user if available in request cookies
    let userId: string | null = null;
    try {
      const cookieHeader = req.headers.get("cookie") || "";
      if (cookieHeader) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey =
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabaseAuth = createServerClient(supabaseUrl, supabaseKey, {
            cookieOptions: {
              name: "navo-auth-token",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            },
            cookies: {
              getAll() {
                const map = new Map<string, string>();
                cookieHeader.split(";").forEach((pair) => {
                  const idx = pair.indexOf("=");
                  if (idx !== -1) {
                    const k = pair.slice(0, idx).trim();
                    const v = pair.slice(idx + 1).trim();
                    if (k && v) {
                      try {
                        map.set(k, decodeURIComponent(v));
                      } catch {
                        map.set(k, v);
                      }
                    }
                  }
                });
                return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
              },
              setAll() {},
            },
          });

          const { data: authData } = await supabaseAuth.auth.getUser();
          if (authData?.user?.id) {
            userId = authData.user.id;
          }
        }
      }
    } catch {
      // Non-blocking: proceed with anonymous/visitor mode
    }

    // 3. Fallback IP Geo lookup if hosting headers did not provide location
    if ((!payload.geo?.country || payload.geo.country === "XX") && !isPrivateOrLocalIp(payload.ip)) {
      try {
        const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(payload.ip)}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(2000),
        });
        if (geoRes.ok) {
          const data = await geoRes.json();
          if (data.success !== false && data.country) {
            payload.geo = {
              ip: payload.ip,
              country: data.country,
              countryCode: data.country_code || null,
              region: data.region || null,
              city: data.city || null,
              latitude: typeof data.latitude === "number" ? data.latitude : null,
              longitude: typeof data.longitude === "number" ? data.longitude : null,
              timezone: data.timezone?.id || null,
            };
          }
        }
      } catch {
        // Geo fallback timeout handled gracefully
      }
    }

    // 4. Record to visitor_logs table
    try {
      await supabase.from("visitor_logs").insert({
        ip_address: payload.ip !== "unknown" ? payload.ip : null,
        device_type: payload.deviceType,
        os: payload.os.name !== "Unknown OS" ? `${payload.os.name} ${payload.os.version}`.trim() : payload.os.name,
        browser: payload.browser.name,
        country: payload.geo?.country || null,
        city: payload.geo?.city || null,
        region: payload.geo?.region || null,
        latitude: payload.geo?.latitude || null,
        longitude: payload.geo?.longitude || null,
        path: payload.path || "/",
        user_agent: payload.userAgent || null,
        user_id: userId,
        created_at: now,
      });
    } catch (vlErr: any) {
      console.warn("[track-device] visitor_logs insert warning:", vlErr?.message || vlErr);
    }

    // 5. Record to visitor_device_logs table
    const logRecord: VisitorLogDbRecord = {
      request_id: payload.requestId,
      ip_address: payload.ip,
      device_type: payload.deviceType,
      device_name: payload.deviceName || payload.deviceModel || null,
      device_model: payload.deviceModel,
      device_vendor: payload.deviceVendor,
      browser_name: payload.browser.name,
      browser_version: payload.browser.version,
      os_name: payload.os.name,
      os_version: payload.os.version,
      cpu_architecture: payload.cpuArchitecture,
      is_bot: payload.isBot,
      country: payload.geo?.country || null,
      country_code: payload.geo?.countryCode || null,
      region: payload.geo?.region || null,
      city: payload.geo?.city || null,
      latitude: payload.geo?.latitude || null,
      longitude: payload.geo?.longitude || null,
      timezone: payload.geo?.timezone || null,
      path: payload.path || "/",
      method: payload.method || "GET",
      referrer: payload.referrer,
      user_agent: payload.userAgent || "",
      created_at: now,
    };

    try {
      await supabase.from("visitor_device_logs").insert(logRecord);
    } catch (dbErr: any) {
      if (!dbErr?.message?.includes("does not exist") && !dbErr?.message?.includes("relation")) {
        console.warn("[track-device] visitor_device_logs note:", dbErr?.message || dbErr);
      }
    }

    // 6. Record to anonymous_visits table
    const edgeFp = `srv-${Buffer.from(payload.ip + (payload.userAgent || "")).toString("base64").slice(0, 32)}`;

    try {
      const { data: existingVisit } = await supabase
        .from("anonymous_visits")
        .select("id, visit_count, linked_user_id")
        .eq("fingerprint", edgeFp)
        .maybeSingle();

      const visitPayload = {
        fingerprint: edgeFp,
        ip_address: payload.ip !== "unknown" ? payload.ip : null,
        user_agent: payload.userAgent || null,
        os: payload.os.name !== "Unknown OS" ? `${payload.os.name} ${payload.os.version}`.trim() : null,
        browser: payload.browser.name !== "Unknown Browser" ? payload.browser.name : null,
        browser_version: payload.browser.version !== "Unknown" ? payload.browser.version : null,
        device_type: payload.deviceType !== "unknown" ? payload.deviceType : null,
        referrer: payload.referrer || null,
        landing_page: payload.path || "/",
        country: payload.geo?.country || null,
        region: payload.geo?.region || null,
        city: payload.geo?.city || null,
        latitude: payload.geo?.latitude || null,
        longitude: payload.geo?.longitude || null,
        timezone: payload.geo?.timezone || null,
        linked_user_id: userId || existingVisit?.linked_user_id || null,
        last_seen: now,
        updated_at: now,
      };

      if (existingVisit?.id) {
        await supabase
          .from("anonymous_visits")
          .update({
            ...visitPayload,
            visit_count: (existingVisit.visit_count || 1) + 1,
          })
          .eq("id", existingVisit.id);
      } else {
        await supabase.from("anonymous_visits").insert({
          ...visitPayload,
          visit_count: 1,
          first_seen: now,
        });
      }
    } catch (anonErr) {
      console.warn("[track-device] anonymous_visits sync warning:", anonErr);
    }

    // 7. If user is logged in, synchronize user_profiles and user_devices
    if (userId) {
      try {
        await supabase
          .from("user_profiles")
          .update({
            last_ip: payload.ip !== "unknown" ? payload.ip : undefined,
            device_type: payload.deviceType,
            browser: payload.browser.name,
            os: payload.os.name !== "Unknown OS" ? `${payload.os.name} ${payload.os.version}`.trim() : payload.os.name,
            last_seen: now,
            updated_at: now,
          })
          .eq("id", userId);
      } catch {
        // Non-critical profile update
      }

      try {
        const { data: existingDevice } = await supabase
          .from("user_devices")
          .select("id, ip_history")
          .eq("user_id", userId)
          .eq("fingerprint", edgeFp)
          .maybeSingle();

        const ipHist = Array.isArray(existingDevice?.ip_history) ? [...existingDevice.ip_history] : [];
        if (payload.ip && !ipHist.includes(payload.ip)) {
          ipHist.push(payload.ip);
        }

        const devicePayload = {
          user_id: userId,
          fingerprint: edgeFp,
          device_name: payload.deviceName || payload.deviceModel || undefined,
          ip_address: payload.ip !== "unknown" ? payload.ip : undefined,
          browser_info: `${payload.browser.name} ${payload.browser.version}`.trim(),
          device_type: payload.deviceType,
          browser: payload.browser.name,
          browser_version: payload.browser.version,
          os: payload.os.name,
          os_version: payload.os.version,
          cpu_architecture: payload.cpuArchitecture || undefined,
          last_seen: now,
          last_seen_ip: payload.ip,
          country: payload.geo?.country || undefined,
          country_code: payload.geo?.countryCode || undefined,
          region: payload.geo?.region || undefined,
          city: payload.geo?.city || undefined,
          latitude: payload.geo?.latitude ?? undefined,
          longitude: payload.geo?.longitude ?? undefined,
          timezone: payload.geo?.timezone || undefined,
          ip_history: ipHist,
          updated_at: now,
        };

        if (existingDevice?.id) {
          await supabase.from("user_devices").update(devicePayload).eq("id", existingDevice.id);
        } else {
          await supabase.from("user_devices").insert({
            ...devicePayload,
            first_seen: now,
            first_seen_ip: payload.ip,
            created_at: now,
          });
        }
      } catch {
        // Non-critical device update
      }
    }

    return NextResponse.json({ ok: true, requestId: payload.requestId }, { status: 200 });
  } catch (error: any) {
    console.warn("[track-device] safe handler error:", error?.message || error);
    return NextResponse.json({ ok: false, error: "Tracking failed safely" }, { status: 200 });
  }
}
