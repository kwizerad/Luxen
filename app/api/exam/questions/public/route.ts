import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow any authenticated user to access
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let query = supabase.from("exam_questions").select("*");
    
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (search) {
      query = query.or(`question.ilike.%${search}%,option_a.ilike.%${search}%,option_b.ilike.%${search}%,option_c.ilike.%${search}%,option_d.ilike.%${search}%,explanation.ilike.%${search}%`);
    }
    
    const { data: questions, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
