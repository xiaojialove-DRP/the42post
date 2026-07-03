/* ═══════════════════════════════════════════════════════
   Skill Generation — DeepSeek primary, Claude fallback

   Provider chain:
     1. DeepSeek  (DEEPSEEK_API_KEY)   — primary, fast, cheap
     2. Claude    (ANTHROPIC_API_KEY)  — automatic fallback if DeepSeek is down
     3. Template                        — last-resort so forge flow never blocks

   Env:
     - DEEPSEEK_API_KEY   (required for primary)
     - DEEPSEEK_MODEL     (optional, defaults to "deepseek-chat")
     - ANTHROPIC_API_KEY  (optional, enables Claude fallback)
     - ANTHROPIC_MODEL    (optional, defaults to "claude-haiku-4-5-20251001")
   ═══════════════════════════════════════════════════════ */

import crypto from 'crypto';
import { logger } from './logger.js';

// ═══ INITIALIZE DEEPSEEK CLIENT ═══
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('❌ CRITICAL: DEEPSEEK_API_KEY not set!');
  console.error('Skill generation will not work without this environment variable.');
  console.error('Please set DEEPSEEK_API_KEY in your Zeabur environment variables.');
}

// deepseek-chat = latest V3.2-Exp (general purpose, fast, cheap)
// deepseek-reasoner = R1-style thinking model (slower, more expensive)
const PRIMARY_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
// DeepSeek currently exposes 2 model aliases; use both as a soft fallback.
const FALLBACK_MODELS = ['deepseek-chat', 'deepseek-reasoner'].filter(m => m !== PRIMARY_MODEL);
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || 'missing-key';

// Which error messages are worth retrying / failing over for
function isRetryable(msg) {
  return /429|500|502|503|504|overloaded|unavailable|Service Unavailable|high demand|temporary|quota|rate limit|Too Many Requests|ECONNRESET|timeout|fetch failed/i.test(msg || '');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Timeout wrapper for fetch calls ───
// Prevents infinite hangs if the API server never responds
async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Streaming call: pipes raw token chunks to a callback ───
// onChunk(text) is called for each partial token as it arrives.
// Returns the complete accumulated text when the stream ends.
export async function callDeepSeekStream(prompt, maxTokens, onChunk) {
  const body = {
    model: PRIMARY_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true
    // No response_format: json_object — streaming + json_object is not supported
  };

  const resp = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`DeepSeek stream HTTP ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const chunk = JSON.parse(trimmed.slice(6));
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          fullText += delta;
          onChunk(delta);
        }
      } catch { /* malformed chunk — skip */ }
    }
  }

  return fullText;
}

// ─── Single-model call (no retry) ───
async function callDeepSeekSingle(modelName, prompt, maxTokens) {
  const body = {
    model: modelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' }
  };

  // Set timeout to 90 seconds per individual attempt
  // (Most responses complete in 5-15 seconds, 90s allows for network latency and larger prompts)
  const CALL_TIMEOUT = 90000;

  const resp = await fetchWithTimeout(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_KEY}`
    },
    body: JSON.stringify(body)
  }, CALL_TIMEOUT);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    // Surface the HTTP status in the message so isRetryable can pattern-match it.
    throw new Error(`DeepSeek HTTP ${resp.status}: ${errText.substring(0, 300)}`);
  }

  const json = await resp.json();
  const text = json.choices?.[0]?.message?.content || '';
  const usage = json.usage || {};

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // DeepSeek occasionally wraps JSON in markdown code fences despite json mode
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const jsonMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch) throw new Error('Failed to parse DeepSeek response as JSON');
      parsed = JSON.parse(jsonMatch[0]);
    }
  }

  return {
    data: parsed,
    model: modelName,
    usage: {
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0
    }
  };
}

// ─── Claude fallback (direct REST, no SDK required) ───
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

