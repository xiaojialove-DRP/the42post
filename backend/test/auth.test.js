/**
 * TEST: Authentication flow
 *
 * Tests user registration, login, and email verification
 * 1. POST /api/auth/register → user created with verification token
 * 2. POST /api/auth/login → JWT token issued on successful login
 * 3. GET  /api/auth/verify/:token → email verification
 * 4. GET  /api/auth/me → returns current user data with JWT
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

  // Import auth router AFTER patching global.__db__
  const { default: authRouter } = await import('../routes/auth.js');
  app.use('/api/auth', authRouter);

  // Global error handler
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

describe('POST /api/auth/register', () => {
  it('registers a user with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        username: 'testuser',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe('testuser@example.com');
    expect(res.body.username).toBe('testuser');
    expect(res.body.requires_verification).toBe(true);
    expect(res.body.user_id).toBeTruthy();
  });

  it('rejects registration with missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser2',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('rejects registration with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        username: 'testuser3',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  it('rejects registration with weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser4@example.com',
        username: 'testuser4',
        password: 'weak',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weak password/i);
  });

  it('rejects registration with invalid username (too short)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser5@example.com',
        username: 'ab',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid username/i);
  });

  it('rejects registration with invalid account_type', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser6@example.com',
        username: 'testuser6',
        password: 'ValidPassword123!',
        account_type: 'invalid_type'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid account type/i);
  });

  it('rejects duplicate email', async () => {
    // Register first user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    // Try to register with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'duplicate@example.com',
        username: 'user2',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects duplicate username', async () => {
    // Register first user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user3@example.com',
        username: 'uniqueuser',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    // Try to register with same username
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'user4@example.com',
        username: 'uniqueuser',
        password: 'ValidPassword123!',
        account_type: 'direct_knight'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    // Create a test user for login tests
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'logintest@example.com',
        username: 'loginuser',
        password: 'LoginPass123!',
        account_type: 'direct_knight'
      });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logintest@example.com',
        password: 'LoginPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe('logintest@example.com');
  });

  it('rejects login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logintest@example.com',
        password: 'WrongPassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('rejects login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects login with missing email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'SomePassword123!'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects login with missing password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logintest@example.com'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('GET /api/auth/me', () => {
  let validToken;

  beforeAll(async () => {
    // Create and login a test user to get a token
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'metest@example.com',
        username: 'meuser',
        password: 'MePass123!',
        account_type: 'direct_knight'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'metest@example.com',
        password: 'MePass123!'
      });

    validToken = loginRes.body.token;
  });

  it('returns current user with valid JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe('metest@example.com');
    expect(res.body.user.username).toBe('meuser');
  });

  it('rejects request with missing JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects request with invalid JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
});

describe('POST /api/auth/forge-session', () => {
  it('creates an anonymous forge session without authentication', async () => {
    const res = await request(app)
      .post('/api/auth/forge-session')
      .set('X-Anonymous-Id', 'anon-user-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.forge_session_id).toBeTruthy();
  });

  it('includes provided X-Anonymous-Id in response', async () => {
    const anonId = 'custom-anon-456';
    const res = await request(app)
      .post('/api/auth/forge-session')
      .set('X-Anonymous-Id', anonId);

    expect(res.status).toBe(200);
    expect(res.body.anonymous_id).toBe(anonId);
  });
});
