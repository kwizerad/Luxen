"use client";

import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isPrimaryAdmin } from "@/lib/permissions";
import {
  getDeviceInfo,
  getCountryApproximate,
  clearOneTapDismissal,
} from "./google";

export interface GoogleSignInResult {
  user: User | null;
  session: { access_token?: string; refresh_token?: string; expires_at?: number } | null;
  error: Error | null;
}

export type SupportedLanguage = "English" | "Arabic" | "Kinyarwanda" | "French";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  English: "en",
  Arabic: "ar",
  Kinyarwanda: "rw",
  French: "fr",
};

const REVERSE_LANGUAGE_CODE_MAP: Record<string, SupportedLanguage> = {
  en: "English",
  ar: "Arabic",
  rw: "Kinyarwanda",
  fr: "French",
};

/**
 * Authenticate with Supabase using a Google ID token.
 * Supabase validates the token with Google on the server, so the credential
 * is never trusted blindly on the client.
 */
export async function signInWithGoogleToken(credential: string): Promise<GoogleSignInResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  });

  if (error) {
    // Log the full Supabase error so the root cause is visible in the console
    // (e.g. "Invalid claim: client_id" means the Google Client ID configured
    // in Supabase doesn't match NEXT_PUBLIC_GOOGLE_CLIENT_ID).
    console.error("[signInWithGoogleToken] Supabase rejected the ID token:", {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    return { user: null, session: null, error };
  }

  return {
    user: data.user,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        }
      : null,
    error: null,
  };
}

/**
 * Determine whether this is the user's first One Tap sign-in.
 *
 * A user is considered "new" for this flow when:
 *  - They have no prior login_count, AND
 *  - Their account was just created (created_at is very close to last_sign_in_at), AND
 *  - They have at most one identity (avoids treating linked accounts as new).
 */
export function isNewGoogleUser(user: User | null): boolean {
  if (!user) return true;

  const loginCount = Number(user.user_metadata?.login_count ?? 0);
  if (loginCount > 0) return false;

  const createdAt = user.created_at ? new Date(user.created_at).getTime() : null;
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : null;

  if (
    createdAt &&
    lastSignInAt &&
    Math.abs(lastSignInAt - createdAt) < 120_000 &&
    (!user.identities || user.identities.length <= 1)
  ) {
    return true;
  }

  return false;
}

/**
 * Build a stable language code from localStorage or fallback to English.
 */
function resolveLanguagePreference(): string {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem("navo-language") as SupportedLanguage | null;
  if (stored && LANGUAGE_CODE_MAP[stored]) {
    return LANGUAGE_CODE_MAP[stored];
  }

  const storedCode = window.localStorage.getItem("navo-language-code");
  if (storedCode && REVERSE_LANGUAGE_CODE_MAP[storedCode]) {
    return storedCode;
  }

  return "en";
}

/**
 * Build a stable theme preference from localStorage or fallback to light.
 */
function resolveThemePreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("navo-theme");
  return stored === "dark" ? "dark" : "light";
}

/**
 * Enrich a Google-authenticated user's metadata and sync it to Supabase.
 *
 * For new users, this creates a profile record via the database trigger
 * (sync_user_to_profile) and sets default role, language, and theme.
 * For returning users, it updates last login, activity, and device info.
 *
 * Account linking is handled by Supabase Auth when the Google email matches
 * an existing verified account.
 */
export async function syncGoogleUserProfile(user: User): Promise<{
  redirectPath: string;
  isNewUser: boolean;
}> {
  const supabase = createClient();
  const isNew = isNewGoogleUser(user);
  const now = new Date().toISOString();

  const deviceInfo = getDeviceInfo();
  const country = await getCountryApproximate();

  const baseMetadata: Record<string, unknown> = {
    last_active_at: now,
    last_login_device: deviceInfo,
    last_login_country: country,
    last_login_browser: deviceInfo.browser,
    last_login_os: deviceInfo.os,
  };

  if (isNew) {
    const languageCode = resolveLanguagePreference();
    const theme = resolveThemePreference();

    const role = isPrimaryAdmin(user) ? "Admin" : "Student";

    baseMetadata.role = role;
    baseMetadata.language = languageCode;
    baseMetadata.theme = theme;
    baseMetadata.created_at = user.created_at ?? now;
    baseMetadata.last_login_at = now;
    baseMetadata.login_count = 1;

    // Normalize name fields from Google's user info.
    const googleName =
      (user.user_metadata?.name as string) ||
      (user.user_metadata?.full_name as string) ||
      "";

    if (googleName && !(user.user_metadata?.full_name || user.user_metadata?.first_name)) {
      const parts = googleName.trim().split(/\s+/);
      baseMetadata.full_name = googleName.trim();
      baseMetadata.first_name = parts[0] || "";
      baseMetadata.last_name = parts.slice(1).join(" ") || "";
    }

    if (user.user_metadata?.given_name) {
      baseMetadata.first_name = user.user_metadata.given_name;
    }
    if (user.user_metadata?.family_name) {
      baseMetadata.last_name = user.user_metadata.family_name;
    }

    if (user.user_metadata?.picture && !user.user_metadata?.avatar_url) {
      baseMetadata.avatar_url = user.user_metadata.picture;
    }
  } else {
    const { data: freshUserData } = await supabase.auth.getUser();
    const freshUser = freshUserData?.user ?? user;
    const currentCount = Number(freshUser.user_metadata?.login_count ?? 0);

    baseMetadata.last_login_at = now;
    baseMetadata.login_count = currentCount + 1;

    // Preserve existing role if present.
    if (freshUser.user_metadata?.role) {
      baseMetadata.role = freshUser.user_metadata.role;
    }
  }

  const { error } = await supabase.auth.updateUser({ data: baseMetadata });
  if (error) {
    throw error;
  }

  clearOneTapDismissal();

  const redirectPath = getRedirectPathForUser(user, baseMetadata.role as string | undefined);
  return { redirectPath, isNewUser: isNew };
}

/**
 * Determine the post-login destination based on user role.
 */
export function getRedirectPathForUser(
  user: User,
  roleOverride?: string
): string {
  const effectiveRole = roleOverride || (user.user_metadata?.role as string);

  if (isPrimaryAdmin(user) || effectiveRole === "Admin") {
    return "/Admin";
  }

  return "/dashboard";
}
