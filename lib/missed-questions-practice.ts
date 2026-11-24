"use client";

import type { ExamQuestion } from "@/lib/database.types";
import { getBrowserExamRecordsAsync } from "@/lib/browser-exam-history";

export interface MissedQuestionPoolSummary {
  questions: ExamQuestion[];
  totalMissedCount: number;
  sourceAttemptCount: number;
}

/**
 * Collects unique questions that the student answered incorrectly (or left unanswered)
 * from their locally saved exam records so they can practice their weak areas directly.
 */
export async function collectMissedQuestionsForUser(
  userId?: string | null,
  maxQuestions = 20
): Promise<MissedQuestionPoolSummary> {
  if (!userId) {
    return { questions: [], totalMissedCount: 0, sourceAttemptCount: 0 };
  }

  const records = await getBrowserExamRecordsAsync(userId).catch(() => []);
  if (!records || records.length === 0) {
    return { questions: [], totalMissedCount: 0, sourceAttemptCount: 0 };
  }

  const missedById = new Map<string, ExamQuestion>();
  let sourceAttemptCount = 0;

  for (const rec of records) {
    const attempt = rec.attempt;
    const questions = rec.questions;
    if (!attempt || !Array.isArray(questions) || questions.length === 0) continue;

    // Skip empty/void attempts with 0 answered questions so we don't dump whole untouched exams
    const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
    const answeredCount = answers.filter((a) => Boolean(a?.selected_answer)).length;
    if (attempt.status === "abandoned" || answeredCount === 0) continue;

    const answerByQId = new Map(answers.map((a) => [String(a.question_id), a]));
    let attemptHadMissed = false;

    for (const q of questions) {
      if (!q?.id || !q.correct_answer) continue;
      const ans = answerByQId.get(String(q.id));
      const isCorrect =
        ans &&
        (ans.is_correct === true ||
          (Boolean(ans.selected_answer) && ans.selected_answer === q.correct_answer));

      if (!isCorrect) {
        attemptHadMissed = true;
        if (!missedById.has(String(q.id))) {
          missedById.set(String(q.id), q);
        }
      }
    }

    if (attemptHadMissed) {
      sourceAttemptCount++;
    }
  }

  const allMissed = Array.from(missedById.values());
  return {
    questions: allMissed.slice(0, maxQuestions),
    totalMissedCount: allMissed.length,
    sourceAttemptCount,
  };
}
