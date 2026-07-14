#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Twin Test Verification Self-Check — CLI

   Checks whether the blind-vote verification mechanism (routes/
   playground.js /vote, utils/verificationHealth.js) has produced at
   least one "Verification Failed" Skill among the ones with enough
   votes to be scored, in the trailing window. If it has not, fires an
   admin alert -- a verification test that never fails is not a test.

   Run monthly (or whenever):
     node backend/scripts/verification-health-check.js
     node backend/scripts/verification-health-check.js --days 30

   Local dev hits the repo-root database.sqlite3; set POSTGRES_URI to
   run against production. For a deployed server you can instead curl
   the admin endpoint (same output, and it fires the alert too):

     curl -H "x-admin-key: $ADMIN_KEY" \
       "https://www.the42post.com/api/analytics/verification-health"
   ═══════════════════════════════════════════════════════ */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { runVerificationSelfCheck } from '../utils/verificationHealth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? parseInt(process.argv[daysArg + 1], 10) || 90 : 90;

async function getDb() {
  const uri = process.env.POSTGRES_URI || process.env.DATABASE_URL || '';
  if (uri && !uri.startsWith('sqlite:')) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: uri, ssl: false });
    return { query: (sql, params) => pool.query(sql, params), end: () => pool.end() };
  }
  const { SqlitePool } = await import('../db/sqlite-adapter.js');
  const dbPath = path.join(__dirname, '../../database.sqlite3');
  const pool = new SqlitePool({ connectionString: `sqlite:///${dbPath}` });
  return { query: (sql, params) => pool.query(sql, params), end: () => {} };
}

const db = await getDb();
try {
  const result = await runVerificationSelfCheck(db, days);
  console.log(`\nVerification self-check — trailing ${result.window_days} days`);
  console.log(`  Evaluable Skills (>=5 votes): ${result.evaluable}`);
  console.log(`  Failed among them: ${result.failed}`);
  if (result.reason === 'no_recent_votes') {
    console.log('  No votes in this window — nothing to evaluate yet.');
  } else if (result.should_alert) {
    console.log('  ⚠️  ALERT FIRED — zero failures among evaluable Skills. Admin notified.');
  } else {
    console.log('  ✓ Mechanism looks healthy (at least one real failure observed).');
  }
} catch (err) {
  console.error('Verification health check failed:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
