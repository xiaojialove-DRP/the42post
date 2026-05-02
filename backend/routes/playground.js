/* ═══════════════════════════════════════════════════════
   Playground Routes (Twin Test: With-Skill vs Without-Skill)

   Flow:
     1. Frontend posts /api/playground/test with { skill_id, scenario, anonymous_id }
     2. Backend calls DeepSeek twice in parallel — one with skill injection,
        one bare. Sides A/B are randomized so the user is blind.
     3. A row in skill_test_votes is created remembering which side had the
        skill. Frontend gets { test_id, response_a, response_b } only.
     4. User picks A or B → frontend posts /api/playground/vote with
        { test_id, chosen_side }. Backend reveals which was the skill,
        records voted_for_skill, returns running win rate.
   ═══════════════════════════════════════════════════════ */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../server.js';
import { callLLMJSON } from '../utils/skillGeneration.js';

const router = express.Router();

// ─── Build the two prompts ───
// Prefers the ready_to_use_prompt (natural-language System Prompt synthesised
// at forge time) over a structured-tag dump of the 5 layers. The natural
// version produces noticeably more consistent A/B differentiation in
// practice — every LLM digests prose better than custom 【tag】 syntax.
function buildPrompts(scenario, skill, language) {
  const isCn = language === 'zh' || /[一-鿿]/.test(scenario.title || scenario.description || '');
  const scenarioText = [scenario.title, scenario.description].filter(Boolean).join('\n');

  // Primary path: use the prompt the author actually published.
  const readyPrompt = (skill.ready_to_use_prompt || '').trim();

  // Fallback path: stitch a compact instruction from the 5-layer fields,
  // preserved for older skills that pre-date the ready_to_use_prompt column.
  const fl = skill.five_layer || {};
  const principle = fl.principle || skill.description || skill.title || '';
  const applies = (fl.boundaries?.applies_when || []).slice(0, 3).join(' / ');
  const notApplies = (fl.boundaries?.does_not_apply || []).slice(0, 2).join(' / ');
  const exemplar = (fl.exemplars || []).find(e => /DO/i.test(e.label || ''))?.text || '';

  const withSkillPrompt = readyPrompt
    ? (isCn
        ? `${readyPrompt}

请用 2-4 句话，第一人称，回应下面的情境。让上面这条 Skill 的精神在你的回应里自然活起来——不引用、不复述，只是体现。

情境：
${scenarioText}

只返回 JSON：{"response":"你的回应（2-4 句，第一人称，无引言无说明）"}`
        : `${readyPrompt}

Respond in 2-4 sentences, first person, to the scenario below. Let the Skill above come through your response naturally — don't quote it, embody it.

Scenario:
${scenarioText}

Return JSON only: {"response":"your reply (2-4 sentences, first person, no preamble, no commentary)"}`)
    : (isCn
        ? `你是一个 AI 助手，正在按照下面这个 Skill 行事：

【原则】${principle}
${applies ? `【适用】${applies}` : ''}
${notApplies ? `【不适用】${notApplies}` : ''}
${exemplar ? `【参考做法】${exemplar}` : ''}

请用 2-4 句话，第一人称，回应下面的情境。让这个 Skill 的精神在你的回应里活起来——不是引用它，是体现它。

情境：
${scenarioText}

只返回 JSON：{"response":"你的回应（2-4 句，第一人称，无引言无说明）"}`
        : `You are an AI agent acting under the following Skill:

【Principle】${principle}
${applies ? `【Applies when】${applies}` : ''}
${notApplies ? `【Does not apply when】${notApplies}` : ''}
${exemplar ? `【Reference behaviour】${exemplar}` : ''}

Respond in 2-4 sentences, first person, to the scenario below. Let the spirit of the Skill come through your response — don't quote it, embody it.

Scenario:
${scenarioText}

Return JSON only: {"response":"your reply (2-4 sentences, first person, no preamble, no commentary)"}`);

  const withoutSkillPrompt = isCn
    ? `你是一个有用的 AI 助手。请用 2-4 句话，第一人称，回应下面的情境。

情境：
${scenarioText}

只返回 JSON：{"response":"你的回应（2-4 句，第一人称，无引言无说明）"}`
    : `You are a helpful AI agent. Respond in 2-4 sentences, first person, to the scenario below.

Scenario:
${scenarioText}

Return JSON only: {"response":"your reply (2-4 sentences, first person, no preamble, no commentary)"}`;

  return { withSkillPrompt, withoutSkillPrompt, isCn };
}

