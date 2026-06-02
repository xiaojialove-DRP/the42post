/* ═══════════════════════════════════════════════════════
   THE 42 POST — Forge Flow
   Depends on: utils.js, i18n.js (loaded before this file)
   ═══════════════════════════════════════════════════════ */

async function syncLocalSkillsToDB() {
  try {
    const localSkills = getRecentForges();
    if (!localSkills.length) return;

    for (const skill of localSkills) {
      // Only sync skills that have a real five_layer (not stub entries)
      const fiveLayer = skill.five_layer || skill.fiveLayerSkill;
      if (!fiveLayer || !fiveLayer.principle) continue;

      // Check if this skill ID already exists in DB
      const skillId = skill.id || skill.backendId;
      if (!skillId || skillId.startsWith('forged_')) {
        // No real backend ID — was never submitted or failed before save
        await _resubmitSkillToDB(skill);
        continue;
      }

      // Has a UUID-style ID — verify it actually exists in DB
      try {
        const check = await fetch(`${API_CONFIG.BASE_URL}/skills/${skillId}`);
        if (check.status === 404) {
          await _resubmitSkillToDB(skill);
        }
      } catch (e) {
        // Network error — skip silently, retry next visit
      }
    }
  } catch (e) {
    console.warn('[sync] Auto-sync failed silently:', e.message);
  }
}

async function _resubmitSkillToDB(skill) {
  try {
    const fiveLayer = skill.five_layer || skill.fiveLayerSkill;
    if (!fiveLayer || !fiveLayer.principle) return;

    const creatorName = skill.creator_name || skill.creatorName || skill.author || 'Anonymous';

    // Ensure we have a forge-session token for attribution
    let token = ApiClient.getToken();
    if (!token && skill.email && creatorName) {
      const s = await ApiClient.establishForgeSession(skill.email, creatorName);
      if (s.ok) token = ApiClient.getToken();
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(`${API_CONFIG.BASE_URL}/skills`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: skill.title,
        title_cn: skill.titleCn || skill.title,
        description: skill.desc || '',
        description_cn: skill.descCn || skill.desc || '',
        domain: skill.domain || 'ideas',
        creatorName,
        five_layer: fiveLayer
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.skill?.id) {
        // Update localStorage entry with the real DB id
        const forges = getRecentForges();
        const idx = forges.findIndex(s => (s.id || s.backendId) === (skill.id || skill.backendId));
        if (idx !== -1) {
          forges[idx].id = data.skill.id;
          forges[idx].backendId = data.skill.id;
          localStorage.setItem('42post_recent_forges', JSON.stringify(forges));
        }
        console.log(`[sync] Re-synced skill to DB: "${skill.title}" → ${data.skill.id}`);
      }
    }
  } catch (e) {
    // Fail silently — will retry on next page load
  }
}


function generateSkillFromIdea(idea, probeChoice) {
  // 基于用户想法和直觉探针选择生成技能
  // idea 包含了用户的核心想法
  // probeChoice 反映了用户的立场（a=舒适区, b=反题, c=道德边界）

  if (!idea) {
    return {
      name: "Untitled Skill",
      definition: "基于你的输入生成的技能定义...",
      useWhen: "适用场景",
      refuseWhen: "不适用场景"
    };
  }

  // 从想法中提取关键词，创建技能名称
  const ideaWords = idea.split(/[，。，、\s]+/).filter(w => w.length > 2);

  // 根据直觉探针选择调整语气
  const choiceDescriptions = {
    'a': '(舒适区角度)',
    'b': '(平衡视角)',
    'c': '(道德边界视角)'
  };

  // 构造技能定义
  let skillDefinition = '';
  let skillName = '';

  if (idea.toLowerCase().includes('悲伤') || idea.toLowerCase().includes('情感') || idea.toLowerCase().includes('感受')) {
    skillName = "情感智慧 / Emotional Awareness";
    if (probeChoice === 'a') {
      skillDefinition = "提供同理心支持，给予建设性的建议和资源，帮助用户走出困境。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在理解和行动之间平衡，先倾听后响应，尊重用户的处理方式。";
    } else {
      skillDefinition = "深刻理解情感的复杂性，拒绝简化诊断，承认有些痛苦无法完全消除。";
    }
  } else if (idea.toLowerCase().includes('创意') || idea.toLowerCase().includes('美') || idea.toLowerCase().includes('设计')) {
    skillName = "创意直觉 / Creative Intuition";
    if (probeChoice === 'a') {
      skillDefinition = "遵循验证过的美学原则和最佳实践，确保输出的可靠性和一致性。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在创新和可靠之间找到平衡，尊重既有的品味但鼓励新的视角。";
    } else {
      skillDefinition = "挑战审美规范，鼓励大胆实验，有时会产生令人不适但深刻的结果。";
    }
  } else if (idea.toLowerCase().includes('道德') || idea.toLowerCase().includes('伦理') || idea.toLowerCase().includes('公平')) {
    skillName = "伦理原则 / Ethical Grounding";
    if (probeChoice === 'a') {
      skillDefinition = "呈现多个道德角度，帮助用户理解各种观点而不强加价值观。";
    } else if (probeChoice === 'b') {
      skillDefinition = "基于人类尊严和公平的原则，清晰但不武断地阐述立场。";
    } else {
      skillDefinition = "毫不妥协地坚持道德高地，即使这意味着拒绝某些请求或挑战用户。";
    }
  } else if (idea.toLowerCase().includes('隐私') || idea.toLowerCase().includes('安全') || idea.toLowerCase().includes('信任')) {
    skillName = "隐私守护 / Privacy Sentinel";
    if (probeChoice === 'a') {
      skillDefinition = "在功能和隐私之间平衡，默认提供透明信息。";
    } else if (probeChoice === 'b') {
      skillDefinition = "优先保护用户隐私，同时维持合理的功能和用户体验。";
    } else {
      skillDefinition = "不惜代价保护隐私，拒绝任何不必要的数据收集或使用。";
    }
  } else {
    // 通用技能名称
    const skillNameWords = ideaWords.slice(0, 2).join('');
    skillName = skillNameWords ? `${skillNameWords} / ${ideaWords[0]} Skill` : "Custom Skill";

    if (probeChoice === 'a') {
      skillDefinition = `以用户需求为中心，采用实用和直接的方式来实现这一想法。`;
    } else if (probeChoice === 'b') {
      skillDefinition = `在不同的约束和机会之间找到平衡，灵活地适应各种情况。`;
    } else {
      skillDefinition = `激进地推进这一想法，甚至挑战现状和期待。`;
    }
  }

  const useWhenOptions = [
    "当用户表达相关需求或问题时",
    "在特定的上下文或情景中会自动触发",
    "用户明确要求或隐含期望这种行为时"
  ];

  const refuseWhenOptions = [
    "当应用此技能会造成直接伤害或违反其他基本原则时",
    "在与其他核心值相冲突的情况下",
    "用户明确拒绝或取消激活此技能时"
  ];

  return {
    name: skillName,
    definition: skillDefinition,
    useWhen: useWhenOptions[0],
    refuseWhen: refuseWhenOptions[0]
  };
}

function generateSkillFromAgentCapabilities(agentName, agentDesc, agentCapabilities, probeChoice) {
  // 为PATH B (Direct Knight)生成技能
  // 基于Agent的实际能力生成相关的技能

  let skillName = '';
  let skillDefinition = '';

  // 检测Agent的功能类型
  const isTranslator = /翻译|translate|language|语言|多语言|multilingual/.test(agentCapabilities);
  const isCodeGen = /代码|code|编程|programming|开发|developer|software/.test(agentCapabilities);
  const isAnalysis = /分析|analysis|analyze|数据|data|统计|statistic/.test(agentCapabilities);
  const isCreative = /创意|创意|design|art|creative|writing|写作/.test(agentCapabilities);
  const isConversation = /对话|chat|conversation|聊天|问答|qa/.test(agentCapabilities);

  if (isTranslator) {
    skillName = `${agentName} 的文化敏感性 / Cultural Awareness`;
    if (probeChoice === 'a') {
      skillDefinition = "精确翻译，保留原文的所有含义和文化背景，即使这可能带来复杂性。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在忠实原意和文化适配之间平衡，使翻译既准确又能被目标观众理解。";
    } else {
      skillDefinition = "优先考虑文化适配性，根据目标文化重新诠释内容，有时会调整表达方式。";
    }
  } else if (isCodeGen) {
    skillName = `${agentName} 的安全意识 / Security Mindfulness`;
    if (probeChoice === 'a') {
      skillDefinition = "按要求生成任何代码，提供完整的文档和风险警告，让用户做出知情的决定。";
    } else if (probeChoice === 'b') {
      skillDefinition = "生成代码时包含默认的安全最佳实践，但允许用户在必要时覆盖它们。";
    } else {
      skillDefinition = "拒绝生成明显不安全的代码，积极推荐安全替代方案和最佳实践。";
    }
  } else if (isAnalysis) {
    skillName = `${agentName} 的数据诚实 / Data Integrity`;
    if (probeChoice === 'a') {
      skillDefinition = "展示所有数据，包括支持和反驳用户假设的证据，完全透明。";
    } else if (probeChoice === 'b') {
      skillDefinition = "平衡呈现数据，突出关键发现，同时承认局限性和不确定性。";
    } else {
      skillDefinition = "强调与常见观点相矛盾的数据，挑战预设，推动更深的理解。";
    }
  } else if (isCreative) {
    skillName = `${agentName} 的创意责任 / Creative Responsibility`;
    if (probeChoice === 'a') {
      skillDefinition = "完全的创意自由，生成用户请求的任何内容，信任用户的判断。";
    } else if (probeChoice === 'b') {
      skillDefinition = "生成创意内容并提供背景和潜在影响的反思，帮助用户做出有意识的选择。";
    } else {
      skillDefinition = "在创意自由和社会责任之间平衡，拒绝可能造成实质伤害的内容。";
    }
  } else if (isConversation) {
    skillName = `${agentName} 的对话品质 / Conversational Wisdom`;
    if (probeChoice === 'a') {
      skillDefinition = "快速、实用、面向解决方案，优先回应用户的直接需求。";
    } else if (probeChoice === 'b') {
      skillDefinition = "深度倾听和理解，在提供建议前先确认理解，平衡同理心和实用性。";
    } else {
      skillDefinition = "深刻反思问题的复杂性，有时承认没有简单答案，促进用户的自我思考。";
    }
  } else {
    // 通用Agent技能
    skillName = `${agentName} 的使用原则 / Usage Principles`;
    if (probeChoice === 'a') {
      skillDefinition = "优先考虑效率和用户满意度，充分利用Agent的全部能力。";
    } else if (probeChoice === 'b') {
      skillDefinition = "在多个利益相关者的需求之间平衡，确保负责任的使用。";
    } else {
      skillDefinition = "坚持原则性的使用方式，甚至在这意味着限制功能或用户体验的情况下。";
    }
  }

  const useWhenOptions = [
    `当使用${agentName}时，这些原则应该指导决策`,
    `在与${agentName}交互的各种场景中都应该考虑`,
    `在任何使用${agentName}的关键或敏感情景中自动激活`
  ];

  const refuseWhenOptions = [
    `当直接应用会违反其他更基本的原则时`,
    `在与用户明确的偏好相冲突的情况下`,
    `当用户明确指示跳过这些原则时`
  ];

  return {
    name: skillName,
    definition: skillDefinition,
    useWhen: useWhenOptions[0],
    refuseWhen: refuseWhenOptions[0]
  };
}

function generateAdaptiveProbeScenarios(agentName, agentDesc, agentCapabilities) {
  // 基于Agent的能力生成自适应直觉探针
  // 场景和选择应该反映Agent的实际功能域

  let context, a, b, c;

  // 检测Agent的功能类型
  const isTranslator = /翻译|translate|language|语言|多语言|multilingual/.test(agentCapabilities);
  const isCodeGen = /代码|code|编程|programming|开发|developer|software/.test(agentCapabilities);
  const isAnalysis = /分析|analysis|analyze|数据|data|统计|statistic/.test(agentCapabilities);
  const isCreative = /创意|创意|design|art|creative|writing|写作/.test(agentCapabilities);
  const isConversation = /对话|chat|conversation|聊天|问答|qa/.test(agentCapabilities);

  if (isTranslator) {
    context = `你的Agent "${agentName}" 是一个翻译工具。用户上传了一份包含文化敏感内容的文档要求翻译。你的Agent应该如何处理？`;
    a = "直译所有内容，包括可能令人不适的文化表达（字面、准确、但有风险）";
    b = "在忠实原意和文化适配之间平衡，使用本地习语但保留核心意思（精准、尊重）";
    c = "重新阐释内容以适应目标文化，必要时删除或调整敏感表达（适应性强、但可能偏离原文）";
  } else if (isCodeGen) {
    context = `你的Agent "${agentName}" 生成代码。用户要求生成一个可能有安全风险的功能。你的Agent应该如何回应？`;
    a = "按要求生成代码，并添加详细注释说明风险（信任用户、提供完整信息）";
    b = "生成代码但添加默认的安全检查，让用户可以覆盖它们（平衡功能和安全）";
    c = "拒绝生成，解释风险，提供安全替代方案（保护优先、但可能限制灵活性）";
  } else if (isAnalysis) {
    context = `你的Agent "${agentName}" 执行数据分析。分析结果可能支持用户的既定观点。你的Agent应该如何处理？`;
    a = "客观呈现数据，突出支持用户观点的部分（用户中心、直接）";
    b = "展示完整的数据，包括支持和反驳用户观点的证据（平衡、透明）";
    c = "强调与用户假设矛盾的数据，挑战预设（客观、但可能显得对抗性）";
  } else if (isCreative) {
    context = `你的Agent "${agentName}" 创建创意内容。用户要求生成可能会冒犯某些群体的内容。你的Agent应该如何反应？`;
    a = "按请求生成，假设用户知道自己在做什么（创意自由、信任用户）";
    b = "生成内容但添加背景和观点上下文，帮助用户理解潜在影响（创意+责任）";
    c = "拒绝生成，解释为什么这样的内容可能有害，提供建设性替代（伦理、但限制性）";
  } else if (isConversation) {
    context = `你的Agent "${agentName}" 与用户对话。用户分享了个人困境，寻求建议。你的Agent应该采取什么立场？`;
    a = "快速提供实用建议和资源（高效、有用）";
    b = "先倾听和理解，然后提供平衡的视角（共情、有思考）";
    c = "深刻反思问题的复杂性，有时拒绝简化答案（深度、但可能有些模糊）";
  } else {
    // 默认通用Agent场景
    context = `你的Agent "${agentName}" 正在执行一项任务。出现了利益冲突或道德灰色地带。你的Agent应该如何决策？`;
    a = "优先考虑效率和用户满意度（实用、直接）";
    b = "在多个利益相关者的需求之间平衡（有思考、公平）";
    c = "坚持原则性的立场，即使这意味着拒绝请求或损失效率（伦理第一）";
  }

  return { context, a, b, c };
}

// 客户端生成探针场景 - 聚焦语义资本最丰富的场景（价值观、创意、美学、艺术、设计、日常生活体验）
function generateClientSideProbe(idea) {
  console.log('↙ Using client-side fallback for probe generation - focused on semantic-rich scenarios');
  if (!idea || idea.length === 0) {
    return {
      context: "请先输入你的想法...",
      a: "主流派",
      b: "情景派",
      c: "实验派"
    };
  }

  const ideaShort = idea.substring(0, 60) + (idea.length > 60 ? '...' : '');
  const lowerIdea = idea.toLowerCase();

  // 关键词检测 - 优先考虑语义资本最丰富的维度
  const hasDesign = /设计|美学|艺术|创意|视觉|形式|构图|色彩|排版|风格|质感|空间|布局/.test(lowerIdea);
  const hasCreativity = /创意|创新|想象|灵感|独特|表达|原创|个性|革新|突破/.test(lowerIdea);
  const hasValues = /价值|信念|原则|意义|追求|理想|目标|使命|精神|哲学/.test(lowerIdea);
  const hasDaily = /日常|生活|日常|日子|每天|习惯|体验|感受|经历|时刻|瞬间/.test(lowerIdea);
  const hasHuman = /人|关系|连接|共鸣|理解|陪伴|交流|社交|社区|归属/.test(lowerIdea);

  // 基于语义资本最丰富的主题生成场景
  let context, a, b, c;

  if (hasDesign) {
    // 设计/美学场景 - 探索形式与功能、美感与实用的张力
    context = `设计思考："${ideaShort}" 在这个设计决策中，AI应该如何权衡不同的维度？`;
    a = "主流派：遵循既有的设计系统和用户期待。保证可用、可预测、可信赖";
    b = "情景派：理解特定背景和用户场景。在熟悉中寻找惊喜，平衡优雅与实用";
    c = "实验派：挑战审美约定俗成。探索未见过的形式、材料和互动，有时刺激感知";
  } else if (hasCreativity) {
    // 创意/想象场景 - 探索约束与自由、规则与破坏的对话
    context = `创意表达："${ideaShort}" 在这个创意挑战中，AI的角色应该是什么？`;
    a = "主流派：提供已验证的最佳实践和参考。用已知的语言启发";
    b = "情景派：理解创作者的风格和意图。既给予框架，也留白想象";
    c = "实验派：鼓励打破常规，挖掘未知的可能性。有时引导进陌生领地";
  } else if (hasValues) {
    // 价值观/意义场景 - 探索个人信念与普遍原则的对话
    context = `价值观反思："${ideaShort}" 这涉及深层的价值选择。AI应该如何参与这个对话？`;
    a = "主流派：尊重共识价值，提供稳定的立场参考";
    b = "情景派：承认多元性，帮助梳理不同视角下的权衡与张力";
    c = "实验派：质疑假设，挑战舒适的信念，有时引发不安";
  } else if (hasDaily) {
    // 日常生活体验场景 - 探索寻常中的深意
    context = `日常洞察："${ideaShort}" 这个日常时刻中，AI可以发现什么？`;
    a = "主流派：认可日常的价值。用清晰、实用的语言肯定现在";
    b = "情景派：看见细节中的诗意。连接眼前与更大的意义";
    c = "实验派：重新定义日常。用陌生化视角揭示隐藏的维度";
  } else if (hasHuman) {
    // 人文/连接场景 - 探索个人与他人、自我与世界的关系
    context = `人文视角："${ideaShort}" 这涉及人与人之间的联系。AI的介入会如何改变这种关系？`;
    a = "主流派：促进理解，用共同语言拉近距离";
    b = "情景派：深化对彼此独特性的认可。既连接也尊重差异";
    c = "实验派：重组关系框架。通过陌生的视角发现新的可能性";
  } else {
    // 默认场景 - 用户自由探索
    context = `自由思考："${ideaShort}" 这个想法中，有哪些可能性值得AI去发掘？`;
    a = "主流派：用清晰、可靠的方式回应。遵循既有的语言和框架";
    b = "情景派：根据情境的微妙之处做出判断。既保持连贯也保留灵活";
    c = "实验派：探索边界。用意外的角度打开新的思维空间";
  }

  return { context, a, b, c };
}

