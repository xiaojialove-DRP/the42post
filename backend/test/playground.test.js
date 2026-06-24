/**
 * TEST: Playground routes (Twin Test)
 *
 * playground.js had zero test coverage before this file - the most
 * severe bug found in a recent debug pass (Twin Test leaking raw
 * provider errors to the client) lived in exactly this route, undetected
 * because nothing exercised it. POST /test itself calls a real LLM
 * provider, so its happy path (two generated responses) is not
 * deterministically testable here without mocking - this file covers
 * input validation and the failure path for /test (which reliably
 * fails in this environment, since no real DEEPSEEK_API_KEY/
 * ANTHROPIC_API_KEY reaches a route imported directly rather than
 * through server.js's dotenv.config()), and fully covers the five
 * other routes, none of which call an LLM.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

let app, db;

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  const { default: skillsRouter } = await import('../routes/skills.js');
  const { default: playgroundRouter } = await import('../routes/playground.js');
  app.use('/api/skills', skillsRouter);
  app.use('/api/playground', playgroundRouter);

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
async function forgeSkill(title = 'Playground Test Skill', extra = {}) {
  const res = await request(app)
    .post('/api/skills')
    .set('X-Anonymous-Id', 'playground-test-anon')
    .send({ title, five_layer: VALID_FIVE_LAYER, domain: 'ideas', ...extra });
  return res.body.skill;
}

// Inserts a skill_test_votes row directly, simulating a completed /test
// call, so /vote and /feedback (which both look up an existing test_id)
// can be tested without depending on a real LLM call.
async function seedTestVote(skillId, { skillSide = 'A', scenarioKey = 'scenario-1' } = {}) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO skill_test_votes
       (id, skill_id, scenario_key, anonymous_id, skill_side, diagnostic,
        scenario_text, response_a_text, response_b_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, skillId, scenarioKey, 'seed-anon', skillSide, 'A is warmer.', 'A scenario', 'Response A text', 'Response B text']
  );
  return id;
}

// ── POST /test ───────────────────────────────────────────────────────────────
describe('POST /api/playground/test', () => {
  it('rejects missing skill_id', async () => {
    const res = await request(app)
      .post('/api/playground/test')
      .send({ scenario: { title: 'A scenario' } });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/skill_id/i);
  });

  it('rejects missing scenario', async () => {
    const skill = await forgeSkill('Missing Scenario Skill');
    const res = await request(app)
      .post('/api/playground/test')
      .send({ skill_id: skill.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/scenario/i);
  });

  it('returns 404 for a nonexistent skill', async () => {
    const res = await request(app)
      .post('/api/playground/test')
      .send({ skill_id: 'nonexistent-id', scenario: { title: 'A scenario' } });

    expect(res.status).toBe(404);
  });

  it('on generation failure, never leaks the raw provider error to the client', async () => {
    // No real DEEPSEEK_API_KEY/ANTHROPIC_API_KEY reaches this process (routes
    // are imported directly in tests, bypassing server.js's dotenv.config()),
    // so generation reliably fails here - this is exactly the path that used
    // to render "DeepSeek HTTP 401: {...}" straight into the UI.
    const skill = await forgeSkill('Generation Failure Skill');
    const res = await request(app)
      .post('/api/playground/test')
      .send({ skill_id: skill.id, scenario: { title: 'A user asks for advice.' } });

    expect(res.status).toBe(502);
    expect(res.body.message).not.toMatch(/DeepSeek|Claude|api[_ ]?key|401|403/i);
    expect(res.body.message).toMatch(/try again/i);
  });

  it('returns the Chinese failure message when the scenario is in Chinese', async () => {
    const skill = await forgeSkill('Generation Failure Skill CN');
    const res = await request(app)
      .post('/api/playground/test')
      .send({ skill_id: skill.id, scenario: { title: '用户向AI寻求建议。' } });

    expect(res.status).toBe(502);
    expect(res.body.message).toBe('生成暂时失败了，请稍后再试一次。');
  });
});

// ── POST /feedback ───────────────────────────────────────────────────────────
describe('POST /api/playground/feedback', () => {
  it('rejects missing test_id', async () => {
    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ rating: 'better' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/test_id/i);
  });

  it('rejects an invalid rating', async () => {
    const skill = await forgeSkill('Feedback Invalid Rating Skill');
    const testId = await seedTestVote(skill.id);

    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: testId, rating: 'amazing' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/better.*worse.*no_diff|rating/i);
  });

  it('returns 404 for a nonexistent test_id', async () => {
    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: 'nonexistent-test-id', rating: 'better' });

    expect(res.status).toBe(404);
  });

  it('accepts a valid rating and returns counts', async () => {
    const skill = await forgeSkill('Feedback Valid Skill');
    const testId = await seedTestVote(skill.id);

    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: testId, rating: 'better', comment: 'Felt more thoughtful.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.counts.better).toBe(1);
    expect(res.body.total).toBe(1);
    expect(res.body.better_rate).toBe(1);
  });

  it('truncates a comment longer than 140 characters', async () => {
    const skill = await forgeSkill('Feedback Long Comment Skill');
    const testId = await seedTestVote(skill.id);
    const longComment = 'x'.repeat(200);

    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: testId, rating: 'no_diff', comment: longComment });

    expect(res.status).toBe(200);

    const row = (await db.query(
      `SELECT comment FROM skill_feedback WHERE skill_id = $1`,
      [skill.id]
    )).rows[0];
    expect(row.comment.length).toBe(140);
  });

  it('aggregates better/worse/no_diff counts and better_rate across multiple submissions', async () => {
    const skill = await forgeSkill('Feedback Aggregate Skill');
    const ratings = ['better', 'better', 'worse', 'no_diff'];

    for (const rating of ratings) {
      const testId = await seedTestVote(skill.id);
      await request(app).post('/api/playground/feedback').send({ test_id: testId, rating });
    }

    const res = await request(app)
      .post('/api/playground/feedback')
      .send({ test_id: await seedTestVote(skill.id), rating: 'better' });

    expect(res.body.counts).toEqual({ better: 3, worse: 1, no_diff: 1 });
    expect(res.body.total).toBe(5);
    expect(res.body.better_rate).toBe(3 / 5);
  });
});

// ── POST /vote ───────────────────────────────────────────────────────────────
describe('POST /api/playground/vote', () => {
  it('rejects missing test_id', async () => {
    const res = await request(app)
      .post('/api/playground/vote')
      .send({ chosen_side: 'A' });

    expect(res.status).toBe(400);
  });

  it('rejects a chosen_side outside A/B', async () => {
    const skill = await forgeSkill('Vote Invalid Side Skill');
    const testId = await seedTestVote(skill.id);

    const res = await request(app)
      .post('/api/playground/vote')
      .send({ test_id: testId, chosen_side: 'C' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a nonexistent test_id', async () => {
    const res = await request(app)
      .post('/api/playground/vote')
      .send({ test_id: 'nonexistent-test-id', chosen_side: 'A' });

    expect(res.status).toBe(404);
  });

  it('voting for the skill side reports voted_for_skill = true and win_rate = 1', async () => {
    const skill = await forgeSkill('Vote Win Skill');
    const testId = await seedTestVote(skill.id, { skillSide: 'A' });

    const res = await request(app)
      .post('/api/playground/vote')
      .send({ test_id: testId, chosen_side: 'A' });

    expect(res.status).toBe(200);
    expect(res.body.voted_for_skill).toBe(true);
    expect(res.body.win_rate).toBe(1);
  });

  it('voting against the skill side reports voted_for_skill = false', async () => {
    const skill = await forgeSkill('Vote Loss Skill');
    const testId = await seedTestVote(skill.id, { skillSide: 'A' });

    const res = await request(app)
      .post('/api/playground/vote')
      .send({ test_id: testId, chosen_side: 'B' });

    expect(res.status).toBe(200);
    expect(res.body.voted_for_skill).toBe(false);
    expect(res.body.win_rate).toBe(0);
  });

  it('a second vote on the same test_id is ignored (first vote wins)', async () => {
    const skill = await forgeSkill('Vote Idempotent Skill');
    const testId = await seedTestVote(skill.id, { skillSide: 'A' });

    await request(app).post('/api/playground/vote').send({ test_id: testId, chosen_side: 'A' });
    const res = await request(app).post('/api/playground/vote').send({ test_id: testId, chosen_side: 'B' });

    // Still reflects the FIRST vote (A, a win), not the second (B, a loss).
    expect(res.body.voted_for_skill).toBe(true);
  });
});

// ── GET /picker ──────────────────────────────────────────────────────────────
describe('GET /api/playground/picker', () => {
  it('returns published skills', async () => {
    await forgeSkill('Picker Skill One');
    const res = await request(app).get('/api/playground/picker');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.skills)).toBe(true);
    expect(res.body.skills.length).toBeGreaterThan(0);
  });

  it('respects the limit query param', async () => {
    const res = await request(app).get('/api/playground/picker?limit=1');

    expect(res.status).toBe(200);
    expect(res.body.skills.length).toBeLessThanOrEqual(1);
  });

  it('marks the requesting device’s own skill as is_mine', async () => {
    // skills.js always normalizes the creator identity to creator_<name>
    // (routes/skills.js normalizeCreatorName), even for anonymous-only
    // forges keyed off just the X-Anonymous-Id header - so matching by
    // anonymous_id alone is not enough; the picker query also needs
    // creator_name so its creator_<x> ownerKey lines up with what got
    // stored at forge time.
    await forgeSkill('My Own Picker Skill');

    const res = await request(app)
      .get('/api/playground/picker?creator_name=playground-test-anon&limit=20');

    const mine = res.body.skills.find(s => s.title === 'My Own Picker Skill');
    expect(mine).toBeDefined();
    expect(mine.is_mine).toBe(true);
  });

  it('excludes the given domain when exclude_domain is set', async () => {
    await forgeSkill('Excluded Domain Skill', { domain: 'safety' });

    const res = await request(app).get('/api/playground/picker?exclude_domain=safety&limit=50');

    const titles = res.body.skills.map(s => s.title);
    expect(titles).not.toContain('Excluded Domain Skill');
  });
});

// ── GET /stats-batch and GET /stats/:skill_id ────────────────────────────────
describe('GET /api/playground/stats-batch and /stats/:skill_id', () => {
  it('stats-batch omits skills with zero activity', async () => {
    const skill = await forgeSkill('No Activity Skill');
    const res = await request(app).get('/api/playground/stats-batch');

    expect(res.status).toBe(200);
    expect(res.body.stats[skill.id]).toBeUndefined();
  });

  it('stats-batch reports tests and win_rate after feedback', async () => {
    const skill = await forgeSkill('Active Skill');
    const testId1 = await seedTestVote(skill.id);
    const testId2 = await seedTestVote(skill.id);
    await request(app).post('/api/playground/feedback').send({ test_id: testId1, rating: 'better' });
    await request(app).post('/api/playground/feedback').send({ test_id: testId2, rating: 'worse' });

    const res = await request(app).get('/api/playground/stats-batch');

    expect(res.body.stats[skill.id]).toMatchObject({
      tests: 2,
      better: 1,
      worse: 1,
      no_diff: 0,
      rated: 2,
      win_rate: 50
    });
  });

  it('stats/:skill_id returns zero votes for an untested skill', async () => {
    const skill = await forgeSkill('Untested Skill');
    const res = await request(app).get(`/api/playground/stats/${skill.id}`);

    expect(res.status).toBe(200);
    expect(res.body.total_votes).toBe(0);
    expect(res.body.win_rate).toBeNull();
  });

  it('stats/:skill_id reflects win_rate after votes', async () => {
    const skill = await forgeSkill('Voted Skill');
    const testId = await seedTestVote(skill.id, { skillSide: 'A' });
    await request(app).post('/api/playground/vote').send({ test_id: testId, chosen_side: 'A' });

    const res = await request(app).get(`/api/playground/stats/${skill.id}`);

    expect(res.body.total_votes).toBe(1);
    expect(res.body.win_rate).toBe(1);
  });
});
