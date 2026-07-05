#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Manual production Postgres backup — free alternative to
   Zeabur's paid automatic backup.

   Runs pg_dump against the production database and writes a
   timestamped, gzipped SQL file into backups/. Keeps the last 14.

     npm run backup:prod

   SETUP (one time):
   1. Create a file  .env.backup  in the repo root (it is gitignored)
      with the PUBLIC production connection string from Zeabur:

        PROD_DATABASE_URL=postgresql://user:password@host:port/dbname

      Get it from Zeabur → postgresql service → Overview → "Connection
      String" (use the PUBLIC one; if the DB isn't publicly reachable,
      enable public access under the service's Networking tab first).
      NEVER paste this string into chat or commit it.

   2. Make sure pg_dump is installed locally:
        macOS:  brew install libpq && brew link --force libpq
                (or: brew install postgresql@16)
        check:  pg_dump --version

   RESTORE (if you ever need it):
     gunzip -c backups/prod-YYYY-MM-DD-HH-MM-SS.sql.gz | psql "<connection string>"

   The dump contains ALL user data (emails included) — backups/*.sql.gz
   is gitignored and must never be committed to this public repo.
   ═══════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Read PROD_DATABASE_URL from .env.backup (a dedicated, gitignored file kept
// separate from the dev .env). Tiny hand-parser so this script needs zero
// npm dependencies at the repo root. An env var of the same name wins if set.
function readBackupEnv(key) {
  if (process.env[key]) return process.env[key];
  const envPath = path.join(repoRoot, '.env.backup');
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() === key) {
      return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const url = readBackupEnv('PROD_DATABASE_URL');
if (!url) {
  console.error(`
✗ PROD_DATABASE_URL is not set.

  Create  .env.backup  in the repo root with:
    PROD_DATABASE_URL=postgresql://user:password@host:port/dbname

  (from Zeabur → postgresql → Overview → Connection String — the public one).
`);
  process.exit(1);
}

const KEEP = 14; // how many recent dumps to retain
const outDir = path.join(repoRoot, 'backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const outFile = path.join(outDir, `prod-${stamp}.sql.gz`);
const outStream = fs.createWriteStream(outFile);

console.log(`⏳ Dumping production database → ${path.relative(repoRoot, outFile)}`);

// pg_dump → gzip → file. --no-owner/--no-privileges keeps the dump portable
// (restorable into a fresh DB without matching roles).
const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', url]);
const gzip = spawn('gzip');

let dumpErr = '';
dump.stderr.on('data', (d) => { dumpErr += d.toString(); });
dump.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('\n✗ pg_dump not found. Install the Postgres client first:');
    console.error('    macOS: brew install libpq && brew link --force libpq');
    console.error('    then:  pg_dump --version\n');
  } else {
    console.error('✗ Failed to start pg_dump:', err.message);
  }
  process.exit(1);
});

dump.stdout.pipe(gzip.stdin);
gzip.stdout.pipe(outStream);

let dumpExit = null;
dump.on('close', (code) => { dumpExit = code; });

outStream.on('finish', () => {
  if (dumpExit !== 0) {
    // Remove the partial/empty file so it's never mistaken for a good backup.
    try { fs.unlinkSync(outFile); } catch {}
    console.error(`\n✗ pg_dump failed (exit ${dumpExit}).`);
    if (dumpErr.trim()) console.error(dumpErr.trim().split('\n').slice(-5).join('\n'));
    console.error('\n  Common cause: the DB is not publicly reachable. Enable public');
    console.error('  access under Zeabur → postgresql → Networking, and use that host.\n');
    process.exit(1);
  }

  const bytes = fs.statSync(outFile).size;
  const kb = (bytes / 1024).toFixed(1);
  console.log(`✓ Backup written: ${path.relative(repoRoot, outFile)} (${kb} KB)`);

  // Prune old dumps, keep the newest KEEP.
  const dumps = fs.readdirSync(outDir)
    .filter((f) => /^prod-.*\.sql\.gz$/.test(f))
    .sort();
  const stale = dumps.slice(0, Math.max(0, dumps.length - KEEP));
  for (const f of stale) {
    try { fs.unlinkSync(path.join(outDir, f)); } catch {}
  }
  if (stale.length) console.log(`  (pruned ${stale.length} old dump${stale.length > 1 ? 's' : ''}, keeping ${KEEP})`);
});
