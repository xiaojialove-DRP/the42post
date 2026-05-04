/* ═══════════════════════════════════════════════════════
   Database Schema Initialization (SQLite + PostgreSQL compatible)
   ═══════════════════════════════════════════════════════ */

import { db } from '../server.js';

export async function initDatabase() {
  try {
    // NOTE: server.js forces SQLite ("Always use SQLite for now"), so even
    // when Railway provides a postgresql:// DATABASE_URL we run on SQLite.
    // SQLite has no CREATE EXTENSION concept (UUIDs handled in adapter
    // layer via randomblob/v4 helpers), so this block is intentionally
    // disabled. If we ever flip back to real PostgreSQL, restore the
    // CREATE EXTENSION call AND gate it on the actual db.dialect, not
    // DATABASE_URL.
    // (Was: CREATE EXTENSION IF NOT EXISTS "uuid-ossp" — now disabled.)

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

    // Create user_skill_interactions table (for star/favorite tracking)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_skill_interactions (
        id TEXT PRIMARY KEY,
        anonymous_id VARCHAR(255),
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        starred INTEGER DEFAULT 0,
        starred_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(anonymous_id, skill_id)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_anon_id ON user_skill_interactions(anonymous_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_skill ON user_skill_interactions(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_skill_interactions_starred ON user_skill_interactions(starred) WHERE starred = 1`);

    // Twin Test (Playground A/B): a row is created at /api/playground/test
    // (response_a, response_b, skill_side, diagnostic filled) and updated at
    // /api/playground/vote (chosen_side, voted_for_skill, voted_at filled).
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_test_votes (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        scenario_key VARCHAR(255),
        anonymous_id VARCHAR(255),
        skill_side CHAR(1) NOT NULL,
        diagnostic TEXT,
        chosen_side CHAR(1),
        voted_for_skill INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        voted_at TIMESTAMP
      )
    `);
    // Best-effort migration for installs created before the diagnostic column existed.
    try { await db.query(`ALTER TABLE skill_test_votes ADD COLUMN diagnostic TEXT`); } catch {}
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_test_votes_skill ON skill_test_votes(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_test_votes_voted ON skill_test_votes(skill_id, voted_for_skill)`);

    // ─── Anonymous-user sentinel + new skill columns ───
    // Anonymous community-forged skills point their author_id at this row, so
    // the existing NOT NULL FK on skills.author_id stays intact while we still
    // allow non-logged-in users to forge. The real per-user identity lives in
    // skills.creator_anonymous_id (added below).
    try {
      await db.query(
        `INSERT INTO users (id, email, username, password_hash, account_type, verified)
         VALUES ('anonymous-user-001', 'anonymous@the42post.local', 'Anonymous', 'anonymous', 'system', 1)`
      );
    } catch {
      // Row already exists (UNIQUE constraint on email/username) → nothing to do.
    }

    // creator_anonymous_id: lets us answer "which skill did THIS anonymous
    // user just forge?" (used by Playground to put the user's own skill at
    // the top of the picker) without coupling to logged-in accounts.
    try { await db.query(`ALTER TABLE skills ADD COLUMN creator_anonymous_id TEXT`); } catch {}
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_creator_anon ON skills(creator_anonymous_id)`);

    // ready_to_use_prompt: natural-language System Prompt synthesised from
    // the 5-layer at PUBLISH time. Used by the .md download and as the
    // injected "with skill" prompt in Playground (more stable than dumping
    // the raw 5-layer JSON into the LLM).
    try { await db.query(`ALTER TABLE skills ADD COLUMN ready_to_use_prompt TEXT`); } catch {}

    // ─── skill_feedback ───
    // Replaces the old blind-vote model in skill_test_votes. The new
    // Playground UX reveals which response had the skill before asking the
    // user to react, so we collect a 3-level reaction + an optional
    // free-text comment instead of a side pick.
    //   rating ∈ {'better','neutral','no_diff'}
    await db.query(`
      CREATE TABLE IF NOT EXISTS skill_feedback (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        scenario_key VARCHAR(255),
        anonymous_id VARCHAR(255),
        rating VARCHAR(20) NOT NULL,
        comment TEXT,
        response_a TEXT,
        response_b TEXT,
        skill_side CHAR(1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_feedback_skill ON skill_feedback(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_skill_feedback_rating ON skill_feedback(skill_id, rating)`);

    // ─── Moderation audit columns + download counter on skills ───
    // Added in 2026-05; wrapped in try/catch since SQLite errors on
    // duplicate column names (idempotent migration).
    const idempotentColAdds = [
      `ALTER TABLE skills ADD COLUMN moderation_status VARCHAR(30) DEFAULT 'pending'`,
      `ALTER TABLE skills ADD COLUMN moderation_risk_level VARCHAR(20)`,
      `ALTER TABLE skills ADD COLUMN moderation_explanation TEXT`,
      `ALTER TABLE skills ADD COLUMN moderation_categories TEXT`,
      `ALTER TABLE skills ADD COLUMN moderation_decided_at TIMESTAMP`,
      `ALTER TABLE skills ADD COLUMN moderation_review_required INTEGER DEFAULT 0`,
      `ALTER TABLE skills ADD COLUMN download_count INTEGER DEFAULT 0`
    ];
    for (const sql of idempotentColAdds) {
      try { await db.query(sql); } catch (e) { /* column exists */ }
    }
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_moderation_status ON skills(moderation_status)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_moderation_review ON skills(moderation_review_required) WHERE moderation_review_required = 1`);
    } catch (e) { /* index exists */ }

    // ─── Moderation audit log (full history of every decision) ───
    await db.query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
        id TEXT PRIMARY KEY,
        skill_id TEXT,
        identity TEXT,
        decision VARCHAR(40) NOT NULL,
        risk_level VARCHAR(20),
        violations TEXT,
        explanation TEXT,
        categories TEXT,
        suggested_modifications TEXT,
        review_required INTEGER DEFAULT 0,
        title_snapshot TEXT,
        description_snapshot TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_moderation_logs_skill ON moderation_logs(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_moderation_logs_decision ON moderation_logs(decision)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at)`);

    console.log('✓ All database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
