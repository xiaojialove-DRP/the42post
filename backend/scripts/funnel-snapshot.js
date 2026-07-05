#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Weekly Funnel Snapshot — CLI

   Prints the 4 open-testing metrics as a markdown block ready to paste
   into CHANGELOG.md. Run weekly (or whenever), against whichever DB the
   env points at:

     node backend/scripts/funnel-snapshot.js            # last 7 days
     node backend/scripts/funnel-snapshot.js --days 14

   Local dev hits the repo-root database.sqlite3; set POSTGRES_URI to run
   against production. For a deployed server you can instead curl the
   admin endpoint (same output):

     curl -H "x-admin-key: $ADMIN_KEY" \
       "https://www.the42post.com/api/analytics/funnel?format=md"
   ═══════════════════════════════════════════════════════ */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildFunnelReport } from '../utils/funnelReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? parseInt(process.argv[daysArg + 1], 10) || 7 : 7;

async function getDb() {
  const uri = process.env.POSTGRES_URI || process.env.DATABASE_URL || '';
  if (uri && !uri.startsWith('sqlite:')) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: uri, ssl: false });
    return { query: (sql, params) => pool.query(sql, params), end: () => pool.end() };
  }
  const { SqlitePool } = await import('../db/sqlite-adapter.js');
  // Same path resolution as server.js local-dev branch: repo-root sqlite file.
  const dbPath = path.join(__dirname, '../../database.sqlite3');
  const pool = new SqlitePool({ connectionString: `sqlite:///${dbPath}` });
  return { query: (sql, params) => pool.query(sql, params), end: () => {} };
}

const db = await getDb();
try {
  const { markdown } = await buildFunnelReport(db, days);
  console.log('\n' + markdown + '\n');
} catch (err) {
  console.error('Funnel snapshot failed:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
