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

// Validation: At least one of question or question_image must be provided
// At least one of option_X or option_X_image must be provided for each option
