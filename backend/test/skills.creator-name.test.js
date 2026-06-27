/**
 * TEST: Creator name stays attached to the skill that was actually
 * published under it, even if the same account renames itself later.
 *
 * Real bug, reported by a real user: forge-session lets one account
 * (matched by email) change its username on every call ("keep username
 * up to date if creator rebrands themselves" - auth.js). Without a
 * per-skill snapshot, every skill ever published by that account would
 * retroactively show whichever name the account happens to have *today*.
 * skills.creator_anonymous_id is written once at forge time specifically
 * to prevent this; this test proves the Archive listing actually prefers
 * that snapshot over the live users.username join.
 */

// Set before any imports — generateToken() needs this and forge-session
// is the route under test here (see auth.test.js for the same pattern).
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './helpers/db.js';
import { VALID_FIVE_LAYER } from './helpers/app.js';

let app, db;

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  const { default: authRouter } = await import('../routes/auth.js');
  const { default: skillsRouter } = await import('../routes/skills.js');
  app.use('/api/auth', authRouter);
  app.use('/api/skills', skillsRouter);

  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

it("a skill keeps the username it was forged under after the same account renames itself", async () => {
  const email = 'rebrand-test@example.com';

  // First forge, as "old_name".
  const session1 = await request(app)
    .post('/api/auth/forge-session')
    .send({ email, username: 'old_name' });
  expect(session1.status).toBe(200);

  const skill1 = await request(app)
    .post('/api/skills')
    .set('Authorization', `Bearer ${session1.body.token}`)
    .send({
      title: 'First Skill',
      domain: 'ideas',
      five_layer: VALID_FIVE_LAYER,
      creatorName: 'old_name',
    });
  expect(skill1.status).toBe(201);

  // Same email, new username - forge-session updates the one account's
  // username (this is the real, intentional "rebrand" behavior).
  const session2 = await request(app)
    .post('/api/auth/forge-session')
    .send({ email, username: 'new_name' });
  expect(session2.status).toBe(200);
  expect(session2.body.user.username).toBe('new_name');

  const skill2 = await request(app)
    .post('/api/skills')
    .set('Authorization', `Bearer ${session2.body.token}`)
    .send({
      title: 'Second Skill',
      domain: 'ideas',
      five_layer: VALID_FIVE_LAYER,
      creatorName: 'new_name',
    });
  expect(skill2.status).toBe(201);

  // Both skills share the same underlying account (author_id) - that's
  // the whole point of the test.
  expect(skill1.body.skill.author_id).toBe(skill2.body.skill.author_id);

  // The Archive listing must show each skill under the name it was
  // actually published with, not both under "new_name".
  const listing = await request(app).get('/api/skills');
  expect(listing.status).toBe(200);

  const first = listing.body.skills.find(s => s.title === 'First Skill');
  const second = listing.body.skills.find(s => s.title === 'Second Skill');
  expect(first.creator_name).toBe('creator_old_name');
  expect(second.creator_name).toBe('creator_new_name');
});
