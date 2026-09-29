import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ai, isAiConfigured, generateContentWithFallback } from "@/lib/ai/gemini-client";

export const dynamic = "force-dynamic";

function generateFallbackInsights(stats: {
  totalAttempts: number;
  passedCount: number;
  passRate: number;
  avgScore: number;
  activeCoursesCount: number;
  studentsProgressTracked: number;
}) {
  const { totalAttempts, passedCount, passRate, avgScore, activeCoursesCount, studentsProgressTracked } = stats;
  const score = totalAttempts > 0 ? Math.min(100, Math.max(25, Math.round(passRate * 0.6 + avgScore * 0.4))) : 78;

  return {
    performanceScore: score,
    summary:
      totalAttempts > 0
        ? `Student cohort demonstrates a ${passRate}% pass rate across ${totalAttempts} recorded theory exam attempts with an average score of ${avgScore}%.`
        : `Luxen platform active with ${activeCoursesCount} course languages and tracking ${studentsProgressTracked} student learning progress milestones.`,
    strengths: [
      totalAttempts > 0 && passRate >= 60
        ? `Solid foundation in standard traffic rules with ${passedCount} passing student attempts.`
        : `Active curriculum engagement with ${studentsProgressTracked} student learning records tracked.`,
      `Multi-language curriculum coverage across English, French, and Kinyarwanda supports diverse candidate backgrounds.`,
      `Continuous module-based testing encourages incremental mastery prior to the official Irembo exam.`
    ],
    weaknesses: [
      passRate < 75 && totalAttempts > 0
        ? `First-attempt pass rate of ${passRate}% indicates candidates need reinforcement on complex right-of-way junction rules.`
        : `Pacing variation between language editions requires consistent terminology synchronization.`,
      `High-stakes Rwanda Police exam scenarios (priority to the right vs roundabouts) require focused practice.`
    ],
    recommendations: [
      `Encourage students to use the Dual-Language View to cross-reference Kinyarwanda and English technical traffic terms.`,
      `Promote timed mock exam simulations to acclimate candidates to the 20-minute Irembo exam time limit.`,
      `Review lessons on road markings (continuous vs broken lines) where theory failure rates are traditionally highest.`
    ],
    curriculumTips: [
      `Emphasize Article 12 of the Rwanda Road Code: priority of police signals over traffic lights and road signs.`,
      `Highlight speed limits across urban zones (40 km/h) versus national highways (80 km/h) in quick-reference callouts.`,
      `Incorporate AI audio narration (TTS) for students who benefit from auditory learning during road sign review.`
    ]
  };
}

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

    const fallbackInsights = generateFallbackInsights({
      totalAttempts,
      passedCount,
      passRate,
      avgScore,
      activeCoursesCount: courses.length,
      studentsProgressTracked: progress.length,
    });

    if (!isAiConfigured()) {
      return NextResponse.json({
        success: true,
        stats: statsSummary,
        insights: fallbackInsights,
        aiConfigured: false,
        source: "rule_engine",
      });
    }

    try {
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

      const response = await generateContentWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const parsed = JSON.parse(response?.text || "{}");
      if (parsed && typeof parsed.performanceScore === "number") {
        return NextResponse.json({
          success: true,
          stats: statsSummary,
          insights: parsed,
          aiConfigured: true,
          source: "gemini",
        });
      }
    } catch (aiErr: any) {
      console.warn("AI generation failed in analytics insights, using rule engine fallback:", aiErr?.message || aiErr);
    }

    return NextResponse.json({
      success: true,
      stats: statsSummary,
      insights: fallbackInsights,
      aiConfigured: isAiConfigured(),
      source: "rule_engine_fallback",
    });
  } catch (error: any) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate performance insights" },
      { status: 500 }
    );
  }
}
