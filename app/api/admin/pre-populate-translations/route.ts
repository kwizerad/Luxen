import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateTextSnippets } from "@/lib/ai/tiptap-translator";

export async function POST() {
  const adminSb = createAdminClient();

  // 1. Fetch all questions
  const { data: questions, error: qErr } = await adminSb
    .from("exam_questions")
    .select("*");

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!questions) return NextResponse.json({ message: "No questions found" });

  const languages = ["English", "French"];
  const results = [];

  for (const lang of languages) {
    const toTranslate = questions.filter(q => q.question || q.option_a || q.option_b || q.option_c || q.option_d);
    
    // Check cache
    const entityIds = toTranslate.map((q) => `q_trans_${q.id}`);
    const { data: cachedRows } = await adminSb
      .from("course_ai_cache")
      .select("entity_id")
      .in("entity_id", entityIds)
      .eq("target_language", lang)
      .eq("feature_type", "question_translation");

    const cachedIds = new Set((cachedRows || []).map(r => r.entity_id));
    const needingTranslation = toTranslate.filter(q => !cachedIds.has(`q_trans_${q.id}`));

    if (needingTranslation.length === 0) {
      results.push({ lang, count: 0, message: "Already cached" });
      continue;
    }

    // Translate in batches
    const snippets: { id: number; text: string }[] = [];
    for (let i = 0; i < needingTranslation.length; i++) {
      const q = needingTranslation[i];
      const base: number = i * 5;
      if (q.question) snippets.push({ id: base + 0, text: q.question });
      if (q.option_a) snippets.push({ id: base + 1, text: q.option_a });
      if (q.option_b) snippets.push({ id: base + 2, text: q.option_b });
      if (q.option_c) snippets.push({ id: base + 3, text: q.option_c });
      if (q.option_d) snippets.push({ id: base + 4, text: q.option_d });
    }

    const translatedMap = await translateTextSnippets(snippets, "Kinyarwanda", lang);

    const upserts = [];
    for (let i = 0; i < needingTranslation.length; i++) {
      const q = needingTranslation[i];
      const base = i * 5;
      upserts.push({
        entity_id: `q_trans_${q.id}`,
        target_language: lang,
        feature_type: "question_translation",
        content_hash: "pre-pop",
        cached_data: {
          question: translatedMap.get(base + 0) || q.question,
          option_a: translatedMap.get(base + 1) || q.option_a,
          option_b: translatedMap.get(base + 2) || q.option_b,
          option_c: translatedMap.get(base + 3) || q.option_c,
          option_d: translatedMap.get(base + 4) || q.option_d,
        },
        updated_at: new Date().toISOString(),
      });
    }

    await adminSb.from("course_ai_cache").upsert(upserts);
    results.push({ lang, count: needingTranslation.length });
  }

  return NextResponse.json({ success: true, results });
}
