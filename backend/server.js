/* ═══════════════════════════════════════════════════════
   THE 42 POST — Backend Server (内胆)
   Rigorous, verifiable machine execution layer
   ═══════════════════════════════════════════════════════ */

// MUST be the first import. Every other import below is a static ES module
// import, which Node hoists and evaluates before any of this file's own
// top-level code — including a later `dotenv.config()` call. Several modules
// (utils/auth.js JWT_SECRET, utils/skillGeneration.js API keys, utils/email.js)
// read process.env into module-level consts at import time, so if dotenv
// loads .env after those imports run, they permanently cache `undefined`
// for the life of the process even though process.env looks correct
// afterward. 'dotenv/config' runs config() as its own import side effect,
// so listing it first guarantees .env is loaded before anything else.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SqlitePool } from './db/sqlite-adapter.js'; // kept for local dev fallback
import { existsSync, mkdirSync } from 'fs';

const { Pool } = pg;

import authRoutes from './routes/auth.js';
import forgeRoutes from './routes/forge.js';
import skillsRoutes from './routes/skills.js';
import emailRoutes from './routes/email.js';
import downloadsRoutes from './routes/downloads.js';
import playgroundRoutes from './routes/playground.js';
import healthRoutes from './routes/health.js';
import analyticsRoutes from './routes/analytics.js';

