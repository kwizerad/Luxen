import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = "Navo@admin.jn";

export async function GET(request?: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is admin
    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const hasAdminRole = user?.user_metadata?.role === "Admin";
    const isAdmin = isPrimaryAdmin || hasAdminRole;

    let query = supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false });

    // Non-admin users can only see published categories
    if (!isAdmin) {
      query = query.eq("is_published", true);
    }

    const { data: categories, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories, is_admin: isAdmin });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!user || !isPrimaryAdmin) {
      return NextResponse.json({ error: "Unauthorized. Only primary admin can create categories." }, { status: 403 });
    }

    const body = await request.json();
    const { name, is_published = false } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_categories")
      .insert([{ name: name.trim(), created_by: user.id, is_published }])
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
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
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

// PATCH for updating publish status (any admin)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow any admin to toggle publish status
    const isPrimaryAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const hasAdminRole = user?.user_metadata?.role === "Admin";
    
    if (!user || (!isPrimaryAdmin && !hasAdminRole)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_published } = body;

    if (!id || typeof is_published !== "boolean") {
      return NextResponse.json({ error: "Category ID and is_published are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_categories")
      .update({ is_published, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      category: data,
      message: is_published ? "Category published" : "Category unpublished"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
