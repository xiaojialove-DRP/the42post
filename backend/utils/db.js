/**
 * Dynamic DB proxy — reads from global.__db__ at call time.
 *
 * Routes import { db } from this module instead of directly from server.js.
 * Tests patch global.__db__ before importing routes, so every query
 * transparently hits the in-memory SQLite test database.
 * Production sets global.__db__ in server.js before any request arrives.
 */
import { retryDbOperation } from './dbRetry.js';

// Only SELECT/WITH are auto-retried here. dbRetry.js already separates
// queryWithRetry from mutateWithRetry on purpose: a transient network
// timeout on an INSERT/UPDATE/DELETE is ambiguous — the write may have
// already landed on the server and only the acknowledgement was lost, so
// blindly retrying it risks a duplicate write. A read has no such risk,
// so it is the one category safe to retry automatically for every one of
// the 70+ call sites across the route files without touching any of them.
// Routes that need retry on a specific, known-idempotent mutation should
// still call mutateWithRetry() explicitly at that call site.
const READ_ONLY_SQL = /^\s*(SELECT|WITH)\b/i;

export const db = {
  query(sql, params = []) {
    if (READ_ONLY_SQL.test(sql)) {
      return retryDbOperation(() => global.__db__.query(sql, params), 2);
    }
    return global.__db__.query(sql, params);
  },
  connect() {
    return global.__db__.connect();
  }
};
