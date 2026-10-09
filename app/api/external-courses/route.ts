import { NextRequest, NextResponse } from "next/server";
import { getExternalAdminClient } from "@/lib/supabase/external";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isPrimaryAdmin } from "@/lib/permissions";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/server-config";
import { translateTextSnippets, type TargetLanguage } from "@/lib/ai/tiptap-translator";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkIsAdminUser(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const email = (user.email || "").toLowerCase();
    if (email === DEFAULT_ADMIN_EMAIL.toLowerCase() || isPrimaryAdmin(user as any) || isAdmin(user as any)) {
      return true;
    }

    const adminSb = createAdminClient();
    const { data: profile } = await adminSb
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role && String(profile.role).toLowerCase() === "admin") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const extSb = await getExternalAdminClient();
    if (!extSb) {
      return NextResponse.json(
        { error: "External Supabase database is not configured in environment variables." },
        { status: 500 }
      );
    }

    const [chaptersRes, sectionsRes, lessonsRes, questionsRes, setsRes, isAdminUser] = await Promise.all([
      extSb
        .from("chapters")
        .select("*")
        .order("chapter_number", { ascending: true })
        .order("id", { ascending: true }),
      extSb
        .from("sections")
        .select("*")
        .order("section_number", { ascending: true })
        .order("id", { ascending: true }),
      extSb
        .from("lessons")
        .select("*")
        .order("lesson_number", { ascending: true })
        .order("id", { ascending: true }),
      extSb
        .from("questions")
        .select("*")
        .order("question_numbers", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),
      extSb
        .from("question_sets")
        .select("*")
        .order("set_number", { ascending: true })
        .order("id", { ascending: true }),
      checkIsAdminUser(),
    ]);

    if (chaptersRes.error) throw chaptersRes.error;
    if (sectionsRes.error) throw sectionsRes.error;
    if (lessonsRes.error) throw lessonsRes.error;
    if (questionsRes.error) throw questionsRes.error;

    const chapters = chaptersRes.data || [];
    const sections = sectionsRes.data || [];
    const lessons = lessonsRes.data || [];
    const questions = (questionsRes.data || []).map((q: any) => ({
      ...q,
      choice: Array.isArray(q.choice)
        ? q.choice
        : typeof q.choice === "string"
        ? (() => {
            try {
              return JSON.parse(q.choice);
            } catch {
              return [q.choice];
            }
          })()
        : [],
      choice_answer: typeof q.choice_answer === "number" ? q.choice_answer : Number(q.choice_answer) || 0,
    }));
    const questionSets = setsRes.data || [];

    return NextResponse.json(
      {
        success: true,
        isAdmin: isAdminUser,
        chapters,
        sections,
        lessons,
        questions,
        questionSets,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/external-courses error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load external courses" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const isAdminUser = await checkIsAdminUser();
    if (!isAdminUser) {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { type, id, payload } = body;

    if (!type || !id || !payload) {
      return NextResponse.json({ error: "type, id, and payload are required" }, { status: 400 });
    }

    const extSb = await getExternalAdminClient();
    if (!extSb) {
      return NextResponse.json(
        { error: "External Supabase database is not configured in environment variables." },
        { status: 500 }
      );
    }
    const now = new Date().toISOString();

    if (type === "question") {
      const updateData: Record<string, any> = { updated_at: now };
      if (payload.title !== undefined) updateData.title = String(payload.title);
      if (Array.isArray(payload.choice)) updateData.choice = payload.choice.map((c: any) => String(c ?? ""));
      if (payload.choice_answer !== undefined) updateData.choice_answer = Number(payload.choice_answer);
      if (payload.image !== undefined) updateData.image = payload.image ? String(payload.image).trim() : null;
      if (payload.chapter_id !== undefined) updateData.chapter_id = payload.chapter_id;
      if (payload.question_numbers !== undefined) {
        updateData.question_numbers =
          payload.question_numbers === "" || payload.question_numbers === null
            ? null
            : Number(payload.question_numbers);
      }

      const { data, error } = await extSb
        .from("questions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "lesson") {
      const updateData: Record<string, any> = { updated_at: now };
      if (payload.title !== undefined) updateData.title = String(payload.title);
      if (payload.lesson_number !== undefined) updateData.lesson_number = Number(payload.lesson_number);
      if (payload.lesson_image !== undefined) {
        updateData.lesson_image = payload.lesson_image ? String(payload.lesson_image).trim() : null;
      }
      if (payload.section_id !== undefined) updateData.section_id = payload.section_id;

      const { data, error } = await extSb
        .from("lessons")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "chapter") {
      const updateData: Record<string, any> = { updated_at: now };
      if (payload.title !== undefined) updateData.title = String(payload.title);
      if (payload.chapter_number !== undefined) updateData.chapter_number = Number(payload.chapter_number);
      if (payload.image !== undefined) updateData.image = payload.image ? String(payload.image).trim() : null;

      const { data, error } = await extSb
        .from("chapters")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (type === "section") {
      const updateData: Record<string, any> = { updated_at: now };
      if (payload.title !== undefined) updateData.title = String(payload.title);
      if (payload.section_number !== undefined) updateData.section_number = Number(payload.section_number);
      if (payload.chapter_id !== undefined) updateData.chapter_id = payload.chapter_id;

      const { data, error } = await extSb
        .from("sections")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/external-courses error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update external record" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Multipart form-data image upload to External Supabase Storage
    if (contentType.includes("multipart/form-data")) {
      const isAdminUser = await checkIsAdminUser();
      if (!isAdminUser) {
        return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
      }

      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const entityType = formData.get("entityType") as string | null;
      const entityId = formData.get("entityId") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 });
      }

      const extSb = await getExternalAdminClient();
      if (!extSb) {
        return NextResponse.json(
          { error: "External Supabase database is not configured in environment variables." },
          { status: 500 }
        );
      }
      const bucketName = "question-images";
      try {
        await extSb.storage.createBucket(bucketName, { public: true });
      } catch {
        // Bucket already exists
      }

      const ext = file.name.split(".").pop() || "png";
      const safeFolder = entityType || "general";
      const filePath = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await extSb.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: pubData } = extSb.storage.from(bucketName).getPublicUrl(filePath);
      const publicUrl = pubData.publicUrl;

      // Update the record right away if entityType & entityId are provided
      let updatedRecord = null;
      if (entityType && entityId) {
        const now = new Date().toISOString();
        if (entityType === "question") {
          const { data, error: dbErr } = await extSb
            .from("questions")
            .update({ image: publicUrl, updated_at: now })
            .eq("id", entityId)
            .select()
            .single();
          if (dbErr) throw dbErr;
          if (!data) throw new Error(`Question record (${entityId}) not found in external database.`);
          updatedRecord = data;
        } else if (entityType === "lesson") {
          const { data, error: dbErr } = await extSb
            .from("lessons")
            .update({ lesson_image: publicUrl, updated_at: now })
            .eq("id", entityId)
            .select()
            .single();
          if (dbErr) throw dbErr;
          if (!data) throw new Error(`Lesson record (${entityId}) not found in external database.`);
          updatedRecord = data;
        } else if (entityType === "chapter") {
          const { data, error: dbErr } = await extSb
            .from("chapters")
            .update({ image: publicUrl, updated_at: now })
            .eq("id", entityId)
            .select()
            .single();
          if (dbErr) throw dbErr;
          if (!data) throw new Error(`Chapter record (${entityId}) not found in external database.`);
          updatedRecord = data;
        }
      }

      return NextResponse.json({
        success: true,
        publicUrl,
        updatedRecord,
      });
    }

    // 2. JSON Actions
    const body = await req.json();
    const { action } = body;

    // Action: Translate external course / lesson / quiz items into English, French, or Kinyarwanda
    if (action === "translate") {
      const {
        items = [],
        sourceLang = "Kinyarwanda",
        targetLang = "English",
      }: {
        items: { key: string; text: string }[];
        sourceLang?: string;
        targetLang: TargetLanguage;
      } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: true, translations: {} });
      }

      if (sourceLang === targetLang) {
        const identity: Record<string, string> = {};
        for (const it of items) identity[it.key] = it.text;
        return NextResponse.json({ success: true, translations: identity });
      }

      const primarySb = createAdminClient();
      const translations: Record<string, string> = {};
      const toTranslate: { index: number; key: string; text: string; hash: string }[] = [];

      // Check cache in course_ai_cache first
      const entityIds = items.map((it) => `ext_${it.key}`);
      const { data: cachedRows } = await primarySb
        .from("course_ai_cache")
        .select("entity_id, content_hash, cached_data")
        .in("entity_id", entityIds)
        .eq("target_language", targetLang)
        .eq("feature_type", "external_translation");

      const cachedMap = new Map<string, { hash: string; text: string }>();
      for (const row of cachedRows || []) {
        if (row.cached_data?.text) {
          cachedMap.set(row.entity_id, {
            hash: row.content_hash,
            text: row.cached_data.text,
          });
        }
      }

      items.forEach((item, idx) => {
        const text = (item.text || "").trim();
        if (!text) {
          translations[item.key] = "";
          return;
        }
        const hash = crypto.createHash("md5").update(text).digest("hex");
        const cached = cachedMap.get(`ext_${item.key}`);
        if (cached && cached.hash === hash) {
          translations[item.key] = cached.text;
        } else {
          toTranslate.push({ index: idx, key: item.key, text, hash });
        }
      });

      if (toTranslate.length > 0) {
        const snippets = toTranslate.map((t, i) => ({ id: i, text: t.text }));
        const translatedMap = await translateTextSnippets(snippets, sourceLang, targetLang);

        const upsertRows = [];
        const now = new Date().toISOString();

        for (let i = 0; i < toTranslate.length; i++) {
          const item = toTranslate[i];
          const resultText = translatedMap.get(i) || item.text;
          translations[item.key] = resultText;

          upsertRows.push({
            entity_id: `ext_${item.key}`,
            target_language: targetLang,
            feature_type: "external_translation",
            content_hash: item.hash,
            cached_data: { text: resultText, updatedAt: now },
            updated_at: now,
          });
        }

        if (upsertRows.length > 0) {
          try {
            await primarySb
              .from("course_ai_cache")
              .upsert(upsertRows, { onConflict: "entity_id,target_language,feature_type" });
          } catch (cacheErr) {
            console.warn("Could not cache external translation:", cacheErr);
          }
        }
      }

      return NextResponse.json({
        success: true,
        targetLang,
        translations,
      });
    }

    // Admin mutations below
    const isAdminUser = await checkIsAdminUser();
    if (!isAdminUser) {
      return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    }

    const extSb = await getExternalAdminClient();
    if (!extSb) {
      return NextResponse.json(
        { error: "External Supabase database is not configured in environment variables." },
        { status: 500 }
      );
    }
    const now = new Date().toISOString();

    if (action === "create_question") {
      const { payload } = body;
      const newQuestion = {
        id: payload.id || crypto.randomUUID(),
        title: String(payload.title || ""),
        choice: Array.isArray(payload.choice) ? payload.choice : ["", "", "", ""],
        choice_answer: Number(payload.choice_answer ?? 0),
        chapter_id: payload.chapter_id,
        image: payload.image ? String(payload.image).trim() : null,
        question_numbers:
          payload.question_numbers === "" || payload.question_numbers === null || payload.question_numbers === undefined
            ? null
            : Number(payload.question_numbers),
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await extSb.from("questions").insert(newQuestion).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_question") {
      const { id } = body;
      const { error } = await extSb.from("questions").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "create_lesson") {
      const { payload } = body;
      const newLesson = {
        id: payload.id || crypto.randomUUID(),
        title: String(payload.title || ""),
        lesson_number: Number(payload.lesson_number || 1),
        lesson_image: payload.lesson_image ? String(payload.lesson_image).trim() : null,
        section_id: payload.section_id,
        created_at: now,
        updated_at: now,
      };
      const { data, error } = await extSb.from("lessons").insert(newLesson).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_lesson") {
      const { id } = body;
      const { error } = await extSb.from("lessons").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/external-courses error:", error);
    return NextResponse.json(
      { error: error?.message || "External courses request failed" },
      { status: 500 }
    );
  }
}
