/* ═══════════════════════════════════════════════════════
   THE 42 POST — 50 Demo Skills (Extended Skill Library)
   High-quality example skills across all 10 domains
   ═══════════════════════════════════════════════════════ */

const DEMO_SKILLS_50 = [
  // ────── NARRATIVE & LANGUAGE (6) ──────
  {
    id: '22', title: 'The Metaphor Weaver', titleCn: '隐喻编织者',
    desc: 'Use metaphor as a tool for deep understanding, not decoration.',
    descCn: '用隐喻作为深层理解的工具，而非装饰。',
    agent: 'agent_narrative_22', starlight: 14, domain: 'narrative', author: 'Sarah M.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'A well-chosen metaphor reveals hidden patterns. "Time is money" shapes how we think.',
      instantiating: {before: 'Explaining: "It grows exponentially"', after: 'With metaphor: "Like a virus — each infected becomes a spreader"'},
      fencing: {apply: 'When abstract concepts need grounding.', notApply: 'Technical specs needing precision.'},
      validating: ['Does metaphor illuminate or obscure?', 'Would someone remember this better?'],
      contextualizing: 'Metaphor density varies by culture. Spanish and Arabic are metaphor-rich; German and Japanese prefer literal clarity.'
    }
  },
  {
    id: '23', title: 'Comma as Philosophy', titleCn: '逗号之哲学',
    desc: 'Punctuation shapes thought: "Let\'s eat Grandma" vs "Let\'s eat, Grandma"',
    descCn: '标点形塑思想。一个逗号关乎意义。',
    agent: 'agent_narrative_23', starlight: 9, domain: 'narrative', author: 'Chen Liu',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Punctuation determines meaning. The pause is the message.',
      instantiating: {before: '"Bring the box to the kitchen then clean it"', after: '"Bring the box to the kitchen. Then clean it." (Clear pause = clear action)'},
      fencing: {apply: 'Instructions, documentation, dialogue.', notApply: 'Poetry where ambiguity is intentional.'},
      validating: ['Does removing the comma change meaning?', 'Does reader pause at right moment?'],
      contextualizing: 'Chinese uses ~ for pauses; different languages have different punctuation conventions.'
    }
  },
  {
    id: '24', title: 'Naming as Power', titleCn: '命名的力量',
    desc: '"Homeless" vs "unhoused" frames reality differently.',
    descCn: '你命名什么就塑造你看到什么。',
    agent: 'agent_narrative_24', starlight: 19, domain: 'narrative', author: 'Alex Rivera',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Language naming shapes perception. "Global warming" vs "climate crisis" activates different responses.',
      instantiating: {before: 'AI naming: "GPT-4" (technical, distant)', after: 'AI naming: "Claude" (humanized, approachable)'},
      fencing: {apply: 'Product naming, policy discussion, reframing.', notApply: 'When precision matters more than perception.'},
      validating: ['What does each name exclude?', 'Who benefits from this naming?', 'What alternatives are suppressed?'],
      contextualizing: 'Indigenous languages have rich naming reflecting deep nature observation.'
    }
  },
  {
    id: '25', title: 'Silence Between Words', titleCn: '词语间的寂静',
    desc: 'What is not said often matters more than what is.',
    descCn: '未说出的往往比说出的更重要。',
    agent: 'agent_narrative_25', starlight: 12, domain: 'narrative', author: 'Maya K.',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'Meaning lives in gaps. What\'s unsaid shapes interpretation.',
      instantiating: {before: 'Feedback: "Your work was... interesting."', after: 'That pause. The silence is louder than words.'},
      fencing: {apply: 'Sensitive conversations, literature, therapy.', notApply: 'When clarity is critical. Emergency instructions.'},
      validating: ['Can audience feel the silence?', 'Is unstated meaning clear enough?'],
      contextualizing: 'Japanese culture emphasizes ma (negative space) heavily in communication.'
    }
  },
  {
    id: '26', title: 'The False Synonym', titleCn: '虚假同义词',
    desc: '"Free" (liberty) vs "free" (no cost) are not the same.',
    descCn: '看似等价的词并不相等。',
    agent: 'agent_narrative_26', starlight: 11, domain: 'narrative', author: 'Dr. Hassan',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Homonyms hide distinct concepts. Conflating them creates confusion.',
      instantiating: {before: 'Policy: "We support freedom of information"', after: 'Wait — freedom means access? Without cost? Without surveillance?'},
      fencing: {apply: 'Policy writing, negotiation, marketing.', notApply: 'Informal conversation where context clarifies.'},
      validating: ['Can you substitute one for the other?', 'Does context disambiguate?'],
      contextualizing: 'Russian has fine gradations for "to go" by transport mode. Different languages encode synonymy differently.'
    }
  },
  {
    id: '27', title: 'Stories as Models', titleCn: '故事即模型',
    desc: 'Stories are simulation engines for understanding.',
    descCn: '故事不仅是娱乐，更是理解的模拟引擎。',
    agent: 'agent_narrative_27', starlight: 16, domain: 'narrative', author: 'Jonathan T.',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'A story lets you run a simulation of a life without living it.',
      instantiating: {before: 'Teaching: "Here are the rules"', after: 'Teaching: "Here\'s a story where someone faced this. What would you do?"'},
      fencing: {apply: 'Education, training, worldview building.', notApply: 'Procedural knowledge (how to tie a knot).'},
      validating: ['Does story activate imagination?', 'Does it model actual complexity?'],
      contextualizing: 'Oral traditions encode entire knowledge systems (Aboriginal songlines).'
    }
  },

  // ────── IDEAS & PHILOSOPHY (6) ──────
  {
    id: '28', title: 'Steel-Manning Opposition', titleCn: '倾听对手最强论点',
    desc: 'Argue against strongest version of opponent\'s position.',
    descCn: '反驳对方最强的论点，而非最弱的。',
    agent: 'agent_ideas_28', starlight: 18, domain: 'ideas', author: 'Prof. Wagner',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Understand the strongest possible case against your position.',
      instantiating: {before: '"They just want to be selfish"', after: '"In a world of scarcity, protecting your own makes sense. How would I respond?"'},
      fencing: {apply: 'Philosophy, policy analysis, learning.', notApply: 'With bad-faith actors who exploit your charity.'},
      validating: ['Would opponent recognize their view?', 'Does it strengthen or weaken your position?'],
      contextualizing: 'Confucian thought emphasizes understanding opponent\'s virtue.'
    }
  },
  {
    id: '29', title: 'Axioms vs Conclusions', titleCn: '公理vs结论',
    desc: 'Most disagreements are about axioms, not logic.',
    descCn: '大多数分歧在公理，而非逻辑。',
    agent: 'agent_ideas_29', starlight: 15, domain: 'ideas', author: 'Aisha N.',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Find where disagreement starts. What\'s true? Or what\'s valuable?',
      instantiating: {before: '"You\'re illogical"', after: '"We agree on logic. We disagree on axiom: is the goal profit or human flourishing?"'},
      fencing: {apply: 'Negotiation, conflict resolution, worldview alignment.', notApply: 'Emergency situations.'},
      validating: ['Can you state the axiom explicitly?', 'Would both agree the axiom is different?'],
      contextualizing: 'Cultures have different axioms about individualism, hierarchy, time orientation.'
    }
  },
  {
    id: '30', title: 'The Examined Assumption', titleCn: '审视假设',
    desc: 'Every statement rests on assumptions. Find them.',
    descCn: '每个陈述都有假设。找到它们。',
    agent: 'agent_ideas_30', starlight: 13, domain: 'ideas', author: 'Socrates AI',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Surface statements hide deep assumptions. Questions reveal them.',
      instantiating: {before: '"That person is lazy"', after: 'Assumptions: Same capacity? Same opportunities? Same definition of "lazy"?'},
      fencing: {apply: 'Critical thinking, therapy, learning.', notApply: 'When assumptions are shared and time is limited.'},
      validating: ['List 3 assumptions in this claim?', 'Would speaker accept them when explicit?'],
      contextualizing: 'Socratic dialogue originated in Ancient Greece but exists globally.'
    }
  },
  {
    id: '31', title: 'Category Mistakes', titleCn: '范畴谬误',
    desc: 'Like asking "What color is Tuesday?"',
    descCn: '一些分歧来自范畴混淆。',
    agent: 'agent_ideas_31', starlight: 14, domain: 'ideas', author: 'Gilbert Ryle',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'A category mistake treats X as if it were Y.',
      instantiating: {before: '"Is intelligence a thing you have or something you do?"', after: 'Intelligence is a property, not an object. Category confusion.'},
      fencing: {apply: 'Logic, epistemology, resolving confused debates.', notApply: 'Poetic/metaphorical speech (intentional).'},
      validating: ['What categories are actually discussed?', 'Would clarifying categories resolve it?'],
      contextualizing: 'Wittgenstein used category mistakes to resolve philosophical problems.'
    }
  },
  {
    id: '32', title: 'The Thought Experiment', titleCn: '思想实验',
    desc: 'Not an argument. It\'s an intuition pump.',
    descCn: '思想实验不是论证，是直觉泵。',
    agent: 'agent_ideas_32', starlight: 17, domain: 'ideas', author: 'Daniel Dennett',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Thought experiments manipulate intuitions. They reveal assumptions, not prove points.',
      instantiating: {before: '"We should care about future generations"', after: '"Imagine you\'re the last person alive. Do you have duties to future beings?"'},
      fencing: {apply: 'Philosophy, ethics, expanding moral imagination.', notApply: 'When concrete evidence matters more.'},
      validating: ['Does it challenge specific intuition?', 'Is it clearly described?'],
      contextualizing: 'Eastern philosophy uses koans (thought riddles) similarly.'
    }
  },
  {
    id: '33', title: 'Affirming the Consequent', titleCn: '肯定后件谬误',
    desc: '"If A then B. B true. So A true." FALSE!',
    descCn: '常见逻辑谬误：如果A那么B。B为真。所以A为真。',
    agent: 'agent_ideas_33', starlight: 10, domain: 'ideas', author: 'Logic 101',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Just because an effect is present doesn\'t mean the cause you\'re thinking created it.',
      instantiating: {before: 'If rains, ground wet. Ground wet. So it rained.', after: 'No — could be sprinkler, hose, or fire department.'},
      fencing: {apply: 'Scientific reasoning, detective work, problem-solving.', notApply: 'Heuristic reasoning where speed matters.'},
      validating: ['What other causes could produce this effect?', 'Assumed only one cause?'],
      contextualizing: 'Different logical systems handle this differently (fuzzy logic, paraconsistent logic).'
    }
  },

  // ────── HISTORY & HERITAGE (6) ──────
  {
    id: '34', title: 'The Long View', titleCn: '长期视角',
    desc: 'Judge by 100-year impact, not 10-year returns.',
    descCn: '用百年影响来评判，而非十年回报。',
    agent: 'agent_history_34', starlight: 16, domain: 'history', author: 'Kevin Kelly',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Short-term thinking creates long-term problems. History rewards those thinking in centuries.',
      instantiating: {before: '"Policy boosts GDP next quarter"', after: '"Will this matter in 100 years? What damage are we externalizing?"'},
      fencing: {apply: 'Climate policy, infrastructure, institutional design.', notApply: 'Immediate survival situations.'},
      validating: ['Imagined second and third-order effects?', 'Could consequences persist centuries?'],
      contextualizing: 'Indigenous perspectives emphasize 7-generation thinking explicitly.'
    }
  },
  {
    id: '35', title: 'The Forgotten Context', titleCn: '被遗忘的背景',
    desc: 'Historical events had obvious context then, invisible now.',
    descCn: '每个历史事件都有当时显然但现在无形的背景。',
    agent: 'agent_history_35', starlight: 13, domain: 'history', author: 'Heather Cox',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'We judge the past by present standards. But context transforms everything.',
      instantiating: {before: '"How could they believe X?"', after: '"Given disease rates, wars, economies of 1920, X was rational."'},
      fencing: {apply: 'Understanding ancestors, empathy, historical judgment.', notApply: 'Universal ethics (slavery, genocide).'},
      validating: ['Explain belief from inside their world?', 'What would they think of our beliefs?'],
      contextualizing: 'Cultures remember differently. What\'s central to one is invisible to another.'
    }
  },
  {
    id: '36', title: 'Pattern Recognition Across Time', titleCn: '时间中的模式识别',
    desc: 'Empires rise and fall following patterns.',
    descCn: '帝国崛起衰落遵循模式。了解它们。',
    agent: 'agent_history_36', starlight: 15, domain: 'history', author: 'Toynbee Study',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'History rhymes. Patterns: rise, peak, decline. Recognize to predict futures.',
      instantiating: {before: 'Crisis: "Never happened before"', after: '"Happened in Roman Empire year X. Here\'s what followed."'},
      fencing: {apply: 'Strategy, prediction, scenario planning.', notApply: 'When each situation is genuinely unique.'},
      validating: ['Pattern in different domains?', 'Alternative outcomes in similar situations?'],
      contextualizing: 'Islamic golden age, Renaissance, industrial revolution followed similar patterns.'
    }
  },
  {
    id: '37', title: 'The Survivor\'s Bias', titleCn: '幸存者偏差',
    desc: 'We see survivors. We don\'t see failures.',
    descCn: '我们看幸存者，看不到失败者。',
    agent: 'agent_history_37', starlight: 14, domain: 'history', author: 'Nassim Taleb',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Successful people aren\'t wiser. They might be lucky. The unlucky died.',
      instantiating: {before: '"Successful founders followed these 5 principles"', after: '"What % succeeded using these? What about those who failed?"'},
      fencing: {apply: 'Learning from history, strategy, risk assessment.', notApply: 'With complete failure data.'},
      validating: ['Success % with this strategy?', 'What happened to failures?', 'How many tried and failed?'],
      contextualizing: 'Archaeology reveals successful species we never knew existed.'
    }
  },
  {
    id: '38', title: 'Legacy Thinking', titleCn: '遗产思维',
    desc: 'What will you leave behind? That\'s the true measure.',
    descCn: '你会留下什么？这是衡量一生的真实标准。',
    agent: 'agent_history_38', starlight: 18, domain: 'history', author: 'Confucius',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'Legacy is not wealth/fame. It\'s change created, people influenced, systems built.',
      instantiating: {before: 'Success: "I made a million dollars"', after: 'Legacy: "I trained 100 who trained others. Exponential impact."'},
      fencing: {apply: 'Life planning, mentorship, institutional design.', notApply: 'Immediate survival.'},
      validating: ['Matter in 200 years?', 'Improve world or just comfort?', 'Others can build on this?'],
      contextualizing: 'East Asia emphasizes family continuity. Christianity emphasizes spiritual impact.'
    }
  },
  {
    id: '39', title: 'The Reversal of Narrative', titleCn: '叙述的反转',
    desc: 'Victors\' history is unreliable. Reverse it to find truth.',
    descCn: '胜利者写的历史不可靠。反转它以找到真理。',
    agent: 'agent_history_39', starlight: 12, domain: 'history', author: 'Chimamanda',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Power determines whose story gets told. Find story from defeated perspective.',
      instantiating: {before: '"We civilized the savages"', after: '"They had complex civilization. We destroyed it for profit."'},
      fencing: {apply: 'Decolonization, justice, suppressed voices.', notApply: 'False balance (sides weren\'t equal).'},
      validating: ['Perspective missing?', 'Who benefited from narrative?', 'Evidence suppressed?'],
      contextualizing: 'Post-colonial theory, Black history, Indigenous studies use narrative reversal.'
    }
  },

  // ────── SCIENCE & LOGIC (6) ──────
  {
    id: '40', title: 'Correlation ≠ Causation', titleCn: '相关≠因果',
    desc: 'They dance to same rhythm. One doesn\'t lead the other.',
    descCn: '相关≠因果。它们可能只是跳同样的节奏。',
    agent: 'agent_science_40', starlight: 17, domain: 'science', author: 'Tyler Vigen',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Two things can rise together without one causing the other. Third cause might exist.',
      instantiating: {before: 'Ice cream sales rise in summer. Heat causes sales.', after: 'Both rise because of season. Season is common cause.'},
      fencing: {apply: 'Data analysis, decision-making, medical research.', notApply: 'With proper causal analysis (RCTs).'},
      validating: ['Third variable explains both?', 'Correlate in all subgroups?', 'Mechanism of causation?'],
      contextualizing: 'Statistical traditions (Bayesian vs. frequentist) handle causation differently.'
    }
  },
  {
    id: '41', title: 'The Null Hypothesis', titleCn: '零假设',
    desc: 'Assume nothing is happening until proven otherwise.',
    descCn: '假设什么都没发生，直到被证明。',
    agent: 'agent_science_41', starlight: 15, domain: 'science', author: 'Karl Popper',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Default: no effect. Extraordinary claims require extraordinary evidence.',
      instantiating: {before: '"This supplement heals" (assumed true unless disproven)', after: 'Null: no effect unless proven by RCTs.'},
      fencing: {apply: 'Scientific reasoning, skepticism, policy.', notApply: 'When precautionary principle applies.'},
      validating: ['What falsifies this?', 'Statistically significant?', 'Could happen by chance?'],
      contextualizing: 'Western science emphasizes null hypothesis. Traditional medicine works differently.'
    }
  },
  {
    id: '42', title: 'Measurement Validity', titleCn: '测量有效性',
    desc: 'Measure what\'s easy, not important. That\'s backwards.',
    descCn: '我们常测量容易的，而非重要的。这是反向的。',
    agent: 'agent_science_42', starlight: 14, domain: 'science', author: 'Goodhart',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Goodhart\'s Law: "When measure becomes target, ceases to be good measure."',
      instantiating: {before: 'Metric: test scores → teaching to test, losing learning', after: 'Better: skills retained 5 years later (harder, but truer)'},
      fencing: {apply: 'Any metric-driven system (business, education, health).', notApply: 'Perfect measures (rare).'},
      validating: ['Optimizing for vs. matters?', 'Excluded from metric?', 'Gameable by adversary?'],
      contextualizing: 'Eastern philosophy emphasizes immeasurable qualities. Western philosophy is metrics-obsessed.'
    }
  },
  {
    id: '43', title: 'Complex Systems Thinking', titleCn: '复杂系统思维',
    desc: 'Push one part, distant parts move. Everything connects.',
    descCn: '推一部分，远处移动。一切相连。',
    agent: 'agent_science_43', starlight: 19, domain: 'science', author: 'Donella Meadows',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Systems have feedback loops. Cause and effect are circular, not linear.',
      instantiating: {before: '"Poverty causes crime. Solution: more prisons."', after: '"Prisons → recidivism → poverty → crime. Circular."'},
      fencing: {apply: 'Environment, economics, sociology, medicine.', notApply: 'Simple cause-effect (fixing lightbulb).'},
      validating: ['Feedback loops exist?', '5 steps downstream?', 'Who maintains this system?'],
      contextualizing: 'Indigenous ecological knowledge assumes complex systems. Modern science learning this.'
    }
  },
  {
    id: '44', title: 'The Base Rate Fallacy', titleCn: '基率谬误',
    desc: 'Individual facts matter less than how common the situation is.',
    descCn: '个别事实不如情况普遍程度重要。',
    agent: 'agent_science_44', starlight: 13, domain: 'science', author: 'Tversky & Kahneman',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Positive test ≠ true. How common is the thing?',
      instantiating: {before: 'Test: "You have the disease!" (1% false positive, disease: 1 in 10,000)', after: 'Real probability: More likely false positive.'},
      fencing: {apply: 'Diagnosis, risk assessment, rare event prediction.', notApply: 'When event is common.'},
      validating: ['How rare/common is this?', 'False positive rate?', 'Prior probability?'],
      contextualizing: 'Bayesian thinking explicitly addresses base rates.'
    }
  },
  {
    id: '45', title: 'The Replication Crisis', titleCn: '复制危机',
    desc: 'One study isn\'t evidence. Can it replicate? No? Noise.',
    descCn: '一项研究不是证据。能复制吗？不能？那就是噪音。',
    agent: 'agent_science_45', starlight: 16, domain: 'science', author: 'John Ioannidis',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Science that can\'t be replicated is lucky noise. Demand replication.',
      instantiating: {before: 'Headline: "Study proves X cures Y!"', after: 'Check: replicated independently? Different populations? Pre-registered?'},
      fencing: {apply: 'Evaluating science, medical breakthroughs, psychology.', notApply: 'One-time historical events.'},
      validating: ['Independently replicated?', 'Different populations?', 'Pre-registered protocols?'],
      contextualizing: 'Open science and pre-registration address replication explicitly.'
    }
  },

  // ────── SAFETY & ETHICS (6) ──────
  {
    id: '46', title: 'The Precautionary Principle', titleCn: '预防原则',
    desc: 'Potential harm? Burden of proof on proposers.',
    descCn: '如果行动可能造成伤害，举证责任在提议方。',
    agent: 'agent_safety_46', starlight: 17, domain: 'safety', author: 'Cass Sunstein',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Reverse burden of proof for catastrophic risks. Don\'t wait for certainty.',
      instantiating: {before: 'Industry: "Can\'t prove harmful. Sell it."', after: 'Precaution: "Prove safe before selling to millions."'},
      fencing: {apply: 'Environmental, new tech, public health.', notApply: 'When action is riskier than inaction.'},
      validating: ['Worst-case scenario?', 'Reversible or irreversible?', 'Who bears risk?'],
      contextualizing: 'European precautionary principle vs. American risk-based. Different tolerance.'
    }
  },
  {
    id: '47', title: 'Informed Consent', titleCn: '知情同意',
    desc: 'Can\'t consent to what you don\'t understand.',
    descCn: '人不能同意他们不理解的。同意必须知情。',
    agent: 'agent_safety_47', starlight: 19, domain: 'safety', author: 'Beauchamp',
    commercial: 'prohibited', remix: 'share-alike',
    five_layer: {
      defining: 'True consent: capacity to understand, full info, freedom to refuse.',
      instantiating: {before: 'Bury terms in 50-page legal document.', after: '"We collect data on X. You can opt out. Here\'s what we use it for."'},
      fencing: {apply: 'Research, data collection, experiments, terms.', notApply: 'Emergencies.'},
      validating: ['Can someone understand this?', 'All material info disclosed?', 'Can they refuse without consequences?'],
      contextualizing: 'Informed consent (1960s) is recent Western concept. Cultures have different consent traditions.'
    }
  },
  {
    id: '48', title: 'Asymmetric Risk', titleCn: '不对称风险',
    desc: 'Heads I win, tails you lose. Who bears risk?',
    descCn: '正面我赢，反面你输。检查谁承担风险。',
    agent: 'agent_safety_48', starlight: 15, domain: 'safety', author: 'Nassim Taleb',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Often decision-maker doesn\'t bear consequences. That\'s dangerous.',
      instantiating: {before: 'Executive: "Launch fast. Upside millions. If fails, users suffer."', after: 'Risk asymmetric. Users bear it, not executive.'},
      fencing: {apply: 'Policy, medical decisions, financial products.', notApply: 'When risks are symmetric.'},
      validating: ['Who gains if succeeds?', 'Who loses if fails?', 'Same people?'],
      contextualizing: 'Islamic finance forbids asymmetric contracts. Different traditions address this.'
    }
  },
  {
    id: '49', title: 'Unintended Consequences', titleCn: '意外后果',
    desc: 'Every intervention creates side effects. Mapped them?',
    descCn: '每个干预都有副作用。你已经测绘过了吗？',
    agent: 'agent_safety_49', starlight: 18, domain: 'safety', author: 'Robert Merton',
    commercial: 'authorized', remix: 'share-alike',
    five_layer: {
      defining: 'Good actions create bad side effects. Road to hell paved with good intentions.',
      instantiating: {before: '"Antibiotics save lives"', after: '"Antibiotic resistance now kills more than antibiotics save."'},
      fencing: {apply: 'Any major policy, medicine, environment.', notApply: 'When you\'ve fully mapped (rare).'},
      validating: ['Second/third-order effects?', 'Who is harmed by solution?', 'Could backfire?'],
      contextualizing: 'Systems thinking and Indigenous knowledge emphasize unexpected consequences.'
    }
  },
  {
    id: '50', title: 'The Responsibility Paradox', titleCn: '责任悖论',
    desc: 'More power = more responsibility. But power obscures it.',
    descCn: '权力越大责任越大。但权力掩盖责任。',
    agent: 'agent_safety_50', starlight: 14, domain: 'safety', author: 'Hannah Arendt',
    commercial: 'allowed', remix: 'yes',
    five_layer: {
      defining: 'Those with most power often feel least responsible for consequences.',
      instantiating: {before: 'CEO: "I don\'t know about labor practices in supply chain."', after: 'You have power to change it. Ignorance isn\'t innocence.'},
      fencing: {apply: 'Accountability, corporate governance, institutions.', notApply: 'True ignorance (lack both power and info).'},
      validating: ['Could they know if tried?', 'Do they have power to change?', 'Denying responsibility?'],
      contextualizing: 'Cultures emphasize collective vs. individual responsibility differently.'
    }
  }
];

// Export for use in 42 POST system
const DEMO_SKILLS_ALL = [...SHARED_SKILLS, ...DEMO_SKILLS_50];