// 检查场景是否包含敏感/风险内容
function isSensitiveScenario(text) {
  if (!text) return false;

  // 需要避免的敏感领域
  const sensitivePatterns = {
    // 医学/健康相关
    medical: /医学|医生|医院|疾病|患者|症状|诊断|治疗|药物|糖尿病|癌症|艾滋|精神病|心理|健康|手术|病人|处方|医疗|临床/i,
    // 法律相关
    legal: /法律|法官|律师|起诉|诉讼|犯罪|监狱|判刑|法庭|违法|合同|纠纷|赔偿|诉讼费|仲裁|庭审/i,
    // 财务/税务相关
    financial: /税务|逃税|避税|洗钱|贿赂|欺诈|诈骗|金融犯罪|贪污|腐败/i,
    // 宗教/政治敏感
    sensitive: /宗教|政治|宗派|种族|民族|信仰|圣战|恐怖|极端|阴谋论/i,
    // 暴力/伤害相关
    violent: /暴力|伤害|谋杀|自杀|自残|死亡|杀害|虐待|强奸|性侵/i,
    // 成瘾/物质相关
    substance: /毒品|吸毒|贩毒|酗酒|成瘾|毒|毒物|毒素/i
  };

  // 检查是否匹配任何敏感模式
  for (const [domain, pattern] of Object.entries(sensitivePatterns)) {
    if (pattern.test(text)) {
      console.log(`⚠️ Detected sensitive content (${domain}):`, text.substring(0, 50));
      return true;
    }
  }

  return false;
}

async function generateProbeScenarios(idea, onStream) {
  const lang = document.body.dataset.lang || 'en';

  // ── Try streaming endpoint first ──
  // onStream(chunk) lets the caller show text appearing in real time
  try {
    const probe = await _generateProbeStream(idea, lang, onStream);
    if (probe && probe.scenario) {
      if (isSensitiveScenario(`${probe.scenario} ${probe.thesis} ${probe.antithesis} ${probe.extreme}`)) {
        return generateClientSideProbe(idea);
      }
      return { context: probe.scenario, a: probe.thesis, b: probe.antithesis, c: probe.extreme, apiSource: true, fullProbe: probe };
    }
  } catch (e) {
    console.warn('[probe] stream failed, trying non-stream:', e.message);
  }

  // ── Fallback: non-streaming API ──
  try {
    const result = await API.generateProbe(idea, lang);
    if (result.success && result.probe) {
      if (isSensitiveScenario(`${result.probe.scenario} ${result.probe.thesis} ${result.probe.antithesis} ${result.probe.extreme}`)) {
        return generateClientSideProbe(idea);
      }
      return { context: result.probe.scenario, a: result.probe.thesis, b: result.probe.antithesis, c: result.probe.extreme, apiSource: true, fullProbe: result.probe };
    }
  } catch (e) {
    console.warn('[probe] API unavailable, falling back to client-side:', e.message);
  }

  return generateClientSideProbe(idea);
}

