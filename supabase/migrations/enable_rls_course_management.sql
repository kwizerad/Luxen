-- Re-enable RLS for course management tables
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_attempts ENABLE ROW LEVEL SECURITY;