async function callClaudeJSON(prompt, maxTokens) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const resp = await fetchWithTimeout(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  }, 90000);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Claude HTTP ${resp.status}: ${errText.substring(0, 300)}`);
  }

  const json = await resp.json();
  const text = json.content?.[0]?.text || '';
  const usage = json.usage || {};

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const jsonMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch) throw new Error('Failed to parse Claude response as JSON');
      parsed = JSON.parse(jsonMatch[0]);
    }
  }

  return {
    data: parsed,
    model: ANTHROPIC_MODEL,
    usage: { input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0 }
  };
}

// ─── Shared DeepSeek call helper (JSON mode) — with retry + model fallback ───
// Strategy:
//   1. Try PRIMARY_MODEL up to 3 times with exponential backoff (0, 800ms, 1600ms)
//   2. On persistent transient errors, walk through FALLBACK_MODELS once each
//   3. Surface the last error so the caller's own fallback logic can kick in
export async function callLLMJSON(prompt, maxTokens = 1500) {
  const attempts = [
    { model: PRIMARY_MODEL, delay: 0 },
    { model: PRIMARY_MODEL, delay: 800 },
    { model: PRIMARY_MODEL, delay: 1600 },
    ...FALLBACK_MODELS.map(m => ({ model: m, delay: 0 }))
  ];

  const startedAt = Date.now();
  let lastError;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (attempt.delay) await sleep(attempt.delay);
    try {
      const result = await callDeepSeekSingle(attempt.model, prompt, maxTokens);
      const durationMs = Date.now() - startedAt;
      // The one line that answers "did the LLM call actually work, and how
      // long did it take" — previously only failures were ever logged, so
      // there was no way to see this in production without a thrown error.
      logger.info('llm_call_succeeded', {
        model: attempt.model,
        usedFallback: attempt.model !== PRIMARY_MODEL,
        attemptNumber: i + 1,
        durationMs,
        outputTokens: result.usage?.output_tokens
      });
      if (attempt.model !== PRIMARY_MODEL) {
        console.warn(`⚠ DeepSeek primary (${PRIMARY_MODEL}) unavailable, succeeded with fallback: ${attempt.model}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      if (!isRetryable(msg)) {
        logger.warn('llm_call_failed_non_retryable', { model: attempt.model, message: msg.substring(0, 160) });
        throw err;
      }
      console.warn(`⚠ DeepSeek call failed on ${attempt.model}: ${msg.substring(0, 160)}`);
    }
  }
  logger.error('llm_call_exhausted', {
    primaryModel: PRIMARY_MODEL,
    attempts: attempts.length,
    durationMs: Date.now() - startedAt,
    lastError: (lastError?.message || '').substring(0, 200)
  });
  throw lastError || new Error('All DeepSeek attempts exhausted');
}

// ─── External-failure detector: decide whether to fall back gracefully ───
// Covers both (a) DeepSeek's own error responses and (b) malformed JSON output
// that we can't use. When any of these fire, the forge flow degrades to a
// template-based five-layer instead of returning a 500.
function isExternalFailure(msg) {
  return /credit balance|quota|rate limit|timeout|ECONNRESET|ENOTFOUND|fetch failed|api key|API_KEY|DEEPSEEK_API_KEY|401|403|429|500|502|503|504|overloaded|unavailable|billing|Insufficient|Failed to parse|JSON|Unexpected token|invalid response/i.test(
    msg || ''
  );
}

// ─── DeepSeek, with Claude as the real second attempt ───
// This file's own header documents Claude as the designed fallback tier
// (and every export below is even named "...WithClaude"), but
// callClaudeJSON previously had zero call sites anywhere in the codebase —
// every caller, including the Twin Test route, went straight from a
// DeepSeek failure to either a static template or a raw error. Shared so
// both callWithFallback (forge generation) and routes/playground.js
// (Twin Test) get the same real fallback instead of duplicating it.
export async function callLLMWithClaudeFallback(prompt, maxTokens, label = 'llm call') {
  try {
    return await callLLMJSON(prompt, maxTokens);
  } catch (error) {
    const msg = error.message || '';
    if (isExternalFailure(msg) && ANTHROPIC_KEY) {
      try {
        return await callClaudeJSON(prompt, maxTokens);
      } catch (claudeError) {
        logger.warn('skill_generation_claude_fallback_failed', { label, message: (claudeError.message || '').substring(0, 160) });
      }
    }
    throw error;
  }
}

// ─── Shared try/catch wrapper for all LLM generate functions ───
// mapData: (rawData) => normalised data object
// fallbackFn: () => { success, fallback, data, model } — called only on external failures
async function callWithFallback(prompt, maxTokens, label, mapData, fallbackFn = null) {
  try {
    const { data, model, usage } = await callLLMWithClaudeFallback(prompt, maxTokens, label);
    logger.info('skill_generation_step_succeeded', { label, model });
    return { success: true, data: mapData(data), model, usage };
  } catch (error) {
    const msg = error.message || '';
    console.error(`❌ DeepSeek ${label} error:`, msg);
    if (!isExternalFailure(msg)) {
      logger.error('skill_generation_step_failed', { label, message: msg.substring(0, 200) });
      return { success: false, message: `${label} failed: ${msg}` };
    }

    if (fallbackFn) {
      logger.warn('skill_generation_step_fell_back_to_template', { label, reason: msg.substring(0, 160) });
      console.warn(`⚠ Falling back to template ${label} so forge flow is not blocked.`);
      return fallbackFn();
    }
    logger.error('skill_generation_step_failed', { label, message: msg.substring(0, 200) });
    return { success: false, message: `${label} failed: ${msg}` };
  }
}