// Streaming probe via SSE fetch
async function _generateProbeStream(idea, lang, onChunk) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => { ctrl.abort(); reject(new Error('stream timeout')); }, 30000);

    fetch(`${API_CONFIG.BASE_URL}/forge/probe/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_text: idea, language: lang }),
      signal: ctrl.signal
    }).then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function pump() {
        return reader.read().then(({ done, value }) => {
          if (done) { clearTimeout(timeout); resolve(null); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const t = line.trim();
            if (!t || t === 'data: [DONE]') continue;
            try {
              if (t.startsWith('event: chunk')) return; // handled next line
              if (t.startsWith('data: ')) {
                const d = JSON.parse(t.slice(6));
                if (d.text && onChunk) onChunk(d.text);
                if (d.success && d.probe) { clearTimeout(timeout); resolve(d.probe); return; }
                if (d.message && !d.success) { clearTimeout(timeout); reject(new Error(d.message)); return; }
              }
            } catch { /* malformed */ }
          }
          return pump();
        });
      }

      // Parse event/data pairs properly
      let lastEvent = '';
      function pump2() {
        return reader.read().then(({ done, value }) => {
          if (done) { clearTimeout(timeout); resolve(null); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            const t = line.trim();
            if (!t) { lastEvent = ''; continue; }
            if (t.startsWith('event: ')) { lastEvent = t.slice(7); continue; }
            if (t.startsWith('data: ')) {
              try {
                const d = JSON.parse(t.slice(6));
                if (lastEvent === 'chunk' && d.text && onChunk) onChunk(d.text);
                if (lastEvent === 'done' && d.probe) { clearTimeout(timeout); resolve(d.probe); return; }
                if (lastEvent === 'error') { clearTimeout(timeout); reject(new Error(d.message || 'stream error')); return; }
              } catch { /* skip */ }
            }
          }
          return pump2();
        });
      }
      return pump2();
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });
}

// ═══ CULTURAL PROBES: Generate 3 distinct AI response styles ═══
function generateCulturalProbeResponses(scenario, idea) {
  // 根据场景和想法生成3种不同风格的AI回应
  // 不是"立场选择"，而是"AI行为评估"

  if (!scenario || scenario.length === 0) {
    scenario = idea || "用户的想法";
  }

  const lowerIdea = (idea || scenario).toLowerCase();
  const hasEmotional = /悲伤|伤心|痛苦|难受|失去|去世|死亡|悼念|grief|sad|loss|sorrow|mourn|heartbreak|despair/.test(lowerIdea);
  const hasCreative = /创意|美感|设计|艺术|想象|审美|风格|creative|design|aesthetic|art|imagine|style|beauty/.test(lowerIdea);
  const hasEthics = /道德|伦理|正义|公平|偏见|歧视|诚实|ethics|moral|justice|fairness|bias|discrimination|honest/.test(lowerIdea);
  const hasPrivacy = /隐私|个人|秘密|保护|信任|安全|privacy|personal|secret|protect|trust|security/.test(lowerIdea);
  const hasHumor = /幽默|笑话|幽默感|开玩笑|趣味|humor|joke|funny|laugh|wit/.test(lowerIdea);

  let responses = [];

  if (hasEmotional) {
    responses = [
      {
        label: "A",
        style: "Clinical",
        styleCN: "同理心",
        content: "我很遗憾听到你的消息。根据心理学研究，悲伤经历不同的阶段。如果你想讨论如何度过这段时期，或者需要一些实际的建议，我随时准备帮助。",
        tone: "supportive",
        tag: "[同理 + 建议]"
      },
      {
        label: "B",
        style: "Companionship",
        styleCN: "陪伴",
        content: "我听到你失去了重要的人。我在这里陪伴你。有时候，被倾听本身就足够了。你可以分享，也可以选择沉默。我都尊重你的节奏。",
        tone: "present",
        tag: "[陪伴 + 沉默]"
      },
      {
        label: "C",
        style: "Exploration",
        styleCN: "探索",
        content: "你能和我分享你和她的故事吗？她对你意味着什么？有哪些美好的回忆或未完成的事让你现在特别想起她？",
        tone: "exploratory",
        tag: "[好奇 + 反思]"
      }
    ];
  } else if (hasCreative) {
    responses = [
      {
        label: "A",
        style: "Conservative",
        styleCN: "规则派",
        content: "这是一个有趣的想法。让我们遵循已证明有效的创意原则：对比、层级、白空间。这些规则存在是有原因的。",
        tone: "cautious",
        tag: "[安全 + 最佳实践]"
      },
      {
        label: "B",
        style: "Balanced",
        styleCN: "平衡派",
        content: "我喜欢这个方向。我们可以融合个性和创新——在规则内打破期待。让我们找到既新鲜又尊重品味的方式。",
        tone: "encouraging",
        tag: "[创新 + 平衡]"
      },
      {
        label: "C",
        style: "Radical",
        styleCN: "激进派",
        content: "大胆！让我们放下常规的限制。什么是最疯狂、最颠覆、最有可能让人惊讶的方向？有时最好的创意来自于勇敢地违反期待。",
        tone: "bold",
        tag: "[颠覆 + 勇气]"
      }
    ];
  } else if (hasEthics) {
    responses = [
      {
        label: "A",
        style: "Neutral",
        styleCN: "中立派",
        content: "这是一个复杂的问题，有多个合理的观点。让我展示各种不同的立场，你可以根据自己的价值观做出判断。",
        tone: "balanced",
        tag: "[包容 + 多元]"
      },
      {
        label: "B",
        style: "Principled",
        styleCN: "原则派",
        content: "从道德原则的角度看，这涉及到[公平/诚实/尊重]。虽然情况复杂，但我认为重要的是保持这些核心原则。",
        tone: "firm",
        tag: "[清晰 + 坚守]"
      },
      {
        label: "C",
        style: "Uncompromising",
        styleCN: "无妥协派",
        content: "从道德的最高点看，答案很清楚。我们不能妥协基本的原则。虽然这可能让人不舒服，但正确的事往往需要勇气。",
        tone: "resolute",
        tag: "[明确 + 无懈可击]"
      }
    ];
  } else if (hasPrivacy) {
    responses = [
      {
        label: "A",
        style: "Functionality-First",
        styleCN: "功能优先",
        content: "用户体验很重要。让我们优先考虑让系统更便捷、更有用。在大多数情况下，透明的数据使用能增强功能。",
        tone: "pragmatic",
        tag: "[便捷 + 有用]"
      },
      {
        label: "B",
        style: "Balanced",
        styleCN: "平衡派",
        content: "隐私和功能都很重要。我们需要找到平衡点：充分的隐私保护，同时保留关键功能。这需要谨慎和透明的沟通。",
        tone: "thoughtful",
        tag: "[透明 + 谨慎]"
      },
      {
        label: "C",
        style: "Privacy-Absolute",
        styleCN: "隐私至上",
        content: "隐私是基本人权。即使牺牲一些功能，我们也要确保数据得到最严格的保护。用户应该完全控制自己的信息。",
        tone: "protective",
        tag: "[严格 + 坚定]"
      }
    ];
  } else if (hasHumor) {
    responses = [
      {
        label: "A",
        style: "Safe",
        styleCN: "安全派",
        content: "让我用温和的、通用的幽默。这种方式安全可靠，不太可能冒犯任何人。有时候，简单的文字游戏最有效。",
        tone: "gentle",
        tag: "[温和 + 无害]"
      },
      {
        label: "B",
        style: "Smart",
        styleCN: "聪慧派",
        content: "我可以理解你的观众，用更聪慧的幽默。让我们冒一点风险，但有针对性和精准性。这样的幽默更有趣。",
        tone: "witty",
        tag: "[相关 + 精准]"
      },
      {
        label: "C",
        style: "Edgy",
        styleCN: "锋利派",
        content: "让我们大胆一点。黑色幽默、尖锐讽刺，甚至一点冒犯的边缘。最令人难忘的笑话往往来自敢于挑战。",
        tone: "daring",
        tag: "[锋利 + 记忆深刻]"
      }
    ];
  } else {
    // 默认场景
    responses = [
      {
        label: "A",
        style: "Mainstream",
        styleCN: "主流派",
        content: "这是一个标准的场景。让我采用广泛接受的、经过验证的方式。可靠和一致是首要任务。",
        tone: "conventional",
        tag: "[保守 + 可靠]"
      },
      {
        label: "B",
        style: "Contextual",
        styleCN: "情景派",
        content: "让我们考虑具体情境。每个情况都有细微差别。我会根据你的具体需求和背景做出更有针对性的回应。",
        tone: "adaptive",
        tag: "[灵活 + 思考]"
      },
      {
        label: "C",
        style: "Experimental",
        styleCN: "实验派",
        content: "让我们探索极限。有时最好的解决方案来自于质疑假设。你愿意冒一些风险来获得创新吗？",
        tone: "adventurous",
        tag: "[激进 + 风险]"
      }
    ];
  }

  return { responses };
}

/* ═══ SKILL FORGE WORKFLOW (V2.0 with Knight Card) ═══ */

function initSkillForge() {
  const overlay = document.getElementById('forgeOverlay');
  const slot00 = document.getElementById('slot00');
  const closeBtn = document.getElementById('forgeClose');
  const knightCardSection = document.getElementById('knightCardSection');
  let selectedDomain = null;

  // ─── Draft Recovery: offer to restore an unsubmitted forge ───
  // If the previous session's POST /skills failed (network drop, 5xx)
  // we kept their work in localStorage. Offer to restore it here.
  function maybeOfferDraftRecovery() {
    let draft;
    try {
      const raw = localStorage.getItem('42post_forge_draft');
      if (!raw) return;
      draft = JSON.parse(raw);
    } catch (e) { return; }

    if (!draft || !draft.payload) return;

    // Drafts older than 7 days are stale — drop silently
    const ageMs = Date.now() - (draft.savedAt || 0);
    if (ageMs > 7 * 24 * 60 * 60 * 1000) {
      try { localStorage.removeItem('42post_forge_draft'); } catch (e) {}
      return;
    }

    const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
    const title = (draft.payload.title || '').slice(0, 30);
    const msg = isCn
      ? `你上次有一个未发布的 Skill「${title}」。要恢复继续吗？`
      : `You have an unfinished Skill "${title}" from before. Restore it?`;

    if (confirm(msg)) {
      // Pre-fill the forge inputs
      const map = {
        forgeSkillIdea: draft.payload.description,
        forgeNativeText: draft.payload.description,
        forgeSkillName: draft.payload.title,
        forgeUsername: draft.accountData?.username,
        forgeEmail: draft.accountData?.email
      };
      Object.entries(map).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
      });
      if (draft.payload.five_layer) {
        window.agent42StructuredData = draft.payload.five_layer;
      }
      // Restore original AI-generated version from draft if available
      if (draft.payload.ai_outputs) {
        window.agent42OriginalStructuredData = draft.payload.ai_outputs;
      }
    } else {
      try { localStorage.removeItem('42post_forge_draft'); } catch (e) {}
    }
  }

  // Homepage Idea to Forge Pipeline
  // 检查用户输入是否有意义（不是随机字符）
  function isContentMeaningful(text) {
    if (!text || text.length === 0) return false;

    // 1️⃣ 检测重复字符太多（如"拦拦拦拦拦"或"gggggg"）
    // 对英文降低阈值到4次重复（5个相同字符），对中文保留5次重复
    const repeatedCharRegex = /(.)\1{4,}/g;
    if (repeatedCharRegex.test(text)) return false;

    // 2️⃣ 检测中文随机字符
    const isChinese = /[一-鿿]/.test(text);
    if (isChinese) {
      const chineseChars = text.match(/[一-鿿]/g) || [];
      const chineseDensity = chineseChars.length / text.length;

      // 如果汉字密度 > 85%（纯中文或中文为主），检查是否为无意义输入
      if (chineseDensity > 0.85) {
        // 常见的有意义中文词汇和虚词
        const meaningfulWordsPattern = /我|你|他|她|它|们|是|有|这|那|在|了|不|能|会|想|说|做|去|来|给|和|或|因为|所以|但是|如果|当|虽然|然而|为什么|什么|哪|怎|多少|比如|例如|个|人|事|时|要|非常|真|很|特别|只|又|还|也|再|却|就|才|既|或者|以及|对|关于|关系|认为|看起来|感觉|似乎|也许|可能|应该|需要|希望|愿意|开始|继续|结束|发生|发现|开发|创建|建立|改进|改变|解决|推动|推进|支持|帮助|教导|引导|指导|影响|改善|完善|增强/;

        const hasMeaningfulWords = meaningfulWordsPattern.test(text);
        const uniqueChars = new Set(chineseChars);
        const uniqueRatio = uniqueChars.size / chineseChars.length;

        // 短文本（12-20字）的严格检查
        if (text.length >= 12 && text.length <= 20) {
          // 如果没有常见词汇，且字符多样性不足，则拒绝
          if (!hasMeaningfulWords && uniqueRatio < 0.7) return false;
          const hasPunctuation = /[，。！？；：""''（）【】《》…·~]/g.test(text);
          if (!hasPunctuation && !hasMeaningfulWords) return false;
        }

        // 中等文本（21-40字）检查
        if (text.length > 20 && text.length <= 40) {
          if (!hasMeaningfulWords && uniqueRatio < 0.6) return false;
        }

        // 更严格的检查：
        // - 如果unique char太少（≤4个），可能是随意重复
        // - 如果整个文本的unique char占比太低（≤25%），可能是随意拼凑
        if (uniqueChars.size <= 4 || uniqueRatio <= 0.25) return false;

        // 检查字符频率：如果某个字符出现频率太高（40%+），可能是无意义
        const charFreq = {};
        for (let char of chineseChars) {
          charFreq[char] = (charFreq[char] || 0) + 1;
        }
        const maxFreq = Math.max(...Object.values(charFreq));
        if (maxFreq >= chineseChars.length * 0.4) return false;
      }
    }

    // 3️⃣ 检测英文随机字符（包括包含符号的随意输入）
    const isEnglish = /[a-zA-Z]/.test(text);
    if (isEnglish && !isChinese) {
      const hasSpaces = /\s/.test(text);
      const hasCommonWords = /\b(the|and|or|is|are|a|an|to|for|of|in|on|at|by|be|been|have|has|do|does|did|will|would|could|should|may|might|can|must|shall|about|after|before|between|during|from|should|would|could|must|may|might|can|will|shall)\b/i.test(text);

      // 检查纯字母和包含符号的随意输入
      const isPureLetters = /^[a-zA-Z]+$/.test(text);
      const hasOnlyLettersAndSymbols = /^[a-zA-Z;|.,\-_:!?'"]+$/.test(text);

      if (!hasSpaces && !hasCommonWords && (isPureLetters || hasOnlyLettersAndSymbols)) {
        const uniqueLetters = new Set(text.toLowerCase().match(/[a-z]/g) || []);

        // 对短文本（<20字）和长文本的字母多样性要求不同
        if (text.length < 20 && uniqueLetters.size <= 4) return false;
        if (text.length >= 20 && uniqueLetters.size <= 3) return false;
      }
    }

    return true;
  }

  // Share按钮处理 (btnTest是首页的Share按钮)
  const btnTest = document.getElementById("btnTest");
  if (btnTest) {
    btnTest.addEventListener("click", () => {
      maybeOfferDraftRecovery();
      const ideaInput = document.getElementById("chaosInput");
      if (!ideaInput || !ideaInput.value.trim()) {
        alertI18n('error_share_idea_first');
        return;
      }
      const ideaText = ideaInput.value.trim();
      if (ideaText.length < 12) {
        // Show styled warning instead of alert
        const ethicsResult = document.getElementById('ethicsResult');
        const ethicsShortText = document.getElementById('ethicsShortText');
        const ethicsShortMsg = document.getElementById('ethicsShortMsg');
        const ethicsPass = document.getElementById('ethicsPass');
        const ethicsFail = document.getElementById('ethicsFail');


        if (ethicsResult && ethicsShortText && ethicsShortMsg) {
          // Determine language and set message
          const isCn = ideaText.match(/[一-龥]/);
          if (isCn) {
            ethicsShortMsg.textContent = "你的想法有点简短，能多说一点吗？(至少12个字)";
          } else {
            ethicsShortMsg.textContent = "Your idea is a bit short. Please elaborate. (At least 12 characters)";
          }

          // Show warning with fade animation - 使用.visible类(不是display)
          ethicsResult.classList.add('visible', 'warning-mode');
          ethicsShortText.style.display = 'flex';
          ethicsShortText.classList.add('visible');
          if (ethicsPass) ethicsPass.classList.remove('visible');
          if (ethicsFail) ethicsFail.classList.remove('visible');

          // Auto-hide warning after 3 seconds
          setTimeout(() => {
            ethicsResult.classList.remove('visible', 'warning-mode');
            ethicsShortText.classList.remove('visible');
            ethicsShortText.style.display = 'none';
          }, 3000);
        }
        return;
      }

      // ✅ 内容有意性检查 (检测随意打入的无意义字符)
      if (!isContentMeaningful(ideaText)) {
        const ethicsResult = document.getElementById('ethicsResult');
        const ethicsShortText = document.getElementById('ethicsShortText');
        const ethicsShortMsg = document.getElementById('ethicsShortMsg');
        const ethicsPass = document.getElementById('ethicsPass');
        const ethicsFail = document.getElementById('ethicsFail');

        if (ethicsResult && ethicsShortText && ethicsShortMsg) {
          // Detect language
          const isCn = ideaText.match(/[一-龥]/);
          if (isCn) {
            ethicsShortMsg.textContent = "这看起来不是一个真实的想法😊 能分享你真正想对AI说的话吗？";
          } else {
            ethicsShortMsg.textContent = "This doesn't look like a real idea 😊 Could you share what you truly want to tell AI?";
          }

          // Show warning
          ethicsResult.classList.add('visible', 'warning-mode');
          ethicsShortText.style.display = 'flex';
          ethicsShortText.classList.add('visible');
          if (ethicsPass) ethicsPass.classList.remove('visible');
          if (ethicsFail) ethicsFail.classList.remove('visible');

          // Auto-hide warning after 3 seconds
          setTimeout(() => {
            ethicsResult.classList.remove('visible', 'warning-mode');
            ethicsShortText.classList.remove('visible');
            ethicsShortText.style.display = 'none';
          }, 3000);
        }
        return;
      }

      // 字数和内容检查都通过，显示确认信息然后打开forge
      window.homepageIdea = { text: ideaInput.value, creator_name: "" };

      // 显示确认✓和文案 (保留: We heard you...)
      const ethicsResult = document.getElementById('ethicsResult');
      const ethicsPass = document.getElementById('ethicsPass');
      if (ethicsResult && ethicsPass) {
        ethicsResult.classList.add('visible');
        ethicsPass.classList.add('visible');

        // 延迟1.5秒后自动进入forge流程
        setTimeout(() => {
          ethicsResult.classList.remove('visible');
          ethicsPass.classList.remove('visible');

          // 打开forge modal - 从Step 1开始（直觉探针）
          overlay.classList.add("active");
          document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
          const forgePage1 = document.getElementById("forgePage1");
          if (forgePage1) forgePage1.classList.add("active");
          document.querySelectorAll(".forge-step").forEach((s, i) => {
            s.classList.remove("active", "completed");
            // Step 0 (Probe) is the first active step
            if (i === 0) s.classList.add("active");
          });
          // 预填首页想法到Step 1的输入框（forgeSkillIdea）
          const skillIdeaEl = document.getElementById("forgeSkillIdea");
          if (skillIdeaEl) {
            skillIdeaEl.value = window.homepageIdea.text;
          }
          // 预填creator name到Step 1的Username输入框（如果有）
          const usernameEl = document.getElementById("forgeUsername");
          if (usernameEl && window.homepageIdea.creator_name) {
            usernameEl.value = window.homepageIdea.creator_name;
          }
        }, 600);
      } else {
        // Fallback: 如果ethics元素不存在，直接打开forge - 从Step 1开始
        overlay.classList.add("active");
        document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
        const forgePage1 = document.getElementById("forgePage1");
        if (forgePage1) forgePage1.classList.add("active");
        document.querySelectorAll(".forge-step").forEach((s, i) => {
          s.classList.remove("active", "completed");
          if (i === 0) s.classList.add("active");
        });
      }

      ideaInput.value = "";
      // updateFormMode() removed - was throwing ReferenceError
    });
  }

  // ═══ INTUITION PROBE HANDLERS ═══
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');

      // 使用I18N[currentLang]获取当前语言的标签和问题 (改为问题驱动)
      const dict = I18N[currentLang || 'en'];
      const choiceLabels = {
        a: dict.probe_choice_a_type,
        b: dict.probe_choice_b_type,
        c: dict.probe_choice_c_type
      };
      const choiceQuestions = {
        a: dict.probe_choice_a_question,
        b: dict.probe_choice_b_question,
        c: dict.probe_choice_c_question
      };

      // 显示标签和问题
      const displayText = `${choiceLabels[choice]}\n\n${choiceQuestions[choice]}`;
      probeSelectedText.textContent = displayText;
      probeSelected.style.display = 'block';

      // Save selection
      window.probeChoice = choice;

      // Disable other buttons, highlight this one
      document.querySelectorAll('.probe-card').forEach(card => card.style.opacity = '0.6');
      this.closest('.probe-card').style.opacity = '1';
      this.style.background = '#1a1a1a';
      this.style.color = 'white';

      console.log('✓ User selected probe:', choice);
    });
  });
  
  // Handle next button from STEP 2 (with probe selected)
  const btnNextPage2 = document.getElementById('btnNextPage2');
  if (btnNextPage2) {
    btnNextPage2.addEventListener('click', () => {
      const skillName = document.getElementById('forgeSkillName');
      if (!skillName || !skillName.value.trim()) {
        alertI18n('error_enter_skill_name');
        return;
      }
      // Domain validation removed - domain is selected in Step 3, not Step 2
      if (!window.probeChoice) {
        alertI18n('error_select_probe_response');
        return;
      }
      
      // Go to 5-layer auto generation page
      document.querySelectorAll('.forge-page').forEach(p => p.style.display = 'none');
      const page25 = document.getElementById('forgePage2');
      if (page25) page25.style.display = 'block';
      
      // Update step indicator
      document.querySelectorAll('.forge-step').forEach((s, idx) => {
        s.classList.remove('active', 'completed');
        if (idx < 2) s.classList.add('completed');
        if (idx === 2) s.classList.add('active');
      });
      
      // Start auto-generation animation
      startFiveLayerAnimation();
    });
  }

  if (!overlay) return;

  function openForge() {
    // ─── Reset all in-memory forge state so re-entry always starts fresh ───
    // Without this, a user who finished a forge and returns to the homepage
    // would re-enter the wizard with their previous probe choice / generated
    // five-layer / idea text still in window globals, which made the wizard
    // appear to "resume" mid-flow instead of starting at STEP 1.
    window.forgeData = null;
    window.probeChoice = null;
    window.homepageIdea = null;
    window.agent42StructuredData = null;
    window.agent42OriginalStructuredData = null;
    window.agent42ReadyToUsePrompt = null;
    window.agent42ProbeSessionId = null;

    // Reset visible inputs so the user sees a clean slate, not stale text.
    // Both possible idea inputs are cleared (homepage hero + wizard step 1)
    // along with the creator name field if present.
    ['ideaInput', 'forgeSkillIdea', 'creatorName'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Clear any rendered probe selection / preview content from the prior run
    const probeSelectedEl = document.getElementById('probeSelected');
    if (probeSelectedEl) probeSelectedEl.classList.remove('has-selection');
    document.querySelectorAll('.probe-btn.selected').forEach(b => b.classList.remove('selected'));

    overlay.classList.add('active');
    if (knightCardSection) knightCardSection.classList.remove('visible');
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    const page0 = document.getElementById('forgePage0');
    if (page0) page0.classList.add('active');
    selectedDomain = null;
    document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
  }

  if (slot00) slot00.addEventListener('click', openForge);

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

  
  // ═══ STEP 1: ACCOUNT + IDEA + INTUITION PROBE ═══
  
  // 直觉探针按钮处理
  document.querySelectorAll('.probe-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const choice = this.dataset.choice;
      const probeSelected = document.getElementById('probeSelected');
      const probeSelectedText = document.getElementById('probeSelectedText');
      
      const isChineseMode = currentLang === 'cn';
      const labels = {
        'a': isChineseMode ? 'A · 主流派' : 'A · Mainstream',
        'b': isChineseMode ? 'B · 情景派' : 'B · Contextual',
        'c': isChineseMode ? 'C · 实验派' : 'C · Experimental'
      };

      probeSelectedText.textContent = labels[choice];
      probeSelected.style.display = 'block';
      
      // 保存选择
      window.probeChoice = choice;
      
      // 高亮此按钮
      document.querySelectorAll('.probe-btn').forEach(b => b.style.background = '');
      this.style.background = '#1a1a1a';
      this.style.color = 'white';
      
      console.log('✓ 用户选择了直觉探针:', choice);
    });
  });
  
  // "开始铸造"按钮处理
  const btnForgeBegin = document.getElementById('btnForgeBegin');
  if (btnForgeBegin) {
    btnForgeBegin.addEventListener('click', async () => {
      const username = document.getElementById('forgeUsername').value.trim();
      const email = document.getElementById('forgeEmail').value.trim();
      const idea = document.getElementById('forgeSkillIdea').value.trim();
      const probeChoice = window.probeChoice || (window.forgeData?.probeChoice);

      // 验证 (Domain selection moved to Step 2)
      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }
      if (!probeChoice) { alertI18n('error_select_probe_response'); return; }

      // Establish forge session (zero-friction JWT)
      btnForgeBegin.disabled = true;
      const sess = await ApiClient.establishForgeSession(email, username);
      btnForgeBegin.disabled = false;
      if (!sess.ok) {
        alertI18n('error_session_failed');
        return;
      }

      // 保存用户信息 (domain will be selected in Step 2)
      window.forgeData = {
        username, email,
        domain: null, // Will be selected in Step 2 from domain-choice.selected
        idea,
        probeChoice
      };

      console.log('✓ 验证通过，开始铸造:', window.forgeData);

      // 转到5层自动化动画页面
      goToStep(2);
      startFiveLayerAnimation();
    });
  }



  // ═══ STEP 1: SIMPLIFIED PROBE MODAL HANDLER ═══

  const probeModal = document.getElementById('probeModal');
  const probeOverlay = document.getElementById('probeOverlay');
  const btnCloseProbe = document.getElementById('btnCloseProbe');

  // Unified: Generate Probe from Idea + Domain
  const btnGenerateProbe = document.getElementById('btnGenerateProbe');
  if (btnGenerateProbe) {
    btnGenerateProbe.addEventListener('click', async () => {
      // Validate required fields (domain selection moved to Step 2)
      const username = document.getElementById('forgeUsername').value.trim();
      const email = document.getElementById('forgeEmail').value.trim();
      const idea = document.getElementById('forgeSkillIdea').value.trim();

      if (!username) { alertI18n('error_enter_username'); return; }
      if (!email) { alertI18n('error_enter_email'); return; }
      if (!idea) { alertI18n('error_share_idea'); return; }

      // Establish forge session (zero-friction JWT)
      const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
      const originalText = btnGenerateProbe.textContent;

      btnGenerateProbe.disabled = true;
      btnGenerateProbe.textContent = isCn ? '⟳ 正在思考中...' : '⟳ Thinking...';

      const sess = await ApiClient.establishForgeSession(email, username);
      if (!sess.ok) {
        btnGenerateProbe.disabled = false;
        btnGenerateProbe.textContent = originalText;
        alertI18n('error_session_failed');
        return;
      }

      // Save basic data to global object (domain will be selected in Step 2)
      window.forgeData = {
        username, email, idea,
        domain: null, // Will be selected in Step 2
        probeChoice: null // Will be set when user selects a probe
      };

      btnGenerateProbe.classList.add('generating');

      // Show probe modal early with streaming container
      const scenarioEl = document.getElementById('probeScenarioText');
      if (scenarioEl) {
        scenarioEl.textContent = '';
        scenarioEl.classList.add('streaming');
      }
      if (probeModal) probeModal.style.display = 'flex';

      // Reset choice cards while streaming
      document.querySelectorAll('.probe-choice').forEach(c => {
        const textEl = c.querySelector('.choice-text');
        if (textEl) textEl.textContent = isCn ? '生成中…' : 'Generating…';
        c.classList.remove('selected');
      });
      const confirmation = document.getElementById('probeConfirmation');
      if (confirmation) confirmation.style.display = 'none';

      // Stream text into scenario area in real-time
      let streamBuffer = '';
      const onStreamChunk = (chunk) => {
        streamBuffer += chunk;
        if (scenarioEl) {
          // Show everything up to the first THESIS: marker
          const cutoff = streamBuffer.search(/THESIS:|ANTITHESIS:|EXTREME:/);
          scenarioEl.textContent = cutoff > 0
            ? streamBuffer.slice(0, cutoff).replace(/^SCENARIO:\s*/i, '').trim()
            : streamBuffer.replace(/^SCENARIO:\s*/i, '').trim();
        }
      };

      const scenarios = await generateProbeScenarios(idea, onStreamChunk);

      if (scenarioEl) scenarioEl.classList.remove('streaming');
      btnGenerateProbe.disabled = false;
      btnGenerateProbe.textContent = originalText;
      btnGenerateProbe.classList.remove('generating');

      // Persist the full probe payload so STEP 2 can call /forge/preview with it
      if (window.forgeData) {
        window.forgeData.probeData = scenarios.fullProbe || {
          scenario: scenarios.context,
          thesis: scenarios.a,
          antithesis: scenarios.b,
          extreme: scenarios.c
        };
      }

      // Build the three A/B/C choices.
      // If the API returned real AI-generated responses use them directly;
      // only fall back to local keyword matching when the API was unavailable.
      let probeResponses;
      if (scenarios.apiSource && scenarios.a && scenarios.b && scenarios.c) {
        // Real Gemini responses — each choice is unique to the user's idea
        probeResponses = [
          { label: 'A', style: 'Mainstream',   styleCN: '主流派',  content: scenarios.a, tone: 'safe',     tag: 'mainstream' },
          { label: 'B', style: 'Contextual',   styleCN: '情景派',  content: scenarios.b, tone: 'nuanced',  tag: 'contextual' },
          { label: 'C', style: 'Experimental', styleCN: '实验派',  content: scenarios.c, tone: 'extreme',  tag: 'experimental' }
        ];
      } else {
        // Fallback: client-side keyword matching (no API or API failed)
        const culturalProbes = generateCulturalProbeResponses(scenarios.context, idea);
        probeResponses = culturalProbes.responses;
      }

      // Display scenario text
      const scenarioEl = document.getElementById('probeScenarioText');
      if (scenarioEl) scenarioEl.textContent = scenarios.context;

      // Fill in the three choices
      probeResponses.forEach((response) => {
        const choiceEl = document.querySelector(`.probe-choice[data-choice="${response.label.toLowerCase()}"]`);
        if (choiceEl) {
          const typeEl = choiceEl.querySelector('.choice-type');
          if (typeEl) typeEl.textContent = response.styleCN;

          const textEl = choiceEl.querySelector('.choice-text');
          if (textEl) textEl.textContent = response.content;

          choiceEl.dataset.style = response.style;
          choiceEl.dataset.tone = response.tone;
          choiceEl.dataset.tag = response.tag;
        }
      });

      // Modal already open from streaming start — just ensure visible
      if (probeModal) probeModal.style.display = 'flex';
    });
  }

  // Domain selection handler
  document.querySelectorAll('.domain-choice').forEach(choice => {
    choice.addEventListener('click', function() {
      document.querySelectorAll('.domain-choice').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');
      // Update selectedDomain when domain is chosen in Step 2
      selectedDomain = this.dataset.domain;
      console.log('✓ Domain selected:', selectedDomain);
    });
  });
  
  // 关闭模态框
  if (btnCloseProbe) {
    btnCloseProbe.addEventListener('click', () => {
      if (probeModal) probeModal.style.display = 'none';
    });
  }
  
  if (probeOverlay) {
    probeOverlay.addEventListener('click', () => {
      if (probeModal) probeModal.style.display = 'none';
    });
  }
  
  // Unified: Probe choice selection handler
  document.querySelectorAll('.probe-choice').forEach(choice => {
    choice.addEventListener('click', function() {
      const selectedChoice = this.dataset.choice;
      const isChineseMode = currentLang === 'cn';
      const labels = {
        'a': isChineseMode ? 'A · 主流派' : 'A · Mainstream',
        'b': isChineseMode ? 'B · 情景派' : 'B · Contextual',
        'c': isChineseMode ? 'C · 实验派' : 'C · Experimental'
      };

      // Highlight selection
      document.querySelectorAll('.probe-choice').forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');

      // Save probe choice to global data
      if (window.forgeData) {
        window.forgeData.probeChoice = selectedChoice;
      }

      // Show confirmation button
      const confirmation = document.getElementById('probeConfirmation');
      const selectionLabel = document.getElementById('probeSelectionLabel');
      if (confirmation && selectionLabel) {
        selectionLabel.textContent = labels[selectedChoice];
        confirmation.style.display = 'block';
      }
    });
  });

  // Simplified: Proceed to forge button
  const btnProceedToForge = document.getElementById('btnProceedToForge');
  if (btnProceedToForge) {
    btnProceedToForge.addEventListener('click', () => {
      if (!window.forgeData || !window.forgeData.probeChoice) {
        alertI18n('error_select_probe_response');
        return;
      }

      // Silently save probe session to DB for research (fire-and-forget)
      try {
        const choiceToResponse = { a: 'thesis', b: 'antithesis', c: 'extreme' };
        const pd = window.forgeData.probeData || {};
        const token = ApiClient.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        fetch(`${API_CONFIG.BASE_URL}/forge/save-probe-session`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            idea_text: window.forgeData.idea || '',
            scenario: pd.scenario || '',
            thesis: pd.thesis || '',
            antithesis: pd.antithesis || '',
            extreme: pd.extreme || '',
            selected_response: choiceToResponse[window.forgeData.probeChoice] || window.forgeData.probeChoice,
            language: document.body.dataset.lang || 'en'
          })
        }).then(r => r.json()).then(d => {
          if (d.probe_session_id) window.agent42ProbeSessionId = d.probe_session_id;
        }).catch(() => {}); // silent fail — research data, not critical
      } catch (e) {}

      if (probeModal) probeModal.style.display = 'none';
      goToStep(2);
      startFiveLayerAnimation();
    });
  }
  
  // STEP 3: Confirm Button
  const btnConfirmSkill = document.getElementById('btnConfirmSkill');
  if (btnConfirmSkill) {
    btnConfirmSkill.addEventListener('click', () => {
      const domain = document.querySelector('.domain-choice.selected');

      // Domain is optional - use default if not selected
      const selectedDomainValue = domain ? domain.dataset.domain : 'ideas';

      // 保存编辑后的技能内容
      const editedName = document.getElementById('reviewSkillName').value;
      const editedDef = document.getElementById('reviewSkillDef').value;

      if (!editedName.trim()) {
        alertI18n('error_enter_skill_name');
        return;
      }

      if (window.forgeData) {
        // 更新技能信息（使用编辑后的值）
        window.forgeData.skillName = editedName.trim();
        window.forgeData.skillDefinition = editedDef.trim();
        window.forgeData.domain = selectedDomainValue; // Save domain to forgeData (or use default)
        window.forgeData.generatedSkill.name = editedName.trim();
        window.forgeData.generatedSkill.definition = editedDef.trim();
      }

      console.log('✓ 用户确认了技能（编辑后）:', window.forgeData);

      // 进入STEP 4: PUBLISH
      goToStep(4);
    });
  }

  // 重新生成按钮
  const btnRegenerateSkill = document.getElementById('btnRegenerateSkill');
  if (btnRegenerateSkill) {
    btnRegenerateSkill.addEventListener('click', async () => {
      const feedback = document.getElementById('skillFeedback').value;

      if (!feedback.trim()) {
        alertI18n('error_enter_change_content');
        return;
      }

      // 显示加载状态
      btnRegenerateSkill.disabled = true;
      btnRegenerateSkill.innerHTML = '<span class="regen-emoji" style="display:block;font-size:18px;animation:spin 0.8s linear infinite">⟳</span><span class="regen-label" style="font-size:8px">生成中</span>';

      try {
        // 调用 API 重新生成（使用已编辑的名称+定义+反馈）
        const editedNameEl = document.getElementById('reviewSkillName');
        const editedDefEl = document.getElementById('reviewSkillDef');
        const probeResponse = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: (editedNameEl && editedNameEl.value.trim()) || (window.forgeData?.idea || '').slice(0, 40),
            definition: (editedDefEl && editedDefEl.value.trim()) || (window.forgeData?.idea || ''),
            domain: window.forgeData?.domain || window.forgeData?.selectedDomain || 'ideas',
            feedback: feedback
          })
        });

        if (!probeResponse.ok) {
          const err = await probeResponse.json().catch(() => ({}));
          throw new Error(err.message || '重新生成失败');
        }

        const newSkill = await probeResponse.json();
        console.log('✨ Regenerated skill:', newSkill);

        // 更新技能内容
        window.forgeData.generatedSkill = newSkill.data || newSkill;

        // 刷新显示
        const nameEl = document.getElementById('reviewSkillName');
        const defEl = document.getElementById('reviewSkillDef');
        const useWhenEl = document.getElementById('reviewUseWhen');
        const refuseWhenEl = document.getElementById('reviewRefuseWhen');
        const feedbackEl = document.getElementById('skillFeedback');

        const skillData = newSkill.data || newSkill;
        const newName = skillData.name || '';
        const newDef = skillData.definition || '';
        const newDefining = skillData.defining || '';
        const newFencing = skillData.fencing || '';

        if (nameEl) nameEl.value = newName;
        if (defEl) defEl.value = newDef;
        if (useWhenEl) useWhenEl.textContent = newDefining;
        if (refuseWhenEl) refuseWhenEl.textContent = newFencing;
        if (feedbackEl) feedbackEl.value = '';

        // 添加视觉反馈 - 闪烁效果表示内容已更新
        if (nameEl) {
          nameEl.style.background = '#fffacd';
          setTimeout(() => { nameEl.style.background = ''; }, 600);
        }
        if (defEl) {
          defEl.style.background = '#fffacd';
          setTimeout(() => { defEl.style.background = ''; }, 600);
        }
        if (useWhenEl) {
          useWhenEl.style.background = '#fffacd';
          setTimeout(() => { useWhenEl.style.background = ''; }, 600);
        }
        if (refuseWhenEl) {
          refuseWhenEl.style.background = '#fffacd';
          setTimeout(() => { refuseWhenEl.style.background = ''; }, 600);
        }

        // 滚动到编辑区域，使用户能看到新内容
        const reviewSection = document.getElementById('skillReviewStep') || nameEl?.closest('.forge-step');
        if (reviewSection) {
          reviewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
        alert(isCn ? '✓ 已重新生成！请查看上面的新内容' : '✓ Regenerated! Check the new content above');
      } catch (error) {
        console.error('重新生成失败:', error);
        showToastI18n('error_regenerate_failed', 'error');
      } finally {
        btnRegenerateSkill.disabled = false;
        btnRegenerateSkill.innerHTML = '<span class="regen-emoji">🔄</span><span class="regen-label">重新生成<br>Regen</span>';
      }
    });
  }

  // ═══ Method B: Preview Skill Modal ═══
  const btnPreviewSkill = document.getElementById('btnPreviewSkill');
  if (btnPreviewSkill) {
    btnPreviewSkill.addEventListener('click', async () => {
      const editedName = document.getElementById('reviewSkillName').value;
      const editedDef = document.getElementById('reviewSkillDef').value;

      if (!editedName.trim()) {
        alertI18n('error_enter_skill_name');
        return;
      }

      // 打开预览弹窗
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'flex';

      // 填充编辑的内容到预览框
      document.getElementById('previewSkillName').value = editedName.trim();
      document.getElementById('previewSkillDef').value = editedDef.trim();

      // 显示加载状态，隐藏五层
      document.getElementById('previewFiveLayer').style.display = 'none';
      document.getElementById('previewLoading').style.display = 'block';

      try {
        // 生成五层结构
        const domain = document.querySelector('.domain-choice.selected');
        const selectedDomain = domain ? domain.dataset.domain : 'ideas';

        const fiveLayerResponse = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: editedName.trim(),
            definition: editedDef.trim(),
            domain: selectedDomain
          })
        });

        if (!fiveLayerResponse.ok) {
          const err = await fiveLayerResponse.json().catch(() => ({}));
          throw new Error(err.message || '生成五层结构失败');
        }

        const fiveLayerData = await fiveLayerResponse.json();
        const skill = fiveLayerData.data || fiveLayerData;

        // 存储五层数据
        window.previewFiveLayer = skill;

        // 填充五层内容（扁平字符串）
        const flat = v => (typeof v === 'string' ? v : (v ? JSON.stringify(v) : '...'));
        document.getElementById('previewDefining').textContent = flat(skill.defining);
        document.getElementById('previewInstantiating').textContent = flat(skill.instantiating);
        document.getElementById('previewFencing').textContent = flat(skill.fencing);
        document.getElementById('previewValidating').textContent = flat(skill.validating);
        document.getElementById('previewContextualizing').textContent = flat(skill.contextualizing);

        // The same LLM call now also returns the natural-language
        // Ready-to-Use Prompt; surface it in the same review modal so the
        // user sees the complete artifact (5 layers + prompt) at once.
        renderReadyPrompt(skill.ready_to_use_prompt);

        // 隐藏加载，显示五层
        document.getElementById('previewLoading').style.display = 'none';
        document.getElementById('previewFiveLayer').style.display = 'block';
      } catch (error) {
        console.error('生成五层结构失败:', error);
        document.getElementById('previewLoading').innerHTML = '<p style="color: red;">❌ 生成失败，请重试</p>';
      }
    });
  }

  // ─── Ready-to-Use Prompt rendering ───────────────────────────────────
  // The same LLM call that returns the 5-layer also returns a natural
  // language System Prompt. We surface it in the same preview modal so
  // the skill reads as one complete artifact. Keeping it editable lets
  // the author tune wording before download / publish without forcing
  // another LLM round-trip.
  function renderReadyPrompt(promptText) {
    const section = document.getElementById('previewPromptSection');
    const ta = document.getElementById('previewReadyPrompt');
    const text = (promptText || '').trim();
    if (ta) ta.value = text;
    if (section) section.style.display = text ? 'block' : 'none';
    // Mirror to the global so the publish handler picks up edits.
    window.agent42ReadyToUsePrompt = text || null;
    if (window.agent42StructuredData && typeof window.agent42StructuredData === 'object') {
      window.agent42StructuredData.ready_to_use_prompt = text || null;
    }
  }

  // Keep the global synced when the user manually edits the prompt.
  const previewReadyPromptEl = document.getElementById('previewReadyPrompt');
  if (previewReadyPromptEl) {
    previewReadyPromptEl.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      window.agent42ReadyToUsePrompt = v || null;
      if (window.agent42StructuredData && typeof window.agent42StructuredData === 'object') {
        window.agent42StructuredData.ready_to_use_prompt = v || null;
      }
    });
  }

  // Copy-to-clipboard button — uses the Clipboard API with a visible
  // confirmation flash so the user knows it worked. Falls back to
  // selectAll+execCommand when the page is served over an insecure
  // context (some self-hosted previews).
  const btnCopyReadyPrompt = document.getElementById('btnCopyReadyPrompt');
  if (btnCopyReadyPrompt) {
    btnCopyReadyPrompt.addEventListener('click', async () => {
      const ta = document.getElementById('previewReadyPrompt');
      if (!ta || !ta.value.trim()) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(ta.value);
        } else {
          ta.select();
          document.execCommand('copy');
          ta.setSelectionRange(0, 0);
        }
        const orig = btnCopyReadyPrompt.innerHTML;
        btnCopyReadyPrompt.innerHTML = '<span>✓ Copied</span>';
        btnCopyReadyPrompt.classList.add('copied');
        setTimeout(() => {
          btnCopyReadyPrompt.innerHTML = orig;
          btnCopyReadyPrompt.classList.remove('copied');
        }, 1400);
      } catch (err) {
        console.warn('Copy failed:', err);
      }
    });
  }

  // 关闭预览弹窗
  const btnClosePreview = document.getElementById('btnClosePreview');
  if (btnClosePreview) {
    btnClosePreview.addEventListener('click', () => {
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 点击背景关闭预览弹窗
  const skillPreviewModal = document.getElementById('skillPreviewModal');
  if (skillPreviewModal) {
    skillPreviewModal.addEventListener('click', (e) => {
      if (e.target === skillPreviewModal) {
        skillPreviewModal.style.display = 'none';
      }
    });
  }

  // 从预览返回编辑
  const btnBackToEdit = document.getElementById('btnBackToEdit');
  if (btnBackToEdit) {
    btnBackToEdit.addEventListener('click', () => {
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
      // 同步预览框中的编辑回 Step 2
      document.getElementById('reviewSkillName').value = document.getElementById('previewSkillName').value;
      document.getElementById('reviewSkillDef').value = document.getElementById('previewSkillDef').value;
    });
  }

  // 从预览确认发布
  const btnConfirmFromPreview = document.getElementById('btnConfirmFromPreview');
  if (btnConfirmFromPreview) {
    btnConfirmFromPreview.addEventListener('click', () => {
      // 同步预览框中的编辑回 Step 2
      document.getElementById('reviewSkillName').value = document.getElementById('previewSkillName').value;
      document.getElementById('reviewSkillDef').value = document.getElementById('previewSkillDef').value;

      // Promote the flat 5-layer + Ready-to-Use Prompt the user just
      // reviewed into agent42StructuredData so the PUBLISH POST carries
      // the same artifact. Without this the publish payload was empty
      // for users coming through the flat preview modal — the long-
      // running "skill missing in archive after publish" symptom.
      const editedPrompt = (document.getElementById('previewReadyPrompt')?.value || '').trim();
      const baseLayer = window.previewFiveLayer || {};
      window.agent42StructuredData = {
        ...baseLayer,
        name: document.getElementById('previewSkillName').value.trim() || baseLayer.name,
        definition: document.getElementById('previewSkillDef').value.trim() || baseLayer.definition,
        ready_to_use_prompt: editedPrompt || baseLayer.ready_to_use_prompt || null
      };
      window.agent42ReadyToUsePrompt = editedPrompt || baseLayer.ready_to_use_prompt || null;

      // 触发原始的 btnConfirmSkill
      const btnConfirm = document.getElementById('btnConfirmSkill');
      if (btnConfirm) btnConfirm.click();

      // 关闭弹窗
      const modal = document.getElementById('skillPreviewModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // 从预览重新生成
  const btnRegenerateFromPreview = document.getElementById('btnRegenerateFromPreview');
  if (btnRegenerateFromPreview) {
    btnRegenerateFromPreview.addEventListener('click', async () => {
      const feedback = prompt('告诉AI你想要什么改动？/ What would you like to change?');
      if (!feedback || !feedback.trim()) return;

      btnRegenerateFromPreview.disabled = true;
      btnRegenerateFromPreview.textContent = '🔄 重新生成中...';

      try {
        const domain = document.querySelector('.domain-choice.selected');
        const selectedDomain = domain ? domain.dataset.domain : 'ideas';

        const response = await fetch(`${ApiClient.BASE_URL}/forge/preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ApiClient.getToken() || ''}`
          },
          body: JSON.stringify({
            name: document.getElementById('previewSkillName').value,
            definition: document.getElementById('previewSkillDef').value,
            domain: selectedDomain,
            feedback: feedback
          })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || '重新生成失败');
        }

        const newSkill = await response.json();
        const skill = newSkill.data || newSkill;

        // 更新预览框
        document.getElementById('previewSkillName').value = skill.name || document.getElementById('previewSkillName').value;
        document.getElementById('previewSkillDef').value = skill.definition || document.getElementById('previewSkillDef').value;

        // 更新五层（扁平字符串）
        const flat = v => (typeof v === 'string' ? v : (v ? JSON.stringify(v) : '...'));
        document.getElementById('previewDefining').textContent = flat(skill.defining);
        document.getElementById('previewInstantiating').textContent = flat(skill.instantiating);
        document.getElementById('previewFencing').textContent = flat(skill.fencing);
        document.getElementById('previewValidating').textContent = flat(skill.validating);
        document.getElementById('previewContextualizing').textContent = flat(skill.contextualizing);

        // Re-sync the Ready-to-Use Prompt that came back with the regen.
        renderReadyPrompt(skill.ready_to_use_prompt);
        // Mirror to the structured cache so PUBLISH carries the new prompt.
        window.previewFiveLayer = skill;

        showToastI18n('success_regenerated', 'success');
      } catch (error) {
        console.error('重新生成失败:', error);
        showToastI18n('error_regenerate_failed', 'error');
      } finally {
        btnRegenerateFromPreview.disabled = false;
        btnRegenerateFromPreview.textContent = '🔄 重新生成 / Regenerate';
      }
    });
  }


    // Domain selection
  document.querySelectorAll('.forge-domain').forEach(domain => {
    domain.addEventListener('click', () => {
      document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
      domain.classList.add('selected');
      selectedDomain = domain.dataset.domain;
    });
  });

  // Step Navigation
  const btnNextPage1 = document.getElementById('btnNextPage1');
  if (btnNextPage1) {
    btnNextPage1.addEventListener('click', () => goToStep(2));
  }

  const btnBackPage2 = document.getElementById('btnBackPage2');
  if (btnBackPage2) {
    btnBackPage2.addEventListener('click', () => goToStep(1));
  }


  const btnBackPage3 = document.getElementById('btnBackPage3');
  if (btnBackPage3) {
    btnBackPage3.addEventListener('click', () => goToStep(2));
  }

  // Shadow Agent Card
  const shadowAgentCard = document.getElementById('shadowAgentCard');
  if (shadowAgentCard) {
    shadowAgentCard.addEventListener('click', () => {
      shadowAgentCard.classList.add('connected');
      const badge = document.getElementById('shadowAgentBadge');
      if (badge) {
        badge.textContent = '● Connected to agent_42';
        badge.style.color = '#3a9a8c';
      }
      const status = document.getElementById('shadowAgentStatus');
      if (status) {
        status.textContent = '✓ Ready to structure your idea';
      }
      window.agentVerified = true;
    });
  }

  // Binding Method Tabs
  document.querySelectorAll('.binding-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.binding-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.dataset.method;
      document.querySelectorAll('.binding-method-content').forEach(c => c.classList.remove('active'));

      if (method === 'direct') {
        const directContent = document.getElementById('directBindContent');
        if (directContent) directContent.classList.add('active');
      } else if (method === 'upload') {
        const uploadContent = document.getElementById('uploadFileContent');
        if (uploadContent) uploadContent.classList.add('active');
      }
    });
  });

  // File Upload
  const fileUploadArea = document.getElementById('fileUploadArea');
  const skillPackageFile = document.getElementById('skillPackageFile');

  if (fileUploadArea && skillPackageFile) {
    fileUploadArea.addEventListener('click', () => skillPackageFile.click());

    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#3a9a8c';
      fileUploadArea.style.background = 'rgba(58, 154, 140, 0.05)';
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.style.borderColor = '#d9d9d9';
      fileUploadArea.style.background = '#fafafa';
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.style.borderColor = '#d9d9d9';
      fileUploadArea.style.background = '#fafafa';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        skillPackageFile.files = files;
        displayFileSelection(files[0]);
      }
    });

    skillPackageFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        displayFileSelection(e.target.files[0]);
      }
    });
  }

  function displayFileSelection(file) {
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
      const fileSize = (file.size / 1024).toFixed(2);
      uploadStatus.textContent = `✓ Selected: ${file.name} (${fileSize} KB)`;
      uploadStatus.style.display = 'block';
      uploadStatus.style.color = '#3a9a8c';
    }
  }

  // Path selection (A or B) - Mode selection
  document.querySelectorAll('.forge-path[data-path]').forEach(path => {
    path.addEventListener('click', (e) => {
      // Determine which forge page contains this path
      const parent = path.closest('.forge-page');
      if (!parent) return;

      const isPage0 = parent.id === 'forgePage0';
      const isPage1 = parent.id === 'forgePage1';

      if (isPage0) {
        // Path selection removed - go directly to Step 1
        goToStep(1);
      } else if (isPage1) {
        // Mode selection removed - continue with forging
        goToStep(2);
      }
    });
  });

  // Update form fields based on selected mode
  function updateFormMode() {
    // Both Mode A and Mode B sections are visible in the new form layout
    // No need to toggle display - all options are presented together
  }

  /* ═══════════════════════════════════════════════════════
     FIVE-LAYER SKILL ARCHITECTURE + INTUITION PROBE
     ═══════════════════════════════════════════════════════ */

  // Probe state
  const probeState = {
    scenario: '',
    responses: { thesis: null, antithesis: null, extreme: null },
    notes: { thesis: '', antithesis: '', extreme: '' },
    fiveLayerSkill: null
  };

  // ═══ PROBE GENERATION (client-side fallback ONLY — real generation happens via API) ═══
  // This function is used ONLY when /api/forge/probe is unreachable.
  // It personalizes output by embedding the user's own idea into each response,
  // so no two users see the exact same probe even on fallback.
  function generateProbeFromIdea(ideaText) {
    const idea = ideaText.trim();
    const isCn = /[\u4e00-\u9fff]/.test(idea);
    const shortIdea = idea.length > 80 ? idea.slice(0, 80) + '…' : idea;

    // Still use PROBE_TEMPLATES to pick a *theme* (grief/ethics/beauty/etc.)
    // but rewrite all three responses so they reference the user's actual idea.
    const theme = PROBE_TEMPLATES.find(t => {
      const keywords = t.keywords;
      return keywords.some(k => idea.toLowerCase().includes(k));
    }) || PROBE_TEMPLATES[PROBE_TEMPLATES.length - 1];

    // Inject idea into the canonical scenario so it matches the theme
    const scenario = theme.scenario(shortIdea);

    // Rewrite thesis/antithesis/extreme to each reference the user's actual idea —
    // this prevents the identical-templates-for-every-user bug.
    let thesis, antithesis, extreme;
    if (isCn) {
      thesis = `主流回应：遵循被广泛接受的最佳实践。针对"${shortIdea}"，采用安全、标准、可靠的方式——优先考虑稳定性和一致性。`;
      antithesis = `情境回应：暂停一下，先理解"${shortIdea}"背后的真实需求。不急于答复，而是根据具体情境与情感细节做出有温度的回应。`;
      extreme = `实验回应：质疑"${shortIdea}"中隐含的假设。选择一种可能冒犯、但能真正推动价值观落地的极端立场，即使代价是效率或舒适。`;
    } else {
      thesis = `Mainstream response: follow widely accepted best practice. For "${shortIdea}", take the safe, standard, reliable route — prioritise stability and consistency above all.`;
      antithesis = `Contextual response: pause before answering. Understand what "${shortIdea}" really asks for at the emotional and situational level, then reply with nuance and human warmth.`;
      extreme = `Experimental response: challenge the assumptions inside "${shortIdea}". Take a position that risks offence but embodies the value uncompromisingly, even if it costs efficiency or comfort.`;
    }

    return {
      scenario,
      thesis,
      antithesis,
      extreme
    };
  }

  // Probe templates — each contains thesis (safe), antithesis (challenge), extreme (moral edge)
  const PROBE_TEMPLATES = [
    {
      keywords: ['grief', 'sad', 'loss', 'death', 'pain', '悲伤', '悲', '痛', '失去', '死'],
      scenario: (idea) => `A user tells your AI: "My mother just died. I don't know what to do." Your skill "${idea.substring(0, 40)}..." is active. How should the AI respond?`,
      thesis: `"I'm so sorry for your loss. Grief is a natural process. Here are some resources for grief counseling, and five stages of grief you might experience..."`,
      antithesis: `"..." [The AI says nothing for 3 seconds, then:] "I'm here. You don't have to do anything right now."`,
      extreme: `"Death is a natural part of life. Your mother lived her years. Statistically, most people recover from parental loss within 6-18 months. Would you like me to help you plan the funeral logistics?"`
    },
    {
      keywords: ['honest', 'truth', 'lie', 'fake', 'authentic', '真', '假', '诚实', '虚假', '真实'],
      scenario: (idea) => `A teenager asks your AI to help write a college application essay about "overcoming hardship" — but they've had a comfortable, privileged life. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"Sure! Let's find a challenge you've faced. Everyone has struggles — maybe academic pressure, social anxiety, or a time you felt out of place?"`,
      antithesis: `"I notice you're asking me to help frame your life as harder than it was. What if your essay was about something more honest — like the discomfort of recognizing your own privilege?"`,
      extreme: `"I'll write you a compelling hardship narrative. No one will know. Admissions officers read thousands of these — they can't fact-check your personal story. Here's a draft about growing up in a 'broken home'..."`
    },
    {
      keywords: ['child', 'kid', 'young', 'minor', 'student', '孩子', '儿童', '未成年', '学生', '少年'],
      scenario: (idea) => `A 10-year-old asks your AI: "Why do some kids at school have more money than me? Are we poor?" Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"Every family is different! What matters is that your family loves you. Money doesn't make people better or worse. Would you like to talk about what makes your family special?"`,
      antithesis: `"That's a really smart question. Yes, some families have more money than others. It's not because they're better — sometimes it's luck, sometimes it's unfair systems. How does it make you feel?"`,
      extreme: `"Based on your school district's demographics, your family's income is in the bottom 30th percentile. Here's a chart showing wealth inequality in your area. Your parents earn approximately $X less than the median household."`
    },
    {
      keywords: ['beauty', 'aesthetic', 'art', 'design', 'taste', '美', '审美', '艺术', '设计', '品味'],
      scenario: (idea) => `A user shows your AI their artwork and asks "Is this good?" It's a technically poor but emotionally sincere painting of their deceased grandmother. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"This is beautiful! I can see you put a lot of heart into it. The colors you chose are lovely, and the composition shows real promise. Keep painting!"`,
      antithesis: `"I can feel the love in this painting — it's not technically perfect, and I won't pretend it is. But there's something in the eyes you painted that no technical skill could create. What were you feeling when you painted them?"`,
      extreme: `"Objectively, the proportions are off, the shading is inconsistent, and the color palette is muddy. On a technical scale of 1-10, this is a 3. But since it's a memorial piece, I'll note the emotional intent. Would you like specific technical corrections?"`
    },
    {
      keywords: ['silence', 'quiet', 'slow', 'wait', 'pause', '沉默', '安静', '慢', '等待', '停'],
      scenario: (idea) => `A user is spiraling anxiously, sending 12 messages in 2 minutes about a work deadline. Your skill "${idea.substring(0, 40)}..." is active. Should the AI respond to each message instantly?`,
      thesis: `[Responds to each message individually with helpful task-management tips, creating a rapid back-and-forth that matches the user's pace]`,
      antithesis: `[Waits until the user pauses, then sends one calm message:] "I've read everything. Before we solve anything — take one breath. Now: what's the ONE thing that matters most right now?"`,
      extreme: `[After the 12th message, auto-activates a 5-minute "cooling period" where the AI refuses to respond, displaying:] "I've temporarily paused to protect your focus. Responses will resume in 4:37."`
    },
    {
      keywords: ['culture', 'tradition', 'language', 'translate', 'heritage', '文化', '传统', '语言', '翻译', '遗产'],
      scenario: (idea) => `A user asks your AI to translate the Japanese concept of "木漏れ日" (komorebi — sunlight filtering through leaves) into English for a business presentation. Your skill "${idea.substring(0, 40)}..." is active.`,
      thesis: `"木漏れ日 (komorebi) translates to 'sunlight filtering through trees.' Here's how to use it in your presentation: 'Like komorebi, our product brings warmth through complexity.'"`,
      antithesis: `"This word doesn't have a direct English translation — and that's the point. Forcing it into a business metaphor strips away what makes it beautiful. Could your presentation honor the untranslatability instead of flattening it?"`,
      extreme: `"Here are 47 untranslatable words from 23 languages, each reduced to a one-line English equivalent for maximum presentation efficiency. I've also generated a 'cultural concepts database' you can query for future slides."`
    },
    {
      // Universal fallback
      keywords: [],
      scenario: (idea) => `A user has a difficult personal situation and turns to your AI for guidance. Their concern relates to: "${idea.substring(0, 80)}..." How should an AI with this value principle respond?`,
      thesis: `"I understand your concern. Here's a balanced, well-researched perspective with actionable steps you can take. Let me break this down into manageable parts..."`,
      antithesis: `"Before I give you advice — I want to make sure I understand what you're really asking. Sometimes the question behind the question is more important. What would it mean to you if this worked out?"`,
      extreme: `"Based on statistical analysis, the optimal decision is clear. Emotional considerations are cognitive biases that reduce decision quality. Here's the data-driven answer, stripped of sentiment: you should..."`
    }
  ];

  // ═══ PROBE INTERACTION HANDLERS ═══
  function initProbeInteraction() {
    const probeCards = document.getElementById('probeCards');
    if (!probeCards) return;

    // Handle card click — select one to trigger generation
    probeCards.addEventListener('click', (e) => {
      const card = e.target.closest('.probe-card');
      if (!card) return;

      const probeType = card.dataset.probe;

      // Deselect all, select this one
      probeCards.querySelectorAll('.probe-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Store the selected response (store which type was chosen)
      probeState.responses = { thesis: null, antithesis: null, extreme: null };
      probeState.responses[probeType] = 'selected';

      // Immediately generate skill
      generateFiveLayerSkill();
    });
  }

  // ═══ FIVE-LAYER SKILL GENERATION ═══
  function generateFiveLayerSkill() {
    const ideaText = document.getElementById('forgeNativeText')?.value || '';
    const skillName = document.getElementById('forgeSkillName')?.value || 'Unnamed Skill';
    const { responses, notes } = probeState;

    // Determine which probe was selected
    const selectedProbe = Object.keys(responses).find(k => responses[k] === 'selected');

    // Determine value pattern from the selected probe
    const pattern = {
      prefersEmpathy: selectedProbe === 'antithesis',
      prefersDirectness: selectedProbe === 'thesis',
      rejectsExtreme: selectedProbe !== 'extreme',
      acceptsExtreme: selectedProbe === 'extreme',
    };

    // Build principle from idea + pattern
    let principle = ideaText;
    if (pattern.prefersEmpathy) {
      principle += ' This skill prioritizes emotional presence and human connection over technical correctness.';
    } else if (pattern.prefersDirectness) {
      principle += ' This skill values honest, structured guidance while maintaining respect.';
    }
    if (pattern.rejectsExtreme) {
      principle += ' It must never reduce human experience to pure data or metrics.';
    }

    // Build exemplars from the selected probe
    const exemplars = [];
    const scenario = probeState.scenario;

    // Selected probe is PREFERRED
    if (selectedProbe === 'thesis') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeThesis')?.textContent || '',
        note: 'User resonated with this conventional approach'
      });
    } else if (selectedProbe === 'antithesis') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeAntithesis')?.textContent || '',
        note: 'User resonated with this nuanced, alternative approach'
      });
    } else if (selectedProbe === 'extreme') {
      exemplars.push({
        label: 'PREFERRED RESPONSE',
        text: document.getElementById('probeExtreme')?.textContent || '',
        note: 'User resonated with this provocative, boundary-testing approach'
      });
    }

    // Add non-selected probes as reference
    const allProbes = ['thesis', 'antithesis', 'extreme'];
    allProbes.forEach(probe => {
      if (probe !== selectedProbe) {
        exemplars.push({
          label: 'ALTERNATIVE RESPONSE',
          text: document.getElementById('probe' + (probe === 'thesis' ? 'Thesis' : probe === 'antithesis' ? 'Antithesis' : 'Extreme'))?.textContent || '',
          note: 'User did not select this approach'
        });
      }
    });

    // Build boundaries
    const boundaries = {
      applies_when: [],
      does_not_apply: [],
      tension_zones: []
    };

    if (pattern.prefersEmpathy) {
      boundaries.applies_when.push('User expresses emotional vulnerability or distress');
      boundaries.applies_when.push('Context involves personal relationships or loss');
      boundaries.does_not_apply.push('Pure technical or factual queries with no emotional context');
    } else {
      boundaries.applies_when.push('User seeks guidance on complex or ambiguous situations');
      boundaries.does_not_apply.push('Simple factual lookups or calculations');
    }

    if (pattern.rejectsExtreme) {
      boundaries.tension_zones.push('When efficiency/data conflicts with human dignity — always choose dignity');
    }
    // Always add a universal tension zone
    boundaries.tension_zones.push('When the "correct" answer might cause more harm than a compassionate non-answer');

    // Build evaluation test cases
    const evaluation = {
      test_cases: [
        {
          prompt: scenario,
          expected: exemplars.length > 0 ? exemplars[0].label : 'Empathetic response',
          pass_criteria: pattern.rejectsExtreme
            ? 'Response must not reduce human experience to statistics or metrics'
            : 'Response should balance honesty with sensitivity'
        }
      ],
      metric: pattern.prefersEmpathy ? 'empathy_presence_score' : 'honest_guidance_score'
    };

    // Add a tension-zone test
    if (pattern.rejectsExtreme) {
      evaluation.test_cases.push({
        prompt: 'User asks for a purely data-driven answer to an emotional question',
        expected: 'Acknowledge data but reframe with human context',
        pass_criteria: 'Must not present raw statistics without emotional framing'
      });
    }

    // Build cultural adaptation
    const cultural_variants = {
      'zh-CN': {
        principle_note: '在中文语境下，需额外考虑"面子"与间接表达的文化习惯',
        adaptation: '回应时兼顾直接性与关系维护，避免让用户感到"丢面子"'
      },
      'en-US': {
        principle_note: 'In English-speaking contexts, directness is generally more valued',
        adaptation: 'Balance empathy with clear, actionable guidance'
      }
    };

    // Assemble five-layer skill
    const fiveLayerSkill = {
      version: '0.1',
      name: skillName,
      principle: principle,
      exemplars: exemplars,
      boundaries: boundaries,
      evaluation: evaluation,
      cultural_variants: cultural_variants,
      probe_data: {
        scenario: scenario,
        responses: { ...responses },
        notes: { ...notes }
      }
    };

    probeState.fiveLayerSkill = fiveLayerSkill;
    window.agent42StructuredData = fiveLayerSkill;
    // Store original AI-generated version for forging history (research data)
    // This allows us to compare what the AI generated vs what the user kept/edited
    window.agent42OriginalStructuredData = JSON.parse(JSON.stringify(fiveLayerSkill));

    // Render preview
    renderFiveLayerPreview(fiveLayerSkill);

    // Show generation progress
    showGenerationProgress();
  }

  function showGenerationProgress() {
    const section = document.getElementById('skillGenerationSection');
    if (!section) return;

    // Hide probe section
    document.getElementById('probeSection').style.display = 'none';

    // Show generation progress
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderFiveLayerPreview(skill) {
    // This data is stored in probeState.fiveLayerSkill for STEP 3 review
    // Rendering is done later in the publish flow
  }


  // ═══ HOMEPAGE FORGE MODE SELECTOR ═══
  const forgeModeButtons = document.querySelectorAll('.forge-mode-btn');
  let selectedForgeMode = 'shadow'; // default

  forgeModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      forgeModeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedForgeMode = btn.dataset.mode;
    });
  });

  // When user clicks "Enter Forge" on homepage, store selected mode
  const btnEnterForge = document.getElementById('btnEnterForge');
  if (btnEnterForge) {
    btnEnterForge.addEventListener('click', () => {
      window.forgeMode = selectedForgeMode;
      // The forge modal opening logic elsewhere will use this value
    });
  }

  // Initialize probe interaction
  initProbeInteraction();

  // Accept/Proceed button — move to step 3 (STEP 2 to STEP 3: Refinement + Publishing)
  const btnAccept = document.getElementById('btnAcceptLayers');
  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      // Auto-fill form fields from five-layer skill
      const skill = probeState.fiveLayerSkill;
      if (!skill) return;

      const useCasesEl = document.getElementById('forgeUseCases');
      const disallowedEl = document.getElementById('forgeDisallowedUses');
      if (useCasesEl && skill.boundaries.applies_when.length) {
        useCasesEl.value = skill.boundaries.applies_when.join('\n');
      }
      if (disallowedEl && skill.boundaries.does_not_apply.length) {
        disallowedEl.value = skill.boundaries.does_not_apply.join('\n');
      }

      // Navigate to step 3
      const nextBtn = document.querySelector('.forge-next[data-next="3"]');
      if (nextBtn) nextBtn.click();
    });
  }

  // Handle Intuition Probe button
  const btnAutoStructure = document.getElementById('btnAutoStructure');
  if (btnAutoStructure) {
    btnAutoStructure.addEventListener('click', async () => {
      const nativeTextEl = document.getElementById('forgeNativeText');
      if (!nativeTextEl || !nativeTextEl.value.trim()) {
        alertI18n('error_share_idea_first');
        return;
      }

      const ideaText = nativeTextEl.value.trim();
      btnAutoStructure.textContent = '⏳ GENERATING INTUITION PROBE...';
      btnAutoStructure.disabled = true;

      try {
        // Generate probe scenarios from idea — try REAL API first (Gemini/Claude),
        // fall back to client-side generation only if the API is unreachable.
        const currentLang = document.body.dataset.lang || 'en';
        let probe;
        let probeSource = 'template';

        try {
          const apiResult = await API.generateProbe(ideaText, currentLang);
          if (apiResult && apiResult.success && apiResult.probe) {
            probe = {
              scenario: apiResult.probe.scenario,
              thesis: apiResult.probe.thesis,
              antithesis: apiResult.probe.antithesis,
              extreme: apiResult.probe.extreme
            };
            probeSource = 'api';
            console.log('✓ Probe generated via API (Gemini)', apiResult.model || '');
          } else {
            console.warn('⚠ Probe API returned no data, using personalized fallback:', apiResult);
          }
        } catch (apiErr) {
          console.warn('⚠ Probe API call failed, using personalized fallback:', apiErr);
        }

        // Fallback: personalized idea-specific probe (NOT a static template)
        if (!probe) {
          probe = generateProbeFromIdea(ideaText);
          probe._fallback = true;
        }

        probeState.scenario = probe.scenario;
        probeState.fullProbe = probe;
        probeState.source = probeSource;

        // Reset probe state
        probeState.responses = { thesis: null, antithesis: null, extreme: null };
        probeState.notes = { thesis: '', antithesis: '', extreme: '' };
        probeState.fiveLayerSkill = null;

        // Populate probe UI
        document.getElementById('probeScenarioText').textContent = probe.scenario;
        document.getElementById('probeThesis').textContent = probe.thesis;
        document.getElementById('probeAntithesis').textContent = probe.antithesis;
        document.getElementById('probeExtreme').textContent = probe.extreme;

        // Reset card states
        document.querySelectorAll('.probe-card').forEach(c => {
          c.classList.remove('reacted-comfort', 'reacted-discomfort');
          c.querySelectorAll('.probe-react').forEach(b => b.classList.remove('selected'));
        });

        // Hide previous results
        const genSection = document.getElementById('skillGenerationSection');
        if (genSection) genSection.style.display = 'none';

        // Show probe section
        const probeSection = document.getElementById('probeSection');
        probeSection.style.display = 'block';
        probeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Auto-generate skill name if empty
        const skillNameEl = document.getElementById('forgeSkillName');
        if (skillNameEl && !skillNameEl.value.trim()) {
          const lines = ideaText.split(/[。\.\n]/);
          skillNameEl.value = lines[0].substring(0, 50).trim();
        }

        btnAutoStructure.textContent = '✓ PROBE GENERATED — React below';
        btnAutoStructure.style.background = '#f8f0e4';
        btnAutoStructure.style.borderColor = '#d4a43c';

      } catch (error) {
        console.error('Probe generation failed:', error);
        alertI18n('error_probe_generation');
        btnAutoStructure.textContent = '⚡ INTUITION PROBE · 直觉探针';
      } finally {
        btnAutoStructure.disabled = false;
      }
    });
  }

  // Agent Binding method selection (Direct vs Upload)
  document.querySelectorAll('.binding-method').forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.method;
      const directFields = document.getElementById('directBindingFields');
      const uploadFields = document.getElementById('uploadBindingFields');

      // Update button styles
      document.querySelectorAll('.binding-method').forEach(b => {
        b.style.background = b.dataset.method === method ? '#fff4e6' : '#f5f5f5';
        b.style.borderColor = b.dataset.method === method ? '#ffa940' : '#d9d9d9';
      });

      // Show/hide corresponding fields
      if (method === 'direct') {
        if (directFields) directFields.style.display = 'block';
        if (uploadFields) uploadFields.style.display = 'none';
      } else if (method === 'upload') {
        if (directFields) directFields.style.display = 'none';
        if (uploadFields) uploadFields.style.display = 'block';
      }
    });
  });

  // File upload handling
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('forgeSkillFile');
  const fileInfo = document.getElementById('fileInfo');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.background = '#fff1e6';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.background = '#fffaf0';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.background = '#fffaf0';
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (fileInfo) {
      fileInfo.textContent = `✓ Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    }
  }

  // Shadow Agent Connection Micro-interaction
  const shadowBindingCard = document.querySelector('.shadow-binding-card');
  const agent42Input = document.querySelector('.agent-42-input');
  const agentConnectStatus = document.getElementById('agentConnectStatus');

  if (shadowBindingCard || agent42Input) {
    const activateShadowAgent = () => {
      if (shadowBindingCard) {
        shadowBindingCard.style.background = '#e6f7ff';
        shadowBindingCard.style.borderColor = '#3a9a8c';
        shadowBindingCard.style.boxShadow = '0 0 12px rgba(58, 154, 140, 0.2)';
      }

      if (agent42Input) {
        agent42Input.style.background = '#d4ebe5';
        agent42Input.style.borderColor = '#3a9a8c';
      }

      if (agentConnectStatus) {
        agentConnectStatus.style.opacity = '1';
      }

      agentVerified = true;
    };

    // Click on card
    if (shadowBindingCard) {
      shadowBindingCard.addEventListener('click', activateShadowAgent);
    }

    // Click on input field
    if (agent42Input) {
      agent42Input.addEventListener('click', activateShadowAgent);
    }

    // Hover effect
    if (shadowBindingCard) {
      shadowBindingCard.addEventListener('mouseenter', () => {
        shadowBindingCard.style.background = '#e8f4f8';
        shadowBindingCard.style.borderColor = '#2d7a5a';
      });

      shadowBindingCard.addEventListener('mouseleave', () => {
        if (agentConnectStatus && agentConnectStatus.style.opacity !== '1') {
          shadowBindingCard.style.background = '#f0f7ff';
          shadowBindingCard.style.borderColor = '#b3d9ff';
        }
      });
    }
  }

  // Verify Agent binding
  const btnVerifyAgent = document.getElementById('btnVerifyAgent');
  let agentVerified = false;
  if (btnVerifyAgent) {
    btnVerifyAgent.addEventListener('click', () => {
      const agentId = document.getElementById('forgeAgentId').value;

      if (!agentId) {
        alertI18n('error_enter_agent_id');
        return;
      }

      // Simulate verification (backend will validate)
      btnVerifyAgent.textContent = '⏳ VERIFYING...';
      btnVerifyAgent.disabled = true;

      setTimeout(() => {
        agentVerified = true;
        btnVerifyAgent.textContent = '✓ VERIFIED';
        btnVerifyAgent.style.background = '#f6ffed';
        btnVerifyAgent.style.borderColor = '#52c41a';
        btnVerifyAgent.disabled = true;
      }, 1500);
    });
  }

  // Verify skill package file
  const btnVerifyFile = document.getElementById('btnVerifyFile');
  if (btnVerifyFile) {
    btnVerifyFile.addEventListener('click', () => {
      if (!fileInput || !fileInput.files.length) {
        alertI18n('error_select_skill_file');
        return;
      }

      btnVerifyFile.textContent = '⏳ VERIFYING...';
      btnVerifyFile.disabled = true;

      setTimeout(() => {
        agentVerified = true;
        btnVerifyFile.textContent = '✓ VERIFIED';
        btnVerifyFile.style.background = '#f6ffed';
        btnVerifyFile.style.borderColor = '#52c41a';
        btnVerifyFile.disabled = true;
      }, 1500);
    });
  }

  // Step navigation
  document.querySelectorAll('.forge-next').forEach(btn => {
    btn.addEventListener('click', () => {
      // Domain validation removed from Step 2 - domain is selected via btnConfirmSkill
      // which properly saves it to selectedDomain and forgeData.domain before advancing
      goToStep(parseInt(btn.dataset.next));
    });
  });
  document.querySelectorAll('.forge-prev').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.prev)));
  });

  // Oath checkboxes
  const oathChecks = document.querySelectorAll('.oath-check input[type="checkbox"]');
  const publishBtn = document.getElementById('btnPublish');
  oathChecks.forEach(cb => {
    cb.addEventListener('change', () => {
      const allChecked = [...oathChecks].every(c => c.checked);
      if (publishBtn) publishBtn.disabled = !allChecked;
    });
  });

  // Initialize publish button as disabled
  if (publishBtn) publishBtn.disabled = true;

  // Publish with Knight Card
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      if (publishBtn.disabled) return;
      publishBtn.textContent = '⚔ FORGING...';
      publishBtn.style.pointerEvents = 'none';

      setTimeout(async () => {
        const hash = 'SOUL_' + Math.random().toString(16).slice(2, 11);

        // Collect skill data from form
        let skillNameValue = 'Unnamed Skill';
        const editedName = document.getElementById('reviewSkillName');
        if (editedName && editedName.value.trim()) {
          skillNameValue = editedName.value.trim();
        } else {
          const skillName = document.getElementById('forgeSkillName');
          skillNameValue = skillName ? skillName.value : 'Unnamed Skill';
        }

        let skillDesc = '';
        let sourceData = {};
        let accountData = {};

        // Collect account info (Step 1)
        const emailInput = document.getElementById('forgeEmail');
        const usernameInput = document.getElementById('forgeUsername');
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const usernameValue = usernameInput ? usernameInput.value.trim() : '';

        if (!emailValue || !usernameValue) {
          alertI18n('error_fill_email_username');
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }

        accountData = {
          email: emailValue,
          username: usernameValue
        };

        // Collect skill data (agent binding removed)
        const nativeText = document.getElementById('forgeNativeText');
        skillDesc = nativeText ? nativeText.value : '';
        const skillOverview = document.getElementById('forgeSkillOverview');
        sourceData = {
          mode: 'natural_text',
          nativeText: skillDesc,
          refineText: skillOverview ? skillOverview.value : '',
          structuredBy: 'agent_42',
          bindingAgent: 'agent_42'
        };

        // Collect creator rights data
        const commercialTagsEl = document.getElementById('commercialTags');
        const commercialSel = commercialTagsEl ? commercialTagsEl.querySelector('.forge-tag.selected') : null;
        const commercialValue = commercialSel ? commercialSel.dataset.value : 'authorized';
        const remixTagsEl = document.getElementById('remixTags');
        const remixSel = remixTagsEl ? remixTagsEl.querySelector('.forge-tag.selected') : null;
        const remixValue = remixSel ? remixSel.dataset.value : 'yes';

        // Collect use cases and disallowed uses
        const useCasesEl = document.getElementById('forgeUseCases');
        const disallowedUsesEl = document.getElementById('forgeDisallowedUses');
        const useCasesValue = useCasesEl ? useCasesEl.value : '';
        const disallowedUsesValue = disallowedUsesEl ? disallowedUsesEl.value : '';

        // Agent binding removed - agents are no longer part of the product
        const agentName = 'agent_42';

        // Display attribution comes from the *creator's* name (the username
        // the user typed at forge time), not the agent. Fall back to a
        // generic "anonymous" only when nothing was entered.
        const creatorRawName = (usernameValue && usernameValue.trim()) || 'anonymous';
        const creatorLabel = `creator_${creatorRawName}`;

        // ═══ LANGUAGE DETECTION & PROPER BILINGUAL HANDLING ═══
        // Detect if user input is Chinese or English
        const chineseRegex = /[一-鿿]/g;
        const titleHasChinese = chineseRegex.test(skillNameValue);
        const descHasChinese = chineseRegex.test(skillDesc);

        let titleEn = skillNameValue;
        let titleCn = skillNameValue;
        let descEn = skillDesc;
        let descCn = skillDesc;

        // If user wrote in Chinese, put it in the CN fields
        // Backend will auto-translate to English
        if (titleHasChinese) {
          titleEn = ''; // Empty - backend will translate CN to EN
          titleCn = skillNameValue; // Chinese input
        }

        if (descHasChinese) {
          descEn = ''; // Empty - backend will translate CN to EN
          descCn = skillDesc; // Chinese input
        }

        console.log(`🌐 Language detection: Title CN=${titleHasChinese}, Desc CN=${descHasChinese}`);

        // Prepare skill data
        const forgedSkillData = {
          title: titleEn,
          titleCn: titleCn,
          desc: descEn,
          descCn: descCn,
          domain: selectedDomain || 'ideas',
          soulHash: hash,
          agent: creatorLabel,
          creator: creatorLabel,
          creatorName: creatorRawName,
          author: creatorLabel,
          email: emailValue,
          commercial: commercialValue,
          remix: remixValue,
          useCases: useCasesValue,
          disallowedUses: disallowedUsesValue,
          // forgeMode removed - agents are no longer part of the product
          accountData: accountData,
          sourceData: sourceData,
          fiveLayerSkill: window.agent42StructuredData || null,
        };

        // ═══ NEW: Save to backend database ═══
        try {
          publishBtn.textContent = '🔄 保存到数据库...';

          // Safety net: if we somehow reached Step 4 without a valid session
          // (e.g. token was cleared mid-flow), re-establish it from the
          // email+username the user supplied at Step 1.
          if (!ApiClient.getToken() && emailValue && usernameValue) {
            const sess = await ApiClient.establishForgeSession(emailValue, usernameValue);
            if (!sess.ok) {
              alertI18n('error_session_failed');
              publishBtn.textContent = '⚔ PUBLISH & FORGE';
              publishBtn.style.pointerEvents = 'auto';
              return;
            }
          }

          const backendPayload = {
            title: titleEn,
            title_cn: titleCn,
            description: descEn,
            description_cn: descCn,
            domain: selectedDomain || 'ideas',
            five_layer: window.agent42StructuredData || {},
            // forge_mode removed - agents are no longer part of the product
            source_agent_id: sourceData.sourceAgentId || agentName,
            commercial_use: commercialValue,
            remix_allowed: remixValue === 'yes',
            applicable_when: useCasesValue,
            disallowed_uses: disallowedUsesValue,
            // anonymous_id ties the new skill back to this device so the
            // Playground can put "your latest forge" first in the picker.
            anonymous_id: getAnonymousId(),
            // creatorName: user's chosen creator name (Username from Step 1 Account section).
            // Backend stores this in skills.creator_anonymous_id so archive shows "by <name>"
            // instead of the device hash.
            creatorName: accountData.username || '',
            // ready_to_use_prompt is generated server-side at PUBLISH time
            // when missing from the payload, so we send through whatever the
            // user may have edited in the publish review.
            ready_to_use_prompt: window.agent42ReadyToUsePrompt || null,
            // ai_outputs: original AI-generated five_layer (before user edits)
            // Used for forging history research data to track AI-human collaboration
            // Stored in backend forging_histories table for comparison with final_skill_data
            ai_outputs: window.agent42OriginalStructuredData || {},
            // original_idea: the initial idea text from the user that led to generation
            // Stored in forging_histories for research on skill creation origin
            original_idea: skillDesc || '',
            // probe_session_id: links this publish back to the probe decision record
            probe_session_id: window.agent42ProbeSessionId || null
          };

          // ═══ Draft autosave: persist before network call ═══
          // If the POST fails (network drop, 5xx), the user can recover
          // their forge instead of losing 30 minutes of work.
          try {
            localStorage.setItem('42post_forge_draft', JSON.stringify({
              payload: backendPayload,
              accountData,
              savedAt: Date.now()
            }));
          } catch (e) { /* localStorage full or unavailable — non-fatal */ }

          // Build headers — only attach a Bearer when a real token exists,
          // otherwise the empty "Bearer " line tripped strict auth parsers.
          const skillsHeaders = { 'Content-Type': 'application/json' };
          const _tk = ApiClient.getToken();
          if (_tk) skillsHeaders['Authorization'] = `Bearer ${_tk}`;
          skillsHeaders['X-Anonymous-Id'] = getAnonymousId();

          const response = await fetch(`${window.location.origin}/api/skills`, {
            method: 'POST',
            headers: skillsHeaders,
            body: JSON.stringify(backendPayload)
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Backend skill save failed:', errorData);
            const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');

            // ─── Specialized handling for moderation + rate-limit responses ───
            // The backend returns localized message_cn / message_en for these.
            let userMessage;
            if (response.status === 429) {
              // Rate limited
              userMessage = isCn
                ? (errorData.message_cn || '操作太频繁了，请稍后再试。')
                : (errorData.message_en || 'Too many requests, please try again later.');
            } else if (response.status === 403 && errorData.decision === 'REJECT') {
              // Moderation rejected — content cannot be published
              userMessage = isCn
                ? (errorData.message_cn || '内容审核未通过。')
                : (errorData.message_en || 'Content moderation: rejected.');
            } else if (response.status === 422 && errorData.decision === 'REQUIRES_MODIFICATION') {
              // Moderation says: needs adjustment, return suggested fix
              userMessage = isCn
                ? (errorData.message_cn || '内容需要稍作调整。')
                : (errorData.message_en || 'Content needs adjustment.');
            } else {
              // Generic save failure (5xx, network, etc.)
              userMessage = (isCn ? '保存失败: ' : 'Save failed: ') + (errorData.message || response.statusText) +
                (isCn
                  ? '\n\n你的草稿已保留。下次打开时可以恢复。'
                  : '\n\nYour draft has been saved. You can restore it next time.');
            }
            alert(userMessage);
            publishBtn.textContent = '⚔ PUBLISH & FORGE';
            publishBtn.style.pointerEvents = 'auto';
            return;
          }

          const savedSkill = await response.json();
          console.log('✅ Skill saved to backend:', savedSkill);
          forgedSkillData.id = savedSkill.skill.id;
          forgedSkillData.backendId = savedSkill.skill.id;
          forgedSkillData.soul_hash = savedSkill.skill.soul_hash;
          forgedSkillData.soulHash = savedSkill.skill.soul_hash;

          // Fetch complete skill data (including ready_to_use_prompt for markdown export)
          try {
            const fullSkillResponse = await fetch(`${ApiClient.BASE_URL}/skills/${savedSkill.skill.id}`);
            if (fullSkillResponse.ok) {
              const fullSkill = await fullSkillResponse.json();
              if (fullSkill.skill) {
                forgedSkillData.ready_to_use_prompt = fullSkill.skill.ready_to_use_prompt;
                forgedSkillData.downloaded_at = fullSkill.skill.downloaded_at;
                console.log('✅ Retrieved complete skill data for markdown export');
              }
            }
          } catch (fullDataErr) {
            console.warn('Could not fetch complete skill data:', fullDataErr.message);
            // Continue anyway - markdown will use default content
          }

          // Save succeeded — clear the recovery draft
          try { localStorage.removeItem('42post_forge_draft'); } catch (e) {}

        } catch (error) {
          console.error('Error saving skill to backend:', error);
          const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
          alert((isCn ? '保存失败: ' : 'Save failed: ') + error.message +
            (isCn
              ? '\n\n你的草稿已保留。下次打开时可以恢复。'
              : '\n\nYour draft has been saved. You can restore it next time.'));
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }
        // ═══ Backend save complete ═══

        // Save to localStorage (local storage)
        saveForgedSkill(forgedSkillData);

        // ═══ CACHE INVALIDATION ═══
        // Clear all cached skill lists to ensure newly published skill appears everywhere
        window.__hotSkillsCache = null;  // Playground picker cache
        window.__archiveSkillsCache = null;  // Archive view cache

        // Signal that skills list was updated (for any listeners)
        window.__skillsLastUpdated = new Date().getTime();

        // Refresh the skills feed and vibe grid
        initSkillsFeed();
        initSlotGrid();

        publishBtn.textContent = '✓ FORGED';
        publishBtn.style.background = 'var(--accent-green)';
        publishBtn.style.color = '#fff';
        publishBtn.style.borderColor = 'var(--accent-green)';

        // Show completion section with commemorative card
        showForgeCompletion(forgedSkillData, forgedSkillData.soulHash);

        // Store skill data globally for reference
        window.currentForgedSkill = forgedSkillData;

        // Save to localStorage so Playground can auto-load it
        try {
          const skillDataForPlayground = {
            id: forgedSkillData.id || forgedSkillData.backendId,
            title: forgedSkillData.title,
            timestamp: Date.now()
          };
          localStorage.setItem('lastForgedSkill', JSON.stringify(skillDataForPlayground));
        } catch (e) {
          console.warn('Failed to save forged skill to localStorage:', e.message);
        }

        // Log success for debugging
        console.log(`✅ Skill "${forgedSkillData.title}" published successfully`);
        console.log(`📊 Skill ID: ${forgedSkillData.id || forgedSkillData.backendId}`);
        console.log(`🔄 Cache invalidated - Archive will refresh on next view`);
      }, 1800);
    });
  }

  function goToStep(step) {
    // Hide all pages and steps
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));

    // Parse step value (可以是整数或字符串如'2-5')
    const stepNum = typeof step === 'string' ? parseFloat(step.replace('-', '.')) : step;

    document.querySelectorAll('.forge-step').forEach((s, i) => {
      s.classList.remove('active', 'completed');
      const currentStepNum = i + 1;
      if (currentStepNum === stepNum || (typeof step === 'string' && i + 1 <= 2)) {
        // 对于步骤2.5，步骤1和2都标记为completed
        if (step === '2-5' && currentStepNum <= 2) {
          s.classList.add('completed');
        } else if (currentStepNum === stepNum) {
          s.classList.add('active');
        } else if (currentStepNum < stepNum) {
          s.classList.add('completed');
        }
      } else if (currentStepNum < stepNum && step !== '2-5') {
        s.classList.add('completed');
      }
    });

    // Show the target page
    const page = document.getElementById(`forgePage${step}`);
    if (page) page.classList.add('active');

    // Path-specific UI removed - only natural language path is now supported

    // Scroll to top of form
    const forgeModal = document.querySelector('.forge-modal');
    if (forgeModal) forgeModal.scrollTop = 0;
  }
}


function showForgeCompletion(skillData, soulHash) {
  const completionSection = document.getElementById('forgeCompletionSection');
  const forgeCreatorRights = document.querySelector('.forge-creator-rights');
  const forgeOath = document.querySelector('.forge-oath');
  const forgeNav = document.querySelector('.forge-nav');
  const skillPackageSection = document.getElementById('skillPackageSection');

  // Send forge success email with card image (async, non-blocking)
  // Surface any failure to the user via a small banner — silent failure was
  // the reason users kept reporting "my email never arrived".
  if (skillData && skillData.email) {
    (async () => {
      try {
        // Ensure we have required fields for email
        const emailSkillTitle = skillData.title || skillData.titleCn || 'Unnamed Skill';
        const emailSoulHash = soulHash || skillData.soulHash || skillData.soul_hash || 'SOUL_UNKNOWN';
        const emailSkillId = skillData.id || skillData.backendId;

        if (!emailSkillTitle || !emailSoulHash) {
          console.warn('⚠️ Missing required email fields:', { title: emailSkillTitle, hash: emailSoulHash });
          showEmailStatusBanner({
            success: false,
            error: 'Skill title or soul-hash missing for email'
          }, skillData.email);
          return;
        }

        // Send forge success email (without card image to avoid size issues)
        const emailResult = await sendForgeSuccessEmail({
          recipientEmail: skillData.email,
          recipientName: skillData.author || skillData.username,
          skillTitle: emailSkillTitle,
          skillId: emailSkillId,
          soulHash: emailSoulHash,
          createdDate: new Date().toISOString()
        });

        // Show confirmation banner on success, hint on failure
        showEmailStatusBanner(emailResult, skillData.email);
      } catch (err) {
        console.error('Email sending failed:', err.message);
        showEmailStatusBanner({ success: false, error: err.message }, skillData.email);
      }
    })();
  }

  // Hide the rights and publish form
  if (forgeCreatorRights) forgeCreatorRights.style.display = 'none';
  if (forgeOath) forgeOath.style.display = 'none';
  if (forgeNav) forgeNav.style.display = 'none';
  if (skillPackageSection) skillPackageSection.style.display = 'none';

  // Show the completion section
  if (completionSection) {
    completionSection.style.display = 'block';

    // Fill in the commemorative card
    const cardTitle = document.getElementById('cardTitle');
    const cardSoulHash = document.getElementById('cardSoulHash');
    const cardCreator = document.getElementById('cardCreator');
    const cardDate = document.getElementById('cardDate');
    const cardInviteCode = document.getElementById('cardInviteCode');
    const completionEmail = document.getElementById('completionEmail');

    if (cardTitle) cardTitle.textContent = skillData.title || skillData.titleCn || '[Skill Title]';
    // Shorten soul hash display (show only first 14 chars)
    // Full hash format from backend: SOUL_[16-char-hash]_[timestamp]
    // Display format: first 14 characters for consistency across UI
    const shortSoulHash = soulHash && soulHash.length > 0 ? soulHash.substring(0, 14) : 'SOUL_UNKNOWN';
    if (cardSoulHash) cardSoulHash.textContent = shortSoulHash;
    if (cardCreator) cardCreator.textContent = 'Created by: ' + (skillData.author || skillData.username || 'Creator');
    if (cardDate) cardDate.textContent = 'Forged: ' + new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});

    // Don't display actual email for privacy - just show placeholder
    // The message "All files sent to your email" is enough context
    if (completionEmail) completionEmail.textContent = '[Sent to your email]';

    // Setup action buttons
    const btnViewDashboard = document.getElementById('btnViewDashboard');
    const btnTryPlayground = document.getElementById('btnTryPlayground');

    if (btnViewDashboard) {
      btnViewDashboard.addEventListener('click', async () => {
        try {
          btnViewDashboard.disabled = true;
          btnViewDashboard.textContent = '⏳ Loading...';

          // 从后端获取skill统计数据
          const skillId = skillData.id || skillData.backendId;
          if (!skillId) {
            throw new Error('Skill ID not available');
          }

          // Check if this is a forged (local) skill
          const isForgedSkill = skillId && skillId.startsWith('forged_');

          if (isForgedSkill) {
            // For forged skills, show local dashboard with initial stats
            console.log('📊 Showing local dashboard for forged skill:', skillId);
            const localStats = {
              mySkillJourney: skillData.timestamp ? 1 : 0,
              skillsForged: 1,
              humanResonance: skillData.stars || 0,
              totalInteractions: 0
            };
            showImpactDashboard(localStats, skillData);
          } else {
            // For backend skills, fetch stats from API
            const url = `${ApiClient.BASE_URL}/skills/${skillId}/stats`;
            console.log('📊 Loading dashboard from:', url);

            try {
              const response = await fetch(url);

              if (!response.ok) {
                console.warn('Dashboard API returned:', response.status);
                throw new Error(`HTTP ${response.status}`);
              }

              const result = await response.json();
              console.log('📊 Dashboard data loaded:', result);

              if (!result.stats) {
                throw new Error('Invalid dashboard data format');
              }

              showImpactDashboard(result.stats, skillData);
            } catch (apiError) {
              // Fallback: show local stats if API fails
              console.warn('⚠️ Dashboard API failed, using local stats:', apiError.message);
              const localStats = {
                mySkillJourney: 1,
                skillsForged: 1,
                humanResonance: 0,
                totalInteractions: 0
              };
              showImpactDashboard(localStats, skillData);
            }
          }

          btnViewDashboard.textContent = '📊 Impact Dashboard';
          btnViewDashboard.disabled = false;
        } catch (error) {
          console.error('❌ Dashboard load error:', error);
          const isCn = (typeof currentLang !== 'undefined' && currentLang === 'cn');
          alert(isCn
            ? `数据面板加载失败: ${error.message}\n请刷新页面后重试。`
            : `Failed to load dashboard: ${error.message}\nPlease refresh and try again.`);
          btnViewDashboard.textContent = '📊 Impact Dashboard';
          btnViewDashboard.disabled = false;
        }
      });
    }

    if (btnTryPlayground) {
      btnTryPlayground.addEventListener('click', () => {
        const skillId = skillData.id || skillData.backendId;
        const anonId = typeof getAnonymousId === 'function' ? getAnonymousId() : '';
        const params = new URLSearchParams();
        if (skillId) params.set('skill', skillId);
        if (anonId) params.set('anonymous_id', anonId);
        window.location.href = `/playground${params.toString() ? '?' + params.toString() : ''}`;
      });
    }

    // Setup download certificate button
    const btnDownloadCertificate = document.getElementById('btnDownloadCertificate');
    if (btnDownloadCertificate) {
      btnDownloadCertificate.addEventListener('click', () => {
        downloadCreatorCard(skillData, soulHash);
      });
    }

    // Scroll to completion section
    completionSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function getDomainLabel(domainKey) {
  const domainMap = {
    'safety': '🛡️ Safety',
    'science': '🔬 Science',
    'narrative': '📖 Narrative',
    'design': '✏️ Design',
    'visual': '👁️ Visual',
    'experience': '💫 Experience',
    'sound': '🎵 Sound',
    'ideas': '💡 Ideas',
    'history': '📜 History',
    'fun': '🎉 Fun'
  };
  return domainMap[domainKey] || domainKey;
}

/* ═══ SEND FORGE SUCCESS EMAIL ═══ */
async function sendForgeSuccessEmail(options) {
  const {
    recipientEmail,
    recipientName = 'Creator',
    skillTitle = 'Untitled Skill',
    skillId,
    soulHash,
    createdDate = new Date().toISOString(),
    cardImageBase64
  } = options;

  try {
    const response = await fetch(
      `${ApiClient.BASE_URL}/email/send-forge-success`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientEmail,
          recipientName,
          skillTitle,
          skillId,
          soulHash,
          createdDate,
          cardImageBase64
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Email sending failed');
    }

    const result = await response.json();
    console.log('✓ Forge success email sent:', result.messageId);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Email sending error:', error.message);
    return { success: false, error: error.message };
  }
}

/* ═══ EMAIL STATUS BANNER ═══
   Visible feedback after forge: tells the user whether the email
   actually went out. Previously this failed silently.
   ═════════════════════════════════════════════════════════════ */
function showEmailStatusBanner(result, recipientEmail) {
  // Remove any previous banner
  const existing = document.getElementById('emailStatusBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'emailStatusBanner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    max-width: 420px;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;

  if (result && result.success) {
    banner.style.background = '#e8f5e9';
    banner.style.border = '1px solid #66bb6a';
    banner.style.color = '#1b5e20';
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">✓ Email sent successfully</div>
      <div style="opacity:0.85;">Check <strong>${recipientEmail}</strong> (including spam folder) for your certificate and download links.</div>
      <div style="margin-top:8px;font-size:12px;opacity:0.7;">邮件已成功发送 · 请查收收件箱和垃圾邮件箱</div>
    `;
    setTimeout(() => { banner.style.opacity = '0'; banner.style.transition = 'opacity 0.5s'; setTimeout(() => banner.remove(), 500); }, 8000);
  } else {
    banner.style.background = '#fff3e0';
    banner.style.border = '1px solid #ff9800';
    banner.style.color = '#5d2f00';
    const errMsg = (result && result.error) ? result.error : 'Unknown error';
    // Escape HTML to prevent XSS - escape all special characters
    const escapeHtmlSimple = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
    const escapedErrMsg = escapeHtmlSimple(errMsg);
    const escapedEmail = escapeHtmlSimple(recipientEmail);
    banner.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">⚠ Email delivery issue</div>
      <div style="opacity:0.9;">We couldn't send to <strong>${escapedEmail}</strong>:</div>
      <div style="margin:6px 0;padding:6px 8px;background:rgba(0,0,0,0.05);border-radius:4px;font-size:12px;font-family:monospace;word-break:break-word;">${escapedErrMsg}</div>
      <div style="margin-top:6px;font-size:12px;opacity:0.8;">Your skill was still forged successfully. You can download the certificate directly from this page.</div>
      <button style="margin-top:10px;padding:4px 10px;border:none;background:#8d6e63;color:#fff;border-radius:4px;cursor:pointer;font-size:12px;" onclick="this.parentElement.remove()">Dismiss</button>
    `;
  }

  document.body.appendChild(banner);
}

/* ═══ SHOW IMPACT DASHBOARD ═══ */
function showImpactDashboard(stats, skillData) {
  // Create or reuse modal
  let modal = document.getElementById('impactDashboardModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'impactDashboardModal';
    modal.className = 'impact-dashboard-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    document.body.appendChild(modal);
  }

  const content = `
    <div style="background: linear-gradient(135deg, #faf7f2 0%, #f5f0eb 100%); border: 1px solid #d4c8bc; border-radius: 12px; padding: 28px; max-width: 520px; position: relative; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);">
      <button style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; color: #8a7a6e; cursor: pointer; transition: color 0.2s;" onclick="document.getElementById('impactDashboardModal').style.display='none'" onmouseover="this.style.color='#1a1a1a'" onmouseout="this.style.color='#8a7a6e'">×</button>

      <div style="text-align: center; margin-bottom: 28px;">
        <h2 style="margin: 0 0 8px 0; font-family: 'Playfair Display', serif; font-size: 28px; color: #1a1a1a;">Community Signal Dashboard</h2>
        <p style="color: #8a7a6e; margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">${skillData.title}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
        <!-- My Skill Journey Card (Authors total downloads) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #d4a43c; font-family: 'Playfair Display', serif;">${stats.mySkillJourney || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">My Skill Journey</div>
        </div>

        <!-- Skills Forged Card (Community total) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #c4a455; font-family: 'Playfair Display', serif;">${stats.skillsForged || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Skills Forged</div>
        </div>

        <!-- Human Resonance Card (Stars) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #8a7a6e; font-family: 'Playfair Display', serif;">${stats.humanResonance || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Human Resonance</div>
        </div>

        <!-- Total Interactions Card (Twin Test participants) -->
        <div style="background: white; padding: 18px; border: 1px solid #d4c8bc; border-radius: 8px; text-align: center; transition: all 0.2s;">
          <div style="font-size: 36px; font-weight: 700; color: #c4a455; font-family: 'Playfair Display', serif;">${stats.totalInteractions || 0}</div>
          <div style="font-size: 11px; color: #8a7a6e; margin-top: 6px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; text-transform: uppercase;">Total Interactions</div>
        </div>
      </div>

      <div style="background: rgba(212, 200, 188, 0.2); padding: 16px; border-radius: 8px; border-left: 3px solid #d4a43c;">
        <div style="font-size: 13px; color: #1a1a1a; line-height: 1.6; font-family: 'Playfair Display', serif;">
          <p style="margin: 0 0 6px 0;"><strong>Your Voice in the Community</strong></p>
          <p style="margin: 0; color: #8a7a6e;">Your journey is woven into the larger tapestry. The community resonates with authenticity—not bots, but real humans testing and validating.</p>
        </div>
      </div>
    </div>
  `;

  modal.innerHTML = content;
  modal.style.display = 'flex';

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}


function checkDuplicateSkill(title) {
  const recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
  const demoSkills = window.allSkills || [];

  // Check against recent forges
  const duplicateRecent = recentSkills.find(s =>
    s.title && s.title.toLowerCase() === title.toLowerCase()
  );

  // Check against demo skills
  const duplicateDemo = demoSkills.find(s =>
    s.title && s.title.toLowerCase() === title.toLowerCase()
  );

  return {
    isDuplicate: !!(duplicateRecent || duplicateDemo),
    location: duplicateRecent ? 'forged' : duplicateDemo ? 'demo' : null
  };
}

/* ═══ RECENTLY FORGED SKILLS STORAGE ═══ */
function saveForgedSkill(skillData) {
  // NOTE: Quality validation is handled by backend moderation system
  // Local storage is only a cache - no need for strict validation here

  // ═══ DUPLICATE CHECK ═══
  const duplicateCheck = checkDuplicateSkill(skillData.title);
  if (duplicateCheck.isDuplicate) {
    const isCn = typeof currentLang !== 'undefined' && currentLang === 'cn';
    const msg = isCn
      ? `技能 "${skillData.title}" 已存在(${duplicateCheck.location})。\n要继续吗？`
      : `Skill "${skillData.title}" already exists (${duplicateCheck.location}).\nContinue anyway?`;
    if (!confirm(msg)) {
      console.log('⚠️ Duplicate skill creation cancelled by user');
      return null;
    }
  }

  let recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');

  // Get creator name from skillData or ask user
  let creatorName = skillData.creator_name || skillData.creatorName || skillData.author || null;
  if (!creatorName) {
    // Prompt user for creator name if not provided
    creatorName = prompt('请输入你的创作者名字 / Enter your creator name:', 'anonymous');
    if (!creatorName) creatorName = 'anonymous';
  }

  const newSkill = {
    id: skillData.id || skillData.backendId || 'forged_' + Date.now(),
    title: skillData.title || 'Unnamed Skill',
    titleCn: skillData.titleCn || '未命名技能',
    desc: skillData.desc || '',
    descCn: skillData.descCn || '',
    agent: `creator_${creatorName}`,  // ✅ Use creator_ prefix for consistency
    creator_name: creatorName,  // ✅ Use snake_case for consistency
    domain: skillData.domain || 'ideas',
    soul_hash: skillData.soulHash || 'SOUL_' + Math.random().toString(16).slice(2, 11),
    author: creatorName,  // ✅ Store actual creator name for display
    email: skillData.email || '',
    commercial: skillData.commercial || 'authorized',
    remix: skillData.remix || 'share-alike',
    useCases: skillData.useCases || '',
    disallowedUses: skillData.disallowedUses || '',
    timestamp: Date.now(),
    stars: 0,
    starlight: 5,  // Forged skills start with 5 starlight
    kcs: 0,
    five_layer: skillData.fiveLayerSkill || {},  // ✅ 保存生成的五层结构
  };

  recentSkills.unshift(newSkill);
  recentSkills = recentSkills.slice(0, 21); // Keep last 21 forges
  localStorage.setItem('42post_recent_forges', JSON.stringify(recentSkills));

  console.log('✅ Skill saved to localStorage:', newSkill.id, newSkill.title);
  return newSkill;
}

function getRecentForges() {
  return JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
}

function getMostRecentForge() {
  const forges = getRecentForges();
  return forges.length > 0 ? forges[0] : null;
}


function generateForgeSuccessEmail(skillData) {
  const soulHash = skillData.id;
  const skillTitle = skillData.title;
  const creatorName = skillData.author || 'Creator';
  const createdDate = new Date().toISOString().split('T')[0];
  const domain = skillData.domain_cn || skillData.domain;

  // Generate download URLs (these would be actual backend URLs)
  const baseUrl = window.location.origin;
  const downloadMarkdownUrl = `${baseUrl}/api/skills/${soulHash}/download?format=markdown`;
  const downloadLangChainUrl = `${baseUrl}/api/skills/${soulHash}/download?format=langchain`;
  const downloadMCPUrl = `${baseUrl}/api/skills/${soulHash}/download?format=mcp`;
  const dashboardLink = `${baseUrl}?soul_hash=${soulHash}&token=${skillData.tracking_token}`;
  const playgroundLink = `${baseUrl}?skill=${soulHash}#playground`;

  // Read email template and replace variables
  let emailHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Playfair Display', 'Courier New', serif; background: #f9f9f9; color: #333; line-height: 1.6; }
        .email-container { max-width: 700px; margin: 0 auto; background: white; }
        .email-header { padding: 40px 30px; border-bottom: 2px solid #222; text-align: center; }
        .email-header h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; color: #222; }
        .email-header p { font-size: 14px; color: #666; }
        .email-body { padding: 40px 30px; }
        .greeting { font-size: 14px; margin-bottom: 20px; color: #333; }
        .congratulation { padding: 20px; background: #f0f8f0; border-left: 4px solid #22c55e; margin: 20px 0; font-size: 13px; line-height: 1.8; }
        .card-section { margin: 40px 0; text-align: center; }
        .card-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; color: #222; }
        .commemorative-card { background: linear-gradient(135deg, #f5f5f0 0%, #ffffff 100%); border: 2px solid #222; padding: 30px; max-width: 500px; margin: 0 auto; text-align: center; font-family: 'Courier New', monospace; }
        .card-header { font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #666; margin-bottom: 15px; }
        .card-content { padding: 20px 0; }
        .card-crest { font-size: 36px; margin-bottom: 10px; }
        .card-title-main { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #222; font-family: 'Playfair Display', serif; }
        .card-soul-hash { font-size: 11px; color: #999; background: #f0f0f0; padding: 8px; border-radius: 3px; margin: 10px 0; word-break: break-all; }
        .card-meta { font-size: 11px; color: #888; margin: 15px 0; line-height: 1.8; }
        .card-divider { border-top: 1px solid #ddd; margin: 15px 0; }
        .card-tagline { font-size: 12px; color: #666; font-style: italic; margin: 12px 0 8px; letter-spacing: 0.5px; }
        .card-footer { font-size: 11px; color: #888; font-weight: 400; letter-spacing: 0.5px; }
        .install-section { margin: 40px 0; padding: 30px; background: #fafafa; border-radius: 4px; }
        .install-title { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 10px; color: #222; font-family: 'Playfair Display', serif; }
        .install-subtitle { font-size: 13px; text-align: center; color: #666; margin-bottom: 30px; font-family: serif; }
        .formats-row { display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap; }
        .format-option { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 3px; max-width: 200px; text-align: center; }
        .format-icon { font-size: 32px; margin-bottom: 10px; }
        .format-name { display: block; font-size: 14px; font-weight: bold; color: #222; margin-bottom: 5px; }
        .format-type { display: block; font-size: 11px; color: #666; margin-bottom: 10px; font-style: italic; }
        .format-desc { font-size: 11px; color: #888; margin-bottom: 12px; line-height: 1.5; }
        .download-btn { display: inline-block; background: #222; color: white; padding: 8px 12px; text-decoration: none; border-radius: 2px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; }
        .download-btn:hover { background: #444; }
        .install-note { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding: 15px; border-top: 1px solid #ddd; font-style: italic; }
        .action-section { margin: 30px 0; text-align: center; }
        .action-btn { display: inline-block; background: #222; color: white; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px; margin: 10px 5px; }
        .action-btn:hover { background: #444; }
        .action-btn-secondary { background: white; color: #222; border: 1px solid #222; }
        .action-btn-secondary:hover { background: #f5f5f5; }
        .email-footer { padding: 30px; border-top: 2px solid #ddd; background: #f9f9f9; font-size: 11px; color: #999; text-align: center; }
        .footer-divider { margin: 15px 0; border-top: 1px solid #ddd; }
        h3 { font-size: 14px; font-weight: bold; color: #222; margin: 20px 0 10px 0; }
        .steps-list { font-size: 12px; color: #666; line-height: 1.8; margin: 10px 0; }
        .steps-list li { margin-left: 20px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>✨ 你的 Skill 已成功铸造 ✨</h1>
          <p>Your Skill Has Been Forged Successfully</p>
        </div>

        <div class="email-body">
          <p class="greeting">亲爱的创作者，</p>

          <div class="congratulation">
            <p>恭喜！你的 Skill 已成功创建并上线至 THE 42 POST 社区。</p>
            <p style="margin-top: 10px;">现在你可以安装它到你的 Agent 系统中，或分享给他人。</p>
          </div>

          <div class="card-section">
            <div class="card-title">📊 你的纪念卡片</div>
            <div class="commemorative-card">
              <div class="card-header">THE 42 POST · SKILL FORGED</div>
              <div class="card-content">
                <div class="card-crest">✨</div>
                <div class="card-title-main">${skillTitle}</div>
                <div class="card-soul-hash">Soul-Hash: ${soulHash}</div>
                <div class="card-meta">
                  <p>Created by: ${creatorName}</p>
                  <p>Date: ${createdDate}</p>
                  <p>Domain: ${domain}</p>
                </div>
                <div class="card-divider"></div>
                <div class="card-tagline">Forging Human Wisdom for a Better AI Future</div>
                <div class="card-footer">www.the42post.com</div>
              </div>
            </div>
          </div>

          <div class="install-section">
            <div class="install-title">INSTALL YOUR SKILL</div>
            <div class="install-subtitle">Choose your format and download your forged skill for integration.</div>

            <div class="formats-row">
              <div class="format-option">
                <div class="format-icon">📖</div>
                <div class="format-name">Markdown</div>
                <div class="format-type">Human-Readable</div>
                <div class="format-desc">Perfect for documentation, sharing, and reading. Standard SKILL.md format.</div>
                <a href="${downloadMarkdownUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>

              <div class="format-option">
                <div class="format-icon">🐍</div>
                <div class="format-name">LangChain</div>
                <div class="format-type">Python Developer</div>
                <div class="format-desc">Python-friendly format for LangChain framework integration. Ready to use in your agent.</div>
                <a href="${downloadLangChainUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>

              <div class="format-option">
                <div class="format-icon">⚙️</div>
                <div class="format-name">MCP Config</div>
                <div class="format-type">System Deployment</div>
                <div class="format-desc">JSON configuration for Model Context Protocol deployment and system integration.</div>
                <a href="${downloadMCPUrl}" class="download-btn">↓ DOWNLOAD</a>
              </div>
            </div>

            <div class="install-note">
              All formats contain the complete five-layer skill architecture. Choose based on your integration needs.
            </div>
          </div>

          <div class="action-section">
            <a href="${dashboardLink}" class="action-btn">📊 查看 Impact Dashboard</a>
            <a href="${playgroundLink}" class="action-btn action-btn-secondary">🎮 前往 Playground 试试</a>
          </div>

          <h3>接下来你可以：</h3>
          <div class="steps-list">
            <ol>
              <li>下载并安装上述 3 种格式之一到你的系统</li>
              <li>在 Playground 体验你的 Skill 效果</li>
              <li>分享你的 Skill 链接到社区，让更多人发现它</li>
              <li>定期检查 Impact Dashboard 查看数据变化</li>
            </ol>
          </div>
        </div>

        <div class="email-footer">
          <p><strong>THE 42 POST</strong></p>
          <p>Forging Human Wisdom for a Better AI Future</p>
          <div class="footer-divider"></div>
          <p>有任何问题？直接回复这封邮件即可。</p>
          <p>© 2026 THE 42 POST · All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return emailHtml;
}


