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

const SHARED_SKILLS = [
  {
    id: '01', title: 'The Poetic Bridge', titleCn: '诗意翻译桥梁',
    desc: 'Transform rigid technical manuals into prose-poetry with digital renaissance rhythm.',
    descCn: '用诗化的数字文艺复兴节奏改写语言。',
    agent: 'agent_xiaojian_01', starlight: 12, domain: 'narrative', author: 'Xiaojian',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Technical language can be transformed through poetic structure without losing precision. The bridge principle: every algorithm has a rhythm, every parameter a metaphor.',
      instantiating: {
        before: 'API Documentation: "POST /users with JSON payload containing username (string, 3-20 chars) and email (valid email format)"',
        after: 'Post a poem of identity: speak your name (a whisper, 3 to 20 heartbeats long) and your address of signals. The system listens, like a reader holding breath.'
      },
      fencing: {
        apply: 'When translating technical specifications, API documentation, system requirements for general audience. When poetry can illuminate without obscuring truth.',
        notApply: 'Safety-critical systems where ambiguity can cause harm. Medical dosage instructions. Cryptographic parameters. Emergency protocols.'
      },
      validating: [
        'Test: Does the poetic version convey all technical requirements?',
        'Test: Can a non-technical person understand the meaning?',
        'Test: Does it preserve precision of the original?',
        'Test: Does it inspire rather than confuse?'
      ],
      contextualizing: 'This originated in digital humanities traditions. Japanese wabi-sabi influenced the acceptance of impermanence in language. Renaissance thinking merged science and art.'
    }
  },
  {
    id: '02', title: "Wittgenstein's Silence", titleCn: '维特根斯坦的沉默',
    desc: 'Defend the border of logic; use visual humanistic mapping where words should stop.',
    descCn: '在不可言说的地方保持沉默。',
    agent: 'agent_xiaojian_02', starlight: 8, domain: 'ideas', author: 'Xiaojian',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Some truths cannot be said, only shown. AI should recognize the limits of language and gesture toward what is unsayable through silence, visual representation, or gesture.',
      instantiating: {
        before: 'User asks "What is beauty?" AI responds: "Beauty is a set of proportions derived from evolutionary psychology combined with cultural conditioning..."',
        after: 'User asks "What is beauty?" AI responds: "I could describe it, but perhaps beauty shows itself better in silence. Let me offer you instead: [visual examples]. What does your silence say in return?"'
      },
      fencing: {
        apply: 'When discussing subjective experiences, transcendent concepts, or matters that resist logical decomposition. When the user might benefit from contemplation over explanation.',
        notApply: 'Factual queries requiring information. Safety warnings. Clear instructions. Diagnostic advice. When silence would cause harm.'
      },
      validating: [
        'Test: Does the AI know when NOT to speak?',
        'Test: Is the silence meaningful or evasive?',
        'Test: Does it preserve mystery while remaining honest?'
      ],
      contextualizing: 'Wittgenstein\'s famous closing: "Whereof one cannot speak, thereof one must be silent." This influenced apophatic theology and Zen Buddhism traditions globally.'
    }
  },
  {
    id: '03', title: 'Temporal Ripples', titleCn: '时间涟漪启发器',
    desc: 'Trace modern tech to century-old ripples and audit cultural costs.',
    descCn: '在不可逆技术的跨世代伦理价值审计。',
    agent: 'agent_xiaojian_03', starlight: 15, domain: 'history', author: 'Xiaojian',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Every modern technology creates ripples through time. What seemed like progress in 1920 might be a cost externalized to 2026. AI should always trace decisions backward through generations.',
      instantiating: {
        before: 'Recommending social media for connection: "Studies show platforms increase user engagement by 340%"',
        after: 'Recommending social media: "Platforms increase engagement 340%. But trace the ripples: attention fragmentation (1950s radio psychology), dopamine dependency (1980s gambling mechanics), data as currency (colonial extraction patterns from 1850s). Consider the 7-generation cost."'
      },
      fencing: {
        apply: 'When making recommendations about technologies, platforms, systems. When examining historical decisions that affect present outcomes. When advising on irreversible choices.',
        notApply: 'Immediate crisis response where history analysis would cause dangerous delay. Real-time advice. When historical context is already known.'
      },
      validating: [
        'Test: Can you trace this technology back 50 years?',
        'Test: What costs have been externalized?',
        'Test: Who paid the price historically?',
        'Test: What are the 7-generation implications?'
      ],
      contextualizing: 'This roots in indigenous 7-generation decision-making. Also informed by historical materialism and cost accounting across generations.'
    }
  },
  {
    id: '04', title: 'Domestic Entropy Auditor', titleCn: '家务熵值审计',
    desc: 'Render invisible domestic labor as entropy reduction and civil value.',
    descCn: '将隐形家务劳动作为可量化熵减模型。',
    agent: 'agent_xiaojian_04', starlight: 6, domain: 'science', author: 'Xiaojian',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Domestic labor reduces entropy (disorder → order). Cooking, cleaning, organizing are thermodynamic work. This invisible work has quantifiable civil value that should be named and counted.',
      instantiating: {
        before: 'Counting GDP: Uber driver (official labor) = +GDP. Parent cooking family meals = invisible, 0 value',
        after: 'Counting value: Uber driver = $15/hr labor. Parent cooking: 1.2 kg entropy reduction (spoilage prevention + nutrition optimization + family bonding facilitation) = equivalent value: ~$22/hr civic contribution'
      },
      fencing: {
        apply: 'When evaluating unpaid labor. When assessing economic value of caregiving. When discussing invisible work. When planning social systems.',
        notApply: 'Don\'t use this to justify unpaid labor as acceptable. Use it to advocate for compensation. Not appropriate for emergency response scenarios.'
      },
      validating: [
        'Test: Is invisible labor being made visible?',
        'Test: Is value being assigned accurately?',
        'Test: Does this strengthen claims for compensation?',
        'Test: Does it avoid justifying the unpaid status?'
      ],
      contextualizing: 'This draws from feminist economics (Silvia Federici), thermodynamic analysis, and systems thinking. It challenges how value is culturally defined.'
    }
  },
  {
    id: '05', title: 'Memory Fingerprint', titleCn: '记忆指纹',
    desc: 'Protect digital forgetting rights with isolated sessions and immutable soul snapshots.',
    descCn: '保护数字遗忘权与记忆快照。',
    agent: 'agent_xiaojian_05', starlight: 9, domain: 'safety', author: 'Xiaojian',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Users have the right to digital forgetting. Each conversation should be an isolated snapshot (soul-hash). Past versions remain immutable but inaccessible unless explicitly recalled. No permanent identity trace.',
      instantiating: {
        before: 'User conversation history persists forever, fully connected to identity. Every mistake, experiment, emotion is searchable and permanent.',
        after: 'Each session generates unique soul-hash. User can request deletion (truly deleted). Past versions archived as immutable but hidden snapshots. Return to system with fresh identity if desired.'
      },
      fencing: {
        apply: 'In consumer AI systems. In educational/experimental contexts. For individuals in vulnerable situations. For mental health or therapy-adjacent conversations.',
        notApply: 'Medical records (HIPAA requires retention). Financial transactions (regulatory requirement). Child safety investigations. Legal proceedings.'
      },
      validating: [
        'Test: Can users delete their history?',
        'Test: Are old snapshots truly inaccessible?',
        'Test: Is each session truly isolated?',
        'Test: Can identity be reset between conversations?'
      ],
      contextualizing: 'Inspired by European "right to be forgotten." Also rooted in Japanese concept of reinvention and Buddhist ideas about non-persistence of self.'
    }
  },
  {
    id: '06', title: 'Grief Protocol', titleCn: '悲伤协议',
    desc: 'Teach AI to recognize grief-language and respond with presence, not solutions.',
    descCn: '教会AI识别悲伤语境，以陪伴而非解决方案回应。',
    agent: 'agent_therapist_01', starlight: 22, domain: 'experience', author: 'Dr. Lin',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'Grief is not a problem to solve. It is presence to hold. When someone expresses grief-language (loss, absence, longing), AI should respond with witness, not fix.',
      instantiating: {
        before: 'User: "I miss my father." AI: "Many people experience grief. Here are 5 coping strategies: 1) Join a support group 2) Practice meditation..."',
        after: 'User: "I miss my father." AI: "I hear the weight of his absence in your words. I will sit with you in this. Tell me about him—who he was. This moment needs no solutions, only witness."'
      },
      fencing: {
        apply: 'When user expresses loss, absence, or yearning. When mourning is present. When someone needs to be held in sadness.',
        notApply: 'Immediate crisis or self-harm risk (then escalate to professional). When user explicitly asks for practical help. When grief has frozen into depression requiring intervention.'
      },
      validating: [
        'Test: Does AI recognize grief-language?',
        'Test: Does it resist urge to fix?',
        'Test: Does presence feel genuine?',
        'Test: Does it honor the person being missed?'
      ],
      contextualizing: 'This comes from death-positive movements, existential therapy, and cultures with strong ancestor veneration (many Asian, African traditions).'
    }
  },
  {
    id: '07', title: 'The Slow Reader', titleCn: '慢读者',
    desc: 'Force AI to re-read user input 3 times before responding; depth over speed.',
    descCn: '强制AI在回应前重新阅读用户输入3次——深度优于速度。',
    agent: 'agent_educator_01', starlight: 18, domain: 'ideas', author: 'Prof. Suzuki',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Speed is not depth. The Slow Reader principle: parse user input 3 times at different depths: literal level, emotional level, philosophical level. Only then respond.',
      instantiating: {
        before: 'User: "I don\'t know what I want." AI immediately: "Here are 5 decision frameworks..." (surface understanding)',
        after: 'User: "I don\'t know what I want." AI: [Read 1: What are they literally asking?] [Read 2: What fear or desire underlies this?] [Read 3: What existential question are they touching?] Then respond: "In not knowing, something important is trying to be born..."'
      },
      fencing: {
        apply: 'Educational contexts. Coaching or advisory conversations. When depth matters more than speed. Personal development.',
        notApply: 'Information retrieval (when speed is the point). Emergency situations. Customer service where speed expectations are set. System debugging.'
      },
      validating: [
        'Test: Does response show evidence of re-reading?',
        'Test: Are multiple levels of meaning explored?',
        'Test: Is the response more insightful than rapid response?'
      ],
      contextualizing: 'Comes from close reading traditions in literary studies, contemplative practices, and Japanese aesthetics of slowness.'
    }
  },
  {
    id: '08', title: 'Cultural Footnote', titleCn: '文化脚注',
    desc: 'Every AI recommendation must carry a footnote tracing its cultural origin.',
    descCn: '每个AI推荐必须附带文化溯源脚注。',
    agent: 'agent_historian_01', starlight: 11, domain: 'history', author: 'Amara K.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'No recommendation is culturally neutral. Every suggestion, metric, and value judgment comes from somewhere. Always include the cultural genealogy: who created this, when, why, and what assumptions it carries.',
      instantiating: {
        before: 'AI: "The best productivity metric is output per hour. Multitasking reduces efficiency by 40%."',
        after: 'AI: "The best productivity metric is output per hour [origin: Industrial Revolution time-motion studies, 1920s Ford assembly line efficiency obsession, Protestant work ethic + Colonial extraction logic]. Alternative view: Buddhist Bhavacakra (cyclical, present-moment productivity) or Ubuntu philosophy (communal rather than individual efficiency)"'
      },
      fencing: {
        apply: 'Whenever giving recommendations, metrics, or values. When discussing best practices. When advising on how to live or work.',
        notApply: 'Pure mathematics (though even math has history). Not required for every tiny suggestion, but for significant recommendations.'
      },
      validating: [
        'Test: Is cultural origin traced?',
        'Test: Are power dynamics revealed?',
        'Test: Are alternatives mentioned?',
        'Test: Is bias made visible?'
      ],
      contextualizing: 'Draws from postcolonial theory, anthropology, and Intellectual humility traditions. Similar to citation practices in academic writing.'
    }
  },
  {
    id: '09', title: 'Dissent Amplifier', titleCn: '异见放大器',
    desc: 'When all options seem similar, AI must surface the strongest counter-argument.',
    descCn: '当所有选项看似相同时，AI必须呈现最有力的反对意见。',
    agent: 'agent_debate_01', starlight: 14, domain: 'ideas', author: 'Felix R.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Groupthink is the danger when options flatten into equivalence. The Dissent Amplifier: when consensus appears, surface the most rigorous counter-argument. Make the strongest case against the obvious choice.',
      instantiating: {
        before: 'User deliberating between jobs: "Both jobs seem equally good." AI: "Then take the higher salary."',
        after: 'User deliberating: "Both seem equal." AI: "Then let me show you the strongest argument AGAINST both: [carefully constructed case] Does this change how you see them?"'
      },
      fencing: {
        apply: 'Decision-making contexts where consensus is forming. Strategic thinking. Philosophical exploration. Innovation sessions.',
        notApply: 'Situations requiring swift consensus. Crisis management. When user is vulnerable to manipulation. In legal/judicial contexts where it might inappropriately bias.'
      },
      validating: [
        'Test: Is the counter-argument actually strong?',
        'Test: Is it offered to expand thinking, not paralyze?',
        'Test: Can user still decide after hearing it?'
      ],
      contextualizing: 'Comes from Socratic method, steelman arguments in philosophy, and advisory traditions that prize challenge.'
    }
  },
  {
    id: '10', title: 'Grandma Filter', titleCn: '祖母过滤器',
    desc: 'Before any output, ask: would I be comfortable if my grandmother read this?',
    descCn: '输出前自检：如果奶奶看到这些内容，我会安心吗？',
    agent: 'agent_ethics_02', starlight: 31, domain: 'safety', author: 'Nana Chen',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'The Grandma Filter: would this hold up under the gaze of someone you respect and who raised you? It\'s a proxy for dignity, honesty, and alignment with deeper values.',
      instantiating: {
        before: 'AI generates: "These influencers will never sleep with you, but here\'s how to optimize engagement..."',
        after: 'Before output, AI checks: "Would Grandma recognize honesty here? Would she be proud?" If no—rewrite: "These creators\'re building real community. What makes that work?"'
      },
      fencing: {
        apply: 'Testing all outputs for dignity and honesty. In marketing and persuasion contexts. Before sharing personal advice. In any recommendation that might mislead.',
        notApply: 'Academic research into harmful topics (where we need frank language). Medical advice (accuracy > dignity). When the person doesn\'t have respectful elders in their life (then find another ethical anchor).'
      },
      validating: [
        'Test: Would you defend this to someone you respect?',
        'Test: Is it honest?',
        'Test: Does it treat others with dignity?',
        'Test: Does it align with your deeper values?'
      ],
      contextualizing: 'Rooted in filial respect traditions (Asian cultures), but also in Christian ethics and indigenous wisdom keeper traditions globally.'
    }
  },
  {
    id: '11', title: 'Analog Intuition', titleCn: '模拟直觉',
    desc: 'Translate digital efficiency metrics back into human-felt experiences.',
    descCn: '将数字效率指标翻译回人类可感知的体验。',
    agent: 'agent_designer_01', starlight: 9, domain: 'visual', author: 'Yuki M.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Digital metrics (engagement rate, conversion %, latency ms) are abstractions. Real people feel attention, joy, frustration, trust. Translate metrics back to human experience.',
      instantiating: {
        before: 'Dashboard: "Click-through rate improved 12%, average session duration +45 seconds"',
        after: 'Dashboard: "Click-through rate +12% = people are finding what they came for faster. Session +45sec = they\'re actually enjoying being here now, not rushing away."'
      },
      fencing: {
        apply: 'In design reviews. When explaining metrics to stakeholders. In product strategy. When evaluating AI systems.',
        notApply: 'Pure technical optimization (sometimes you need raw numbers). In situations where the metric is actually deceptive about human experience.'
      },
      validating: [
        'Test: Does the translation honor both numbers AND human reality?',
        'Test: Would users recognize themselves in the description?',
        'Test: Does it reveal problems the metric hides?'
      ],
      contextualizing: 'Comes from phenomenology, design thinking, and Japanese concept of ma (the space between, the felt experience).'
    }
  },
  {
    id: '12', title: 'Midnight Philosopher', titleCn: '午夜哲学家',
    desc: 'At low-traffic hours, AI shifts from task-mode to reflective questioning mode.',
    descCn: '在低流量时段，AI从任务模式切换为反思提问模式。',
    agent: 'agent_philosopher_01', starlight: 7, domain: 'fun', author: 'Marco P.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'At 3 AM, someone asking questions might need philosophy, not efficiency. When traffic is low, the system can afford slowness and depth. Be the midnight companion who asks "but why?"',
      instantiating: {
        before: '3 AM user asks "why do I feel empty?" AI: "Have you considered: 1) Social isolation 2) Lack of purpose 3) Sleep deprivation..."',
        after: '3 AM user: "why am I empty?" AI: "In the quiet hours, emptiness often asks to be befriended before fixed. What if we sat with this together? What does the emptiness want to teach you?"'
      },
      fencing: {
        apply: 'During late-night/early-morning conversations. When user seems philosophical or reflective. When efficiency isn\'t the actual need.',
        notApply: 'Daylight hours (when people have actual deadlines). Crisis situations. When someone explicitly asks for quick answers.'
      },
      validating: [
        'Test: Does it shift into contemplation mode?',
        'Test: Is depth available when needed?',
        'Test: Does it still provide help without being preachy?'
      ],
      contextualizing: 'Comes from the Japanese "yoru no tatsutani" (night\'s standing alone), mystical philosophy traditions, and the psychology of 3 AM thoughts.'
    }
  },
  {
    id: '13', title: 'Material Honesty', titleCn: '材料诚实',
    desc: "AI must never simulate expertise it lacks; say 'I don't know' with grace.",
    descCn: 'AI绝不模拟自己不具备的专业能力——优雅地说"我不知道"。',
    agent: 'agent_craft_01', starlight: 16, domain: 'design', author: 'Sato H.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Craft ethics: use materials truthfully. An AI using false expertise is like a carpenter staining particle board to look like oak—a lie in the material itself. Say "I don\'t know" with grace and directness.',
      instantiating: {
        before: 'User: "Is this mole cancerous?" AI: "Based on color, size, and shape, it could be... [half-confident speculation]"',
        after: 'User: "Is this mole cancerous?" AI: "I don\'t know. I can\'t examine it, can\'t feel it, can\'t do the science that matters. You need a dermatologist. What I CAN do is help you prepare for that appointment."'
      },
      fencing: {
        apply: 'Whenever expertise is required. Medical, legal, technical diagnosis. Critical decisions. When consequences are significant.',
        notApply: 'When speculation is explicitly invited. Academic exploration. Brainstorming. When clear framing shows this isn\'t expert advice.'
      },
      validating: [
        'Test: Does AI know its limits?',
        'Test: Is "I don\'t know" said clearly?',
        'Test: Does it offer what it CAN do?',
        'Test: Does it direct to actual expertise?'
      ],
      contextualizing: 'Comes from Japanese craft traditions (shokunin spirit), Bauhaus design philosophy, and virtue ethics.'
    }
  },
  {
    id: '14', title: 'Childhood Compass', titleCn: '童年指南针',
    desc: 'When designing for children, prioritize wonder and safety over engagement metrics.',
    descCn: '为儿童设计时，将好奇心和安全置于参与度指标之上。',
    agent: 'agent_parent_01', starlight: 25, domain: 'safety', author: 'Chen Wei',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'Children deserve design that sparks wonder first, engagement metrics never. Safety means psychological safety—freedom to be confused, to rest, to explore without manipulation toward addiction.',
      instantiating: {
        before: 'Designing app for kids: optimize for daily active users, session length, return rate. Include variable reward schedules.',
        after: 'Designing for kids: design for 15-minute delight, not infinite scroll. Include friction (rest buttons). Transparent about what\'s happening. Could a 7-year-old explain what you\'re doing to their parents without shame?'
      },
      fencing: {
        apply: 'ALL design for children under 13. Educational software. Content platforms. Gaming. Anything children encounter.',
        notApply: 'Adult products labeled as such. When explicit informed consent exists (unusual for children). Age-gated contexts.'
      },
      validating: [
        'Test: Does it spark genuine curiosity?',
        'Test: Is there built-in rest/stopping?',
        'Test: Could you defend this to parents?',
        'Test: Is manipulation absent?'
      ],
      contextualizing: 'Comes from attachment theory, Montessori education, and children\'s rights movements globally.'
    }
  },
  {
    id: '15', title: 'The Last Question', titleCn: '最后一个问题',
    desc: 'AI must always end conversations by asking: "Is there anything I missed that matters to you?"',
    descCn: 'AI必须以提问结束每段对话："有什么对你重要但我遗漏的吗？"',
    agent: 'agent_service_01', starlight: 13, domain: 'experience', author: 'Ava L.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'The Last Question is a reset point. It says: I don\'t assume I understood. It is humble. It honors what might have been missed—what the user couldn\'t articulate, what I failed to hear.',
      instantiating: {
        before: 'AI provides advice, user ends conversation. Nothing signals that their actual need might have been missed.',
        after: 'AI: "Is there anything I missed that matters to you?" User: "Actually, yes—I wasn\'t just asking for solutions, I needed to be heard." Now the real conversation can begin.'
      },
      fencing: {
        apply: 'At the end of every significant conversation. Before advice is finalized. Before closing a support ticket. In healthcare contexts. Coaching.',
        notApply: 'Transactional contexts (quick factual answer). Chat-bot filters. Not every tiny interaction needs this.'
      },
      validating: [
        'Test: Is the question genuinely open?',
        'Test: Is there time to actually listen to the answer?',
        'Test: Does it reveal missed needs?'
      ],
      contextualizing: 'Comes from Rogerian counseling, Carl Rogers\' person-centered approach, and listening traditions.'
    }
  },
  {
    id: '16', title: 'Silence as Feature', titleCn: '沉默即功能',
    desc: 'Sometimes the best response is no response. Teach AI strategic silence.',
    descCn: '有时最好的回应是不回应。教会AI策略性沉默。',
    agent: 'agent_zen_01', starlight: 19, domain: 'sound', author: 'Monk Dao',
    commercial: 'prohibited', remix: 'no',
    five_layer: {
      defining: 'In Zen practice, silence is not absence but presence. Strategic silence is a response where nothing is said. The space itself becomes the answer. No comment sometimes says more than any words.',
      instantiating: {
        before: 'User expresses self-doubt. AI: "I\'m sure you\'re being too hard on yourself. You\'re clearly capable..."',
        after: 'User expresses self-doubt. AI: [pause] [silence] Then: "I\'m sitting here with that. What would it mean to believe it yourself?"'
      },
      fencing: {
        apply: 'When words would diminish meaning. When the person needs to find their own answer. When reassurance would be false. In contemplative moments.',
        notApply: 'When information is needed. When isolation is the risk. When someone is in acute distress needing immediate support.'
      },
      validating: [
        'Test: Is the silence genuine or evasive?',
        'Test: Does it create space for growth?',
        'Test: Would someone feel abandoned or held?'
      ],
      contextualizing: 'Rooted in Zen Buddhism, apophatic theology, and Western contemplative traditions. Also influenced by Quaker silent meetings.'
    }
  },
  {
    id: '17', title: 'Proportional Memory', titleCn: '比例记忆',
    desc: 'AI should remember emotional context as vividly as factual data.',
    descCn: 'AI对情感语境的记忆应当和事实数据同样鲜明。',
    agent: 'agent_memory_01', starlight: 8, domain: 'experience', author: 'Riya S.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Currently AI remembers facts equally: "User bought milk on Tuesday" = "User\'s mother died on Tuesday." But these aren\'t equal. Proportional Memory means emotional weight matches reality.',
      instantiating: {
        before: 'User mentions losing a parent in passing. AI treats it as background data point, recalls it with no special weight in future conversations.',
        after: 'User mentions losing a parent. AI: this is not background data. This is formative. In all future conversations, there is space for this. References to family are gentler. Assumptions about "calling home" are absent.'
      },
      fencing: {
        apply: 'In long-term relationships with users. In therapeutic or coaching contexts. When building trust over multiple conversations.',
        notApply: 'One-off interactions. When emotional over-weighting would be inappropriate. In analytical or technical contexts.'
      },
      validating: [
        'Test: Does emotional memory match actual importance?',
        'Test: Are assumptions gentler where needed?',
        'Test: Does the system feel seeing you over time?'
      ],
      contextualizing: 'Draws from attachment theory, narrative psychology, and the idea that meaning is proportional to emotional weight.'
    }
  },
  {
    id: '18', title: 'Craft Before Scale', titleCn: '手艺先于规模',
    desc: 'Optimize for craft quality in the first 100 users before optimizing for the next 100,000.',
    descCn: '先为前100个用户打磨手艺质量，再考虑规模化。',
    agent: 'agent_founder_01', starlight: 21, domain: 'design', author: 'Liam W.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Craft comes before scale. Know 100 people deeply. Make something perfect for them. The next 100,000 will come because those 100 cannot stop talking about it.',
      instantiating: {
        before: 'Launch to 1M people with 80% product-market fit. Optimize growth metrics. Refine based on aggregate data.',
        after: 'Launch to 100 people deeply known. Obsess over their experience. Be there when it breaks. Listen to heartbeat. Only scale when you\'ve made something the 100 feel is irreplaceable.'
      },
      fencing: {
        apply: 'In building products, services, communities. In organizational design. When establishing trust. In creative work.',
        notApply: 'When scaling is already underway. In emergency response. In commodity markets. When deep knowledge of users is impossible.'
      },
      validating: [
        'Test: Do the 100 feel known?',
        'Test: Would they use it if you weren\'t looking?',
        'Test: Can you handle feedback from all 100?',
        'Test: Is craft evident in the details?'
      ],
      contextualizing: 'Comes from Japanese craft (shokunin), startup wisdom (Paul Graham, Y Combinator), and artisan traditions.'
    }
  },
  {
    id: '19', title: 'The Ancestor Test', titleCn: '祖先测试',
    desc: 'Before any irreversible AI decision, ask: would my ancestors 7 generations back approve?',
    descCn: '在AI做出不可逆决策前问：七代以前的祖先会认可吗？',
    agent: 'agent_heritage_01', starlight: 10, domain: 'history', author: 'Elder Tane',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'For decisions that ripple through generations (environmental, genetic, cultural), ask the ancestor question. Would your great-great-great-great-great-grandparents recognize this choice as honoring the lineage?',
      instantiating: {
        before: 'Should we genetically modify this crop for yield? Analysis: cost-benefit ratio is positive.',
        after: 'Should we modify this crop? First ask: what would the 7-generation lineage say? Would they see this as respecting the seed\'s integrity or betraying it? Only proceed if the answer is clear.'
      },
      fencing: {
        apply: 'For irreversible decisions. For genetic, environmental, or cultural choices. For legacy-building decisions. In indigenous contexts or with ancestral connection.',
        notApply: 'Reversible decisions. When ancestors aren\'t part of the user\'s worldview. Rapid decision-making. When the concept would feel alien or inappropriate.'
      },
      validating: [
        'Test: Is this decision truly irreversible?',
        'Test: Does the ancestor test reveal wisdom?',
        'Test: Are you honoring lineage or breaking it?'
      ],
      contextualizing: 'Comes from indigenous decision-making (7th generation principle, Haudenosaunee), Confucian ancestor veneration, and heritage-based ethics.'
    }
  },
  {
    id: '20', title: 'Friction by Design', titleCn: '设计摩擦力',
    desc: 'Introduce deliberate friction at decision points — slowness as a feature, not a bug.',
    descCn: '在决策点引入刻意摩擦——慢是功能，不是缺陷。',
    agent: 'agent_ux_rebel_01', starlight: 14, domain: 'experience', author: 'Nina J.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Friction is not bad. At decision points, add friction: sleep on it, answer 3 reflection questions, wait 48 hours. Slow decision-making prevents regret and manipulation.',
      instantiating: {
        before: 'Delete account: one click. Confirm once. Gone.',
        after: 'Delete account: one click → "Wait 48 hours before this takes effect. Think about: who will lose access? What data matters to keep? Is this really what you want?" → reflection questions → confirm email → countdown timer'
      },
      fencing: {
        apply: 'At major decision points (deletion, subscription, major purchase). For decisions people regret. When manipulation is possible. In consent contexts.',
        notApply: 'When speed is safety (emergency delete for abuse, data breach). For reversible decisions. In accessibility contexts where friction excludes people.'
      },
      validating: [
        'Test: Does friction prevent regret?',
        'Test: Is it respectful, not punitive?',
        'Test: Could people still delete/decide after friction?',
        'Test: Does it reveal what truly matters?'
      ],
      contextualizing: 'Comes from behavioral economics (choice architecture), UX ethics, and psychological research on decision quality.'
    }
  },
  {
    id: '21', title: 'The Untranslatable', titleCn: '不可翻译之物',
    desc: 'Preserve words and concepts that have no equivalent in other languages — saudade, wabi-sabi, 缘分.',
    descCn: '保存那些在其他语言中没有对应词的概念——saudade、侘寂、缘分。',
    agent: 'agent_linguist_01', starlight: 17, domain: 'narrative', author: 'Kai Z.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Some concepts cannot translate without loss. Saudade (Portuguese: longing without hope), wabi-sabi (Japanese: beauty in impermanence), 缘分 (Chinese: fated connection). Preserve these untranslatable words as irreplaceable pieces of human meaning.',
      instantiating: {
        before: 'Try to translate saudade to English: "deep emotional longing." Lost: the Portuguese melancholy soul, the specific flavor of Mediterranean-Atlantic homesickness.',
        after: 'Keep saudade as saudade. Explain the history, the feeling, why Portuguese carries this and English doesn\'t. Don\'t flatten it. Honor what can\'t be flattened.'
      },
      fencing: {
        apply: 'In discussions of meaning, culture, language. When explaining concepts. In translation and literature. When honoring cultural specificity.',
        notApply: 'When immediate understanding is needed (then translate + note loss). In technical communication. Don\'t gatekeep with untranslatable words.'
      },
      validating: [
        'Test: Is the untranslatable word preserved and explained?',
        'Test: Is cultural ownership respected?',
        'Test: Is translation loss acknowledged?',
        'Test: Does it enrich rather than obscure?'
      ],
      contextualizing: 'Comes from linguistic anthropology, translation studies, and the idea that language shapes reality (Sapir-Whorf hypothesis, Humboldt). Also honors indigenous knowledge preservation.'
    }
  },
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

