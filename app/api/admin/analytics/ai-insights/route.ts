import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ai } from "@/lib/ai/gemini-client";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Query high-level stats from attempts and modules
    const [attemptsRes, progressRes, coursesRes] = await Promise.all([
      supabase
        .from("module_exam_attempts")
        .select("id, exam_type, score, passed, duration_seconds, total_questions, correct_answers, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("student_module_progress")
        .select("lessons_completed, total_lessons, exam_passed, exam_attempts, best_score, time_spent_seconds")
        .limit(200),
      supabase
        .from("course_languages")
        .select("id, language, title, is_published")
        .is("deleted_at", null),
    ]);

    const attempts = attemptsRes.data || [];
    const progress = progressRes.data || [];
    const courses = coursesRes.data || [];

    const totalAttempts = attempts.length;
    const passedCount = attempts.filter((a) => a.passed).length;
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
    const avgScore =
      totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / totalAttempts)
        : 0;

    const statsSummary = {
      totalAttempts,
      passedCount,
      passRate: `${passRate}%`,
      avgScore: `${avgScore}%`,
      activeCoursesCount: courses.length,
      studentsProgressTracked: progress.length,
    };

    const prompt = `You are a Senior Learning Analytics & Traffic Education Performance Consultant for Luxen Driving School (Rwanda).
Analyze these current student exam and learning performance metrics:
${JSON.stringify(statsSummary, null, 2)}

Provide concise, high-value, actionable performance insights formatted as JSON:
{
  "performanceScore": number (0-100),
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "recommendations": string[],
  "curriculumTips": string[]
}
Keep points directly relevant to driving theory, exam preparation for the Rwanda Police theory exam (Irembo), and student retention across English, French, and Kinyarwanda courses.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    return NextResponse.json({
      success: true,
      stats: statsSummary,
      insights: parsed,
    });
  } catch (error: any) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate AI performance insights" },
      { status: 500 }
    );
  }
}
