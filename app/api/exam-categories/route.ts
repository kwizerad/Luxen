import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isUserAdmin =
      user.email?.toLowerCase() === "navoadmin@navo.rw" ||
      user.user_metadata?.role === "Admin";

    let query = supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isUserAdmin) {
      query = query.eq("is_published", true);
    }

    const { data: categories, error } = await query;

    if (error) throw error;

    // Fetch exam settings for all categories
    const { data: settingsData, error: settingsError } = await supabase
      .from("exam_settings")
      .select("category_id,duration_minutes,question_count");

    if (settingsError && !settingsError.message.toLowerCase().includes("does not exist")) {
      console.error("Error fetching exam settings:", settingsError);
    }

    const settingsMap = new Map<string, { duration_minutes?: number; question_count?: number }>();
    for (const s of settingsData || []) {
      settingsMap.set(s.category_id, {
        duration_minutes: s.duration_minutes,
        question_count: s.question_count,
      });
    }

    const categoriesWithSettings = (categories || []).map((c: any) => ({
      ...c,
      duration_minutes: settingsMap.get(c.id)?.duration_minutes ?? undefined,
      question_count: settingsMap.get(c.id)?.question_count ?? undefined,
    }));

    return NextResponse.json({ categories: categoriesWithSettings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam categories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