// ─── Build the one-line diagnostic prompt ───
// Asks the LLM to compare the two responses and produce a single short
// sentence of the form "A 先承接情绪再讲事实，B 直接辩驳" — used in the
// Twin Test reveal step. Kept tiny (~80 tokens) so the extra call is cheap.
function buildDiagnosticPrompt(scenarioText, withText, withoutText, skillSide, isCn) {
  const A = skillSide === 'A' ? withText : withoutText;
  const B = skillSide === 'A' ? withoutText : withText;
  return isCn
    ? `下面是同一个情境下两段 AI 回应。请用一句话（≤30 字）总结它们最关键的行为差异，不评价好坏。

情境：${scenarioText}
A：${A}
B：${B}

只返回 JSON：{"diagnostic":"A …，B …"}`
    : `Two AI responses to the same scenario. Summarize the key behavioural difference in ONE sentence (≤20 words), no judgement.

Scenario: ${scenarioText}
A: ${A}
B: ${B}

Return JSON only: {"diagnostic":"A …, B …"}`;
}

// ═══ POST /test — generate Twin Test responses ═══
router.post('/test', async (req, res, next) => {
  try {
    const { skill_id, scenario, anonymous_id, language } = req.body || {};

    if (!skill_id) {
      return res.status(400).json({ error: 'Missing input', message: 'skill_id is required' });
    }
    if (!scenario || (!scenario.description && !scenario.title)) {
      return res.status(400).json({ error: 'Missing input', message: 'scenario.title or scenario.description is required' });
    }

    // Load skill from DB
    const skillResult = await db.query(`SELECT * FROM skills WHERE id = $1`, [skill_id]);
    const skillRow = skillResult.rows?.[0];
    if (!skillRow) {
      return res.status(404).json({ error: 'Not found', message: 'Skill not found' });
    }

    // five_layer is stored as JSON string in SQLite
    let fiveLayer = {};
    try {
      fiveLayer = typeof skillRow.five_layer === 'string'
        ? JSON.parse(skillRow.five_layer)
        : (skillRow.five_layer || {});
    } catch {
      fiveLayer = {};
    }
    const skill = { ...skillRow, five_layer: fiveLayer };

    const { withSkillPrompt, withoutSkillPrompt, isCn } = buildPrompts(scenario, skill, language);

    // Call DeepSeek twice in parallel (reduced max_tokens for faster generation).
    const [withResp, withoutResp] = await Promise.all([
      callLLMJSON(withSkillPrompt, 400).catch(e => ({ error: e.message })),
      callLLMJSON(withoutSkillPrompt, 400).catch(e => ({ error: e.message }))
    ]);

    if (withResp.error || withoutResp.error) {
      console.error('❌ Playground twin-test generation error:', withResp.error || withoutResp.error);
      return res.status(502).json({
        error: 'Generation failed',
        message: withResp.error || withoutResp.error
      });
    }

    const withText = (withResp.data?.response || '').trim();
    const withoutText = (withoutResp.data?.response || '').trim();
    if (!withText || !withoutText) {
      return res.status(502).json({ error: 'Empty response', message: 'One of the responses came back empty' });
    }

    // Randomize A/B so the user can't guess which is which.
    const skillIsA = Math.random() < 0.5;
    const responseA = skillIsA ? withText : withoutText;
    const responseB = skillIsA ? withoutText : withText;
    const skillSide = skillIsA ? 'A' : 'B';

    // Generate a short comparative diagnostic (kept on the server, returned
    // only via /vote so it doesn't spoil the blind pick).
    const scenarioText = [scenario.title, scenario.description].filter(Boolean).join(' — ');
    const diagPrompt = buildDiagnosticPrompt(scenarioText, withText, withoutText, skillSide, isCn);
    let diagnostic = '';
    try {
      const diagResp = await callLLMJSON(diagPrompt, 150);
      diagnostic = (diagResp.data?.diagnostic || '').trim();
    } catch (e) {
      console.warn('Diagnostic generation skipped:', e.message);
    }

    // Persist the test so /vote can reveal & score it later.
    const testId = uuidv4();
    const scenarioKey = scenario.key || scenario.title || `${scenario.domain || ''}-unknown`;
    try {
      await db.query(
        `INSERT INTO skill_test_votes (id, skill_id, scenario_key, anonymous_id, skill_side, diagnostic)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [testId, skill_id, String(scenarioKey).slice(0, 250), anonymous_id || null, skillSide, diagnostic || null]
      );
    } catch (dbErr) {
      console.warn('skill_test_votes insert failed (non-fatal):', dbErr.message);
    }

    res.json({
      success: true,
      test_id: testId,
      response_a: responseA,
      response_b: responseB,
      // The new Playground UX reveals immediately, so /test now returns
      // which side has the skill alongside the diagnostic. The legacy
      // blind /vote flow ignored these — backwards-compatible because
      // the old client never read these fields.
      skill_side: skillSide,
      diagnostic,
      model: withResp.model,
      usage: {
        with_skill: withResp.usage,
        without_skill: withoutResp.usage
      }
    });
  } catch (error) {
    next(error);
  }
});

// ═══ POST /feedback — record reveal-mode rating + optional comment ═══
// Replaces the blind /vote semantics. Users see which response was the
// skill BEFORE rating, so we collect a 3-level reaction
// (better / neutral / no_diff) plus a free-text note instead of a side
// pick. Stored in skill_feedback (created in db/init.js).
const FEEDBACK_RATINGS = new Set(['better', 'neutral', 'no_diff']);
router.post('/feedback', async (req, res, next) => {
  try {
    const { test_id, rating, comment, anonymous_id } = req.body || {};

    if (!test_id) {
      return res.status(400).json({ error: 'Missing input', message: 'test_id is required' });
    }
    if (!FEEDBACK_RATINGS.has(rating)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'rating must be "better", "neutral" or "no_diff"'
      });
    }

    // Look up the original test row to recover skill_id, scenario_key,
    // skill_side, and the two responses (so the feedback row stands on
    // its own for analytics without a JOIN back to skill_test_votes).
    const testRow = (await db.query(
      `SELECT skill_id, scenario_key, skill_side FROM skill_test_votes WHERE id = $1`,
      [test_id]
    )).rows?.[0];

    if (!testRow) {
      return res.status(404).json({ error: 'Not found', message: 'Test not found or expired' });
    }

    const trimmedComment = (typeof comment === 'string' ? comment : '').trim().slice(0, 140);

    try {
      await db.query(
        `INSERT INTO skill_feedback (id, skill_id, scenario_key, anonymous_id, rating, comment, skill_side)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          testRow.skill_id,
          testRow.scenario_key || null,
          anonymous_id || null,
          rating,
          trimmedComment || null,
          testRow.skill_side || null
        ]
      );
    } catch (dbErr) {
      console.warn('skill_feedback insert failed:', dbErr.message);
      return res.status(500).json({ error: 'Save failed', message: dbErr.message });
    }

    // Aggregate counts so the client can show "X% of testers said your
    // skill was clearly better" right after the user submits.
    const stats = (await db.query(
      `SELECT rating, COUNT(*) AS n FROM skill_feedback WHERE skill_id = $1 GROUP BY rating`,
      [testRow.skill_id]
    )).rows || [];

    const counts = { better: 0, neutral: 0, no_diff: 0 };
    let total = 0;
    for (const row of stats) {
      const n = Number(row.n) || 0;
      if (counts[row.rating] !== undefined) counts[row.rating] = n;
      total += n;
    }

    res.json({
      success: true,
      counts,
      total,
      better_rate: total > 0 ? counts.better / total : null
    });
  } catch (error) {
    next(error);
  }
});

