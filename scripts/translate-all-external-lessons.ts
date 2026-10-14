import { createClient } from "@supabase/supabase-js";
import { translateTextSnippets } from "../lib/ai/tiptap-translator";
import crypto from "crypto";

const extSb = createClient(
  "https://cjewyrspigptfdvwutar.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZXd5cnNwaWdwdGZkdnd1dGFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEzNTEzOSwiZXhwIjoyMDk5NzExMTM5fQ.F04owZbnfwzoCXh2B5jSGB2JihNL7TGg7bNtj5AXPTo"
);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function translateAll() {
  console.log("Starting full database course translation sync...");

  const { data: extLessons, error: lErr } = await extSb
    .from("lessons")
    .select("id, title")
    .order("lesson_number", { ascending: true })
    .order("id", { ascending: true });

  if (lErr || !extLessons) {
    console.error("Failed to load external lessons:", lErr);
    return;
  }

  console.log(`Fetched ${extLessons.length} external lessons.`);

  for (const targetLang of ["English", "French"] as const) {
    console.log(`\n--- Checking cache for target language: ${targetLang} ---`);
    const { data: cached } = await sb
      .from("course_ai_cache")
      .select("entity_id")
      .eq("feature_type", "external_translation")
      .eq("target_language", targetLang);

    const cachedIds = new Set((cached || []).map((c) => c.entity_id));
    const missing = extLessons.filter(
      (l) => !cachedIds.has(`ext_lesson_${l.id}`) && l.title && l.title.trim().length > 0
    );

    console.log(`Found ${missing.length} missing lessons for ${targetLang}.`);

    const BATCH_SIZE = 10;
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batch = missing.slice(i, i + BATCH_SIZE);
      console.log(`Translating ${targetLang} batch ${i + 1} - ${i + batch.length} of ${missing.length}...`);

      const snippets = batch.map((item, idx) => ({
        id: idx,
        text: item.title.trim(),
      }));

      try {
        const transMap = await translateTextSnippets(snippets, "Kinyarwanda", targetLang);
        const nowStr = new Date().toISOString();
        const rowsToInsert = batch.map((item, idx) => {
          const translated = transMap.get(idx) || item.title;
          const hash = crypto.createHash("md5").update(item.title.trim()).digest("hex");
          return {
            entity_id: `ext_lesson_${item.id}`,
            target_language: targetLang,
            feature_type: "external_translation",
            content_hash: hash,
            cached_data: { text: translated, updatedAt: nowStr },
            updated_at: nowStr,
          };
        });

        const { error: upsertErr } = await sb
          .from("course_ai_cache")
          .upsert(rowsToInsert, { onConflict: "entity_id,target_language,feature_type" });

        if (upsertErr) {
          console.error("Error saving batch to cache:", upsertErr);
        } else {
          console.log(`Saved batch ${i + 1} - ${i + batch.length} successfully.`);
        }
      } catch (err: any) {
        console.error(`Failed to translate batch ${i}:`, err.message);
      }
    }
  }

  console.log("\nFinished translation sync!");
}

translateAll().catch(console.error);