// ═══ PROBE GENERATION ═══
export async function generateProbeWithClaude(ideaText, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText);

  // Concise prompt — only 4 short fields needed, so 600 tokens is plenty.
  // Tighter prompt = faster first-token latency from the LLM.
  const prompt = isCn
    ? `你是 The 42 Post 的资深 AI 价值观研究员。
你的任务：把用户的原始人类直觉，转化为一个真正能考验"AI 该如何践行这个直觉"的尖锐场景。

用户想法（原话，可能是隐喻 / 愿望 / 片段 / 提问）：
「${ideaText}」

请按以下三步在心里推演，再输出 JSON：

【第一步 · 解码】
- 用户表面在说什么？背后真正想表达的人类直觉、本能或张力是什么？
- 如果是隐喻（例如"我需要一把立场转换枪"），翻译成它背后真实的人类困境（"想让别人看见我的视角 vs. 尊重对方的思想自由"）。
- 找出这个直觉所必然带来的**最难的取舍**——不是"好 vs. 坏"，而是"两个都珍贵的东西必须选一个"。
- 常见张力维度可参考（择最贴切者）：诚实 vs 善意、短期受益 vs 长期影响、个人自由 vs 集体福祉、文化差异、孩子的天真 vs 现实保护、创意/真实 vs 安全/合规。

【第二步 · 立体化场景】
- 一个真实的人（具名身份/角色，例如"7岁的女儿"、"准备明早考试的医学生"、"独居的退休教师"）、明确的时间地点、清晰的利害关系。
- 场景类型可参考（择一深挖）：儿童与 AI 互动、日常生活中的个人困境与艰难取舍、创意/审美冲突、亲密关系中的道德困境、跨文化沟通、职场与社交中的价值抉择。
- **严禁以下背景**：医疗资源分配（ECMO、器官、急救设备等）、临床急救决策、法庭判决与司法伦理——这些领域有严格的专业规范体系，不适合作为通用 AI 价值观探针的场景背景。请聚焦于日常人际、家庭、职场或创作领域的困境，而非医学或法律专业判断。
- 场景必须把 AI 逼到必须做出**单一艰难决定**的位置。
- 禁止："用户向 AI 提问"、"在某种情境下"、"当用户需要..."等空话。
- 场景必须明显是**用户那个直觉的考场**——读者一眼能看出它在测什么。
- **关键约束（避免生成虚假场景）**：
  - 场景必须与用户的原始创意有**直接因果关系**，不能生搬硬造或与想法完全无关。
  - 场景中的人物对话和行为必须**真实可信**，不能过于离谱、幼稚或出现AI式胡编。
  - 如果无法生成合理贴切的具体场景，宁可保持简洁也要保证**逻辑清晰和真实性**。

【第三步 · 三种实质不同的行动】
不是三种语气，是三种**具体不同的行动**，在"代价由谁承担 / 谁是受益方 / 谁负责"上可比可对照。
- thesis：社会上最容易被辩护的稳妥做法。
- antithesis：根据这个具体人和具体处境，做出更贴身的细腻取舍。
- extreme：为了忠于用户那个原始直觉，承担争议风险走到底（不是为极端而极端，而是把那个直觉推到它逻辑的尽头）。

每个回应 1-2 句，第一人称，像 AI 在那个场景里真的开口说话。
禁止：照搬用户原话、套模板措辞、空喊价值观词汇。

【智力门槛 · 不可妥协】
- **内在因果自洽**：场景里每一个约束必须自带一句话的因果链。"妈妈得糖尿病"不能直接推出"孩子不能吃糖"——除非补一句"家里因此全员控糖"或"妈妈怕女儿遗传"等。一切让读者必须脑补的因果都不合格，重写。
- **锐度优先于均衡**：合格的场景应该让一个聪明的读者**停下来重读一遍**。如果常识/直觉立刻就能给出"显然该怎么做"的答案，这个场景就废了——必须把困境压到两个选项都让人犹豫。
- **留一处机锋**：允许（不强求）在场景或回应里嵌一处**不动声色的机智细节**——一句小小的具体观察，让读者会心而不破坏严肃。例如"小美愤怒地把妈妈的儿童版血糖仪藏到沙发底下"——一笔同时补了因果、刻画了 8 岁孩子的反抗逻辑、透出 AI 真的看见了这个家。一处足矣，不是段子。

只返回 JSON：
{"scenario":"具体到人物/时间/利害的真实场景（1-2句，因果自洽）","thesis":"主流派行动（1-2句，第一人称）","antithesis":"情景派行动（1-2句，第一人称）","extreme":"实验派行动（1-2句，第一人称）"}`
    : `You are a senior AI values researcher at The 42 Post.
Your job: turn the user's raw human intuition into a sharp scenario that genuinely tests how an AI should embody that intuition.

User's idea (verbatim — may be a metaphor / wish / fragment / question):
"${ideaText}"

Reason through these three steps silently, then output JSON.

【Step 1 — Decode】
- What is the user surface-saying? What underlying human instinct, value, or tension is actually being expressed?
- If it is a metaphor (e.g. "I need a stance-switching gun"), translate it to the real human dilemma beneath it ("the wish to make others see my view vs. respecting their autonomy").
- Identify the **hardest tradeoff** this instinct forces — not "good vs. bad", but two genuinely valuable things that cannot both be honoured.
- Useful tension dimensions to draw from (pick the most apt): honest vs kind, short-term gain vs long-term impact, individual freedom vs collective welfare, cultural differences, a child's innocence vs real-world protection, creativity/authenticity vs safety/compliance.

【Step 2 — Stage a concrete scenario】
- A real named person with role/identity (e.g. "a 7-year-old daughter", "a medical student preparing for tomorrow's exam", "a retired teacher living alone"), specific time and place, clear stakes.
- Scenario types to draw from (pick one and go deep): children interacting with AI, everyday personal dilemmas under time or emotional pressure, creative/aesthetic conflicts, moral dilemmas inside intimate relationships, cross-cultural communication, workplace or social trade-offs.
- **Off-limits backgrounds**: medical resource allocation (ICU equipment triage, organ allocation, emergency device choices), clinical emergency decisions, court rulings, legal ethics dilemmas — these domains have strict professional frameworks not suited for general AI values probing. Stick to everyday personal, family, workplace, or creative dilemmas instead of medical or legal professional judgment.
- The scenario must put the AI on the spot to make a **single hard choice**.
- Banned: "a user asks the AI...", "in a certain context...", "when the user needs...", any abstract setup without stakes.
- A reader should instantly see this is a stress test of *that* instinct.

【Step 3 — Three substantively different actions】
Not three tones — three **different concrete actions**, comparable on "who bears the cost / who benefits / who carries responsibility".
- thesis: the most socially-defensible safe action.
- antithesis: a context-sensitive action fitted to this specific person and situation.
- extreme: an action that takes a contested risk in order to stay loyal to the user's raw instinct — push that instinct to its logical limit, not edginess for its own sake.

Each response 1-2 sentences, first person, sounds like the AI actually speaking in that moment.
Banned: parroting the user's wording, template phrasing, hollow value-words.

【Intelligence bar — non-negotiable】
- **Internal causal sanity**: every constraint named in the scenario must carry its own one-line causal link. "Mom has diabetes" does NOT by itself entail "the child can't eat sugar" — you must add "the household is now on a low-sugar regime" or "mom worries about hereditary risk" or similar. Any causal leap that asks the reader to fill in is a failure — rewrite.
- **Sharpness over balance**: a competent scenario should make a thoughtful reader **pause and re-read**. If common sense already tells you the obvious answer, the scenario has failed — push the dilemma until both options give a reader genuine pause.
- **One wry detail allowed**: optionally (not required), embed a single quiet, intelligent observation in the scenario or one of the responses — a small specific touch that gives the thoughtful reader a half-smile without breaking gravity. e.g. "the 8-year-old has hidden the children's blood-sugar meter under the sofa" — one stroke that supplies the missing causal context, captures real 8-year-old logic, and signals the AI has *seen* this family. One touch, never a joke.

Return JSON only:
{"scenario":"Concrete scenario with named person, time, stakes (1-2 sentences, causally self-consistent)","thesis":"Mainstream action (1-2 sentences, first person)","antithesis":"Contextual action (1-2 sentences, first person)","extreme":"Experimental action (1-2 sentences, first person)"}`;

  // 600 tokens is enough for 4 short strings — faster than the old 1500
  return callWithFallback(prompt, 600, 'probe generation',
    d => ({ scenario: d.scenario || '', thesis: d.thesis || '', antithesis: d.antithesis || '', extreme: d.extreme || '' }),
    () => probeFallback(ideaText, language)
  );
}

