import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { translateQuestionBatch } from "@/lib/ai/exam-translator";

export async function POST() {
  const adminSb = createAdminClient();

  const { data: questions, error: qErr } = await adminSb
    .from("exam_questions")
    .select("*");

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!questions || questions.length === 0) {
    return NextResponse.json({ message: "No questions found" });
  }

  const languages = ["English", "French", "Kinyarwanda"];
  const results = [];

  for (const lang of languages) {
    const validQuestions = questions.filter(
      (q) => q.question || q.option_a || q.option_b || q.option_c || q.option_d
    );
    await translateQuestionBatch(adminSb, validQuestions, lang, "auto");
    results.push({ lang, count: validQuestions.length });
  }

  return NextResponse.json({ success: true, results });
}
