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
// 使用相对于 backend 目录的路径
const dbPath = join(__dirname, '../database.sqlite3');
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
    version: '0.1.0'
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
