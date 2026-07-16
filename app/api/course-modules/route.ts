import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";
import { getAdminEmail } from "@/lib/server-config";

// GET all modules (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user. Prefer the Authorization header token sent by the client,
    // and fall back to the cookie-based session.
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

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("course_modules")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ modules: data });
  } catch (error: any) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules", details: error.message },
      { status: 500 }
    );
  }
}

// POST create new module (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user. Prefer the Authorization header token sent by the client,
    // and fall back to the cookie-based session.
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

    // Use admin client to bypass RLS for admin operations
    const adminSupabase = createAdminClient();

    const body = await request.json();
    const { title, description, order_index, is_published } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get the highest order_index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const { data: existingModules } = await adminSupabase
        .from("course_modules")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);

      finalOrderIndex = existingModules && existingModules.length > 0
        ? existingModules[0].order_index + 1
        : 0;
    }

    const { data, error } = await adminSupabase
      .from("course_modules")
      .insert([{
        title,
        description: description || null,
        order_index: finalOrderIndex,
        is_published: is_published || false,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating module:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    return NextResponse.json({ module: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating module:", error);
    return NextResponse.json(
      { error: "Failed to create module", details: error.message },
      { status: 500 }
    );
  }
}
