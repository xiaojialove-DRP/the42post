/* ═══════════════════════════════════════════════════════
   SQLite Adapter — PostgreSQL-compatible interface
   Allows using SQLite with existing pg-style code
   ═══════════════════════════════════════════════════════ */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL for SQLite
function parseSqliteUrl(url) {
  // sqlite:./path/to/db.db
  if (url.startsWith('sqlite:')) {
    return url.substring(7);
  }
  return url;
}

export class SqlitePool {
  constructor(options) {
    const dbPath = parseSqliteUrl(options.connectionString);
    const fullPath = path.resolve(__dirname, '..', dbPath);

    console.log(`Initializing SQLite database at: ${fullPath}`);
    this.db = new Database(fullPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
  }

  // Mimic pg Pool.query() interface
  async query(sql, params = []) {
    try {
      // Handle multiple statement queries
      if (sql.includes(';') && sql.trim().split(';').length > 2) {
        // Multiple statements
        const statements = sql.split(';').filter(s => s.trim());
        for (const stmt of statements) {
          const s = stmt.trim();
          if (s) {
            this.db.exec(s);
          }
        }
        return { rows: [] };
      }

      // Normalize SQL for SQLite
      let normalizedSql = sql;

      // Convert PostgreSQL-specific syntax
      // $1, $2, etc → ? placeholders
      let paramIndex = 1;
      normalizedSql = normalizedSql.replace(/\$(\d+)/g, () => '?');

      // Handle DEFAULT values
      normalizedSql = normalizedSql.replace(/DEFAULT gen_random_uuid\(\)/g, 'DEFAULT (lower(hex(randomblob(4))) || hex(randomblob(2)) || hex(randomblob(2)))');

      // RETURNING clause - SQLite 3.35+ supports it

      const prepared = this.db.prepare(normalizedSql);

      // Determine if SELECT or INSERT/UPDATE/DELETE
      const upper = normalizedSql.trim().toUpperCase();
      const hasReturning = / RETURNING /i.test(normalizedSql);

      if (upper.startsWith('SELECT')) {
        const rows = prepared.all(...params);
        return { rows };
      } else if (upper.startsWith('INSERT')) {
        if (hasReturning) {
          // better-sqlite3 supports INSERT … RETURNING via .all()
          const rows = prepared.all(...params);
          return { rows };
        }
        prepared.run(...params);
        return { rows: [] };
      } else if (upper.startsWith('UPDATE')) {
        if (hasReturning) {
          const rows = prepared.all(...params);
          return { rows };
        }
        prepared.run(...params);
        return { rows: [] };
      } else if (upper.startsWith('DELETE')) {
        if (hasReturning) {
          const rows = prepared.all(...params);
          return { rows };
        }
        prepared.run(...params);
        return { rows: [] };
      } else if (upper.startsWith('CREATE')) {
        prepared.run(...params);
        return { rows: [] };
      } else {
        prepared.run(...params);
        return { rows: [] };
      }
    } catch (error) {
      console.error('SQLite Query Error:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  // Mimic pg Pool.connect() — return a client with query/release.
  // SQLite transactions are handled via BEGIN/COMMIT/ROLLBACK at this layer.
  async connect() {
    const pool = this;
    return {
      query: (sql, params) => pool.query(sql, params),
      release: () => {
        // no-op — single shared connection
      }
    };
  }

  end() {
    if (this.db) {
      this.db.close();
    }
  }

  on() {
    // No-op for compatibility
  }
}

export default SqlitePool;
