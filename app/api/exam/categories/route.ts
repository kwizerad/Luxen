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

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only primary admin can update categories
    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!user || !isPrimaryAdmin) {
      return NextResponse.json({ error: "Unauthorized. Only primary admin can update categories." }, { status: 403 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || name.trim() === "") {
      return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_categories")
      .update({ name: name.trim() })
      .eq("id", id)
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only primary admin can delete categories
    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!user || !isPrimaryAdmin) {
      return NextResponse.json({ error: "Unauthorized. Only primary admin can delete categories." }, { status: 403 });
    }

    // First, delete all questions in this category
    const { error: questionsError } = await supabase
      .from("exam_questions")
      .delete()
      .eq("category_id", id);

    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 });
    }

    // Then delete the category
    const { error } = await supabase
      .from("exam_categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
