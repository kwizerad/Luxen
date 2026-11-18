import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageExamSettings, isAdmin, isStrictlyStudentEmail } from "@/lib/permissions";
import { DEFAULT_EXAM_SETTINGS, normalizeExamSettings } from "@/lib/exam-settings";
import { EXTERNAL_EXAM_CATEGORY_ID } from "@/lib/supabase/external";
import { CACHE_KEYS, invalidateCache, invalidateCachePrefix } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

async function resolveRequestUser(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);
  if (!user) return null;

  const adminSb = createAdminClient();
  if (!isStrictlyStudentEmail(user.email)) {
    const { data: profile } = await adminSb
      .from("user_profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role && !user.user_metadata?.role) {
      return {
        ...user,
        role: profile.role,
        user_metadata: {
          ...user.user_metadata,
          role: profile.role,
        },
      };
    }
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId")?.trim();
    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const adminSb = createAdminClient();
    const passingConfigKey = `exam_category_passing_percentage_${categoryId}`;

    const [{ data, error }, { data: cfgRows }] = await Promise.all([
      adminSb
        .from("exam_settings")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle(),
      adminSb
        .from("system_config")
        .select("key, value")
        .in("key", [
          passingConfigKey,
          "universal_passing_percentage",
          ...(categoryId === EXTERNAL_EXAM_CATEGORY_ID
            ? ["external_exam_duration_minutes", "external_exam_question_count"]
            : []),
        ]),
    ]);

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (
        !msg.includes("does not exist") &&
        !msg.includes("could not find the table") &&
        !msg.includes("schema cache")
      ) {
        throw error;
      }
    }

    const cfgMap = new Map<string, string>();
    for (const row of cfgRows || []) {
      if (row.key && row.value !== undefined && row.value !== null) {
        cfgMap.set(String(row.key), String(row.value));
      }
    }

    const savedCategoryPassing = Number(cfgMap.get(passingConfigKey));
    const universalPassing = Number(cfgMap.get("universal_passing_percentage"));
    const resolvedPassing =
      data?.passing_percentage != null && Number.isFinite(Number(data.passing_percentage))
        ? Number(data.passing_percentage)
        : Number.isFinite(savedCategoryPassing) && savedCategoryPassing >= 1 && savedCategoryPassing <= 100
        ? savedCategoryPassing
        : Number.isFinite(universalPassing) && universalPassing >= 1 && universalPassing <= 100
        ? universalPassing
        : DEFAULT_EXAM_SETTINGS.passing_percentage;

    const extDuration = Number(cfgMap.get("external_exam_duration_minutes"));
    const extQuestionCount = Number(cfgMap.get("external_exam_question_count"));

    const merged = {
      ...(data ?? {}),
      question_count:
        data?.question_count ??
        (categoryId === EXTERNAL_EXAM_CATEGORY_ID && Number.isFinite(extQuestionCount) && extQuestionCount >= 1
          ? extQuestionCount
          : undefined),
      duration_minutes:
        data?.duration_minutes ??
        (categoryId === EXTERNAL_EXAM_CATEGORY_ID && Number.isFinite(extDuration) && extDuration >= 1
          ? extDuration
          : undefined),
      passing_percentage: resolvedPassing,
    };

    return NextResponse.json(
      {
        categoryId,
        settings: normalizeExamSettings(merged),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: any) {
    console.error("Error fetching admin exam settings:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch exam settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorized =
      !isStrictlyStudentEmail(user.email) &&
      (isAdmin(user as any) || canManageExamSettings(user as any));

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const categoryId = String(body.categoryId || "").trim();
    const question_count = Number(body.question_count);
    const duration_minutes = Number(body.duration_minutes);
    const rawSorting = String(body.sorting_mode || "RANDOM").toUpperCase();
    const sorting_mode = ["RANDOM", "TEXT_ONLY", "WITH_PICTURE", "MIXED_50"].includes(rawSorting)
      ? rawSorting
      : "RANDOM";
    const passing_percentage =
      body.passing_percentage !== undefined ? Number(body.passing_percentage) : undefined;
    const available_from = body.available_from ?? null;
    const available_to = body.available_to ?? null;

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }
    if (!Number.isFinite(question_count) || question_count < 1 || question_count > 200) {
      return NextResponse.json({ error: "question_count must be between 1 and 200" }, { status: 400 });
    }
    if (!Number.isFinite(duration_minutes) || duration_minutes < 1 || duration_minutes > 300) {
      return NextResponse.json({ error: "duration_minutes must be between 1 and 300" }, { status: 400 });
    }
    if (
      passing_percentage !== undefined &&
      (!Number.isFinite(passing_percentage) || passing_percentage < 1 || passing_percentage > 100)
    ) {
      return NextResponse.json({ error: "passing_percentage must be between 1 and 100" }, { status: 400 });
    }

    const adminSb = createAdminClient();
    const now = new Date().toISOString();

    // Ensure the external category row exists in exam_categories while preserving current publish state
    if (categoryId === EXTERNAL_EXAM_CATEGORY_ID) {
      const [{ data: extCfgRows }, { data: existingCat }] = await Promise.all([
        adminSb
          .from("system_config")
          .select("key, value")
          .in("key", ["external_exam_title", "external_exam_published"]),
        adminSb
          .from("exam_categories")
          .select("is_published, name")
          .eq("id", EXTERNAL_EXAM_CATEGORY_ID)
          .maybeSingle(),
      ]);

      const extCfgMap = new Map<string, string>();
      for (const r of extCfgRows || []) {
        if (r.key && r.value !== undefined) extCfgMap.set(String(r.key), String(r.value));
      }
      const resolvedPublished = extCfgMap.has("external_exam_published")
        ? extCfgMap.get("external_exam_published") === "true"
        : existingCat?.is_published ?? true;

      await adminSb.from("exam_categories").upsert(
        {
          id: EXTERNAL_EXAM_CATEGORY_ID,
          name: extCfgMap.get("external_exam_title") || existingCat?.name || "Rwanda PVS Exam",
          description: "Official Traffic Rules & Road Signs Mock Exam from External Question Bank",
          is_published: resolvedPublished,
          updated_at: now,
        },
        { onConflict: "id" }
      );
    }

    const payload: Record<string, any> = {
      category_id: categoryId,
      question_count,
      duration_minutes,
      sorting_mode,
      available_from,
      available_to,
      updated_by: user.id,
      updated_at: now,
    };
    if (passing_percentage !== undefined) {
      payload.passing_percentage = passing_percentage;
    }

    let { data, error } = await adminSb
      .from("exam_settings")
      .upsert([payload], { onConflict: "category_id" })
      .select("*")
      .single();

    if (error && error.message?.includes("passing_percentage")) {
      delete payload.passing_percentage;
      const retry = await adminSb
        .from("exam_settings")
        .upsert([payload], { onConflict: "category_id" })
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw error;
    }

    // Persist per-category passing_percentage and external exam sync keys in system_config
    const configUpserts: Array<{ key: string; value: string; description: string; updated_at: string }> = [];
    if (passing_percentage !== undefined) {
      configUpserts.push({
        key: `exam_category_passing_percentage_${categoryId}`,
        value: String(Math.round(passing_percentage)),
        description: `Passing percentage override for exam category ${categoryId}`,
        updated_at: now,
      });
    }
    if (categoryId === EXTERNAL_EXAM_CATEGORY_ID) {
      configUpserts.push(
        {
          key: "external_exam_duration_minutes",
          value: String(duration_minutes),
          description: "Duration in minutes for external DB exam",
          updated_at: now,
        },
        {
          key: "external_exam_question_count",
          value: String(question_count),
          description: "Question count for external DB exam",
          updated_at: now,
        }
      );
    }

    if (configUpserts.length > 0) {
      const { error: cfgUpsertError } = await adminSb
        .from("system_config")
        .upsert(configUpserts, { onConflict: "key" });
      if (cfgUpsertError) {
        throw cfgUpsertError;
      }
    }

    invalidateCache(CACHE_KEYS.SYSTEM_CONFIG_ALL);
    invalidateCachePrefix("exam_categories:");

    return NextResponse.json({
      success: true,
      categoryId,
      settings: normalizeExamSettings(
        data ? { ...data, passing_percentage: passing_percentage ?? data.passing_percentage } : undefined
      ),
    });
  } catch (error: any) {
    console.error("Error updating admin exam settings:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update exam settings" },
      { status: 500 }
    );
  }
}
