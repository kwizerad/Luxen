import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

export interface CleanupResult {
  success: boolean;
  deletedAttemptsCount: number;
  deletedModuleAttemptsCount: number;
  deletedChallengesCount: number;
  cutoffTime: string;
  timestamp: string;
  error?: string;
}

let lastCleanupRun = 0;
let isCleanupInProgress = false;

/**
 * Automatically purges exam attempts that have remained in an 'in_progress'
 * state for more than maxAgeMinutes (default: 60 minutes) without activity.
 */
export async function cleanupStaleExamAttempts(options: {
  maxAgeMinutes?: number;
} = {}): Promise<CleanupResult> {
  const maxAgeMinutes = options.maxAgeMinutes ?? 60;
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  const timestamp = new Date().toISOString();

  let deletedAttemptsCount = 0;
  let deletedModuleAttemptsCount = 0;
  let deletedChallengesCount = 0;

  if (!isSupabaseAdminConfigured()) {
    return {
      success: true,
      deletedAttemptsCount: 0,
      deletedModuleAttemptsCount: 0,
      deletedChallengesCount: 0,
      cutoffTime,
      timestamp,
    };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Clean up stale standard exam_attempts
    try {
      const { data: inProgressAttempts, error: fetchErr } = await adminClient
        .from("exam_attempts")
        .select("id, started_at, updated_at, created_at, status")
        .eq("status", "in_progress");

      if (fetchErr) {
        console.warn("[ExamCleanup] Note fetching in-progress exam_attempts:", fetchErr.message);
      } else if (inProgressAttempts && inProgressAttempts.length > 0) {
        const staleAttemptIds = inProgressAttempts
          .filter((att) => {
            const lastActivity = att.updated_at || att.started_at || att.created_at;
            if (!lastActivity) return true;
            return new Date(lastActivity).getTime() <= new Date(cutoffTime).getTime();
          })
          .map((att) => att.id);

        if (staleAttemptIds.length > 0) {
          const { error: deleteErr } = await adminClient
            .from("exam_attempts")
            .delete()
            .in("id", staleAttemptIds);

          if (deleteErr) {
            console.error("[ExamCleanup] Error deleting stale exam_attempts:", deleteErr.message);
          } else {
            deletedAttemptsCount = staleAttemptIds.length;
            console.log(
              `[ExamCleanup] Purged ${deletedAttemptsCount} stale in-progress exam attempt(s) older than ${maxAgeMinutes}m`
            );
          }
        }
      }
    } catch (e) {
      console.error("[ExamCleanup] Exception during exam_attempts cleanup:", e);
    }

    // 2. Clean up stale module_exam_attempts
    try {
      const { data: inProgressModuleAttempts, error: fetchModErr } = await adminClient
        .from("module_exam_attempts")
        .select("id, created_at, updated_at, status")
        .eq("status", "in_progress");

      if (!fetchModErr && inProgressModuleAttempts && inProgressModuleAttempts.length > 0) {
        const staleModuleIds = inProgressModuleAttempts
          .filter((att) => {
            const lastActivity = att.updated_at || att.created_at;
            if (!lastActivity) return true;
            return new Date(lastActivity).getTime() <= new Date(cutoffTime).getTime();
          })
          .map((att) => att.id);

        if (staleModuleIds.length > 0) {
          const { error: deleteModErr } = await adminClient
            .from("module_exam_attempts")
            .delete()
            .in("id", staleModuleIds);

          if (!deleteModErr) {
            deletedModuleAttemptsCount = staleModuleIds.length;
            console.log(
              `[ExamCleanup] Purged ${deletedModuleAttemptsCount} stale in-progress module exam attempt(s)`
            );
          }
        }
      }
    } catch (e) {
      console.warn("[ExamCleanup] module_exam_attempts cleanup notice:", e);
    }

    // 3. Clean up stale exam_challenges and participants older than maxAgeMinutes
    try {
      const { data: staleChallenges } = await adminClient
        .from("exam_challenges")
        .select("id")
        .lt("created_at", cutoffTime);

      if (staleChallenges && staleChallenges.length > 0) {
        const staleIds = staleChallenges.map((s) => s.id);
        await adminClient.from("exam_challenge_participants").delete().in("challenge_id", staleIds);
        const { error: challengeDeleteErr } = await adminClient
          .from("exam_challenges")
          .delete()
          .in("id", staleIds);

        if (!challengeDeleteErr) {
          deletedChallengesCount = staleIds.length;
        }
      }
    } catch (e) {
      console.warn("[ExamCleanup] challenges cleanup notice:", e);
    }

    return {
      success: true,
      deletedAttemptsCount,
      deletedModuleAttemptsCount,
      deletedChallengesCount,
      cutoffTime,
      timestamp,
    };
  } catch (error: any) {
    console.error("[ExamCleanup] Fatal error running cleanup:", error);
    return {
      success: false,
      deletedAttemptsCount,
      deletedModuleAttemptsCount,
      deletedChallengesCount,
      cutoffTime,
      timestamp,
      error: error?.message || "Unknown error",
    };
  }
}

/**
 * Opportunistic cleanup runner with a throttle (default: runs at most once every 10 minutes)
 * to avoid excessive queries during normal application usage.
 */
export function triggerOpportunisticExamCleanup(minIntervalMinutes = 10): void {
  const now = Date.now();
  const intervalMs = minIntervalMinutes * 60 * 1000;

  if (now - lastCleanupRun < intervalMs || isCleanupInProgress) {
    return;
  }

  isCleanupInProgress = true;
  lastCleanupRun = now;

  cleanupStaleExamAttempts({ maxAgeMinutes: 60 })
    .catch((err) => {
      console.error("[ExamCleanup] Background opportunistic cleanup failed:", err);
    })
    .finally(() => {
      isCleanupInProgress = false;
    });
}

// Global server-side timer registration to avoid duplicate intervals in Node.js runtime
declare global {
  var __examCleanupInterval: NodeJS.Timeout | undefined;
}

/**
 * Starts a recurring background interval job on the Node.js server.
 * Default interval: runs every 15 minutes.
 */
export function startExamCleanupRecurringJob(intervalMinutes = 15): void {
  if (typeof window !== "undefined") return; // Server only

  if (globalThis.__examCleanupInterval) {
    return; // Already initialized
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[ExamCleanup] Initializing recurring cleanup job every ${intervalMinutes}m`);

  // Run initial cleanup after a short warm-up delay (10s)
  setTimeout(() => {
    cleanupStaleExamAttempts({ maxAgeMinutes: 60 }).catch((err) => {
      console.error("[ExamCleanup] Initial startup cleanup run failed:", err);
    });
  }, 10000);

  // Set recurring interval
  globalThis.__examCleanupInterval = setInterval(() => {
    cleanupStaleExamAttempts({ maxAgeMinutes: 60 }).catch((err) => {
      console.error("[ExamCleanup] Recurring interval cleanup failed:", err);
    });
  }, intervalMs);

  // Allow process to exit cleanly if needed
  if (globalThis.__examCleanupInterval.unref) {
    globalThis.__examCleanupInterval.unref();
  }
}
