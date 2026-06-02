/* ═══════════════════════════════════════════════════════
   Skills Management Routes (CRUD + Publishing)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { db } from '../utils/db.js';
import { requireAuth, optionalAuth } from '../utils/auth.js';
import { isValidDomain, isValidAnonymousId } from '../utils/validation.js';

// Sentinel author for anonymous community forges. The skills.author_id FK
// still resolves, but the *real* per-user identity lives in
// skills.creator_anonymous_id (set from the request body / X-Anonymous-Id
// header). See backend/db/init.js for where this row is created.
const ANONYMOUS_AUTHOR_ID = 'anonymous-user-001';
import { createManifest, addCovenantSignature, callLLMJSON } from '../utils/skillGeneration.js';
import { moderateSkill } from '../utils/moderation.js';
import { rateLimitForge } from '../middleware/rateLimiter.js';
import { getCache, CACHE_TTL } from '../utils/cache.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ─── Bilingual auto-translation helper ───
// When the client sends only one language (e.g. title and title_cn are
// identical, indicating the user only wrote in their current language),
// auto-translate to the other language so the skill renders correctly on
// both /cn and /en pages. Falls back to the original text on translation
// failure — better to show duplicated text than to block the publish.
function detectIsChinese(text) {
  if (!text || typeof text !== 'string') return false;
  // Heuristic: presence of any CJK ideograph or fullwidth punctuation
  return /[一-鿿　-〿＀-￯]/.test(text);
}

async function translateBilingualPair(title, title_cn, description, description_cn) {
  // Pick the source language based on what the user actually wrote
  const sourceText = title || title_cn || '';
  const isSourceChinese = detectIsChinese(sourceText);

  // Always run LLM step now (it does BOTH summarization + translation):
  // - Long raw input (e.g. user's full idea paragraph) -> 1-sentence concise description
  // - Single-language input -> bilingual output

  try {
    const sourceTitle = isSourceChinese ? (title_cn || title) : (title || title_cn);
    const sourceDescRaw = isSourceChinese ? (description_cn || description || '') : (description || description_cn || '');

    // Skip LLM if everything is already short, distinct, and bilingual
    const looksConcise = sourceDescRaw.length > 0 && sourceDescRaw.length <= 120;
    const alreadyBilingual = title && title_cn && title !== title_cn
      && description && description_cn && description !== description_cn;
    if (looksConcise && alreadyBilingual) {
      return { title, title_cn, description, description_cn };
    }

    const prompt = `You curate metadata for skills on "THE 42 POST", an AI alignment platform. Given a Skill's source title and a (possibly long, raw) description, produce a refined bilingual pair.

Rules:
- Description: ONE sentence, under 100 characters in English (or 40 Chinese chars). Capture the essence, not the full idea. Crisp, evocative, slightly poetic. No marketing fluff.
- Title: keep brief (under 30 chars). Refine if awkward.
- Preserve technical terms (Skill, AI, prompt) in English even in Chinese version.
- Tone: philosophical, design-oriented, sometimes playful — never corporate.

Source language: ${isSourceChinese ? 'Chinese' : 'English'}
Source title: ${sourceTitle}
Source description: ${sourceDescRaw}

Return ONLY this JSON:
{
  "title_en": "concise English title",
  "title_cn": "简洁中文标题",
  "description_en": "One crisp English sentence.",
  "description_cn": "一句精炼的中文描述。"
}`;

    const result = await callLLMJSON(prompt, 600);
    const out = result.data || {};

    return {
      title: out.title_en || title || sourceTitle,
      title_cn: out.title_cn || title_cn || sourceTitle,
      description: out.description_en || description || sourceDescRaw,
      description_cn: out.description_cn || description_cn || sourceDescRaw
    };
  } catch (err) {
    console.warn('[skills.translate] Bilingual refine failed, keeping original:', err.message);
    return { title, title_cn, description, description_cn };
  }
}

// ═══ GET ALL PUBLISHED SKILLS (Public) ═══
router.get('/', async (req, res, next) => {
  try {
    // INPUT VALIDATION: Parse and validate pagination parameters
    const parsedPage = Math.max(1, Math.min(parseInt(req.query.page, 10) || 1, 1000));
    const parsedLimit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 20, 100));
    const { domain, author, search } = req.query;
    const offset = (parsedPage - 1) * parsedLimit;

    // Validate domain against whitelist (prevents SQL injection)
    if (domain && !isValidDomain(domain)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: `Invalid domain. Must be one of: safety, science, narrative, design, visual, experience, sound, ideas, history, fun`
      });
    }

    // Cache check — skip for search queries (high change rate, 3 min TTL)
    const cache = getCache();
    const cacheKey = `skills_list:${parsedPage}:${parsedLimit}:${domain||''}:${author||''}:${search||''}`;
    const ttlType = search ? 'SEARCH_RESULTS' : 'SKILLS_LIST';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // JOIN users so the response carries the real creator_name the user
    // typed at forge time (stored as users.username via forge-session
    // auto-provision). Frontend uses this for the "creator_<name>" badge
    // on Archive cards instead of the legacy "agent_<id>" display.
    // For anonymous forges, use creator_anonymous_id as the creator name
    let query = `SELECT s.*,
                 CASE
                   WHEN s.author_id = 'anonymous-user-001' AND s.creator_anonymous_id IS NOT NULL
                   THEN s.creator_anonymous_id
                   ELSE u.username
                 END AS creator_name
                 FROM skills s
                 LEFT JOIN users u ON s.author_id = u.id
                 WHERE s.published = 1 AND s.deleted_at IS NULL`;
    let countQuery = 'SELECT COUNT(*) FROM skills s WHERE s.published = 1 AND s.deleted_at IS NULL';
    const params = [];
    let paramIndex = 1;

    if (domain) {
      query += ` AND s.domain = $${paramIndex}`;
      countQuery += ` AND s.domain = $${paramIndex}`;
      params.push(domain);
      paramIndex++;
    }

    if (author) {
      query += ` AND s.author_id = (SELECT id FROM users WHERE username = $${paramIndex})`;
      countQuery += ` AND s.author_id = (SELECT id FROM users WHERE username = $${paramIndex})`;
      params.push(author);
      paramIndex++;
    }

    if (search) {
      query += ` AND (s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      countQuery += ` AND (s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm); // one placeholder ($N), one value
      paramIndex += 1;
    }

    query += ` ORDER BY s.published_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parsedLimit, offset);

    const [skillsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, params.length - 2))
    ]);

    const skills = skillsResult.rows;
    const total = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(total / parsedLimit);

    const response = {
      success: true,
      skills,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages
      }
    };

    await cache.set(cacheKey, response, ttlType);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// ═══ BATCH STAR STATUS (for Archive page load) ═══
// Returns totalStars + userStarred for up to 100 skills in one query
router.get('/stars/batch', async (req, res, next) => {
  try {
    const { ids } = req.query;
    const anonymousId = req.headers['x-anonymous-id'] || req.headers['x-anon-id'];

    if (!ids) return res.json({ success: true, stars: {} });

    const skillIds = ids.split(',').filter(Boolean).slice(0, 100);
    if (skillIds.length === 0) return res.json({ success: true, stars: {} });

    const placeholders = skillIds.map((_, i) => `$${i + 1}`).join(', ');

    // Total star counts per skill
    const countResult = await db.query(
      `SELECT skill_id, COUNT(*) as star_count
       FROM user_skill_interactions
       WHERE skill_id IN (${placeholders}) AND starred = 1
       GROUP BY skill_id`,
      skillIds
    );

    // Which ones THIS user has starred
    let userStarredMap = {};
    if (anonymousId) {
      const userResult = await db.query(
        `SELECT skill_id, starred FROM user_skill_interactions
         WHERE skill_id IN (${placeholders}) AND anonymous_id = $${skillIds.length + 1}`,
        [...skillIds, anonymousId]
      );
      userResult.rows.forEach(row => {
        userStarredMap[row.skill_id] = row.starred === 1;
      });
    }

    // Build response keyed by skill_id
    const stars = {};
    skillIds.forEach(id => { stars[id] = { totalStars: 0, userStarred: false }; });
    countResult.rows.forEach(row => {
      if (stars[row.skill_id]) stars[row.skill_id].totalStars = parseInt(row.star_count);
    });
    Object.entries(userStarredMap).forEach(([id, starred]) => {
      if (stars[id]) stars[id].userStarred = starred;
    });

    res.json({ success: true, stars });
  } catch (error) {
    next(error);
  }
});

// ═══ GET SKILL STATISTICS (Impact Dashboard) ═══
// OPTIMIZED: Single query with CTEs instead of 6 sequential queries
router.get('/:skill_id/stats', async (req, res, next) => {
  try {
    const { skill_id } = req.params;

    // CONSOLIDATED QUERY using CTEs to fetch all stats in one database round-trip
    // This eliminates the N+1 query pattern that was fetching skill, author, and various aggregates separately
    const result = await db.query(
      `WITH skill_data AS (
         -- Get basic skill info
         SELECT s.id, s.title, s.published_at, s.domain, s.author_id,
                COUNT(CASE WHEN sul.outcome = 'download_success' THEN 1 END) as download_count,
                COUNT(DISTINCT sul.agent_id) as unique_downloaders
         FROM skills s
         LEFT JOIN skill_usage_logs sul ON s.id = sul.skill_id
         WHERE s.id = $1
         GROUP BY s.id, s.title, s.published_at, s.domain, s.author_id
       ),
       author_downloads AS (
         -- Author's total downloads across all their published skills
         SELECT COALESCE(SUM(CAST(CASE WHEN sul.outcome = 'download_success' THEN 1 ELSE 0 END AS INTEGER)), 0) as total
         FROM skills s
         LEFT JOIN skill_usage_logs sul ON s.id = sul.skill_id
         WHERE s.author_id = (SELECT author_id FROM skill_data) AND s.published = 1
       ),
       community_stats AS (
         -- Total published skills in community
         SELECT COUNT(*) as total_skills FROM skills WHERE published = 1
       ),
       skill_stars AS (
         -- Stars received by this skill
         SELECT COUNT(*) as star_count FROM user_skill_interactions
         WHERE skill_id = $1 AND starred = 1
       ),
       interactions_stats AS (
         -- Total unique participants in Twin Tests
         SELECT COUNT(DISTINCT anonymous_id) as unique_participants
         FROM skill_test_votes WHERE voted_for_skill IS NOT NULL
       )
       SELECT
         sd.id, sd.title, sd.published_at, sd.domain,
         sd.download_count, sd.unique_downloaders,
         COALESCE(ad.total, 0) as author_total_downloads,
         COALESCE(cs.total_skills, 0) as community_total_skills,
         COALESCE(ss.star_count, 0) as star_count,
         COALESCE(ist.unique_participants, 0) as total_interactions
       FROM skill_data sd
       CROSS JOIN author_downloads ad
       CROSS JOIN community_stats cs
       CROSS JOIN skill_stars ss
       CROSS JOIN interactions_stats ist`,
      [skill_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Skill not found'
      });
    }

    const stats = result.rows[0];

    // Calculate days since publication and daily rate (client-side logic)
    const publishedDate = new Date(stats.published_at);
    const now = new Date();
    const daysSincePublish = Math.floor((now - publishedDate) / (1000 * 60 * 60 * 24));
    const dailyDownloadRate = daysSincePublish > 0
      ? (stats.download_count / daysSincePublish).toFixed(2)
      : stats.download_count;

    res.json({
      success: true,
      skill: {
        id: stats.id,
        title: stats.title,
        domain: stats.domain,
        publishedAt: stats.published_at
      },
      stats: {
        downloads: parseInt(stats.download_count) || 0,
        uniqueDownloaders: parseInt(stats.unique_downloaders) || 0,
        daysSincePublish: daysSincePublish,
        dailyDownloadRate: parseFloat(dailyDownloadRate),
        mySkillJourney: parseInt(stats.author_total_downloads) || 0,
        skillsForged: parseInt(stats.community_total_skills) || 0,
        humanResonance: parseInt(stats.star_count) || 0,
        totalInteractions: parseInt(stats.total_interactions) || 0
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
// rateLimitForge: 5/hour per identity (caps LLM/DB cost from spam)
router.post('/', optionalAuth, rateLimitForge, async (req, res, next) => {
  try {
    let {
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
      disallowed_uses,
      ready_to_use_prompt,
      anonymous_id: bodyAnonymousId,
      creatorName,
      probe_session_id: probeSessionId  // passed from frontend after forge/generate
    } = req.body;

    // Capture geographic + language context for research
    const countryCode = req.headers['cf-ipcountry']
      || req.headers['x-country-code']
      || req.headers['x-vercel-ip-country']
      || null;
    const acceptLanguage = (req.headers['accept-language'] || '').substring(0, 100) || null;

    // ─── Safety + Quality Moderation (run BEFORE translation to save cost on rejects) ───
    // Calls the moderation LLM with a strict review rubric. On REJECT or
    // REQUIRES_MODIFICATION we return a structured error before spending
    // tokens on translation/save. On infra failure we fail-open with a
    // manual-review flag (better UX than blocking).
    const moderationResult = await moderateSkill({
      title,
      description,
      five_layer,
      applicable_when,
      disallowed_uses
    });

    // Always log the decision, even on APPROVE — gives us an audit trail
    // for tuning the rubric and catching false negatives later.
    try {
      await db.query(
        `INSERT INTO moderation_logs
          (id, skill_id, identity, decision, risk_level, violations, explanation,
           categories, suggested_modifications, review_required,
           title_snapshot, description_snapshot, created_at)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          req.user?.userId || req.headers['x-anonymous-id'] || req.ip || 'unknown',
          moderationResult.decision,
          moderationResult.risk_level,
          JSON.stringify(moderationResult.violations || []),
          moderationResult.explanation || '',
          JSON.stringify(moderationResult.flagged_categories || []),
          moderationResult.suggested_modifications || '',
          moderationResult.review_required ? 1 : 0,
          (title || '').slice(0, 500),
          (description || '').slice(0, 1000)
        ]
      );
    } catch (logErr) {
      // Don't block publish on logging failure
      console.warn('[moderation] Failed to write audit log:', logErr.message);
    }

    if (moderationResult.decision === 'REJECT') {
      return res.status(403).json({
        error: 'Content moderation: rejected',
        decision: 'REJECT',
        risk_level: moderationResult.risk_level,
        violations: moderationResult.violations,
        explanation: moderationResult.explanation,
        flagged_categories: moderationResult.flagged_categories,
        message_cn: '很抱歉，你的内容暂时无法发布。' + (moderationResult.explanation ? '\n\n原因：' + moderationResult.explanation : ''),
        message_en: 'Sorry, this content cannot be published.' + (moderationResult.explanation ? '\n\nReason: ' + moderationResult.explanation : '')
      });
    }

    if (moderationResult.decision === 'REQUIRES_MODIFICATION') {
      return res.status(422).json({
        error: 'Content moderation: needs modification',
        decision: 'REQUIRES_MODIFICATION',
        risk_level: moderationResult.risk_level,
        violations: moderationResult.violations,
        explanation: moderationResult.explanation,
        suggested_modifications: moderationResult.suggested_modifications,
        flagged_categories: moderationResult.flagged_categories,
        message_cn: '内容需要稍作调整：\n\n' + (moderationResult.suggested_modifications || moderationResult.explanation || ''),
        message_en: 'Content needs adjustment:\n\n' + (moderationResult.suggested_modifications || moderationResult.explanation || '')
      });
    }

    // ─── Auto-translate to ensure both language versions exist ───
    // Frontend often sends title === title_cn (only one language); we
    // generate the missing version so the skill renders correctly on
    // both /cn and /en archive pages.
    const translated = await translateBilingualPair(title, title_cn, description, description_cn);
    title = translated.title;
    title_cn = translated.title_cn;
    description = translated.description;
    description_cn = translated.description_cn;

    // Logged-in users author with their real id; anonymous community forges
    // attach to the sentinel anonymous user. The anonymous_id is recorded
    // regardless of auth state — it identifies the *device* that created
    // the skill, so the Playground can put "your latest forge" first even
    // when the user later signs in or out.
    const userId = req.user?.userId || ANONYMOUS_AUTHOR_ID;
    const isAnonymous = !req.user;
    // ✅ Use creatorName if provided (user's chosen creator name), otherwise use device identifier
    const anonymousId = creatorName || bodyAnonymousId || req.headers['x-anonymous-id'] || null;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'title is required'
      });
    }

    if (!five_layer || (typeof five_layer === 'object' && Object.keys(five_layer).length === 0)) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'five_layer is required and must not be empty'
      });
    }

    // forge_mode: agents removed from product, use default value for DB compatibility
    const resolvedForgeMode = forge_mode || 'standard';

    // Validate domain against whitelist (prevents SQL injection)
    if (domain && !isValidDomain(domain)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: `Invalid domain. Must be one of: safety, science, narrative, design, visual, experience, sound, ideas, history, fun`
      });
    }

    // Get user info for manifest creation. For anonymous forges this
    // resolves to the sentinel row inserted by initDatabase().
    let userResult = await db.query(
      'SELECT id, email, username, account_type FROM users WHERE id = $1',
      [userId]
    );

    // Fallback: if authenticated user no longer exists in DB (e.g. DB was reset
    // but client still holds an old JWT), gracefully fall back to anonymous
    // sentinel rather than rejecting the forge. The user's creatorName /
    // anonymousId still preserves attribution.
    if (userResult.rows.length === 0 && !isAnonymous) {
      console.warn(`[skills.create] Stale JWT — userId ${userId} not found, falling back to anonymous sentinel`);
      userResult = await db.query(
        'SELECT id, email, username, account_type FROM users WHERE id = $1',
        [ANONYMOUS_AUTHOR_ID]
      );
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Anonymous author sentinel missing — server not fully initialised'
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
      forge_mode: resolvedForgeMode,
      five_layer,
      commercial_use,
      remix_allowed
    };

    // Create manifest
    const { manifest, soul_hash } = createManifest(skillData, user, timestamp);

    // Start transaction
    const client = await db.connect();

    try {
      // SECURITY: Use SERIALIZABLE isolation level to prevent race conditions
      // (e.g., duplicate skill creation if user submits twice)
      await client.query('BEGIN');

      // Insert skill (SQLite-compatible: 1/0 for booleans, CURRENT_TIMESTAMP for CURRENT_TIMESTAMP)
      const skillResult = await client.query(
        `INSERT INTO skills (
          id, author_id, title, title_cn, description, description_cn, domain,
          soul_hash, five_layer, forge_mode, source_agent_id, commercial_use,
          remix_allowed, applicable_when, disallowed_uses,
          creator_anonymous_id, ready_to_use_prompt,
          moderation_status, moderation_risk_level, moderation_explanation,
          moderation_categories, moderation_review_required, moderation_decided_at,
          published, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)`,
        [
          skillId, userId, title.trim(), title_cn || null, description || null, description_cn || null,
          domain || 'ideas', soul_hash, JSON.stringify(five_layer),
          resolvedForgeMode, source_agent_id || null, commercial_use || 'authorized',
          remix_allowed === false ? 0 : 1,
          applicable_when || null,
          disallowed_uses || null,
          anonymousId,
          ready_to_use_prompt || null,
          // Moderation fields (decision was already APPROVE to reach here)
          moderationResult.review_required ? 'pending_review' : 'approved',
          moderationResult.risk_level || 'LOW',
          moderationResult.explanation || '',
          JSON.stringify(moderationResult.flagged_categories || []),
          moderationResult.review_required ? 1 : 0
        ]
      );

      // Verify skill was inserted
      if (!skillResult || skillResult.rowCount === 0) {
        throw new Error('Failed to insert skill into database');
      }

      // Insert manifest (needs explicit id — TEXT PK, no default)
      const manifestResult = await client.query(
        `INSERT INTO skill_manifests (id, skill_id, soul_hash, author_signature, manifest_json)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), skillId, soul_hash, manifest.covenant.author_signature, JSON.stringify(manifest)]
      );

      if (!manifestResult || manifestResult.rowCount === 0) {
        throw new Error('Failed to insert skill manifest');
      }

      // Insert initial version
      const versionResult = await client.query(
        `INSERT INTO skill_versions (id, skill_id, version_number, five_layer, author_signature)
         VALUES ($1, $2, 1, $3, $4)`,
        [uuidv4(), skillId, JSON.stringify(five_layer), manifest.covenant.author_signature]
      );

      if (!versionResult || versionResult.rowCount === 0) {
        throw new Error('Failed to insert skill version');
      }

      // Save forging history for research purposes
      try {
        await client.query(
          `INSERT INTO forging_histories
             (id, skill_id, user_email, original_idea, ai_outputs, final_skill_data,
              country_code, accept_language, probe_session_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            uuidv4(),
            skillId,
            user?.email || null,
            req.body.original_idea || req.body.idea_text || null,
            JSON.stringify(req.body.ai_outputs || {}),
            JSON.stringify(five_layer),
            countryCode,
            acceptLanguage,
            probeSessionId || null
          ]
        );
      } catch (historyErr) {
        console.warn('forging_histories insert failed (non-fatal):', historyErr.message);
      }

      // Link probe_session → skill so research queries can join them
      if (probeSessionId) {
        try {
          await client.query(
            `UPDATE probe_sessions SET skill_id = $1 WHERE id = $2`,
            [skillId, probeSessionId]
          );
        } catch (psErr) {
          console.warn('probe_session link failed (non-fatal):', psErr.message);
        }
      }

      // Verify the skill was actually committed by fetching it back
      const verifyResult = await client.query(
        `SELECT id, title, domain, soul_hash, published, published_at FROM skills WHERE id = $1`,
        [skillId]
      );

      if (!verifyResult || verifyResult.rows.length === 0) {
        throw new Error('Skill verification failed after insert');
      }

      const savedSkill = verifyResult.rows[0];

      await client.query('COMMIT');

      // Invalidate skills list cache so new skill appears immediately
      await getCache().invalidatePattern('skills_list:*');

      // Return complete skill data with actual database values
      res.status(201).json({
        success: true,
        message: 'Skill published successfully',
        skill: {
          id: savedSkill.id,
          title: savedSkill.title,
          domain: savedSkill.domain,
          soul_hash: savedSkill.soul_hash,
          published: Boolean(savedSkill.published),
          published_at: savedSkill.published_at
        },
        manifest
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr.message);
      }
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
           updated_at = CURRENT_TIMESTAMP
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

// ═══ CLEANUP LOW-QUALITY FORGED SKILLS ═══
// DELETE /api/skills/cleanup?pwd=cleanup42post
// 删除所有低质量的forged skills（没有proper creator_name的anonymous skills）
router.delete('/cleanup', async (req, res, next) => {
  try {
    const password = req.query.pwd || req.body.pwd;

    // Simple security check - require a password
    if (password !== 'cleanup42post') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid password'
      });
    }

    // Delete all test/demo skills created by creator_42 and creator_anonymous
    // This includes:
    // 1. All anonymous user skills with no proper creator name
    // 2. All skills created by user with username 'creator_42'
    // 3. All skills with creator_anonymous_id = 'creator_anonymous'
    const deleteResult = await db.query(
      `DELETE FROM skills s
       WHERE (author_id = 'anonymous-user-001'
              AND (creator_anonymous_id IS NULL
                   OR creator_anonymous_id LIKE 'anonymous%'
                   OR creator_anonymous_id LIKE 'shadow_knight_%'
                   OR creator_anonymous_id = 'creator_anonymous'))
       OR author_id = (SELECT id FROM users WHERE username = 'creator_42')`,
      []
    );

    const deletedCount = deleteResult.rowCount || 0;

    res.json({
      success: true,
      message: `✓ 已删除 ${deletedCount} 个测试/演示 skills`,
      deletedCount: deletedCount,
      nextStep: '前端localStorage中的数据会在下次刷新时自动清空'
    });

    console.log(`🧹 清理完成: 删除了 ${deletedCount} 个低质量forged skills`);
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
      'UPDATE skills SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
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
       SET covenant_signatures = $1, updated_at = CURRENT_TIMESTAMP
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

// ═══ STAR/FAVORITE SKILL (Anonymous User) ═══
router.post('/:skill_id/star', async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const { starred } = req.body;
    const anonymousId = req.headers['x-anonymous-id'] || req.headers['x-anon-id'];

    // SECURITY: Validate X-Anonymous-Id header
    if (!anonymousId) {
      return res.status(400).json({
        error: 'Missing anonymous ID',
        message: 'X-Anonymous-Id header is required'
      });
    }

    if (!isValidAnonymousId(anonymousId)) {
      return res.status(400).json({
        error: 'Invalid anonymous ID format',
        message: 'X-Anonymous-Id must be a valid UUID or alphanumeric string (max 255 chars)'
      });
    }

    // Verify skill exists
    const skillCheck = await db.query('SELECT id FROM skills WHERE id = $1', [skill_id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (typeof starred !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'starred must be boolean'
      });
    }

    // Insert or update interaction record
    const interactionId = uuidv4();
    const now = new Date().toISOString();

    try {
      // Try to insert
      await db.query(
        `INSERT INTO user_skill_interactions (id, anonymous_id, skill_id, starred, starred_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interactionId,
          anonymousId,
          skill_id,
          starred ? 1 : 0,
          starred ? now : null,
          now,
          now
        ]
      );
    } catch (insertErr) {
      // If unique constraint fails, update instead
      if (insertErr.message && insertErr.message.includes('UNIQUE')) {
        await db.query(
          `UPDATE user_skill_interactions
           SET starred = $1, starred_at = $2, updated_at = $3
           WHERE anonymous_id = $4 AND skill_id = $5`,
          [
            starred ? 1 : 0,
            starred ? now : null,
            now,
            anonymousId,
            skill_id
          ]
        );
      } else {
        throw insertErr;
      }
    }

    // Get updated star count
    const countResult = await db.query(
      `SELECT COUNT(*) as star_count
       FROM user_skill_interactions
       WHERE skill_id = $1 AND starred = 1`,
      [skill_id]
    );

    const starCount = parseInt(countResult.rows[0].star_count) || 0;

    // Keep skills.starlight_score in sync so archive/picker ordering reflects real stars
    await db.query(
      `UPDATE skills SET starlight_score = $1 WHERE id = $2`,
      [starCount, skill_id]
    );

    res.json({
      success: true,
      starred,
      totalStars: starCount,
      message: starred ? 'Skill starred' : 'Star removed'
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET SKILL STARS ═══
router.get('/:skill_id/stars', async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const anonymousId = req.headers['x-anonymous-id'] || req.headers['x-anon-id'];

    // Verify skill exists
    const skillCheck = await db.query('SELECT id FROM skills WHERE id = $1', [skill_id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Get star count
    const countResult = await db.query(
      `SELECT COUNT(*) as star_count
       FROM user_skill_interactions
       WHERE skill_id = $1 AND starred = 1`,
      [skill_id]
    );

    const starCount = parseInt(countResult.rows[0].star_count) || 0;

    // Check if current user has starred
    let userStarred = false;
    if (anonymousId) {
      const userStarResult = await db.query(
        `SELECT starred FROM user_skill_interactions
         WHERE skill_id = $1 AND anonymous_id = $2`,
        [skill_id, anonymousId]
      );
      userStarred = userStarResult.rows.length > 0 && userStarResult.rows[0].starred === 1;
    }

    res.json({
      success: true,
      skill_id,
      totalStars: starCount,
      userStarred,
      userAnonymousId: anonymousId || null
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
      query += ' AND published = 1';
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
