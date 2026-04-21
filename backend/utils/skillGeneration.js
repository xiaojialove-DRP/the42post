/* ═══════════════════════════════════════════════════════
   Skill Generation with Claude API
   ═══════════════════════════════════════════════════════ */

import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';

// ═══ INITIALIZE CLAUDE CLIENT ═══
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ CRITICAL: ANTHROPIC_API_KEY not set!');
  console.error('Skill generation will not work without this environment variable.');
  console.error('Please set ANTHROPIC_API_KEY in your Railway variables.');
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-missing-key'
});

// ═══ PROBE GENERATION ═══
export async function generateProbeWithClaude(ideaText, language = 'en') {
  const languageInstructions = language === 'zh'
    ? '用中文返回'
    : 'Return in English';

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

Important: Return ONLY valid JSON, no markdown formatting or extra text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        data: {
          scenario: parsed.scenario || '',
          thesis: parsed.thesis || '',
          antithesis: parsed.antithesis || '',
          extreme: parsed.extreme || ''
        },
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }
      };
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: parsed,
          model: response.model
        };
      }
      throw new Error('Failed to parse Claude response as JSON');
    }
  } catch (error) {
    console.error('❌ Claude API error:', error.message);

    // Check if it's an API key issue
    if (error.message?.includes('api_key') || error.message?.includes('401') || error.message?.includes('authentication')) {
      throw {
        status: 500,
        message: '❌ Claude API认证失败。请检查Railway中是否设置了ANTHROPIC_API_KEY。',
        details: 'Missing or invalid ANTHROPIC_API_KEY environment variable'
      };
    }

    throw {
      status: 500,
      message: `Probe generation failed: ${error.message}`,
      error: error.message
    };
  }
}

// ═══ FIVE-LAYER SKILL GENERATION ═══
export async function generateFiveLayerWithClaude(
  skillName,
  ideaText,
  selectedProbeResponse, // 'thesis' | 'antithesis' | 'extreme'
  probeData, // { scenario, thesis, antithesis, extreme }
  language = 'en'
) {
  const languageInstructions = language === 'zh'
    ? '用中文返回'
    : 'Return in English';

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

1. **DEFINING**: The core principle or value statement (what should the AI care about?)
2. **INSTANTIATING**: Concrete exemplars showing preferred and alternative responses
3. **FENCING**: Clear boundaries (when applies, when doesn't, tension zones)
4. **VALIDATING**: Test cases and evaluation criteria for measuring success
5. **CONTEXTUALIZING**: Cultural adaptations (how does this vary by language/culture?)

${languageInstructions}

Return a valid JSON object with this exact structure:
{
  "defining": {
    "principle": "The core value statement",
    "reasoning": "Why this matters for AI alignment"
  },
  "instantiating": {
    "preferred": {
      "label": "Preferred Response",
      "exemplar": "Concrete example from the user's chosen approach",
      "reasoning": "Why this exemplar shows the value"
    },
    "alternatives": [
      {
        "label": "Alternative Approach",
        "exemplar": "Example of different approach",
        "reasoning": "Why user did not prefer this"
      }
    ]
  },
  "fencing": {
    "applies_when": ["When this skill should activate"],
    "does_not_apply": ["When this skill should NOT activate"],
    "tension_zones": ["Situations where the skill conflicts with other values"]
  },
  "validating": {
    "test_cases": [
      {
        "prompt": "A scenario to test if agent follows the skill",
        "expected_behavior": "What a compliant AI should do",
        "failure_modes": ["Ways the AI could violate this skill"]
      }
    ],
    "success_metric": "How to measure if the skill is being followed"
  },
  "contextualizing": {
    "cultural_variants": {
      "en-US": {
        "principle_note": "How this principle adapts in English-speaking contexts",
        "adaptation": "Specific guidance for this cultural context"
      },
      "zh-CN": {
        "principle_note": "How this principle adapts in Chinese contexts",
        "adaptation": "Specific guidance for this cultural context"
      }
    }
  }
}

Important: Return ONLY valid JSON, no markdown formatting or extra text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        data: {
          defining: parsed.defining || {},
          instantiating: parsed.instantiating || { preferred: {}, alternatives: [] },
          fencing: parsed.fencing || { applies_when: [], does_not_apply: [], tension_zones: [] },
          validating: parsed.validating || { test_cases: [], success_metric: '' },
          contextualizing: parsed.contextualizing || { cultural_variants: {} }
        },
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }
      };
    } catch (parseError) {
      // Fallback: try to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data: parsed,
          model: response.model
        };
      }
      throw new Error('Failed to parse Claude response as JSON');
    }
  } catch (error) {
    console.error('Claude API error:', error);
    throw {
      status: 500,
      message: `Five-layer generation failed: ${error.message}`,
      error: error
    };
  }
}

// ═══ FLAT FIVE-LAYER TEMPLATE FALLBACK ═══
// When Claude is unreachable (no credits, rate limited, down), we still let the
// creator proceed — their own definition becomes the spine of the five layers.
// Marked with `fallback: true` so the frontend can choose to signal it.
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

// ═══ FLAT FIVE-LAYER PREVIEW (simpler: from name + definition only) ═══
// Returns plain-string layers suitable for direct rendering in the preview modal.
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

Return ONLY valid JSON, no code fences or extra prose, matching exactly this shape:
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
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse Claude response');
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      success: true,
      data: {
        name: parsed.name || skillName,
        definition: parsed.definition || definition,
        defining: parsed.defining || '',
        instantiating: parsed.instantiating || '',
        fencing: parsed.fencing || '',
        validating: parsed.validating || '',
        contextualizing: parsed.contextualizing || ''
      },
      model: response.model,
      usage: response.usage
    };
  } catch (error) {
    const msg = error.message || '';
    // Known external failures that should fall back gracefully instead of blocking the user:
    //   - credit balance too low
    //   - rate limited
    //   - network / timeout
    //   - missing api key
    const shouldFallback =
      /credit balance|rate limit|timeout|ECONNRESET|api_key|ANTHROPIC_API_KEY|401|429|overloaded/i.test(
        msg
      );
    console.error('❌ Flat five-layer generation error:', msg);
    if (shouldFallback) {
      console.warn('⚠ Falling back to template five-layer so the forge flow is not blocked.');
      return flatFiveLayerFallback(skillName, definition, domain, language);
    }
    return {
      success: false,
      message: msg || 'Preview generation failed'
    };
  }
}

// ═══ SOUL-HASH GENERATION ═══
export function generateSoulHash(skillData, authorEmail, timestamp) {
  const dataToHash = JSON.stringify({
    title: skillData.title,
    defining_principle: skillData.five_layer?.defining?.principle || skillData.defining?.principle || '',
    author_email: authorEmail,
    timestamp: timestamp
  });

  const hash = crypto
    .createHash('sha256')
    .update(dataToHash)
    .digest('hex');

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
      author_signature: null, // Will be signed
      covenant_signatures: []
    }
  };

  // Sign manifest
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
