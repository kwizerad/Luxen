import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "Navo@admin.jn";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: categories, error } = await supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const hasAdminRole = user?.user_metadata?.role === "Admin";

    if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_categories")
      .insert([{ name: name.trim(), created_by: user.id }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
