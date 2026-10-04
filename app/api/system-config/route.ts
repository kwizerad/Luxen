import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// GET all system_config rows (or specific keys via ?keys=a,b,c) using Admin client so it works for all users (authenticated or guest)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get("keys");
    const keyParam = searchParams.get("key");

    const adminSupabase = createAdminClient();
    let query = adminSupabase.from("system_config").select("*").order("key");

    if (keyParam) {
      const { data, error } = await adminSupabase
        .from("system_config")
        .select("*")
        .eq("key", keyParam)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ config: data || null });
    }

    if (keysParam) {
      const keys = keysParam
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      if (keys.length > 0) {
        query = query.in("key", keys);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ configs: data || [] });
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
    const supabase = await createClient();
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;

    const {
      data: { user },
      error: authError,
    } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (authError || !user) {
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
