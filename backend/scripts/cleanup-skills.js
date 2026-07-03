#!/usr/bin/env node
/**
 * One-time cleanup: keep only the 21 skills.js seed skills + the 10 most
 * recently published user-forged skills. Delete everything else.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage (local):
 *   node backend/scripts/cleanup-skills.js
 *
 * Usage (Zeabur production):
 *   Set ADMIN_CLEANUP_TOKEN env var, then call
 *   POST /api/admin/cleanup-skills  { "token": "<ADMIN_CLEANUP_TOKEN>" }
 *   That route imports and runs cleanupSkills() from this file.
 */

import { db } from '../utils/db.js';

// The 21 skills that live in frontend/skills.js. Identified by title +
// soul_hash prefix so the query is robust against UUID differences between
// local SQLite seeds and production Postgres seeds.
const SKILLS_JS_TITLES = [
  'The Poetic Bridge',
  "Wittgenstein's Silence",
  'Temporal Ripples',
  'Domestic Entropy Auditor',
  'Memory Fingerprint',
  'Grief Protocol',
  'The Slow Reader',
  'Cultural Footnote',
  'Dissent Amplifier',
  'Grandma Filter',
  'Analog Intuition',
  'Midnight Philosopher',
  'Material Honesty',
  'Childhood Compass',
  'The Last Question',
  'Silence as Feature',
  'Proportional Memory',
  'Craft Before Scale',
  'The Ancestor Test',
  'Friction by Design',
  'The Untranslatable',
];

export async function cleanupSkills({ keepUserCount = 10 } = {}) {
  // 1. Collect the 21 seed skill IDs
  const placeholders = SKILLS_JS_TITLES.map((_, i) => `$${i + 1}`).join(', ');
  const seedRes = await db.query(
    `SELECT id, title FROM skills
     WHERE soul_hash LIKE '42-sk-%'
       AND title IN (${placeholders})`,
    SKILLS_JS_TITLES
  );
  const seedIds = seedRes.rows.map(r => r.id);
  console.log(`[cleanup] Found ${seedIds.length} skills.js seed skills`);

  if (seedIds.length !== 21) {
    console.warn(`[cleanup] WARNING: expected 21 seed skills, found ${seedIds.length}`);
    seedRes.rows.forEach(r => console.log(`  ✓ ${r.title}`));
  }

  // 2. Collect the N most recently published user-forged skills (0 = delete all user skills)
  let userIds = [];
  if (keepUserCount > 0) {
    const userRes = await db.query(
      `SELECT id, title, published_at FROM skills
       WHERE soul_hash NOT LIKE '42-sk-%'
       ORDER BY published_at DESC
       LIMIT $1`,
      [keepUserCount]
    );
    userIds = userRes.rows.map(r => r.id);
    console.log(`[cleanup] Top ${keepUserCount} user skills to keep:`);
    userRes.rows.forEach(r => console.log(`  ✓ ${r.title || '(no title)'} — ${r.published_at}`));
  } else {
    console.log(`[cleanup] keepUserCount=0 — deleting all user-forged skills`);
  }

  const keepIds = [...seedIds, ...userIds];
  console.log(`[cleanup] Total to keep: ${keepIds.length} skills`);

  if (keepIds.length === 0) {
    console.error('[cleanup] ABORT: keep list is empty — something is wrong');
    return { deleted: 0, kept: 0 };
  }

  // 3. Count what will be deleted
  const kPlaceholders = keepIds.map((_, i) => `$${i + 1}`).join(', ');
  const countRes = await db.query(
    `SELECT COUNT(*) as cnt FROM skills WHERE id NOT IN (${kPlaceholders})`,
    keepIds
  );
  const toDelete = parseInt(countRes.rows[0]?.cnt || 0, 10);
  console.log(`[cleanup] Will delete ${toDelete} skills`);

  if (toDelete === 0) {
    console.log('[cleanup] Nothing to delete — database is already clean.');
    return { deleted: 0, kept: keepIds.length };
  }

  // 4. Delete child rows in skill_usage_logs (no CASCADE on that FK)
  const usageRes = await db.query(
    `DELETE FROM skill_usage_logs WHERE skill_id NOT IN (${kPlaceholders})`,
    keepIds
  );
  console.log(`[cleanup] Deleted ${usageRes.rowCount ?? '?'} skill_usage_logs rows`);

  // 5. Delete skills (CASCADE handles skill_versions, skill_manifests,
  //    user_skill_interactions, skill_test_votes, skill_feedback,
  //    forging_histories)
  const delRes = await db.query(
    `DELETE FROM skills WHERE id NOT IN (${kPlaceholders})`,
    keepIds
  );
  const deleted = delRes.rowCount ?? toDelete;
  console.log(`[cleanup] Deleted ${deleted} skills ✓`);

  return { deleted, kept: keepIds.length };
}

// Allow running directly: node backend/scripts/cleanup-skills.js
// In that case global.__db__ must be set up first; detect by checking argv.
if (process.argv[1] && process.argv[1].endsWith('cleanup-skills.js')) {
  // Bootstrap db for standalone execution
  const { createRequire } = await import('module');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const pgUri = process.env.POSTGRES_URI || process.env.DATABASE_URL;
  if (pgUri) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: pgUri });
    global.__db__ = { query: (sql, p) => pool.query(sql, p), connect: () => pool.connect() };
    console.log('[cleanup] Using PostgreSQL');
  } else {
    const dbPath = join(__dirname, '../../database.sqlite3');
    const { SqlitePool } = await import('../db/sqlite-adapter.js');
    global.__db__ = new SqlitePool({ connectionString: `sqlite:///${dbPath}` });
    console.log('[cleanup] Using local SQLite:', dbPath);
  }

  try {
    const result = await cleanupSkills();
    console.log('[cleanup] Done:', result);
    process.exit(0);
  } catch (err) {
    console.error('[cleanup] ERROR:', err.message);
    process.exit(1);
  }
}