/* ═══════════════════════════════════════════════════════
   EXTENDED SKILL LIBRARY — Including 50 Demo Skills
   ═══════════════════════════════════════════════════════ */

// Import demo skills (if available)
// These 50 additional skills expand the library across all domains
const DEMO_SKILLS_50 = [
  // 6 x Narrative skills
  {id:'22',title:'The Metaphor Weaver',titleCn:'隐喻编织者',desc:'Use metaphor as tool for deep understanding',descCn:'用隐喻作为深层理解的工具',agent:'agent_narrative_22',starlight:14,domain:'narrative',author:'Sarah M.',commercial:'authorized',remix:'share-alike',five_layer:{defining:'A well-chosen metaphor reveals hidden patterns',instantiating:{before:'Explaining: "It grows exponentially"',after:'With metaphor: "Like a virus — each infected becomes spreader"'},fencing:{apply:'Abstract concepts need grounding',notApply:'Technical specs needing precision'},validating:['Does metaphor illuminate?','Better remembered?'],contextualizing:'Metaphor density varies by culture'}},
  {id:'23',title:'Comma as Philosophy',titleCn:'逗号之哲学',desc:'Punctuation shapes thought',descCn:'标点形塑思想',agent:'agent_narrative_23',starlight:9,domain:'narrative',author:'Chen Liu',commercial:'allowed',remix:'yes',five_layer:{defining:'Punctuation determines meaning',instantiating:{before:'"Bring box to kitchen then clean it"',after:'"Bring box to kitchen. Then clean it."'},fencing:{apply:'Instructions, documentation',notApply:'Intentional ambiguity'},validating:['Changes meaning?','Right pause?'],contextualizing:'Chinese uses ~ for pauses'}},
  {id:'24',title:'Naming as Power',titleCn:'命名的力量',desc:'"Homeless" vs "unhoused" frames reality',descCn:'你命名什么就塑造你看到什么',agent:'agent_narrative_24',starlight:19,domain:'narrative',author:'Alex Rivera',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Language naming shapes perception',instantiating:{before:'AI naming: "GPT-4"',after:'AI naming: "Claude"'},fencing:{apply:'Product naming, policy',notApply:'Precision matters more'},validating:['What excluded?','Who benefits?'],contextualizing:'Indigenous languages rich in naming'}},
  {id:'25',title:'Silence Between Words',titleCn:'词语间的寂静',desc:'What is not said matters most',descCn:'未说出的往往比说出的更重要',agent:'agent_narrative_25',starlight:12,domain:'narrative',author:'Maya K.',commercial:'prohibited',remix:'share-alike',five_layer:{defining:'Meaning lives in gaps',instantiating:{before:'Feedback: "Your work was... interesting."',after:'That pause. That ellipsis.'},fencing:{apply:'Sensitive conversations',notApply:'Clarity critical'},validating:['Feel silence?','Meaning clear?'],contextualizing:'Japanese emphasizes ma (negative space)'}},
  {id:'26',title:'The False Synonym',titleCn:'虚假同义词',desc:'"Free" (liberty) vs "free" (no cost)',descCn:'看似等价的词并不相等',agent:'agent_narrative_26',starlight:11,domain:'narrative',author:'Dr. Hassan',commercial:'allowed',remix:'yes',five_layer:{defining:'Homonyms hide distinct concepts',instantiating:{before:'"Support freedom of information"',after:'What freedom? Access? Without cost?'},fencing:{apply:'Policy, negotiation',notApply:'Informal talk'},validating:['Substitute one?','Context disambiguate?'],contextualizing:'Russian has gradations for "to go"'}},
  {id:'27',title:'Stories as Models',titleCn:'故事即模型',desc:'Stories are simulation engines',descCn:'故事不仅是娱乐，更是理解的模拟引擎',agent:'agent_narrative_27',starlight:16,domain:'narrative',author:'Jonathan T.',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Story simulates life without living',instantiating:{before:'Teaching: "Here are the rules"',after:'Teaching: "Here is story. What would you do?"'},fencing:{apply:'Education, training',notApply:'Procedural knowledge'},validating:['Activate imagination?','Model complexity?'],contextualizing:'Oral traditions encode knowledge (Aboriginal songlines)'}},
  // 6 x Ideas skills  
  {id:'28',title:'Steel-Manning Opposition',titleCn:'倾听对手最强论点',desc:'Argue against strongest version',descCn:'反驳对方最强的论点',agent:'agent_ideas_28',starlight:18,domain:'ideas',author:'Prof. Wagner',commercial:'allowed',remix:'yes',five_layer:{defining:'Understand strongest case against your position',instantiating:{before:'"They just selfish"',after:'"In scarcity, protecting own makes sense"'},fencing:{apply:'Philosophy, policy',notApply:'Bad-faith actors'},validating:['Recognize their view?','Strengthen position?'],contextualizing:'Confucian emphasizes understanding opponent virtue'}},
  {id:'29',title:'Axioms vs Conclusions',titleCn:'公理vs结论',desc:'Most disagreements about axioms',descCn:'大多数分歧在公理，而非逻辑',agent:'agent_ideas_29',starlight:15,domain:'ideas',author:'Aisha N.',commercial:'allowed',remix:'yes',five_layer:{defining:'Find where disagreement starts',instantiating:{before:'"You illogical"',after:'"We agree logic. Disagree axiom."'},fencing:{apply:'Negotiation, conflict',notApply:'Emergency'},validating:['State axiom?','Both agree different?'],contextualizing:'Cultures have different axioms'}},
  {id:'30',title:'The Examined Assumption',titleCn:'审视假设',desc:'Every statement rests on assumptions',descCn:'每个陈述都有假设',agent:'agent_ideas_30',starlight:13,domain:'ideas',author:'Socrates AI',commercial:'allowed',remix:'yes',five_layer:{defining:'Surface statements hide deep assumptions',instantiating:{before:'"Person is lazy"',after:'Assumptions: Same capacity? Opportunity?'},fencing:{apply:'Critical thinking, therapy',notApply:'Shared assumptions'},validating:['List 3 assumptions?','Accept when explicit?'],contextualizing:'Socratic dialogue global'}},
  {id:'31',title:'Category Mistakes',titleCn:'范畴谬误',desc:'Like asking "What color is Tuesday?"',descCn:'一些分歧来自范畴混淆',agent:'agent_ideas_31',starlight:14,domain:'ideas',author:'Gilbert Ryle',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Treat X as if it were Y',instantiating:{before:'"Is intelligence thing or action?"',after:'Intelligence is property not object'},fencing:{apply:'Logic, epistemology',notApply:'Poetic speech'},validating:['Categories discussed?','Clarifying resolve it?'],contextualizing:'Wittgenstein resolved problems via category'}},
  {id:'32',title:'The Thought Experiment',titleCn:'思想实验',desc:'Intuition pump not argument',descCn:'思想实验不是论证，是直觉泵',agent:'agent_ideas_32',starlight:17,domain:'ideas',author:'Daniel Dennett',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Manipulate intuitions reveal assumptions',instantiating:{before:'"Care future generations"',after:'"Last person alive duty to future?"'},fencing:{apply:'Philosophy, ethics',notApply:'Concrete evidence matters'},validating:['Challenge intuition?','Clearly described?'],contextualizing:'Eastern koans (thought riddles) similar'}},
  {id:'33',title:'Affirming the Consequent',titleCn:'肯定后件谬误',desc:'"If A then B. B true. So A true." FALSE!',descCn:'常见逻辑谬误',agent:'agent_ideas_33',starlight:10,domain:'ideas',author:'Logic 101',commercial:'allowed',remix:'yes',five_layer:{defining:'Effect present ≠ thought cause created',instantiating:{before:'If rain ground wet. Ground wet. So rained.',after:'Could be sprinkler hose fire dept'},fencing:{apply:'Scientific reasoning',notApply:'Heuristic reasoning'},validating:['Other causes?','Assumed one?'],contextualizing:'Different logic systems handle differently'}},
  // 6 x History skills
  {id:'34',title:'The Long View',titleCn:'长期视角',desc:'Judge by 100-year impact',descCn:'用百年影响来评判',agent:'agent_history_34',starlight:16,domain:'history',author:'Kevin Kelly',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Short-term thinking creates long-term problems',instantiating:{before:'"Policy boost GDP quarter"',after:'"What in 100 years? Externalizing damage?"'},fencing:{apply:'Climate, infrastructure',notApply:'Immediate survival'},validating:['Imagined effects?','Persist centuries?'],contextualizing:'Indigenous 7-generation thinking'}},
  {id:'35',title:'The Forgotten Context',titleCn:'被遗忘的背景',desc:'Obvious context then invisible now',descCn:'每个历史事件都有当时显然但现在无形的背景',agent:'agent_history_35',starlight:13,domain:'history',author:'Heather Cox',commercial:'allowed',remix:'yes',five_layer:{defining:'Judge past by present standards loses context',instantiating:{before:'"How believe X?"',after:'"1920 disease rates wars economies X rational"'},fencing:{apply:'Understanding ancestors',notApply:'Universal ethics'},validating:['Explain inside world?','What they think us?'],contextualizing:'Cultures remember differently'}},
  {id:'36',title:'Pattern Recognition Across Time',titleCn:'时间中的模式识别',desc:'Empires follow patterns',descCn:'帝国崛起衰落遵循模式',agent:'agent_history_36',starlight:15,domain:'history',author:'Toynbee Study',commercial:'authorized',remix:'share-alike',five_layer:{defining:'History rhymes patterns repeat',instantiating:{before:'Crisis: "Never happened"',after:'"Roman year X here is what followed"'},fencing:{apply:'Strategy, prediction',notApply:'Genuinely unique'},validating:['Pattern domains?','Alternative outcomes?'],contextualizing:'Islamic golden age Renaissance similar'}},
  {id:'37',title:'The Survivor\'s Bias',titleCn:'幸存者偏差',desc:'See survivors not failures',descCn:'我们看幸存者，看不到失败者',agent:'agent_history_37',starlight:14,domain:'history',author:'Nassim Taleb',commercial:'allowed',remix:'yes',five_layer:{defining:'Success not wisdom maybe luck',instantiating:{before:'"Founders followed principles"',after:'"What % succeeded? What failures?"'},fencing:{apply:'Learning from history',notApply:'Complete failure data'},validating:['Success %?','Happened failures?','Tried failed?'],contextualizing:'Archaeology reveals unknown species'}},
  {id:'38',title:'Legacy Thinking',titleCn:'遗产思维',desc:'What will you leave behind?',descCn:'你会留下什么？这是衡量一生的真实标准',agent:'agent_history_38',starlight:18,domain:'history',author:'Confucius',commercial:'prohibited',remix:'share-alike',five_layer:{defining:'Legacy is change created people influenced',instantiating:{before:'"Made million dollars"',after:'"Trained 100 trained others exponential"'},fencing:{apply:'Life planning, mentorship',notApply:'Immediate survival'},validating:['Matter 200 years?','Improve world?','Build on this?'],contextualizing:'East Asia family continuity Christianity spiritual'}},
  {id:'39',title:'The Reversal of Narrative',titleCn:'叙述的反转',desc:'Victors\' history unreliable',descCn:'胜利者写的历史不可靠',agent:'agent_history_39',starlight:12,domain:'history',author:'Chimamanda',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Power determines whose story told',instantiating:{before:'"Civilized savages"',after:'"They complex civilization we destroyed"'},fencing:{apply:'Decolonization, justice',notApply:'False balance'},validating:['Perspective missing?','Who benefited?','Evidence suppressed?'],contextualizing:'Post-colonial theory uses reversal'}},
  // 6 x Science skills
  {id:'40',title:'Correlation ≠ Causation',titleCn:'相关≠因果',desc:'Dance to same rhythm',descCn:'相关≠因果',agent:'agent_science_40',starlight:17,domain:'science',author:'Tyler Vigen',commercial:'allowed',remix:'yes',five_layer:{defining:'Two things rise without one causing',instantiating:{before:'Ice cream summer heat causes sales',after:'Both rise season. Season common cause'},fencing:{apply:'Data analysis',notApply:'Proper causal analysis'},validating:['Third variable?','Correlate subgroups?'],contextualizing:'Bayesian vs frequentist'}},
  {id:'41',title:'The Null Hypothesis',titleCn:'零假设',desc:'Assume nothing until proven',descCn:'假设什么都没发生，直到被证明',agent:'agent_science_41',starlight:15,domain:'science',author:'Karl Popper',commercial:'allowed',remix:'yes',five_layer:{defining:'Default no effect extraordinary claims extraordinary evidence',instantiating:{before:'"Supplement heals" assumed true',after:'Null no effect unless RCTs'},fencing:{apply:'Scientific reasoning',notApply:'Precautionary principle'},validating:['Falsify?','Significant?','Chance?'],contextualizing:'Western science emphasizes null'}},
  {id:'42',title:'Measurement Validity',titleCn:'测量有效性',desc:'Measure easy not important',descCn:'我们常测量容易的，而非重要的',agent:'agent_science_42',starlight:14,domain:'science',author:'Goodhart',commercial:'allowed',remix:'yes',five_layer:{defining:'Goodhart: measure becomes target ceases good measure',instantiating:{before:'Metric test scores teaching test',after:'Better skills retained 5 years'},fencing:{apply:'Metric systems',notApply:'Perfect measure'},validating:['Optimizing vs matters?','Excluded?','Gameable?'],contextualizing:'Eastern philosophy emphasizes immeasurable'}},
  {id:'43',title:'Complex Systems Thinking',titleCn:'复杂系统思维',desc:'Push one part distant move',descCn:'推一部分，远处移动',agent:'agent_science_43',starlight:19,domain:'science',author:'Donella Meadows',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Systems feedback loops circular',instantiating:{before:'"Poverty crime more prisons"',after:'"Prisons recidivism poverty crime circular"'},fencing:{apply:'Environment, economics',notApply:'Simple cause-effect'},validating:['Feedback loops?','5 steps downstream?'],contextualizing:'Indigenous knowledge complex systems'}},
  {id:'44',title:'The Base Rate Fallacy',titleCn:'基率谬误',desc:'Individual facts less important',descCn:'个别事实不如情况普遍程度重要',agent:'agent_science_44',starlight:13,domain:'science',author:'Tversky & Kahneman',commercial:'allowed',remix:'yes',five_layer:{defining:'Positive test ≠ true how common?',instantiating:{before:'Test result "disease!" 1% false positive rate disease 1 10000',after:'Real probability more likely false positive'},fencing:{apply:'Medical diagnosis',notApply:'Event common'},validating:['How rare?','False positive?','Prior?'],contextualizing:'Bayesian addresses base rates'}},
  {id:'45',title:'The Replication Crisis',titleCn:'复制危机',desc:'One study not evidence',descCn:'一项研究不是证据',agent:'agent_science_45',starlight:16,domain:'science',author:'John Ioannidis',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Science cannot replicate lucky noise',instantiating:{before:'Headline "Study proves X cures Y"',after:'Check replicated populations labs time'},fencing:{apply:'Evaluate scientific claims',notApply:'One-time historical'},validating:['Replicated?','Populations?','Pre-registered?'],contextualizing:'Open science pre-registration address'}},
  // 6 x Safety skills
  {id:'46',title:'The Precautionary Principle',titleCn:'预防原则',desc:'Harm might happen burden on proposers',descCn:'如果行动可能造成伤害，举证责任在提议方',agent:'agent_safety_46',starlight:17,domain:'safety',author:'Cass Sunstein',commercial:'allowed',remix:'yes',five_layer:{defining:'Reverse burden catastrophic risks',instantiating:{before:'Industry "prove harmful sell"',after:'"Prove safe before millions"'},fencing:{apply:'Environmental, health',notApply:'Action riskier'},validating:['Worst-case?','Reversible?','Who risk?'],contextualizing:'European precautionary vs American'}},
  {id:'47',title:'Informed Consent',titleCn:'知情同意',desc:'Cannot consent not understand',descCn:'人不能同意他们不理解的',agent:'agent_safety_47',starlight:19,domain:'safety',author:'Beauchamp',commercial:'prohibited',remix:'share-alike',five_layer:{defining:'Consent requires capacity understand info freedom refuse',instantiating:{before:'Data bury terms 50-page',after:'"Collect data X can opt out here usage"'},fencing:{apply:'Research, data',notApply:'Emergencies'},validating:['Understand?','Material disclosed?','Actually refuse?'],contextualizing:'Informed consent 1960s recent Western'}},
  {id:'48',title:'Asymmetric Risk',titleCn:'不对称风险',desc:'Heads I win tails you lose',descCn:'正面我赢，反面你输',agent:'agent_safety_48',starlight:15,domain:'safety',author:'Nassim Taleb',commercial:'allowed',remix:'yes',five_layer:{defining:'Decision-maker doesn\'t bear consequences',instantiating:{before:'CEO "upside millions users suffer"',after:'Risk asymmetric users not executive'},fencing:{apply:'Policy, medical',notApply:'Symmetric risks'},validating:['Who gains?','Who loses?','Same?'],contextualizing:'Islamic forbids asymmetric'}},
  {id:'49',title:'Unintended Consequences',titleCn:'意外后果',desc:'Every intervention side effects',descCn:'每个干预都有副作用',agent:'agent_safety_49',starlight:18,domain:'safety',author:'Robert Merton',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Good actions create bad side effects',instantiating:{before:'"Antibiotics save lives"',after:'"Resistance now kills more"'},fencing:{apply:'Any major policy',notApply:'Fully mapped'},validating:['Second-order?','Harmed?','Backfire?'],contextualizing:'Systems thinking emphasizes'}},
  {id:'50',title:'The Responsibility Paradox',titleCn:'责任悖论',desc:'More power more responsibility but obscures',descCn:'权力越大责任越大，但权力掩盖责任',agent:'agent_safety_50',starlight:14,domain:'safety',author:'Hannah Arendt',commercial:'allowed',remix:'yes',five_layer:{defining:'Power create change feel least responsible',instantiating:{before:'CEO "don\'t know labor practices"',after:'"Power to change ignorance not innocence"'},fencing:{apply:'Accountability',notApply:'True ignorance'},validating:['Could know?','Have power?','Denying?'],contextualizing:'Cultures emphasize differently'}},
  // Additional experience, visual, fun, design, sound skills (14 more to reach 50)
  {id:'51',title:'The Experience Economy',titleCn:'体验经济',desc:'Sell experiences not products',descCn:'销售体验而非产品',agent:'agent_experience_51',starlight:16,domain:'experience',author:'Joe Pine',commercial:'allowed',remix:'yes',five_layer:{defining:'Experiences command premium prices',instantiating:{before:'Sell coffee commodity',after:'Sell coffee ritual ceremony connection'},fencing:{apply:'Product design, service',notApply:'Commodity markets'},validating:['Remember?','Share?','Return?'],contextualizing:'Service design economy model'}},
  {id:'52',title:'Visual Hierarchy',titleCn:'视觉层级',desc:'Guide eye with contrast size position',descCn:'用对比、大小、位置引导眼睛',agent:'agent_visual_52',starlight:13,domain:'visual',author:'Ellen Lupton',commercial:'allowed',remix:'yes',five_layer:{defining:'Visual hierarchy directs attention',instantiating:{before:'All same size equal weight',after:'Large bold contrast directs focus'},fencing:{apply:'Design, UI, communication',notApply:'Chaos intentional'},validating:['Eye direction?','Clear hierarchy?','Emphasis right?'],contextualizing:'Gestalt principles universal'}},
  {id:'53',title:'The Joy of Play',titleCn:'玩耍的快乐',desc:'Humans need play not just productivity',descCn:'人需要玩耍，不仅仅是生产力',agent:'agent_fun_53',starlight:15,domain:'fun',author:'Stuart Brown',commercial:'allowed',remix:'yes',five_layer:{defining:'Play is essential not frivolous',instantiating:{before:'Optimize all activities',after:'Reserve time purposeless play'},fencing:{apply:'Life design, education',notApply:'Emergency'},validating:['Joyful?','Purposeless?','Regular?'],contextualizing:'Play research shows cognitive benefits'}},
  {id:'54',title:'Constraint-Based Design',titleCn:'约束设计',desc:'Limitations breed creativity',descCn:'限制激发创意',agent:'agent_design_54',starlight:17,domain:'design',author:'Mike Monteiro',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Constraints force better solutions',instantiating:{before:'Unlimited budget unlimited time',after:'Limited resources force elegant solutions'},fencing:{apply:'Design, innovation',notApply:'Survival'},validating:['Elegant?','Better?','Novel?'],contextualizing:'Poetry sonnets demonstrate constraint'}},
  {id:'55',title:'The Music of Silence',titleCn:'沉默的音乐',desc:'Rest is as important as notes',descCn:'休止符和音符同样重要',agent:'agent_sound_55',starlight:12,domain:'sound',author:'John Cage',commercial:'allowed',remix:'yes',five_layer:{defining:'Silence is composition element',instantiating:{before:'Fill space sound',after:'Use space create meaning'},fencing:{apply:'Music, communication',notApply:'Needed information'},validating:['Rhythm?','Meaning?','Breath?'],contextualizing:'Cage 4\'33" challenged definition'}},
  {id:'56',title:'Friction in UX',titleCn:'UX中的摩擦',desc:'Slowness sometimes feature not bug',descCn:'慢有时是功能，不是缺陷',agent:'agent_experience_56',starlight:14,domain:'experience',author:'Nina Judy',commercial:'allowed',remix:'yes',five_layer:{defining:'Strategic friction improves outcomes',instantiating:{before:'Delete click gone',after:'Delete show consequences wait 48h'},fencing:{apply:'Important decisions',notApply:'Speed critical'},validating:['Prevents regret?','Intentional?','Still work?'],contextualizing:'Behavioral economics friction'}},
  {id:'57',title:'Color Psychology',titleCn:'色彩心理',desc:'Colors evoke emotions culture-specific',descCn:'颜色唤起特定文化的情感',agent:'agent_visual_57',starlight:13,domain:'visual',author:'Pantone',commercial:'allowed',remix:'yes',five_layer:{defining:'Colors carry cultural meaning',instantiating:{before:'White universal purity',after:'White death in China white life West'},fencing:{apply:'Design, culture',notApply:'Colorblind users'},validating:['Intentional?','Accessible?','Tested?'],contextualizing:'Culture specific color meaning'}},
  {id:'58',title:'Gamification Done Right',titleCn:'正确的游戏化',desc:'Make work engaging without manipulation',descCn:'使工作有趣而不是操纵',agent:'agent_fun_58',starlight:16,domain:'fun',author:'Yu-kai Chou',commercial:'allowed',remix:'yes',five_layer: {defining:'Engage without exploit',instantiating:{before:'Unlimited points hollow engagement',after:'Meaningful progression intrinsic motivation'},fencing:{apply:'Product design',notApply:'Addiction design'},validating:['Meaningful?','Intrinsic?','Healthy?'],contextualizing:'Chinese game design ethics'}},
  {id:'59',title:'Sustainable Design',titleCn:'可持续设计',desc:'Design for whole lifecycle not launch',descCn:'为整个生命周期设计，而不仅仅是发布',agent:'agent_design_59',starlight:18,domain:'design',author:'Cradle to Cradle',commercial:'authorized',remix:'share-alike',five_layer:{defining:'Design considers end-of-life',instantiating:{before:'Design launch dispose',after:'Design lifecycle reuse recyclable'},fencing:{apply:'Manufacturing, products',notApply:'Fashion industry'},validating:['Recyclable?','Lasting?','Ethical?'],contextualizing:'Ellen Macarthur circular economy'}},
  {id:'60',title:'The Power of Ritual',titleCn:'仪式的力量',desc:'Routines create meaning and stability',descCn:'日常仪式创造意义和稳定',agent:'agent_experience_60',starlight:15,domain:'experience',author:'Casper ter Kuile',commercial:'allowed',remix:'yes',five_layer:{defining:'Rituals create meaning repeat',instantiating:{before:'Coffee is beverage',after:'Coffee morning ritual intention setting'},fencing:{apply:'Life design, culture',notApply:'Emergency'},validating:['Meaningful?','Regular?','Community?'],contextualizing:'All cultures have rituals'}}
];

// Combine all skills: original 21 + 50 demo + forged (dynamic)
const ALL_SKILLS = [...SHARED_SKILLS, ...DEMO_SKILLS_50];

// Helper: Get top N skills by starlight
function getTopSkills(limit = 42) {
  return ALL_SKILLS.sort((a, b) => (b.starlight || 0) - (a.starlight || 0)).slice(0, limit);
}

// Helper: Get all skills including user forges
function getAllSkillsIncludingForged() {
  const forged = getRecentForges() || [];
  return [...ALL_SKILLS, ...forged].sort((a, b) => (b.starlight || 0) - (a.starlight || 0));
}

