import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalAdminClient } from "@/lib/supabase/external";
import { translateQuestionBatch } from "@/lib/ai/exam-translator";
import { isAdmin, isPrimaryAdmin } from "@/lib/permissions";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";

function parseExternalChoices(choice: unknown): string[] {
  if (Array.isArray(choice)) {
    return choice.map((c) => String(c ?? ""));
  }
  if (typeof choice === "string") {
    try {
      const parsed = JSON.parse(choice);
      if (Array.isArray(parsed)) return parsed.map((c) => String(c ?? ""));
    } catch {}
    return [choice];
  }
  return [];
}

export async function POST(req: NextRequest) {
  const adminSb = createAdminClient();
  const user = await getAuthUserFromRequest(req);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (user.email || "").toLowerCase();
  let isAdminUser =
    email === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    isPrimaryAdmin(user) ||
    isAdmin(user);

  if (!isAdminUser) {
    const { data: profile } = await adminSb
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role && String(profile.role).toLowerCase() === "admin") {
      isAdminUser = true;
    }
  }

  if (!isAdminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {}

  const requestedLangs = Array.isArray(body.languages) && body.languages.length > 0
    ? body.languages.map((l: any) => String(l))
    : ["English", "French", "Kinyarwanda"];

  const chunkLimit = Math.min(200, Math.max(10, Number(body.limit) || 60));
  const chunkOffset = Math.max(0, Number(body.offset) || 0);

  const [{ data: primaryQuestions, error: qErr }, extSb] = await Promise.all([
    adminSb.from("exam_questions").select("*").order("id", { ascending: true }),
    getExternalAdminClient(),
  ]);

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  let externalQuestions: any[] = [];
  if (extSb) {
    try {
      const { data: extRows } = await extSb
        .from("questions")
        .select("*")
        .order("question_numbers", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .range(chunkOffset, chunkOffset + chunkLimit - 1);

      externalQuestions = (extRows || []).map((row: any) => {
        const choices = parseExternalChoices(row.choice);
        return {
          id: String(row.id),
          question: String(row.title || ""),
          option_a: choices[0] || "",
          option_b: choices[1] || "",
          option_c: choices[2] || "",
          option_d: choices[3] || "",
          explanation: null,
        };
      });
    } catch (extErr) {
      console.warn("[PrePopulateTranslations] External fetch warning:", extErr);
    }
  }

  const validPrimary = (primaryQuestions || []).filter(
    (q) => q.question || q.option_a || q.option_b || q.option_c || q.option_d
  );
  const validExternal = externalQuestions.filter(
    (q) => q.question || q.option_a || q.option_b || q.option_c || q.option_d
  );

  const results = [];

  for (const lang of requestedLangs) {
    if (validPrimary.length > 0) {
      await translateQuestionBatch(adminSb, validPrimary, lang, "auto");
    }
    if (validExternal.length > 0) {
      await translateQuestionBatch(adminSb, validExternal, lang, "Kinyarwanda");
    }
    results.push({
      lang,
      primaryCount: validPrimary.length,
      externalCount: validExternal.length,
    });
  }

  return NextResponse.json({
    success: true,
    results,
    totalProcessed: validPrimary.length + validExternal.length,
  });
}
