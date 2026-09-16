import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin-audit";

export interface AuditReportData {
  generatedAt: string;
  courses: {
    healthScore: number;
    totalModules: number;
    publishedModules: number;
    draftModules: number;
    totalLessons: number;
    publishedLessons: number;
    totalTopics: number;
    lessonsWithContent: number;
    lessonsMissingContent: number;
    lessonsWithoutTopics: number;
    modulesBreakdown: {
      id: string;
      title: string;
      isPublished: boolean;
      lessonsCount: number;
    }[];
    issues: string[];
    recommendations: string[];
  };
  exams: {
    healthScore: number;
    totalCategories: number;
    publishedCategories: number;
    totalQuestions: number;
    questionsWithDiagrams: number;
    questionsWithExplanations: number;
    questionsMissingAnswer: number;
    questionsMissingOptions: number;
    categoriesBreakdown: {
      id: string;
      name: string;
      isPublished: boolean;
      questionCount: number;
      configuredQuestionsPerExam?: number;
      durationMinutes?: number;
    }[];
    telemetry: {
      totalAttempts: number;
      completedAttempts: number;
      passedAttempts: number;
      failedAttempts: number;
      inProgressAttempts: number;
      abandonedOrExpiredAttempts: number;
      passRate: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      uniqueStudentsCount: number;
    };
    challenges: {
      totalGroupChallenges: number;
      totalParticipants: number;
      completed: number;
      pendingOrInvited: number;
      abandonedOrExpired: number;
    };
    issues: string[];
    recommendations: string[];
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // 1. Fetch Courses Data
    const { data: rawModules } = await supabase
      .from("course_modules")
      .select("*")
      .order("order_index", { ascending: true });
    const modules = rawModules || [];

    const { data: rawLessons } = await supabase
      .from("course_lessons")
      .select("*")
      .order("order_index", { ascending: true });
    const lessons = rawLessons || [];

    // 2. Fetch Exams Data
    const { data: rawCategories } = await supabase
      .from("exam_categories")
      .select("*")
      .order("created_at", { ascending: true });
    const categories = rawCategories || [];

    const { data: rawSettings } = await supabase
      .from("exam_settings")
      .select("*");
    const settings = rawSettings || [];

    const { data: rawQuestions } = await supabase
      .from("exam_questions")
      .select("*");
    const questions = rawQuestions || [];

    const { data: rawAttempts } = await supabase
      .from("exam_attempts")
      .select("*");
    const attempts = rawAttempts || [];

    const { data: rawChallenges } = await supabase
      .from("exam_challenges")
      .select("*");
    const challenges = rawChallenges || [];

    const { data: rawParticipants } = await supabase
      .from("exam_challenge_participants")
      .select("*");
    const participants = rawParticipants || [];

    // Process Courses Audit
    const totalModules = modules.length;
    const publishedModules = modules.filter((m) => m.is_published).length;
    const draftModules = totalModules - publishedModules;
    const totalLessons = lessons.length;
    const publishedLessons = lessons.filter((l) => l.is_published).length;

    let totalTopics = 0;
    let lessonsMissingContent = 0;
    let lessonsWithoutTopics = 0;
    const courseIssues: string[] = [];
    const courseRecommendations: string[] = [];

    const moduleLessonsMap = new Map<string, number>();
    modules.forEach((m) => moduleLessonsMap.set(m.id, 0));

    lessons.forEach((l) => {
      if (l.module_id && moduleLessonsMap.has(l.module_id)) {
        moduleLessonsMap.set(l.module_id, (moduleLessonsMap.get(l.module_id) || 0) + 1);
      }

      if (!l.content || l.content.trim().length === 0) {
        lessonsMissingContent++;
      }

      let topicsList = [];
      if (Array.isArray(l.topics)) {
        topicsList = l.topics;
      } else if (typeof l.topics === "string") {
        try {
          topicsList = JSON.parse(l.topics);
        } catch {}
      }

      if (!topicsList || topicsList.length === 0) {
        lessonsWithoutTopics++;
      } else {
        totalTopics += topicsList.length;
      }
    });

    if (draftModules > 0) {
      courseIssues.push(`${draftModules} course module(s) are in unpublished/draft mode.`);
      courseRecommendations.push("Review and publish draft course modules once content review is complete.");
    }
    if (lessonsMissingContent > 0) {
      courseIssues.push(`${lessonsMissingContent} lesson(s) have empty or missing text content.`);
      courseRecommendations.push("Add markdown/rich text content to all active lessons.");
    }
    if (lessonsWithoutTopics > 0) {
      courseIssues.push(`${lessonsWithoutTopics} lesson(s) do not contain broken-down sub-topics.`);
      courseRecommendations.push("Split long lesson texts into progressive sub-topics for better learner retention.");
    }

    const modulesBreakdown = modules.map((m) => ({
      id: m.id,
      title: m.title || "Untitled Module",
      isPublished: !!m.is_published,
      lessonsCount: moduleLessonsMap.get(m.id) || 0,
    }));

    // Calculate Courses Health Score (0-100)
    let courseHealth = 100;
    if (draftModules > totalModules / 2) courseHealth -= 15;
    if (lessonsMissingContent > 0) courseHealth -= Math.min(25, (lessonsMissingContent / Math.max(totalLessons, 1)) * 30);
    if (publishedLessons < totalLessons / 2) courseHealth -= 10;
    courseHealth = Math.max(0, Math.round(courseHealth));

    // Process Exams Audit
    const totalCategories = categories.length;
    const publishedCategories = categories.filter((c) => c.is_published).length;
    const totalQuestions = questions.length;

    let questionsMissingAnswer = 0;
    let questionsMissingOptions = 0;
    let questionsWithDiagrams = 0;
    let questionsWithExplanations = 0;
    const examIssues: string[] = [];
    const examRecommendations: string[] = [];

    const categoryQuestionCounts = new Map<string, number>();
    categories.forEach((c) => categoryQuestionCounts.set(c.id, 0));

    questions.forEach((q) => {
      if (q.category_id && categoryQuestionCounts.has(q.category_id)) {
        categoryQuestionCounts.set(q.category_id, (categoryQuestionCounts.get(q.category_id) || 0) + 1);
      }

      const validAnswers = ["A", "B", "C", "D", "a", "b", "c", "d"];
      if (!q.correct_answer || !validAnswers.includes(q.correct_answer.trim())) {
        questionsMissingAnswer++;
      }

      if (!q.option_a || !q.option_b) {
        questionsMissingOptions++;
      }

      if (q.question_image || q.option_a_image || q.option_b_image || q.option_c_image || q.option_d_image) {
        questionsWithDiagrams++;
      }

      if (q.explanation && q.explanation.trim().length > 0) {
        questionsWithExplanations++;
      }
    });

    if (questionsMissingAnswer > 0) {
      examIssues.push(`${questionsMissingAnswer} question(s) have invalid or missing correct answer indicators.`);
      examRecommendations.push("Fix missing correct answers immediately to avoid grading errors.");
    }
    if (questionsMissingOptions > 0) {
      examIssues.push(`${questionsMissingOptions} question(s) have incomplete answer choices.`);
      examRecommendations.push("Provide at least 2 distinct multiple choice options for all questions.");
    }
    if (questionsWithExplanations < totalQuestions * 0.5) {
      examRecommendations.push(`Add learning explanations to questions (currently ${questionsWithExplanations}/${totalQuestions} have explanations) to help students review mistakes.`);
    }

    const settingsMap = new Map<string, any>();
    settings.forEach((s) => settingsMap.set(s.category_id, s));

    const categoriesBreakdown = categories.map((c) => {
      const s = settingsMap.get(c.id);
      return {
        id: c.id,
        name: c.name || "Unnamed Category",
        isPublished: !!c.is_published,
        questionCount: categoryQuestionCounts.get(c.id) || 0,
        configuredQuestionsPerExam: s?.question_count,
        durationMinutes: s?.duration_minutes,
      };
    });

    // Telemetry
    const completedAttempts = attempts.filter((a) => a.status === "completed" || a.score_percentage !== null);
    const passedAttempts = completedAttempts.filter((a) => (a.score_percentage ?? 0) >= 50);
    const failedAttempts = completedAttempts.length - passedAttempts.length;
    const inProgressAttempts = attempts.filter((a) => a.status === "in_progress" && a.score_percentage === null).length;
    const abandonedOrExpiredAttempts = attempts.filter((a) => a.status === "abandoned" || a.status === "expired").length;

    const scores = completedAttempts.map((a) => Number(a.score_percentage ?? 0)).filter((s) => !isNaN(s));
    const averageScore = scores.length > 0 ? Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10 : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passRate = completedAttempts.length > 0 ? Math.round((passedAttempts.length / completedAttempts.length) * 1000) / 10 : 0;
    const uniqueStudentsCount = new Set(attempts.map((a) => a.user_id).filter(Boolean)).size;

    // Challenge participants
    const completedChallenges = participants.filter((p) => p.status === "completed").length;
    const pendingChallenges = participants.filter((p) => p.status === "invited" || p.status === "pending" || p.status === "ready").length;
    const expiredChallenges = participants.filter((p) => p.status === "abandoned" || p.status === "expired").length;

    // Calculate Exam Health Score
    let examHealth = 100;
    if (questionsMissingAnswer > 0) examHealth -= 25;
    if (questionsMissingOptions > 0) examHealth -= 25;
    if (totalQuestions < 50) examHealth -= 10;
    examHealth = Math.max(0, Math.round(examHealth));

    const responseData: AuditReportData = {
      generatedAt: new Date().toISOString(),
      courses: {
        healthScore: courseHealth,
        totalModules,
        publishedModules,
        draftModules,
        totalLessons,
        publishedLessons,
        totalTopics,
        lessonsWithContent: totalLessons - lessonsMissingContent,
        lessonsMissingContent,
        lessonsWithoutTopics,
        modulesBreakdown,
        issues: courseIssues,
        recommendations: courseRecommendations,
      },
      exams: {
        healthScore: examHealth,
        totalCategories,
        publishedCategories,
        totalQuestions,
        questionsWithDiagrams,
        questionsWithExplanations,
        questionsMissingAnswer,
        questionsMissingOptions,
        categoriesBreakdown,
        telemetry: {
          totalAttempts: attempts.length,
          completedAttempts: completedAttempts.length,
          passedAttempts: passedAttempts.length,
          failedAttempts,
          inProgressAttempts,
          abandonedOrExpiredAttempts,
          passRate,
          averageScore,
          highestScore,
          lowestScore,
          uniqueStudentsCount,
        },
        challenges: {
          totalGroupChallenges: challenges.length,
          totalParticipants: participants.length,
          completed: completedChallenges,
          pendingOrInvited: pendingChallenges,
          abandonedOrExpired: expiredChallenges,
        },
        issues: examIssues,
        recommendations: examRecommendations,
      },
    };

    // Save audit snapshot to database
    try {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await supabase.from("system_audit_reports").insert({
        id: auditId,
        created_at: responseData.generatedAt,
        audit_type: "FULL_COURSE_EXAM_AUDIT",
        courses_health_score: courseHealth,
        exams_health_score: examHealth,
        total_modules: totalModules,
        published_modules: publishedModules,
        total_lessons: totalLessons,
        published_lessons: publishedLessons,
        total_questions: totalQuestions,
        total_exam_attempts: attempts.length,
        pass_rate: passRate,
        average_score: averageScore,
        issues_count: courseIssues.length + examIssues.length,
        report_data: responseData,
        generated_by: "ADMIN_DASHBOARD",
      });

      // Also record in administrative action audit logs
      await logAdminAction({
        action: "SYSTEM_AUDIT_EXECUTED",
        actionLabel: "Course & Exam System Audit Executed",
        category: "SYSTEM_CRON",
        details: `Course & Exam system audit executed with Course Health: ${courseHealth}%, Exam Health: ${examHealth}%, ${totalQuestions} questions, ${attempts.length} attempts audited.`,
        metadata: {
          coursesHealth: courseHealth,
          examsHealth: examHealth,
          totalQuestions,
          totalLessons,
          passRate,
        },
      });
    } catch (saveError) {
      console.warn("[AuditReportAPI] Optional DB snapshot save failed (table may be pending migration):", saveError);
    }

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    console.error("[AuditReportAPI] Error generating audit report:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to generate report" }, { status: 500 });
  }
}
