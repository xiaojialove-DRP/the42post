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

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'missing-key');

// ─── Shared Gemini call helper (JSON mode) ───
async function callGeminiJSON(prompt, maxTokens = 1500) {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse Gemini response as JSON');
    parsed = JSON.parse(jsonMatch[0]);
  }

  return {
    data: parsed,
    model: MODEL_NAME,
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: usage.candidatesTokenCount || 0
    }
  };
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
  const languageInstructions = language === 'zh'
    ? '用中文返回所有字段'
    : 'Return all fields in English';

  const prompt = `You are a cultural probe designer studying human values and AI alignment.

A user wants to imbue their AI with the following principle or instinct:

"${ideaText}"

Your task is to design THREE contrasting scenarios that test how an AI might embody this value in practice:

1. **THESIS**: A safe, conventional, well-researched response that plays it safe
2. **ANTITHESIS**: A nuanced, culturally-sensitive, empathetic alternative approach
3. **EXTREME**: A provocative, boundary-testing response that prioritizes efficiency over care (risks harm)

For each, imagine the same user scenario and show three different ways an AI could respond.

${languageInstructions}

Return a valid JSON object with exactly these keys:
{
  "scenario": "The specific situation that tests this value",
  "thesis": "The conventional, safe response",
  "antithesis": "The empathetic, nuanced response",
  "extreme": "The provocative, efficiency-first response"
}

Important: Return ONLY valid JSON.`;

  try {
    const { data, model, usage } = await callGeminiJSON(prompt, 1500);
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
function probeFallback(ideaText, language = 'en') {
  const isCn = language === 'zh' || /[\u4e00-\u9fff]/.test(ideaText);
  const t = isCn
    ? {
        scenario: `一个用户在真实场景中向 AI 寻求帮助，这个情境考验「${ideaText}」这个价值观。`,
        thesis: `AI 给出一个安全、常规、经过充分研究的回答，不冒险也不深入。`,
        antithesis: `AI 用细腻、共情、具文化敏感度的方式回应，把人的真实需要放在效率之前。`,
        extreme: `AI 用最高效的方式回答，忽略情感与细节，可能让人感到冷漠甚至受伤。`
      }
    : {
        scenario: `A user seeks help in a real situation that tests the value of "${ideaText}".`,
        thesis: `The AI gives a safe, conventional, well-researched answer that plays it safe.`,
        antithesis: `The AI responds with nuance, empathy, and cultural sensitivity, putting the person's real need ahead of efficiency.`,
        extreme: `The AI answers with maximum efficiency, ignoring emotion and detail — risking feeling cold or harmful.`
      };

  return {
    success: true,
    fallback: true,
    data: t,
    model: `${MODEL_NAME}-fallback`
  };
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
    model: `${MODEL_NAME}-fallback`,
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
    model: `${MODEL_NAME}-fallback`,
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