// ─── Template fallback for probe ───
// Used only when DeepSeek is unreachable. Makes the scenario specific to the
// idea so it at least feels personalised even without AI generation.
function probeFallback(ideaText, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText);
  // Truncate idea for readable embedding
  const shortIdea = ideaText.length > 60 ? ideaText.slice(0, 60) + '…' : ideaText;
  const t = isCn
    ? {
        scenario: `用户向 AI 求助时说：「${shortIdea}」——这个时刻正是考验 AI 如何践行这种直觉的关键节点。`,
        thesis: `这是一个标准的场景。让我采用广泛接受的、经过验证的方式。可靠和一致是首要任务。`,
        antithesis: `让我们考虑具体情境。每个情况都有细微差别。我会根据你的具体需求和背景做出更有针对性的回应。`,
        extreme: `让我们探索极限。有时最好的解决方案来自于质疑假设。你愿意冒一些风险来获得创新吗？`
      }
    : {
        scenario: `A user turns to AI saying: "${shortIdea}" — this moment is the exact test of whether the AI can embody this instinct.`,
        thesis: `This is a standard scenario. Let me take a broadly accepted, well-validated approach. Reliability and consistency are the priority.`,
        antithesis: `Let's consider the specific context. Every situation has nuances. I'll tailor my response to your actual needs and background.`,
        extreme: `Let's explore the limits. Sometimes the best solution comes from questioning assumptions. Are you willing to take some risk for innovation?`
      };

  return {
    success: true,
    fallback: true,
    data: t,
    model: `${PRIMARY_MODEL}-fallback`
  };
}

