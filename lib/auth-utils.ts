import { createClient } from "./supabase/client";

let authRequestInProgress = false;
let pendingAuthRequests: Array<{
  resolve: (user: any) => void;
  reject: (error: any) => void;
}> = [];

export async function getCurrentUser(retryCount = 0): Promise<any> {
  // If there's already a request in progress, queue this one
  if (authRequestInProgress) {
    return new Promise((resolve, reject) => {
      pendingAuthRequests.push({ resolve, reject });
    });
  }

  authRequestInProgress = true;

  try {
    console.log(`Getting current user (attempt ${retryCount + 1})`);
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    // Normal unauthenticated state: no session exists
    const isMissingSession = error && (
      (error as any).message?.includes("Auth session missing") ||
      (error as any).name === "AuthSessionMissingError"
    );

    if (isMissingSession) {
      const pending = [...pendingAuthRequests];
      pendingAuthRequests = [];
      pending.forEach(({ resolve }) => resolve(null));
      return null;
    }

    // Handle auth lock error by retrying
    const isLockError = error && typeof error === 'object' && 'message' in error && (
      (error as any).message?.includes("lock") ||
      (error as any).message?.includes("stoke") ||
      (error as any).message?.includes("released")
    );

    if (isLockError && retryCount < 3) {
      console.log(`Auth lock detected (${(error as any).message}), retrying...`, retryCount + 1);
      authRequestInProgress = false;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
      return getCurrentUser(retryCount + 1);
    }

    if (error) {
      console.error("Auth error:", error);
      throw error;
    }

    if (user) {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("avatar_url, full_name, first_name, last_name, username, role, national_id, birthdate, gender, nationality")
          .eq("id", user.id)
          .maybeSingle();

        const isAdminUser =
          profile?.role === "Admin" ||
          profile?.role === "admin" ||
          user.email === "kwizeradiementwari@gmail.com" ||
          user.email === "navo@admin.jn";

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

        (user as any).avatar_url = bestAvatar;
        user.user_metadata = {
          ...user.user_metadata,
          ...(bestAvatar ? { avatar_url: bestAvatar } : {}),
          ...(profile?.full_name ? { full_name: profile.full_name } : {}),
          ...(profile?.first_name ? { first_name: profile.first_name } : {}),
          ...(profile?.last_name ? { last_name: profile.last_name } : {}),
          ...(profile?.username ? { username: profile.username } : {}),
          ...(profile?.national_id && !isAdminUser ? { national_id: profile.national_id } : {}),
          ...(profile?.role ? { role: profile.role } : {}),
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

    console.log("User retrieved successfully:", user?.email);
    
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
