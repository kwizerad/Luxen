import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { CACHE_KEYS, getCached, invalidateCache, invalidateCachePrefix } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

async function fetchAllSystemConfigsFresh() {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("system_config")
    .select("*")
    .order("key");
  if (error) throw error;
  return data || [];
}

async function getAllSystemConfigsCached(bypassCache = false) {
  if (bypassCache) {
    invalidateCache(CACHE_KEYS.SYSTEM_CONFIG_ALL);
  }
  return getCached(CACHE_KEYS.SYSTEM_CONFIG_ALL, 60_000, fetchAllSystemConfigsFresh);
}

// GET all system_config rows (or specific keys via ?keys=a,b,c) using Admin client + TTL cache
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get("keys");
    const keyParam = searchParams.get("key");
    const freshParam = searchParams.get("fresh") === "1" || searchParams.get("fresh") === "true";

    const allConfigs = await getAllSystemConfigsCached(freshParam);
    const headers = { "Cache-Control": "no-store" };

    if (keyParam) {
      const found = allConfigs.find((row: any) => row.key === keyParam) || null;
      return NextResponse.json({ config: found }, { headers });
    }

    if (keysParam) {
      const keys = new Set(
        keysParam
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      );
      if (keys.size > 0) {
        return NextResponse.json(
          {
            configs: allConfigs.filter((row: any) => keys.has(row.key)),
          },
          { headers }
        );
      }
    }

    return NextResponse.json({ configs: allConfigs }, { headers });
  } catch (error: any) {
    console.error("Error fetching system_config:", error);
    return NextResponse.json(
      { error: "Failed to fetch system config", details: error.message, configs: [] },
      { status: 500 }
    );
  }
}

// POST/PUT single or batch system_config updates using Admin client (bypasses RLS restrictions)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Also check user_profiles role in case JWT metadata is stale
    let userIsAdmin = !isStrictlyStudentEmail(user.email) && isAdmin(user as any);
    if (!userIsAdmin && !isStrictlyStudentEmail(user.email)) {
      const { data: profile } = await adminSupabase
        .from("user_profiles")
        .select("role, email")
        .eq("id", user.id)
        .maybeSingle();
      if (
        !isStrictlyStudentEmail(profile?.email) &&
        (profile?.role?.toLowerCase() === "admin" ||
          profile?.email?.toLowerCase() === "navo@admin.jn")
      ) {
        userIsAdmin = true;
      }
    }

    if (!userIsAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const now = new Date().toISOString();

    // Support batch updates: { items: [{ key, value, description }] } or single { key, value, description }
    const items: Array<{ key: string; value: string; description?: string }> = Array.isArray(body.items)
      ? body.items
      : body.key
      ? [{ key: body.key, value: String(body.value), description: body.description }]
      : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No config items provided" }, { status: 400 });
    }

    const rowsToUpsert = items.map((item) => ({
      key: item.key,
      value: String(item.value),
      ...(item.description !== undefined ? { description: item.description } : {}),
      updated_at: now,
    }));

    const { data, error } = await adminSupabase
      .from("system_config")
      .upsert(rowsToUpsert, { onConflict: "key" })
      .select();

    if (error) throw error;

    invalidateCache(CACHE_KEYS.SYSTEM_CONFIG_ALL);
    invalidateCachePrefix("exam_categories:");

    return NextResponse.json({
      success: true,
      config: data && data.length === 1 ? data[0] : undefined,
      configs: data || [],
    });
  } catch (error: any) {
    console.error("Error updating system_config:", error);
    return NextResponse.json(
      { error: "Failed to update system config", details: error.message },
      { status: 500 }
    );
  }
}
