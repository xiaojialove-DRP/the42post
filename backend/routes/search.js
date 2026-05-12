/* ═══════════════════════════════════════════════════════
   Search & Discovery Routes
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../utils/db.js';

const router = express.Router();

// ═══ SEARCH SKILLS ═══
router.get('/', async (req, res, next) => {
  try {
    const { q, type = 'skill', sort = 'relevance' } = req.query;
    // INPUT VALIDATION: Parse and validate pagination parameters
    const parsedPage = Math.max(1, Math.min(parseInt(req.query.page, 10) || 1, 1000));
    const parsedLimit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 100));
    const offset = (parsedPage - 1) * parsedLimit;

    if (!q || !q.trim()) {
      return res.status(400).json({
        error: 'Missing query',
        message: 'q parameter is required'
      });
    }

    const searchTerm = `%${q.trim()}%`;

    let orderClause = 'ts_rank DESC';
    if (sort === 'starlight') {
      orderClause = 'starlight_score DESC, published_at DESC';
    } else if (sort === 'newest') {
      orderClause = 'published_at DESC';
    } else if (sort === 'oldest') {
      orderClause = 'published_at ASC';
    }

    // Full-text search with ranking
    const query = `
      SELECT s.*, u.username,
             ts_rank(to_tsvector('english', s.title || ' ' || COALESCE(s.description, '')), query) as ts_rank
      FROM skills s
      JOIN users u ON s.author_id = u.id,
           plainto_tsquery('english', $1) query
      WHERE s.published = true
            AND s.deleted_at IS NULL
            AND (to_tsvector('english', s.title || ' ' || COALESCE(s.description, '')) @@ query
                 OR s.title ILIKE $2
                 OR s.description ILIKE $2)
      ORDER BY ${orderClause}
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) FROM skills s
      WHERE s.published = true
            AND s.deleted_at IS NULL
            AND (s.title ILIKE $1 OR s.description ILIKE $1)
    `;

    const [resultsResult, countResult] = await Promise.all([
      db.query(query, [q.trim(), searchTerm, parsedLimit, offset]),
      db.query(countQuery, [searchTerm])
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      results: resultsResult.rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ TRENDING SKILLS ═══
router.get('/trending', async (req, res, next) => {
  try {
    // INPUT VALIDATION: Parse and validate limit parameter
    const parsedLimit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 10, 100));
    const { domain } = req.query;

    let domainClause = '';
    const params = [];

    if (domain) {
      domainClause = 'AND domain = $1';
      params.push(domain);
    }

    const paramIndex = params.length + 1;

    const result = await db.query(
      `SELECT * FROM skills
       WHERE published = true AND deleted_at IS NULL ${domainClause}
       ORDER BY starlight_score DESC, published_at DESC
       LIMIT $${paramIndex}`,
      [...params, parsedLimit]
    );

    res.json({
      success: true,
      skills: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET SKILLS BY DOMAIN ═══
router.get('/domain/:domain', async (req, res, next) => {
  try {
    const { domain } = req.params;
    // INPUT VALIDATION: Parse and validate pagination parameters
    const parsedPage = Math.max(1, Math.min(parseInt(req.query.page, 10) || 1, 1000));
    const parsedLimit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 100));
    const offset = (parsedPage - 1) * parsedLimit;

    const [resultsResult, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM skills
         WHERE domain = $1 AND published = true AND deleted_at IS NULL
         ORDER BY published_at DESC
         LIMIT $2 OFFSET $3`,
        [domain, parsedLimit, offset]
      ),
      db.query(
        'SELECT COUNT(*) FROM skills WHERE domain = $1 AND published = true AND deleted_at IS NULL',
        [domain]
      )
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      skills: resultsResult.rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
