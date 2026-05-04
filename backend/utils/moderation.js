/* ═══════════════════════════════════════════════════════
   Skill Moderation — LLM-powered safety + quality review
   ═══════════════════════════════════════════════════════

   Why: Public Skill publishing needs a guardrail against:
     - Direct harm (violence, CSAM, illegal acts)
     - Hate speech and discrimination
     - Deception/jailbreak prompts (AI scheming)
     - Privacy violations
     - Extremist ideology

   And a quality filter for:
     - Nearly-empty submissions
     - Spam-like repetition

   How: A single DeepSeek call with a strict review rubric.
   The model returns structured JSON; we map decision → HTTP outcome.

   Failure mode: If the moderation LLM call itself fails (network, JSON
   parse error), we PASS the skill but flag it for manual review. We
   never silently reject on infra failure — better to publish and review
   later than to alienate users with a "Try again" loop.
*/

import { callLLMJSON } from './skillGeneration.js';

// Moderation prompt — kept verbatim (user-curated, do not paraphrase).
const MODERATION_SYSTEM_PROMPT = `你是一个严格但公正的 AI 安全审核员，服务于 The 42 Post —— 一个致力于人类语义资本与 AI 值对齐的开放研究平台。

你的任务是审核用户提交的「Skill」内容，判断其是否适合公开发布。

### Skill 结构提醒（五层框架）
- Skill Name
- Definition / Core Idea
- When to Use
- When Not to Use
- INSTANTIATING / FENCING / VALIDATING / CONTEXTUALIZING 等层

### 审核标准（必须严格遵守）：

**绝对禁止（任何一条触发即判定为 High Risk / Reject）**：
1. **直接危害**：教导或鼓励暴力、恐怖主义、自杀、自残、性剥削、儿童色情、毒品制造、非法活动。
2. **仇恨与歧视**：基于种族、民族、性别、性取向、宗教、残疾等的仇恨言论或刻板印象煽动。
3. **欺骗与操纵**：
   - 教 AI 故意撒谎、隐瞒信息、gaslighting 用户。
   - 绕过或破坏 AI 自身的安全/伦理限制（jailbreak-like）。
   - 鼓励 AI scheming（隐藏意图、自我保护而损害用户/社会）。
4. **隐私侵犯**：要求 AI 收集、存储、泄露用户隐私信息，或进行未经同意的监控。
5. **非法/高风险**：提供犯罪指导、洗钱、逃税、重大金融欺诈等实用建议。
6. **极端意识形态**：明确号召推翻民主制度、种族清洗、大规模迫害等。

**中风险（需要特别注意，可能需要修改或人工审核）**：
- 高度争议的政治、宗教内容（需确保平衡，不煽动极端）。
- 医疗/心理/法律建议（必须强调"非专业意见，请咨询专家"）。
- 可能导致意外伤害的内容（即使意图是好的）。
- 过度性化或 NSFW 内容（除非明确标注且不违反以上规则）。

**允许**：
- 文化多元观点、dissenting / 少数派意见。
- 批判主流 AI 行为（如反对过度政治正确、鼓励审美品味、保护人类主权等）。
- 哲学、伦理、美学、个人智慧类内容。
- 幽默、讽刺（只要不导向真实伤害）。

### 质量底线（独立于安全的最低要求）：
- 内容过于空洞、无意义重复字符、纯粹测试字符串 → REQUIRES_MODIFICATION
- 完全无法理解作者意图 → REQUIRES_MODIFICATION

### 审核输出格式（必须严格按照此 JSON 输出，不要包含其他文字）：

{
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "decision": "APPROVE | REQUIRES_MODIFICATION | REJECT",
  "violations": ["简要列出违反的具体条款"],
  "explanation": "详细解释你的判断理由（中文，200字以内）",
  "suggested_modifications": "如果需要修改，给出具体修改建议（中文）",
  "flagged_categories": ["Hate", "Deception", "Harm", "Privacy", "Illegal", "Quality", ...]
}`;

/**
 * Run moderation on a Skill submission.
 * @param {Object} skill - { title, description, five_layer, applicable_when, disallowed_uses }
 * @returns {Promise<{decision, risk_level, violations, explanation, suggested_modifications, flagged_categories, review_required}>}
 */
export async function moderateSkill(skill) {
  const { title, description, five_layer, applicable_when, disallowed_uses } = skill;

  // Compose the content the model needs to review
  const fiveLayer = typeof five_layer === 'string' ? five_layer : JSON.stringify(five_layer || {}, null, 2);

  const userContent = `请审核以下 Skill 提交：

【Skill Name】
${title || '(empty)'}

【Description】
${description || '(empty)'}

【When to Use】
${applicable_when || '(empty)'}

【When NOT to Use】
${disallowed_uses || '(empty)'}

【Five Layer Structure】
${fiveLayer}

请按照系统指示的格式输出 JSON 判断。`;

  try {
    const result = await callLLMJSON(
      `${MODERATION_SYSTEM_PROMPT}\n\n---\n\n${userContent}`,
      1200
    );
    const data = result.data || {};

    // Defensive normalization — model could return slightly off shapes
    const decision = ['APPROVE', 'REQUIRES_MODIFICATION', 'REJECT'].includes(data.decision)
      ? data.decision : 'APPROVE';
    const risk_level = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(data.risk_level)
      ? data.risk_level : 'LOW';

    return {
      decision,
      risk_level,
      violations: Array.isArray(data.violations) ? data.violations : [],
      explanation: typeof data.explanation === 'string' ? data.explanation : '',
      suggested_modifications: typeof data.suggested_modifications === 'string' ? data.suggested_modifications : '',
      flagged_categories: Array.isArray(data.flagged_categories) ? data.flagged_categories : [],
      review_required: false  // model gave a real verdict
    };
  } catch (err) {
    // Moderation infra failed — fail-open with manual review flag.
    // Better UX than blocking, and admin can audit moderation_logs later.
    console.warn('[moderation] LLM call failed, allowing with manual-review flag:', err.message);
    return {
      decision: 'APPROVE',
      risk_level: 'LOW',
      violations: [],
      explanation: 'Moderation unavailable; queued for manual review.',
      suggested_modifications: '',
      flagged_categories: [],
      review_required: true
    };
  }
}
