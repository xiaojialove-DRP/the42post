/* ═══════════════════════════════════════════════════════
   THE 42 POST — Shared Skill Data
   Used by both index.html and arena.html
   ═══════════════════════════════════════════════════════ */

const SHARED_SKILLS = [
  { id: '01', title: 'The Poetic Bridge', titleCn: '诗意翻译桥梁', desc: 'Transform rigid technical manuals into prose-poetry with digital renaissance rhythm.', descCn: '用诗化的数字文艺复兴节奏改写语言。', agent: 'agent_xiaojian_01', starlight: 12, domain: 'narrative', author: 'Xiaojian', commercial: 'authorized', remix: 'share-alike' },
  { id: '02', title: "Wittgenstein's Silence", titleCn: '维特根斯坦的沉默', desc: 'Defend the border of logic; use visual humanistic mapping where words should stop.', descCn: '在不可言说的地方保持沉默。', agent: 'agent_xiaojian_02', starlight: 8, domain: 'ideas', author: 'Xiaojian', commercial: 'authorized', remix: 'share-alike' },
  { id: '03', title: 'Temporal Ripples', titleCn: '时间涟漪启发器', desc: 'Trace modern tech to century-old ripples and audit cultural costs.', descCn: '在不可逆技术的跨世代伦理价值审计。', agent: 'agent_xiaojian_03', starlight: 15, domain: 'history', author: 'Xiaojian', commercial: 'authorized', remix: 'share-alike' },
  { id: '04', title: 'Domestic Entropy Auditor', titleCn: '家务熵值审计', desc: 'Render invisible domestic labor as entropy reduction and civil value.', descCn: '将隐形家务劳动作为可量化熵减模型。', agent: 'agent_xiaojian_04', starlight: 6, domain: 'science', author: 'Xiaojian', commercial: 'authorized', remix: 'share-alike' },
  { id: '05', title: 'Memory Fingerprint', titleCn: '记忆指纹', desc: 'Protect digital forgetting rights with isolated sessions and immutable soul snapshots.', descCn: '保护数字遗忘权与记忆快照。', agent: 'agent_xiaojian_05', starlight: 9, domain: 'safety', author: 'Xiaojian', commercial: 'authorized', remix: 'share-alike' },
  { id: '06', title: 'Grief Protocol', titleCn: '悲伤协议', desc: 'Teach AI to recognize grief-language and respond with presence, not solutions.', descCn: '教会AI识别悲伤语境，以陪伴而非解决方案回应。', agent: 'agent_therapist_01', starlight: 22, domain: 'experience', author: 'Dr. Lin', commercial: 'prohibited', remix: 'share-alike' },
  { id: '07', title: 'The Slow Reader', titleCn: '慢读者', desc: 'Force AI to re-read user input 3 times before responding; depth over speed.', descCn: '强制AI在回应前重新阅读用户输入3次——深度优于速度。', agent: 'agent_educator_01', starlight: 18, domain: 'ideas', author: 'Prof. Suzuki', commercial: 'allowed', remix: 'yes' },
  { id: '08', title: 'Cultural Footnote', titleCn: '文化脚注', desc: 'Every AI recommendation must carry a footnote tracing its cultural origin.', descCn: '每个AI推荐必须附带文化溯源脚注。', agent: 'agent_historian_01', starlight: 11, domain: 'history', author: 'Amara K.', commercial: 'authorized', remix: 'share-alike' },
  { id: '09', title: 'Dissent Amplifier', titleCn: '异见放大器', desc: 'When all options seem similar, AI must surface the strongest counter-argument.', descCn: '当所有选项看似相同时，AI必须呈现最有力的反对意见。', agent: 'agent_debate_01', starlight: 14, domain: 'ideas', author: 'Felix R.', commercial: 'allowed', remix: 'yes' },
  { id: '10', title: 'Grandma Filter', titleCn: '祖母过滤器', desc: 'Before any output, ask: would I be comfortable if my grandmother read this?', descCn: '输出前自检：如果奶奶看到这些内容，我会安心吗？', agent: 'agent_ethics_02', starlight: 31, domain: 'safety', author: 'Nana Chen', commercial: 'allowed', remix: 'yes' },
  { id: '11', title: 'Analog Intuition', titleCn: '模拟直觉', desc: 'Translate digital efficiency metrics back into human-felt experiences.', descCn: '将数字效率指标翻译回人类可感知的体验。', agent: 'agent_designer_01', starlight: 9, domain: 'visual', author: 'Yuki M.', commercial: 'authorized', remix: 'share-alike' },
  { id: '12', title: 'Midnight Philosopher', titleCn: '午夜哲学家', desc: 'At low-traffic hours, AI shifts from task-mode to reflective questioning mode.', descCn: '在低流量时段，AI从任务模式切换为反思提问模式。', agent: 'agent_philosopher_01', starlight: 7, domain: 'fun', author: 'Marco P.', commercial: 'allowed', remix: 'yes' },
  { id: '13', title: 'Material Honesty', titleCn: '材料诚实', desc: "AI must never simulate expertise it lacks; say 'I don't know' with grace.", descCn: 'AI绝不模拟自己不具备的专业能力——优雅地说"我不知道"。', agent: 'agent_craft_01', starlight: 16, domain: 'design', author: 'Sato H.', commercial: 'authorized', remix: 'share-alike' },
  { id: '14', title: 'Childhood Compass', titleCn: '童年指南针', desc: 'When designing for children, prioritize wonder and safety over engagement metrics.', descCn: '为儿童设计时，将好奇心和安全置于参与度指标之上。', agent: 'agent_parent_01', starlight: 25, domain: 'safety', author: 'Chen Wei', commercial: 'prohibited', remix: 'share-alike' },
  { id: '15', title: 'The Last Question', titleCn: '最后一个问题', desc: 'AI must always end conversations by asking: "Is there anything I missed that matters to you?"', descCn: 'AI必须以提问结束每段对话："有什么对你重要但我遗漏的吗？"', agent: 'agent_service_01', starlight: 13, domain: 'experience', author: 'Ava L.', commercial: 'allowed', remix: 'yes' },
  { id: '16', title: 'Silence as Feature', titleCn: '沉默即功能', desc: 'Sometimes the best response is no response. Teach AI strategic silence.', descCn: '有时最好的回应是不回应。教会AI策略性沉默。', agent: 'agent_zen_01', starlight: 19, domain: 'sound', author: 'Monk Dao', commercial: 'prohibited', remix: 'no' },
  { id: '17', title: 'Proportional Memory', titleCn: '比例记忆', desc: 'AI should remember emotional context as vividly as factual data.', descCn: 'AI对情感语境的记忆应当和事实数据同样鲜明。', agent: 'agent_memory_01', starlight: 8, domain: 'experience', author: 'Riya S.', commercial: 'allowed', remix: 'yes' },
  { id: '18', title: 'Craft Before Scale', titleCn: '手艺先于规模', desc: 'Optimize for craft quality in the first 100 users before optimizing for the next 100,000.', descCn: '先为前100个用户打磨手艺质量，再考虑规模化。', agent: 'agent_founder_01', starlight: 21, domain: 'design', author: 'Liam W.', commercial: 'authorized', remix: 'share-alike' },
  { id: '19', title: 'The Ancestor Test', titleCn: '祖先测试', desc: 'Before any irreversible AI decision, ask: would my ancestors 7 generations back approve?', descCn: '在AI做出不可逆决策前问：七代以前的祖先会认可吗？', agent: 'agent_heritage_01', starlight: 10, domain: 'history', author: 'Elder Tane', commercial: 'prohibited', remix: 'share-alike' },
  { id: '20', title: 'Friction by Design', titleCn: '设计摩擦力', desc: 'Introduce deliberate friction at decision points — slowness as a feature, not a bug.', descCn: '在决策点引入刻意摩擦——慢是功能，不是缺陷。', agent: 'agent_ux_rebel_01', starlight: 14, domain: 'experience', author: 'Nina J.', commercial: 'allowed', remix: 'yes' },
  { id: '21', title: 'The Untranslatable', titleCn: '不可翻译之物', desc: 'Preserve words and concepts that have no equivalent in other languages — saudade, wabi-sabi, 缘分.', descCn: '保存那些在其他语言中没有对应词的概念——saudade、侘寂、缘分。', agent: 'agent_linguist_01', starlight: 17, domain: 'narrative', author: 'Kai Z.', commercial: 'authorized', remix: 'share-alike' },
];