import { initDatabase } from './db/init.js';
import { seedSkillsIfNeeded } from './db/seed-skills-on-startup.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { requestValidator } from './middleware/requestValidator.js';
import { corsOptions, logCorsConfiguration } from './config/cors.js';
import { initializeCache } from './utils/cache.js';
import { isOriginWhitelisted, getWhitelistedOrigins } from './config/cors.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ SECURITY CHECKS ═══
// CRITICAL: Validate JWT_SECRET is set (but skip in test environment)
if (process.env.NODE_ENV !== 'test' && !process.env.JWT_SECRET) {
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║ FATAL ERROR: JWT_SECRET environment variable is not set   ║');
  console.error('║ Set JWT_SECRET in your .env file before starting server   ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

// CRITICAL: SIGNING_SECRET signs skill manifests / covenant signatures.
// Without it the signing code fails closed (throws) — better to refuse to
// boot with a clear message than to start a server that 500s on every
// publish, or (worse) silently signs with a guessable default.
if (process.env.NODE_ENV !== 'test' && !process.env.SIGNING_SECRET) {
  console.error('╔════════════════════════════════════════════════════════════╗');
  console.error('║ FATAL ERROR: SIGNING_SECRET environment variable is not set║');
  console.error('║ Set SIGNING_SECRET in your .env before starting server     ║');
  console.error('╚════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

// ═══ DATABASE SETUP ═══
// Use PostgreSQL if POSTGRES_URI is set (Zeabur auto-injects it), else SQLite (local dev)
let db;

const pgUri = process.env.POSTGRES_URI || process.env.DATABASE_URL;

// A sqlite: URL must never be handed to the pg Pool — the root .env's
// DATABASE_URL=sqlite:./database.sqlite3 would otherwise be treated as a
// PostgreSQL connection string and crash the boot.
if (pgUri && !pgUri.startsWith('sqlite:')) {
  logger.info('Using PostgreSQL database...');
  const pgPool = new Pool({ connectionString: pgUri, ssl: false });
  db = {
    query: (sql, params) => pgPool.query(sql, params),
    connect: () => pgPool.connect(),
    dialect: 'postgresql'
  };
  pgPool.query('SELECT 1 as test').then(() => {
    logger.info('✓ PostgreSQL database connected');
  }).catch(err => {
    logger.error('PostgreSQL connection error:', err.message);
    process.exit(1);
  });
} else {
  logger.info('Using SQLite database (local dev)...');
  const PERSISTENT_DIR = '/app/data';
  let dbPath;
  if (existsSync(PERSISTENT_DIR)) {
    dbPath = join(PERSISTENT_DIR, 'database.sqlite3');
  } else {
    dbPath = join(__dirname, '../database.sqlite3');
  }
  logger.info('Database path:', dbPath);
  db = new SqlitePool({ connectionString: `sqlite:///${dbPath}` });
  db.query('SELECT 1 as test').then(() => {
    logger.info('✓ SQLite database connected');
  }).catch(err => {
    logger.error('SQLite connection error:', err.message);
    process.exit(1);
  });
}

// Make db available globally
global.__db__ = db;

// ═══ INITIALIZE CACHING ═══
logger.info('═══ Cache System Initialization ═══');
initializeCache(); // Memory-based cache (Redis optional)

// ═══ MIDDLEWARE ═══
// 0. Canonical host redirect — www.the42post.com and the42post.com both
//    resolved 200 with identical content and no redirect between them,
//    splitting SEO ranking/backlink signal across two URLs instead of
//    consolidating it. Non-www is what's already declared everywhere
//    else (og:url, JSON-LD Organization/WebSite `url`), so redirect www
//    to it. Uses req.hostname (Host header only, not req.protocol) so
//    this doesn't depend on trust-proxy config; the target is always
//    hardcoded https since that's the only way this app is served in
//    production. First middleware so the common case short-circuits
//    before any other work runs.
//
//    Excludes /api — this redirect runs before the cors() middleware, so
//    a 301 issued here carries no CORS headers. A page loaded from
//    www.the42post.com (e.g. an old tab from before this redirect
//    shipped) doing fetch('/api/...') would have that same-origin request
//    redirected cross-origin to the42post.com with no CORS header on the
//    redirect response, which the browser blocks outright — surfacing to
//    users as a bare "Load failed"/"Failed to fetch" with no real error
//    (hit in production: forge-success email silently failed to send).
//    Both hosts are already in the CORS whitelist, so the API can just
//    answer on whichever host it was called on instead of redirecting.
app.use((req, res, next) => {
  if (req.hostname === 'www.the42post.com' && !req.path.startsWith('/api/')) {
    return res.redirect(301, `https://the42post.com${req.originalUrl}`);
  }
  next();
});

// 1. Compression (gzip) — was a listed dependency with no app.use() anywhere.
//    script.js/styles.css/index.html are plain text and not small (no build
//    step to minify them); compresses each by roughly 70-85% with no
//    behavior change. Before any routes/static so it covers everything.
app.use(compression());

// 2. CORS (with explicit whitelist)
logCorsConfiguration();
app.use(cors(corsOptions));

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Request logging
app.use(requestLogger);

// 5. Request validation
app.use(requestValidator);

// ═══ STATIC FILES (Serve frontend) ═══
const frontendPath = join(__dirname, '../frontend');
logger.info('Frontend Path:', frontendPath);

// Serve static files with proper MIME types and caching
app.use(express.static(frontendPath, {
  extensions: ['html', 'js', 'css', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'woff', 'woff2'],
  etag: true,
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types
    if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    // Add CORS headers for fonts and media files
    if (filePath.match(/\.(woff|woff2|ttf|otf|png|jpg|jpeg|gif|svg)$/)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    // HTML files: never cache so users always get the latest version
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(woff2?)$/)) {
      // Self-hosted font files (vendor/fonts/) are named by their own
      // content hash (Google's font CDN convention) — the same filename
      // never points to different bytes, so this is safe to cache
      // indefinitely rather than the 10-min default below.
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(js|css)$/)) {
      // JS/CSS: short cache (10 min) so deployments roll out quickly
      res.setHeader('Cache-Control', 'public, max-age=600');
    }
  }
}));

// ═══ PLAYGROUND ROUTE ═══
// Serve playground.html at /playground
app.get('/playground', (req, res) => {
  res.sendFile(join(frontendPath, 'playground.html'));
});

// Serve archive.html at /archive
app.get('/archive', (req, res) => {
  res.sendFile(join(frontendPath, 'archive.html'));
});

// Root route - return API info if frontend not found
app.get('/', (req, res) => {
  logger.debug('GET / request received');
  res.json({
    message: 'THE 42 POST API Server',
    status: 'running',
    frontend: 'Frontend not yet deployed',
    api_docs: '/api/health',
    version: '0.1.0',
    diagnostics: {
      cors_debug: '/api/cors-debug (check if your origin is whitelisted)',
      db_status: '/api/admin/diagnostics (check database & skills count)'
    }
  });
});

// ═══ HEALTH CHECK ROUTES ═══
// Use the enhanced health check router for detailed status
app.use('/health', healthRoutes);
// Keep backward compatibility with /api/health
app.use('/api/health', healthRoutes);

// ═══ API ROUTES ═══
app.use('/api/auth', authRoutes);
app.use('/api/forge', forgeRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/download', downloadsRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/analytics', analyticsRoutes);

// ═══ ADMIN UTILITIES ═══
// Guard: require ADMIN_KEY header for all /api/admin/* routes
function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'Admin endpoints disabled: ADMIN_KEY not configured' });
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Forbidden: invalid admin key' });
  }
  next();
}

