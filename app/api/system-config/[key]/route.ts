import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";

// GET system config value by key (all authenticated users can read)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const supabase = await createClient();

    // Get the authenticated user
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const { data: { user }, error: authError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS for reading
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("system_config")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      // If key doesn't exist, return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ value: null });
      }
      throw error;
    }

    return NextResponse.json({ value: data.value });
  } catch (error: any) {
    console.error("Error fetching system config:", error);
    return NextResponse.json(
      { error: "Failed to fetch system config", details: error.message },
      { status: 500 }
    );
  }
}

// PUT/UPDATE system config value (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const supabase = await createClient();

    // Get the authenticated user
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const { data: { user }, error: authError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { value, description } = body;

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();
    
    // Upsert the config value
    const { data, error } = await adminSupabase
      .from("system_config")
      .upsert(
        { key: key, value, description, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error updating system config:", error);
    return NextResponse.json(
      { error: "Failed to update system config", details: error.message },
      { status: 500 }
    );
  }
}