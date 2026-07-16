import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';
  clientInstance = createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        flowType: "implicit",
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: "navo-auth-token",
      },
      cookieOptions: {
        name: "navo-auth-token",
        priority: "high",
        sameSite: "lax",
        secure: false,
      },
    }
  );

  return clientInstance;
}
