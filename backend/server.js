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

import { initDatabase } from './db/init.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ DATABASE SETUP ═══
// Always use SQLite for now (ignore DATABASE_URL)
let db;

console.log('Using SQLite database (forced)...');
const sqliteUrl = 'sqlite:///./database.sqlite3';

db = new SqlitePool({
  connectionString: sqliteUrl
});

// Test connection
db.query('SELECT 1 as test').then(result => {
  console.log('✓ SQLite database connected');
}).catch(err => {
  console.error('SQLite connection error:', err.message);
  process.exit(1);
});

// ═══ MIDDLEWARE ═══
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(requestLogger);

// ═══ STATIC FILES (Serve frontend) ═══
const frontendPath = join(__dirname, '../day1');
console.log('Frontend Path:', frontendPath);

// Try to serve static files, but don't crash if folder doesn't exist
try {
  app.use(express.static(frontendPath, {
    extensions: ['html', 'js', 'css', 'json'],
    maxAge: '1h',
    etag: false
  }));
} catch (err) {
  console.warn('Frontend static folder not found, API-only mode');
}

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

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  });
});

// ═══ API ROUTES ═══
app.use('/api/auth', authRoutes);
app.use('/api/forge', forgeRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/agents', agentRoutes);

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

    app.listen(PORT, () => {
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  db.end(() => console.log('✓ Database pool closed'));
  process.exit(0);
});

export { db };
export default app;
