-- ==============================================================================
-- PERMANENT AI AUDIO & TRANSLATION CACHE (WITH AUTO-UPDATE DETECTION)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.course_ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,                     -- Lesson ID or Topic ID
  target_language TEXT NOT NULL,               -- 'English' | 'French' | 'Kinyarwanda'
  feature_type TEXT NOT NULL,                  -- 'tts_audio' | 'translation' | 'plain_terms'
  content_hash TEXT NOT NULL,                  -- MD5 fingerprint of note text (detects edits automatically)
  cached_data JSONB NOT NULL,                  -- Payload (audio URL, translated text, bullet points)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, target_language, feature_type)
);

-- Fast lookup index
CREATE INDEX IF NOT EXISTS idx_course_ai_cache_lookup 
ON public.course_ai_cache (entity_id, target_language, feature_type, content_hash);

-- Enable Security
ALTER TABLE public.course_ai_cache ENABLE ROW LEVEL SECURITY;

-- Allow students to read cached audio/translations
DROP POLICY IF EXISTS "Public read cached course content" ON public.course_ai_cache;
CREATE POLICY "Public read cached course content" 
ON public.course_ai_cache FOR SELECT 
TO authenticated, anon 
USING (true);

-- Allow system/admin to save and update cache
DROP POLICY IF EXISTS "Admins and system can manage cache" ON public.course_ai_cache;
CREATE POLICY "Admins and system can manage cache" 
ON public.course_ai_cache FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