// Seed diagnostic endpoint - check file paths
app.get('/api/admin/seed-test', requireAdminKey, async (req, res) => {
  try {
    const { existsSync, readdirSync } = await import('fs');

    // Try multiple possible paths
    const possiblePaths = [
      join(__dirname, '../sql/seed-42-skills.sql'),
      join(__dirname, './sql/seed-42-skills.sql'),
      '/app/sql/seed-42-skills.sql',
      '/sql/seed-42-skills.sql',
      process.cwd() + '/sql/seed-42-skills.sql',
      process.cwd() + '/backend/sql/seed-42-skills.sql',
    ];

    const results = {
      __dirname,
      cwd: process.cwd(),
      foundPaths: [],
      missingPaths: [],
      directoryListing: {}
    };

    // Check each path
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        results.foundPaths.push(path);
      } else {
        results.missingPaths.push(path);
      }
    }

    // List what's in common directories
    const dirsToList = [__dirname, join(__dirname, '..'), '/app', process.cwd()];
    for (const dir of dirsToList) {
      try {
        results.directoryListing[dir] = readdirSync(dir).slice(0, 20);
      } catch (e) {
        results.directoryListing[dir] = `Error reading: ${e.message}`;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete specific skills by title (exact match)
app.post('/api/admin/delete-skills-by-title', requireAdminKey, async (req, res) => {
  try {
    const { titles } = req.body || {};
    if (!Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({ error: 'titles array required' });
    }
    const { db } = await import('./utils/db.js');
    const placeholders = titles.map((_, i) => `$${i + 1}`).join(', ');
    const idRes = await db.query(`SELECT id FROM skills WHERE title IN (${placeholders})`, titles);
    const ids = idRes.rows.map(r => r.id);
    if (ids.length === 0) return res.json({ success: true, deleted: 0 });
    const idPh = ids.map((_, i) => `$${i + 1}`).join(', ');
    await db.query(`DELETE FROM skill_usage_logs WHERE skill_id IN (${idPh})`, ids);
    const del = await db.query(`DELETE FROM skills WHERE id IN (${idPh})`, ids);
    res.json({ success: true, deleted: del.rowCount });
  } catch (err) {
    console.error('[delete-skills-by-title]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Skill database cleanup: keep 21 seed skills + 10 latest user skills, delete the rest
app.post('/api/admin/cleanup-skills', requireAdminKey, async (req, res) => {
  try {
    const { cleanupSkills } = await import('./scripts/cleanup-skills.js');
    const keepUserCount = req.body?.keepUserCount ?? 10;
    const result = await cleanupSkills({ keepUserCount });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[cleanup-skills]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Simple UI to trigger seed
app.get('/admin/seed-ui', requireAdminKey, (req, res) => {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Seed Manager</title>
<style>
body{font-family:Arial;padding:20px;background:#f5f5f5}
.box{background:white;padding:20px;border-radius:8px;max-width:600px}
button{padding:10px 20px;margin:10px 0;font-size:16px;cursor:pointer;border:none;border-radius:4px}
.btn-test{background:#0066cc;color:white}
.btn-apply{background:#28a745;color:white}
.btn-test:hover{background:#0052a3}
.btn-apply:hover{background:#218838}
pre{background:#f8f9fa;padding:10px;border-radius:4px;overflow-x:auto;max-height:400px}
.status{margin:20px 0;padding:15px;border-radius:4px}
.success{background:#d4edda;color:#155724}
.error{background:#f8d7da;color:#721c24}
.loading{background:#e2e3e5}
</style>
</head>
<body>
<div class="box">
<h1>🌱 Seed Manager</h1>
<p>Step 1: Check if seed file exists</p>
<button class="btn-test" onclick="testSeed()">▶ Test Seed File</button>
<div id="test-status"></div>

<hr>
<p>Step 2: Apply seeds to database (load 42 skills)</p>
<button class="btn-apply" onclick="applySeed()">▶ Apply Seeds</button>
<div id="apply-status"></div>

<hr>
<p><a href="/api/admin/diagnostics">Check current skill count →</a></p>
</div>

<script>
async function testSeed() {
  const div = document.getElementById('test-status');
  div.className = 'status loading';
  div.innerHTML = 'Testing...';
  try {
    const res = await fetch('/api/admin/seed-test');
    const data = await res.json();
    div.className = 'status success';
    div.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  } catch (e) {
    div.className = 'status error';
    div.innerHTML = 'Error: ' + e.message;
  }
}

async function applySeed() {
  const div = document.getElementById('apply-status');
  div.className = 'status loading';
  div.innerHTML = 'Loading 42 skills... please wait...';
  try {
    const res = await fetch('/api/admin/seed-apply', {method: 'POST'});
    const data = await res.json();
    if (data.success || data.finalPublishedSkills > 20) {
      div.className = 'status success';
    } else {
      div.className = 'status error';
    }
    div.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  } catch (e) {
    div.className = 'status error';
    div.innerHTML = 'Error: ' + e.message;
  }
}
</script>
</body></html>`;
  res.send(html);
});

// Apply seed (from GitHub raw if local file not available)
app.post('/api/admin/seed-apply', requireAdminKey, async (req, res) => {
  try {
    const { existsSync, readFileSync } = await import('fs');

    let sqlContent = null;

    // Try local file first
    const seedPaths = [
      join(__dirname, '../sql/seed-42-skills.sql'),
      join(__dirname, './sql/seed-42-skills.sql'),
    ];

    for (const path of seedPaths) {
      if (existsSync(path)) {
        sqlContent = readFileSync(path, 'utf8');
        logger.info(`[seed-apply] Loaded from local: ${path}`);
        break;
      }
    }

    // If local not found, try GitHub raw
    if (!sqlContent) {
      logger.info('[seed-apply] Local file not found, fetching from GitHub...');
      const response = await fetch(
        'https://raw.githubusercontent.com/xiaojialove-DRP/the42post/main/backend/sql/seed-42-skills.sql'
      );
      if (!response.ok) {
        return res.status(400).json({
          error: `Could not fetch seed file. GitHub returned: ${response.status} ${response.statusText}`
        });
      }
      sqlContent = await response.text();
      logger.info('[seed-apply] Loaded from GitHub');
    }
    // Strip comment lines, then split on semicolons
    const cleanedSql = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    const statements = cleanedSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Ensure system user exists before inserting skills (FK dependency)
    try {
      await db.query(
        `INSERT INTO users (id, email, username, password_hash, account_type, verified, created_at)
         VALUES ('bb1eecf8-68ae-4765-b6db-5e092462d8e2', 'system@the42post.local', 'System', 'system', 'system', 1, NOW())
         ON CONFLICT (id) DO NOTHING`
      );
      logger.info('[seed-apply] System user ensured');
    } catch (e) {
      logger.warn('[seed-apply] System user insert skipped:', e.message);
    }

    logger.info(`[seed-apply] Executing ${statements.length} statements...`);

    let executed = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';';
      try {
        await db.query(stmt);
        executed++;
      } catch (err) {
        failed++;
        const errMsg = err.message || err.toString();
        errors.push(`Stmt ${i}: ${errMsg.substring(0, 120)}`);
        logger.warn(`[seed-apply] Stmt ${i} failed: ${errMsg}`);
      }
    }

    const result = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 1');
    const finalCount = parseInt(result.rows[0]?.count || 0, 10);

    res.json({
      success: true,
      executed,
      failed,
      total: statements.length,
      finalPublishedSkills: finalCount,
      errors: errors.slice(0, 5),
      message: `Executed ${executed}/${statements.length} statements. Database now has ${finalCount} published skills.`
    });
  } catch (err) {
    logger.error('[seed-apply] Fatal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// CORS Debug endpoint (no auth needed for troubleshooting)
app.get('/api/cors-debug', (req, res) => {
  const origin = req.get('origin');
  const isWhitelisted = origin ? isOriginWhitelisted(origin) : 'N/A (same-origin request)';

  res.json({
    current_origin: origin || '(no origin header - same-origin)',
    is_whitelisted: isWhitelisted,
    whitelisted_origins: getWhitelistedOrigins(),
    request_headers: {
      origin: origin || 'missing',
      'user-agent': req.get('user-agent'),
      referer: req.get('referer')
    },
    diagnosis: isWhitelisted === true
      ? '✓ This origin is whitelisted'
      : isWhitelisted === 'N/A (same-origin request)'
      ? '✓ Same-origin request (no CORS check needed)'
      : '✗ Origin NOT whitelisted - add to CORS config'
  });
});

// Database diagnostics
app.get('/api/admin/diagnostics', requireAdminKey, async (req, res) => {
  try {
    const allSkills = await db.query('SELECT COUNT(*) as count FROM skills');
    const publishedSkills = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 1');
    const unpublishedSkills = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 0 OR published IS NULL');
    const deletedSkills = await db.query('SELECT COUNT(*) as count FROM skills WHERE deleted_at IS NOT NULL');

    const skillsWithStars = await db.query('SELECT COUNT(*) as count FROM user_skill_interactions WHERE starred = 1');
    const downloadCount = await db.query('SELECT SUM(download_count) as total FROM skills');
    const skillsTable = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='skills'");

    res.json({
      database: {
        actualPath: dbPath,
        skills_total: allSkills.rows[0]?.count || 0,
        skills_published: publishedSkills.rows[0]?.count || 0,
        skills_unpublished: unpublishedSkills.rows[0]?.count || 0,
        skills_deleted: deletedSkills.rows[0]?.count || 0,
        starredInteractions: skillsWithStars.rows[0]?.count || 0,
        totalDownloads: downloadCount.rows[0]?.total || 0,
        skillsTableExists: skillsTable.rows?.length > 0
      },
      seedStatus: publishedSkills.rows[0]?.count >= 40 ? 'Seeds loaded (≥40 published)' : 'Seeds NOT loaded (< 40 published)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? err.message : 'Internal server error', ...(isDev && { stack: err.stack }) });
  }
});

// Funnel analytics summary — counts per tracked event, all-time.
// Compare e.g. forge_step1_started vs forge_published to see drop-off.
app.get('/api/admin/analytics-summary', requireAdminKey, async (req, res) => {
  try {
    const byEvent = await db.query(
      `SELECT event_name, COUNT(*) as count
       FROM analytics_events
       GROUP BY event_name
       ORDER BY count DESC`
    );
    const total = await db.query('SELECT COUNT(*) as count FROM analytics_events');

    res.json({
      success: true,
      total_events: total.rows[0]?.count || 0,
      by_event: byEvent.rows
    });
  } catch (err) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
  }
});

// Skills the moderation LLM call couldn't reach a verdict on (infra failure,
// not a content judgment — moderateSkill() fails open and flags these for
// a human instead of blocking the publish). This column + its index existed
// with no endpoint ever reading them — oldest-first so a backlog gets
// worked off in order, not just whatever was flagged most recently.
app.get('/api/admin/moderation-queue', requireAdminKey, async (req, res) => {
  try {
    const queue = await db.query(
      `SELECT id, title, title_cn, description, domain, creator_anonymous_id,
              moderation_status, moderation_risk_level, moderation_explanation,
              moderation_categories, created_at, published
       FROM skills
       WHERE moderation_review_required = 1 AND deleted_at IS NULL
       ORDER BY created_at ASC`
    );

    res.json({
      success: true,
      count: queue.rows.length,
      skills: queue.rows
    });
  } catch (err) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
  }
});

// Nuke all skills (dangerous — easy mode for development)
app.get('/api/admin/nuke-skills-now', requireAdminKey, async (req, res) => {
  try {
    logger.info('[nuke-skills] Starting skill deletion...');

    // Delete in correct order (respect FK constraints)
    await db.query('DELETE FROM skill_usage_logs WHERE 1=1');
    logger.debug('[nuke-skills] Deleted skill_usage_logs');

    await db.query('DELETE FROM user_skill_interactions WHERE 1=1');
    logger.debug('[nuke-skills] Deleted user_skill_interactions');

    await db.query('DELETE FROM skills WHERE 1=1');
    logger.debug('[nuke-skills] Deleted skills');

    // Verify
    const result = await db.query('SELECT COUNT(*) as count FROM skills');
    const remaining = parseInt(result.rows[0]?.count || 0, 10);

    res.json({
      success: remaining === 0,
      message: `✅ All skills deleted. Remaining: ${remaining}`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('[nuke-skills] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Normalize creator_anonymous_id to creator_<name> format
app.post('/api/admin/normalize-creator-names', requireAdminKey, async (req, res) => {
  try {
    // 1. NULL or empty → creator_42
    const r1 = await db.query(
      `UPDATE skills SET creator_anonymous_id = 'creator_42'
       WHERE (creator_anonymous_id IS NULL OR creator_anonymous_id = '')
         AND deleted_at IS NULL`
    );
    // 2. Names without creator_ prefix → add prefix
    const r2 = await db.query(
      `UPDATE skills SET creator_anonymous_id = 'creator_' || creator_anonymous_id
       WHERE creator_anonymous_id IS NOT NULL
         AND creator_anonymous_id NOT LIKE 'creator_%'
         AND deleted_at IS NULL`
    );
    // 3. Double prefix (creator_creator_X) → fix
    const r3 = await db.query(
      `UPDATE skills SET creator_anonymous_id = REPLACE(creator_anonymous_id, 'creator_creator_', 'creator_')
       WHERE creator_anonymous_id LIKE 'creator_creator_%'
         AND deleted_at IS NULL`
    );
    res.json({
      success: true,
      nullFixed: r1.rowCount,
      prefixAdded: r2.rowCount,
      doubleFixed: r3.rowCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Backfill skill descriptions
app.post('/api/admin/backfill-descriptions', requireAdminKey, async (req, res) => {
  logger.info('[backfill] Starting skill description backfill...');

  try {
    const { spawn } = await import('child_process');
    let output = '';
    let errorOutput = '';

    const child = spawn('node', ['backend/scripts/backfill-descriptions.js', '--apply']);

    child.stdout.on('data', (data) => {
      output += data.toString();
      logger.debug(`[backfill] ${data}`);
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger.error(`[backfill-err] ${data}`);
    });

    child.on('close', (code) => {
      res.json({
        success: code === 0,
        exitCode: code,
        output: output,
        errors: errorOutput
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══ ERROR HANDLING ═══
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

// ═══ INITIALIZATION ═══
async function startServer() {
  try {
    // Initialize database schema
    await initDatabase();
    logger.info('✓ Database schema initialized');

    // Auto-seed 42 skills if needed
    await seedSkillsIfNeeded(db);

    const server = app.listen(PORT, () => {
      logger.info(`THE 42 POST server running on port ${PORT} (${process.env.NODE_ENV})`);
    });

    // Monthly creator impact digest (Resend) — at most once per creator per month
    try {
      const { startCreatorDigestScheduler } = await import('./utils/creatorDigest.js');
      startCreatorDigestScheduler();
    } catch (digestErr) {
      logger.warn('Creator digest scheduler failed to start:', digestErr.message);
    }

    // Handle server errors
    server.on('error', (err) => {
      logger.error('Server error:', err);
      process.exit(1);
    });

    logger.info('Server initialization complete');

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  try {
    // Close the database connection (better-sqlite3 is synchronous)
    if (db && typeof db.close === 'function') {
      db.close();
      logger.info('✓ Database connection closed');
    }
  } catch (err) {
    logger.error('Error closing database:', err.message);
  }

  // Give the server time to finish pending requests (max 10 seconds)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout - pending requests still draining');
    process.exit(1);
  }, 10000);

  // Process exit after graceful shutdown
  process.exit(0);
});

// Export for use in other modules
export { db };
export { getCache } from './utils/cache.js';
export default app;
