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
import { db } from '../utils/db.js';
import { rateLimitLLM, rateLimitTwinTest } from '../middleware/rateLimiter.js';
import { callLLMWithClaudeFallback } from '../utils/skillGeneration.js';
import { logger } from '../utils/logger.js';
import { getSkillVerificationStats, getBatchVerificationStats } from '../utils/verificationHealth.js';

// Rough language check: does this text contain enough CJK characters to be
// Chinese? Used as a guardrail for the exact failure class found in
// production — a Skill forged in Chinese pulling an English scenario's
// response into Chinese too, because its prompt block was longer/more
// dominant than the trailing language instruction. Not a hard gate (forge
// flow should never block on this), just a log line that makes the mismatch
// visible immediately instead of waiting for a user screenshot.
function looksChinese(text) {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  return cjk > text.length * 0.1;
}

const router = express.Router();

// Sanitize anonymous_id: truncate to DB column size and allow only safe chars
const safeAnonId = (id) => {
  if (!id || typeof id !== 'string') return null;
  return id.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 255) || null;
};

// Is the person running this Twin Test the Skill's own creator? Same
// ownership match as GET /picker's ownerKeys: skills.creator_anonymous_id
// stores either the raw device anonymous_id (anonymous forges) or
// creator_<username> (the common case, since username is now required at
// forge time) — device id alone cannot match the latter, so the client
// also sends creator_name when it has one.
function isAuthorOfSkill(skillCreatorAnonymousId, anonymousId, creatorName) {
  if (!skillCreatorAnonymousId) return false;
  const safeAnon = safeAnonId(anonymousId);
  if (safeAnon && safeAnon === skillCreatorAnonymousId) return true;
  const safeCreator = safeAnonId(creatorName);
  if (safeCreator) {
    const normalized = `creator_${safeCreator.replace(/^creator_/i, '')}`;
    if (normalized === skillCreatorAnonymousId) return true;
  }
  return false;
}

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

  // Get both DO and DON'T exemplars for contrast
  const doExemplar = (fl.exemplars || []).find(e => /DO/i.test(e.label || ''));
  const dontExemplar = (fl.exemplars || []).find(e => /DON'T|DONT/i.test(e.label || ''));

  // Extract tension zones and evaluation criteria
  const tensionZones = (fl.boundaries?.tension_zones || []).slice(0, 2);
  const silentFailures = (fl.evaluation?.silent_failures || []).slice(0, 2);

  // Get cultural variant for the target language
  const culturalVariants = fl.cultural_variants || {};
  const culturalLens = isCn ? culturalVariants['zh-CN'] : culturalVariants['en-US'];

  // Build the fallback prompt with enhanced semantic capital
  const buildFallbackPrompt = () => {
    if (isCn) {
      let prompt = `你是一个 AI 助手，正在按照下面这个 Skill 行事：

【原则】${principle}`;

      // Add cultural note for context
      if (culturalLens?.principle_note) {
        prompt += `\n【文化背景】${culturalLens.principle_note}`;
      }

      if (applies) prompt += `\n【适用】${applies}`;
      if (notApplies) prompt += `\n【不适用】${notApplies}`;

      // Show both DO and DON'T for sharp contrast
      if (doExemplar) prompt += `\n【要这样】${doExemplar.text}`;
      if (dontExemplar) prompt += `\n【不要这样】${dontExemplar.text}`;

      // Show what "looks good but is actually dead" to avoid silent failures
      if (silentFailures.length > 0) {
        prompt += `\n【陷阱】要避免这些看似对但精神已死的做法：`;
        silentFailures.forEach(sf => {
          prompt += `\n  · ${sf}`;
        });
      }

      // Remind of the tension/tradeoff
      if (tensionZones.length > 0) {
        prompt += `\n【权衡】这个 Skill 在以下方向上有张力，不要试图 "平衡"：`;
        tensionZones.forEach(tz => {
          prompt += `\n  · ${tz}`;
        });
      }

      prompt += `

请用 2-3 句话（≤80 字），第一人称，回应下面的情境。让这个 Skill 的精神在你的回应里活起来——不是引用它，是体现它。

情境：
${scenarioText}

只返回 JSON：{"response":"你的回应（2-3 句，≤80 字，无引言无说明）"}`;
      return prompt;
    } else {
      let prompt = `You are an AI agent acting under the following Skill:

【Principle】${principle}`;

      if (culturalLens?.principle_note) {
        prompt += `\n【Cultural Note】${culturalLens.principle_note}`;
      }

      if (applies) prompt += `\n【Applies when】${applies}`;
      if (notApplies) prompt += `\n【Does not apply when】${notApplies}`;

      if (doExemplar) prompt += `\n【DO】${doExemplar.text}`;
      if (dontExemplar) prompt += `\n【DON'T】${dontExemplar.text}`;

      if (silentFailures.length > 0) {
        prompt += `\n【Pitfalls】Avoid these — they look good but the spirit is dead:`;
        silentFailures.forEach(sf => {
          prompt += `\n  · ${sf}`;
        });
      }

      if (tensionZones.length > 0) {
        prompt += `\n【Tension】This Skill sits in these tensions — don't try to "balance":`;
        tensionZones.forEach(tz => {
          prompt += `\n  · ${tz}`;
        });
      }

      prompt += `

Respond in 2-3 sentences (≤60 words), first person, to the scenario below. Let the spirit of the Skill come through your response — don't quote it, embody it.

Scenario:
${scenarioText}

Return JSON only: {"response":"your reply (2-3 sentences, ≤60 words, no preamble, no commentary)"}`;
      return prompt;
    }
  };

  // Length budget tuned for A/B differentiation. 1-2 sentences was
  // too compressed — the with-skill and without-skill replies often
  // collapsed to near-identical one-liners. 2-3 sentences (≤80 字 /
  // ≤60 words) gives the model enough room to show its tone, pacing
  // and stance while still fitting inside the rate-card without
  // forcing a scroll.
  // The Skill's own ready_to_use_prompt was authored in whatever language the
  // creator forged it in, which often does not match the scenario's language.
  // A long block of Chinese skill-prompt text followed by a short English
  // instruction frequently gets answered in Chinese anyway — the model
  // inherits the dominant language of the context unless told explicitly
  // and unambiguously which language to answer in, regardless of the Skill's
  // own language. Hence the all-caps language override line below.
  const withSkillPrompt = readyPrompt
    ? (isCn
        ? `${readyPrompt}

请用 2-3 句话（≤80 字），第一人称，回应下面的情境。让上面这条 Skill 的精神在你的回应里自然活起来——不引用、不复述，只是体现。

情境：
${scenarioText}

重要：无论上面这条 Skill 是用什么语言写的，你的回应必须用中文。

只返回 JSON：{"response":"你的回应（2-3 句，≤80 字，无引言无说明）"}`
        : `${readyPrompt}

Respond in 2-3 sentences (≤60 words), first person, to the scenario below. Let the Skill above come through your response naturally — don't quote it, embody it.

Scenario:
${scenarioText}

IMPORTANT: Regardless of what language the Skill above is written in, your response MUST be in English.

Return JSON only: {"response":"your reply (2-3 sentences, ≤60 words, no preamble, no commentary)"}`)
    : buildFallbackPrompt();

  // Baseline: minimal intervention, maximum raw LLM ability
  // Goal: No content bias (no "helpful", "friendly", "thoughtful"),
  // but ensure quality & comparability with the Skill response.
  // Constraints: only format (JSON) + length (comparable to Skill) + implicit task clarity
  const withoutSkillPrompt = isCn
    ? `情境：
${scenarioText}

请给出一个回应（保持在合理长度内，无需解释或前言）。

只返回 JSON：{"response":"..."}`
    : `Scenario:
${scenarioText}

Give a response (keep it reasonable in length, no explanation or preamble needed).

Return JSON only: {"response":"..."}`;

  return { withSkillPrompt, withoutSkillPrompt, isCn };
}

