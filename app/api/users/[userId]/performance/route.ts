import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = params;

    // Get user's exam attempts
    const { data: attempts, error } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch exam attempts:", error);
      return NextResponse.json({ error: "Failed to fetch exam attempts" }, { status: 500 });
    }

    // Get user's course progress (lesson + module) with exceeded time
    const [lessonProgressResult, moduleProgressResult] = await Promise.all([
      supabase
        .from("student_lesson_progress")
        .select("lesson_id, module_id, completed, time_spent_seconds, exceeded_time_seconds")
        .eq("user_id", userId),
      supabase
        .from("student_module_progress")
        .select("module_id, time_spent_seconds, exceeded_time_seconds, lessons_completed, total_lessons")
        .eq("user_id", userId),
    ]);

    const lessonProgress = lessonProgressResult.data || [];
    const moduleProgress = moduleProgressResult.data || [];

    const totalExceededTime = lessonProgress.reduce(
      (sum: number, l: { exceeded_time_seconds?: number }) => sum + (l.exceeded_time_seconds || 0),
      0
    );
    const totalTimeSpent = lessonProgress.reduce(
      (sum: number, l: { time_spent_seconds?: number }) => sum + (l.time_spent_seconds || 0),
      0
    );

    return NextResponse.json({
      attempts: attempts || [],
      courseProgress: {
        lessons: lessonProgress,
        modules: moduleProgress,
        totalExceededTime,
        totalTimeSpent,
      },
    });
  } catch (error) {
    console.error("Performance data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
