/* ═══════════════════════════════════════════════════════
   Forge Routes (Intuition Probe + Five-Layer Generation)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../server.js';
import { requireAuth, optionalAuth } from '../utils/auth.js';
import { rateLimitLLM } from '../middleware/rateLimiter.js';
import {
  generateProbeWithClaude,
  generatePreviewWithClaude,
  generateFiveLayerWithClaude,
  generateFlatFiveLayerWithClaude,
  generateSoulHash
} from '../utils/skillGeneration.js';

const router = express.Router();

// ═══ TIMEOUT WRAPPER FOR GENERATION FUNCTIONS ═══
// Protects against infinite hangs even if the LLM call succeeds
// but the response parsing hangs
async function withGenerationTimeout(generationFn, timeoutMs = 120000) {
  return Promise.race([
    generationFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Generation timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// ═══ GENERATE INTUITION PROBE ═══
// No auth required — probe is called before account creation (Step 1 of forge)
// Rate limited to protect LLM API quota
router.post('/probe', rateLimitLLM, async (req, res, next) => {
  try {
    const { idea_text, language } = req.body;
    const userId = req.user?.userId || null; // optional; used only for logging

    if (!idea_text || !idea_text.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'idea_text is required'
      });
    }

    // Generate probe using Claude API with timeout protection (120 second hard limit)
    let probeResult;
    try {
      probeResult = await withGenerationTimeout(
        () => generateProbeWithClaude(idea_text.trim(), language || 'en'),
        120000
      );
    } catch (timeoutErr) {
      console.error('❌ Probe generation timeout:', timeoutErr.message);
      return res.status(504).json({
        error: 'Generation timeout',
        message: 'Probe generation took too long. Please try again.'
      });
    }

    if (!probeResult.success) {
      return res.status(500).json({
        error: 'Probe generation failed',
        message: probeResult.message
      });
    }

    // Log probe generation (explicit id for SQLite TEXT PK — don't fail the request if logging hiccups)
    try {
      await db.query(
        `INSERT INTO probe_logs (id, user_id, idea_text, generated_probe, model_version)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), userId, idea_text.trim(), JSON.stringify(probeResult.data), probeResult.model]
      );
    } catch (logErr) {
      console.warn('probe_logs insert failed (non-fatal):', logErr.message);
    }

    res.json({
      success: true,
      probe: probeResult.data,
      model: probeResult.model,
      usage: probeResult.usage
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GENERATE STEP-2 PREVIEW (skill name + definition + when to use / not use) ═══
// No auth required — runs after probe selection, before account confirm.
// NOTE: distinct from the auth-gated /preview below, which regenerates a
// flat plaintext five-layer preview from name+definition for the review modal.
// Rate limited to protect LLM API quota
router.post('/preview-from-probe', rateLimitLLM, async (req, res, next) => {
  try {
    const { idea_text, probe_data, selected_response, language } = req.body;

    if (!idea_text || !idea_text.trim()) {
      return res.status(400).json({ error: 'Missing input', message: 'idea_text is required' });
    }
    if (!probe_data || !probe_data.scenario) {
      return res.status(400).json({ error: 'Missing input', message: 'probe_data with scenario is required' });
    }
    if (!['thesis', 'antithesis', 'extreme'].includes(selected_response)) {
      return res.status(400).json({ error: 'Invalid input', message: 'selected_response must be thesis | antithesis | extreme' });
    }

    let result;
    try {
      result = await withGenerationTimeout(
        () => generatePreviewWithClaude(
          idea_text.trim(),
          selected_response,
          probe_data,
          language || 'en'
        ),
        120000
      );
    } catch (timeoutErr) {
      console.error('❌ Preview generation timeout:', timeoutErr.message);
      return res.status(504).json({
        error: 'Generation timeout',
        message: 'Preview generation took too long. Please try again.'
      });
    }

    if (!result.success) {
      return res.status(500).json({ error: 'Preview generation failed', message: result.message });
    }

    res.json({
      success: true,
      preview: result.data,
      model: result.model,
      usage: result.usage
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GENERATE FIVE-LAYER SKILL ═══
// optionalAuth: anonymous community forges are allowed; userId is only used
// for logging/seeding context, not stored on the request itself.
// Rate limited to protect LLM API quota
router.post('/generate', rateLimitLLM, optionalAuth, async (req, res, next) => {
  try {
    const { skill_name, idea_text, probe_data, selected_response, domain, language } = req.body;
    const userId = req.user?.userId || null;

    // Validation
    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'skill_name is required'
      });
    }

    if (!idea_text || !idea_text.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'idea_text is required'
      });
    }

    if (!probe_data || !probe_data.scenario) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'probe_data with scenario, thesis, antithesis, extreme is required'
      });
    }

    if (!['thesis', 'antithesis', 'extreme'].includes(selected_response)) {
      return res.status(400).json({
        error: 'Invalid selection',
        message: 'selected_response must be "thesis", "antithesis", or "extreme"'
      });
    }

    // Generate five-layer skill using Claude API with timeout protection (150 second hard limit)
    let generationResult;
    try {
      generationResult = await withGenerationTimeout(
        () => generateFiveLayerWithClaude(
          skill_name.trim(),
          idea_text.trim(),
          selected_response,
          probe_data,
          language || 'en'
        ),
        150000
      );
    } catch (timeoutErr) {
      console.error('❌ Five-layer generation timeout:', timeoutErr.message);
      return res.status(504).json({
        error: 'Generation timeout',
        message: 'Five-layer generation took too long. Please try again.'
      });
    }

    if (!generationResult.success) {
      return res.status(500).json({
        error: 'Generation failed',
        message: generationResult.message
      });
    }

    // Prepare skill data (not yet saved to DB — that happens during publishing)
    const skillDraft = {
      title: skill_name.trim(),
      idea_text: idea_text.trim(),
      domain: domain || 'ideas',
      five_layer: generationResult.data,
      probe_data: {
        scenario: probe_data.scenario,
        thesis: probe_data.thesis,
        antithesis: probe_data.antithesis,
        extreme: probe_data.extreme,
        selected_response: selected_response
      }
    };

    res.json({
      success: true,
      skill_draft: skillDraft,
      model: generationResult.model,
      usage: generationResult.usage
    });
  } catch (error) {
    next(error);
  }
});

// ═══ SIMPLIFIED PREVIEW (from name + definition; used by the review/preview modals) ═══
// optionalAuth: same rationale as /generate above.
// Rate limited to protect LLM API quota
router.post('/preview', rateLimitLLM, optionalAuth, async (req, res, next) => {
  try {
    const { name, definition, domain, feedback, language } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'name is required'
      });
    }
    if (!definition || !definition.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'definition is required'
      });
    }

    let result;
    try {
      result = await withGenerationTimeout(
        () => generateFlatFiveLayerWithClaude(
          name.trim(),
          definition.trim(),
          domain || 'ideas',
          feedback || '',
          language || 'en'
        ),
        120000
      );
    } catch (timeoutErr) {
      console.error('❌ Flat five-layer generation timeout:', timeoutErr.message);
      return res.status(504).json({
        error: 'Generation timeout',
        message: 'Preview generation took too long. Please try again.'
      });
    }

    if (!result.success) {
      return res.status(500).json({
        error: 'Preview generation failed',
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.data,
      model: result.model
    });
  } catch (error) {
    next(error);
  }
});

export default router;
