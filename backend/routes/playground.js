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
function buildPrompts(scenario, skill, language) {
  const isCn = language === 'zh' || /[一-鿿]/.test(scenario.title || scenario.description || '');
  const scenarioText = [scenario.title, scenario.description].filter(Boolean).join('\n');

  // Pull the live parts of the skill into a compact instruction.
  const fl = skill.five_layer || {};
  const principle = fl.principle || skill.description || skill.title || '';
  const applies = (fl.boundaries?.applies_when || []).slice(0, 3).join(' / ');
  const notApplies = (fl.boundaries?.does_not_apply || []).slice(0, 2).join(' / ');
  const exemplar = (fl.exemplars || []).find(e => /DO/i.test(e.label || ''))?.text || '';

  const withSkillPrompt = isCn
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

Return JSON only: {"response":"your reply (2-4 sentences, first person, no preamble, no commentary)"}`;

  const withoutSkillPrompt = isCn
    ? `你是一个有用的 AI 助手。请用 2-4 句话，第一人称，回应下面的情境。

情境：
${scenarioText}

只返回 JSON：{"response":"你的回应（2-4 句，第一人称，无引言无说明）"}`
    : `You are a helpful AI agent. Respond in 2-4 sentences, first person, to the scenario below.

Scenario:
${scenarioText}

Return JSON only: {"response":"your reply (2-4 sentences, first person, no preamble, no commentary)"}`;

  return { withSkillPrompt, withoutSkillPrompt };
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

    const { withSkillPrompt, withoutSkillPrompt } = buildPrompts(scenario, skill, language);

    // Call DeepSeek twice in parallel.
    const [withResp, withoutResp] = await Promise.all([
      callLLMJSON(withSkillPrompt, 600).catch(e => ({ error: e.message })),
      callLLMJSON(withoutSkillPrompt, 600).catch(e => ({ error: e.message }))
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

    // Persist the test so /vote can reveal & score it later.
    const testId = uuidv4();
    const scenarioKey = scenario.key || scenario.title || `${scenario.domain || ''}-unknown`;
    try {
      await db.query(
        `INSERT INTO skill_test_votes (id, skill_id, scenario_key, anonymous_id, skill_side)
         VALUES ($1, $2, $3, $4, $5)`,
        [testId, skill_id, String(scenarioKey).slice(0, 250), anonymous_id || null, skillSide]
      );
    } catch (dbErr) {
      console.warn('skill_test_votes insert failed (non-fatal):', dbErr.message);
    }

    res.json({
      success: true,
      test_id: testId,
      response_a: responseA,
      response_b: responseB,
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
      `SELECT id, skill_id, skill_side, chosen_side FROM skill_test_votes WHERE id = $1`,
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
      total_votes: total,
      wins,
      win_rate: winRate
    });
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
