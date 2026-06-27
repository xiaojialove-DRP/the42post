/**
 * SMOKE TEST: one skill, the full real lifecycle
 *
 * Every other file in this directory tests one route in isolation with
 * its own fresh fixture. None of them prove the stages actually CHAIN —
 * that what Forge stores is what Archive lists, what Playground scores
 * against, and what Download ships back out. This file walks a single
 * skill through Forge -> Archive -> Playground -> Download in sequence,
 * the way a real session would, so a regression that only appears when
 * one stage's output feeds the next (a renamed field, a dropped column,
 * a shape change) gets caught here even if every route still passes its
 * own isolated tests.
 *
 * Real LLM generation (/forge/probe, /forge/preview-from-probe, and
 * /playground/test's happy path) is established as untestable in this
 * harness — see playground.test.js's header comment: routes are
 * imported directly here, bypassing server.js's dotenv.config(), so no
 * real DEEPSEEK_API_KEY/ANTHROPIC_API_KEY ever reaches them. This file
 * follows the same convention as the rest of the suite: skip straight to
 * a hand-built five_layer for Forge, and seed a skill_test_votes row for
 * Playground, then prove every non-LLM step chains correctly end-to-end.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

let app, db;
const ANON = 'smoke-test-device';
const READY_PROMPT = 'You are an assistant that always responds with maximum clarity. [smoke-test marker]';
let skill;

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  const { default: skillsRouter } = await import('../routes/skills.js');
  const { default: playgroundRouter } = await import('../routes/playground.js');
  const { default: downloadsRouter } = await import('../routes/downloads.js');
  app.use('/api/skills', skillsRouter);
  app.use('/api/playground', playgroundRouter);
  app.use('/api/download', downloadsRouter);

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

// Simulates a completed /test call — the same convention playground.test.js
// uses, since /test itself cannot succeed here without a real LLM key.
async function seedTestVote(skillId, { skillSide = 'A' } = {}) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO skill_test_votes
       (id, skill_id, scenario_key, anonymous_id, skill_side, diagnostic,
        scenario_text, response_a_text, response_b_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, skillId, 'smoke-scenario', ANON, skillSide, 'A is warmer.',
     'A scenario', 'Response A text', 'Response B text']
  );
  return id;
}

describe('Smoke: Forge -> Archive -> Playground -> Download', () => {
  it('Forge: publishing returns an id, soul_hash, and stores what we sent', async () => {
    const res = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', ANON)
      .send({
        title: 'Smoke Test Skill',
        description: 'End-to-end lifecycle check, not a real submission.',
        domain: 'ideas',
        five_layer: VALID_FIVE_LAYER,
        ready_to_use_prompt: READY_PROMPT,
        commercial_use: 'authorized',
        remix_allowed: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.skill.id).toBeTruthy();
    expect(res.body.skill.soul_hash).toBeTruthy();
    skill = res.body.skill;
  });

  it('Archive: the published skill shows up in the public listing immediately', async () => {
    const res = await request(app)
      .get('/api/skills')
      .set('X-Anonymous-Id', ANON);

    expect(res.status).toBe(200);
    expect(res.body.skills.map(s => s.id)).toContain(skill.id);
  });

  it("Playground: voting and rating a completed test updates this skill's record", async () => {
    const testId = await seedTestVote(skill.id, { skillSide: 'A' });

    const voteRes = await request(app)
      .post('/api/playground/vote')
      .send({ test_id: testId, chosen_side: 'A' });
    expect(voteRes.status).toBe(200);
    expect(voteRes.body.voted_for_skill).toBe(true);

    const feedbackRes = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: testId, rating: 'better' });
    expect(feedbackRes.status).toBe(200);
    expect(feedbackRes.body.counts.better).toBe(1);
  });

  it('Playground stats: the vote we just cast is reflected back for this skill', async () => {
    const res = await request(app).get(`/api/playground/stats/${skill.id}`);
    expect(res.status).toBe(200);
    expect(res.body.total_votes).toBe(1);
    expect(res.body.win_rate).toBe(1);
  });

  it("Archive: starring updates both the star endpoint and the listing's starlight_score", async () => {
    const starRes = await request(app)
      .post(`/api/skills/${skill.id}/star`)
      .set('X-Anonymous-Id', ANON)
      .send({ starred: true });
    expect(starRes.status).toBe(200);
    expect(starRes.body.totalStars).toBe(1);

    const listRes = await request(app)
      .get('/api/skills')
      .set('X-Anonymous-Id', ANON);
    const found = listRes.body.skills.find(s => s.id === skill.id);
    expect(found.starlight_score).toBe(1);
  });

  it('Download (markdown): ships the real title and the real ready-to-use prompt, not a placeholder', async () => {
    const res = await request(app)
      .get(`/api/download/${skill.id}?format=markdown`)
      .set('X-Anonymous-Id', ANON);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Smoke Test Skill');
    expect(res.text).toContain(READY_PROMPT);
  });

  it('Download (langchain): ships a .py file with the real title embedded', async () => {
    const res = await request(app)
      .get(`/api/download/${skill.id}?format=langchain`)
      .set('X-Anonymous-Id', ANON);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Smoke Test Skill');
  });

  it('Download (mcp): ships valid JSON whose id matches the soul_hash from Forge', async () => {
    const res = await request(app)
      .get(`/api/download/${skill.id}?format=mcp`)
      .set('X-Anonymous-Id', ANON);

    expect(res.status).toBe(200);
    const manifest = JSON.parse(res.text);
    expect(manifest.id).toBe(skill.soul_hash);
  });
});
