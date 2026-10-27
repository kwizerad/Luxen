// Supabase Project Connection Constants
// Provides fallback constants so client and server code never target non-existent placeholder domains.

export const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mdjvgffzfdxjjnfrrnor.supabase.co";

export const DEFAULT_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kanZnZmZ6ZmR4ampuZnJybm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTA3MzcsImV4cCI6MjA5Mjc2NjczN30.UQXrgMTHrle08zKIIQnvJEG6hGNHRZ6DFycE8feim14";

export const DEFAULT_SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kanZnZmZ6ZmR4ampuZnJybm9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE5MDczNywiZXhwIjoyMDkyNzY2NzM3fQ.1plpCbAHUjRAMwwiiJZdY8nfWQ7B39F2WkEqRgJeAqY";

