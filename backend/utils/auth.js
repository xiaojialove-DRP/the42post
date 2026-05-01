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
    throw new Error('Invalid or expired token');
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
