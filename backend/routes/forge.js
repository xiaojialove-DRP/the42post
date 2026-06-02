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
  generatePreviewWithClaude,
  generateFiveLayerWithClaude,
  generateFlatFiveLayerWithClaude,
  generateSoulHash,
  callDeepSeekStream
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

    // ─── Save probe session for research (silent, non-blocking) ───
    let probeSessionId = null;
    try {
      probeSessionId = uuidv4();
      const countryCode = req.headers['cf-ipcountry']
        || req.headers['x-country-code']
        || req.headers['x-vercel-ip-country']
        || null;
      const acceptLanguage = (req.headers['accept-language'] || '').substring(0, 100) || null;

      await db.query(
        `INSERT INTO probe_sessions
           (id, user_id, idea_text, language, scenario, thesis, antithesis, extreme,
            selected_response, country_code, accept_language)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          probeSessionId,
          userId || null,
          idea_text.trim(),
          language || 'en',
          probe_data.scenario || '',
          probe_data.thesis || '',
          probe_data.antithesis || '',
          probe_data.extreme || '',
          selected_response,
          countryCode,
          acceptLanguage
        ]
      );
    } catch (sessionErr) {
      console.warn('[forge] probe_session save failed (non-fatal):', sessionErr.message);
      probeSessionId = null;
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
      probe_session_id: probeSessionId,
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

    await db.query(
      `INSERT INTO probe_sessions
         (id, user_id, idea_text, language, scenario, thesis, antithesis, extreme,
          selected_response, country_code, accept_language)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        probeSessionId, userId,
        idea_text.trim(), language || 'en',
        scenario, thesis || '', antithesis || '', extreme || '',
        selected_response, countryCode, acceptLanguage
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
  const { idea_text, language } = req.body || {};

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

    // Build streaming-friendly prompt — same logic as probe but asks for
    // plain-text output that we can show as it streams, then convert to JSON
    const streamPrompt = isCn
      ? `你是 The 42 Post 的 AI 价值观研究员。根据以下想法，生成一个真实的道德困境场景和三种 AI 回应立场。

想法：「${idea_text.trim()}」

按以下格式输出（纯文本，无需 JSON）：
SCENARIO: [一个真实场景，1-2句，包含具体人物、时间、利害关系]
THESIS: [主流派立场，1-2句，第一人称 AI 视角]
ANTITHESIS: [情景派立场，1-2句，第一人称 AI 视角]
EXTREME: [实验派立场，1-2句，第一人称 AI 视角]`
      : `You are an AI values researcher at The 42 Post. Based on the following idea, generate a real moral dilemma scenario and three AI response stances.

Idea: "${idea_text.trim()}"

Output in this exact format (plain text, no JSON):
SCENARIO: [A real scenario, 1-2 sentences, specific person/time/stakes]
THESIS: [Mainstream stance, 1-2 sentences, first-person AI voice]
ANTITHESIS: [Contextual stance, 1-2 sentences, first-person AI voice]
EXTREME: [Experimental stance, 1-2 sentences, first-person AI voice]`;

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
      const result = await generateProbeWithClaude(idea_text.trim(), language || 'en');
      send('done', { success: true, probe: result.data, model: result.model });
    } else {
      send('done', { success: true, probe, model: PRIMARY_MODEL });
    }
  } catch (err) {
    console.error('[probe/stream] error:', err.message);
    // Fall back gracefully — frontend should retry with non-streaming endpoint
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// ═══ STREAMING GENERATE (progress SSE) ═══
// POST /api/forge/generate/stream
// Sends layer-by-layer progress events while five-layer generation runs,
// then a final "done" event with the complete skill_draft.
router.post('/generate/stream', rateLimitLLM, optionalAuth, async (req, res, next) => {
  const { skill_name, idea_text, probe_data, selected_response, domain, language } = req.body || {};

  if (!skill_name || !idea_text || !probe_data?.scenario ||
      !['thesis','antithesis','extreme'].includes(selected_response)) {
    return res.status(400).json({ error: 'Missing or invalid input' });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const isCn = language === 'zh' || /[一-鿿]/.test(idea_text);
  const steps = isCn
    ? ['正在提炼核心原则…', '正在生成使用示例…', '正在划定边界条件…', '正在设计评估标准…', '正在适配文化语境…']
    : ['Distilling core principle…', 'Generating exemplars…', 'Defining boundaries…', 'Designing evaluation…', 'Adapting cultural context…'];

  try {
    // Send progress pulses while generation runs
    let step = 0;
    const progressInterval = setInterval(() => {
      if (step < steps.length) {
        send('progress', { step: step + 1, total: steps.length, label: steps[step] });
        step++;
      }
    }, 2800);

    const userId = req.user?.userId || null;
    let generationResult;
    try {
      generationResult = await withGenerationTimeout(
        () => generateFiveLayerWithClaude(
          skill_name.trim(), idea_text.trim(), selected_response, probe_data, language || 'en'
        ),
        150000
      );
    } finally {
      clearInterval(progressInterval);
    }

    if (!generationResult.success) {
      send('error', { message: generationResult.message || 'Generation failed' });
      return res.end();
    }

    // Save probe session
    let probeSessionId = null;
    try {
      probeSessionId = uuidv4();
      const cc = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || null;
      const al = (req.headers['accept-language'] || '').substring(0, 100) || null;
      await db.query(
        `INSERT INTO probe_sessions
           (id, user_id, idea_text, language, scenario, thesis, antithesis, extreme,
            selected_response, country_code, accept_language)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [probeSessionId, userId, idea_text.trim(), language||'en',
         probe_data.scenario||'', probe_data.thesis||'', probe_data.antithesis||'',
         probe_data.extreme||'', selected_response, cc, al]
      );
    } catch { probeSessionId = null; }

    send('done', {
      success: true,
      skill_draft: {
        title: skill_name.trim(),
        idea_text: idea_text.trim(),
        domain: domain || 'ideas',
        five_layer: generationResult.data,
        probe_data: { ...probe_data, selected_response }
      },
      probe_session_id: probeSessionId,
      model: generationResult.model
    });
  } catch (err) {
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// Export PRIMARY_MODEL name so the stream endpoint can reference it
const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export default router;
