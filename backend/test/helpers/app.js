/**
 * Test app factory — builds an Express instance wired to a test DB.
 * Import this in every test file instead of the real server.js so tests
 * run against an isolated in-memory database and never touch production.
 */

import express from 'express';
import { createTestDb } from './db.js';

// ── Minimal five_layer fixture used across tests ─────────────────────
export const VALID_FIVE_LAYER = {
  defining:       'Test principle: always respond with clarity.',
  instantiating:  [{ before: 'Vague answer', after: 'Precise answer' }],
  fencing:        { applicable: 'When clarity is needed', notApplicable: 'Casual chat' },
  validating:     ['Does it improve clarity?'],
  contextualizing: 'Works across all cultures.'
};

export function buildApp() {
  const db = createTestDb();

  // Patch global.__db__ so routes that call getDb() work
  global.__db__ = db;

  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount only the routes under test
  // We do dynamic import inside the factory to ensure each test suite
  // gets a fresh module evaluation (important for global.__db__ patching).
  app._testDb = db;
  return { app, db };
}
