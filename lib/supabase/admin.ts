import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client using the service role key.
 *
 * SECURITY: The service role key bypasses RLS and must NEVER be exposed to the
 * browser. This function is server-only — calling it in the browser throws.
 * The key (`SUPABASE_SERVICE_ROLE_KEY`) is intentionally not prefixed with
 * `NEXT_PUBLIC_` so Next.js never inlines it into client bundles.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() must only be called on the server. " +
        "It uses the SUPABASE_SERVICE_ROLE_KEY which is not available in the browser. " +
        "Move the calling code into a Server Action or Route Handler."
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
