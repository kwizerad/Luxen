-- Remove all courses, lessons, and quizzes tables from Navo database
-- (Courses, lessons, quizzes, and questions will be served from the external Supabase database)

DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;

DROP TABLE IF EXISTS public.student_lesson_progress CASCADE;
DROP TABLE IF EXISTS public.student_module_progress CASCADE;
DROP TABLE IF EXISTS public.module_exam_attempts CASCADE;
DROP TABLE IF EXISTS public.module_exam_questions CASCADE;
DROP TABLE IF EXISTS public.module_exam_settings CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.course_modules CASCADE;
DROP TABLE IF EXISTS public.course_languages CASCADE;
DROP TABLE IF EXISTS public.course_ai_cache CASCADE;

DELETE FROM public.system_config
WHERE key IN ('external_courses_quizzes', 'external_courses_metadata');
