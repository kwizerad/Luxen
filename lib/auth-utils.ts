import { createClient } from "./supabase/client";
import { isPrimaryAdmin, isStrictlyStudentEmail } from "./permissions";
import { secureApiPost, getMirroredSession, syncClientSessionMirror } from "./e2e-crypto";

let authRequestInProgress = false;
let pendingAuthRequests: Array<{
  resolve: (user: any) => void;
  reject: (error: any) => void;
}> = [];

let cachedUser: any = undefined;
let cachedUserTimestamp = 0;
const USER_CACHE_TTL_MS = 30 * 1000; // 30 seconds fast cache
let authListenerAttached = false;

export function clearCurrentUserCache() {
  cachedUser = undefined;
  cachedUserTimestamp = 0;
}

export function resetLandingLanguageForAdminLogout() {
  if (typeof window === "undefined") return;
  try {
    const isHttps = window.location.protocol === "https:";
    const sameSiteAttr = isHttps ? "SameSite=None; Secure" : "SameSite=Lax";
    localStorage.setItem("navo-language", "Kinyarwanda");
    localStorage.setItem("navo-language-code", "rw");
    localStorage.setItem("luxen_lang", "rw");
    localStorage.removeItem("navo-language-user-set");
    localStorage.removeItem("navo-language-user-confirmed");
    document.cookie = `navo_lang=rw; path=/; max-age=31536000; ${sameSiteAttr}`;
    document.cookie = `navo_lang_user_set=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${sameSiteAttr}`;
    sessionStorage.removeItem("navo-is-admin");
    sessionStorage.removeItem("navo-auth-token");
    localStorage.removeItem("navo-auth-token");
    sessionStorage.removeItem("navo-session-mirror");
    localStorage.removeItem("navo-session-mirror");
  } catch {
    // Ignore storage quota or security errors
  }
  clearCurrentUserCache();
}

function ensureAuthCacheListener() {
  if (authListenerAttached || typeof window === "undefined") return;
  authListenerAttached = true;
  try {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "TOKEN_REFRESHED"
      ) {
        clearCurrentUserCache();
      }
    });
  } catch {
    // Ignore listener setup errors
  }
}

