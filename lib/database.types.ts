export interface ExamCategory {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface ExamQuestion {
  id: string;
  category_id: string;
  question?: string;
  question_image?: string;
  option_a?: string;
  option_a_image?: string;
  option_b?: string;
  option_b_image?: string;
  option_c?: string;
  option_c_image?: string;
  option_d?: string;
  option_d_image?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  created_at: string;
  created_by: string;
}

export type ExamQuestionSortingMode = "RANDOM" | "TEXT_ONLY" | "WITH_PICTURE" | "MIXED_50";

export interface ExamSettings {
  id: string;
  category_id: string;
  question_count: number;
  duration_minutes: number;
  sorting_mode: ExamQuestionSortingMode;
  available_from?: string | null;
  available_to?: string | null;
  updated_at: string;
  updated_by: string;
}

export interface ExamAttempt {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  started_at: string;
  completed_at?: string | null;
  duration_seconds: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  answers: ExamAnswer[];
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface ExamAnswer {
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D';
  is_correct: boolean;
  time_spent_seconds?: number;
}

// Validation: At least one of question or question_image must be provided
// At least one of option_X or option_X_image must be provided for each option
