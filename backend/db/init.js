/* ═══════════════════════════════════════════════════════
   Database Schema Initialization (SQLite + PostgreSQL compatible)
   ═══════════════════════════════════════════════════════ */

import { db } from '../server.js';

export async function initDatabase() {
  try {
    // Skip UUID extension for SQLite
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    } catch (e) {
      // SQLite doesn't need this, ignore error
    }

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        verification_token VARCHAR(255),
        verified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

    // Create skills table
    await db.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        title_cn VARCHAR(255),
        description TEXT,
        description_cn TEXT,
        domain VARCHAR(100),
        soul_hash VARCHAR(255) UNIQUE NOT NULL,
        five_layer TEXT NOT NULL,
        forge_mode VARCHAR(50) NOT NULL,
        source_agent_id VARCHAR(255),
        commercial_use VARCHAR(50) DEFAULT 'authorized',
        remix_allowed INTEGER DEFAULT 1,
        applicable_when TEXT,
        disallowed_uses TEXT,
        starlight_score INTEGER DEFAULT 0,
        published INTEGER DEFAULT 0,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_soul_hash ON skills(soul_hash)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_published ON skills(published) WHERE deleted_at IS NULL`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain)`);

    // Create skill_versions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_versions (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        five_layer TEXT NOT NULL,
        author_signature VARCHAR(512),
        changelog TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(skill_id, version_number)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id)`);

    // Create skill_manifests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_manifests (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL UNIQUE REFERENCES skills(id) ON DELETE CASCADE,
        soul_hash VARCHAR(255) NOT NULL UNIQUE,
        author_signature VARCHAR(512) NOT NULL,
        covenant_signatures TEXT NOT NULL DEFAULT '[]',
        manifest_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_manifests_soul_hash ON skill_manifests(soul_hash)`);

    // Create probe_logs table (user_id nullable — probe endpoint is public, no auth required)
    await db.query(`
      CREATE TABLE IF NOT EXISTS probe_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        idea_text TEXT NOT NULL,
        generated_probe TEXT NOT NULL,
        model_version VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_logs_user ON probe_logs(user_id)`);

    // Migration: if probe_logs already exists with NOT NULL on user_id, recreate it.
    // SQLite cannot ALTER COLUMN, so we use the rename-recreate pattern.
    try {
      // Test if we can insert a row with null user_id (if it fails, old schema is in place)
      await db.query(`INSERT INTO probe_logs (id, user_id, idea_text, generated_probe) VALUES ('__schema_test__', NULL, 'test', 'test')`);
      await db.query(`DELETE FROM probe_logs WHERE id = '__schema_test__'`);
    } catch (schemaErr) {
      if (schemaErr.message && schemaErr.message.includes('NOT NULL')) {
        console.log('Migrating probe_logs: removing NOT NULL constraint on user_id…');
        await db.query(`ALTER TABLE probe_logs RENAME TO probe_logs_old`);
        await db.query(`
          CREATE TABLE probe_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            idea_text TEXT NOT NULL,
            generated_probe TEXT NOT NULL,
            model_version VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.query(`INSERT INTO probe_logs SELECT * FROM probe_logs_old`);
        await db.query(`DROP TABLE probe_logs_old`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_logs_user ON probe_logs(user_id)`);
        console.log('✓ probe_logs migration complete');
      }
    }

    // Create skill_usage_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_usage_logs (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL REFERENCES skills(id),
        agent_id VARCHAR(255),
        context TEXT,
        outcome VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_usage_logs_skill ON skill_usage_logs(skill_id)`);

    console.log('✓ All database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
