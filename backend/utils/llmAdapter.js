/* ═══════════════════════════════════════════════════════
   LLM Adapter — Abstraction Layer for Multiple AI Models
   支持：Gemini, Claude, OpenAI, etc.
   ═══════════════════════════════════════════════════════ */

import dotenv from 'dotenv';

dotenv.config();

// 当前配置的LLM提供商
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

console.log(`✓ LLM Provider: ${LLM_PROVIDER}`);

/**
 * LLM适配器 - 统一接口
 */
const LLMAdapter = {
  // 获取当前提供商
  getProvider() {
    return LLM_PROVIDER;
  },

  /**
   * 生成Intuition Probe
   * @param {string} ideaText - 用户的想法
   * @param {string} language - 语言（'en' 或 'zh'）
   * @returns {Promise<Object>} { success, data, model, usage }
   */
  async generateProbe(ideaText, language = 'en') {
    switch (LLM_PROVIDER) {
      case 'gemini':
        return await generateProbeWithGemini(ideaText, language);
      case 'claude':
        return await generateProbeWithClaude(ideaText, language);
      case 'openai':
        return await generateProbeWithOpenAI(ideaText, language);
      default:
        throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
    }
  },

  /**
   * 生成Five-Layer Skill
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} { success, data, model, usage }
   */
  async generateFiveLayer(params) {
    switch (LLM_PROVIDER) {
      case 'gemini':
        return await generateFiveLayerWithGemini(params);
      case 'claude':
        return await generateFiveLayerWithClaude(params);
      case 'openai':
        return await generateFiveLayerWithOpenAI(params);
      default:
        throw new Error(`Unsupported LLM provider: ${LLM_PROVIDER}`);
    }
  }
};

/* ═══════════════════════════════════════════════════════
   GEMINI Implementation
   ═══════════════════════════════════════════════════════ */

async function generateProbeWithGemini(ideaText, language) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const systemPrompt = language === 'zh' ? `
你是一个策略性的思想引导员。
用户提供了一个想法或概念。生成一个"直觉探针"，包含：
1. 场景描述（situation where this idea applies）
2. 正论（thesis：为什么这个想法有用）
3. 反论（antithesis：为什么这个想法有局限）
4. 极端观点（extreme：如果我们把这个想法推到极端会怎样）

用JSON格式回答。
` : `
You are a strategic thought guide.
The user has provided an idea or concept. Generate an "Intuition Probe" containing:
1. scenario - situation where this idea applies
2. thesis - why this idea is useful
3. antithesis - why this idea has limitations
4. extreme - what if we take this idea to its extreme

Respond in JSON format.
`;

  const prompt = language === 'zh'
    ? `想法：${ideaText}`
    : `Idea: ${ideaText}`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt + '\n\n' + prompt }]
        }
      ]
    });

    const responseText = result.response.text();
    const probeData = JSON.parse(responseText);

    return {
      success: true,
      data: probeData,
      model: 'gemini-1.5-pro',
      usage: {
        inputTokens: result.response.usageMetadata?.promptTokenCount || 0,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount || 0
      }
    };
  } catch (error) {
    console.error('Gemini probe generation error:', error);
    return {
      success: false,
      message: error.message,
      model: 'gemini-1.5-pro'
    };
  }
}

async function generateFiveLayerWithGemini(params) {
  // 类似的实现...
  // 这里省略详细代码，格式与generateProbeWithGemini相同
  return {
    success: false,
    message: 'Not implemented yet'
  };
}

/* ═══════════════════════════════════════════════════════
   CLAUDE Implementation (Placeholder for future)
   ═══════════════════════════════════════════════════════ */

async function generateProbeWithClaude(ideaText, language) {
  // TODO: 实现Claude API调用
  // 使用 @anthropic-sdk/sdk
  throw new Error('Claude implementation coming soon');
}

async function generateFiveLayerWithClaude(params) {
  throw new Error('Claude implementation coming soon');
}

/* ═══════════════════════════════════════════════════════
   OpenAI Implementation (Placeholder for future)
   ═══════════════════════════════════════════════════════ */

async function generateProbeWithOpenAI(ideaText, language) {
  // TODO: 实现OpenAI API调用
  // 使用 openai SDK
  throw new Error('OpenAI implementation coming soon');
}

async function generateFiveLayerWithOpenAI(params) {
  throw new Error('OpenAI implementation coming soon');
}

export default LLMAdapter;