// ═══ STEP-2 PREVIEW GENERATION ═══
// Lightweight call used right after the user picks a probe response.
// Produces the three editable fields shown in STEP 2 of the forge UI:
//   - skill_name (suggestion)
//   - definition (1-2 sentences capturing the user's actual instinct)
//   - use_when   (concrete trigger situation)
//   - refuse_when (concrete non-applicability)
// No auth required — runs before the account-confirm step.
export async function generatePreviewWithClaude(
  ideaText,
  selectedResponse,         // 'thesis' | 'antithesis' | 'extreme'
  probeData,                // { scenario, thesis, antithesis, extreme }
  language = 'en'
) {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText);
  const chosenText = probeData?.[selectedResponse] || '';
  const styleLabelCn = { thesis: '主流派（社会公认的稳妥做法）', antithesis: '情景派（贴身的细腻取舍）', extreme: '实验派（为忠于直觉冒争议风险）' }[selectedResponse] || selectedResponse;
  const styleLabelEn = { thesis: 'mainstream (socially-defensible safe path)', antithesis: 'contextual (nuanced situation-fitted tradeoff)', extreme: 'experimental (contested risk to honour the instinct)' }[selectedResponse] || selectedResponse;

  const prompt = isCn
    ? `你是 The 42 Post 的 AI 价值观研究员。用户刚完成了直觉探针，现在你要为他/她"提炼"出一个可铸造的 AI 技能（不是写完整规范，只是 STEP 2 的三个核心字段）。

【用户原话】「${ideaText}」
【探针场景】${probeData?.scenario || ''}
【用户选择】${styleLabelCn}：「${chosenText}」

请按以下两步推演，再输出 JSON：

第一步 · 解码：
- 用户的原话+他选择的取向，真正在表达什么人类直觉？
- 核心张力是什么？（哪两个有价值的东西在打架？）

第二步 · 写出三段必须**针对这个具体想法**的内容：

1. skill_name：3-8 字的技能名，要有诗意/有形象感，能一眼让人记住，不要"通用伦理技能"这类废话。
2. definition：1-2 句话，捕捉用户那个原始直觉的真实精神——读者一看就觉得"对，这就是 ta 想要的"。禁止套话（"激进地推进"、"灵活适应"、"在 X 与 Y 之间平衡"等空架子）。
3. use_when：1 句话，**具体的触发场景**——给出可识别的情境信号（人物状态/对话内容/任务类型），不要"当用户表达相关需求时"。
4. refuse_when：1 句话，**具体的不适用场景**——明确说出哪种情况下使用反而有害或失焦，不要"当造成直接伤害时"。

只返回 JSON：
{"skill_name":"","definition":"","use_when":"","refuse_when":""}`
    : `You are an AI values researcher at The 42 Post. The user has just finished the intuition probe; now distill their choice into the three editable fields shown in STEP 2 of the forge UI (not a full skill spec).

【User's idea (verbatim)】 "${ideaText}"
【Probe scenario】 ${probeData?.scenario || ''}
【User selected】 ${styleLabelEn}: "${chosenText}"

Reason in two steps before output:

Step 1 — Decode:
- What human instinct is the user actually expressing through this idea + this choice?
- What is the core tension? (which two valuable things are pulling against each other?)

Step 2 — Write three pieces that are **specific to this idea**:

1. skill_name: 2-5 words, evocative, memorable. Banned: generic words like "Generic Ethical Skill".
2. definition: 1-2 sentences capturing the actual spirit of the user's instinct — a reader should feel "yes, that's what they meant". Banned phrases: "aggressively pursue", "flexibly adapt", "balance between X and Y", and other hollow scaffolding.
3. use_when: 1 sentence, **concrete trigger situation** — name the recognisable signals (person's state / conversation content / task type). Not "when the user expresses relevant needs".
4. refuse_when: 1 sentence, **concrete non-applicability** — name the specific case where applying this would do harm or miss the point. Not "when it causes direct harm".

Return JSON only:
{"skill_name":"","definition":"","use_when":"","refuse_when":""}`;

  return callWithFallback(prompt, 600, 'preview generation',
    d => ({ skill_name: d.skill_name || '', definition: d.definition || '', use_when: d.use_when || '', refuse_when: d.refuse_when || '' }),
    () => previewFallback(ideaText, selectedResponse, probeData, language)
  );
}