export async function getCurrentUser(retryCount = 0, forceRefresh = false): Promise<any> {
  ensureAuthCacheListener();

  // Return cached user immediately if valid and not forcing refresh
  if (
    !forceRefresh &&
    retryCount === 0 &&
    cachedUser !== undefined &&
    Date.now() - cachedUserTimestamp < USER_CACHE_TTL_MS
  ) {
    return cachedUser;
  }

  // If there's already a request in progress, queue this one
  if (authRequestInProgress) {
    return new Promise((resolve, reject) => {
      pendingAuthRequests.push({ resolve, reject });
    });
  }

  authRequestInProgress = true;

  try {
    const supabase = createClient();
    let { data: { user }, error } = await supabase.auth.getUser();

    // Normal unauthenticated state: try recovering from getSession(), mirrored session, or server cookie session
    const isMissingSession = error && (
      (error as any).message?.includes("Auth session missing") ||
      (error as any).name === "AuthSessionMissingError"
    );

    if ((!user && !error) || isMissingSession) {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        if (sessData?.session?.user) {
          user = sessData.session.user;
          error = null;
          syncClientSessionMirror(sessData.session);
        } else {
          const mirrored = getMirroredSession();
          if (mirrored?.access_token && mirrored?.refresh_token) {
            const { data: restored } = await supabase.auth.setSession({
              access_token: mirrored.access_token,
              refresh_token: mirrored.refresh_token,
            });
            if (restored?.user) {
              user = restored.user;
              error = null;
              if (restored.session) syncClientSessionMirror(restored.session);
            }
          }
        }
      } catch {}

      if (!user && typeof window !== "undefined") {
        try {
          const { ok, data: secData } = await secureApiPost("/api/e2e", {
            action: "get_secure_user",
          });
          if (ok && secData?.user?.id) {
            user = secData.user;
            error = null;
          }
        } catch {}
      }

      if (!user && isMissingSession) {
        const pending = [...pendingAuthRequests];
        pendingAuthRequests = [];
        pending.forEach(({ resolve }) => resolve(null));
        return null;
      }
    }

    // Handle auth lock error by retrying
    const isLockError = error && typeof error === 'object' && 'message' in error && (
      (error as any).message?.includes("lock") ||
      (error as any).message?.includes("stoke") ||
      (error as any).message?.includes("released")
    );

    if (isLockError && retryCount < 3) {
      authRequestInProgress = false;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
      return getCurrentUser(retryCount + 1);
    }

    if (error && !user) {
      throw error;
    }

    if (user) {
      try {
        let profile: any = null;
        if (typeof window !== "undefined") {
          const { ok, data: secData } = await secureApiPost("/api/e2e", {
            action: "get_secure_user",
          });
          if (ok && secData?.profile) {
            profile = secData.profile;
          }
        }
        if (!profile) {
          const { data: fallbackProfile } = await supabase
            .from("user_profiles")
            .select("avatar_url, full_name, first_name, last_name, username, role, national_id, birthdate, gender, nationality")
            .eq("id", user.id)
            .maybeSingle();
          profile = fallbackProfile;
        }

        const isStrictlyStudent = isStrictlyStudentEmail(user.email);
        const isAdminUser =
          !isStrictlyStudent &&
          (profile?.role === "Admin" ||
            profile?.role === "admin" ||
            user.email === "navo@admin.jn");

        let bestAvatar =
          profile?.avatar_url ||
          user.user_metadata?.avatar_url ||
          user.user_metadata?.google_avatar_url ||
          user.user_metadata?.picture ||
          null;

        // If admin has an ID photo from a citizen lookup, ignore it
        if (isAdminUser && bestAvatar && (
          bestAvatar.includes("irembo.gov.rw") ||
          bestAvatar.includes("nida.gov.rw") ||
          bestAvatar.includes("citizen-photos")
        )) {
          bestAvatar = user.user_metadata?.google_avatar_url || user.user_metadata?.picture || null;
        }

        const resolvedRole = isStrictlyStudent
          ? "Student"
          : isPrimaryAdmin(user)
          ? "Admin"
          : profile?.role || user.user_metadata?.role || "Student";

        if (isStrictlyStudent && (profile?.role === "Admin" || user.user_metadata?.role === "Admin")) {
          supabase.from("user_profiles").update({ role: "Student" }).eq("id", user.id).then(() => {});
          supabase.auth.updateUser({ data: { role: "Student", permissions: null } }).catch(() => {});
        }

        (user as any).role = resolvedRole;
        (user as any).avatar_url = bestAvatar;
        user.user_metadata = {
          ...user.user_metadata,
          ...(bestAvatar ? { avatar_url: bestAvatar } : {}),
          ...(profile?.full_name ? { full_name: profile.full_name } : {}),
          ...(profile?.first_name ? { first_name: profile.first_name } : {}),
          ...(profile?.last_name ? { last_name: profile.last_name } : {}),
          ...(profile?.username ? { username: profile.username } : {}),
          ...(profile?.national_id && !isAdminUser ? { national_id: profile.national_id } : {}),
          role: resolvedRole,
          ...(profile?.birthdate ? { birthdate: profile.birthdate } : {}),
          ...(profile?.gender ? { gender: profile.gender } : {}),
          ...(profile?.nationality ? { nationality: profile.nationality } : {}),
        };

        // If student user has a national ID or ID-based email but no avatar yet, trigger a background sync
        const hasId = profile?.national_id || user.user_metadata?.national_id || user.email?.includes("@nid.rw");
        if (!isAdminUser && !bestAvatar && hasId && typeof window !== "undefined") {
          fetch("/api/user/sync-id-avatar", { method: "POST" })
            .then((r) => r.json())
            .then((res) => {
              if (res?.avatar_url) {
                (user as any).avatar_url = res.avatar_url;
                if (user.user_metadata) {
                  user.user_metadata.avatar_url = res.avatar_url;
                }
              }
            })
            .catch(() => {});
        }
      } catch (profileErr) {
        console.warn("Could not enrich user profile:", profileErr);
      }
    }

    if (user) {
      cachedUser = user;
      cachedUserTimestamp = Date.now();
    } else {
      cachedUser = undefined;
      cachedUserTimestamp = 0;
    }

    // Resolve all pending requests with the same result
    const pending = [...pendingAuthRequests];
    pendingAuthRequests = [];
    pending.forEach(({ resolve }) => resolve(user));
    
    return user;
  } catch (error: any) {
    const isMissingSession = error && (
      error.message?.includes("Auth session missing") ||
      error.name === "AuthSessionMissingError"
    );

    if (isMissingSession) {
      const pending = [...pendingAuthRequests];
      pendingAuthRequests = [];
      pending.forEach(({ resolve }) => resolve(null));
      return null;
    }

    console.error("Get current user error:", error);
    
    const isLockError = error && typeof error === 'object' && 'message' in error && (
      error.message?.includes("lock") ||
      error.message?.includes("stoke") ||
      error.message?.includes("released")
    );

    if (isLockError && retryCount < 3) {
      console.log(`Auth lock in catch block, retrying...`, retryCount + 1);
      authRequestInProgress = false;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
      return getCurrentUser(retryCount + 1);
    }

    // Reject all pending requests with the same error
    const pending = [...pendingAuthRequests];
    pendingAuthRequests = [];
    pending.forEach(({ reject }) => reject(error));
    
    throw error;
  } finally {
    authRequestInProgress = false;
  }
}

export async function getCurrentUserWithTimeout(timeoutMs = 5000): Promise<any> {
  return Promise.race([
    getCurrentUser(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth request timeout')), timeoutMs)
    )
  ]);
}
