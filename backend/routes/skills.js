/* ═══════════════════════════════════════════════════════
   Skills Management Routes (CRUD + Publishing)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../server.js';
import { requireAuth } from '../utils/auth.js';
import { createManifest, addCovenantSignature } from '../utils/skillGeneration.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ═══ GET ALL PUBLISHED SKILLS (Public) ═══
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, domain, author, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM skills WHERE published = true AND deleted_at IS NULL';
    let countQuery = 'SELECT COUNT(*) FROM skills WHERE published = true AND deleted_at IS NULL';
    const params = [];
    let paramIndex = 1;

    if (domain) {
      query += ` AND domain = $${paramIndex}`;
      countQuery += ` AND domain = $${paramIndex}`;
      params.push(domain);
      paramIndex++;
    }

    if (author) {
      query += ` AND author_id = (SELECT id FROM users WHERE username = $${paramIndex})`;
      countQuery += ` AND author_id = (SELECT id FROM users WHERE username = $${paramIndex})`;
      params.push(author);
      paramIndex++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      countQuery += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      paramIndex += 2;
    }

    query += ` ORDER BY published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [skillsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, params.length - 2))
    ]);

    const skills = skillsResult.rows;
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      skills,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET SKILL DETAIL ═══
router.get('/:skill_id', async (req, res, next) => {
  try {
    const { skill_id } = req.params;

    const result = await db.query(
      `SELECT s.*, u.username, u.email
       FROM skills s
       JOIN users u ON s.author_id = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [skill_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Skill not found'
      });
    }

    const skill = result.rows[0];

    // Get manifest if published
    let manifest = null;
    if (skill.published) {
      const manifestResult = await db.query(
        'SELECT manifest_json FROM skill_manifests WHERE skill_id = $1',
        [skill_id]
      );
      if (manifestResult.rows.length > 0) {
        manifest = manifestResult.rows[0].manifest_json;
      }
    }

    res.json({
      success: true,
      skill: {
        ...skill,
        manifest
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ CREATE & PUBLISH SKILL ═══
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      title_cn,
      description,
      description_cn,
      domain,
      five_layer,
      forge_mode,
      source_agent_id,
      commercial_use,
      remix_allowed,
      applicable_when,
      disallowed_uses
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'title is required'
      });
    }

    if (!five_layer) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'five_layer is required'
      });
    }

    if (!['shadow_agent', 'direct_knight'].includes(forge_mode)) {
      return res.status(400).json({
        error: 'Invalid forge_mode',
        message: 'forge_mode must be "shadow_agent" or "direct_knight"'
      });
    }

    // Get user info for manifest creation
    const userResult = await db.query(
      'SELECT id, email, username, account_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Generate skill ID and soul hash
    const skillId = uuidv4();
    const timestamp = Date.now();

    const skillData = {
      id: skillId,
      title: title.trim(),
      title_cn,
      forge_mode,
      five_layer,
      commercial_use,
      remix_allowed
    };

    // Create manifest
    const { manifest, soul_hash } = createManifest(skillData, user, timestamp);

    // Start transaction
    const client = await db.connect();

    try {
      await client.query('BEGIN');

      // Insert skill (SQLite-compatible: 1/0 for booleans, CURRENT_TIMESTAMP for NOW())
      const skillResult = await client.query(
        `INSERT INTO skills (
          id, author_id, title, title_cn, description, description_cn, domain,
          soul_hash, five_layer, forge_mode, source_agent_id, commercial_use,
          remix_allowed, applicable_when, disallowed_uses, published, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, CURRENT_TIMESTAMP)`,
        [
          skillId, userId, title.trim(), title_cn || null, description || null, description_cn || null,
          domain || 'ideas', soul_hash, JSON.stringify(five_layer),
          forge_mode, source_agent_id || null, commercial_use || 'authorized',
          remix_allowed === false ? 0 : 1,
          applicable_when || null,
          disallowed_uses || null
        ]
      );

      // Insert manifest (needs explicit id — TEXT PK, no default)
      await client.query(
        `INSERT INTO skill_manifests (id, skill_id, soul_hash, author_signature, manifest_json)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), skillId, soul_hash, manifest.covenant.author_signature, JSON.stringify(manifest)]
      );

      // Insert initial version
      await client.query(
        `INSERT INTO skill_versions (id, skill_id, version_number, five_layer, author_signature)
         VALUES ($1, $2, 1, $3, $4)`,
        [uuidv4(), skillId, JSON.stringify(five_layer), manifest.covenant.author_signature]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        skill: {
          id: skillId,
          title: title.trim(),
          soul_hash,
          published: true,
          published_at: new Date().toISOString()
        },
        manifest
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// ═══ UPDATE SKILL (only by author) ═══
router.patch('/:skill_id', requireAuth, async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const userId = req.user.userId;
    const { description, description_cn, applicable_when, disallowed_uses } = req.body;

    // Check ownership
    const skillResult = await db.query(
      'SELECT * FROM skills WHERE id = $1 AND author_id = $2',
      [skill_id, userId]
    );

    if (skillResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own skills'
      });
    }

    const skill = skillResult.rows[0];

    // Update skill
    const updateResult = await db.query(
      `UPDATE skills
       SET description = COALESCE($1, description),
           description_cn = COALESCE($2, description_cn),
           applicable_when = COALESCE($3::text[], applicable_when),
           disallowed_uses = COALESCE($4::text[], disallowed_uses),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, title, soul_hash, updated_at`,
      [description, description_cn, applicable_when, disallowed_uses, skill_id]
    );

    res.json({
      success: true,
      skill: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ═══ DELETE SKILL (soft delete, only by author) ═══
router.delete('/:skill_id', requireAuth, async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const userId = req.user.userId;

    // Check ownership
    const skillResult = await db.query(
      'SELECT * FROM skills WHERE id = $1 AND author_id = $2',
      [skill_id, userId]
    );

    if (skillResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own skills'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE skills SET deleted_at = NOW() WHERE id = $1',
      [skill_id]
    );

    res.json({
      success: true,
      message: 'Skill deleted'
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET SKILL MANIFEST (for verification) ═══
router.get('/:skill_id/manifest', async (req, res, next) => {
  try {
    const { skill_id } = req.params;

    const result = await db.query(
      `SELECT sm.manifest_json, s.published
       FROM skill_manifests sm
       JOIN skills s ON sm.skill_id = s.id
       WHERE sm.skill_id = $1 AND s.deleted_at IS NULL`,
      [skill_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Manifest not found'
      });
    }

    res.json({
      success: true,
      manifest: result.rows[0].manifest_json
    });
  } catch (error) {
    next(error);
  }
});

// ═══ ADD COVENANT SIGNATURE (multi-stakeholder approval) ═══
router.post('/:skill_id/sign', requireAuth, async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const userId = req.user.userId;

    // Get skill
    const skillResult = await db.query(
      'SELECT * FROM skills WHERE id = $1 AND deleted_at IS NULL',
      [skill_id]
    );

    if (skillResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Skill not found'
      });
    }

    // Get user email
    const userResult = await db.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    const signerEmail = userResult.rows[0].email;

    // Get manifest
    const manifestResult = await db.query(
      'SELECT manifest_json, covenant_signatures FROM skill_manifests WHERE skill_id = $1',
      [skill_id]
    );

    const manifest = manifestResult.rows[0].manifest_json;
    const signatures = manifestResult.rows[0].covenant_signatures || [];

    // Add signature
    const newSignature = addCovenantSignature(manifest, signerEmail);
    signatures.push(newSignature);

    // Update manifest
    await db.query(
      `UPDATE skill_manifests
       SET covenant_signatures = $1, updated_at = NOW()
       WHERE skill_id = $2`,
      [JSON.stringify(signatures), skill_id]
    );

    res.json({
      success: true,
      message: 'Signature added',
      signature: newSignature,
      total_signatures: signatures.length
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET AUTHOR'S SKILLS ═══
router.get('/user/skills', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { include_drafts = false } = req.query;

    let query = 'SELECT * FROM skills WHERE author_id = $1 AND deleted_at IS NULL';
    const params = [userId];

    if (!include_drafts) {
      query += ' AND published = true';
    }

    query += ' ORDER BY published_at DESC NULLS LAST';

    const result = await db.query(query, params);

    res.json({
      success: true,
      skills: result.rows
    });
  } catch (error) {
    next(error);
  }
});

export default router;
