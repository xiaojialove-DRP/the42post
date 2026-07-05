/* ═══════════════════════════════════════════════════════
   Authentication Utilities
   ═══════════════════════════════════════════════════════ */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// ═══ PASSWORD HASHING ═══
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ═══ JWT TOKENS ═══
export function generateToken(userId, email, username, accountType) {
  const payload = {
    userId,
    email,
    username,
    accountType
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: '42post-backend',
    subject: userId
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    // Re-throw JWT errors with their original type so errorHandler can distinguish
    // TokenExpiredError from JsonWebTokenError for better user messaging
    throw error;
  }
}

// ═══ EMAIL VERIFICATION ═══
export function generateVerificationToken() {
  return randomBytes(32).toString('hex');
}

// ═══ AUTHENTICATION MIDDLEWARE ═══
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: error.message
    });
  }
}

// ═══ OPTIONAL AUTHENTICATION ═══
// Decodes the JWT if a valid Bearer token is present and attaches req.user.
// Otherwise leaves req.user = null and lets the request through. Anonymous
// users (no token, or empty token) reach the route handler — which is then
// responsible for falling back to anonymous_id from the body / header.
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  req.user = null;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) return next();

  try {
    req.user = verifyToken(token);
  } catch {
    // Invalid token → treat as anonymous, do not block the request.
    req.user = null;
  }
  next();
}

// ═══ ADMIN KEY GATE ═══
// For operator-only endpoints (diagnostics, destructive maintenance, test
// email send). Fails closed: if ADMIN_KEY isn't configured the endpoint is
// disabled entirely rather than falling back to any default. Mirror of the
// inline guard server.js uses for /api/admin/*, shared so route files can
// import it instead of re-implementing (and drifting).
export function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: 'Admin endpoints disabled: ADMIN_KEY not configured' });
  }
  if (req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Forbidden: invalid admin key' });
  }
  next();
}
