import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userIsAdmin = isAdmin(user);
    if (!userIsAdmin) {
      try {
        const adminSupabase = createAdminClient();
        const { data: profile } = await adminSupabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role?.toLowerCase() === "admin") userIsAdmin = true;
      } catch {}
    }

    let query = supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (!userIsAdmin) {
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

    // Check if external DB exam is published in system_config
    try {
      const adminSb = createAdminClient();
      const { data: extCfgRows } = await adminSb
        .from("system_config")
        .select("key, value")
        .in("key", [
          "external_exam_published",
          "external_exam_title",
          "external_exam_duration_minutes",
          "external_exam_question_count",
        ]);
      const extMap = new Map<string, string>();
      for (const r of extCfgRows || []) {
        if (r.key && r.value !== undefined && r.value !== null) {
          extMap.set(String(r.key), String(r.value));
        }
      }
      const extPublished = extMap.get("external_exam_published") === "true";
      const extTitle = extMap.get("external_exam_title") || "Navo's Mock Exam (External DB)";
      const extDuration = Number(extMap.get("external_exam_duration_minutes")) || 20;
      const extQuestions = Number(extMap.get("external_exam_question_count")) || 20;

      const existingIdx = categoriesWithSettings.findIndex((c: any) => c.id === EXTERNAL_EXAM_CATEGORY_ID);
      if (extPublished) {
        const extCategoryObj = {
          id: EXTERNAL_EXAM_CATEGORY_ID,
          name: extTitle,
          description: "Official Traffic Rules & Road Signs Mock Exam from External Question Bank",
          is_published: true,
          duration_minutes: extDuration,
          question_count: extQuestions,
          created_at: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          categoriesWithSettings[existingIdx] = {
            ...categoriesWithSettings[existingIdx],
            ...extCategoryObj,
          };
        } else {
          categoriesWithSettings.unshift(extCategoryObj);
        }
      } else if (existingIdx >= 0 && !userIsAdmin) {
        categoriesWithSettings.splice(existingIdx, 1);
      }
    } catch (extErr) {
      console.warn("Could not check external exam publish status:", extErr);
    }

    return NextResponse.json({ categories: categoriesWithSettings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam categories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
