#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Emergency Production Snapshot — free, no DB credentials needed

   Stopgap until a persistent Volume (or paid PostgreSQL) is confirmed
   on the production Zeabur service. Pulls every published Skill via
   the PUBLIC read API (GET /api/skills, which already omits emails —
   see docs/governance/PARTICIPANT_DATA.md) and writes a timestamped
   JSON snapshot into backups/ (gitignored — never committed).

   This is NOT a substitute for a real database backup: it only
   captures published, public Skill fields (title, description,
   five_layer, soul_hash, etc.) — not users, votes, or anything not
   exposed by the public API. Good enough to manually re-forge/restore
   the visible catalog if the database is ever wiped; not good enough
   for a full research-data recovery.

   Usage:
     node scripts/emergency-snapshot.js
     node scripts/emergency-snapshot.js --url https://www.the42post.com
   ═══════════════════════════════════════════════════════ */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const urlArgIdx = process.argv.indexOf('--url');
const baseUrl = urlArgIdx > -1 ? process.argv[urlArgIdx + 1] : 'https://www.the42post.com';

const KEEP = 30; // keep the last 30 snapshots (roughly a month if run daily)

async function main() {
  console.log(`⏳ Fetching published Skills from ${baseUrl}/api/skills ...`);
  const resp = await fetch(`${baseUrl}/api/skills`);
  if (!resp.ok) {
    console.error(`✗ Fetch failed: HTTP ${resp.status}`);
    process.exit(1);
  }
  const data = await resp.json();
  const skills = Array.isArray(data) ? data : (data.skills || []);
  if (!Array.isArray(skills) || skills.length === 0) {
    console.error('✗ No skills returned — refusing to write an empty snapshot over real backups.');
    process.exit(1);
  }

  const outDir = path.join(repoRoot, 'backups');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const outFile = path.join(outDir, `emergency-snapshot-${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));

  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`✓ Saved ${skills.length} skill(s) → ${path.relative(repoRoot, outFile)} (${kb} KB)`);

  const snaps = fs.readdirSync(outDir)
    .filter((f) => /^emergency-snapshot-.*\.json$/.test(f))
    .sort();
  const stale = snaps.slice(0, Math.max(0, snaps.length - KEEP));
  for (const f of stale) {
    try { fs.unlinkSync(path.join(outDir, f)); } catch {}
  }
  if (stale.length) console.log(`  (pruned ${stale.length} old snapshot(s), keeping ${KEEP})`);
}

main().catch((err) => {
  console.error('✗ Snapshot failed:', err.message);
  process.exit(1);
});
