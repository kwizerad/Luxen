import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  return true;
}

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase/constants";

export async function createClient() {
  const cookieStore = await cookies();

  let isHttps = process.env.NODE_ENV === "production";
  try {
    const headerStore = await headers();
    const proto = headerStore.get("x-forwarded-proto") || "";
    const origin = headerStore.get("origin") || headerStore.get("referer") || "";
    if (proto.includes("https") || origin.startsWith("https://")) {
      isHttps = true;
    }
  } catch {
    // Ignore when called outside a request context
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookieOptions: {
        name: "navo-auth-token",
        sameSite: isHttps ? "none" : "lax",
        secure: isHttps,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                sameSite: isHttps ? "none" : (options?.sameSite || "lax"),
                secure: isHttps ? true : Boolean(options?.secure),
              }),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

function extractJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return typeof json?.sub === "string" && json.sub.length > 0 ? json.sub : null;
  } catch {
    return null;
  }
}

export async function getAuthUserFromRequest(
  request?: NextRequest,
  bodyAccessToken?: string | null
) {
  const authHeader = request?.headers.get("authorization");
  const headerToken = authHeader?.replace(/^bearer\s+/i, "").trim();
  const candidateTokens = [headerToken, bodyAccessToken?.trim()].filter(
    (t): t is string => Boolean(t && extractJwtSub(t))
  );

  for (const bearerToken of candidateTokens) {
    try {
      const adminSb = createAdminClient();
      const {
        data: { user: bearerUser },
      } = await adminSb.auth.getUser(bearerToken);
      if (bearerUser) return bearerUser;
    } catch {}
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch {}

  return null;
}

