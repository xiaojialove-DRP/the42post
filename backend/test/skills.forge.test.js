/**
 * TEST: Forge flow
 *
 * 1. POST /api/skills → skill stored in DB
 * 2. GET  /api/skills → newly forged skill appears first
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

// ── Bootstrap ────────────────────────────────────────────────────────
let app, db;

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  // Import route AFTER patching global.__db__
  const { default: skillsRouter } = await import('../routes/skills.js');
  app.use('/api/skills', skillsRouter);

  // Global error handler so test assertions see JSON errors
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

// ── Tests ────────────────────────────────────────────────────────────

describe('POST /api/skills — forge a skill', () => {
  it('rejects a missing title', async () => {
    const res = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', 'test-anon-1')
      .send({ five_layer: VALID_FIVE_LAYER, domain: 'ideas' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/title/i);
  });

  it('rejects an empty five_layer object', async () => {
    const res = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', 'test-anon-1')
      .send({ title: 'Empty Skill', five_layer: {}, domain: 'ideas' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/five_layer/i);
  });

  it('stores a valid skill and returns id + soul_hash', async () => {
    const res = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', 'test-anon-1')
      .send({
        title: 'The Clarity Principle',
        description: 'AI should always respond with maximum clarity.',
        domain: 'ideas',
        five_layer: VALID_FIVE_LAYER,
        commercial_use: 'authorized',
        remix_allowed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.skill).toMatchObject({
      title: 'The Clarity Principle',
      domain: 'ideas',
    });
    expect(res.body.skill.id).toBeTruthy();
    expect(res.body.skill.soul_hash).toBeTruthy();
  });
});

describe('GET /api/skills — archive listing', () => {
  it('returns newly forged skill', async () => {
    const res = await request(app)
      .get('/api/skills')
      .set('X-Anonymous-Id', 'test-anon-1');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.skills)).toBe(true);

    const titles = res.body.skills.map(s => s.title);
    expect(titles).toContain('The Clarity Principle');
  });

  it('newest skill appears at the top (published_at DESC)', async () => {
    const res = await request(app)
      .get('/api/skills')
      .set('X-Anonymous-Id', 'test-anon-1');

    expect(res.status).toBe(200);
    expect(res.body.skills[0].title).toBe('The Clarity Principle');
  });

  it('search by title returns matching skill', async () => {
    const res = await request(app)
      .get('/api/skills?search=Clarity')
      .set('X-Anonymous-Id', 'test-anon-1');

    expect(res.status).toBe(200);
    expect(res.body.skills.length).toBeGreaterThan(0);
    expect(res.body.skills[0].title).toMatch(/Clarity/i);
  });

  it('search with no match returns empty array', async () => {
    const res = await request(app)
      .get('/api/skills?search=xyzzy_nonexistent_42')
      .set('X-Anonymous-Id', 'test-anon-1');

    expect(res.status).toBe(200);
    expect(res.body.skills).toHaveLength(0);
  });
});