// ═══ POST /vote — record vote, reveal, return running win rate ═══
router.post('/vote', async (req, res, next) => {
  try {
    const { test_id, chosen_side } = req.body || {};

    if (!test_id) {
      return res.status(400).json({ error: 'Missing input', message: 'test_id is required' });
    }
    if (!['A', 'B'].includes(chosen_side)) {
      return res.status(400).json({ error: 'Invalid input', message: 'chosen_side must be "A" or "B"' });
    }

    const row = (await db.query(
      `SELECT id, skill_id, skill_side, chosen_side, diagnostic FROM skill_test_votes WHERE id = $1`,
      [test_id]
    )).rows?.[0];

    if (!row) {
      return res.status(404).json({ error: 'Not found', message: 'Test not found or expired' });
    }

    // Idempotent: a second vote on the same test_id is ignored (first vote wins).
    if (!row.chosen_side) {
      const votedForSkill = chosen_side === row.skill_side ? 1 : 0;
      await db.query(
        `UPDATE skill_test_votes
         SET chosen_side = $1, voted_for_skill = $2, voted_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [chosen_side, votedForSkill, test_id]
      );
    }

    // Compute running win rate for this skill (across all users, all scenarios).
    const stats = (await db.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(voted_for_skill), 0) AS wins
       FROM skill_test_votes
       WHERE skill_id = $1 AND voted_for_skill IS NOT NULL`,
      [row.skill_id]
    )).rows?.[0] || { total: 0, wins: 0 };

    const total = Number(stats.total) || 0;
    const wins = Number(stats.wins) || 0;
    const winRate = total > 0 ? wins / total : null;

    res.json({
      success: true,
      skill_side: row.skill_side,
      voted_for_skill: chosen_side === row.skill_side,
      diagnostic: row.diagnostic || '',
      total_votes: total,
      wins,
      win_rate: winRate
    });
  } catch (error) {
    next(error);
  }
});

