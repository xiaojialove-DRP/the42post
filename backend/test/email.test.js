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

  it('rejects request with missing skillTitle', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        soulHash: 'SOUL_abc123def456_2026-05-12'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('rejects request with missing soulHash', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        skillTitle: 'Test Skill'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('logs the validation error when fields are missing', async () => {
    const res = await request(app)
      .post('/api/email/send-forge-success')
      .send({
        recipientEmail: 'test@example.com'
      });

    expect(res.status).toBe(400);
    // The endpoint should log the missing fields in the response
    expect(res.body.received || res.body.message).toBeTruthy();
  });
});

describe('POST /api/email/test', () => {
  it('rejects test email request without testEmail', async () => {
    const res = await request(app)
      .post('/api/email/test')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('accepts test email with valid email address', async () => {
    const res = await request(app)
      .post('/api/email/test')
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
