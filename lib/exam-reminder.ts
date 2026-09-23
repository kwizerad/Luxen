import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin-client";

export interface ExamReminderResult {
  success: boolean;
  notifiedCount: number;
  skippedCount: number;
  cutoffTime: string;
  timestamp: string;
  notifiedAttemptIds?: string[];
  error?: string;
}

let lastReminderRun = 0;
let isReminderInProgress = false;

/**
 * Server-side task that identifies students with incomplete 'in_progress'
 * exam attempts older than thresholdMinutes (default: 45 minutes)
 * and sends them a targeted reminder notification encouraging them
 * to complete and submit or quit the exam.
 */
export async function notifyIncompleteExamAttempts(options: {
  thresholdMinutes?: number;
  maxAgeMinutes?: number;
  dryRun?: boolean;
} = {}): Promise<ExamReminderResult> {
  const thresholdMinutes = options.thresholdMinutes ?? 45;
  const maxAgeMinutes = options.maxAgeMinutes ?? 1440; // 24 hours ceiling
  const dryRun = options.dryRun ?? false;

  const nowMs = Date.now();
  const cutoffTime = new Date(nowMs - thresholdMinutes * 60 * 1000).toISOString();
  const maxAgeCutoff = new Date(nowMs - maxAgeMinutes * 60 * 1000).toISOString();
  const timestamp = new Date().toISOString();

  let notifiedCount = 0;
  let skippedCount = 0;
  const notifiedAttemptIds: string[] = [];

  if (!isSupabaseAdminConfigured()) {
    return {
      success: true,
      notifiedCount: 0,
      skippedCount: 0,
      cutoffTime,
      timestamp,
      notifiedAttemptIds: [],
    };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Find standard in-progress exam attempts older than threshold
    const candidateAttempts: Array<{
      id: string;
      user_id: string;
      category_name?: string;
      started_at?: string;
      created_at?: string;
      updated_at?: string;
      isModule?: boolean;
    }> = [];

    try {
      const { data: attempts, error: fetchErr } = await adminClient
        .from("exam_attempts")
        .select("id, user_id, category_name, started_at, updated_at, created_at, status")
        .eq("status", "in_progress")
        .not("user_id", "is", null);

      if (fetchErr) {
        console.warn("[ExamReminder] Error querying exam_attempts:", fetchErr.message);
      } else if (attempts && attempts.length > 0) {
        for (const att of attempts) {
          if (!att.user_id) continue;
          const lastActivity = att.updated_at || att.started_at || att.created_at;
          if (!lastActivity) continue;
          const activityTime = new Date(lastActivity).getTime();

          // Older than 45m and younger than 24h
          if (
            activityTime <= new Date(cutoffTime).getTime() &&
            activityTime >= new Date(maxAgeCutoff).getTime()
          ) {
            candidateAttempts.push({
              id: att.id,
              user_id: att.user_id,
              category_name: att.category_name,
              started_at: att.started_at,
              created_at: att.created_at,
              updated_at: att.updated_at,
              isModule: false,
            });
          }
        }
      }
    } catch (e) {
      console.error("[ExamReminder] Exception fetching exam_attempts:", e);
    }

    // 2. Find module in-progress exam attempts older than threshold
    try {
      const { data: moduleAttempts, error: fetchModErr } = await adminClient
        .from("module_exam_attempts")
        .select("id, user_id, module_title, created_at, updated_at, status")
        .eq("status", "in_progress")
        .not("user_id", "is", null);

      if (!fetchModErr && moduleAttempts && moduleAttempts.length > 0) {
        for (const modAtt of moduleAttempts) {
          if (!modAtt.user_id) continue;
          const lastActivity = modAtt.updated_at || modAtt.created_at;
          if (!lastActivity) continue;
          const activityTime = new Date(lastActivity).getTime();

          if (
            activityTime <= new Date(cutoffTime).getTime() &&
            activityTime >= new Date(maxAgeCutoff).getTime()
          ) {
            candidateAttempts.push({
              id: modAtt.id,
              user_id: modAtt.user_id,
              category_name: modAtt.module_title,
              created_at: modAtt.created_at,
              updated_at: modAtt.updated_at,
              isModule: true,
            });
          }
        }
      }
    } catch (e) {
      console.warn("[ExamReminder] Exception fetching module_exam_attempts:", e);
    }

    if (candidateAttempts.length === 0) {
      return {
        success: true,
        notifiedCount: 0,
        skippedCount: 0,
        cutoffTime,
        timestamp,
        notifiedAttemptIds: [],
      };
    }

    // 3. Prevent duplicate notifications: check which attempt IDs have already received a reminder
    const attemptIds = candidateAttempts.map((c) => c.id);
    const existingNotificationIds = new Set<string>();

    try {
      const { data: existingNotifs, error: notifCheckErr } = await adminClient
        .from("notifications")
        .select("related_entity_id")
        .in("related_entity_id", attemptIds)
        .eq("type", "reminder");

      if (notifCheckErr) {
        console.warn("[ExamReminder] Notice checking existing notifications:", notifCheckErr.message);
      } else if (existingNotifs && existingNotifs.length > 0) {
        for (const n of existingNotifs) {
          if (n.related_entity_id) {
            existingNotificationIds.add(n.related_entity_id);
          }
        }
      }
    } catch (e) {
      console.warn("[ExamReminder] Exception checking existing notifications:", e);
    }

    // 4. Generate notifications for attempts that haven't been reminded yet
    const notificationsToInsert: Array<Record<string, any>> = [];

    for (const attempt of candidateAttempts) {
      if (existingNotificationIds.has(attempt.id)) {
        skippedCount++;
        continue;
      }

      const examLabel = attempt.category_name ? `"${attempt.category_name}"` : "your current practice exam";
      const title = "Incomplete Exam Reminder / Wibuke Kurangiza Ikizamini";
      const message = `You have an exam attempt (${examLabel}) in progress that started over ${thresholdMinutes} minutes ago. Please return to complete and submit your answers, or quit if you are finished.`;
      const actionUrl = attempt.isModule ? "/module-journey" : "/dashboard/exam";

      notificationsToInsert.push({
        title,
        message,
        type: "reminder",
        priority: "urgent",
        target_user_id: attempt.user_id,
        target_role: null,
        sender_id: null,
        sender_name: "System",
        action_url: actionUrl,
        related_entity_type: attempt.isModule ? "module_exam_attempt" : "exam_attempt",
        related_entity_id: attempt.id,
        data: {
          attempt_id: attempt.id,
          category_name: attempt.category_name || "General Exam",
          exam_type: attempt.isModule ? "module" : "standard",
          started_at: attempt.started_at || attempt.created_at,
          reminder_type: "incomplete_exam_45m",
        },
        created_at: new Date().toISOString(),
      });

      notifiedAttemptIds.push(attempt.id);
    }

    // 5. Save notifications if not in dry-run mode
    if (!dryRun && notificationsToInsert.length > 0) {
      const { error: insertErr } = await adminClient
        .from("notifications")
        .insert(notificationsToInsert);

      if (insertErr) {
        console.error("[ExamReminder] Error inserting reminder notifications:", insertErr.message);
        return {
          success: false,
          notifiedCount: 0,
          skippedCount,
          cutoffTime,
          timestamp,
          error: insertErr.message,
        };
      }

      notifiedCount = notificationsToInsert.length;
      console.log(
        `[ExamReminder] Sent ${notifiedCount} incomplete exam reminder notification(s) for attempts older than ${thresholdMinutes}m`
      );
    } else if (dryRun) {
      notifiedCount = notificationsToInsert.length;
      console.log(`[ExamReminder] [DRY RUN] Would notify ${notifiedCount} candidate attempts.`);
    }

    return {
      success: true,
      notifiedCount,
      skippedCount,
      cutoffTime,
      timestamp,
      notifiedAttemptIds,
    };
  } catch (error: any) {
    console.error("[ExamReminder] Fatal error triggering exam reminders:", error);
    return {
      success: false,
      notifiedCount: 0,
      skippedCount,
      cutoffTime,
      timestamp,
      error: error?.message || "Unknown error",
    };
  }
}