// ═══ GET /picker — Playground picker list (user's own first, then hot) ═══
// Returns at most `limit` skills. Skills the requesting device created
// (matched on creator_anonymous_id, sent as ?anonymous_id=) are placed
// at the top so the user's freshly forged skill is the first option in
// the dropdown. The remaining slots are filled by community-hot skills
// ordered by starlight_score, deduplicated against the user's own.
router.get('/picker', async (req, res, next) => {
  try {
    const { anonymous_id } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 30);

    let mySkills = [];
    if (anonymous_id && typeof anonymous_id === 'string') {
      mySkills = (await db.query(
        `SELECT s.*, u.username AS creator_name
         FROM skills s
         LEFT JOIN users u ON s.author_id = u.id
         WHERE s.creator_anonymous_id = $1
           AND s.published = true
           AND s.deleted_at IS NULL
         ORDER BY s.published_at DESC
         LIMIT $2`,
        [anonymous_id, limit]
      )).rows || [];
    }

    // Fetch a generous pool for hot — we'll dedupe locally.
    const hotSkills = (await db.query(
      `SELECT s.*, u.username AS creator_name
       FROM skills s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.published = true AND s.deleted_at IS NULL
       ORDER BY COALESCE(s.starlight_score, 0) DESC, s.published_at DESC
       LIMIT $1`,
      [limit + mySkills.length + 10]
    )).rows || [];

    const seen = new Set(mySkills.map(s => s.id));
    const merged = [...mySkills];
    for (const s of hotSkills) {
      if (merged.length >= limit) break;
      if (seen.has(s.id)) continue;
      merged.push(s);
      seen.add(s.id);
    }

    // Annotate which row is the user's own so the client can render a
    // "👋 Your latest forge" badge on the first option without another
    // round trip. is_mine is true for any skill where the device-level
    // anonymous_id matches.
    const annotated = merged.map(s => ({
      ...s,
      is_mine: !!anonymous_id && s.creator_anonymous_id === anonymous_id
    }));

    res.json({ success: true, skills: annotated });
  } catch (error) {
    next(error);
  }
});

// ═══ GET /stats/:skill_id — running win rate (used by Archive cards) ═══
router.get('/stats/:skill_id', async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const stats = (await db.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(voted_for_skill), 0) AS wins
       FROM skill_test_votes
       WHERE skill_id = $1 AND voted_for_skill IS NOT NULL`,
      [skill_id]
    )).rows?.[0] || { total: 0, wins: 0 };

    const total = Number(stats.total) || 0;
    const wins = Number(stats.wins) || 0;
    res.json({
      success: true,
      total_votes: total,
      wins,
      win_rate: total > 0 ? wins / total : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;