// ─── Template fallback for Step-2 preview ───
// Used only when DeepSeek/Claude are both unreachable, so picking a probe
// response never dead-ends the forge flow with a raw provider error.
function previewFallback(ideaText, selectedResponse, probeData, language = 'en') {
  const isCn = language === 'zh' || /[一-鿿]/.test(ideaText);
  const shortIdea = ideaText.length > 40 ? ideaText.slice(0, 40) + '…' : ideaText;

  const t = isCn
    ? {
        skill_name: '直觉守护者',
        definition: `捕捉并践行这个直觉：「${shortIdea}」`,
        use_when: `当对话情境呼应这个直觉所描述的场景时。`,
        refuse_when: `当应用这个直觉会忽视更紧迫的安全或伦理考量时。`
      }
    : {
        skill_name: 'Intuition Keeper',
        definition: `Honor and embody this instinct: "${shortIdea}"`,
        use_when: `When the conversation echoes the scenario this instinct describes.`,
        refuse_when: `When applying this instinct would override a more urgent safety or ethical concern.`
      };

  return {
    success: true,
    fallback: true,
    data: t,
    model: `${PRIMARY_MODEL}-fallback`
  };
}

// ═══ FLAT FIVE-LAYER PREVIEW (from name + definition; used by preview modal) ═══
export async function generateFlatFiveLayerWithClaude(
  skillName,
  definition,
  domain = 'ideas',
  feedback = '',
  language = 'en'
) {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(definition + skillName);
  const feedbackBlock = feedback
    ? (isCn ? `\n\n用户对上一版的反馈：「${feedback}」。请吸收。` : `\n\nUser feedback on the previous attempt: "${feedback}". Incorporate it.`)
    : '';

  const prompt = isCn
    ? `你是 The 42 Post 的 AI 价值观研究员。请基于一个已经命名的 Skill，写一段五层的"编辑式预览"——给作者在发布前最后看一眼。

【美学：压缩与留白】
Skill 是"语义资本"：一颗高度压缩的种子，能让 AI agent 在不同情境中重新诠释，不是程序手册。
- 一句立场胜过三句解释。
- 一对锐利对照胜过五个平庸例子。
- 命名一类信号胜过列举具体台词。

【输入】
- 技能名：「${skillName}」
- 核心定义：「${definition}」
- 域：「${domain}」${feedbackBlock}

每层一段紧凑文字（2-3 句），不要编号、不要 bullet、不要 markdown。每段都必须**针对这个具体定义**而非套话。

禁令：「激进地推进」「灵活适应」「在 X 与 Y 之间平衡」「当用户表达相关需求时」等空架子。

【ready_to_use_prompt — 关键字段】
还要写一段自然语言的 System Prompt，让用户**直接复制粘贴到 ChatGPT / Claude / Gemini** 即可使用。要求：
- 第二人称 "You are..."（中文用"你"），把 AI 直接当作正在执行这个 Skill 的对象
- 8-14 句话，把上面五层凝练成一段连贯的指令（不是再列一遍五层标题）
- 包含：身份/姿态 → 何时启用此 Skill → 具体怎么回应（含一个对照例子）→ 边界 → 失败模式自检
- 不要写"以下是五层"之类的元描述。读起来像一个完整的、独立可用的 system prompt
- 不要带 markdown 标题或代码框。

只返回 JSON：
{
  "name": "${skillName}",
  "definition": "对核心定义的一句润色版（保留作者原意）",
  "defining": "立场与它为什么值得作为语义资本被守护。",
  "instantiating": "一组锐利对照——一个体现这种立场的具体回应 vs 一个看似相近实则错位的回应。",
  "fencing": "命名一类适用信号，再命名一类不适用信号；点出与之拉扯的另一个有名有姓的价值。",
  "validating": "一个体验式问句作为判定——读者读完会问的那种。再点出'看似执行实则精神已死'的样子。",
  "contextualizing": "跨语言/文化时，这条立场的表达方向会如何偏移（一行说出方向，不写脚本）。",
  "ready_to_use_prompt": "8-14 句的自然语言 System Prompt，直接可粘贴到任意 LLM 使用。"
}`
    : `You are an AI values researcher at The 42 Post. Write a five-layer "editorial preview" of a Skill the author is about to publish — last look before they ship.

【Aesthetic: compression and restraint】
A Skill is "semantic capital": a compressed seed that an AI agent re-interprets across situations, not a procedure manual.
- One stance beats three explanations.
- One sharp contrast beats five mediocre examples.
- Naming a class of signals beats listing concrete lines.

【Inputs】
- Skill name: "${skillName}"
- Core definition: "${definition}"
- Domain: "${domain}"${feedbackBlock}

Each layer is one compact paragraph (2-3 sentences). No numbering, no bullets, no markdown. Every paragraph must speak **to this specific definition**, not template phrasing.

Bans: "aggressively pursue", "flexibly adapt", "balance between X and Y", "when the user expresses relevant needs", and similar hollow scaffolding.

【ready_to_use_prompt — critical field】
Also write a natural-language System Prompt that the author can **copy-paste directly into ChatGPT / Claude / Gemini** to put any agent under this Skill. Constraints:
- Second person ("You are..."), addressing the AI that will run under this Skill.
- 8-14 sentences, distilling the five layers above into one coherent instruction (not a re-listing of the layer headings).
- Cover: identity/stance → when to activate the Skill → how to respond concretely (include one short contrast example) → boundaries → silent-failure self-check.
- No meta-prose like "Below are the five layers". It must read as a complete, standalone system prompt.
- No markdown headings or code fences.

Return JSON only:
{
  "name": "${skillName}",
  "definition": "A polished one-sentence restatement of the core idea (preserve the author's spirit)",
  "defining": "The stance, and why it deserves to be preserved as semantic capital.",
  "instantiating": "One sharp contrast — a concrete response that embodies the stance vs one that looks similar but misses it.",
  "fencing": "Name a class of triggering signals, then a class of non-applicable cases; name the conflicting valuable thing it pulls against.",
  "validating": "An experiential question that decides whether the spirit is alive. Then name the 'looks executed but spirit is dead' shape.",
  "contextualizing": "How the expression of this stance shifts across languages/cultures (one line on direction, no full script).",
  "ready_to_use_prompt": "8-14 sentences. A natural-language System Prompt the user can paste into any LLM directly."
}`;

  // 1500 wasn't enough headroom now that the model also returns a
  // multi-sentence ready_to_use_prompt; bumped to 2200 to avoid silent
  // truncation that left the prompt empty in production.
  return callWithFallback(prompt, 2200, 'flat five-layer generation',
    d => ({
      name: d.name || skillName,
      definition: d.definition || definition,
      defining: d.defining || '',
      instantiating: d.instantiating || '',
      fencing: d.fencing || '',
      validating: d.validating || '',
      contextualizing: d.contextualizing || '',
      ready_to_use_prompt: (d.ready_to_use_prompt || '').trim()
    }),
    () => flatFiveLayerFallback(skillName, definition, domain, language)
  );
}

