/**
 * Test DB helper — spins up an in-memory SQLite instance and runs the
 * same schema as production so every test starts from a clean slate.
 */

import Database from 'better-sqlite3';

/**
 * Create a fresh in-memory SQLite database with the full schema applied.
 * Returns an object with db.query(sql, params) and db.connect() that mimic
 * the PostgreSQL pg-pool interface used by production routes.
 */
export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // ── Schema ─────────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      account_type TEXT NOT NULL DEFAULT 'standard',
      verification_token TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      title_cn TEXT,
      description TEXT,
      description_cn TEXT,
      domain TEXT DEFAULT 'ideas',
      soul_hash TEXT,
      five_layer TEXT,
      forge_mode TEXT DEFAULT 'standard',
      source_agent_id TEXT,
      commercial_use TEXT DEFAULT 'authorized',
      remix_allowed INTEGER DEFAULT 1,
      applicable_when TEXT,
      disallowed_uses TEXT,
      ready_to_use_prompt TEXT,
      starlight_score INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      creator_anonymous_id TEXT,
      published INTEGER DEFAULT 1,
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skill_manifests (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL UNIQUE REFERENCES skills(id) ON DELETE CASCADE,
      soul_hash TEXT NOT NULL UNIQUE,
      author_signature TEXT NOT NULL,
      covenant_signatures TEXT NOT NULL DEFAULT '[]',
      manifest_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skill_versions (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      five_layer TEXT NOT NULL,
      author_signature TEXT,
      changelog TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(skill_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS user_skill_interactions (
      id TEXT PRIMARY KEY,
      anonymous_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      starred INTEGER DEFAULT 0,
      starred_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(anonymous_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS skill_usage_logs (
      id TEXT PRIMARY KEY,
      skill_id TEXT,
      agent_id TEXT,
      context TEXT,
      outcome TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playground_sessions (
      id TEXT PRIMARY KEY,
      skill_id TEXT,
      anonymous_id TEXT,
      task_domain TEXT,
      task_text TEXT,
      with_skill_response TEXT,
      without_skill_response TEXT,
      user_rating TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sentinel anonymous author required by skills route
    INSERT INTO users (id, email, username, password_hash, account_type, verified)
    VALUES ('anonymous-user-001', 'anonymous@the42post.local', 'Anonymous', 'anonymous', 'system', 1);
  `);

  // ── SQL adapter ─────────────────────────────────────────────────────────
  /**
   * Convert a PostgreSQL-style query + params into SQLite equivalents.
   *
   * Key transformations:
   *  1. $N → ? positional placeholders (each $N occurrence pushes params[N-1]
   *     into newParams, so duplicate references like "$1 OR ... $1" expand
   *     correctly — PostgreSQL allows the same param index multiple times,
   *     SQLite needs a separate ? for each occurrence).
   *  2. ILIKE → LIKE  (SQLite has no ILIKE; LIKE is case-insensitive for ASCII)
   *  3. Preserve BEGIN / COMMIT / ROLLBACK as-is for transaction support.
   */
  function adaptSql(sql, params = []) {
    const newParams = [];

    let adapted = sql
      // Replace each $N with ? and record the corresponding param value
      .replace(/\$(\d+)/g, (_, n) => {
        newParams.push(params[parseInt(n, 10) - 1]);
        return '?';
      })
      // SQLite LIKE is case-insensitive for ASCII by default
      .replace(/\bILIKE\b/gi, 'LIKE');

    return { sql: adapted, params: newParams };
  }

  /**
   * Normalize result rows so they match PostgreSQL column naming:
   * - COUNT(*) → count  (PostgreSQL auto-lowercases aggregate names)
   */
  function normalizeRows(rows) {
    return rows.map(row => {
      if (!('COUNT(*)' in row)) return row;
      const { 'COUNT(*)': count, ...rest } = row;
      return { count: String(count), ...rest };
    });
  }

  const db = {
    _sqlite: sqlite,

    async query(sql, params = []) {
      const { sql: adapted, params: adaptedParams } = adaptSql(sql, params);
      const trimmed = adapted.trim().toUpperCase();

      // Transaction control statements — run via exec (no params, no result)
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(trimmed)) {
        sqlite.prepare(adapted).run();
        return { rows: [], rowCount: 0 };
      }

      try {
        if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
          const stmt = sqlite.prepare(adapted);
          const rows = normalizeRows(stmt.all(...adaptedParams));
          return { rows, rowCount: rows.length };
        } else if (trimmed.startsWith('INSERT') && adapted.includes('RETURNING')) {
          // Handle INSERT ... RETURNING by executing insert then fetching the row
          const returningMatch = adapted.match(/RETURNING\s+(.+)$/i);
          if (returningMatch) {
            // Extract column names from RETURNING clause
            const returningCols = returningMatch[1].split(',').map(s => s.trim());

            // Remove RETURNING clause for SQLite
            const insertSql = adapted.replace(/\s+RETURNING\s+.+$/i, '');
            const stmt = sqlite.prepare(insertSql);
            const info = stmt.run(...adaptedParams);

            // If insert was successful, fetch the inserted row
            if (info.changes > 0) {
              // Try to extract table name and first param as ID (for users table)
              const tableMatch = insertSql.match(/INSERT INTO\s+(\w+)/i);
              const tableName = tableMatch ? tableMatch[1] : 'users';

              // First param is usually the id
              const idParam = adaptedParams[0];
              const selectSql = `SELECT ${returningCols.join(', ')} FROM ${tableName} WHERE id = ?`;
              const selectStmt = sqlite.prepare(selectSql);
              const row = selectStmt.get(idParam);
              return { rows: row ? [row] : [], rowCount: info.changes };
            }
            return { rows: [], rowCount: 0 };
          }
          // Fallback if RETURNING parsing fails
          const stmt = sqlite.prepare(adapted);
          const info = stmt.run(...adaptedParams);
          return { rows: [], rowCount: info.changes };
        } else {
          const stmt = sqlite.prepare(adapted);
          const info = stmt.run(...adaptedParams);
          return { rows: [], rowCount: info.changes };
        }
      } catch (err) {
        throw err;
      }
    },

    async connect() {
      return {
        query: (sql, params = []) => db.query(sql, params),
        release() {}
      };
    },

    end() { sqlite.close(); }
  };

  return db;
}
