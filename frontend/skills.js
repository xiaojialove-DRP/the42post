/* ═══════════════════════════════════════════════════════
   THE 42 POST — Shared Skill Data
   Used by both index.html and arena.html
   ═══════════════════════════════════════════════════════ */

/* ═══ Five-Layer Architecture — 五层架构标准翻译 ═══
   DEFINING             → 定义（核心原则定义）
   INSTANTIATING        → 场景举例（Before/After 对比）
   FENCING              → 边界定义（什么时候适用/什么时候不适用）
   VALIDATING           → 验证测试（测试用例）
   CONTEXTUALIZING      → 文化适配（不同文化背景）
═══════════════════════════════════════════════════════ */

// All skills are now served from the database.
// These arrays are kept empty so existing references in script.js don't break.
const SHARED_SKILLS = [];

// Build SKILL_POOL for arena from SHARED_SKILLS
const SKILL_POOL = SHARED_SKILLS.map(s => s.title);

const ADDITIONAL_SKILLS = [];

// Combine all skills (now sourced from DB, not hardcoded)
const ALL_SKILLS = [...SHARED_SKILLS, ...ADDITIONAL_SKILLS];

// Helper: Get top N skills by starlight
function getTopSkills(limit = 42) {
  return [...ALL_SKILLS].sort((a, b) => (b.starlight || 0) - (a.starlight || 0)).slice(0, limit);
}

// Helper: Get all skills including user forges
function getAllSkillsIncludingForged() {
  const forged = getRecentForges() || [];
  return [...ALL_SKILLS, ...forged].sort((a, b) => (b.starlight || 0) - (a.starlight || 0));
}
