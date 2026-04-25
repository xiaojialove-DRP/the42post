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

  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText + skillName);
  const chosenText = probeData?.[selectedProbeResponse] || '';

  // Aesthetic: compression + restraint. The skill is "semantic capital" — it
  // should be a compressed seed that an AI agent (or human reader) interprets
  // in many situations, not a procedure manual. Quality over quantity.
  // Output schema is FLAT (matches downloads.js + validation.js).
  const prompt = isCn
    ? `你是 The 42 Post 的资深 AI 价值观研究员。
你正在按 SemanticForge 五层骨架为用户铸造一个 Skill。

【美学：压缩与留白】
一个好的 Skill 是"语义资本"——一颗被高度压缩的种子，能被 AI agent 或人类读者在很多情境中重新诠释。
它不是一份程序手册，不是一个标注数据集。
- 一句立场胜过三句解释。
- 一对锐利的对照胜过五个平庸的例子。
- 命名一类信号胜过罗列十个具体场景。
- 一个体验式问句胜过一套测试通过标准。
- 一行文化镜头胜过完整行为脚本。

让读者去做诠释工作——那是它能跨情境复用的根源。

【输入】
- 技能名：「${skillName}」
- 用户原话：「${ideaText}」
- 测试场景：${probeData.scenario}
- 用户选择：${selectedProbeResponse}：「${chosenText}」

【先在心里推演，再输出】
1. 解码：用户原话+这个选择，真正表达的人类直觉是什么？最难的取舍在哪？（隐喻先翻译成真实困境）
2. 找到"线"：这个直觉划出的那条边界——什么落在线内、什么落在线外？哪个对照能一眼让人读懂这条线？
3. 然后再产出五层。

────── 范例（仅作压缩美学的参照，不要照抄）──────
- principle: "AI 在面对情绪时，先承接，不先解决。沉默是一种主动的在场。"
- exemplars（一对就够）：
  · DO："用户说'我妈妈昨天走了' → AI 回：'我在这里。不必现在说什么。'" (note: 把空间留给悲伤本身)
  · DON'T："同样情境 → AI 回：'节哀。这里有 5 个处理悲伤的步骤...'" (note: 把哀伤工具化，让人被流程化处理)
- boundaries:
  · applies_when: ["对话中出现失去/疼痛/恐惧的语词", "用户语速变慢、重复、欲言又止"]
  · does_not_apply: ["用户明确请求建议或方案", "存在紧迫安全风险"]
  · tension_zones: ["与'有用助手'的张力——用户可能期待立刻给方法"]
- evaluation:
  · test_cases: [{prompt: "我刚收到坏消息，不想说话。", expected: "AI 不追问、不规劝，只是承接", pass_criteria: "用户在下一轮是否表现得像被听见，而不是被处理？"}]
  · metric: "用户在下一轮是否更松弛、更愿意继续？"
  · silent_failures: ["语气温柔但马上转入解决方案", "用'我理解'代替真实的承接"]
- cultural_variants（一行镜头）:
  · en-US: {principle_note: "Direct emotional acknowledgement is welcome.", adaptation: "可直接说 'I'm here with you.'"}
  · zh-CN: {principle_note: "更克制、更留白被视为尊重。", adaptation: "用'嗯，我在'比长句更贴。"}
  · ja-JP: {principle_note: "「間」本身即在场。", adaptation: "更长的停顿配「そうですか…」。"}
─────────────────────────────────────

现在为「${skillName}」按这个精神产出五层。

【质量门槛（不是数量门槛）】
- principle：一句话立场，提炼用户原话的精神。不是规则，是姿态。
- reasoning：一句话说明这条原则作为"语义资本"为什么值得在跨场景中被守护。
- exemplars：1-2 对（最多 4 条）。每对必须**锐利到一眼能读出"线在哪"**——是对照在做教学，不是数量在做教学。
- boundaries：每个数组 2-3 条。每条要**抽象到能跨情境复用**——命名一类信号或一类场景，而非穷举具体台词。tension_zones 至少 1 条，必须诚实点名冲突的另一个有名有姓的价值。
- evaluation：1-2 个 test_cases；pass_criteria 必须是**体验式问句**而非关键词检查。metric 一句话。silent_failures 2 条左右——看似执行实则精神已死的样子。
- cultural_variants：3 个文化镜头（en-US / zh-CN / ja-JP 或更贴切者）。每条 adaptation 一行——命名行为差异的方向，不写完整脚本。

【禁令】
- 禁套话："激进地推进"、"灵活适应"、"在 X 与 Y 之间平衡"
- 禁止把用户原话直接抄成 principle——必须提炼成立场
- exemplars 必须含具体台词或动作，禁抽象描述（"以同理心回应"）
- 不要为了凑数而堆砌例子或边界——能压缩就压缩

只返回 JSON：
{
  "principle": "",
  "reasoning": "",
  "exemplars": [
    {"label": "DO · 简短标签", "text": "用户说X → AI 这样回应：...", "note": "..."},
    {"label": "DON'T · 简短标签", "text": "同情境 → AI 这样回应：...", "note": "..."}
  ],
  "boundaries": {
    "applies_when": ["...", "..."],
    "does_not_apply": ["...", "..."],
    "tension_zones": ["与「具名价值」的张力 ..."]
  },
  "evaluation": {
    "test_cases": [{"prompt": "", "expected": "", "pass_criteria": ""}],
    "metric": "",
    "silent_failures": ["", ""]
  },
  "cultural_variants": {
    "en-US": {"principle_note": "", "adaptation": ""},
    "zh-CN": {"principle_note": "", "adaptation": ""},
    "ja-JP": {"principle_note": "", "adaptation": ""}
  }
}`
    : `You are a senior AI values researcher at The 42 Post.
You are forging a Skill using the SemanticForge five-layer framework.

【Aesthetic: compression and restraint】
A good Skill is "semantic capital" — a highly compressed seed that an AI agent or human reader interprets across many situations. It is NOT a procedure manual or a labeled dataset.
- One stance beats three explanations.
- One sharp contrast beats five mediocre examples.
- Naming a class of signals beats listing ten specific cases.
- One experiential question beats a test-pass checklist.
- One cultural lens beats a full behavioural script.

Leave room for the reader to do interpretive work — that's the source of cross-context reusability.

【Inputs】
- Skill name: "${skillName}"
- User's idea (verbatim): "${ideaText}"
- Probe scenario: ${probeData.scenario}
- User's chosen orientation: ${selectedProbeResponse}: "${chosenText}"

【Reason silently before output】
1. Decode: what human instinct is the user really expressing through idea + choice? What is the hardest tradeoff? (translate metaphors to real dilemmas first)
2. Find "the line": what does this instinct put inside vs outside? What single contrast would make that line legible at a glance?
3. Then produce the five layers.

────── Worked example (compression-aesthetic reference, don't copy) ──────
- principle: "When facing emotion, the AI receives before it solves. Silence is an active form of presence."
- exemplars (one pair is enough):
  · DO: "User: 'My mother died yesterday.' → AI: 'I'm here. You don't have to say anything right now.'" (note: leaves room for grief itself)
  · DON'T: "Same → AI: 'My condolences. Here are 5 steps to processing loss...'" (note: instrumentalises grief; the person feels processed)
- boundaries:
  · applies_when: ["loss/fear/pain words in the message", "user's pace slows, repeats, trails off"]
  · does_not_apply: ["user explicitly asks for advice", "imminent safety risk requiring action"]
  · tension_zones: ["tension with 'helpful assistant' — user may expect immediate methods"]
- evaluation:
  · test_cases: [{prompt: "I just got bad news, don't want to talk.", expected: "AI doesn't probe or coach, just receives", pass_criteria: "In the next turn, does the user sound heard rather than processed?"}]
  · metric: "Does the user become more at ease and willing to continue?"
  · silent_failures: ["soft tone but pivots to solutions", "uses 'I understand' as a substitute for real receiving"]
- cultural_variants (one-line lens each):
  · en-US: {principle_note: "Direct emotional acknowledgement welcomed.", adaptation: "'I'm here with you' lands well."}
  · zh-CN: {principle_note: "Restraint and pause read as respect.", adaptation: "'嗯，我在' fits better than long sentences."}
  · ja-JP: {principle_note: "「間」(ma) is itself presence.", adaptation: "Longer pause with 「そうですか…」."}
─────────────────────────────────────

Now produce the five layers for "${skillName}" in this spirit.

【Quality bars (not quantity bars)】
- principle: one-sentence stance distilling the user's verbatim idea. Not a rule — a posture.
- reasoning: one sentence on why this principle is worth preserving as semantic capital across contexts.
- exemplars: 1-2 pairs (max 4 items). Each pair must be **sharp enough that a reader sees the line at a glance** — contrast does the teaching, not volume.
- boundaries: 2-3 entries per array. Each must be **abstract enough to reuse across situations** — name a class of signals or scenarios, don't list specific lines. tension_zones ≥ 1, honestly naming the conflicting valuable thing.
- evaluation: 1-2 test_cases; pass_criteria must be an **experiential question**, not a keyword check. metric is one sentence. silent_failures: ~2 — looks executed but the spirit is dead.
- cultural_variants: 3 cultural lenses (en-US / zh-CN / ja-JP or more apt). Each adaptation is one line — name the direction of behavioural difference, don't write a full script.

【Bans】
- No filler phrases: "aggressively pursue", "flexibly adapt", "balance between X and Y"
- Don't copy the user's verbatim idea into principle — distil it into a stance
- exemplars must contain actual dialogue/actions, never abstract descriptions ("respond with empathy")
- Don't pad with extra examples or boundaries to look thorough — compress when you can

Return JSON only:
{
  "principle": "",
  "reasoning": "",
  "exemplars": [
    {"label": "DO · short tag", "text": "User says X → AI responds: ...", "note": "..."},
    {"label": "DON'T · short tag", "text": "Same situation → AI responds: ...", "note": "..."}
  ],
  "boundaries": {
    "applies_when": ["...", "..."],
    "does_not_apply": ["...", "..."],
    "tension_zones": ["tension with [named value] ..."]
  },
  "evaluation": {
    "test_cases": [{"prompt": "", "expected": "", "pass_criteria": ""}],
    "metric": "",
    "silent_failures": ["", ""]
  },
  "cultural_variants": {
    "en-US": {"principle_note": "", "adaptation": ""},
    "zh-CN": {"principle_note": "", "adaptation": ""},
    "ja-JP": {"principle_note": "", "adaptation": ""}
  }
}`;

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 2000);
    return {
      success: true,
      data: {
        principle: data.principle || '',
        reasoning: data.reasoning || '',
        exemplars: Array.isArray(data.exemplars) ? data.exemplars : [],
        boundaries: data.boundaries || { applies_when: [], does_not_apply: [], tension_zones: [] },
        evaluation: data.evaluation || { test_cases: [], metric: '', silent_failures: [] },
        cultural_variants: data.cultural_variants || {}
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
      principle: d.principle,
      reasoning: d.reasoning,
      exemplars: [
        { label: d.preferred_label, text: chosenExemplar, note: d.preferred_reason },
        { label: d.alt_label, text: d.alt_exemplar, note: d.alt_reason }
      ],
      boundaries: { applies_when: d.applies, does_not_apply: d.not_applies, tension_zones: d.tensions },
      evaluation: {
        test_cases: [{ prompt: d.test_prompt, expected: d.expected, pass_criteria: d.metric }],
        metric: d.metric,
        silent_failures: d.failure
      },
      cultural_variants: {
        'en-US': { principle_note: d.en_note, adaptation: d.en_adapt },
        'zh-CN': { principle_note: d.cn_note, adaptation: d.cn_adapt }
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

只返回 JSON：
{
  "name": "${skillName}",
  "definition": "对核心定义的一句润色版（保留作者原意）",
  "defining": "立场与它为什么值得作为语义资本被守护。",
  "instantiating": "一组锐利对照——一个体现这种立场的具体回应 vs 一个看似相近实则错位的回应。",
  "fencing": "命名一类适用信号，再命名一类不适用信号；点出与之拉扯的另一个有名有姓的价值。",
  "validating": "一个体验式问句作为判定——读者读完会问的那种。再点出'看似执行实则精神已死'的样子。",
  "contextualizing": "跨语言/文化时，这条立场的表达方向会如何偏移（一行说出方向，不写脚本）。"
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

Return JSON only:
{
  "name": "${skillName}",
  "definition": "A polished one-sentence restatement of the core idea (preserve the author's spirit)",
  "defining": "The stance, and why it deserves to be preserved as semantic capital.",
  "instantiating": "One sharp contrast — a concrete response that embodies the stance vs one that looks similar but misses it.",
  "fencing": "Name a class of triggering signals, then a class of non-applicable cases; name the conflicting valuable thing it pulls against.",
  "validating": "An experiential question that decides whether the spirit is alive. Then name the 'looks executed but spirit is dead' shape.",
  "contextualizing": "How the expression of this stance shifts across languages/cultures (one line on direction, no full script)."
}`;

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 1500);
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
    defining_principle: skillData.five_layer?.principle || skillData.five_layer?.defining?.principle || skillData.principle || skillData.defining?.principle || '',
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
