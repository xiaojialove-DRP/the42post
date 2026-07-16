/* ═══════════════════════════════════════════════════════
   Forge Routes (Intuition Probe + Five-Layer Generation)
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { requireAuth, optionalAuth } from '../utils/auth.js';
import { rateLimitLLM } from '../middleware/rateLimiter.js';
import {
  generateProbeWithClaude,
  buildProbePrompt,
  validateProbeQuality,
  generatePreviewWithClaude,
  generateFlatFiveLayerWithClaude,
  generateSoulHash,
  callDeepSeekStream,
  callLLMJSON
} from '../utils/skillGeneration.js';
import { logger } from '../utils/logger.js';

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
    const { idea_text, language, background_text } = req.body;
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
        () => generateProbeWithClaude(idea_text.trim(), language || 'en', background_text),
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

// ═══ SIMPLIFIED PREVIEW (from name + definition; used by the review/preview modals) ═══
// optionalAuth: anonymous community forges are allowed; userId is only used
// for logging/seeding context, not stored on the request itself.
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

    // Persist the AI draft server-side so publish can derive provenance
    // (generation_source) and edit distance from stored data rather than
    // client-claimed flags. Non-fatal: a failed insert must not block the
    // forge flow, the skill just publishes without provenance.
    let draftId = null;
    try {
      draftId = uuidv4();
      await db.query(
        `INSERT INTO generation_drafts (id, skill_name, definition, domain, language, draft_json, model, is_fallback)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          draftId,
          name.trim().substring(0, 255),
          definition.trim().substring(0, 2000),
          domain || 'ideas',
          language || 'en',
          JSON.stringify(result.data),
          (result.model || '').substring(0, 100),
          result.fallback === true ? 1 : 0
        ]
      );
    } catch (draftErr) {
      draftId = null;
      console.warn('generation_drafts insert failed (non-fatal):', draftErr.message);
    }

    res.json({
      success: true,
      data: result.data,
      model: result.model,
      fallback: result.fallback === true,
      draft_id: draftId
    });
  } catch (error) {
    next(error);
  }
});

// ═══ SAVE PROBE SESSION (called when user confirms probe choice) ═══
// Lightweight endpoint — no LLM call, just persist the human decision for research.
router.post('/save-probe-session', optionalAuth, async (req, res, next) => {
  try {
    const { idea_text, scenario, thesis, antithesis, extreme, selected_response, language } = req.body;
    if (!idea_text || !scenario || !selected_response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const countryCode = req.headers['cf-ipcountry']
      || req.headers['x-country-code']
      || req.headers['x-vercel-ip-country']
      || null;
    const acceptLanguage = (req.headers['accept-language'] || '').substring(0, 100) || null;
    const userId = req.user?.userId || null;
    const probeSessionId = uuidv4();

    const researchConsent = req.body.research_consent !== false ? 1 : 0;

    await db.query(
      `INSERT INTO probe_sessions
         (id, user_id, idea_text, language, scenario, thesis, antithesis, extreme,
          selected_response, country_code, accept_language, research_consent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        probeSessionId, userId,
        idea_text.trim(), language || 'en',
        scenario, thesis || '', antithesis || '', extreme || '',
        selected_response, countryCode, acceptLanguage, researchConsent
      ]
    );

    res.json({ success: true, probe_session_id: probeSessionId });
  } catch (error) {
    // Non-fatal — return success anyway so the forge flow isn't blocked
    console.warn('[forge] save-probe-session failed:', error.message);
    res.json({ success: false });
  }
});

// ═══ STREAMING PROBE (SSE) ═══
// POST /api/forge/probe/stream
// Streams raw tokens from DeepSeek as they arrive so the frontend can
// show text appearing in real-time instead of a blank spinner.
// When the stream ends, sends a final "done" event with the parsed JSON.
router.post('/probe/stream', rateLimitLLM, optionalAuth, async (req, res) => {
  const { idea_text, language, background_text } = req.body || {};

  if (!idea_text || !idea_text.trim()) {
    return res.status(400).json({ error: 'idea_text is required' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const isCn = language === 'zh' || /[一-鿿]/.test(idea_text);

    // Full-quality prompt, stream variant. This endpoint used to carry its
    // own bare 8-line prompt — none of the decode step, the causality bar,
    // or the off-limits list — and since streaming is the path real users
    // hit first, most production probes were generated from the weak
    // prompt. Now both endpoints share one prompt body (skillGeneration.js).
    const streamPrompt = buildProbePrompt(idea_text.trim(), isCn, 'stream', background_text);

    let fullText = '';

    await callDeepSeekStream(streamPrompt, 600, (chunk) => {
      fullText += chunk;
      send('chunk', { text: chunk });
    });

    // Parse the plain-text output into structured fields
    const extract = (key) => {
      const match = fullText.match(new RegExp(`${key}:\\s*([^\\n]+(?:\\n(?!(?:SCENARIO|THESIS|ANTITHESIS|EXTREME):)[^\\n]+)*)`));
      return match ? match[1].trim() : '';
    };

    const probe = {
      scenario: extract('SCENARIO'),
      thesis:   extract('THESIS'),
      antithesis: extract('ANTITHESIS'),
      extreme:  extract('EXTREME')
    };

    // Fall back to non-streaming if parsing failed
    if (!probe.scenario) {
      const result = await generateProbeWithClaude(idea_text.trim(), language || 'en', background_text);
      send('done', { success: true, probe: result.data, model: result.model });
    } else {
      // Same quality gate as the non-streaming endpoint. The streamed text
      // was already shown live, but what the user KEEPS (the parsed choices
      // they pick from) must pass the gate — regenerate through the gated
      // non-streaming path if it does not.
      const reasons = validateProbeQuality(probe, isCn);
      if (reasons.length > 0) {
        logger.warn('probe_quality_gate_failed', { endpoint: 'stream', reasons, idea: idea_text.slice(0, 80) });
        const result = await generateProbeWithClaude(idea_text.trim(), language || 'en', background_text);
        send('done', { success: true, probe: result.data, model: result.model, regenerated: true });
      } else {
        send('done', { success: true, probe, model: PRIMARY_MODEL });
      }
    }
  } catch (err) {
    console.error('[probe/stream] error:', err.message);
    // Fall back gracefully — frontend should retry with non-streaming endpoint
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// ═══ POST /blessing — one-line AI comment for the creator card ═══
// Returns a single sentence the certificate prints under the skill name.
// Client has curated per-domain fallbacks, so failures here are harmless.
router.post('/blessing', rateLimitLLM, async (req, res) => {
  try {
    const { skill_name, definition, language } = req.body || {};
    const name = String(skill_name || '').slice(0, 80);
    const def = String(definition || '').slice(0, 300);
    if (!name) return res.status(400).json({ error: 'Missing input', message: 'skill_name is required' });

    const isZh = language === 'zh';
    const prompt = `A human just distilled their personal wisdom into an AI skill called "${name}".
Definition: ${def || '(not provided)'}

Write ONE short sentence (max ${isZh ? '30 Chinese characters' : '14 words'}) — a quiet, intelligent appreciation of what makes this way of thinking valuable. Like an editor's note on a certificate. No flattery words ("amazing", "great"), no emoji, no quotes around it. ${isZh ? 'Respond in Chinese.' : 'Respond in English.'}

Return ONLY JSON: {"blessing": "..."}`;

    const result = await Promise.race([
      callLLMJSON(prompt, 200),
      new Promise((_, rej) => setTimeout(() => rej(new Error('blessing timeout')), 8000))
    ]);
    const line = String(result?.data?.blessing || '').trim().replace(/^["'“”]|["'“”]$/g, '');
    if (!line) throw new Error('empty blessing');
    res.json({ success: true, blessing: line.slice(0, 90) });
  } catch (err) {
    // Client falls back to its curated line — return a soft failure.
    res.status(200).json({ success: false, blessing: '' });
  }
});

// Export PRIMARY_MODEL name so the stream endpoint can reference it
const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export default router;
