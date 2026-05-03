/**
 * TEST: Download flow
 *
 * Covers GET /api/download/:skillId?format=markdown|langchain|mcp
 *
 * Assertions:
 *  - Markdown download returns the correct Content-Type and filename
 *  - Markdown body contains the skill title, soul_hash, and five-layer sections
 *  - LangChain download returns a .py file with the skill name embedded
 *  - MCP download returns valid JSON with the correct soul_hash
 *  - Unknown format → 400
 *  - Non-existent skill → 404
 *  - Unpublished skill → 403  (forced via direct DB write after forge)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

let app, db, forgedSkill;

// ── Bootstrap ────────────────────────────────────────────────────────────────
beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  const { default: skillsRouter }    = await import('../routes/skills.js');
  const { default: downloadsRouter } = await import('../routes/downloads.js');
  app.use('/api/skills',   skillsRouter);
  app.use('/api/download', downloadsRouter);

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  // Forge a skill once for all download tests
  const res = await request(app)
    .post('/api/skills')
    .set('X-Anonymous-Id', 'dl-anon-1')
    .send({
      title: 'Download Test Skill',
      description: 'A skill for testing downloads.',
      domain: 'ideas',
      five_layer: VALID_FIVE_LAYER,
    });

  forgedSkill = res.body.skill;
});

// ── Markdown ─────────────────────────────────────────────────────────────────
describe('GET /api/download/:id?format=markdown', () => {
  it('returns 200 with text/markdown Content-Type', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown/i);
  });

  it('Content-Disposition filename contains the skill title', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.headers['content-disposition']).toMatch(/Download_Test_Skill/);
  });

  it('markdown body contains the skill title', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain('Download Test Skill');
  });

  it('markdown body contains the soul_hash', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain(forgedSkill.soul_hash);
  });

  it('markdown body contains all five-layer section headers', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    const md = res.text;
    expect(md).toContain('Layer 1');
    expect(md).toContain('Layer 2');
    expect(md).toContain('Layer 3');
    expect(md).toContain('Layer 4');
    expect(md).toContain('Layer 5');
  });

  it('markdown body includes the ready-to-prompt section', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain('READY TO PROMPT');
  });
});

// ── LangChain ─────────────────────────────────────────────────────────────────
describe('GET /api/download/:id?format=langchain', () => {
  it('returns 200 and a text/plain .py file', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=langchain`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/i);
    expect(res.headers['content-disposition']).toMatch(/\.py/);
  });

  it('python file contains the skill name', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=langchain`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain('Download Test Skill');
  });
});

// ── MCP ───────────────────────────────────────────────────────────────────────
describe('GET /api/download/:id?format=mcp', () => {
  it('returns 200 with application/json Content-Type', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=mcp`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/i);
  });

  it('MCP JSON contains the soul_hash as id', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=mcp`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    const json = JSON.parse(res.text);
    expect(json.id).toBe(forgedSkill.soul_hash);
  });
});

// ── Error cases ───────────────────────────────────────────────────────────────
describe('GET /api/download/:id — error cases', () => {
  it('returns 400 for unsupported format', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=pdf`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent skill', async () => {
    const res = await request(app)
      .get('/api/download/no-such-id?format=markdown')
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(404);
  });

  it('returns 403 when skill is unpublished', async () => {
    // Forge a skill, then flip published=0 directly in the test DB
    const forgeRes = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', 'dl-anon-1')
      .send({ title: 'Draft Skill', five_layer: VALID_FIVE_LAYER, domain: 'ideas' });

    const draftId = forgeRes.body.skill.id;
    db._sqlite.prepare('UPDATE skills SET published = 0 WHERE id = ?').run(draftId);

    const res = await request(app)
      .get(`/api/download/${draftId}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.status).toBe(403);
  });
});
