/**
 * TEST: Star flow
 *
 * Covers POST /api/skills/:id/star (toggle) and GET /api/skills/:id/stars
 *
 * Assertions:
 *  - Starring a skill increments totalStars and syncs skills.starlight_score
 *  - Un-starring decrements both
 *  - Same device can toggle without creating duplicate rows
 *  - A different device's star is independent (both count)
 *  - Missing X-Anonymous-Id header → 400
 *  - Non-boolean `starred` → 400
 *  - Non-existent skill → 404
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

let app, db;

// ── Bootstrap ────────────────────────────────────────────────────────────────
beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  const { default: skillsRouter } = await import('../routes/skills.js');
  app.use('/api/skills', skillsRouter);

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function forgeSkill(title = 'Star Test Skill') {
  const res = await request(app)
    .post('/api/skills')
    .set('X-Anonymous-Id', 'star-test-anon')
    .send({ title, five_layer: VALID_FIVE_LAYER, domain: 'ideas' });
  return res.body.skill;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/skills/:id/star', () => {
  it('rejects request missing X-Anonymous-Id header', async () => {
    const skill = await forgeSkill('No-Anon Skill');

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .send({ starred: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/anonymous/i);
  });

  it('rejects non-boolean starred value', async () => {
    const skill = await forgeSkill('Bad-Type Skill');

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'star-anon-1')
      .send({ starred: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/boolean/i);
  });

  it('returns 404 for unknown skill id', async () => {
    const res = await request(app)
      .post('/api/skills/nonexistent-id/star')
      .set('X-Anonymous-Id', 'star-anon-1')
      .send({ starred: true });

    expect(res.status).toBe(404);
  });

  it('starring increments totalStars to 1', async () => {
    const skill = await forgeSkill('Increment Skill');

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'star-anon-1')
      .send({ starred: true });

    expect(res.status).toBe(200);
    expect(res.body.starred).toBe(true);
    expect(res.body.totalStars).toBe(1);
  });

  it('starlight_score on the skill row matches totalStars after a star', async () => {
    const skill = await forgeSkill('Sync Score Skill');

    await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'sync-anon-1')
      .send({ starred: true });

    // Fetch the skill back and check starlight_score
    const listRes = await request(app)
      .get('/api/skills')
      .set('X-Anonymous-Id', 'sync-anon-1');

    const found = listRes.body.skills.find(s => s.id === skill.id);
    expect(found).toBeDefined();
    expect(found.starlight_score).toBe(1);
  });

  it('two different devices starring gives totalStars = 2', async () => {
    const skill = await forgeSkill('Two-Stars Skill');

    await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'device-A')
      .send({ starred: true });

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'device-B')
      .send({ starred: true });

    expect(res.body.totalStars).toBe(2);
  });

  it('same device starring twice only counts once', async () => {
    const skill = await forgeSkill('Idempotent Skill');

    await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'repeat-anon')
      .send({ starred: true });

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'repeat-anon')
      .send({ starred: true });

    expect(res.body.totalStars).toBe(1);
  });

  it('un-starring decrements totalStars back to 0', async () => {
    const skill = await forgeSkill('Unstar Skill');

    await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'unstar-anon')
      .send({ starred: true });

    const res = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'unstar-anon')
      .send({ starred: false });

    expect(res.status).toBe(200);
    expect(res.body.starred).toBe(false);
    expect(res.body.totalStars).toBe(0);
  });
});

describe('GET /api/skills/:id/stars', () => {
  it('returns totalStars and userStarred = false before any star', async () => {
    const skill = await forgeSkill('Stars Query Skill');

    const res = await request(app)
      .get(`/api/skills/${skill.id}/stars`)
      .set('X-Anonymous-Id', 'query-anon');

    expect(res.status).toBe(200);
    expect(res.body.totalStars).toBe(0);
    expect(res.body.userStarred).toBe(false);
  });

  it('reflects userStarred = true after this device stars', async () => {
    const skill = await forgeSkill('Stars Reflect Skill');

    await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', 'reflect-anon')
      .send({ starred: true });

    const res = await request(app)
      .get(`/api/skills/${skill.id}/stars`)
      .set('X-Anonymous-Id', 'reflect-anon');

    expect(res.body.userStarred).toBe(true);
    expect(res.body.totalStars).toBe(1);
  });
});
