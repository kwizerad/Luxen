import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function extractIp(req: NextRequest): string {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf && !cf.startsWith("127.") && !cf.startsWith("10.") && !cf.startsWith("192.168.")) return cf.trim();
  const gcp = h.get("x-appengine-user-ip");
  if (gcp) return gcp.trim();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && !first.startsWith("127.") && !first.startsWith("10.") && !first.startsWith("192.168.")) return first;
  }
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const currentIp = extractIp(req);
    const userAgent = req.headers.get("user-agent") || "";
    const adminSupabase = createAdminClient();

    // 1. Try querying user_devices table
    const { data: devices, error } = await adminSupabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .order("last_seen", { ascending: false });

    if (!error && devices && devices.length > 0) {
      const enhancedDevices = devices.map((dev) => {
        const ip = dev.ip_address || dev.last_seen_ip || dev.first_seen_ip;
        const isCurrent =
          (dev.last_seen_ip && dev.last_seen_ip === currentIp && currentIp !== "unknown") ||
          (dev.ip_address && dev.ip_address === currentIp && currentIp !== "unknown");

        return {
          id: dev.id,
          user_id: dev.user_id,
          fingerprint: dev.fingerprint,
          device_name: dev.device_name || `${dev.os || "Device"} (${dev.browser || dev.device_type || "Unknown"})`,
          device_type: dev.device_type || "Desktop",
          browser_info: dev.browser_info || (dev.browser ? `${dev.browser} ${dev.browser_version || ""}`.trim() : undefined),
          browser: dev.browser,
          browser_version: dev.browser_version,
          os: dev.os,
          os_version: dev.os_version,
          screen_resolution: dev.screen_resolution,
          ip_address: ip,
          last_seen_ip: dev.last_seen_ip || ip,
          first_seen_ip: dev.first_seen_ip || ip,
          country: dev.country,
          city: dev.city,
          timezone: dev.timezone,
          language: dev.language,
          is_trusted: dev.is_trusted ?? false,
          is_current: Boolean(isCurrent),
          first_seen: dev.first_seen || dev.created_at,
          last_seen: dev.last_seen || dev.updated_at,
        };
      });

      return NextResponse.json({
        devices: enhancedDevices,
        current_ip: currentIp,
        total: enhancedDevices.length,
      });
    }

    // 2. Fallback: anonymous_visits or user_profiles
    const { data: visits } = await adminSupabase
      .from("anonymous_visits")
      .select("*")
      .eq("linked_user_id", user.id)
      .order("last_seen", { ascending: false })
      .limit(10);

    if (visits && visits.length > 0) {
      const synthDevices = visits.map((v, idx) => ({
        id: `visit-${v.id || idx}`,
        user_id: user.id,
        fingerprint: v.fingerprint || `fp_${idx}`,
        device_name: `${v.os || "Device"} (${v.browser || v.device_type || "Web Browser"})`,
        device_type: v.device_type || "Desktop",
        browser_info: v.browser ? `${v.browser} ${v.browser_version || ""}`.trim() : undefined,
        browser: v.browser,
        browser_version: v.browser_version,
        os: v.os,
        screen_resolution: v.screen_width && v.screen_height ? `${v.screen_width}x${v.screen_height}` : undefined,
        ip_address: v.ip_address,
        last_seen_ip: v.ip_address,
        first_seen_ip: v.ip_address,
        country: v.country,
        city: v.city,
        timezone: v.timezone,
        language: v.language,
        is_trusted: false,
        is_current: idx === 0,
        first_seen: v.first_seen || new Date().toISOString(),
        last_seen: v.last_seen || new Date().toISOString(),
      }));

      return NextResponse.json({
        devices: synthDevices,
        current_ip: currentIp,
        total: synthDevices.length,
      });
    }

    // 3. Fallback: current profile
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("last_ip, device_type, browser, os, last_seen, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    const fallbackDevice = {
      id: "current-session",
      user_id: user.id,
      fingerprint: "current-device",
      device_name: `${profile?.os || "Current Device"} (${profile?.browser || profile?.device_type || "Browser"})`,
      device_type: profile?.device_type || "Desktop",
      browser_info: profile?.browser || undefined,
      browser: profile?.browser,
      os: profile?.os,
      ip_address: profile?.last_ip || currentIp,
      last_seen_ip: profile?.last_ip || currentIp,
      first_seen_ip: profile?.last_ip || currentIp,
      is_trusted: true,
      is_current: true,
      first_seen: profile?.created_at || new Date().toISOString(),
      last_seen: profile?.last_seen || profile?.updated_at || new Date().toISOString(),
    };

    return NextResponse.json({
      devices: [fallbackDevice],
      current_ip: currentIp,
      total: 1,
    });
  } catch (err: any) {
    console.error("[api/user-devices] GET error:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch devices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const currentIp = extractIp(req);
    const ipAddress = (body.ip_address && body.ip_address !== "unknown" ? body.ip_address : currentIp);
    const cleanIp = ipAddress !== "unknown" ? ipAddress : null;

    const adminSupabase = createAdminClient();
    const now = new Date().toISOString();

    const fingerprint = body.fingerprint || `fp_${user.id}_${Date.now()}`;
    const deviceName = body.device_name || `${body.os || "Device"} (${body.browser || body.device_type || "Browser"})`;
    const browserInfo = body.browser_info || (body.browser ? `${body.browser} ${body.browser_version || ""}`.trim() : undefined);

    const payload = {
      user_id: user.id,
      fingerprint,
      ip_address: cleanIp,
      device_name: deviceName,
      browser_info: browserInfo,
      device_type: body.device_type || null,
      browser: body.browser || null,
      browser_version: body.browser_version || null,
      os: body.os || null,
      os_version: body.os_version || null,
      screen_resolution: body.screen_resolution || null,
      language: body.language || null,
      timezone: body.timezone || null,
      country: body.country || null,
      city: body.city || null,
      last_seen_ip: cleanIp,
      first_seen_ip: cleanIp,
      last_seen: now,
      updated_at: now,
    };

    // Upsert into user_devices
    const { data, error } = await adminSupabase
      .from("user_devices")
      .upsert(payload, { onConflict: "user_id,fingerprint" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[api/user-devices] POST upsert warning:", error);
    }

    // Also update user_profiles
    if (cleanIp || body.device_type) {
      const profileUpdate: Record<string, any> = {
        last_seen: now,
        updated_at: now,
      };
      if (cleanIp) profileUpdate.last_ip = cleanIp;
      if (body.device_type) profileUpdate.device_type = body.device_type;
      if (body.browser) profileUpdate.browser = body.browser;
      if (body.os) profileUpdate.os = body.os;

      await adminSupabase.from("user_profiles").update(profileUpdate).eq("id", user.id);
    }

    return NextResponse.json({ ok: true, device: data || payload });
  } catch (err: any) {
    console.error("[api/user-devices] POST error:", err);
    return NextResponse.json({ error: err?.message || "Failed to link device" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("id");
    const revokeOthers = searchParams.get("revoke_others") === "true";
    const keepFingerprint = searchParams.get("keep_fingerprint");

    const adminSupabase = createAdminClient();

    if (revokeOthers && keepFingerprint) {
      const { error } = await adminSupabase
        .from("user_devices")
        .delete()
        .eq("user_id", user.id)
        .neq("fingerprint", keepFingerprint);

      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Other devices revoked successfully" });
    }

    if (deviceId) {
      const { error } = await adminSupabase
        .from("user_devices")
        .delete()
        .eq("user_id", user.id)
        .eq("id", deviceId);

      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Device revoked successfully" });
    }

    return NextResponse.json({ error: "Device ID required" }, { status: 400 });
  } catch (err: any) {
    console.error("[api/user-devices] DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Failed to delete device" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_trusted, device_name } = body;

    if (!id) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof is_trusted === "boolean") updatePayload.is_trusted = is_trusted;
    if (typeof device_name === "string" && device_name.trim()) updatePayload.device_name = device_name.trim();

    const { data, error } = await adminSupabase
      .from("user_devices")
      .update(updatePayload)
      .eq("user_id", user.id)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, device: data });
  } catch (err: any) {
    console.error("[api/user-devices] PATCH error:", err);
    return NextResponse.json({ error: err?.message || "Failed to update device" }, { status: 500 });
  }
}
