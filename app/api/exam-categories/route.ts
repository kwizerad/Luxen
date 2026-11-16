import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/permissions";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import { CACHE_KEYS, getCached } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    const adminSb = createAdminClient();

    if (!user && req) {
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.replace(/^bearer\s+/i, "").trim();
      if (bearerToken) {
        try {
          const { data: { user: bearerUser } } = await adminSb.auth.getUser(bearerToken);
          if (bearerUser) user = bearerUser;
        } catch {}
      }
    }

    let userIsAdmin = false;
    if (user) {
      userIsAdmin = isAdmin(user);
      if (!userIsAdmin) {
        try {
          const { data: profile } = await adminSb
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.role?.toLowerCase() === "admin") userIsAdmin = true;
        } catch {}
      }
    }

    const cacheKey = `exam_categories:${userIsAdmin ? "admin" : "public"}`;
    const categoriesWithSettings = await getCached(cacheKey, 45_000, async () => {
      let query = adminSb
        .from("exam_categories")
        .select("*")
        .order("created_at", { ascending: false });

      if (!userIsAdmin) {
        query = query.eq("is_published", true);
      }

      const [catRes, settingsRes, allConfigs] = await Promise.all([
        query,
        adminSb
          .from("exam_settings")
          .select("category_id,duration_minutes,question_count"),
        getCached(CACHE_KEYS.SYSTEM_CONFIG_ALL, 60_000, async () => {
          const { data } = await adminSb.from("system_config").select("*").order("key");
          return data || [];
        }).catch(() => []),
      ]);

      if (catRes.error) throw catRes.error;
      if (
        settingsRes.error &&
        !settingsRes.error.message.toLowerCase().includes("does not exist")
      ) {
        console.error("Error fetching exam settings:", settingsRes.error);
      }

      const settingsMap = new Map<string, { duration_minutes?: number; question_count?: number }>();
      for (const s of settingsRes.data || []) {
        settingsMap.set(s.category_id, {
          duration_minutes: s.duration_minutes,
          question_count: s.question_count,
        });
      }

      const list = (catRes.data || []).map((c: any) => ({
        ...c,
        duration_minutes: settingsMap.get(c.id)?.duration_minutes ?? undefined,
        question_count: settingsMap.get(c.id)?.question_count ?? undefined,
      }));

      try {
        const extMap = new Map<string, string>();
        for (const r of allConfigs || []) {
          if (r.key && r.value !== undefined && r.value !== null) {
            extMap.set(String(r.key), String(r.value));
          }
        }
        const extPublished = extMap.get("external_exam_published") === "true";
        const extTitle = extMap.get("external_exam_title") || "Navo's Mock Exam (External DB)";
        const extDuration = Number(extMap.get("external_exam_duration_minutes")) || 20;
        const extQuestions = Number(extMap.get("external_exam_question_count")) || 20;

        const existingIdx = list.findIndex((c: any) => c.id === EXTERNAL_EXAM_CATEGORY_ID);
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
            list[existingIdx] = {
              ...list[existingIdx],
              ...extCategoryObj,
            };
          } else {
            list.unshift(extCategoryObj);
          }
        } else if (existingIdx >= 0 && !userIsAdmin) {
          list.splice(existingIdx, 1);
        }
      } catch (extErr) {
        console.warn("Could not check external exam publish status:", extErr);
      }

      if (list.length === 0) {
        list.push({
          id: EXTERNAL_EXAM_CATEGORY_ID,
          name: "Rwanda PVS Exam",
          description: "Official Traffic Rules & Road Signs Mock Exam from External Question Bank",
          is_published: true,
          duration_minutes: 20,
          question_count: 20,
          created_at: new Date().toISOString(),
        });
      }

      return list;
    });

    return NextResponse.json({ categories: categoriesWithSettings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam categories.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