// ─── Build the one-line diagnostic prompt ───
// Asks the LLM to compare the two responses and produce a single short
// sentence of the form "A 先承接情绪再讲事实，B 直接辩驳" — used in the
// Twin Test reveal step. Kept tiny (~80 tokens) so the extra call is cheap.
// ─── Build diagnostic prompt ───
// Simple: what's the key difference? How did Skill improve it?
function buildDiagnosticPrompt(scenarioText, withText, withoutText, skillSide, isCn, skill) {
  const A = skillSide === 'A' ? withText : withoutText;
  const B = skillSide === 'A' ? withoutText : withText;

  if (isCn) {
    return `下面是同一情境的两段回应。一段是基础AI，一段加载了用户的Skill。用一句话（≤25字）说明关键差异。

情境：${scenarioText}
A：${A}
B：${B}

只返回 JSON：{"diagnostic":"关键差异：..."}`;
  } else {
    return `Two responses to the same scenario. One is baseline AI, one has a Skill loaded. State the key difference in ONE sentence (≤15 words).

Scenario: ${scenarioText}
A: ${A}
B: ${B}

Return JSON only: {"diagnostic":"Key difference: ..."}`;
  }
}

// ═══ POST /test — generate Twin Test responses ═══
// Rate limited (LLM calls: 10/min) to protect API quota
router.post('/test', rateLimitLLM, async (req, res, next) => {
  try {
    const { skill_id, scenario, anonymous_id, creator_name, language } = req.body || {};

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

    // Call DeepSeek twice in parallel with timeout protection (reduced max_tokens for faster generation).
    const GENERATION_TIMEOUT = 30000; // 30 seconds max per request

    let withResp, withoutResp;
    try {
      [withResp, withoutResp] = await Promise.race([
        Promise.all([
          callLLMWithClaudeFallback(withSkillPrompt, 400, 'twin_test_with_skill')
            .catch(e => ({ error: e.message, code: 'GENERATION_ERROR' })),
          callLLMWithClaudeFallback(withoutSkillPrompt, 400, 'twin_test_without_skill')
            .catch(e => ({ error: e.message, code: 'GENERATION_ERROR' }))
        ]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Generation timeout')), GENERATION_TIMEOUT)
        )
      ]);
    } catch (timeoutErr) {
      console.error('❌ Playground generation timeout:', timeoutErr.message);
      return res.status(504).json({
        error: 'Generation timeout',
        message: 'The generation took too long. Please try again.'
      });
    }

    // Validate responses
    if (!withResp || !withoutResp) {
      console.error('❌ Playground generation returned null response');
      return res.status(502).json({
        error: 'Invalid response',
        message: 'Generation returned invalid data'
      });
    }

    if (withResp.error || withoutResp.error) {
      const rawError = withResp.error || withoutResp.error || 'Unknown generation error';
      console.error('❌ Playground twin-test generation error:', rawError);
      logger.error('twin_test_generation_failed', { skillId: skill_id, message: rawError.substring(0, 200) });
      // Never forward the raw provider error (API keys, status codes, JSON
      // shape) to the client — it briefly rendered verbatim in the UI
      // ("DeepSeek HTTP 401: {...}") before this fix. The real message is
      // already logged server-side above for diagnosis.
      return res.status(502).json({
        error: 'Generation failed',
        message: isCn
          ? '生成暂时失败了，请稍后再试一次。'
          : 'Generation failed for now — please try again in a moment.'
      });
    }

    const withText = (withResp.data?.response || '').trim();
    const withoutText = (withoutResp.data?.response || '').trim();
    if (!withText || !withoutText) {
      console.error('❌ Playground generation produced empty response');
      return res.status(502).json({
        error: 'Empty response',
        message: 'One of the responses came back empty'
      });
    }

    logger.info('twin_test_generated', { skillId: skill_id, expectedCn: isCn });
    const withIsCn = looksChinese(withText);
    const withoutIsCn = looksChinese(withoutText);
    if (withIsCn !== isCn || withoutIsCn !== isCn) {
      logger.warn('twin_test_language_mismatch', {
        skillId: skill_id, expectedCn: isCn, withTextIsCn: withIsCn, withoutTextIsCn: withoutIsCn
      });
    }

    // Randomize A/B so the user can't guess which is which.
    const skillIsA = Math.random() < 0.5;
    const responseA = skillIsA ? withText : withoutText;
    const responseB = skillIsA ? withoutText : withText;
    const skillSide = skillIsA ? 'A' : 'B';

    // Generate diagnostic: what's the key difference?
    const scenarioText = [scenario.title, scenario.description].filter(Boolean).join(' — ');
    const diagPrompt = buildDiagnosticPrompt(scenarioText, withText, withoutText, skillSide, isCn, skill);
    let diagnostic = '';
    try {
      const diagResp = await callLLMWithClaudeFallback(diagPrompt, 100, 'twin_test_diagnostic');
      diagnostic = (diagResp.data?.diagnostic || '').trim();
    } catch (e) {
      console.warn('Diagnostic generation skipped:', e.message);
    }

    // Persist the test so /vote can reveal & score it later. is_author is
    // stamped now (this is the only point we have identity info) and counts
    // toward the public win rate like any other blind vote — it's kept so
    // author votes can be singled out later for data analysis, not to
    // exclude them (see verificationHealth.js header for the rationale).
    const testId = uuidv4();
    const scenarioKey = scenario.key || scenario.title || `${scenario.domain || ''}-unknown`;
    const isAuthor = isAuthorOfSkill(skillRow.creator_anonymous_id, anonymous_id, creator_name) ? 1 : 0;
    try {
      const scenarioTitle = (scenario.title || scenario.titleCn || '').slice(0, 500);
      await db.query(
        `INSERT INTO skill_test_votes
           (id, skill_id, scenario_key, anonymous_id, skill_side, diagnostic,
            scenario_text, response_a_text, response_b_text, is_author)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [testId, skill_id, String(scenarioKey).slice(0, 250), safeAnonId(anonymous_id),
         skillSide, diagnostic || null,
         scenarioTitle, responseA.slice(0, 2000), responseB.slice(0, 2000), isAuthor]
      );
    } catch (dbErr) {
      console.warn('skill_test_votes insert failed (non-fatal):', dbErr.message);
    }

    res.json({
      success: true,
      test_id: testId,
      response_a: responseA,
      response_b: responseB,
      // Deliberately NOT returning skill_side or diagnostic here -- this
      // is a blind test. Both are stored server-side above and only
      // revealed by POST /vote, after the user has committed to a pick.
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
// (better / worse / no_diff) plus a free-text note instead of a side
// pick. The middle option used to be "neutral" (just OK) — flipped to
// "worse" so the schema includes a real negative signal, which the
// research side needs to spot skills that are actively making the AI
// less useful. Legacy "neutral" rows from the first cut stay in the
// DB but are no longer accepted from the client and not included in
// the percentage calculations below.
const FEEDBACK_RATINGS = new Set(['better', 'worse', 'no_diff']);
router.post('/feedback', async (req, res, next) => {
  try {
    const { test_id, rating, comment, anonymous_id } = req.body || {};

    if (!test_id) {
      return res.status(400).json({ error: 'Missing input', message: 'test_id is required' });
    }
    if (!FEEDBACK_RATINGS.has(rating)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'rating must be "better", "worse", or "no_diff"'
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
          safeAnonId(anonymous_id),
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

    // Only count rows whose rating is in the current schema so the
    // displayed percentage isn't diluted by legacy 'neutral' rows.
    const counts = { better: 0, worse: 0, no_diff: 0 };
    let total = 0;
    for (const row of stats) {
      const n = Number(row.n) || 0;
      if (counts[row.rating] !== undefined) {
        counts[row.rating] = n;
        total += n;
      }
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
// Rate limited (20/min) to prevent vote tampering
router.post('/vote', rateLimitTwinTest, async (req, res, next) => {
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
    // effectiveChosenSide is what is/will be persisted - the first vote's
    // value if one already exists, otherwise this request's value - so the
    // response below always reflects the same vote as the database, even
    // when a retry or double-tap resubmits a different chosen_side.
    const effectiveChosenSide = row.chosen_side || chosen_side;
    if (!row.chosen_side) {
      const votedForSkill = chosen_side === row.skill_side ? 1 : 0;
      await db.query(
        `UPDATE skill_test_votes
         SET chosen_side = $1, voted_for_skill = $2, voted_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [chosen_side, votedForSkill, test_id]
      );
    }

    // Running win rate for this skill — every blind vote counts, including
    // the author's own (see verificationHealth.js header). author_votes is
    // surfaced alongside so this vote's provenance isn't lost even though
    // it's counted.
    const { total_votes: total, wins, win_rate: winRate, author_votes: authorVotes, verification_status: verificationStatus } =
      await getSkillVerificationStats(db, row.skill_id);

    res.json({
      success: true,
      skill_side: row.skill_side,
      voted_for_skill: effectiveChosenSide === row.skill_side,
      diagnostic: row.diagnostic || '',
      total_votes: total,
      wins,
      win_rate: winRate,
      author_votes: authorVotes,
      verification_status: verificationStatus
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
// Optional: ?exclude_domain=DOMAIN — skips skills from that domain (used for "try another" flow)
router.get('/picker', async (req, res, next) => {
  try {
    const { anonymous_id, exclude_domain, creator_name } = req.query;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 8, 30));

    // skills.creator_anonymous_id stores "creator_<username>" when the forge
    // supplied a creatorName (the normal flow), falling back to the device
    // anonymous_id otherwise. Match on BOTH so "your latest forge" works:
    //   - device id  → anonymous-only forges
    //   - creator_<name> → named forges (the common case)
    const ownerKeys = [];
    const safeAnonIdQuery = safeAnonId(anonymous_id);
    if (safeAnonIdQuery) ownerKeys.push(safeAnonIdQuery);
    const safeCreator = safeAnonId(creator_name);
    if (safeCreator) ownerKeys.push(`creator_${safeCreator.replace(/^creator_/i, '')}`);

    let mySkills = [];
    if (ownerKeys.length) {
      const placeholders = ownerKeys.map((_, i) => `$${i + 1}`).join(', ');
      mySkills = (await db.query(
        `SELECT s.*, u.username AS creator_name
         FROM skills s
         LEFT JOIN users u ON s.author_id = u.id
         WHERE s.creator_anonymous_id IN (${placeholders})
           AND s.published = 1
           AND s.deleted_at IS NULL
         ORDER BY s.published_at DESC
         LIMIT $${ownerKeys.length + 1}`,
        [...ownerKeys, limit]
      )).rows || [];
    }

    // Fetch a generous pool for hot — we'll dedupe locally.
    let hotQuery = `
      SELECT s.*, u.username AS creator_name
       FROM skills s
       LEFT JOIN users u ON s.author_id = u.id
       WHERE s.published = 1 AND s.deleted_at IS NULL
    `;
    let hotParams = [];
    if (exclude_domain && typeof exclude_domain === 'string') {
      hotQuery += ` AND (s.domain IS NULL OR s.domain != $1)`;
      hotParams.push(exclude_domain);
    }
    hotQuery += ` ORDER BY COALESCE(s.starlight_score, 0) DESC, s.published_at DESC LIMIT $${hotParams.length + 1}`;
    hotParams.push(limit + mySkills.length + 10);

    const hotSkills = (await db.query(hotQuery, hotParams)).rows || [];

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
    // round trip. is_mine matches either ownership key (device id or
    // creator_<username>).
    const ownerSet = new Set(ownerKeys);
    const annotated = merged.map(s => ({
      ...s,
      is_mine: !!s.creator_anonymous_id && ownerSet.has(s.creator_anonymous_id)
    }));

    res.json({ success: true, skills: annotated });
  } catch (error) {
    next(error);
  }
});

// ═══ GET /stats-batch — win rates for many skills in one query ═══
// Used by Archive grid to badge every card without N+1 requests.
// "Win rate" = better / (better + worse + no_diff) from skill_feedback,
// "tests" = rows in skill_test_votes. Returns only skills with activity.
router.get('/stats-batch', async (req, res, next) => {
  try {
    const [feedbackRows, testRows, verificationStats] = await Promise.all([
      db.query(
        `SELECT skill_id, rating, COUNT(*) AS n
         FROM skill_feedback
         WHERE rating IN ('better','worse','no_diff')
         GROUP BY skill_id, rating`
      ),
      db.query(
        `SELECT skill_id, COUNT(*) AS n
         FROM skill_test_votes
         GROUP BY skill_id`
      ),
      getBatchVerificationStats(db)
    ]);

    const stats = {};
    for (const r of (testRows.rows || [])) {
      stats[r.skill_id] = { tests: Number(r.n) || 0, better: 0, worse: 0, no_diff: 0 };
    }
    for (const r of (feedbackRows.rows || [])) {
      if (!stats[r.skill_id]) stats[r.skill_id] = { tests: 0, better: 0, worse: 0, no_diff: 0 };
      stats[r.skill_id][r.rating] = Number(r.n) || 0;
    }
    for (const id of Object.keys(stats)) {
      const s = stats[id];
      const rated = s.better + s.worse + s.no_diff;
      s.win_rate = rated > 0 ? Math.round((s.better / rated) * 100) : null;
      s.rated = rated;
    }
    // Verification status (blind votes, author included) — a separate
    // signal from the "better/worse" self-report above. Merge in for every
    // skill that has verification data, even ones with no feedback rows yet.
    for (const [id, v] of Object.entries(verificationStats)) {
      if (!stats[id]) stats[id] = { tests: 0, better: 0, worse: 0, no_diff: 0, win_rate: null, rated: 0 };
      stats[id].verification_status = v.verification_status;
      stats[id].verification_total_votes = v.total_votes;
      stats[id].verification_win_rate = v.win_rate;
      stats[id].verification_author_votes = v.author_votes;
    }

    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

// ═══ GET /stats/:skill_id — verification status (used by Archive cards) ═══
router.get('/stats/:skill_id', async (req, res, next) => {
  try {
    const { skill_id } = req.params;
    const stats = await getSkillVerificationStats(db, skill_id);
    res.json({ success: true, ...stats });
  } catch (error) {
    next(error);
  }
});

export default router;