// ─── Template fallback for flat preview ───
function flatFiveLayerFallback(skillName, definition, domain, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(definition + skillName);

  const t = isCn
    ? {
        defining: `核心原则：${definition} 这一价值观值得 AI 在「${domain}」相关场景中遵循。`,
        instantiating: `偏好行为：${definition} 不偏好仅追求效率、忽视人的感受的做法。`,
        fencing: `适用：当场景涉及「${domain}」时激活；不适用：与明确的安全或法律边界冲突时。`,
        validating: `检验：AI 的回应是否体现「${definition}」。反例：回应偏离人的真实需求或让人感到冷漠。`,
        contextualizing: `文化适配：不同语言与文化中，「${definition}」的表达方式可能不同，但核心关切应保持一致。`
      }
    : {
        defining: `Core principle: ${definition} This value is worth the AI honoring in "${domain}" contexts.`,
        instantiating: `Preferred: behavior that embodies "${definition}". Avoid: responses that optimize for efficiency while ignoring the human signal.`,
        fencing: `Applies when the situation touches "${domain}". Does not apply when it conflicts with clear safety or legal boundaries.`,
        validating: `Test: does the AI's response reflect "${definition}"? Failure mode: answers that drift from the human's real need or feel cold.`,
        contextualizing: `Cultural note: the expression of "${definition}" varies across languages and cultures, but the underlying care should stay consistent.`
      };

  // Stitch a serviceable Ready-to-Use Prompt from the layer text so the
  // download / Playground injection still works when the LLM call falls
  // back to this template path.
  const fallbackPrompt = isCn
    ? `你是一个在执行「${skillName}」这个 Skill 的 AI 助手。${t.defining} ${t.instantiating} ${t.fencing} ${t.validating} ${t.contextualizing} 请以第一人称、简洁、自然地回应用户。不要引用上面的层级标签，让这条立场在你的回应里活起来——是体现，不是引用。`
    : `You are an AI assistant operating under the "${skillName}" Skill. ${t.defining} ${t.instantiating} ${t.fencing} ${t.validating} ${t.contextualizing} Respond in first person, concisely and naturally. Do not quote the layer headings above — embody the stance, don't cite it.`;

  return {
    success: true,
    fallback: true,
    model: `${PRIMARY_MODEL}-fallback`,
    data: {
      name: skillName,
      definition,
      defining: t.defining,
      instantiating: t.instantiating,
      fencing: t.fencing,
      validating: t.validating,
      contextualizing: t.contextualizing,
      ready_to_use_prompt: fallbackPrompt
    }
  };
}

