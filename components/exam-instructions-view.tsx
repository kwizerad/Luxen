"use client";

import { ExamStartVerificationCard } from "@/components/exam-start-verification-card";

interface ExamInstructionsViewProps {
  totalQuestions: number;
  durationMinutes: number;
  onStartQuestions: () => void;
  onCancel?: () => void;
  examTitle?: string;
  categoryName?: string;
  examLanguage?: string;
}

export function ExamInstructionsView({
  totalQuestions,
  durationMinutes,
  onStartQuestions,
  onCancel,
  examTitle,
  categoryName,
  examLanguage,
}: ExamInstructionsViewProps) {
  return (
    <ExamStartVerificationCard
      examTitle={examTitle || categoryName || "Exam"}
      durationMinutes={durationMinutes}
      totalQuestions={totalQuestions}
      examLanguage={examLanguage}
      onConfirmStart={onStartQuestions}
      onCancel={onCancel}
    />
  );
}