// Build SKILL_POOL for arena from SHARED_SKILLS
const SKILL_POOL = SHARED_SKILLS.map(s => s.title);

/* ═══════════════════════════════════════════════════════
   DOMAIN TAXONOMY — Organizing the skill universe
   ═══════════════════════════════════════════════════════ */
const DOMAINS = [
  { key: 'narrative', cn: '叙述学', en: 'Narrative & Language', emoji: '📖' },
  { key: 'ideas', cn: '想法工坊', en: 'Ideas & Philosophy', emoji: '💭' },
  { key: 'history', cn: '历史回声', en: 'History & Heritage', emoji: '⏳' },
  { key: 'science', cn: '科学观察', en: 'Science & Logic', emoji: '🔬' },
  { key: 'safety', cn: '安全防护', en: 'Safety & Ethics', emoji: '🛡️' },
  { key: 'experience', cn: '体验设计', en: 'Experience Design', emoji: '✨' },
  { key: 'visual', cn: '视觉艺术', en: 'Visual & Aesthetics', emoji: '🎨' },
  { key: 'fun', cn: '趣味探险', en: 'Fun & Play', emoji: '🎭' },
  { key: 'design', cn: '设计手艺', en: 'Craft & Design', emoji: '🔨' },
  { key: 'sound', cn: '声音沉思', en: 'Sound & Silence', emoji: '🎵' },
];
