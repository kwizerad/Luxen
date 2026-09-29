-- Temporarily disable RLS for course management tables to test
ALTER TABLE course_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_module_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_lesson_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE module_exam_attempts DISABLE ROW LEVEL SECURITY;
