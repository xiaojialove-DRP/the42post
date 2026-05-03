/**
 * Dynamic DB proxy — reads from global.__db__ at call time.
 *
 * Routes import { db } from this module instead of directly from server.js.
 * Tests patch global.__db__ before importing routes, so every query
 * transparently hits the in-memory SQLite test database.
 * Production sets global.__db__ in server.js before any request arrives.
 */
export const db = {
  query(sql, params = []) {
    return global.__db__.query(sql, params);
  },
  connect() {
    return global.__db__.connect();
  }
};
