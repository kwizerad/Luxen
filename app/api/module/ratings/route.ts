import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { module_id, rating, review } = body;

    if (!module_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Module ID and rating (1-5) are required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("module_ratings")
      .select("id")
      .eq("module_id", module_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from("module_ratings")
        .update({ rating, review })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ rating: updated, status: "success" });
    }

    const { data: created, error } = await supabase
      .from("module_ratings")
      .insert([{ module_id, user_id: user.id, rating, review }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ rating: created, status: "success" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create rating.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
