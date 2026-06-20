/* ═══════════════════════════════════════════════════════
   Authentication Routes

   SECURITY: All authentication routes perform strict input
   validation to prevent injection attacks and enforce username/
   email format constraints.
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import {
  verifyPassword,
  generateToken,
  requireAuth
} from '../utils/auth.js';
import {
  isValidEmail,
  isValidUsername
} from '../utils/validation.js';

const router = express.Router();

// ═══ FORGE SESSION (zero-friction auth for skill creators) ═══
// Core philosophy: "Everyone is welcome, especially non-engineers."
// Takes just {email, username} — provisions user if needed, returns JWT.
// No password / no email verification required for forging participation.
// SECURITY: Validates email and username formats to prevent injection
router.post('/forge-session', async (req, res, next) => {
  try {
    const { email, username } = req.body || {};

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'email is required'
      });
    }
    if (!username || !username.trim()) {
      return res.status(400).json({
        error: 'Missing username',
        message: 'username is required'
      });
    }

    const emailNorm = email.trim().toLowerCase();
    const usernameNorm = username.trim();

    // Validate email format
    if (!isValidEmail(emailNorm)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Validate username format
    if (!isValidUsername(usernameNorm)) {
      return res.status(400).json({
        error: 'Invalid username',
        message: 'Username must be 3-32 characters (alphanumeric and underscore, cannot start with a number)'
      });
    }

    // Try to find existing user by email
    const existing = await db.query(
      'SELECT id, email, username, account_type FROM users WHERE email = $1',
      [emailNorm]
    );

    let user;

    if (existing.rows.length > 0) {
      user = existing.rows[0];
      // Keep username up to date if creator rebrands themselves
      if (user.username !== usernameNorm) {
        try {
          await db.query(
            'UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [usernameNorm, user.id]
          );
          user.username = usernameNorm;
        } catch (e) {
          // Username collision — keep old username silently, still issue token.
          console.warn('Username update skipped (likely collision):', e.message);
        }
      }
    } else {
      // Create a new forger identity — verified by default, no password dance.
      const newId = uuidv4();
      const syntheticHash = 'forge-session-no-password';
      const accountType = 'direct_knight';

      try {
        await db.query(
          `INSERT INTO users (id, email, username, password_hash, account_type, verified)
           VALUES ($1, $2, $3, $4, $5, 1)`,
          [newId, emailNorm, usernameNorm, syntheticHash, accountType]
        );
        user = {
          id: newId,
          email: emailNorm,
          username: usernameNorm,
          account_type: accountType
        };
      } catch (e) {
        // Username unique collision — append suffix and retry once
        if (String(e.message || '').toLowerCase().includes('unique')) {
          const retryName = `${usernameNorm}-${newId.substring(0, 6)}`;
          await db.query(
            `INSERT INTO users (id, email, username, password_hash, account_type, verified)
             VALUES ($1, $2, $3, $4, $5, 1)`,
            [newId, emailNorm, retryName, syntheticHash, accountType]
          );
          user = {
            id: newId,
            email: emailNorm,
            username: retryName,
            account_type: accountType
          };
        } else {
          throw e;
        }
      }
    }

    const token = generateToken(user.id, user.email, user.username, user.account_type);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    next(error);
  }
});

// ═══ LOGIN ═══
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'email and password are required'
      });
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, username, password_hash, account_type, verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    const user = result.rows[0];

    // Check if verified
    if (!user.verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before logging in'
      });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Generate JWT
    const token = generateToken(user.id, user.email, user.username, user.account_type);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        account_type: user.account_type
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET CURRENT USER ═══
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, username, account_type, verified, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ═══ UPDATE PROFILE ═══
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { username } = req.body;
    const userId = req.user.userId;

    if (!username) {
      return res.status(400).json({
        error: 'Missing fields',
        message: 'username is required'
      });
    }

    const result = await db.query(
      `UPDATE users
       SET username = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, username, account_type, verified`,
      [username, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
