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

  it('Content-Disposition filename is ASCII-safe and skill-named', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    // New format (e83f21a): "42post-skill-<safe-title>.md" — title is
    // sanitized to ASCII so Chinese titles fall back safely.
    expect(res.headers['content-disposition']).toMatch(/42post-skill-.*\.md/);
  });

  it('markdown body contains the skill title', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain('Download Test Skill');
  });

  it('markdown body carries the protocol footer (provenance)', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    // New format drops the raw soul_hash from the body in favour of a
    // human-readable provenance footer.
    expect(res.text).toContain('Human Semantic Capital Protocol');
    expect(res.text).toContain('THE 42 POST');
  });

  it('markdown body contains the new reader-friendly section headers', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    const md = res.text;
    // New format (e83f21a): named sections replaced "Layer 1..5"
    expect(md).toContain('Core Belief');
    expect(md).toContain('When to Use / Avoid');
    expect(md).toContain("How to Know It's Working");
    expect(md).toContain('Cultural Adaptations');
    expect(md).toContain('Licensing');
  });

  it('markdown body opens with the Ready to Use system-prompt block', async () => {
    const res = await request(app)
      .get(`/api/download/${forgedSkill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-1');

    expect(res.text).toContain('Ready to Use');
    // The copy-paste hint mentions it works as a System Prompt
    expect(res.text).toMatch(/System Prompt/i);
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

// ── Creator attribution ─────────────────────────────────────────────────────
describe('GET /api/download/:id — creator name', () => {
  it('shows the name typed at forge time, not the generic anonymous account username', async () => {
    // No auth header here, so this skill's author_id is the shared
    // 'anonymous-user-001' sentinel, whose users.username is literally
    // "Anonymous" (db/init.js). Before the fix, downloads read that live
    // join unconditionally - every anonymous forger's download showed
    // "Author: Anonymous" no matter what name they actually typed.
    const forgeRes = await request(app)
      .post('/api/skills')
      .set('X-Anonymous-Id', 'dl-anon-creator')
      .send({
        title: 'Named Creator Skill',
        five_layer: VALID_FIVE_LAYER,
        domain: 'ideas',
        creatorName: 'moon_xu',
      });
    expect(forgeRes.status).toBe(201);

    const res = await request(app)
      .get(`/api/download/${forgeRes.body.skill.id}?format=markdown`)
      .set('X-Anonymous-Id', 'dl-anon-creator');

    expect(res.status).toBe(200);
    expect(res.text).toContain('moon_xu');
    expect(res.text).not.toMatch(/\bAnonymous\b/);
  });
});
