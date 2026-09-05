#!/usr/bin/env node

/**
 * Standalone script to notify students who have in-progress exam attempts older than 45 minutes.
 *
 * Usage:
 *   node scripts/remind-incomplete-exams.js
 *   node scripts/remind-incomplete-exams.js --threshold=45
 *   node scripts/remind-incomplete-exams.js --dry-run
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
} catch {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));
}

const args = process.argv.slice(2);
let thresholdMinutes = 45;
let isDryRun = false;

for (const arg of args) {
  if (arg.startsWith("--threshold=") || arg.startsWith("--threshold-minutes=")) {
    const val = parseInt(arg.split("=")[1], 10);
    if (!isNaN(val) && val > 0) thresholdMinutes = val;
  } else if (arg === "--dry-run") {
    isDryRun = true;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes("placeholder") || serviceRoleKey.includes("placeholder")) {
  console.log("[ExamReminderScript] Supabase credentials not configured. Skipping execution gracefully.");
  process.exit(0);
}

const { createClient } = require("@supabase/supabase-js");
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const nowMs = Date.now();
  const cutoffTime = new Date(nowMs - thresholdMinutes * 60 * 1000).toISOString();
  const maxAgeCutoff = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  console.log(`[ExamReminderScript] Checking for in-progress attempts older than ${thresholdMinutes}m (cutoff: ${cutoffTime})...`);

  // 1. Fetch candidates from exam_attempts
  const candidateAttempts = [];
  const { data: attempts, error: fetchErr } = await adminClient
    .from("exam_attempts")
    .select("id, user_id, category_name, started_at, updated_at, created_at, status")
    .eq("status", "in_progress")
    .not("user_id", "is", null);

  if (fetchErr) {
    console.error("[ExamReminderScript] Error querying exam_attempts:", fetchErr.message);
  } else if (attempts && attempts.length > 0) {
    for (const att of attempts) {
      if (!att.user_id) continue;
      const lastActivity = att.updated_at || att.started_at || att.created_at;
      if (!lastActivity) continue;
      const activityTime = new Date(lastActivity).getTime();

      if (activityTime <= new Date(cutoffTime).getTime() && activityTime >= new Date(maxAgeCutoff).getTime()) {
        candidateAttempts.push({
          id: att.id,
          user_id: att.user_id,
          category_name: att.category_name,
          started_at: att.started_at,
          created_at: att.created_at,
          isModule: false,
        });
      }
    }
  }

  // 2. Fetch candidates from module_exam_attempts
  try {
    const { data: moduleAttempts } = await adminClient
      .from("module_exam_attempts")
      .select("id, user_id, module_title, created_at, updated_at, status")
      .eq("status", "in_progress")
      .not("user_id", "is", null);

    if (moduleAttempts && moduleAttempts.length > 0) {
      for (const modAtt of moduleAttempts) {
        if (!modAtt.user_id) continue;
        const lastActivity = modAtt.updated_at || modAtt.created_at;
        if (!lastActivity) continue;
        const activityTime = new Date(lastActivity).getTime();

        if (activityTime <= new Date(cutoffTime).getTime() && activityTime >= new Date(maxAgeCutoff).getTime()) {
          candidateAttempts.push({
            id: modAtt.id,
            user_id: modAtt.user_id,
            category_name: modAtt.module_title,
            created_at: modAtt.created_at,
            isModule: true,
          });
        }
      }
    }
  } catch (e) {
    // optional module table
  }

  console.log(`[ExamReminderScript] Found ${candidateAttempts.length} qualifying candidate attempt(s).`);

  if (candidateAttempts.length === 0) {
    console.log("[ExamReminderScript] No reminders needed.");
    return;
  }

  // 3. Filter out already-notified attempts
  const attemptIds = candidateAttempts.map((c) => c.id);
  const existingNotificationIds = new Set();

  try {
    const { data: existingNotifs } = await adminClient
      .from("notifications")
      .select("related_entity_id")
      .in("related_entity_id", attemptIds)
      .eq("type", "reminder");

    if (existingNotifs && existingNotifs.length > 0) {
      for (const n of existingNotifs) {
        if (n.related_entity_id) existingNotificationIds.add(n.related_entity_id);
      }
    }
  } catch (e) {
    console.warn("[ExamReminderScript] Notice checking existing notifications:", e.message);
  }

  const notificationsToInsert = [];
  for (const attempt of candidateAttempts) {
    if (existingNotificationIds.has(attempt.id)) {
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
  }

  if (notificationsToInsert.length === 0) {
    console.log(`[ExamReminderScript] All ${candidateAttempts.length} candidate attempts were already notified.`);
    return;
  }

  if (isDryRun) {
    console.log(`[ExamReminderScript] [DRY RUN] Would insert ${notificationsToInsert.length} notifications.`);
    return;
  }

  const { error: insertErr } = await adminClient.from("notifications").insert(notificationsToInsert);
  if (insertErr) {
    console.error("[ExamReminderScript] Error inserting notifications:", insertErr.message);
    process.exit(1);
  }

  console.log(`[ExamReminderScript] Successfully sent ${notificationsToInsert.length} reminder notification(s).`);
}

run().catch((err) => {
  console.error("[ExamReminderScript] Fatal error:", err);
  process.exit(1);
});
