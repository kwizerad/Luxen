import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      lessonId,
      moduleId,
      completed = false,
      timeSpentSeconds = 0,
      exceededTimeSeconds = 0,
      topicId,
    } = body;

    if (!lessonId || !moduleId) {
      return NextResponse.json({ error: "lessonId and moduleId are required" }, { status: 400 });
    }

    // Try user client first, fallback to admin client if RLS is restrictive
    let client = supabase;
    const adminSupabase = createAdminClient();

    // 1. Upsert student_lesson_progress
    const { data: existingLesson, error: fetchErr } = await client
      .from("student_lesson_progress")
      .select("id, time_spent_seconds, exceeded_time_seconds, completed")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (fetchErr) {
      console.warn("Retrying with admin client for progress:", fetchErr.message);
      client = adminSupabase;
    }

    const isNowCompleted = completed || (existingLesson?.completed ?? false);

    if (existingLesson) {
      const { error: updateErr } = await client
        .from("student_lesson_progress")
        .update({
          completed: isNowCompleted,
          completed_at: isNowCompleted ? new Date().toISOString() : null,
          time_spent_seconds: (existingLesson.time_spent_seconds || 0) + Number(timeSpentSeconds || 0),
          exceeded_time_seconds: (existingLesson.exceeded_time_seconds || 0) + Number(exceededTimeSeconds || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLesson.id);

      if (updateErr && client !== adminSupabase) {
        await adminSupabase
          .from("student_lesson_progress")
          .update({
            completed: isNowCompleted,
            completed_at: isNowCompleted ? new Date().toISOString() : null,
            time_spent_seconds: (existingLesson.time_spent_seconds || 0) + Number(timeSpentSeconds || 0),
            exceeded_time_seconds: (existingLesson.exceeded_time_seconds || 0) + Number(exceededTimeSeconds || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLesson.id);
      }
    } else {
      const { error: insertErr } = await client
        .from("student_lesson_progress")
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          module_id: moduleId,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          time_spent_seconds: Number(timeSpentSeconds || 0),
          exceeded_time_seconds: Number(exceededTimeSeconds || 0),
        });

      if (insertErr && client !== adminSupabase) {
        await adminSupabase
          .from("student_lesson_progress")
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
            module_id: moduleId,
            completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
            time_spent_seconds: Number(timeSpentSeconds || 0),
            exceeded_time_seconds: Number(exceededTimeSeconds || 0),
          });
      }
    }

    // 2. Count total completed lessons in this module
    const { count: completedLessonsCount } = await adminSupabase
      .from("student_lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .eq("completed", true);

    const { count: totalLessonsCount } = await adminSupabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("module_id", moduleId)
      .is("deleted_at", null);

    // 3. Upsert student_module_progress
    const { data: existingMod } = await adminSupabase
      .from("student_module_progress")
      .select("id, time_spent_seconds, exceeded_time_seconds, lessons_completed")
      .eq("user_id", user.id)
      .eq("module_id", moduleId)
      .maybeSingle();

    if (existingMod) {
      await adminSupabase
        .from("student_module_progress")
        .update({
          lessons_completed: completedLessonsCount || 0,
          total_lessons: totalLessonsCount || 0,
          time_spent_seconds: (existingMod.time_spent_seconds || 0) + Number(timeSpentSeconds || 0),
          exceeded_time_seconds: (existingMod.exceeded_time_seconds || 0) + Number(exceededTimeSeconds || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMod.id);
    } else {
      await adminSupabase
        .from("student_module_progress")
        .insert({
          user_id: user.id,
          module_id: moduleId,
          lessons_completed: completedLessonsCount || 0,
          total_lessons: totalLessonsCount || 0,
          exam_passed: false,
          exam_attempts: 0,
          time_spent_seconds: Number(timeSpentSeconds || 0),
          exceeded_time_seconds: Number(exceededTimeSeconds || 0),
        });
    }

    return NextResponse.json({ success: true, completedCount: completedLessonsCount });
  } catch (error: any) {
    console.error("Error updating course progress:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");

    const adminSupabase = createAdminClient();

    let lessonQuery = adminSupabase
      .from("student_lesson_progress")
      .select("*")
      .eq("user_id", user.id);

    let moduleQuery = adminSupabase
      .from("student_module_progress")
      .select("*")
      .eq("user_id", user.id);

    if (moduleId) {
      lessonQuery = lessonQuery.eq("module_id", moduleId);
      moduleQuery = moduleQuery.eq("module_id", moduleId);
    }

    const [lessonRes, moduleRes] = await Promise.all([lessonQuery, moduleQuery]);

    return NextResponse.json({
      lessons: lessonRes.data || [],
      modules: moduleRes.data || [],
    });
  } catch (error: any) {
    console.error("Error fetching course progress:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