/**
 * Opportunistic reminder runner with a throttle (default: runs at most once every 5 minutes)
 */
export function triggerOpportunisticExamReminders(minIntervalMinutes = 5): void {
  const now = Date.now();
  const intervalMs = minIntervalMinutes * 60 * 1000;

  if (now - lastReminderRun < intervalMs || isReminderInProgress) {
    return;
  }

  isReminderInProgress = true;
  lastReminderRun = now;

  notifyIncompleteExamAttempts({ thresholdMinutes: 45 })
    .catch((err) => {
      console.error("[ExamReminder] Background opportunistic reminder check failed:", err);
    })
    .finally(() => {
      isReminderInProgress = false;
    });
}

// Global server-side timer registration to avoid duplicate intervals in Node.js runtime
declare global {
  var __examReminderInterval: NodeJS.Timeout | undefined;
}

/**
 * Starts a recurring background interval job on the Node.js server.
 * Default interval: runs every 10 minutes to promptly notify students
 * whose attempts cross the 45-minute threshold.
 */
export function startExamReminderRecurringJob(intervalMinutes = 10): void {
  if (typeof window !== "undefined") return; // Server only

  if (globalThis.__examReminderInterval) {
    return; // Already initialized
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[ExamReminder] Initializing recurring reminder job every ${intervalMinutes}m`);

  // Run initial reminder check after a short warm-up delay (15s)
  setTimeout(() => {
    notifyIncompleteExamAttempts({ thresholdMinutes: 45 }).catch((err) => {
      console.error("[ExamReminder] Initial startup reminder check failed:", err);
    });
  }, 15000);

  // Set recurring interval
  globalThis.__examReminderInterval = setInterval(() => {
    notifyIncompleteExamAttempts({ thresholdMinutes: 45 }).catch((err) => {
      console.error("[ExamReminder] Recurring reminder check error:", err);
    });
  }, intervalMs);

  if (typeof globalThis.__examReminderInterval.unref === "function") {
    globalThis.__examReminderInterval.unref();
  }
}
