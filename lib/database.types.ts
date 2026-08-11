export interface ExamCategory {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  is_published?: boolean;
  updated_at?: string;
  duration_minutes?: number;
  question_count?: number;
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
  role?: 'Student' | 'Admin' | 'Driver';
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  birthdate?: string;
  last_seen?: string;
  banned?: boolean;
  national_id?: string;
  provision_verified?: boolean;
  provision_category?: string;
  provision_verified_at?: string;
  warned?: boolean;
  warned_at?: string;
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

export interface AnonymousVisit {
  id: string;
  fingerprint: string;
  ip_address?: string | null;
  user_agent?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  screen_width?: number | null;
  screen_height?: number | null;
  device_type?: string | null;
  os?: string | null;
  browser?: string | null;
  browser_version?: string | null;
  language?: string | null;
  timezone?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  touch_support?: boolean | null;
  cookies_enabled?: boolean | null;
  visit_count: number;
  first_seen: string;
  last_seen: string;
  linked_user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// ============================================================================
// COURSE MANAGEMENT TYPES
// ============================================================================

export type CourseLanguage = 'English' | 'Kinyarwanda' | 'French';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type ModuleStatus = 'draft' | 'published' | 'archived';
export type LessonContentType = 'text' | 'rich_text' | 'video' | 'audio' | 'image' | 'document' | 'mixed';
export type ModuleExamQuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'matching';

export interface CourseLanguageCourse {
  id: string;
  language: CourseLanguage;
  title: string;
  description?: string;
  thumbnail_url?: string;
  banner_url?: string;
  category?: string;
  estimated_completion_minutes?: number;
  status: CourseStatus;
  archived_at?: string | null;
  is_published: boolean;
  deleted_at?: string | null;
  order_index: number;
  midterm_enabled: boolean;
  midterm_interval: number;
  midterm_question_count: number;
  midterm_duration_minutes: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CourseModule {
  id: string;
  language_id?: string;
  title: string;
  description?: string;
  objectives?: string;
  completion_requirements?: Record<string, unknown>;
  estimated_study_minutes?: number;
  is_locked?: boolean;
  status: CourseStatus;
  title_translations?: Record<string, string>;
  description_translations?: Record<string, string>;
  order_index: number;
  is_published: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CourseLessonResource {
  name: string;
  url: string;
  type?: 'attachment' | 'download';
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  content_json?: Record<string, unknown> | null;
  content_json_translations?: Record<string, Record<string, unknown>>;
  short_description?: string;
  thumbnail_url?: string;
  tags?: string[];
  topics?: any[];
  estimated_reading_minutes?: number;
  is_preview?: boolean;
  status: CourseStatus;
  resources?: CourseLessonResource[];
  title_translations?: Record<string, string>;
  content_translations?: Record<string, string>;
  content_type: LessonContentType;
  media_url?: string;
  audio_url?: string;
  image_url?: string;
  order_index: number;
  is_published: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export type CourseContentNodeType = 'quiz' | 'assignment' | 'resource' | 'certificate';
export type CourseContentNodeStatus = 'draft' | 'published' | 'scheduled' | 'hidden' | 'archived';

export interface CourseContentNode {
  id: string;
  course_id: string;
  module_id?: string | null;
  parent_id?: string | null;
  type: CourseContentNodeType;
  title: string;
  description?: string | null;
  status: CourseContentNodeStatus;
  order_index: number;
  metadata: Record<string, unknown>;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface ModuleExamSettings {
  id: string;
  module_id: string;
  title: string;
  status: CourseStatus;
  question_count: number;
  duration_minutes: number;
  passing_percentage: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  max_attempts?: number | null;
  retake_limit?: number | null;
  show_results_immediately: boolean;
  show_explanations: boolean;
  allow_review: boolean;
  exam_type: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ModuleExamQuestion {
  id: string;
  module_id: string;
  type: ModuleExamQuestionType;
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
  correct_answer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  points: number;
  order_index: number;
  is_published: boolean;
  metadata?: Record<string, unknown>;
  tags?: string[];
  randomize_answer_order: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  order_index: number;
  deleted_at?: string | null;
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
  time_spent_seconds: number;
  exceeded_time_seconds: number;
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
  exceeded_time_seconds: number;
  created_at: string;
  updated_at?: string;
}

export interface ModuleExamAttempt {
  id: string;
  user_id: string;
  module_id: string | null;
  module_title: string | null;
  exam_type: 'module' | 'midterm' | 'final';
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

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 
  | 'language_published'
  | 'module_published'
  | 'lesson_published'
  | 'exam_result'
  | 'module_completed'
  | 'course_updated'
  | 'system_update'
  | 'announcement'
  | 'exam_available'
  | 'reminder';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// ============================================================================
// EXAM RETAKE REQUEST TYPES
// ============================================================================

export type ExamRetakeStatus = 'pending' | 'approved' | 'denied';
export type ExamRetakeType = 'module' | 'midterm' | 'final';

export interface ExamRetakeRequest {
  id: string;
  user_id: string;
  module_id: string | null;
  exam_type: ExamRetakeType;
  reason?: string;
  status: ExamRetakeStatus;
  admin_id?: string | null;
  admin_note?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// DRIVER & PRACTICAL TRAINING TYPES
// ============================================================================

export type SchedulingMode = 'scheduled' | 'queue';
export type DurationType = 'day' | 'week' | 'month';
export type ApplicationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type BookingStatus = 'booked' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type ExamRequestType = 'theory' | 'practical';
export type ReportType = 'harassment' | 'fraud' | 'unsafe_behavior' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportAction = 'none' | 'warning' | 'suspension';

export interface Driver {
  id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  training_location?: string;
  training_address?: string;
  bio?: string;
  avatar_url?: string;
  vehicle_type?: string;
  license_number?: string;
  years_experience?: number;
  certifications?: string;
  languages_spoken?: string[];
  specialties?: string[];
  training_approach?: string;
  scheduling_mode: SchedulingMode;
  cancel_enabled: boolean;
  cancel_window_minutes: number;
  price_per_day?: number;
  price_per_week?: number;
  price_per_month?: number;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DriverPlan {
  id: string;
  driver_id: string;
  title: string;
  description?: string;
  duration_type: DurationType;
  price: number;
  features?: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DriverApplication {
  id: string;
  driver_id: string;
  student_id: string;
  plan_id?: string | null;
  duration_type: DurationType;
  duration_count: number;
  total_price?: number;
  status: ApplicationStatus;
  student_note?: string;
  driver_note?: string;
  created_at: string;
  updated_at?: string;
}

export interface DriverBooking {
  id: string;
  driver_id: string;
  student_id: string;
  application_id?: string | null;
  booking_date: string;
  start_time?: string | null;
  end_time?: string | null;
  queue_position?: number | null;
  status: BookingStatus;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  created_at: string;
}

export interface TrainingLog {
  id: string;
  driver_id: string;
  student_id: string;
  booking_id?: string | null;
  session_date: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number;
  skills_practiced?: string;
  location?: string;
  notes?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
}

export interface ExamRequestPayment {
  id: string;
  user_id: string;
  exam_type: ExamRequestType;
  national_id: string;
  amount?: number;
  payment_status: PaymentStatus;
  irembo_verified: boolean;
  irembo_response?: Record<string, unknown> | null;
  created_at: string;
}

export interface DriverRating {
  id: string;
  driver_id: string;
  student_id: string;
  rating: number;
  review?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  report_type: ReportType;
  description: string;
  status: ReportStatus;
  admin_id?: string | null;
  admin_note?: string;
  action_taken?: ReportAction;
  created_at: string;
  updated_at?: string;
}

export interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  comment: string;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ChatConversation {
  id: string;
  driver_id: string;
  student_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}
