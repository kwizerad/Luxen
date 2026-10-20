const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const aiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !aiKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const adminSb = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: aiKey });

async function runPrePop() {
  console.log("Starting translation pre-population...");
  const { data: questions } = await adminSb.from("exam_questions").select("*");
  if (!questions) process.exit(0);

  for (const lang of ["English", "French"]) {
    console.log(`Processing: ${lang}`);
    for (const q of questions) {
      const entityId = `q_trans_${q.id}`;
      const { data: cached } = await adminSb.from("course_ai_cache").select("entity_id").eq("entity_id", entityId).eq("target_language", lang).maybeSingle();
      if (cached) continue;

      try {
        const prompt = `Translate to ${lang}: Question: "${q.question}", A: "${q.option_a}", B: "${q.option_b}", C: "${q.option_c}", D: "${q.option_d}"`;
        const res = await ai.models.generateContent({ model: "gemini-3.8-flash", contents: prompt });
        await adminSb.from("course_ai_cache").insert({
          entity_id: entityId,
          target_language: lang,
          feature_type: "question_translation",
          cached_data: { raw: res.text() },
          updated_at: new Date().toISOString(),
        });
      } catch (e) { console.error(`Error ${q.id}:`, e); }
    }
  }
}
runPrePop();
