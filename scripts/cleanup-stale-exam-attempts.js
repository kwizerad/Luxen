#!/usr/bin/env node

/**
 * Standalone cleanup script for removing stale in-progress exam attempts (> 60 minutes without activity).
 *
 * Usage:
 *   node scripts/cleanup-stale-exam-attempts.js
 *   node scripts/cleanup-stale-exam-attempts.js --max-age=60
 *   node scripts/cleanup-stale-exam-attempts.js --dry-run
 */

const fs = require("fs");
const path = require("path");

// Load .env and .env.local with zero-dependency fallback
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

// Parse CLI arguments
const args = process.argv.slice(2);
let maxAgeMinutes = 60;
let isDryRun = false;

for (const arg of args) {
  if (arg.startsWith("--max-age=")) {
    const val = parseInt(arg.split("=")[1], 10);
    if (!isNaN(val) && val > 0) maxAgeMinutes = val;
  } else if (arg === "--dry-run") {
    isDryRun = true;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[Cleanup Script Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

// Helper for direct PostgREST calls if @supabase/supabase-js is not installed in local shell
async function fetchSupabase(endpoint, options = {}) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostgREST error (${res.status}): ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function runCleanup() {
  const cutoffDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  console.log("=".repeat(70));
  console.log(`[Exam Attempt Cleanup] Started at ${new Date().toISOString()}`);
  console.log(`- Max Age Threshold: ${maxAgeMinutes} minutes (Cutoff: ${cutoffIso})`);
  console.log(`- Mode: ${isDryRun ? "DRY RUN (No deletions)" : "LIVE EXECUTION"}`);
  console.log("=".repeat(70));

  let totalDeletedAttempts = 0;
  let totalDeletedModuleAttempts = 0;
  let totalDeletedChallenges = 0;

  // 1. Clean up stale standard exam_attempts
  try {
    const attempts = await fetchSupabase("exam_attempts?status=eq.in_progress&select=id,started_at,updated_at,created_at,status");

    if (Array.isArray(attempts) && attempts.length > 0) {
      const stale = attempts.filter((att) => {
        const lastActivity = att.updated_at || att.started_at || att.created_at;
        if (!lastActivity) return true;
        return new Date(lastActivity).getTime() <= cutoffDate.getTime();
      });

      console.log(`Found ${attempts.length} total in-progress attempts; ${stale.length} are stale (> ${maxAgeMinutes}m old).`);

      if (stale.length > 0) {
        const staleIds = stale.map((s) => s.id);
        if (isDryRun) {
          console.log(`[DRY RUN] Would delete ${staleIds.length} exam_attempts:`, staleIds);
        } else {
          // PostgREST delete with 'in.(id1,id2,...)'
          const idFilter = `in.(${staleIds.join(",")})`;
          const deleted = await fetchSupabase(`exam_attempts?id=${idFilter}`, {
            method: "DELETE",
          });
          totalDeletedAttempts = Array.isArray(deleted) ? deleted.length : staleIds.length;
          console.log(`Successfully deleted ${totalDeletedAttempts} stale in-progress exam attempts.`);
        }
      }
    } else {
      console.log("No in-progress exam_attempts found.");
    }
  } catch (err) {
    console.error("Notice during exam_attempts cleanup:", err.message);
  }

  // 2. Clean up stale module_exam_attempts
  try {
    const modAttempts = await fetchSupabase("module_exam_attempts?status=eq.in_progress&select=id,created_at,updated_at,status");
    if (Array.isArray(modAttempts) && modAttempts.length > 0) {
      const staleMod = modAttempts.filter((att) => {
        const lastActivity = att.updated_at || att.created_at;
        if (!lastActivity) return true;
        return new Date(lastActivity).getTime() <= cutoffDate.getTime();
      });

      if (staleMod.length > 0) {
        const staleModIds = staleMod.map((s) => s.id);
        if (isDryRun) {
          console.log(`[DRY RUN] Would delete ${staleModIds.length} module_exam_attempts:`, staleModIds);
        } else {
          const idFilter = `in.(${staleModIds.join(",")})`;
          const deleted = await fetchSupabase(`module_exam_attempts?id=${idFilter}`, {
            method: "DELETE",
          });
          totalDeletedModuleAttempts = Array.isArray(deleted) ? deleted.length : staleModIds.length;
          console.log(`Successfully deleted ${totalDeletedModuleAttempts} stale module_exam_attempts.`);
        }
      }
    }
  } catch {
    // optional table
  }

  // 3. Clean up stale exam_challenges
  try {
    const challenges = await fetchSupabase(`exam_challenges?created_at=lt.${cutoffIso}&select=id`);
    if (Array.isArray(challenges) && challenges.length > 0) {
      const staleIds = challenges.map((s) => s.id);
      if (isDryRun) {
        console.log(`[DRY RUN] Would delete ${staleIds.length} stale challenges.`);
      } else {
        const idFilter = `in.(${staleIds.join(",")})`;
        await fetchSupabase(`exam_challenge_participants?challenge_id=${idFilter}`, { method: "DELETE" }).catch(() => {});
        const deleted = await fetchSupabase(`exam_challenges?id=${idFilter}`, { method: "DELETE" });
        totalDeletedChallenges = Array.isArray(deleted) ? deleted.length : staleIds.length;
        console.log(`Successfully deleted ${totalDeletedChallenges} stale group exam challenges.`);
      }
    }
  } catch {
    // optional
  }

  console.log("=".repeat(70));
  console.log("[Exam Attempt Cleanup Summary]");
  console.log(`- Stale Standard Exam Attempts Removed: ${totalDeletedAttempts}`);
  console.log(`- Stale Module Exam Attempts Removed:   ${totalDeletedModuleAttempts}`);
  console.log(`- Stale Group Challenges Removed:       ${totalDeletedChallenges}`);
  console.log(`Completed successfully at ${new Date().toISOString()}`);
  console.log("=".repeat(70));
}

runCleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Fatal error during cleanup execution:", e);
    process.exit(1);
  });
