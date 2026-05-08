/* ═══════════════════════════════════════════════════════
   THE 42 POST — Backend Server (内胆)
   Rigorous, verifiable machine execution layer
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SqlitePool } from './db/sqlite-adapter.js';

const { Pool } = pg;

import authRoutes from './routes/auth.js';
import forgeRoutes from './routes/forge.js';
import skillsRoutes from './routes/skills.js';
import searchRoutes from './routes/search.js';
import agentRoutes from './routes/agents.js';
import emailRoutes from './routes/email.js';
import downloadsRoutes from './routes/downloads.js';
import playgroundRoutes from './routes/playground.js';
import healthRoutes from './routes/health.js';

import { initDatabase } from './db/init.js';
import { seedSkillsIfNeeded } from './db/seed-skills-on-startup.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { requestValidator } from './middleware/requestValidator.js';
import { corsOptions, logCorsConfiguration } from './config/cors.js';
import { initializeCache } from './utils/cache.js';
import { isOriginWhitelisted, getWhitelistedOrigins } from './config/cors.js';

dotenv.config();

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

// ═══ DATABASE SETUP ═══
// Always use SQLite for now (ignore DATABASE_URL)
let db;

console.log('Using SQLite database (forced)...');
// Persistent storage:
// - Production (Railway): use /app/data (Volume-mounted, survives redeploys)
// - Local dev: use ../database.sqlite3 next to the repo
// Fallback chain ensures local development still works without a /app/data dir.
import { existsSync, mkdirSync } from 'fs';
const PERSISTENT_DIR = '/app/data';
let dbPath;
if (existsSync(PERSISTENT_DIR)) {
  dbPath = join(PERSISTENT_DIR, 'database.sqlite3');
} else if (process.env.NODE_ENV === 'production') {
  // Production but no volume mounted — try to create the dir, otherwise warn loudly
  try {
    mkdirSync(PERSISTENT_DIR, { recursive: true });
    dbPath = join(PERSISTENT_DIR, 'database.sqlite3');
  } catch (e) {
    console.warn('⚠ /app/data not available, falling back to ephemeral path. Data WILL BE LOST on redeploy!');
    dbPath = join(__dirname, '../database.sqlite3');
  }
} else {
  dbPath = join(__dirname, '../database.sqlite3');
}
console.log('Database path:', dbPath);

db = new SqlitePool({
  connectionString: `sqlite:///${dbPath}`
});

// Make db available globally for health checks and other modules
global.__db__ = db;

// Test connection
db.query('SELECT 1 as test').then(result => {
  console.log('✓ SQLite database connected');
}).catch(err => {
  console.error('SQLite connection error:', err.message);
  process.exit(1);
});

// ═══ BACKUP SCHEDULER ═══
// Daily SQLite snapshots with 7-day retention to /app/data/backups/.
// Protects real user-forged skills against accidental drops/migrations.
import { startBackupScheduler } from './utils/backupScheduler.js';
startBackupScheduler(db, dbPath);

// ═══ INITIALIZE CACHING ═══
console.log('\n═══ Cache System Initialization ═══');
initializeCache(); // Memory-based cache (Redis optional)

// ═══ MIDDLEWARE ═══
// 1. CORS (with explicit whitelist)
logCorsConfiguration();
app.use(cors(corsOptions));

// 2. Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Request logging
app.use(requestLogger);

// 4. Request validation
app.use(requestValidator);

// ═══ STATIC FILES (Serve frontend) ═══
const frontendPath = join(__dirname, '../frontend');
console.log('Frontend Path:', frontendPath);

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
    } else if (filePath.match(/\.(js|css)$/)) {
      // JS/CSS: short cache (10 min) so deployments roll out quickly
      res.setHeader('Cache-Control', 'public, max-age=600');
    }
  }
}));

// Root route - return API info if frontend not found
app.get('/', (req, res) => {
  console.log('GET / request received');
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
app.use('/api/search', searchRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/download', downloadsRoutes);
app.use('/api/playground', playgroundRoutes);

// ═══ ADMIN UTILITIES ═══
// Seed diagnostic endpoint - check file paths
app.get('/api/admin/seed-test', async (req, res) => {
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

// Simple UI to trigger seed
app.get('/admin/seed-ui', (req, res) => {
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
app.post('/api/admin/seed-apply', async (req, res) => {
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
        console.log(`[seed-apply] Loaded from local: ${path}`);
        break;
      }
    }

    // If local not found, try GitHub raw
    if (!sqlContent) {
      console.log('[seed-apply] Local file not found, fetching from GitHub...');
      const response = await fetch(
        'https://raw.githubusercontent.com/xiaojialove-DRP/the42post/main/backend/sql/seed-42-skills.sql'
      );
      if (!response.ok) {
        return res.status(400).json({
          error: `Could not fetch seed file. GitHub returned: ${response.status} ${response.statusText}`
        });
      }
      sqlContent = await response.text();
      console.log('[seed-apply] Loaded from GitHub');
    }
    const statements = sqlContent
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'));

    console.log(`[seed-apply] Executing ${statements.length} statements...`);

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
        console.warn(`[seed-apply] Stmt ${i} failed: ${errMsg}`);
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
      message: `Executed ${executed}/${statements.length} statements. Database now has ${finalCount} published skills.`
    });
  } catch (err) {
    console.error('[seed-apply] Fatal error:', err);
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
app.get('/api/admin/diagnostics', async (req, res) => {
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
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Nuke all skills (dangerous — easy mode for development)
app.get('/api/admin/nuke-skills-now', async (req, res) => {
  try {
    console.log('[nuke-skills] Starting skill deletion...');

    // Delete in correct order (respect FK constraints)
    await db.query('DELETE FROM skill_usage_logs WHERE 1=1');
    console.log('[nuke-skills] Deleted skill_usage_logs');

    await db.query('DELETE FROM user_skill_interactions WHERE 1=1');
    console.log('[nuke-skills] Deleted user_skill_interactions');

    await db.query('DELETE FROM skills WHERE 1=1');
    console.log('[nuke-skills] Deleted skills');

    // Verify
    const result = await db.query('SELECT COUNT(*) as count FROM skills');
    const remaining = parseInt(result.rows[0]?.count || 0, 10);

    res.json({
      success: remaining === 0,
      message: `✅ All skills deleted. Remaining: ${remaining}`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[nuke-skills] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Backfill skill descriptions
app.post('/api/admin/backfill-descriptions', async (req, res) => {
  console.log('[backfill] Starting skill description backfill...');

  try {
    const { spawn } = await import('child_process');
    let output = '';
    let errorOutput = '';

    const child = spawn('node', ['backend/scripts/backfill-descriptions.js', '--apply']);

    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[backfill] ${data}`);
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[backfill-err] ${data}`);
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
    console.log('✓ Database schema initialized');

    // Auto-seed 42 skills if needed
    // Temporarily disabled due to startup crash — will implement manual endpoint
    // await seedSkillsIfNeeded(db);
    console.log('⚠ Skill seeding disabled during startup (manual seeding available via API)');

    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║  THE 42 POST — Backend Server (内胆) Running          ║
╚════════════════════════════════════════════════════════╝
  Port: ${PORT}
  Node Env: ${process.env.NODE_ENV}
  Frontend: ${process.env.FRONTEND_URL}

  Health Check: GET /health
  API Docs: See BACKEND_ARCHITECTURE.md
      `);
    });

    // Handle server errors
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });

    // Keep the process alive
    console.log('Server initialization complete');

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // Wait for database pool to close before exiting
  db.end(() => {
    console.log('✓ Database pool closed');
    process.exit(0);
  });

  // Force exit after 10 seconds to prevent hanging
  // if database connection is stuck
  setTimeout(() => {
    console.error('⚠ Forced shutdown after timeout - database pool still draining');
    process.exit(1);
  }, 10000);
});

// Export for use in other modules
export { db };
export { getCache } from './utils/cache.js';
export default app;
