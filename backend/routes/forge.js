/* ═══════════════════════════════════════════════════════
   Forge Routes (Intuition Probe + Five-Layer Generation)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../server.js';
import { requireAuth } from '../utils/auth.js';
import {
  generateProbeWithClaude,
  generatePreviewWithClaude,
  generateFiveLayerWithClaude,
  generateFlatFiveLayerWithClaude,
  generateSoulHash
} from '../utils/skillGeneration.js';

const router = express.Router();

// ═══ GENERATE INTUITION PROBE ═══
// No auth required — probe is called before account creation (Step 1 of forge)
router.post('/probe', async (req, res, next) => {
  try {
    const { idea_text, language } = req.body;
    const userId = req.user?.userId || null; // optional; used only for logging

    if (!idea_text || !idea_text.trim()) {
      return res.status(400).json({
        error: 'Missing input',
        message: 'idea_text is required'
      });
    }

    // Generate probe using Claude API
    const probeResult = await generateProbeWithClaude(
      idea_text.trim(),
      language || 'en'
    );

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
router.post('/preview', async (req, res, next) => {
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

    const result = await generatePreviewWithClaude(
      idea_text.trim(),
      selected_response,
      probe_data,
      language || 'en'
    );

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
router.post('/generate', requireAuth, async (req, res, next) => {
  try {
    const { skill_name, idea_text, probe_data, selected_response, domain, language } = req.body;
    const userId = req.user.userId;

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

    // Generate five-layer skill using Claude API
    const generationResult = await generateFiveLayerWithClaude(
      skill_name.trim(),
      idea_text.trim(),
      selected_response,
      probe_data,
      language || 'en'
    );

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
router.post('/preview', requireAuth, async (req, res, next) => {
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

    const result = await generateFlatFiveLayerWithClaude(
      name.trim(),
      definition.trim(),
      domain || 'ideas',
      feedback || '',
      language || 'en'
    );

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
