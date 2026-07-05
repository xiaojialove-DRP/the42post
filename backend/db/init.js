/* ═══════════════════════════════════════════════════════
   Database Schema Initialization (SQLite + PostgreSQL compatible)
   ═══════════════════════════════════════════════════════ */

import { db } from '../server.js';
import { runMigrations } from './migrations.js';

export async function initDatabase() {
  try {
    // NOTE: server.js picks PostgreSQL when POSTGRES_URI/DATABASE_URL is set
    // (Zeabur auto-injects POSTGRES_URI), else SQLite for local dev. Either
    // way, UUIDs are handled in the adapter layer (randomblob/v4 helpers),
    // not via Postgres's CREATE EXTENSION "uuid-ossp" — so this block is
    // intentionally disabled on both dialects, not just on SQLite.
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
        creator_anonymous_id TEXT,
        ready_to_use_prompt TEXT,
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

    await db.query(`CREATE INDEX IF NOT EXISTS idx_skills_creator_anon ON skills(creator_anonymous_id)`);

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

    // ─── Forging History (research data: track skill creation process) ───
    // Stores complete forging process for research purposes
    // Includes original idea, AI outputs, final skill structure, user edits
    await db.query(`
      CREATE TABLE IF NOT EXISTS forging_histories (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL UNIQUE REFERENCES skills(id) ON DELETE CASCADE,
        user_email VARCHAR(255),
        original_idea TEXT,
        ai_outputs TEXT,
        final_skill_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_forging_histories_skill ON forging_histories(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_forging_histories_email ON forging_histories(user_email)`);

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

    // ─── Probe sessions: captures the full human decision process ───
    // Each row = one user seeing a probe and choosing a stance.
    // Linked to skills.id after publish so we can join idea→choice→final skill.
    await db.query(`
      CREATE TABLE IF NOT EXISTS probe_sessions (
        id TEXT PRIMARY KEY,
        skill_id TEXT REFERENCES skills(id) ON DELETE SET NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        idea_text TEXT NOT NULL,
        language VARCHAR(10),
        scenario TEXT NOT NULL,
        thesis TEXT,
        antithesis TEXT,
        extreme TEXT,
        selected_response VARCHAR(20),
        country_code VARCHAR(10),
        accept_language VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_sessions_skill ON probe_sessions(skill_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_sessions_country ON probe_sessions(country_code)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_probe_sessions_selected ON probe_sessions(selected_response)`);

    // ─── analytics_events: lightweight funnel tracking ───
    // Not a real analytics platform — there wasn't any visibility at all
    // into where people drop off (e.g. open Forge but never publish), so
    // this is the minimum needed to answer that, built on the stack
    // that's already here instead of standing up a separate service.
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_name VARCHAR(100) NOT NULL,
        page VARCHAR(100),
        anonymous_id VARCHAR(255),
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at)`);

    // ─── Versioned migrations: everything that changes an existing schema ───
    // (column additions, one-time data fixes, table rebuilds). Runs each
    // migration exactly once per database — see db/migrations.js.
    await runMigrations(db);

    console.log('✓ All database tables initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