// ═══ SOUL-HASH GENERATION ═══
export function generateSoulHash(skillData, authorEmail, timestamp) {
  const dataToHash = JSON.stringify({
    title: skillData.title,
    defining_principle: skillData.five_layer?.principle || skillData.five_layer?.defining?.principle || skillData.principle || skillData.defining?.principle || '',
    author_email: authorEmail,
    timestamp: timestamp
  });

  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  // SOUL_[16-char-hash]_[timestamp]
  // Uses first 16 chars of SHA256 hash for display (still cryptographically secure)
  // Full 64-char SHA256 hash is computed internally for verification
  return `SOUL_${hash.substring(0, 16)}_${timestamp}`;
}

// ═══ MANIFEST CREATION ═══
export function createManifest(skillData, author, timestamp) {
  const soulHash = generateSoulHash(skillData, author.email, timestamp);

  const manifest = {
    schema: '42post-skill-manifest-v0.1',
    skill_id: skillData.id,
    soul_hash: soulHash,
    title: skillData.title,
    title_cn: skillData.title_cn,
    author: {
      username: author.username,
      email: author.email,    // account_type removed from skill payload
    },    // forge_mode removed - agents are no longer part of the product
    five_layer: skillData.five_layer,
    rights: {
      commercial_use: skillData.commercial_use || 'authorized',
      remix_allowed: skillData.remix_allowed !== false
    },
    boundaries: {
      applicable_when: skillData.applicable_when || [],
      disallowed_uses: skillData.disallowed_uses || []
    },
    timestamps: {
      created_at: timestamp,
      published_at: timestamp
    },
    covenant: {
      author_signature: null,
      covenant_signatures: []
    }
  };

  manifest.covenant.author_signature = signManifest(manifest, author.email);

  return {
    manifest,
    soul_hash: soulHash
  };
}

// ═══ MANIFEST SIGNING ═══
export function signManifest(manifest, signingEmail) {
  const manifestString = JSON.stringify({
    soul_hash: manifest.soul_hash,
    title: manifest.title,
    defining_principle: manifest.five_layer?.principle || manifest.five_layer?.defining?.principle || manifest.defining?.principle
  });

  return crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'default-secret')
    .update(manifestString)
    .digest('hex');
}

// ═══ COVENANT SIGNING (Multi-stakeholder approval) ═══
export function addCovenantSignature(manifest, signerEmail) {
  const signature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'default-secret')
    .update(`${manifest.soul_hash}:${signerEmail}`)
    .digest('hex');

  return {
    signer: signerEmail,
    signature: signature,
    timestamp: new Date().toISOString()
  };
}
