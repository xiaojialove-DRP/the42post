/* ═══════════════════════════════════════════════════════
   Twin Test Verification — status thresholds + self-check

   "Verification" here means: across blind Twin Test votes (the user
   never sees which side has the Skill until after picking — see
   routes/playground.js /test and /vote), what share did the Skill
   side win? Author votes are excluded everywhere in this file — a
   creator voting on their own Skill is not evidence of anything, and
   would let anyone inflate their own win rate.

   A verification status that can never say "failed" is not a test,
   it is a rubber stamp. checkVerificationSelfTest() exists to catch
   exactly that failure mode in the mechanism itself: if a trailing
   window produces zero failed Skills among enough evaluable ones,
   something in the pipeline (a UI bug hiding the failed label, a
   threshold that is too lenient, vote tampering) is more likely than
   every tested Skill genuinely earning it.
   ═══════════════════════════════════════════════════════ */

import { sendAdminAlert } from './email.js';
import { logger } from './logger.js';

export const VERIFICATION_MIN_VOTES = 5;
export const VERIFICATION_VERIFIED_THRESHOLD = 0.6;
export const VERIFICATION_FAILED_THRESHOLD = 0.4;

// 'verifying' covers: not enough votes yet, AND the genuinely inconclusive
// 40-60% band. Both mean "no call yet", not a third permanent verdict.
export function deriveVerificationStatus(totalVotes, winRate) {
  if (!totalVotes || totalVotes < VERIFICATION_MIN_VOTES || winRate === null || winRate === undefined) {
    return 'verifying';
  }
  if (winRate >= VERIFICATION_VERIFIED_THRESHOLD) return 'verified';
  if (winRate < VERIFICATION_FAILED_THRESHOLD) return 'failed';
  return 'verifying';
}

// Shared WHERE fragment: a countable, non-author blind vote.
const NON_AUTHOR_VOTE_FILTER = `voted_for_skill IS NOT NULL AND (is_author IS NULL OR is_author = 0)`;

// ─── Single-skill verification stats (non-author blind votes only) ───
export async function getSkillVerificationStats(db, skillId) {
  const row = (await db.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(voted_for_skill), 0) AS wins
     FROM skill_test_votes
     WHERE skill_id = $1 AND ${NON_AUTHOR_VOTE_FILTER}`,
    [skillId]
  )).rows?.[0] || { total: 0, wins: 0 };

  const total = Number(row.total) || 0;
  const wins = Number(row.wins) || 0;
  const winRate = total > 0 ? wins / total : null;

  return {
    total_votes: total,
    wins,
    win_rate: winRate,
    verification_status: deriveVerificationStatus(total, winRate)
  };
}

// ─── Batch verification stats for every Skill with any non-author vote ───
// Used by the Archive grid so every card can show its status without N+1.
export async function getBatchVerificationStats(db) {
  const rows = (await db.query(
    `SELECT skill_id, COUNT(*) AS total, COALESCE(SUM(voted_for_skill), 0) AS wins
     FROM skill_test_votes
     WHERE ${NON_AUTHOR_VOTE_FILTER}
     GROUP BY skill_id`
  )).rows || [];

  const stats = {};
  for (const row of rows) {
    const total = Number(row.total) || 0;
    const wins = Number(row.wins) || 0;
    const winRate = total > 0 ? wins / total : null;
    stats[row.skill_id] = {
      total_votes: total,
      wins,
      win_rate: winRate,
      verification_status: deriveVerificationStatus(total, winRate)
    };
  }
  return stats;
}

// ─── Self-check: is the "failed" verdict actually reachable? ───
// Looks at every Skill that received at least one non-author blind vote in
// the trailing `windowDays`, then scores each on its ALL-TIME non-author
// vote history (status is a durable label, not a windowed one). If there
// is at least one Skill with enough votes to be scored (`evaluable > 0`)
// and NONE of them are "failed", the mechanism itself is suspect.
export async function checkVerificationSelfTest(db, windowDays = 90) {
  const cutoff = new Date(Date.now() - windowDays * 86400000)
    .toISOString().slice(0, 19).replace('T', ' ');

  const recentRows = (await db.query(
    `SELECT DISTINCT skill_id FROM skill_test_votes
     WHERE ${NON_AUTHOR_VOTE_FILTER} AND voted_at >= $1`,
    [cutoff]
  )).rows || [];

  const recentSkillIds = recentRows.map(r => r.skill_id).filter(Boolean);
  if (recentSkillIds.length === 0) {
    return { window_days: windowDays, evaluable: 0, failed: 0, should_alert: false, reason: 'no_recent_votes' };
  }

  const placeholders = recentSkillIds.map((_, i) => `$${i + 1}`).join(',');
  const statsRows = (await db.query(
    `SELECT skill_id, COUNT(*) AS total, COALESCE(SUM(voted_for_skill), 0) AS wins
     FROM skill_test_votes
     WHERE skill_id IN (${placeholders}) AND ${NON_AUTHOR_VOTE_FILTER}
     GROUP BY skill_id`,
    recentSkillIds
  )).rows || [];

  let evaluable = 0;
  let failed = 0;
  for (const row of statsRows) {
    const total = Number(row.total) || 0;
    if (total < VERIFICATION_MIN_VOTES) continue;
    evaluable++;
    const winRate = Number(row.wins) / total;
    if (winRate < VERIFICATION_FAILED_THRESHOLD) failed++;
  }

  return {
    window_days: windowDays,
    evaluable,
    failed,
    should_alert: evaluable > 0 && failed === 0
  };
}

// ─── Runs the self-check and fires the admin alert if warranted ───
// sendAdminAlert has its own 1-hour cooldown per key, so calling this
// repeatedly (manual admin hits, a scheduled script) is safe.
export async function runVerificationSelfCheck(db, windowDays = 90) {
  const result = await checkVerificationSelfTest(db, windowDays);
  logger.info('verification_self_check', result);

  if (result.should_alert) {
    await sendAdminAlert(
      'verification_zero_failure_rate',
      'Twin Test verification has not failed a single Skill in months',
      `Over the trailing ${windowDays} days, ${result.evaluable} Skill(s) reached the ` +
      `${VERIFICATION_MIN_VOTES}-vote threshold for a verification status, and ${result.failed} ` +
      `of them are in "Verification Failed" status.\n\n` +
      `A blind test that never produces a failure is not a working test -- check for a UI bug ` +
      `hiding the failed label, a threshold that is too lenient, or vote tampering (e.g. authors ` +
      `voting on their own Skills without being correctly flagged is_author).\n\n` +
      `Query to inspect: SELECT skill_id, COUNT(*) wins, SUM(voted_for_skill) total FROM ` +
      `skill_test_votes WHERE voted_for_skill IS NOT NULL AND (is_author IS NULL OR is_author = 0) ` +
      `GROUP BY skill_id HAVING COUNT(*) >= ${VERIFICATION_MIN_VOTES};`
    ).catch(() => {});
  }

  return result;
}
