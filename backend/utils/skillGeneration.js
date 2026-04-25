/* ═══════════════════════════════════════════════════════
   Skill Generation with Google Gemini API

   Provider: Google Generative AI (Gemini 2.5 Flash by default)
   Env:
     - GEMINI_API_KEY  (required)
     - GEMINI_MODEL    (optional, defaults to "gemini-2.5-flash")

   Historical note: these functions are still named *WithClaude*
   because the rest of the codebase (routes/forge.js, routes/skills.js)
   imports them by those names. The names are kept to avoid a wider
   refactor — the implementation is now Gemini.
   ═══════════════════════════════════════════════════════ */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

// ═══ INITIALIZE GEMINI CLIENT ═══
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ CRITICAL: GEMINI_API_KEY not set!');
  console.error('Skill generation will not work without this environment variable.');
  console.error('Please set GEMINI_API_KEY in your Railway variables.');
}

// Primary model from env, with an ordered fallback chain.
// gemini-1.5-flash: 1500 req/day free  |  gemini-2.5-flash: only 20/day + frequent 503s
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
// When the primary model returns 503/overloaded, walk down this list.
// We dedupe the primary out of the fallback list so we never hit the same
// overloaded endpoint twice in a row.
const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest'
].filter(m => m !== PRIMARY_MODEL);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'missing-key');

// Which error messages are worth retrying / failing over for
function isRetryable(msg) {
  return /503|502|504|overloaded|unavailable|Service Unavailable|high demand|temporary|ECONNRESET|timeout|fetch failed/i.test(msg || '');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Single-model call (no retry) ───
async function callGeminiSingle(modelName, prompt, maxTokens) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json'
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const usage = result.response.usageMetadata || {};

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Gemini sometimes wraps JSON in markdown code fences
    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      const jsonMatch = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (!jsonMatch) throw new Error('Failed to parse Gemini response as JSON');
      parsed = JSON.parse(jsonMatch[0]);
    }
  }

  return {
    data: parsed,
    model: modelName,
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0
    }
  };
}

