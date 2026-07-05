/**
 * TEST: Email sending functionality
 *
 * Tests email route validation and error handling
 * 1. POST /api/email/send-forge-success → validates required fields
 * 2. POST /api/email/test → test email configuration
 * 3. GET  /api/email/diagnostics → reports email config status
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestDb } from './helpers/db.js';

let app, db;

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  // /api/email/test is now admin-gated; give the suite a key to exercise it.
  process.env.ADMIN_KEY = 'test-admin-key';

  app = express();
  app.use(express.json());

  // Import email router AFTER patching global.__db__
  const { default: emailRouter } = await import('../routes/email.js');
  app.use('/api/email', emailRouter);

  // Global error handler
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

describe('POST /api/email/send-forge-success', () => {
  it('rejects request with missing recipientEmail', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientName: 'Test User',
        skillTitle: 'Test Skill',
        soulHash: 'SOUL_abc123def456_2026-05-12'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
    expect(res.body.message).toMatch(/recipientEmail/i);
  });

  it('rejects request with invalid email format', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'not-an-email',
        recipientName: 'Test User',
        skillTitle: 'Test Skill',
        soulHash: 'SOUL_abc123def456_2026-05-12'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
    expect(res.body.message).toMatch(/email/i);
  });

  it('rejects request with missing skillId', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
    expect(res.body.message).toMatch(/skillId/i);
  });

  it('rejects an unknown skillId (content is bound to a real skill)', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        skillId: 'no-such-skill-id'
      });

    // The skill title / soul-hash are read from the DB, not the request —
    // an id that matches no skill can't be used to send arbitrary email.
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('POST /api/email/test', () => {
  it('rejects an unauthenticated request (admin-gated)', async () => {
    const res = await request(app)
      .post('/api/email/test')
      .send({ testEmail: 'tester@example.com' });

    // No x-admin-key → forbidden. Prevents use as an open mail relay.
    expect(res.status).toBe(403);
  });

  it('rejects test email request without testEmail', async () => {
    const res = await request(app)
      .post('/api/email/test')
      .set('x-admin-key', 'test-admin-key')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('accepts test email with valid email address and admin key', async () => {
    const res = await request(app)
      .post('/api/email/test')
      .set('x-admin-key', 'test-admin-key')
      .send({
        testEmail: 'tester@example.com'
      });

    // Should return 500 if SMTP not configured, but should parse the email
    // In test environment, SMTP will fail, but we're testing the validation logic
    expect([200, 500]).toContain(res.status);
  });
});

describe('GET /api/email/diagnostics', () => {
  it('returns email configuration status', async () => {
    const res = await request(app)
      .get('/api/email/diagnostics');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.resend_api_key).toBeTruthy();
    expect(res.body.email_from).toBeTruthy();
    expect(res.body.email_from_name).toBeTruthy();
    expect(res.body.ready).toBeDefined();
  });

  it('reports whether using test sender', async () => {
    const res = await request(app)
      .get('/api/email/diagnostics');

    expect(res.status).toBe(200);
    expect(res.body.using_test_sender).toBeDefined();
    // In test environment, typically using_test_sender is true
    if (res.body.using_test_sender) {
      expect(res.body.warning).toBeTruthy();
    }
  });

  it('includes API key prefix without exposing full key', async () => {
    const res = await request(app)
      .get('/api/email/diagnostics');

    expect(res.status).toBe(200);
    if (res.body.resend_api_key.present) {
      // Should show prefix but not full key
      expect(res.body.resend_api_key.prefix).toBeTruthy();
      expect(res.body.resend_api_key.prefix).toMatch(/^\w{6}\.\.\./);
    }
  });
});
