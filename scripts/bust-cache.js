#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   Automatic cache busting for the no-build frontend

   Replaces the manual "?v=20260705-something" ritual, which required a
   human to remember to bump a hand-written string in every HTML file on
   every asset edit — and repeatedly didn't happen (playground.html sat
   on a version string from a week before the others, silently serving
   stale script.js to anyone who had it cached).

   What it does: for every local .js/.css reference in frontend/*.html,
   compute a content hash of the referenced file and rewrite the ?v=
   query to it. Same content → same hash → no needless cache misses;
   any edit → new hash → guaranteed fresh fetch.

     node scripts/bust-cache.js           # fix references in place
     node scripts/bust-cache.js --check   # exit 1 if anything is stale (CI)
   ═══════════════════════════════════════════════════════ */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(__dirname, '../frontend');
const CHECK_MODE = process.argv.includes('--check');

// Matches src="local.js" / href="local.css" with an optional existing ?v=…
// Skips absolute URLs (http/https///) — CDN assets version themselves.
const ASSET_REF = /\b(src|href)="(?!https?:\/\/|\/\/)([^"?]+\.(?:js|css))(\?v=[^"]*)?"/g;

const hashCache = new Map();
function contentHash(assetPath) {
  if (!hashCache.has(assetPath)) {
    hashCache.set(
      assetPath,
      createHash('md5').update(readFileSync(assetPath)).digest('hex').slice(0, 10)
    );
  }
  return hashCache.get(assetPath);
}

let stale = 0;
let updated = 0;

for (const file of readdirSync(FRONTEND).filter(f => f.endsWith('.html'))) {
  const htmlPath = path.join(FRONTEND, file);
  const original = readFileSync(htmlPath, 'utf8');

  const rewritten = original.replace(ASSET_REF, (match, attr, ref, oldV) => {
    const assetPath = path.join(FRONTEND, ref);
    if (!existsSync(assetPath)) return match; // dangling ref — not this script's problem
    const v = `?v=${contentHash(assetPath)}`;
    if (oldV === v) return match;
    stale++;
    return `${attr}="${ref}${v}"`;
  });

  if (rewritten !== original) {
    if (!CHECK_MODE) {
      writeFileSync(htmlPath, rewritten);
      updated++;
      console.log(`[bust-cache] updated ${file}`);
    } else {
      console.error(`[bust-cache] STALE: ${file} has asset refs that don't match current content`);
    }
  }
}

if (CHECK_MODE) {
  if (stale > 0) {
    console.error(`\n[bust-cache] ${stale} stale reference(s). Run: npm run bust-cache`);
    process.exit(1);
  }
  console.log('[bust-cache] all asset references match content ✓');
} else if (updated === 0) {
  console.log('[bust-cache] nothing to update ✓');
}
