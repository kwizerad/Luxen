import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fingerprint, userId } = body || {};

    if (!fingerprint || !userId) {
      return NextResponse.json({ error: "Missing fingerprint or userId" }, { status: 400 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ ok: true, unconfigured: true });
    }

    const supabase = createAdminClient();
    const { data: existing, error: selectError } = await supabase
      .from("anonymous_visits")
      .select("id")
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (selectError) {
      if (!selectError.message?.includes("fetch failed")) {
        console.warn("[link-visitor] anonymous_visits query warning:", selectError.message);
      }
      return NextResponse.json({ ok: false, warning: selectError.message }, { status: 200 });
    }

    const now = new Date().toISOString();

    if (existing) {
      const { data: visitRecord } = await supabase
        .from("anonymous_visits")
        .select("*")
        .eq("id", existing.id)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from("anonymous_visits")
        .update({ linked_user_id: userId, updated_at: now })
        .eq("id", existing.id);

      if (updateError) {
        console.warn("[link-visitor] anonymous_visits update warning:", updateError.message);
      }

      if (visitRecord) {
        // Sync to user_profiles and user_devices
        try {
          const profileUpdate: Record<string, any> = {
            last_seen: now,
            updated_at: now,
          };
          if (visitRecord.ip_address) profileUpdate.last_ip = visitRecord.ip_address;
          if (visitRecord.device_type) profileUpdate.device_type = visitRecord.device_type;
          if (visitRecord.browser) profileUpdate.browser = visitRecord.browser;
          if (visitRecord.os) profileUpdate.os = visitRecord.os;

          await supabase
            .from("user_profiles")
            .update(profileUpdate)
            .eq("id", userId);

          const { data: existingDevice } = await supabase
            .from("user_devices")
            .select("id, first_seen_ip, ip_history")
            .eq("user_id", userId)
            .eq("fingerprint", fingerprint)
            .maybeSingle();

          const priorIpHistory: string[] = Array.isArray(existingDevice?.ip_history)
            ? (existingDevice.ip_history as string[])
            : [];
          const ipHistory = visitRecord.ip_address
            ? [...priorIpHistory.filter((h) => h !== visitRecord.ip_address), visitRecord.ip_address].slice(-20)
            : priorIpHistory;

          const screenResolution =
            visitRecord.screen_width && visitRecord.screen_height
              ? `${visitRecord.screen_width}x${visitRecord.screen_height}`
              : null;

          const devicePayload = {
            user_id: userId,
            fingerprint,
            device_type: visitRecord.device_type || null,
            browser: visitRecord.browser || null,
            browser_version: visitRecord.browser_version || null,
            os: visitRecord.os || null,
            screen_resolution: screenResolution,
            language: visitRecord.language || null,
            timezone: visitRecord.timezone || null,
            touch_support: typeof visitRecord.touch_support === "boolean" ? visitRecord.touch_support : null,
            cookies_enabled: typeof visitRecord.cookies_enabled === "boolean" ? visitRecord.cookies_enabled : null,
            last_seen: now,
            last_seen_ip: visitRecord.ip_address || null,
            first_seen_ip: existingDevice?.first_seen_ip || visitRecord.ip_address || null,
            country: visitRecord.country || null,
            region: visitRecord.region || null,
            city: visitRecord.city || null,
            latitude: visitRecord.latitude ?? null,
            longitude: visitRecord.longitude ?? null,
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
        } catch (syncErr) {
          console.warn("[link-visitor] user sync non-critical warning:", syncErr);
        }
      }
    } else {
      const { error: insertError } = await supabase.from("anonymous_visits").insert({
        fingerprint,
        linked_user_id: userId,
        visit_count: 1,
        first_seen: now,
        last_seen: now,
        updated_at: now,
      });

      if (insertError) {
        console.warn("[link-visitor] anonymous_visits insert warning:", insertError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.warn("[link-visitor] non-critical error:", error?.message || error);
    return NextResponse.json({ ok: false, error: "Failed to link visitor" }, { status: 200 });
  }
}
