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

    // 3. Clean up expired unstarted pending exam_challenges where no one took the exam
    // Deletes them and leaves a persistent notification for creator and invitees with "Done at [time]"
    try {
      const now = Date.now();
      const waitingWindowMs = 60 * 1000; // 60 seconds waiting window default
      const windowCutoff = new Date(now - waitingWindowMs).toISOString();

      const { data: pendingChallenges, error: chalErr } = await adminClient
        .from("exam_challenges")
        .select("id, creator_id, category_name, created_at, status")
        .eq("status", "pending")
        .lt("created_at", windowCutoff);

      if (!chalErr && pendingChallenges && pendingChallenges.length > 0) {
        for (const challenge of pendingChallenges) {
          try {
            // Check participants for this challenge
            const { data: participants } = await adminClient
              .from("exam_challenge_participants")
              .select("user_id, status, exam_attempt_id, score")
              .eq("challenge_id", challenge.id);

            const hasActiveTakers = (participants || []).some(
              (p) => p.status === "in_progress" || p.status === "completed" || p.score !== null || p.exam_attempt_id !== null
            );

            // If no one took the exam, delete the challenge and leave a notification
            if (!hasActiveTakers) {
              const doneAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ")";
              const allUserIds = Array.from(
                new Set([
                  challenge.creator_id,
                  ...(participants || []).map((p) => p.user_id),
                ].filter(Boolean))
              );

              // Leave notification for creator and invited participants
              if (allUserIds.length > 0) {
                const notifRows = allUserIds.map((uid) => ({
                  target_user_id: uid,
                  type: "warning",
                  title: "Group Exam Cancelled",
                  message: `The group exam for "${challenge.category_name || "Driving Knowledge"}" was automatically cancelled and removed because no one took or joined the exam before the waiting time expired. Done at ${doneAt}.`,
                  data: {
                    challenge_id: challenge.id,
                    category_name: challenge.category_name,
                    action: "auto_deleted_expired_exam",
                    done_at: doneAt,
                  },
                  sender_name: "System",
                  action_url: "/dashboard#classmates",
                }));

                await adminClient.from("notifications").insert(notifRows);
              }

              // Delete participants and challenge
              await adminClient
                .from("exam_challenge_participants")
                .delete()
                .eq("challenge_id", challenge.id);

              await adminClient
                .from("exam_challenges")
                .delete()
                .eq("id", challenge.id);

              deletedChallengesCount++;
              console.log(
                `[ExamCleanup] Auto-deleted expired unstarted challenge ${challenge.id} ("${challenge.category_name}"). Done at ${doneAt}. Notified ${allUserIds.length} users.`
              );
            }
          } catch (chalErr) {
            console.error(`[ExamCleanup] Failed to process expired challenge ${challenge.id}:`, chalErr);
          }
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
