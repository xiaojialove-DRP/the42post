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
import { readFileSync, existsSync } from 'fs';

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

// Reseed control panel (simple HTML UI)
app.get('/admin/reseed-control', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reseed Control</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .panel { background: white; padding: 30px; border-radius: 8px; max-width: 500px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
        button:hover { background: #0056b3; }
        .status { margin-top: 20px; padding: 15px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .loading { background: #e2e3e5; color: #383d41; }
        pre { background: #f8f9fa; padding: 10px; overflow-x: auto; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="panel">
        <h1>🔄 Force Reseed 42 Skills</h1>
        <p>Click the button below to force reload all 42 skills into the database.</p>
        <button onclick="triggerReseed()">▶ Start Reseed</button>
        <div id="status"></div>
      </div>

      <script>
        async function triggerReseed() {
          const statusDiv = document.getElementById('status');
          statusDiv.className = 'status loading';
          statusDiv.innerHTML = '<p>Reseeding... please wait...</p>';

          try {
            const response = await fetch('/api/admin/force-reseed', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
              statusDiv.className = 'status success';
              statusDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            } else {
              statusDiv.className = 'status error';
              statusDiv.innerHTML = \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
            }
          } catch (err) {
            statusDiv.className = 'status error';
            statusDiv.innerHTML = \`<p>Error: \${err.message}</p>\`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Force reseed 42 skills (even if already exist)
app.post('/api/admin/force-reseed', async (req, res) => {
  console.log('[force-reseed] Starting forced skill reseed...');

  try {
    const seedPath = join(__dirname, './sql/seed-42-skills.sql');

    if (!existsSync(seedPath)) {
      return res.status(400).json({ error: `Seed file not found: ${seedPath}` });
    }

    const sqlContent = readFileSync(seedPath, 'utf8');
    const statements = sqlContent
      .split(';')
      .filter(s => s.trim() && !s.trim().startsWith('--'))
      .map(s => s.trim() + ';');

    console.log(`[force-reseed] Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const statement of statements) {
      try {
        await db.query(statement);
        successCount++;
      } catch (err) {
        failedCount++;
        // Log unique constraint errors separately
        if (err.message?.includes('UNIQUE') || err.message?.includes('already exists')) {
          console.log(`[force-reseed] Skipped (duplicate): ${statement.substring(0, 60)}...`);
        } else {
          errors.push(err.message?.substring(0, 100));
          console.warn(`[force-reseed] Error: ${err.message}`);
        }
      }
    }

    // Final count
    const finalResult = await db.query('SELECT COUNT(*) as count FROM skills WHERE published = 1');
    const finalPublishedCount = parseInt(finalResult.rows[0]?.count || 0, 10);

    const allResult = await db.query('SELECT COUNT(*) as count FROM skills');
    const totalCount = parseInt(allResult.rows[0]?.count || 0, 10);

    res.json({
      success: failedCount === 0 || failedCount < statements.length / 2,
      executed: successCount,
      failed: failedCount,
      total_statements: statements.length,
      final_published_skills: finalPublishedCount,
      final_total_skills: totalCount,
      errors: errors.length > 0 ? errors : 'none',
      message: `Reseed complete! Database now has ${finalPublishedCount} published skills (${totalCount} total)`
    });

  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
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
    await seedSkillsIfNeeded(db);

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
