"use server";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export interface VisitorActivityData {
  ip?: string | null;
  deviceType?: string | null;
  os?: string | null;
  browser?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  path?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

/**
 * Server Action to log visitor activity into Supabase table `visitor_logs`.
 */
export async function logVisitorActivity(data: VisitorActivityData) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return { success: false, reason: "Supabase admin not configured" };
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const record = {
      ip_address: data.ip || null,
      device_type: data.deviceType || "unknown",
      os: data.os || "unknown",
      browser: data.browser || null,
      country: data.country || null,
      city: data.city || null,
      region: data.region || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      path: data.path || "/",
      user_agent: data.userAgent || null,
      created_at: now,
    };

    // 1. Insert into visitor_logs table
    const { error } = await supabase.from("visitor_logs").insert(record);

    if (error) {
      // If table doesn't exist yet, warn gracefully without crashing
      if (!error.message?.includes("does not exist") && !error.message?.includes("relation")) {
        console.warn("[logVisitorActivity] Error inserting into visitor_logs:", error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn("[logVisitorActivity] Exception during logging:", err?.message || err);
    return { success: false, error: err?.message || "Internal error" };
  }
}
