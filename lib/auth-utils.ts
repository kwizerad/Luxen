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

    // Handle auth lock error by retrying
    const isLockError = error && typeof error === 'object' && 'message' in error && (
      (error as any).message?.includes("lock") ||
      (error as any).message?.includes("stoke") ||
      (error as any).message?.includes("released") ||
      (error as any).message?.includes("stoke")
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

    console.log("User retrieved successfully:", user?.email);
    
    // Resolve all pending requests with the same result
    const pending = [...pendingAuthRequests];
    pendingAuthRequests = [];
    pending.forEach(({ resolve }) => resolve(user));
    
    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    
    const isLockError = error && typeof error === 'object' && 'message' in error && (
      (error as any).message?.includes("lock") ||
      (error as any).message?.includes("stoke") ||
      (error as any).message?.includes("released") ||
      (error as any).message?.includes("stoke")
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
