import type { SupabaseClient } from "@supabase/supabase-js";

const KEY_PREFIX = "group_share:";

export function getShareConfigKey(challengeId: string, userId: string): string {
  return `${KEY_PREFIX}${challengeId}:${userId}`;
}

export async function getChallengeSharePreferences(
  adminClient: SupabaseClient,
  challengeId: string,
  rawParticipants?: Array<{ user_id: string; share_results?: boolean | null }>
): Promise<Record<string, boolean>> {
  const prefs: Record<string, boolean> = {};

  for (const p of rawParticipants || []) {
    if (typeof p.share_results === "boolean") {
      prefs[p.user_id] = p.share_results;
    } else if (!(p.user_id in prefs)) {
      prefs[p.user_id] = true;
    }
  }

  try {
    const prefix = `${KEY_PREFIX}${challengeId}:`;
    const { data, error } = await adminClient
      .from("system_config")
      .select("key, value")
      .like("key", `${prefix}%`);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (typeof row.key === "string" && row.key.startsWith(prefix)) {
          const userId = row.key.slice(prefix.length);
          if (userId) {
            prefs[userId] = String(row.value).toLowerCase() !== "false";
          }
        }
      }
    }
  } catch (err) {
    console.warn("[group-exam-privacy] Failed reading challenge share preferences:", err);
  }

  return prefs;
}

export async function getChallengesSharePreferences(
  adminClient: SupabaseClient,
  challengeIds: string[],
  rawParticipants?: Array<{
    challenge_id: string;
    user_id: string;
    share_results?: boolean | null;
  }>
): Promise<Record<string, Record<string, boolean>>> {
  const result: Record<string, Record<string, boolean>> = {};
  const challengeSet = new Set(challengeIds);

  for (const id of challengeIds) {
    result[id] = {};
  }

  for (const p of rawParticipants || []) {
    if (!challengeSet.has(p.challenge_id)) continue;
    if (!result[p.challenge_id]) result[p.challenge_id] = {};
    if (typeof p.share_results === "boolean") {
      result[p.challenge_id][p.user_id] = p.share_results;
    } else if (!(p.user_id in result[p.challenge_id])) {
      result[p.challenge_id][p.user_id] = true;
    }
  }

  if (challengeIds.length === 0) return result;

  try {
    const { data, error } = await adminClient
      .from("system_config")
      .select("key, value")
      .like("key", `${KEY_PREFIX}%`);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (typeof row.key !== "string" || !row.key.startsWith(KEY_PREFIX)) continue;
        const remainder = row.key.slice(KEY_PREFIX.length);
        const sepIdx = remainder.indexOf(":");
        if (sepIdx <= 0) continue;
        const challengeId = remainder.slice(0, sepIdx);
        const userId = remainder.slice(sepIdx + 1);
        if (!challengeSet.has(challengeId) || !userId) continue;
        if (!result[challengeId]) result[challengeId] = {};
        result[challengeId][userId] = String(row.value).toLowerCase() !== "false";
      }
    }
  } catch (err) {
    console.warn("[group-exam-privacy] Failed reading batch share preferences:", err);
  }

  return result;
}

export async function setParticipantSharePreference(
  adminClient: SupabaseClient,
  challengeId: string,
  userId: string,
  shareResults: boolean
): Promise<void> {
  const normalized = Boolean(shareResults);
  const key = getShareConfigKey(challengeId, userId);

  const { error: configError } = await adminClient
    .from("system_config")
    .upsert(
      {
        key,
        value: normalized ? "true" : "false",
        description: "Group exam participant result visibility preference",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (configError) {
    throw configError;
  }

  // Best-effort sync to exam_challenge_participants.share_results if migrated
  try {
    const { error: colErr } = await adminClient
      .from("exam_challenge_participants")
      .update({ share_results: normalized })
      .eq("challenge_id", challengeId)
      .eq("user_id", userId);

    if (
      colErr &&
      colErr.code !== "42703" &&
      !/share_results/i.test(colErr.message || "")
    ) {
      console.warn("[group-exam-privacy] Column update warning:", colErr.message);
    }
  } catch {
    // Column may not exist yet before migration is run
  }
}

export async function touchChallengeUpdatedAt(
  adminClient: SupabaseClient,
  challengeId: string
): Promise<void> {
  try {
    await adminClient
      .from("exam_challenges")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", challengeId);
  } catch {
    // Non-fatal realtime trigger ping
  }
}

const SCORE_KEY_PREFIX = "group_score:";

export interface ChallengeScoreSummary {
  correct_answers: number;
  total_questions: number;
  score_percentage: number;
  duration_seconds: number;
  status: string;
  completed_at?: string;
}

export async function setParticipantChallengeScore(
  adminClient: SupabaseClient,
  challengeId: string,
  userId: string,
  summary: ChallengeScoreSummary
): Promise<void> {
  const key = `${SCORE_KEY_PREFIX}${challengeId}:${userId}`;
  try {
    await adminClient.from("system_config").upsert(
      {
        key,
        value: JSON.stringify(summary),
        description: "Live group challenge scoreboard summary",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } catch (err) {
    console.warn("[group-exam-privacy] Failed storing challenge score summary:", err);
  }
}

export async function getChallengeParticipantScores(
  adminClient: SupabaseClient,
  challengeId: string
): Promise<Record<string, ChallengeScoreSummary>> {
  const scores: Record<string, ChallengeScoreSummary> = {};
  try {
    const prefix = `${SCORE_KEY_PREFIX}${challengeId}:`;
    const { data, error } = await adminClient
      .from("system_config")
      .select("key, value")
      .like("key", `${prefix}%`);
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (typeof row.key === "string" && row.key.startsWith(prefix) && row.value) {
          const userId = row.key.slice(prefix.length);
          if (!userId) continue;
          try {
            const parsed = JSON.parse(String(row.value));
            if (parsed && typeof parsed === "object") {
              scores[userId] = parsed as ChallengeScoreSummary;
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("[group-exam-privacy] Failed reading challenge score summaries:", err);
  }
  return scores;
}

