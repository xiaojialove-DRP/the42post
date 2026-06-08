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
        // Multiple statements — must prepare each individually
        const statements = sql.split(';').filter(s => s.trim());
        const results = [];

        for (const stmt of statements) {
          const s = stmt.trim();
          if (!s) continue;

          let normalizedStmt = s
            .replace(/\$(\d+)/g, () => '?')
            .replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');

          try {
            const prepared = this.db.prepare(normalizedStmt);
            const upper = normalizedStmt.trim().toUpperCase();

            if (upper.startsWith('SELECT')) {
              results.push(prepared.all(...params));
            } else {
              prepared.run(...params);
            }
          } catch (err) {
            console.error(`Multi-statement execution failed at: ${s}`);
            throw new Error(`Multi-statement failed: ${err.message}`);
          }
        }
        return { rows: results[0] || [] };
      }

      // Normalize SQL for SQLite
      let normalizedSql = sql;

      // Convert PostgreSQL-specific syntax
      // $1, $2, etc → ? placeholders
      // IMPORTANT: Track order of references to rebuild params array correctly.
      // PostgreSQL uses $N by position (params[0] = $1), and $N can appear multiple times.
      // SQLite uses positional ? so we need to expand params to match occurrences.
      const paramOrder = [];
      normalizedSql = normalizedSql.replace(/\$(\d+)/g, (_, n) => {
        paramOrder.push(parseInt(n, 10) - 1); // 0-based index into original params
        return '?';
      });
      // Rebuild params array in the order they appear in the SQL
      if (paramOrder.length > 0 && params.length > 0) {
        params = paramOrder.map(i => params[i]);
      }

      // Handle DEFAULT values
      normalizedSql = normalizedSql.replace(/DEFAULT gen_random_uuid\(\)/g, 'DEFAULT (lower(hex(randomblob(4))) || hex(randomblob(2)) || hex(randomblob(2)))');

      // PostgreSQL → SQLite function compatibility
      // NOW() → CURRENT_TIMESTAMP (used heavily by seed SQL)
      // \b ensures we don't match "ELSEWNOW" or similar; case-insensitive.
      normalizedSql = normalizedSql.replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');

      // ILIKE → LIKE (SQLite LIKE is case-insensitive for ASCII by default)
      normalizedSql = normalizedSql.replace(/\bILIKE\b/g, 'LIKE');

      // RETURNING clause - SQLite 3.35+ supports it

      const prepared = this.db.prepare(normalizedSql);

      // Determine if SELECT or INSERT/UPDATE/DELETE
      const upper = normalizedSql.trim().toUpperCase();
      const hasReturning = / RETURNING /i.test(normalizedSql);

      if (upper.startsWith('SELECT')) {
        const rows = prepared.all(...params);
        return { rows, rowCount: rows.length };
      } else if (upper.startsWith('INSERT')) {
        if (hasReturning) {
          const rows = prepared.all(...params);
          return { rows, rowCount: rows.length };
        }
        const result = prepared.run(...params);
        return { rows: [], rowCount: result.changes };
      } else if (upper.startsWith('UPDATE')) {
        if (hasReturning) {
          const rows = prepared.all(...params);
          return { rows, rowCount: rows.length };
        }
        const result = prepared.run(...params);
        return { rows: [], rowCount: result.changes };
      } else if (upper.startsWith('DELETE')) {
        if (hasReturning) {
          const rows = prepared.all(...params);
          return { rows, rowCount: rows.length };
        }
        const result = prepared.run(...params);
        return { rows: [], rowCount: result.changes };
      } else if (upper.startsWith('CREATE')) {
        prepared.run(...params);
        return { rows: [], rowCount: 0 };
      } else {
        prepared.run(...params);
        return { rows: [], rowCount: 0 };
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
