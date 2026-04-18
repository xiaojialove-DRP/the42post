/* ═══════════════════════════════════════════════════════
   Database Migration Script
   Run with: npm run migrate
   ═══════════════════════════════════════════════════════ */

import pg from 'pg';
import dotenv from 'dotenv';
import { initDatabase } from '../db/init.js';

dotenv.config();

const { Pool } = pg;

async function runMigrations() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Running database migrations...');

    // Initialize all tables
    await initDatabase();

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigrations();
