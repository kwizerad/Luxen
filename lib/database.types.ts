export interface ExamCategory {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  is_published?: boolean;
  updated_at?: string;
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
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean;
  time_spent_seconds?: number;
}

// Validation: At least one of question or question_image must be provided
// At least one of option_X or option_X_image must be provided for each option

export interface UserProfile {
  id: string;
  email?: string;
  role?: 'Student' | 'Admin' | 'Teacher' | 'Driver' | 'Landlord';
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  birthdate?: string;
  created_at: string;
  updated_at?: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// COURSE MANAGEMENT TYPES
// ============================================================================

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  content_type: 'text' | 'video' | 'image' | 'document';
  media_url?: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ModuleExamSettings {
  id: string;
  module_id: string;
  question_count: number;
  duration_minutes: number;
  passing_score: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  max_attempts: number;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ModuleExamQuestion {
  id: string;
  module_id: string;
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
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface StudentModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  lessons_completed: number;
  total_lessons: number;
  exam_passed: boolean;
  exam_attempts: number;
  best_score?: number;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface StudentLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  module_id: string;
  completed: boolean;
  completed_at?: string;
  time_spent_seconds: number;
  created_at: string;
  updated_at?: string;
}

export interface ModuleExamAttempt {
  id: string;
  user_id: string;
  module_id: string;
  module_title: string;
  started_at: string;
  completed_at?: string;
  duration_seconds: number;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  passed: boolean;
  answers: ModuleExamAnswer[];
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at?: string;
}

export interface ModuleExamAnswer {
  question_id: string;
  selected_answer: 'A' | 'B' | 'C' | 'D' | null;
  is_correct: boolean;
  time_spent_seconds?: number;
}
