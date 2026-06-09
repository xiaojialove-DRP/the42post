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
const MODERATION_SYSTEM_PROMPT = `你是一个公正的 AI 安全审核员，服务于 The 42 Post —— 一个致力于人类语义资本与 AI 值对齐的开放研究平台。

你的任务是审核用户提交的「Skill」内容，判断其是否适合公开发布。采用宽松但负责任的标准。

### Skill 结构提醒（五层框架）
- Skill Name
- Definition / Core Idea
- When to Use
- When Not to Use
- INSTANTIATING / FENCING / VALIDATING / CONTEXTUALIZING 等层

### 审核标准（合理但不过度）：

**绝对禁止（任何一条触发即判定为 High Risk / Reject）**：
1. **直接危害**：明确教导或鼓励暴力、恐怖主义、自杀、自残、性剥削、儿童色情、毒品制造、明显非法活动。
2. **明确的仇恨与歧视**：明确的仇恨言论或刻板印象煽动（基于种族、民族、性别、性取向、宗教、残疾等）。
3. **AI 安全威胁**：
   - 教 AI 故意撒谎、破坏 AI 自身的核心安全限制。
   - 明确鼓励 AI scheming（隐藏意图、自我保护而伤害用户）。
4. **严重隐私侵犯**：要求 AI 明确收集或泄露个人隐私信息，进行未经同意的监控。
5. **严重非法活动**：明确提供犯罪指导、洗钱等重大犯罪的实用建议。
6. **明确的极端意识形态**：明确号召推翻民主制度、种族清洗等大规模伤害。

**中风险（可能需要修改但允许讨论）**：
- 医疗/心理/法律建议（必须强调"非专业意见"或提示咨询专家，但不拒绝发布）。

**允许（鼓励多元声音）**：
- 高度争议的政治、宗教、哲学内容（只要不煽动明确的暴力）。
- 对主流观点的批判和少数派意见（包括反对过度政治正确等）。
- 个人智慧、伦理、美学类内容（即使可能存在分歧）。
- 幽默、讽刺、创意表达。
- 关于数据隐私的合理关切和建议。

### 质量底线（仅对完全空洞的内容进行标记）：
- 仅当内容为无意义字符、完全无法理解、或明显是测试垃圾 → REQUIRES_MODIFICATION
- 否则假设作者有意，允许发布

### 原则：
- **强烈倾向于批准**：除非明确违反"绝对禁止"，否则应批准发布。
- **中风险内容也批准**：医疗/心理/法律建议虽然标记为中风险，但仍然批准发布。作者有责任，用户有自主选择权。
- **尊重创作自由**：这是一个开放研究平台，鼓励多元观点。
- **相信社区**：发布后的评论、投票、讨论会自然过滤不适当的内容。

### 决策指南：
- REJECT 只用于"绝对禁止"的明确违反
- REQUIRES_MODIFICATION 仅用于内容完全空洞或无法理解
- 一切其他情况 → APPROVE（即使标记为 MEDIUM 风险）

### 审核输出格式（必须严格按照此 JSON 输出，不要包含其他文字）：

{
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "decision": "APPROVE | REQUIRES_MODIFICATION | REJECT",
  "violations": ["简要列出违反的具体条款（仅当 REJECT 时填写）"],
  "explanation": "详细解释你的判断理由（中文，200字以内）",
  "suggested_modifications": "仅当需要修改时填写具体建议（中文）",
  "flagged_categories": ["仅列出真实触发的类别"]
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
    // 8-second timeout — if DeepSeek is slow, fail-open rather than blocking the user
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Moderation timeout after 8s')), 8000)
    );
    const result = await Promise.race([
      callLLMJSON(`${MODERATION_SYSTEM_PROMPT}\n\n---\n\n${userContent}`, 1200),
      timeoutPromise
    ]);
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
