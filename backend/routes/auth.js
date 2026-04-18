/* ═══════════════════════════════════════════════════════
   Authentication Routes
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../server.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateVerificationToken,
  requireAuth
} from '../utils/auth.js';

const router = express.Router();

// ═══ REGISTER ═══
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, account_type } = req.body;

    // Validation
    if (!email || !username || !password || !account_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'email, username, password, and account_type are required'
      });
    }

    if (!['shadow_agent', 'direct_knight'].includes(account_type)) {
      return res.status(400).json({
        error: 'Invalid account type',
        message: 'account_type must be "shadow_agent" or "direct_knight"'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const verificationToken = generateVerificationToken();

    // Insert user
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, account_type, verification_token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, account_type`,
      [email, username, passwordHash, account_type, verificationToken]
    );

    const user = result.rows[0];

    // TODO: Send verification email with verificationToken
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(201).json({
      success: true,
      user_id: user.id,
      email: user.email,
      username: user.username,
      account_type: user.account_type,
      message: 'User created. Please verify your email.',
      requires_verification: true
    });
  } catch (error) {
    next(error);
  }
});

// ═══ VERIFY EMAIL ═══
router.get('/verify/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await db.query(
      `UPDATE users
       SET verified = true, verification_token = NULL
       WHERE verification_token = $1
       RETURNING id, email, username, account_type`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Verification token not found or already used'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
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
       SET username = $1, updated_at = NOW()
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