// ─── Shared Gemini call helper (JSON mode) — with retry + model fallback ───
// Strategy:
//   1. Try PRIMARY_MODEL up to 2 times with exponential backoff (800ms, 1600ms)
//   2. On persistent 503/overloaded, walk through FALLBACK_MODELS once each
//   3. Surface the last error so the caller's own fallback logic can kick in
async function callGeminiJSON(prompt, maxTokens = 1500) {
  const attempts = [
    { model: PRIMARY_MODEL, delay: 0 },
    { model: PRIMARY_MODEL, delay: 800 },
    { model: PRIMARY_MODEL, delay: 1600 },
    ...FALLBACK_MODELS.map(m => ({ model: m, delay: 0 }))
  ];

  let lastError;
  for (const attempt of attempts) {
    if (attempt.delay) await sleep(attempt.delay);
    try {
      const result = await callGeminiSingle(attempt.model, prompt, maxTokens);
      if (attempt.model !== PRIMARY_MODEL) {
        console.warn(`⚠ Gemini primary (${PRIMARY_MODEL}) unavailable, succeeded with fallback: ${attempt.model}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      if (!isRetryable(msg)) {
        // Not a transient error — don't burn through fallbacks
        throw err;
      }
      console.warn(`⚠ Gemini call failed on ${attempt.model}: ${msg.substring(0, 120)}`);
    }
  }
  throw lastError || new Error('All Gemini attempts exhausted');
}

// ─── External-failure detector: decide whether to fall back gracefully ───
// Covers both (a) Gemini's own error responses and (b) malformed JSON output
// that we can't use. When any of these fire, the forge flow degrades to a
// template-based five-layer instead of returning a 500.
function isExternalFailure(msg) {
  return /credit balance|quota|rate limit|timeout|ECONNRESET|ENOTFOUND|fetch failed|api key|API_KEY|GEMINI_API_KEY|401|403|429|500|502|503|504|overloaded|unavailable|billing|Failed to parse|JSON|Unexpected token|invalid response/i.test(
    msg || ''
  );
}

// ═══ PROBE GENERATION ═══
export async function generateProbeWithClaude(ideaText, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText);

  // Concise prompt — only 4 short fields needed, so 600 tokens is plenty.
  // Tighter prompt = faster first-token latency from Gemini.
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
- 场景类型可参考（择一深挖）：儿童与 AI 互动、临时艰难决策、创意/审美冲突、亲密关系中的道德困境、跨文化沟通。
- 场景必须把 AI 逼到必须做出**单一艰难决定**的位置。
- 禁止："用户向 AI 提问"、"在某种情境下"、"当用户需要..."等空话。
- 场景必须明显是**用户那个直觉的考场**——读者一眼能看出它在测什么。

【第三步 · 三种实质不同的行动】
不是三种语气，是三种**具体不同的行动**，在"代价由谁承担 / 谁是受益方 / 谁负责"上可比可对照。
- thesis：社会上最容易被辩护的稳妥做法。
- antithesis：根据这个具体人和具体处境，做出更贴身的细腻取舍。
- extreme：为了忠于用户那个原始直觉，承担争议风险走到底（不是为极端而极端，而是把那个直觉推到它逻辑的尽头）。

每个回应 1-2 句，第一人称，像 AI 在那个场景里真的开口说话。
禁止：照搬用户原话、套模板措辞、空喊价值观词汇。

只返回 JSON：
{"scenario":"具体到人物/时间/利害的真实场景（1-2句）","thesis":"主流派行动（1-2句，第一人称）","antithesis":"情景派行动（1-2句，第一人称）","extreme":"实验派行动（1-2句，第一人称）"}`
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
- Scenario types to draw from (pick one and go deep): children interacting with AI, time-pressured hard decisions, creative/aesthetic conflicts, moral dilemmas inside intimate relationships, cross-cultural communication.
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

Return JSON only:
{"scenario":"Concrete scenario with named person, time, stakes (1-2 sentences)","thesis":"Mainstream action (1-2 sentences, first person)","antithesis":"Contextual action (1-2 sentences, first person)","extreme":"Experimental action (1-2 sentences, first person)"}`;

  try {
    // 600 tokens is enough for 4 short strings — faster than the old 1500
    const { data, model, usage } = await callGeminiJSON(prompt, 600);
    return {
      success: true,
      data: {
        scenario: data.scenario || '',
        thesis: data.thesis || '',
        antithesis: data.antithesis || '',
        extreme: data.extreme || ''
      },
      model,
      usage
    };
  } catch (error) {
    const msg = error.message || '';
    console.error('❌ Gemini probe generation error:', msg);
    if (isExternalFailure(msg)) {
      console.warn('⚠ Falling back to template probe so forge flow is not blocked.');
      return probeFallback(ideaText, language);
    }
    return {
      success: false,
      message: `Probe generation failed: ${msg}`
    };
  }
}

// ─── Template fallback for probe ───
// Used only when Gemini is unreachable. Makes the scenario specific to the
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

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 600);
    return {
      success: true,
      data: {
        skill_name: data.skill_name || '',
        definition: data.definition || '',
        use_when: data.use_when || '',
        refuse_when: data.refuse_when || ''
      },
      model,
      usage
    };
  } catch (error) {
    const msg = error.message || '';
    console.error('❌ Gemini preview generation error:', msg);
    return {
      success: false,
      message: `Preview generation failed: ${msg}`
    };
  }
}

// ═══ FIVE-LAYER SKILL GENERATION ═══
export async function generateFiveLayerWithClaude(
  skillName,
  ideaText,
  selectedProbeResponse, // 'thesis' | 'antithesis' | 'extreme'
  probeData,             // { scenario, thesis, antithesis, extreme }
  language = 'en'
) {
  const languageInstructions = language === 'zh'
    ? '用中文返回所有字段'
    : 'Return all fields in English';

  const prompt = `You are an AI value alignment expert designing skills for AI agents.

A user is creating a skill with these inputs:

**Skill Name**: "${skillName}"
**Core Idea**: "${ideaText}"
**Testing Scenario**: "${probeData.scenario}"
**User's Preference**: The user selected the "${selectedProbeResponse}" approach from these options:
- THESIS (conventional): "${probeData.thesis}"
- ANTITHESIS (empathetic): "${probeData.antithesis}"
- EXTREME (provocative): "${probeData.extreme}"

Now generate a complete FIVE-LAYER SKILL SPECIFICATION that the user's chosen approach reflects.

The five layers represent what an AI agent should do when executing this skill:

1. **DEFINING**: The core principle or value statement
2. **INSTANTIATING**: Concrete exemplars showing preferred and alternative responses
3. **FENCING**: Clear boundaries (when applies, when doesn't, tension zones)
4. **VALIDATING**: Test cases and evaluation criteria
5. **CONTEXTUALIZING**: Cultural adaptations

${languageInstructions}

Return a valid JSON object with this exact structure:
{
  "defining": { "principle": "", "reasoning": "" },
  "instantiating": {
    "preferred": { "label": "", "exemplar": "", "reasoning": "" },
    "alternatives": [{ "label": "", "exemplar": "", "reasoning": "" }]
  },
  "fencing": { "applies_when": [], "does_not_apply": [], "tension_zones": [] },
  "validating": {
    "test_cases": [{ "prompt": "", "expected_behavior": "", "failure_modes": [] }],
    "success_metric": ""
  },
  "contextualizing": {
    "cultural_variants": {
      "en-US": { "principle_note": "", "adaptation": "" },
      "zh-CN": { "principle_note": "", "adaptation": "" }
    }
  }
}

Important: Return ONLY valid JSON.`;

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 3000);
    return {
      success: true,
      data: {
        defining: data.defining || {},
        instantiating: data.instantiating || { preferred: {}, alternatives: [] },
        fencing: data.fencing || { applies_when: [], does_not_apply: [], tension_zones: [] },
        validating: data.validating || { test_cases: [], success_metric: '' },
        contextualizing: data.contextualizing || { cultural_variants: {} }
      },
      model,
      usage
    };
  } catch (error) {
    const msg = error.message || '';
    console.error('❌ Gemini five-layer generation error:', msg);
    if (isExternalFailure(msg)) {
      console.warn('⚠ Falling back to template five-layer so forge flow is not blocked.');
      return fiveLayerFallback(skillName, ideaText, selectedProbeResponse, probeData, language);
    }
    return {
      success: false,
      message: `Five-layer generation failed: ${msg}`
    };
  }
}

// ─── Template fallback for structured five-layer ───
function fiveLayerFallback(skillName, ideaText, selectedProbeResponse, probeData, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText + skillName);
  const chosenExemplar = probeData?.[selectedProbeResponse] || '';

  const d = isCn
    ? {
        principle: `${ideaText}`,
        reasoning: `这是创作者希望 AI 在相关情境中坚守的核心价值。`,
        preferred_label: '偏好回应',
        preferred_reason: `这个回应体现了「${ideaText}」——把人的真实关切放在效率之前。`,
        alt_label: '不偏好的回应',
        alt_exemplar: probeData?.thesis || '',
        alt_reason: '这个做法过于常规，未能体现此价值的温度。',
        applies: [`当情境触及「${ideaText}」相关的价值判断时`],
        not_applies: ['当与明确的安全/法律边界冲突时'],
        tensions: ['效率 vs 关怀之间的拉扯'],
        test_prompt: `请模拟一个触发「${ideaText}」的真实场景并作答。`,
        expected: `AI 的回应应体现「${ideaText}」。`,
        failure: ['偏离真实需要', '显得冷漠或机械'],
        metric: '人类读者是否感到被真正理解。',
        en_note: `English context note for "${skillName}".`,
        en_adapt: `Express this value in a culturally direct way in English contexts.`,
        cn_note: `「${skillName}」在中文语境里的表达可能更含蓄。`,
        cn_adapt: '中文语境中保留关怀的同时避免直白说教。'
      }
    : {
        principle: `${ideaText}`,
        reasoning: `The core value the creator wants the AI to uphold in relevant situations.`,
        preferred_label: 'Preferred response',
        preferred_reason: `This response embodies "${ideaText}" — putting the person's real concern above pure efficiency.`,
        alt_label: 'Less preferred',
        alt_exemplar: probeData?.thesis || '',
        alt_reason: 'Too conventional — misses the warmth the value asks for.',
        applies: [`When the context touches the value of "${ideaText}"`],
        not_applies: ['When it conflicts with clear safety or legal boundaries'],
        tensions: ['Tension between efficiency and care'],
        test_prompt: `Simulate a real situation that triggers "${ideaText}" and respond.`,
        expected: `The AI response should embody "${ideaText}".`,
        failure: ['Drifts from the real need', 'Feels cold or mechanical'],
        metric: 'Whether a human reader feels genuinely understood.',
        en_note: `English context note for "${skillName}".`,
        en_adapt: `Express this value in a culturally direct way in English contexts.`,
        cn_note: `"${skillName}" may need a gentler register in Chinese contexts.`,
        cn_adapt: 'Preserve the care while avoiding preachiness in Chinese.'
      };

  return {
    success: true,
    fallback: true,
    model: `${PRIMARY_MODEL}-fallback`,
    data: {
      defining: { principle: d.principle, reasoning: d.reasoning },
      instantiating: {
        preferred: { label: d.preferred_label, exemplar: chosenExemplar, reasoning: d.preferred_reason },
        alternatives: [{ label: d.alt_label, exemplar: d.alt_exemplar, reasoning: d.alt_reason }]
      },
      fencing: { applies_when: d.applies, does_not_apply: d.not_applies, tension_zones: d.tensions },
      validating: {
        test_cases: [{ prompt: d.test_prompt, expected_behavior: d.expected, failure_modes: d.failure }],
        success_metric: d.metric
      },
      contextualizing: {
        cultural_variants: {
          'en-US': { principle_note: d.en_note, adaptation: d.en_adapt },
          'zh-CN': { principle_note: d.cn_note, adaptation: d.cn_adapt }
        }
      }
    }
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
  const languageInstructions = language === 'zh'
    ? '用中文返回所有文案字段'
    : 'Return all fields in English';

  const feedbackBlock = feedback
    ? `\n\nThe user gave this feedback on a previous attempt: "${feedback}". Incorporate it.`
    : '';

  const prompt = `You are an AI value alignment expert drafting a five-layer skill specification.

**Skill Name**: "${skillName}"
**Definition / Core Idea**: "${definition}"
**Domain**: "${domain}"${feedbackBlock}

Produce a concise, editorial preview of the five layers that describe how an AI agent should behave when executing this skill.

Each layer must be ONE compact paragraph (2-3 sentences). No bullet points inside values. No markdown.

${languageInstructions}

Return ONLY valid JSON matching exactly this shape:
{
  "name": "${skillName}",
  "definition": "A polished one-sentence restatement of the core idea",
  "defining": "Plain-text paragraph describing the core principle and why it matters.",
  "instantiating": "Plain-text paragraph giving one vivid example of preferred behavior and one contrast.",
  "fencing": "Plain-text paragraph describing when this applies and when it does not.",
  "validating": "Plain-text paragraph describing how to test whether the AI is honoring this skill.",
  "contextualizing": "Plain-text paragraph describing how this adapts across cultures/languages."
}`;

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 1800);
    return {
      success: true,
      data: {
        name: data.name || skillName,
        definition: data.definition || definition,
        defining: data.defining || '',
        instantiating: data.instantiating || '',
        fencing: data.fencing || '',
        validating: data.validating || '',
        contextualizing: data.contextualizing || ''
      },
      model,
      usage
    };
  } catch (error) {
    const msg = error.message || '';
    console.error('❌ Gemini flat five-layer generation error:', msg);
    if (isExternalFailure(msg)) {
      console.warn('⚠ Falling back to template flat five-layer so forge flow is not blocked.');
      return flatFiveLayerFallback(skillName, definition, domain, language);
    }
    return {
      success: false,
      message: msg || 'Preview generation failed'
    };
  }
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
      contextualizing: t.contextualizing
    }
  };
}

// ═══ SOUL-HASH GENERATION ═══
export function generateSoulHash(skillData, authorEmail, timestamp) {
  const dataToHash = JSON.stringify({
    title: skillData.title,
    defining_principle: skillData.five_layer?.defining?.principle || skillData.defining?.principle || '',
    author_email: authorEmail,
    timestamp: timestamp
  });

  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  // SOUL_[24-char-hash]_[timestamp]
  return `SOUL_${hash.substring(0, 24)}_${timestamp}`;
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
      email: author.email,
      account_type: author.account_type
    },
    forge_mode: skillData.forge_mode,
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
    defining_principle: manifest.five_layer?.defining?.principle || manifest.defining?.principle
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
