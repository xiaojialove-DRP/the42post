/**
 * TEST: Authentication flow
 *
 * /register and /verify were removed (no-registration product decision —
 * forge-session is the only entry point, Soul-Hash serves as identity).
 * /login and /me are kept as live API surface even though no frontend
 * flow calls them, so they still need coverage. With no /register left
 * to create fixtures through, tests insert verified users directly into
 * the test DB instead.
 *
 * 1. createVerifiedUser() → inserts a ready-to-login user directly
 * 2. POST /api/auth/login → JWT token issued on successful login
 * 3. GET  /api/auth/me → returns current user data with JWT
 * 4. POST /api/auth/forge-session → zero-friction anonymous auth
 */

// Set test environment variables before importing anything
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createTestDb } from './helpers/db.js';

let app, db, hashPassword;

// Inserts a user directly into the test DB, bypassing the removed
// /register endpoint. Returns the generated user id.
async function createVerifiedUser({ email, username, password }) {
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  await db.query(
    `INSERT INTO users (id, email, username, password_hash, account_type, verified)
     VALUES ($1, $2, $3, $4, $5, 1)`,
    [id, email, username, passwordHash, 'direct_knight']
  );
  return id;
}

beforeAll(async () => {
  db = createTestDb();
  global.__db__ = db;

  app = express();
  app.use(express.json());

  // utils/auth.js (and anything that transitively imports it, like the
  // auth router) must be dynamically imported here, AFTER the env vars
  // above are set — it reads JWT_SECRET into a top-level const at module
  // load time, so a static import of it at the top of this file would
  // get hoisted ahead of the process.env assignments and cache undefined.
  ({ hashPassword } = await import('../utils/auth.js'));
  const { default: authRouter } = await import('../routes/auth.js');
  app.use('/api/auth', authRouter);

  // Global error handler
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await createVerifiedUser({
      email: 'logintest@example.com',
      username: 'loginuser',
      password: 'LoginPass123!'
    });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'logintest@example.com',
        password: 'LoginPass123!'
      });

    if (res.status !== 200) {
      console.error('Login failed:', res.status, res.body);
    }
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
    await createVerifiedUser({
      email: 'metest@example.com',
      username: 'meuser',
      password: 'MePass123!'
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
      .send({ email: 'forge-anon@example.com', username: 'ForgeAnon' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
  });

  it('includes user info in response', async () => {
    const res = await request(app)
      .post('/api/auth/forge-session')
      .send({ email: 'forge-anon2@example.com', username: 'ForgeAnon2' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeTruthy();
    expect(res.body.user.email).toBe('forge-anon2@example.com');
  });
});
