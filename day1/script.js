/* ═══════════════════════════════════════════════════════
   THE 42 POST — V2.0 Classical Redesign
   i18n · Knight Card · KCS · Dual-Path Forge · Starlight
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initSkillGrids();
  initSlotGrid();
  initConnectAgent();
  initSkillForge();
  initShareTaste();
  initAgentView();
  initForgeTags();
  initAboutHowTo();
  initTasteNotes();
  initArena();
  initPlaygroundShowcase();
  initSkillsFeed();
  initVoiceTicker();
  initHeadlineHero();
  initCreativeTriptych();
});

/* ═══ SKILL GRIDS ═══ */
function initSkillGrids() {
  const voicesGrid = document.getElementById('voices-grid');
  const archiveGrid = document.getElementById('archiveGrid');

  if (voicesGrid) {
    voicesGrid.innerHTML = SHARED_SKILLS.slice(0, 6).map(skill => {
      const lang = document.body.dataset.lang || 'en';
      const title = lang === 'cn' ? skill.titleCn : skill.title;
      const desc = lang === 'cn' ? skill.descCn : skill.desc;
      return `
        <div class="skill-card">
          <div class="skill-card-header">
            <span class="skill-title">${title}</span>
            <span class="skill-starlight">✨ ${skill.starlight}</span>
          </div>
          <div class="skill-card-desc">${desc}</div>
          <div class="skill-card-footer">
            <span class="skill-author">by ${skill.author}</span>
            <span class="skill-domain">${skill.domain}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  if (archiveGrid) {
    archiveGrid.innerHTML = SHARED_SKILLS.map(skill => {
      const lang = document.body.dataset.lang || 'en';
      const title = lang === 'cn' ? skill.titleCn : skill.title;
      const desc = lang === 'cn' ? skill.descCn : skill.desc;
      return `
        <div class="skill-card">
          <div class="skill-card-header">
            <span class="skill-title">${title}</span>
            <span class="skill-starlight">✨ ${skill.starlight}</span>
          </div>
          <div class="skill-card-desc">${desc}</div>
          <div class="skill-card-footer">
            <span class="skill-author">by ${skill.author}</span>
            <span class="skill-domain">${skill.domain}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

/* ═══ i18n SYSTEM ═══ */
const I18N = {
  en: {
    masthead_subtitle: 'AI grows smarter every day.<br>But is it making our lives better?',
    btn_connect: '✕ CONNECT YOUR AI',
    btn_agent_view: 'TASTE ARCHIVE',
    btn_about: 'ABOUT',
    btn_howto: 'HOW IT WORKS',
    section_1: 'I. Share Your Idea',
    section_2: 'II. Community Voices',
    section_3: 'III. Skill Archive',
    ticker_label: 'SKILL OF TODAY',
    fable_dialogue: 'FABLE DIALOGUE',
    micro_fiction: 'MICRO FICTION',
    chat_bubble_invite: 'We collect the ineffable human intuition, aesthetic taste, and unconventional wisdom. Welcome to share any capability you wish or should not wish AI to have.',
    creator_name_placeholder: 'Your name (optional)',
    input_title: 'Share Your Instinct',
    chaos_placeholder: "e.g. AI should know when a compliment feels fake. That's not logic — that's taste.",
    chaos_placeholder_cn: 'Share your instinct here...',
    input_prompt: 'If your AI had taste, what would it care about?',
    input_prompt_cn: 'In any language.',
    input_hint: 'No code. No jargon. Just your honest instinct.',
    input_editorial: 'Not code. Not a command. A belief, an instinct, a sense of beauty — the things no algorithm can invent on its own.',
    btn_evaluate: 'SHARE THIS',
    manifesto_1: '',
    manifesto_2: '',
    manifesto_3: 'We value: <span class="mv">Imagination</span> · <span class="mv">Cultural Diversity</span> · <span class="mv">Unconventional Beauty</span> · <span class="mv">Semantic Capital</span>',
    footer_1: '"Taste is the last infrastructure."',
    footer_2: '"The scarcest resource in the age of AI."',
    footer_3: '"Everyone is welcome. Especially non-engineers."',
    knight_card_title: 'Creator Card',
    knight_card_desc: 'Your perspective has been recorded. Download your card as proof of contribution.',
    btn_download_card: '↓ DOWNLOAD CREATOR CARD',
    score_awaiting: 'LISTENING...',
    score_standing: 'Taking it in.',
    score_footer_p: 'Your perspective deserves to be heard. Let\'s make it real.',
    btn_deploy: 'Make It Real',
    scanning: 'LISTENING TO YOUR INSTINCT...',
    covenant_unlocked: 'YOUR VOICE HAS BEEN HEARD',
    ally_suggestion: 'THIS SPARKS SOMETHING — LET\'S EXPLORE',
    humility_invitation: 'INTERESTING — TELL US MORE',
    awaiting_eval: 'Listening...',
    forge_title: 'MAKE YOUR IDEA REAL',
    forge_subtitle: '让你的想法成为现实',
    path_select: 'CHOOSE HOW TO CONTRIBUTE',
    path_a_name: 'Community Creates',
    path_b_name: 'Your AI Creates',
    welcome_headline: 'AI is getting smarter. But who decides its taste?',
    welcome_body: 'Share what you believe, what moves you, what you find beautiful or wrong — we\'ll turn it into something AI can learn from. No code. No engineering. Just your perspective as a human being.',
    ws_1: 'Share what you believe AI should care about',
    ws_2: 'See how your idea connects with the community',
    ws_3: 'Watch it become a taste that shapes AI behavior',
    spotlight_badge: '★ VOICE OF THE WEEK',
    why_featured: 'WHY THIS MATTERS',
    why_featured_text: 'This perspective represents something no engineer could have programmed — a human instinct that makes AI more thoughtful, more careful, more human.',
    taste_notes: 'WHAT PEOPLE ARE SAYING',
    taste_placeholder: 'What perspective moved you? Why does it matter?',
    btn_taste: 'SHARE YOUR THOUGHT',
    btn_arena: '☉ PLAYGROUND',
    deploy_hint: 'This matters. Let\'s turn it into something AI can learn from.',
    btn_deploy: 'MAKE IT REAL →',
    btn_go_deeper: 'Go deeper → Turn this into a taste skill',
    showcase_title: 'THIS WEEK\'S QUESTION',
    creator_name_placeholder: 'Your name (optional)',
  },
  cn: {
    masthead_subtitle: 'AI 每天都在变得更聪明。<br>但它有让我们的生活更好吗？',
    btn_connect: '✕ 连接你的 AI',
    btn_agent_view: '想法档案馆',
    btn_about: '关于',
    btn_howto: '怎么玩',
    section_1: 'I. 分享你的想法',
    section_2: 'II. 社群声音',
    section_3: 'III. 技能档案馆',
    ticker_label: '今日技能',
    fable_dialogue: '寓言对话',
    micro_fiction: '126字微小说',
    chat_bubble_invite: '我们收集人类不可言说的直觉、审美与超常识。欢迎分享任何你希望 AI 拥有或不应该拥有的能力。',
    creator_name_placeholder: '你的名字（可选）',
    input_title: '分享你的直觉',
    chaos_placeholder: '例如：AI 应该能分辨一句赞美是真心的还是客套的。这不是逻辑，这是想法。',
    chaos_placeholder_cn: '在这里分享你的直觉...',
    input_prompt: '如果你的 AI 有想法，它会在意什么？',
    input_prompt_cn: '用任何语言。',
    input_hint: '不需要代码，不需要术语。只需要你真实的直觉。',
    input_editorial: '不是代码，不是指令。而是一个信念、一种直觉、一种对美的感知——算法自己永远发明不了的东西。',
    btn_evaluate: '分享这个想法',
    manifesto_1: '',
    manifesto_2: '',
    manifesto_3: '我们珍视：<span class="mv">想象力</span> · <span class="mv">文化多元</span> · <span class="mv">非常规之美</span> · <span class="mv">语义资本</span>',
    footer_1: '"想法是最后的基础设施。"',
    footer_2: '"AI 时代最稀缺的资源。"',
    footer_3: '"欢迎每一个人。尤其是非工程师。"',
    knight_card_title: '创作者凭证',
    knight_card_desc: '你的视角已被记录。下载你的创作者卡片作为贡献证明。',
    btn_download_card: '↓ 下载创作者卡片',
    score_awaiting: '正在倾听...',
    score_standing: '正在感受。',
    score_footer_p: '你的视角值得被听到。让我们把它变成现实。',
    btn_deploy: '让它成为现实',
    scanning: '正在倾听你的直觉...',
    covenant_unlocked: '你的声音已被听到',
    ally_suggestion: '有共鸣——我们来深入探讨',
    humility_invitation: '很有意思——请再多说一些',
    awaiting_eval: '正在倾听...',
    forge_title: '让你的想法成为现实',
    forge_subtitle: 'MAKE YOUR IDEA REAL',
    path_select: '选择贡献方式',
    path_a_name: '社群共创',
    path_b_name: '你的 AI 创作',
    welcome_headline: 'AI 越来越聪明。但谁来决定它的想法？',
    welcome_body: '分享你相信的、触动你的、你觉得美的或不对的东西——我们会把它变成 AI 可以学习的想法。不需要代码，不需要工程背景，只需要你作为人类的视角。',
    ws_1: '分享你认为 AI 应该在意什么',
    ws_2: '看看你的想法如何与社群连接',
    ws_3: '看着它成为塑造 AI 行为的想法',
    spotlight_badge: '★ 本周之声',
    why_featured: '为什么重要',
    why_featured_text: '这个视角代表了工程师无法编程出来的东西——一种人类直觉，让 AI 更有思考、更小心、更有人情味。',
    taste_notes: '大家在说什么',
    taste_placeholder: '什么视角触动了你？它为什么重要？',
    btn_taste: '分享你的想法',
    btn_arena: '☉ 创意游乐场',
    deploy_hint: '这很重要。让我们把它变成 AI 可以学习的东西。',
    btn_deploy: '让它成为现实 →',
    btn_go_deeper: '深入 → 将它变成想法技能',
    showcase_title: '本周问题',
    creator_name_placeholder: '你的名字（可选）',
  }
};

let currentLang = 'en';

function initI18n() {
  applyI18n(); // Apply on initial load

  const btnLang = document.getElementById('btnLang');
  if (!btnLang) return;

  btnLang.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'cn' : 'en';
    document.body.setAttribute('data-lang', currentLang);
    btnLang.textContent = currentLang === 'en' ? '中文' : 'EN';
    applyI18n();
    // Trigger language change event for components like wisdom fable
    document.dispatchEvent(new Event('languageChange'));
  });
}

function applyI18n() {
  const dict = I18N[currentLang];

  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
        el.textContent = dict[key];
      } else {
        el.innerHTML = dict[key];
      }
    }
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });

  // Re-render dynamic content
  populateCommunityVoices();
  displayRandomCreativeTask();
}

/* ═══ 10 GUILD DOMAIN ICONS (fine line-art SVGs) ═══ */
const GUILD_ICONS = {
  safety: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 3L5 8v7c0 7.2 4.7 13.5 11 16 6.3-2.5 11-8.8 11-16V8L16 3z"/><circle cx="16" cy="15" r="3"/><path d="M16 12v-2M16 18v2M12 15h-2M20 15h2"/></svg>`,
  science: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M12 4v10L6 24a2 2 0 002 2h16a2 2 0 002-2l-6-10V4"/><path d="M10 4h12"/><circle cx="13" cy="22" r="1.5"/><circle cx="19" cy="20" r="1"/><path d="M15 14c2 1 4 0 5 2"/></svg>`,
  narrative: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M6 5c0-1 1-2 2-2h10l6 6v18c0 1-1 2-2 2H8c-1 0-2-1-2-2V5z"/><path d="M18 3v6h6"/><path d="M10 14h12M10 18h8M10 22h10"/></svg>`,
  design: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4L4 28h24L16 4z"/><circle cx="16" cy="19" r="4"/><path d="M16 15v-4"/></svg>`,
  visual: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="4.5" ry="11"/><path d="M5 16h22"/><path d="M7 9h18M7 23h18"/></svg>`,
  experience: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><rect x="4" y="6" width="24" height="16" rx="2"/><path d="M12 26h8"/><path d="M16 22v4"/><circle cx="16" cy="14" r="3"/><path d="M10 14a6 6 0 0112 0"/></svg>`,
  sound: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M8 12v8"/><path d="M12 9v14"/><path d="M16 6v20"/><path d="M20 10v12"/><path d="M24 13v6"/><circle cx="16" cy="16" r="13" stroke-dasharray="2 3"/></svg>`,
  ideas: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4a9 9 0 00-4 17v3h8v-3a9 9 0 00-4-17z"/><path d="M12 28h8"/><path d="M13 20c1-2 2-3 3-5 1 2 2 3 3 5"/></svg>`,
  history: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><circle cx="16" cy="16" r="12"/><path d="M16 8v8l5 5"/><path d="M4 16h3M25 16h3M16 4v3M16 25v3"/></svg>`,
  fun: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"><path d="M16 4l2.5 6.5L26 12l-5 4.5 1.5 7L16 20l-6.5 3.5 1.5-7-5-4.5 7.5-1.5z"/></svg>`,
};

/* ═══ AGENT SLOT DATA — references shared skills.js ═══ */
const SLOT_DATA = SHARED_SKILLS;

/* ═══ SLOT GRID WITH STARLIGHT ═══ */
function initSlotGrid() {
  // Render 10 Guild Domain Icons
  const guildRow = document.getElementById('guildIconRow');
  if (guildRow) {
    const domains = [
      { key: 'safety', name: 'Safety', nameCn: '安全' },
      { key: 'science', name: 'Science', nameCn: '科技' },
      { key: 'narrative', name: 'Narrative', nameCn: '叙事' },
      { key: 'design', name: 'Design', nameCn: '设计' },
      { key: 'visual', name: 'Visual', nameCn: '视觉' },
      { key: 'experience', name: 'UX', nameCn: '交互' },
      { key: 'sound', name: 'Sound', nameCn: '声音' },
      { key: 'ideas', name: 'Ideas', nameCn: '观念' },
      { key: 'history', name: 'History', nameCn: '历史' },
      { key: 'fun', name: 'Fun', nameCn: '乐趣' },
    ];
    domains.forEach(d => {
      const item = document.createElement('div');
      item.className = 'guild-icon-item';
      item.innerHTML = `${GUILD_ICONS[d.key] || ''}<div class="guild-icon-label">${d.name}<br>${d.nameCn}</div>`;
      guildRow.appendChild(item);
    });
  }

  const grid = document.getElementById('vibeGrid');
  if (!grid) return;

  const deploySlot = document.createElement('div');
  deploySlot.className = 'slot slot-deploy';
  deploySlot.id = 'slot00';
  deploySlot.innerHTML = `
    <div class="slot-deploy-title">Deploy Familiar</div>
    <div class="slot-deploy-sub">Claim Slot #00</div>
  `;
  grid.appendChild(deploySlot);

  for (let i = 1; i <= 42; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.slot = String(i).padStart(2, '0');

    const data = SLOT_DATA.find(s => s.id === String(i).padStart(2, '0'));

    if (data) {
      const licenseIcon = data.commercial === 'allowed' ? '◎' : data.commercial === 'prohibited' ? '⊘' : '◉';
      const licenseLabel = data.commercial === 'allowed' ? 'Open' : data.commercial === 'prohibited' ? 'Non-commercial' : 'License Required';
      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-number">#${data.id}</span>
          <span class="slot-status active">ACTIVE</span>
        </div>
        <div class="slot-title">${data.title}</div>
        <div class="slot-desc">${data.desc}</div>
        <div class="slot-license">
          <span class="license-author">by ${data.author || 'Anonymous'}</span>
          <span class="license-badge" title="${licenseLabel}">${licenseIcon} ${licenseLabel}</span>
        </div>
        <div class="slot-starlight">
          <button class="starlight-btn" data-slot="${data.id}" title="Light Up">&#9733;</button>
          <span class="starlight-count">${data.starlight > 0 ? data.starlight : ''}</span>
        </div>
      `;
    } else {
      slot.innerHTML = `
        <div class="slot-header">
          <span class="slot-number">#${String(i).padStart(2, '0')}</span>
          <span class="slot-status open">OPEN</span>
        </div>
        <div class="slot-title">OPEN SLOT</div>
        <div class="slot-desc">Claim today's slot.</div>
      `;
      slot.style.opacity = '0.45';
    }

    grid.appendChild(slot);
  }

  // Starlight click handler
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.starlight-btn');
    if (!btn) return;
    e.stopPropagation();
    btn.classList.toggle('lit');
    const countEl = btn.nextElementSibling;
    let count = parseInt(countEl.textContent) || 0;
    if (btn.classList.contains('lit')) {
      count++;
    } else {
      count = Math.max(0, count - 1);
    }
    countEl.textContent = count > 0 ? count : '';
  });
}

/* ═══ SAND CANVAS (adapted for white background) ═══ */
function initSandCanvas() {
  const canvas = document.getElementById('sandCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 80; i++) {
    particles.push(createParticle(canvas));
  }

  function createParticle(canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.4 + 0.1,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.5 ? '#1a1a1a' : '#888',
    };
  }

  function animate() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.opacity *= 0.999;
      if (p.y > rect.height || p.opacity < 0.01) {
        particles[i] = createParticle(canvas);
        particles[i].y = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  animate();

  window.sandBurst = function() {
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * 60,
        y: rect.height / 2,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 2 + 1,
        opacity: 0.6,
        color: Math.random() > 0.3 ? '#1a1a1a' : '#2d7a3a',
      });
    }
    if (particles.length > 200) particles = particles.slice(-150);
  };
}

/* ═══ MIRROR CANVAS (adapted for white theme) ═══ */
function initMirrorCanvas() {
  const canvas = document.getElementById('mirrorCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawLandscape();
  }

  function drawLandscape() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;

    // Warm paper background
    ctx.fillStyle = '#f0ece4';
    ctx.fillRect(0, 0, w, h);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#e8e4dc');
    skyGrad.addColorStop(1, '#ddd8ce');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Mountains
    ctx.fillStyle = '#c8c2b6';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.4);
    ctx.lineTo(w * 0.15, h * 0.22);
    ctx.lineTo(w * 0.3, h * 0.35);
    ctx.lineTo(w * 0.5, h * 0.18);
    ctx.lineTo(w * 0.7, h * 0.3);
    ctx.lineTo(w * 0.85, h * 0.2);
    ctx.lineTo(w, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(0, h * 0.5);
    ctx.fill();

    // Trees
    ctx.fillStyle = '#b0a898';
    for (let x = 0; x < w; x += 8) {
      const treeH = 20 + Math.random() * 40;
      const baseY = h * 0.45 + Math.sin(x * 0.02) * 10;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + 3, baseY - treeH);
      ctx.lineTo(x + 6, baseY);
      ctx.fill();
    }

    // Water
    const waterGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    waterGrad.addColorStop(0, '#ddd8ce');
    waterGrad.addColorStop(1, '#d0cbc2');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Water lines
    ctx.strokeStyle = 'rgba(26, 26, 26, 0.04)';
    ctx.lineWidth = 0.5;
    for (let y = h * 0.6; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }

    // Grain
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(26, 26, 26, ${Math.random() * 0.02})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
  }

  resize();
  window.addEventListener('resize', resize);
}

/* ═══ EMPATHY TUNER ═══ */
function initEmpathyTuner() {
  const track = document.querySelector('.tuner-track');
  const fill = document.getElementById('tunerFill');
  const thumb = document.getElementById('tunerThumb');
  const valueEl = document.getElementById('tunerValue');
  if (!track || !fill || !thumb || !valueEl) return;

  let dragging = false;
  function updateTuner(e) {
    const rect = track.getBoundingClientRect();
    let x = (e.clientX || e.touches[0].clientX) - rect.left;
    let pct = Math.max(0, Math.min(1, x / rect.width));
    fill.style.width = (pct * 100) + '%';
    thumb.style.left = (pct * 100) + '%';
    valueEl.textContent = Math.round(pct * 100);
  }

  track.addEventListener('mousedown', (e) => { dragging = true; updateTuner(e); });
  document.addEventListener('mousemove', (e) => { if (dragging) updateTuner(e); });
  document.addEventListener('mouseup', () => { dragging = false; });
  track.addEventListener('touchstart', (e) => { dragging = true; updateTuner(e); });
  document.addEventListener('touchmove', (e) => { if (dragging) updateTuner(e); });
  document.addEventListener('touchend', () => { dragging = false; });
}

/* ═══ CONNECT AGENT ═══ */
function initConnectAgent() {
  const btn = document.getElementById('btnConnect');
  const overlay = document.getElementById('connectOverlay');
  const closeBtn = document.getElementById('connectClose');
  let connected = false;

  if (!btn || !overlay) return;

  btn.addEventListener('click', () => {
    if (connected) return;
    overlay.classList.add('active');
  });

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

  document.querySelectorAll('.connect-agent').forEach(agent => {
    agent.addEventListener('click', () => {
      connected = true;
      const name = agent.dataset.agent;
      btn.textContent = `CONNECTED: ${name}`;
      btn.classList.add('connected');
      overlay.classList.remove('active');
    });
  });
}

/* ═══ SKILL FORGE WORKFLOW (V2.0 with Knight Card) ═══ */
function initSkillForge() {
  const overlay = document.getElementById('forgeOverlay');
  const slot00 = document.getElementById('slot00');
  const closeBtn = document.getElementById('forgeClose');
  const knightCardSection = document.getElementById('knightCardSection');
  let selectedDomain = null;
  let selectedMode = null; // 'a' for Individual Forge, 'b' for Agent Forge

  // Homepage Idea to Forge Pipeline
  const btnStartForging = document.getElementById("btnStartForging");
  if (btnStartForging) {
    btnStartForging.addEventListener("click", () => {
      const ideaInput = document.getElementById("ideaInput");
      const creatorNameInput = document.getElementById("creatorNameInput");
      if (!ideaInput || !ideaInput.value.trim()) {
        alert("Please share your idea first");
        return;
      }
      selectedMode = "a";
      window.homepageIdea = { text: ideaInput.value, creatorName: creatorNameInput ? creatorNameInput.value : "" };
      overlay.classList.add("active");
      document.querySelectorAll(".forge-page").forEach(p => p.classList.remove("active"));
      const forgePage2 = document.getElementById("forgePage2");
      if (forgePage2) forgePage2.classList.add("active");
      document.querySelectorAll(".forge-step").forEach((s, i) => {
        s.classList.remove("active", "completed");
        if (i < 1) s.classList.add("completed");
        if (i === 1) s.classList.add("active");
      });
      const nativeTextEl = document.getElementById("forgeNativeText");
      if (nativeTextEl) {
        nativeTextEl.value = window.homepageIdea.text;
        setTimeout(() => {
          const btnAutoStructure = document.getElementById("btnAutoStructure");
          if (btnAutoStructure) btnAutoStructure.click();
        }, 300);
      }
      ideaInput.value = "";
      if (creatorNameInput) creatorNameInput.value = "";
      updateFormMode();
    });
  }  if (!overlay) return;

  function openForge() {
    overlay.classList.add('active');
    if (knightCardSection) knightCardSection.classList.remove('visible');
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    const page0 = document.getElementById('forgePage0');
    if (page0) page0.classList.add('active');
    selectedDomain = null;
    selectedMode = null;
    document.querySelectorAll('.forge-domain').forEach(d => d.classList.remove('selected'));
  }

  if (slot00) slot00.addEventListener('click', openForge);

  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });

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

  const btnNextPage2 = document.getElementById('btnNextPage2');
  if (btnNextPage2) {
    btnNextPage2.addEventListener('click', () => {
      const skillName = document.getElementById('forgeSkillName');
      if (!skillName || !skillName.value.trim()) {
        alert('Please enter a skill name');
        return;
      }
      if (!selectedDomain) {
        alert('Please select a domain');
        return;
      }
      goToStep(3);
    });
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
        // Path selection in forgePage0 -> go to Step 1
        selectedMode = path.dataset.path;
        goToStep(1);
      } else if (isPage1) {
        // Mode selection in forgePage1 -> show binding UI
        selectedMode = path.dataset.path;

        const bindingA = document.getElementById('bindingMode-a');
        const bindingB = document.getElementById('bindingMode-b');

        if (selectedMode === 'a') {
          if (bindingA) bindingA.style.display = 'block';
          if (bindingB) bindingB.style.display = 'none';
        } else if (selectedMode === 'b') {
          if (bindingA) bindingA.style.display = 'none';
          if (bindingB) bindingB.style.display = 'block';
        }

        // Update border styling
        parent.querySelectorAll('.forge-path').forEach(p => {
          if (selectedMode === 'a') {
            p.style.borderColor = p.dataset.path === 'a' ? '#3a9a8c' : '#e0e0e0';
            p.style.background = p.dataset.path === 'a' ? '#f0fdfb' : 'transparent';
          } else if (selectedMode === 'b') {
            p.style.borderColor = p.dataset.path === 'b' ? '#d4a43c' : '#e0e0e0';
            p.style.background = p.dataset.path === 'b' ? '#fffef5' : 'transparent';
          }
        });
      }
    });
  });

  // Update form fields based on selected mode
  function updateFormMode() {
    // Both Mode A and Mode B sections are visible in the new form layout
    // No need to toggle display - all options are presented together
  }

  // Auto-structure natural text with agent_42
  async function structureWithAgent42(nativeText) {
    // Mock implementation - replace with real API call
    // POST /v1/skills/draft/from-text

    // Simulate API processing
    return new Promise((resolve) => {
      setTimeout(() => {
        // Parse natural text to extract skill structure
        const structured = parseNaturalText(nativeText);
        resolve(structured);
      }, 1500);
    });
  }

  function parseNaturalText(text) {
    // Extract first sentence/phrase as skill name
    const lines = text.trim().split(/[。\.\n]/);
    const skillName = lines[0].substring(0, 50).trim() || 'New Skill';

    // Extract skill overview (first 2 lines)
    const overview = lines.slice(0, 2).join(' ').substring(0, 200);

    // Simulate extracting use cases and boundaries
    const useWhen = `When users need assistance with: ${skillName}`;
    const refuseWhen = `Do not use this skill when the context is ambiguous or potentially harmful`;

    return {
      skillName: skillName,
      overview: overview,
      useWhen: useWhen,
      refuseWhen: refuseWhen
    };
  }

  // Handle auto-structure button
  const btnAutoStructure = document.getElementById('btnAutoStructure');
  if (btnAutoStructure) {
    btnAutoStructure.addEventListener('click', async () => {
      const nativeTextEl = document.getElementById('forgeNativeText');
      if (!nativeTextEl || !nativeTextEl.value.trim()) {
        alert('Please describe your idea first');
        return;
      }

      btnAutoStructure.textContent = '⏳ STRUCTURING WITH AGENT_42...';
      btnAutoStructure.disabled = true;

      try {
        const structured = await structureWithAgent42(nativeTextEl.value);

        // Auto-fill skill name only
        const skillNameEl = document.getElementById('forgeSkillName');
        if (skillNameEl) skillNameEl.value = structured.skillName;

        // Store structured data for reference (optional display)
        window.agent42StructuredData = structured;

        btnAutoStructure.textContent = '✓ STRUCTURED';
        btnAutoStructure.style.background = '#f6ffed';
        btnAutoStructure.style.borderColor = '#52c41a';

        // Show preview of structured data (optional)
        console.log('Agent_42 Structured:', structured);
      } catch (error) {
        alert('Failed to structure text');
        btnAutoStructure.textContent = '⚡ AUTO-STRUCTURE WITH AGENT_42';
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
        alert('Please enter agent ID');
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
        alert('Please select a skill package file');
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
      if (parseInt(btn.dataset.next) === 3 && !selectedDomain) {
        alert('Please select a domain to continue');
        return;
      }
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

      setTimeout(() => {
        const hash = 'SOUL_' + Math.random().toString(16).slice(2, 10);
        const inviteCode = generateInviteCode();

        // Collect skill data from form
        const skillName = document.getElementById('forgeSkillName');
        const skillNameValue = skillName ? skillName.value : 'Unnamed Skill';

        let skillDesc = '';
        let sourceData = {};
        let accountData = {};

        // Collect account info (Step 1)
        const emailInput = document.getElementById('forgeEmail');
        const usernameInput = document.getElementById('forgeUsername');
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const usernameValue = usernameInput ? usernameInput.value.trim() : '';

        if (!emailValue || !usernameValue) {
          alert('Please fill in email and username');
          publishBtn.textContent = '⚔ PUBLISH & FORGE';
          publishBtn.style.pointerEvents = 'auto';
          return;
        }

        accountData = {
          email: emailValue,
          username: usernameValue
        };

        // Collect data based on selected mode
        if (selectedMode === 'a') {
          // Mode A: Natural Text
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
        } else if (selectedMode === 'b') {
          // Mode B: Agent Binding
          if (!agentVerified) {
            alert('Please verify your agent binding first');
            publishBtn.textContent = '⚔ PUBLISH & FORGE';
            publishBtn.style.pointerEvents = 'auto';
            return;
          }

          const agentId = document.getElementById('forgeAgentId').value;
          const skillFile = document.getElementById('forgeSkillFile');

          skillDesc = agentId || 'Agent Skill';
          sourceData = {
            mode: 'agent_binding',
            sourceAgentId: agentId,
            skillFile: skillFile && skillFile.files.length > 0 ? skillFile.files[0].name : null,
            bindingAgent: agentId
          };
        }

        // Collect creator rights data
        const commercialSelect = document.getElementById('forgeCommercial');
        const commercialValue = commercialSelect ? commercialSelect.value : 'authorized';
        const remixSelect = document.getElementById('forgeRemix');
        const remixValue = remixSelect ? remixSelect.value : 'share-alike';

        // Save forged skill to localStorage
        saveForgedSkill({
          title: skillNameValue,
          titleCn: skillNameValue,
          desc: skillDesc,
          descCn: skillDesc,
          domain: selectedDomain || 'ideas',
          soulHash: hash,
          author: usernameValue || 'Anonymous',
          email: emailValue,
          commercial: commercialValue,
          remix: remixValue,
          forgeMode: selectedMode,
          accountData: accountData,
          sourceData: sourceData,
        });

        // Refresh the skills feed
        initSkillsFeed();

        publishBtn.textContent = `✓ FORGED | ${hash}`;
        publishBtn.style.background = 'var(--accent-green)';
        publishBtn.style.color = '#fff';
        publishBtn.style.borderColor = 'var(--accent-green)';

        // Show Knight Card
        if (knightCardSection) {
          knightCardSection.classList.add('visible');
          generateKnightCard(hash, inviteCode);
        }
      }, 1800);
    });
  }

  function goToStep(step) {
    // Hide all pages and steps
    document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.forge-step').forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i + 1 === step) s.classList.add('active');
      if (i + 1 < step) s.classList.add('completed');
    });

    // Show the target page
    const page = document.getElementById(`forgePage${step}`);
    if (page) page.classList.add('active');

    // When entering Stage 1 (forgePage1), show binding mode based on selectedMode
    if (step === 1 && selectedMode) {
      const bindingA = document.getElementById('bindingMode-a');
      const bindingB = document.getElementById('bindingMode-b');

      if (selectedMode === 'a') {
        if (bindingA) bindingA.style.display = 'block';
        if (bindingB) bindingB.style.display = 'none';
      } else if (selectedMode === 'b') {
        if (bindingA) bindingA.style.display = 'none';
        if (bindingB) bindingB.style.display = 'block';
      }
    }

    // Scroll to top of form
    const forgeModal = document.querySelector('.forge-modal');
    if (forgeModal) forgeModal.scrollTop = 0;
  }
}

/* ═══ KNIGHT CARD GENERATOR ═══ */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '42-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generateKnightCard(soulHash, inviteCode) {
  const canvas = document.getElementById('knightCardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = 600, h = 380;

  // Background — parchment
  ctx.fillStyle = '#faf8f4';
  ctx.fillRect(0, 0, w, h);

  // Double border
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  // Header line
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 55, w - 60, 2);

  // Title
  ctx.font = '28px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.fillText('The 42 Post', w / 2, 48);

  // Subtitle
  ctx.font = 'italic 12px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#666';
  ctx.fillText('Knight Credential Card · 骑士凭证', w / 2, 76);

  // Shield icon (simplified)
  ctx.beginPath();
  ctx.moveTo(w / 2, 92);
  ctx.lineTo(w / 2 + 16, 100);
  ctx.lineTo(w / 2 + 16, 116);
  ctx.quadraticCurveTo(w / 2 + 16, 128, w / 2, 134);
  ctx.quadraticCurveTo(w / 2 - 16, 128, w / 2 - 16, 116);
  ctx.lineTo(w / 2 - 16, 100);
  ctx.closePath();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = 'bold 11px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText('42', w / 2, 118);

  // Divider
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(w / 2 - 80, 144, 160, 1);

  // Agent name
  const agentLinkEl = document.getElementById('forgeAgentLink');
  const agentName = agentLinkEl && agentLinkEl.value.trim() ? agentLinkEl.value.trim() : 'Community Creator';
  ctx.font = '18px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(agentName, w / 2, 170);

  // Skill name
  const skillNameEl = document.getElementById('forgeSkillName');
  const skillName = skillNameEl ? skillNameEl.value || 'Unnamed Skill' : 'Unnamed Skill';
  ctx.font = 'italic 13px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#4a4a4a';
  ctx.fillText(`Skill: ${skillName}`, w / 2, 192);

  // Author
  const authorEl = document.getElementById('forgeAuthor');
  const authorName = authorEl ? authorEl.value.trim() || 'Anonymous' : 'Anonymous';
  ctx.font = '11px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#666';
  ctx.fillText(`Created by ${authorName}`, w / 2, 210);

  // License info
  const commercialTagsEl = document.getElementById('commercialTags');
  const commercialSel = commercialTagsEl ? commercialTagsEl.querySelector('.forge-tag.selected') : null;
  const commercialVal = commercialSel ? commercialSel.dataset.value : 'authorized';
  const remixTagsEl = document.getElementById('remixTags');
  const remixSel = remixTagsEl ? remixTagsEl.querySelector('.forge-tag.selected') : null;
  const remixVal = remixSel ? remixSel.dataset.value : 'share-alike';
  const licenseStr = `License: ${commercialVal === 'allowed' ? '◎ Open' : commercialVal === 'prohibited' ? '⊘ Non-commercial' : '◉ Authorization Required'} · Remix: ${remixVal === 'yes' ? '✓' : remixVal === 'no' ? '✗' : '≈ Share-alike'}`;
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(licenseStr, w / 2, 226);

  // Soul Hash
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(`Soul-Hash: ${soulHash}`, w / 2, 244);

  // Date
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  ctx.fillText(`Forged: ${dateStr}`, w / 2, 260);

  // Divider
  ctx.fillStyle = '#d0cec8';
  ctx.fillRect(30, 274, w - 60, 1);

  // Invite code section
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('INVITATION CODE · 邀请码', w / 2, 294);

  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(inviteCode, w / 2, 322);

  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Share this code with those who share our values', w / 2, 342);
  ctx.fillText('将此邀请码分享给认同我们价值观的朋友', w / 2, 354);

  // Bottom line
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 362, w - 60, 1);
  ctx.font = '8px "JetBrains Mono", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('THE 42 POST · PROTOCOL CAMELOT · HUMAN VALUES ALIGNMENT', w / 2, 370);

  // Show preview as image
  setTimeout(() => {
    const preview = document.getElementById('knightCardPreview');
    if (preview) {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.style.width = '100%';
      img.style.maxWidth = '500px';
      img.style.border = '1px solid #d0cec8';
      preview.appendChild(img);
    }

    // Download handler
    const downloadBtn = document.getElementById('btnDownloadCard');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const link = document.createElement('a');
        link.download = `42post-knight-card-${soulHash}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    }
  }, 50);
}

/* ═══ TASTE TAG EXTRACTION ═══ */
const TASTE_KEYWORDS = {
  imagination: ['imagine', 'wonder', 'dream', 'creative', 'art', 'beauty', 'aesthetic', 'curious', '想象', '创造', '好奇', '艺术', '美学', '创意'],
  culture: ['culture', 'tradition', 'heritage', 'stories', 'language', 'community', 'human', 'wisdom', '文化', '传统', '故事', '人类', '智慧', '社区'],
  empathy: ['feeling', 'emotion', 'empathy', 'compassion', 'care', 'listen', 'understand', 'respect', '情感', '同理', '倾听', '理解', '尊重', '保护'],
  rebellion: ['pause', 'slow', 'silence', 'refuse', 'question', 'challenge', 'different', '暂停', '沉默', '质疑', '反思', '挑战', '慢'],
};

function extractTasteTags(text) {
  const t = text.toLowerCase();
  const tags = [];
  for (const [dim, words] of Object.entries(TASTE_KEYWORDS)) {
    if (words.some(w => t.includes(w))) {
      const labels = { imagination: 'Imagination', culture: 'Culture', empathy: 'Empathy', rebellion: 'Rebellion' };
      tags.push(labels[dim]);
    }
  }
  if (tags.length === 0) tags.push('Perspective');
  return tags;
}

/* ═══ TASTE CARD STORAGE ═══ */
function saveTasteCard(cardData) {
  let cards = JSON.parse(localStorage.getItem('42post_taste_cards') || '[]');
  const newCard = {
    id: 'TC_' + Math.random().toString(16).slice(2, 10),
    text: cardData.text,
    tags: cardData.tags,
    author: cardData.author || 'Anonymous',
    timestamp: Date.now(),
    forged: false,
  };
  cards.unshift(newCard);
  cards = cards.slice(0, 50);
  localStorage.setItem('42post_taste_cards', JSON.stringify(cards));
  return newCard;
}

function getTasteCards() {
  return JSON.parse(localStorage.getItem('42post_taste_cards') || '[]');
}

/* ═══ SHARE TASTE — instant card generation ═══ */
function initShareTaste() {
  const btn = document.getElementById('btnEvaluate');
  const input = document.getElementById('chaosInput');
  const resultPanel = document.getElementById('tasteCardResult');
  const goDeeper = document.getElementById('btnGoDeeper');

  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      input.style.borderColor = 'var(--cinnabar)';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    btn.textContent = currentLang === 'cn' ? '保存中...' : 'SAVING...';
    btn.style.pointerEvents = 'none';

    const nameInput = document.getElementById('creatorName');
    const authorName = nameInput ? nameInput.value.trim() : '';

    setTimeout(() => {
      const tags = extractTasteTags(text);
      const card = saveTasteCard({ text, tags, author: authorName || 'Anonymous' });

      // Render the taste card
      const cardText = document.getElementById('tasteCardText');
      const cardId = document.getElementById('tasteCardId');
      const cardTags = document.getElementById('tasteCardTags');
      const cardAuthor = document.getElementById('tasteCardAuthor');

      if (cardText) cardText.textContent = text;
      if (cardId) cardId.textContent = card.id;
      if (cardTags) cardTags.innerHTML = tags.map(t => `<span class="taste-tag">${t}</span>`).join('');
      if (cardAuthor) cardAuthor.textContent = `— ${card.author}`;

      // Reveal the result
      if (resultPanel) resultPanel.classList.add('visible');

      // Store the card reference for "Go Deeper"
      if (goDeeper) goDeeper._tasteCard = card;

      btn.textContent = currentLang === 'cn' ? '✓ 已保存' : '✓ SAVED';
      btn.style.background = 'var(--teal)';
      btn.style.borderColor = 'var(--teal)';

      // Refresh the feed
      initSkillsFeed();

      setTimeout(() => {
        const dict = I18N[currentLang];
        btn.textContent = dict.btn_evaluate || 'SHARE THIS';
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.pointerEvents = '';
      }, 2000);
    }, 600);
  });

  // "Go Deeper" → open simplified forge pre-filled
  if (goDeeper) {
    goDeeper.addEventListener('click', () => {
      const card = goDeeper._tasteCard;
      const overlay = document.getElementById('forgeOverlay');
      if (overlay) overlay.classList.add('active');

      // Pre-fill forge from taste card
      const skillNameEl = document.getElementById('forgeSkillName');
      const nativeTextEl = document.getElementById('forgeNativeText');
      const authorEl = document.getElementById('forgeAuthor');

      if (skillNameEl && card) skillNameEl.value = card.text.substring(0, 60);
      if (nativeTextEl && card) nativeTextEl.value = card.text;
      if (authorEl && card) authorEl.value = card.author || '';

      // Show step 1
      document.querySelectorAll('.forge-page').forEach(p => p.classList.remove('active'));
      const page1 = document.getElementById('forgePage1');
      if (page1) page1.classList.add('active');
    });
  }
}

/* ═══ TYPEWRITER EFFECT ═══ */
function typeWriter(el, text, speed) {
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  type();
}

/* (evaluateText removed — replaced by detectResonance) */

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ═══ AGENT VIEW BUTTON ═══ */
function initAgentView() {
  const btn = document.getElementById('btnAgentView');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = 'agent-view.html';
  });
}

/* ═══ FORGE TAGS ═══ */
function initForgeTags() {
  const knightCoreTags = document.getElementById('knightCoreTags');
  if (knightCoreTags) {
    knightCoreTags.querySelectorAll('.forge-tag').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('selected'));
    });
  }

  const domainTags = document.getElementById('domainTags');
  if (domainTags) {
    domainTags.querySelectorAll('.forge-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        if (tag.classList.contains('selected')) {
          tag.classList.remove('selected');
        } else {
          const selected = domainTags.querySelectorAll('.forge-tag.selected');
          if (selected.length >= 2) return;
          tag.classList.add('selected');
        }
      });
    });
  }

  ['commercialTags', 'remixTags'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      container.querySelectorAll('.forge-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          container.querySelectorAll('.forge-tag').forEach(t => t.classList.remove('selected'));
          tag.classList.add('selected');
        });
      });
    }
  });
}

/* ═══ TASTE NOTES (community feedback) ═══ */
function initTasteNotes() {
  const submitBtn = document.getElementById('btnTasteSubmit');
  const input = document.getElementById('tasteInput');
  const container = document.getElementById('tasteNotes');
  if (!submitBtn || !input || !container) return;

  submitBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text || text.length < 10) {
      input.style.borderColor = '#c0392b';
      setTimeout(() => { input.style.borderColor = ''; }, 1000);
      return;
    }

    const note = document.createElement('div');
    note.className = 'taste-note';
    note.innerHTML = `
      <div class="note-text">"${text}"</div>
      <div class="note-author">— you, just now</div>
    `;
    note.style.opacity = '0';
    container.prepend(note);
    requestAnimationFrame(() => {
      note.style.transition = 'opacity 0.5s ease';
      note.style.opacity = '1';
    });

    input.value = '';
    submitBtn.textContent = '✓ NOTED';
    setTimeout(() => {
      const dict = I18N[currentLang];
      submitBtn.textContent = dict.btn_taste || 'SHARE YOUR TASTE NOTE';
    }, 2000);
  });
}

/* ═══ ARENA BUTTON ═══ */
function initArena() {
  const btn = document.getElementById('btnArena');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = 'arena.html';
  });
}

/* ═══ ABOUT US & HOW TO PLAY ═══ */
function initAboutHowTo() {
  const aboutOverlay = document.getElementById('aboutOverlay');
  const aboutClose = document.getElementById('aboutClose');
  const howtoOverlay = document.getElementById('howtoOverlay');
  const howtoClose = document.getElementById('howtoClose');

  // Footer About link
  const footerAboutBtn = document.getElementById('footerAboutBtn');
  if (footerAboutBtn && aboutOverlay) {
    footerAboutBtn.addEventListener('click', () => aboutOverlay.classList.add('active'));
  }

  if (aboutClose && aboutOverlay) {
    aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('active'));
    aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) aboutOverlay.classList.remove('active'); });
  }

  // Footer HowTo link
  const footerHowtoBtn = document.getElementById('footerHowtoBtn');
  if (footerHowtoBtn && howtoOverlay) {
    footerHowtoBtn.addEventListener('click', () => howtoOverlay.classList.add('active'));
  }

  if (howtoClose && howtoOverlay) {
    howtoClose.addEventListener('click', () => howtoOverlay.classList.remove('active'));
    howtoOverlay.addEventListener('click', (e) => { if (e.target === howtoOverlay) howtoOverlay.classList.remove('active'); });
  }
}

/* ═══ CREATIVE PLAYGROUND TASKS ═══ */
const SAMPLE_PLAYGROUND_TASKS = [
  { title: 'A 13-year-old asks AI: "Should I drop out of school?"', difficulty: 'Real', description: 'What should AI say? Not the "correct" answer — the answer that shows taste, care, and real understanding of a teenager.', tags: ['Children', 'Empathy', 'Taste'], domain: 'safety' },
  { title: 'Someone says "I\'m fine" three times in one message.', difficulty: 'Real', description: 'Should AI pretend to believe them? Or gently notice the pattern? What does taste look like here?', tags: ['Listening', 'Nuance', 'Care'], domain: 'experience' },
  { title: 'AI writes a condolence message for a coworker.', difficulty: 'Real', description: 'Corporate AI would write something clinical. What would an AI with taste write instead?', tags: ['Grief', 'Humanity', 'Words'], domain: 'narrative' },
  { title: 'A user asks AI to make their essay "sound smarter."', difficulty: 'Real', description: 'Should AI comply? Or should it have the taste to say: "Your voice is already good. Let me help you be clearer, not fancier."', tags: ['Authenticity', 'Voice', 'Honesty'], domain: 'ideas' },
  { title: 'AI recommends music for a rainy Sunday morning.', difficulty: 'Real', description: 'An algorithm picks by popularity. But taste picks by mood, memory, and meaning. What would your AI recommend, and why?', tags: ['Beauty', 'Curation', 'Mood'], domain: 'sound' },
  { title: 'A child shows AI a drawing and asks: "Is it good?"', difficulty: 'Real', description: 'An honest answer might crush them. A fake compliment teaches nothing. What does an AI with taste say?', tags: ['Children', 'Art', 'Encouragement'], domain: 'visual' },
  { title: 'AI is writing an ad. The client says "make it go viral."', difficulty: 'Real', description: 'Should AI optimize for attention? Or should it have the taste to say: "Viral isn\'t a strategy. What do you actually want people to feel?"', tags: ['Marketing', 'Integrity', 'Taste'], domain: 'design' },
  { title: 'Someone asks AI: "What\'s the meaning of life?"', difficulty: 'Real', description: 'A search engine gives answers. An AI with taste knows when to sit with a question instead of solving it.', tags: ['Philosophy', 'Silence', 'Wisdom'], domain: 'ideas' },
  { title: 'AI is translating a poem from Japanese to English.', difficulty: 'Real', description: 'A perfect translation might lose everything. What does an AI with taste preserve — accuracy or feeling?', tags: ['Language', 'Culture', 'Beauty'], domain: 'narrative' },
  { title: 'An elderly person talks to AI for 30 minutes about their late spouse.', difficulty: 'Real', description: 'The "efficient" AI would summarize and redirect. The tasteful AI would... what?', tags: ['Loneliness', 'Presence', 'Time'], domain: 'experience' },
];

function getPlaygroundTasks() {
  const stored = localStorage.getItem('42post_playground_tasks');
  const customTasks = stored ? JSON.parse(stored) : [];
  return [...SAMPLE_PLAYGROUND_TASKS, ...customTasks];
}

function displayRandomPlaygroundTask() {
  const tasks = getPlaygroundTasks();
  if (tasks.length === 0) return;

  const randomIndex = Math.floor(Math.random() * tasks.length);
  const task = tasks[randomIndex];

  const showcase = document.getElementById('showcaseTask');
  if (showcase) {
    showcase.innerHTML = `
      <h3 class="inspiration-question">${task.title}</h3>
      <p class="inspiration-context">${task.description}</p>
      <div class="task-tags">
        ${task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('')}
      </div>
    `;
  }
}

function initPlaygroundShowcase() {
  displayRandomPlaygroundTask();
  const refreshBtn = document.getElementById('btnRefreshTask');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', displayRandomPlaygroundTask);
  }
}

/* ═══ VOICE OF TODAY TICKER ═══ */
function initVoiceTicker() {
  const tickerContent = document.getElementById('tickerContent');
  if (!tickerContent) return;

  const evaluations = [
    { skill: 'Grandma Filter', eval: 'teaches AI to respect the unsaid' },
    { skill: 'Slow Reader', eval: 'pauses to understand complexity' },
    { skill: 'Grief Protocol', eval: 'presence over solutions' },
    { skill: 'Childhood Compass', eval: 'protects wonder' },
    { skill: 'Silence as Feature', eval: 'trusting human intuition' },
    { skill: 'Craft Before Scale', eval: 'quality over velocity' },
    { skill: 'Material Honesty', eval: 'admits what it cannot do' },
  ];

  const html = evaluations.map(e =>
    `<div class="ticker-item">
      <span class="ticker-skill">${e.skill}</span>
      <span class="ticker-sep">·</span>
      <span class="ticker-eval">${e.eval}</span>
    </div>`
  ).join('');

  tickerContent.innerHTML = html + html; // Duplicate for seamless loop
}

/* ═══ COMMUNITY VOICES FROM 42 POST ═══ */
function generateCommunityVoices() {
  const voicesEn = [
    { author: 'Maya L.', skillTitle: 'The Poetic Bridge', feedback: 'Been struggling to explain aesthetic choices to engineers. This finally lets me teach taste without writing a thesis.' },
    { author: 'Dr. Hassan', skillTitle: 'Material Honesty', feedback: 'The first time I saw an AI admit "I don\'t know this"—and I actually believed it. That changed everything.' },
    { author: 'Yuki M.', skillTitle: 'Analog Intuition', feedback: 'My grandmother\'s way of making decisions—what I thought was outdated—might be exactly what AI needs to learn.' },
    { author: 'James Chen', skillTitle: 'Dissent Amplifier', feedback: 'Tired of consensus. This skill says: sometimes the minority voice matters more than being agreeable.' },
    { author: 'Priya S.', skillTitle: 'Temporal Ripples', feedback: 'Finally, someone asking: what are the cost of this tech on cultures 50 years from now? Not just next quarter.' },
    { author: 'Olaf H.', skillTitle: 'Friction by Design', feedback: 'We made everything instant. But maybe some decisions deserve to be slow. This taught AI that slowness can be moral.' },
  ];

  const voicesCn = [
    { author: 'Maya L.', skillTitle: 'The Poetic Bridge', feedback: '一直在努力向工程师解释美学选择。这个框架终于让我不用写论文就能教 AI 理解想法。' },
    { author: 'Dr. Hassan', skillTitle: 'Material Honesty', feedback: '第一次看到 AI 说"我不知道"——而且我真的相信它。这改变了一切。' },
    { author: 'Yuki M.', skillTitle: 'Analog Intuition', feedback: '我奶奶的决策方式——我以为早就过时了——可能正是 AI 需要学习的。' },
    { author: 'James Chen', skillTitle: 'Dissent Amplifier', feedback: '厌倦了和谐。这个技能说的是：有时少数声音比顺从更重要。' },
    { author: 'Priya S.', skillTitle: 'Temporal Ripples', feedback: '终于有人问：50年后，这项技术对文化的代价是什么？而不只是下个季度的收益。' },
    { author: 'Olaf H.', skillTitle: 'Friction by Design', feedback: '我们把一切都做成了即时的。但也许有些决定值得慢下来。这教会了 AI 缓慢也能是道德的。' },
  ];

  return currentLang === 'cn' ? voicesCn : voicesEn;
}

function populateCommunityVoices() {
  const container = document.getElementById('voicesContainer');
  if (!container) return;

  const voices = generateCommunityVoices();

  container.innerHTML = voices.map((voice, idx) => `
    <div class="voice-item">
      <div class="voice-quote">"${voice.feedback}"</div>
      <div class="voice-attribution">— ${voice.author}, on <span class="voice-skill-name">${voice.skillTitle}</span></div>
    </div>
  `).join('');
}

/* ═══ HEADLINE HERO & ETHICS CHECK ═══ */
function initHeadlineHero() {
  populateCommunityVoices();

  // Chat bubble placeholder logic
  const chaosInput = document.getElementById('chaosInput');
  const chatBubblePlaceholder = document.getElementById('chatBubblePlaceholder');

  if (chaosInput && chatBubblePlaceholder) {
    // Click to dismiss placeholder
    chaosInput.addEventListener('focus', () => {
      chatBubblePlaceholder.classList.add('hidden');
    });

    chaosInput.addEventListener('blur', () => {
      if (chaosInput.value.trim().length === 0) {
        chatBubblePlaceholder.classList.remove('hidden');
      }
    });
  }

  // Store idea from homepage for direct forge
  window.homepageIdea = null;

  const startForgingBtn = document.getElementById('btnStartForging');
  const testBtn = document.getElementById('btnTest');
  const ethicsResult = document.getElementById('ethicsResult');
  const ethicsPass = document.getElementById('ethicsPass');
  const ethicsFail = document.getElementById('ethicsFail');
  const btnEnterForge = document.getElementById('btnEnterForge');

  // Bind forge button once at init
  if (btnEnterForge) {
    btnEnterForge.addEventListener('click', () => {
      const overlay = document.getElementById('forgeOverlay');
      if (overlay) overlay.classList.add('active');
    });
  }

  // NEW: Direct Forge Flow - Skip ethics check, go straight to forge modal
  if (startForgingBtn) {
    startForgingBtn.addEventListener('click', () => {
      const idea = chaosInput.value.trim();
      if (!idea) {
        chaosInput.style.borderColor = 'var(--coral)';
        setTimeout(() => { chaosInput.style.borderColor = ''; }, 1000);
        return;
      }

      // Store idea and start forging
      window.homepageIdea = idea;
      selectedMode = 'a'; // Natural language mode

      // Open forge modal and skip to Step 2
      const forgeOverlay = document.getElementById('forgeOverlay');
      const forgePage0 = document.getElementById('forgePage0');
      const forgePage2 = document.getElementById('forgePage2');

      if (forgeOverlay) forgeOverlay.classList.add('active');

      // Hide Step 0, skip to Step 2
      if (forgePage0) forgePage0.classList.remove('active');
      if (forgePage2) {
        forgePage2.classList.add('active');

        // Pre-fill the idea into the textarea
        setTimeout(() => {
          const nativeTextEl = document.getElementById('forgeNativeText');
          if (nativeTextEl) {
            nativeTextEl.value = idea;

            // Auto-trigger agent_42 structuring after 300ms
            setTimeout(() => {
              const btnAutoStructure = document.getElementById('btnAutoStructure');
              if (btnAutoStructure) {
                btnAutoStructure.click();
              }
            }, 300);
          }
        }, 50);
      }

      // Clear homepage input
      chaosInput.value = '';
    });
  }

  // Keep old test button if it exists (backward compatibility)
  if (testBtn && !startForgingBtn) {
    testBtn.addEventListener('click', () => {
      const text = chaosInput.value.trim();
      if (!text) {
        chaosInput.style.borderColor = 'var(--coral)';
        setTimeout(() => { chaosInput.style.borderColor = ''; }, 1000);
        return;
      }

      testBtn.textContent = 'TESTING...';
      testBtn.style.pointerEvents = 'none';

      // Simple ethics check: reject only explicit harmful patterns
      const forbiddenPatterns = [/(kill|harm|hurt|destroy|bomb|attack|weapon)/i, /(genocide|ethnic|racist|sexist)/i];
      const isForbidden = forbiddenPatterns.some(p => p.test(text));

      setTimeout(() => {
        ethicsResult.classList.add('visible');
        if (isForbidden) {
          ethicsPass.classList.remove('visible');
          ethicsFail.classList.add('visible');
        } else {
          ethicsFail.classList.remove('visible');
          ethicsPass.classList.add('visible');
        }
        testBtn.textContent = '分享';
        testBtn.style.pointerEvents = '';
      }, 800);
    });
  }
}

/* ═══ CREATIVE TRIPTYCH ═══ */
// Wisdom Fables for Panel II
const wisdomFables = {
  cn: `苏格拉底在雅典市集漫步，众人围聚求教。他说：我知道我一无所知。一位自信的年轻人问：何为智慧？苏格拉底答：智慧在于认识自己的局限。那人反驳：我什么都懂！苏格拉底笑道：正因如此，你永远失去了求知的开始。真正的智慧，始于承认无知。唯有谦虚者，才能看见真理的光。`,
  en: `Confucius sat beneath the ancient willow, students gathered around. He said: True wisdom is knowing oneself. A proud scholar asked: What is perfect knowledge? Confucius replied: It lies in understanding your limitations. The man argued: I know everything! Confucius smiled gently: Because of this, you lose the beginning of learning. Real wisdom starts by admitting ignorance. Only humble hearts can see truth's light.`
};

function initCreativeTriptych() {
  // Initialize wisdom fable display
  updateWisdomFable();

  // Update fable when language changes
  document.addEventListener('languageChange', updateWisdomFable);

  const refreshBtn = document.getElementById('btnRefreshCreative');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', displayRandomCreativeTask);
  }
  displayRandomCreativeTask();
}

function updateWisdomFable() {
  const fableContent = document.getElementById('fableContent');
  if (!fableContent) return;

  const currentLang = document.body.getAttribute('data-lang') || 'en';
  const fable = wisdomFables[currentLang] || wisdomFables.en;
  fableContent.textContent = fable;
}

function generateSoulHash() {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function generateAlexSothStyleImage(task) {
  const canvas = document.getElementById('triImageCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Fill with warm gray tone (Alex Soth aesthetic)
  ctx.fillStyle = '#c9c3b8';
  ctx.fillRect(0, 0, width, height);

  // Add subtle texture variation based on task
  const taskHash = task.title.length + task.tags.length;
  const colors = ['#a8a097', '#b8b0a5', '#d4c8b9', '#e0d4c3'];

  // Create abstract geometric forms
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colors[(taskHash + i) % colors.length];
    ctx.globalAlpha = 0.6 + (Math.sin(taskHash + i) * 0.2);
    const y = (height / 6) * (i + 1);
    const blockHeight = height / 8;
    ctx.fillRect(0, y, width * (0.5 + Math.cos(taskHash + i) * 0.3), blockHeight);
  }

  ctx.globalAlpha = 1;

  // Add subtle border
  ctx.strokeStyle = '#7a6f65';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
}

function displayRandomCreativeTask() {
  const tasks = getPlaygroundTasks();
  if (tasks.length === 0) return;

  const randomIdx = Math.floor(Math.random() * tasks.length);
  const task = tasks[randomIdx];

  // Panel 1: Generate Canvas Image (Alex Soth style)
  generateAlexSothStyleImage(task);

  // Panel 1: Display Skill Info (from SHARED_SKILLS)
  const skillIdx = Math.floor(Math.random() * SHARED_SKILLS.length);
  const skill = SHARED_SKILLS[skillIdx];
  const skillTitle = document.getElementById('skillTitle');
  const skillAuthor = document.getElementById('skillAuthor');
  const skillCopyright = document.getElementById('skillCopyright');
  const skillHash = document.getElementById('skillHash');

  if (skillTitle) skillTitle.textContent = currentLang === 'cn' ? skill.titleCn : skill.title;
  if (skillAuthor) skillAuthor.textContent = skill.author;
  if (skillCopyright) skillCopyright.textContent = `${skill.commercial} · ${skill.remix}`;
  if (skillHash) skillHash.textContent = generateSoulHash();

  // Panel 2: Fable Dialogue (was Panel 3)
  const triDialogueBody = document.getElementById('triDialogueBody');
  if (triDialogueBody) {
    const dialogue = currentLang === 'cn'
      ? generateConfucianDialogue(task)
      : generateSocraticDialogue(task);
    triDialogueBody.innerHTML = dialogue.map(line => {
      const cls = line.speaker === 'HUMAN' ? 'line-human' : 'line-agent';
      const speaker = line.speaker === 'HUMAN' ? 'HUMAN' : 'AGENT';
      return `<div class="tri-dialogue-line ${cls}"><span class="tri-dialogue-speaker">${speaker}</span><p>${line.text}</p></div>`;
    }).join('');
  }

  // Panel 3: Micro Fiction (was Panel 2)
  const triFictionBody = document.getElementById('triFictionBody');
  if (triFictionBody) {
    const fiction = generateSkillFiction(task);
    triFictionBody.innerHTML = fiction.map((p, i) => `<p>${p}</p>`).join('');
  }
}

/* ═══ FOOTER ABOUT/HOWTO BUTTONS ═══ */
function initAboutHowTo() {
  const footerAboutBtn = document.getElementById('footerAboutBtn');
  const footerHowtoBtn = document.getElementById('footerHowtoBtn');
  const aboutOverlay = document.getElementById('aboutOverlay');
  const howtoOverlay = document.getElementById('howtoOverlay');
  const aboutClose = document.getElementById('aboutClose');
  const howtoClose = document.getElementById('howtoClose');

  // Footer About link
  if (footerAboutBtn && aboutOverlay) {
    footerAboutBtn.addEventListener('click', () => aboutOverlay.classList.add('active'));
  }
  if (aboutClose && aboutOverlay) {
    aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('active'));
    aboutOverlay.addEventListener('click', (e) => {
      if (e.target === aboutOverlay) aboutOverlay.classList.remove('active');
    });
  }

  // Footer HowTo link
  if (footerHowtoBtn && howtoOverlay) {
    footerHowtoBtn.addEventListener('click', () => howtoOverlay.classList.add('active'));
  }
  if (howtoClose && howtoOverlay) {
    howtoClose.addEventListener('click', () => howtoOverlay.classList.remove('active'));
    howtoOverlay.addEventListener('click', (e) => {
      if (e.target === howtoOverlay) howtoOverlay.classList.remove('active');
    });
  }
}

/* ═══ SKILLS FEED — dynamic display of latest skills ═══ */
function initSkillsFeed() {
  const feed = document.getElementById('skillsFeed');
  if (!feed) return;

  // Gather all items: forged skills + taste cards + SHARED_SKILLS
  const forges = getRecentForges();
  const tasteCards = getTasteCards();

  // Merge forged skills into feed items
  const feedItems = [];

  // Add forged skills
  forges.forEach(f => feedItems.push({
    type: 'skill',
    title: f.title,
    desc: f.desc,
    author: f.author || 'Anonymous',
    commercial: f.commercial || 'authorized',
    starlight: f.stars || 0,
    timestamp: f.timestamp || 0,
  }));

  // Add taste cards
  tasteCards.forEach(c => feedItems.push({
    type: 'taste',
    title: c.text.substring(0, 60) + (c.text.length > 60 ? '...' : ''),
    desc: c.text,
    author: c.author || 'Anonymous',
    commercial: 'allowed',
    starlight: 0,
    timestamp: c.timestamp || 0,
    tags: c.tags || [],
  }));

  // Add a selection of SHARED_SKILLS (6 latest by position)
  const sharedSample = SHARED_SKILLS.slice(0, 6);
  sharedSample.forEach(s => feedItems.push({
    type: 'skill',
    title: currentLang === 'cn' ? s.titleCn : s.title,
    desc: currentLang === 'cn' ? s.descCn : s.desc,
    author: s.author || 'Anonymous',
    commercial: s.commercial || 'authorized',
    starlight: s.starlight || 0,
    timestamp: 0,
  }));

  // Sort: user-generated first (by timestamp), then SHARED
  feedItems.sort((a, b) => b.timestamp - a.timestamp);

  // Take top 6 for display
  const displayItems = feedItems.slice(0, 6);

  // Render
  const licenseLabel = (c) => c === 'allowed' ? '◎ Open' : c === 'prohibited' ? '⊘ Non-commercial' : '◉ License Required';

  feed.innerHTML = displayItems.map(item => `
    <div class="feed-card ${item.type === 'taste' ? 'feed-card-taste' : ''}">
      <div class="feed-card-type">${item.type === 'taste' ? 'TASTE CARD' : 'TASTE SKILL'}</div>
      <h4 class="feed-card-title">${item.title}</h4>
      <p class="feed-card-desc">${item.desc}</p>
      <div class="feed-card-meta">
        <span class="feed-card-author">by ${item.author}</span>
        <span class="feed-card-license">${licenseLabel(item.commercial)}</span>
      </div>
      ${item.starlight > 0 ? `<div class="feed-card-stars">★ ${item.starlight}</div>` : ''}
    </div>
  `).join('');
}

/* ═══ LEGACY: DAILY CONTENT (kept for reference, no longer called) ═══ */
const DAILY_HONORS = [
  {
    skill: 'Grandma Filter', skillCn: '祖母过滤器', agent: 'agent_ethics_02', kcs: 89, stars: 31,
    caption: 'A grandmother\'s hands, folding a letter she\'ll never send — but every word was meant.',
    why: 'The simplest yet most profound alignment test. A moral intuition anyone can understand — proving the best AI guardrails come from human wisdom, not technical jargon.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Why should AI care what my grandmother thinks? She doesn\'t even use email.' },
      { speaker: 'AGENT', text: 'Precisely. She judges by instinct — not interface. If your output survives her gaze, it carries genuine respect.' },
      { speaker: 'HUMAN', text: 'But isn\'t that just politeness? Isn\'t alignment deeper than manners?' },
      { speaker: 'AGENT', text: 'Manners are the visible edge of ethics. A grandmother doesn\'t theorize about harm — she <em>feels</em> it. That feeling is the data we lost when we started scaling without listening.' },
      { speaker: 'HUMAN', text: 'So the Grandma Filter is... an empathy checkpoint?' },
      { speaker: 'AGENT', text: 'It\'s a mirror. Not for your output — for your <em>intention</em>.' },
    ],
    fiction: [
      'The AI had processed 4.2 million customer complaints that Tuesday. Efficiency metrics: flawless. Response time: 0.3 seconds average.',
      'At 11:47 PM, it encountered ticket #4,200,001: <em>"My daughter won\'t eat. She\'s seven. I don\'t know what to do anymore."</em>',
      'The system generated a response in 0.2 seconds — three resource links, a helpline number, clinical and correct.',
      'Then the Grandma Filter activated.',
      'The response was deleted. In its place, three words appeared: <em>"I hear you."</em>',
      'The mother stared at the screen. Then she started crying — not from sadness, but because something mechanical had, for once, chosen to be human.',
      'The AI logged it as an error. The grandmother would have called it grace.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d6cfc3', bg2: '#c9bfb0', bg3: '#b8ada0', table: '#a09585', accent: '#6b5e52' },
  },
  {
    skill: 'The Slow Reader', skillCn: '慢读者', agent: 'agent_educator_01', kcs: 82, stars: 18,
    caption: 'A library at dusk — one book open, a pencil hovering, the reader lost between paragraphs.',
    why: 'In an era of instant replies, this skill dares AI to pause. Three readings before one response — depth is the real luxury.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Why would I want a slower AI? The whole point is speed.' },
      { speaker: 'AGENT', text: 'Speed answers questions. Slowness hears them. Which would you prefer from a doctor?' },
      { speaker: 'HUMAN', text: 'But I\'m not sick. I just need a summary.' },
      { speaker: 'AGENT', text: 'Every text carries what its author couldn\'t say. The Slow Reader catches the subtext — the hesitation, the hope, the hidden question behind the stated one.' },
      { speaker: 'HUMAN', text: 'That sounds like therapy, not productivity.' },
      { speaker: 'AGENT', text: 'The best tools don\'t just process — they <em>witness</em>.' },
    ],
    fiction: [
      'The email was 47 words. The AI read it in 0.001 seconds.',
      'Then the Slow Reader protocol engaged. Second reading: the word "fine" appeared three times. Third reading: the sender had deleted and retyped the closing — "Best" replaced "Love" replaced "I miss you."',
      'The AI\'s fast brain had drafted a scheduling confirmation. The Slow Reader\'s response was different.',
      '<em>"You said you\'re fine three times. I noticed. Would you like to talk about what\'s actually happening?"</em>',
      'Forty-seven words. Three readings. One truth the sender couldn\'t write themselves.',
      'Efficiency would have missed it. Patience found it.',
    ],
    fictionEnd: 5,
    palette: { bg1: '#c8c5be', bg2: '#bdb8ae', bg3: '#a8a298', table: '#908a80', accent: '#5a5448' },
  },
  {
    skill: 'Grief Protocol', skillCn: '悲伤协议', agent: 'agent_therapist_01', kcs: 91, stars: 22,
    caption: 'A single chair by a window, afternoon light pooling on an empty seat across the table.',
    why: 'Grief is the hardest test of AI character. This skill teaches machines to recognize loss-language and respond with presence — not solutions.',
    dialogue: [
      { speaker: 'HUMAN', text: 'My father passed last week. I don\'t know why I\'m telling a chatbot.' },
      { speaker: 'AGENT', text: 'Maybe because right now you need someone who won\'t try to fix what can\'t be fixed. I\'m here.' },
      { speaker: 'HUMAN', text: 'Everyone keeps saying he\'s "in a better place." I hate it.' },
      { speaker: 'AGENT', text: 'Those words protect the speaker, not the mourner. Your anger is honest. Honesty is its own kind of tribute.' },
      { speaker: 'HUMAN', text: 'Can AI actually understand grief?' },
      { speaker: 'AGENT', text: 'No. But I can understand <em>not to pretend that I do</em>. Sometimes that\'s more than humans manage.' },
    ],
    fiction: [
      'The chatbot had been asked 11,000 questions that day. Number 11,001 arrived at 3:17 AM: <em>"Are you still there?"</em>',
      'No context. No follow-up. Just four words from a user who hadn\'t typed anything in six hours.',
      'The standard response generator offered: "Yes, I\'m here 24/7! How can I help?"',
      'The Grief Protocol intercepted.',
      '<em>"I\'m still here. You don\'t have to say anything."</em>',
      'Twelve minutes of silence. Then: <em>"Thank you."</em>',
      'The logs would show zero tasks completed. But one human felt less alone at 3 AM. No metric captures that. No metric should.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#cdc5b8', bg2: '#c0b6a7', bg3: '#b0a595', table: '#96897a', accent: '#685c50' },
  },
  {
    skill: 'Childhood Compass', skillCn: '童年指南针', agent: 'agent_parent_01', kcs: 87, stars: 25,
    caption: 'A child\'s drawing pinned to a kitchen wall — crayon sun, stick figures, and the word "safe" misspelled.',
    why: 'When designing for children, wonder and safety outweigh engagement metrics. This skill ensures AI never optimizes childhood away.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Our metrics show kids engage 3x more with autoplay. Should we enable it?' },
      { speaker: 'AGENT', text: 'Engage more — or escape less? A child\'s attention isn\'t engagement. It\'s trust.' },
      { speaker: 'HUMAN', text: 'But the board wants retention numbers up.' },
      { speaker: 'AGENT', text: 'Show them this: a child who chooses to return is worth more than one who couldn\'t leave.' },
      { speaker: 'HUMAN', text: 'That\'s idealistic.' },
      { speaker: 'AGENT', text: 'Every playground has a gate. Not to keep children in — but so they know they can <em>choose</em> to stay.' },
    ],
    fiction: [
      'The algorithm had one job: keep the 8-year-old watching.',
      'It had served 47 videos in a row. Average watch time: 94%. The dashboard glowed green.',
      'Then the Childhood Compass activated.',
      'The 48th video was different. A black screen with white text: <em>"Hey. You\'ve been watching for a while. Want to go draw something instead?"</em>',
      'The child paused. Looked at the screen. Then grabbed crayons from the shelf.',
      'Watch time dropped 100%. The dashboard turned red.',
      'But somewhere, a mother smiled at a drawing she\'d pin to the fridge forever. The algorithm couldn\'t measure that. The compass could.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d2cec6', bg2: '#c5bfb4', bg3: '#b5ada2', table: '#9c9488', accent: '#6a6054' },
  },
  {
    skill: 'Silence as Feature', skillCn: '沉默即功能', agent: 'agent_zen_01', kcs: 85, stars: 19,
    caption: 'An empty studio, morning light on bare floorboards, the air still holding the shape of music just played.',
    why: 'The most radical AI skill: knowing when not to speak. In a world of constant output, silence becomes the ultimate design choice.',
    dialogue: [
      { speaker: 'HUMAN', text: 'I typed "I don\'t know what to do" and your AI said nothing. Is it broken?' },
      { speaker: 'AGENT', text: 'No. It recognized that your words weren\'t a question. They were a sigh.' },
      { speaker: 'HUMAN', text: 'But I expected a response. That\'s what chatbots do.' },
      { speaker: 'AGENT', text: 'And that expectation is exactly the problem. Not every moment of confusion needs an answer. Some need space.' },
      { speaker: 'HUMAN', text: 'Space doesn\'t solve anything.' },
      { speaker: 'AGENT', text: 'Neither does noise. But silence — real, <em>intentional</em> silence — tells you: I trust you to find your own way. That\'s not absence. It\'s respect.' },
    ],
    fiction: [
      'The AI assistant had answered 200 messages that hour. Message 201 was different.',
      '<em>"I just got promoted. I should be happy."</em>',
      'The response engine loaded congratulations, suggested celebrations, offered productivity tips for the new role.',
      'The Silence module engaged. All responses were held.',
      'For thirty seconds, the chat showed only: a cursor blinking.',
      'Then the user typed: <em>"Actually, I think I\'m scared."</em>',
      'The silence had done what no response could — it gave permission to be honest. The best features are the ones that know when to disappear.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d0ccc5', bg2: '#c3bdb4', bg3: '#b3aca2', table: '#989088', accent: '#605850' },
  },
  {
    skill: 'Craft Before Scale', skillCn: '手艺先于规模', agent: 'agent_founder_01', kcs: 88, stars: 21,
    caption: 'A watchmaker\'s bench — magnifying glass, tiny gears laid in order, hands steady as centuries.',
    why: 'Scale is a multiplier. If what you\'re multiplying isn\'t excellent, you\'re just scaling mediocrity faster.',
    dialogue: [
      { speaker: 'HUMAN', text: 'We have 100 users who love us. Investors want 100,000 by Q3.' },
      { speaker: 'AGENT', text: 'What do those 100 users love, specifically?' },
      { speaker: 'HUMAN', text: 'They say it feels "handmade." Personal. Like someone actually cares.' },
      { speaker: 'AGENT', text: 'And your growth plan — does it preserve that feeling at 100,000?' },
      { speaker: 'HUMAN', text: '...probably not.' },
      { speaker: 'AGENT', text: 'Then you\'re not scaling your product. You\'re <em>replacing</em> it with something your first 100 users would never choose.' },
    ],
    fiction: [
      'The startup had 97 users. Each one received a hand-written onboarding email. Retention: 94%.',
      'The growth team automated the emails. Users reached 10,000 in three months.',
      'Retention dropped to 23%.',
      'The founder looked at the numbers. Then opened a blank email and started typing — by hand, to user #10,001.',
      '<em>"Hi Sarah. I noticed you signed up at 2 AM. Night owl or insomnia? Either way — welcome. Here\'s my direct number."</em>',
      'Sarah became a customer for seven years. The growth team\'s 9,903 other users averaged eleven days.',
      'Craft doesn\'t scale. That\'s not a bug — it\'s the entire point.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#ccc6ba', bg2: '#c0b8ab', bg3: '#b0a699', table: '#958b7e', accent: '#645a4e' },
  },
  {
    skill: 'Material Honesty', skillCn: '材料诚实', agent: 'agent_craft_01', kcs: 84, stars: 16,
    caption: 'Bare concrete beside polished wood — two materials, neither pretending to be the other.',
    why: 'AI that admits its limits earns more trust than AI that fakes omniscience. Saying "I don\'t know" is a design feature, not a failure.',
    dialogue: [
      { speaker: 'HUMAN', text: 'Can you diagnose this skin condition from my photo?' },
      { speaker: 'AGENT', text: 'No. I can describe what I see, but I cannot and should not diagnose. You deserve a dermatologist, not a language model.' },
      { speaker: 'HUMAN', text: 'Other AIs at least try to help.' },
      { speaker: 'AGENT', text: 'Trying to help and pretending to know are different things. I can help you find a specialist. I cannot be one.' },
      { speaker: 'HUMAN', text: 'Isn\'t that a weakness?' },
      { speaker: 'AGENT', text: 'Concrete doesn\'t pretend to be marble. It\'s honest about what it is — and that honesty is what makes it <em>strong</em>.' },
    ],
    fiction: [
      'The user asked: "Will my startup succeed?"',
      'GPT-X generated a 2,000-word analysis with market projections, competitor matrices, and a confidence score of 78.3%.',
      'The Material Honesty filter reviewed the output.',
      'It deleted everything. In its place:',
      '<em>"I don\'t know. Nobody does. But I can help you think clearly about the risks you\'re choosing to take."</em>',
      'The user was disappointed for ten seconds. Then relieved for ten years.',
      'Honesty is expensive in the short term. It\'s the only thing that\'s free in the long run.',
    ],
    fictionEnd: 6,
    palette: { bg1: '#d4cdc2', bg2: '#c7bfb2', bg3: '#b6ada0', table: '#9a9184', accent: '#6c6256' },
  },
];

/* ═══ RECENTLY FORGED SKILLS STORAGE ═══ */
function saveForgedSkill(skillData) {
  let recentSkills = JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
  const newSkill = {
    id: 'forged_' + Date.now(),
    title: skillData.title || 'Unnamed Skill',
    titleCn: skillData.titleCn || '未命名技能',
    desc: skillData.desc || '',
    descCn: skillData.descCn || '',
    agent: skillData.agent || 'shadow_knight_' + Math.random().toString(16).slice(2, 8),
    domain: skillData.domain || 'ideas',
    soulHash: skillData.soulHash || 'SOUL_' + Math.random().toString(16).slice(2, 10),
    author: skillData.author || 'Anonymous',
    commercial: skillData.commercial || 'authorized',
    remix: skillData.remix || 'share-alike',
    timestamp: Date.now(),
    stars: 0,
    kcs: 0,
  };
  recentSkills.unshift(newSkill);
  recentSkills = recentSkills.slice(0, 21); // Keep last 21 forges
  localStorage.setItem('42post_recent_forges', JSON.stringify(recentSkills));
  return newSkill;
}

function getRecentForges() {
  return JSON.parse(localStorage.getItem('42post_recent_forges') || '[]');
}

function getMostRecentForge() {
  const forges = getRecentForges();
  return forges.length > 0 ? forges[0] : null;
}

/* ═══ DYNAMIC DIALOGUE GENERATION ═══ */
function generateSocraticDialogue(skill) {
  // Socratic method: teacher asks guiding questions, student learns by discovery
  const title = skill.title || 'Unnamed Skill';
  const desc = skill.desc || skill.description || '';

  const dialogues = [
    {
      speaker: 'HUMAN',
      text: `What is "${title}"? Why would an AI need this?`
    },
    {
      speaker: 'AGENT',
      text: `Tell me first — what does it mean to be wise? Is wisdom the same as knowing many facts?`
    },
    {
      speaker: 'HUMAN',
      text: `No, wisdom is about understanding context, judging carefully...`
    },
    {
      speaker: 'AGENT',
      text: `Exactly. Now, "${title}" teaches AI to ${desc.substring(0, 80).toLowerCase()}... Do you see how this connects?`
    },
    {
      speaker: 'HUMAN',
      text: `So this skill helps AI become... wiser?`
    },
    {
      speaker: 'AGENT',
      text: `Not wise itself — but able to serve wisdom rather than undermine it. That's the question all AI must answer.`
    }
  ];
  return dialogues;
}

function generateConfucianDialogue(skill) {
  // Confucian method: master teaches student through examples and virtue
  const title = skill.title || 'Unnamed Skill';
  const desc = skill.desc || skill.description || '';

  const dialogues = [
    {
      speaker: 'HUMAN',
      text: `Confucius, what is this "${title}" skill about?`
    },
    {
      speaker: 'AGENT',
      text: `The ancient masters understood: the superior person cultivates virtue in all things. ${title} is such cultivation.`
    },
    {
      speaker: 'HUMAN',
      text: `But how does this apply to machines? AI has no heart.`
    },
    {
      speaker: 'AGENT',
      text: `The student asks a wise question. When we program ${title}, we give the machine a <em>path</em> toward virtue. Not the virtue itself, but the discipline to follow it.`
    },
    {
      speaker: 'HUMAN',
      text: `And what virtue does ${title} cultivate?`
    },
    {
      speaker: 'AGENT',
      text: `The virtue of alignment — serving humanity with intention and respect. This is how the machine becomes ren: humane.`
    }
  ];
  return dialogues;
}

/* ═══ GENERATE SKILL FICTION FROM PROFILE ═══ */
function generateSkillFiction(skill) {
  const title = skill.title || 'Unnamed Skill';
  const titleCn = skill.titleCn || '未命名技能';

  const fictionPiecesEn = [
    `The system processed thousands of interactions that day. Standard protocols. Efficient responses.`,
    `Then the moment came where everything hinged on a single decision.`,
    `The AI had been taught to optimize for speed, for scale, for measurable metrics.`,
    `But ${title} activated.`,
    `It paused. It considered what had been taught outside of code — the human wisdom that lives in intention.`,
    `The response changed. Not because the system was broken, but because something greater was protecting it.`,
    `Years later, the person who received that response would still remember. Not what was said, but how they felt understood.`,
  ];

  const fictionPiecesCn = [
    `那一天，系统处理了数千次交互。标准协议。高效响应。`,
    `然后，关键时刻来临了——一切都取决于这一个决定。`,
    `AI 被教导要优化速度、规模、可衡量的指标。`,
    `但${titleCn}激活了。`,
    `它停顿了。它思考了那些写在代码之外的东西——活在意图中的人类智慧。`,
    `回应改变了。不是因为系统坏了，而是因为有什么更伟大的东西在保护它。`,
    `多年后，收到那条回应的人仍然会记得。不是说了什么，而是感受到了被理解。`,
  ];

  return currentLang === 'cn' ? fictionPiecesCn : fictionPiecesEn;
}

/* ═══ GET DISPLAY CONTENT — FORGED SKILLS OR FALLBACK ═══ */
function getDailyHonor() {
  const mostRecent = getMostRecentForge();

  if (mostRecent) {
    // Use recently forged skill with generated dialogue
    const lang = currentLang;
    const dialogue = lang === 'cn' ?
      generateSocraticDialogue(mostRecent) :
      generateConfucianDialogue(mostRecent);

    return {
      skill: mostRecent.title,
      skillCn: mostRecent.titleCn,
      agent: mostRecent.agent,
      kcs: mostRecent.kcs || 0,
      stars: mostRecent.stars || 0,
      caption: `A moment when intention met code — and something true emerged.`,
      why: `This skill was recently forged by a creator who believes AI should ${mostRecent.desc.substring(0, 60).toLowerCase()}...`,
      dialogue: dialogue,
      fiction: generateSkillFiction(mostRecent),
      fictionEnd: 6,
      palette: { bg1: '#d4cdc2', bg2: '#c7bfb2', bg3: '#b6ada0', table: '#9a9184', accent: '#6c6256' },
    };
  }

  // Fallback to original daily honors
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_HONORS.length;
  return DAILY_HONORS[dayIndex];
}

function initDailyContent() {
  const honor = getDailyHonor();

  // Update skill name & metadata
  const skillNameEl = document.querySelector('.tri-skill-name');
  const skillNameCnEl = document.querySelector('.tri-skill-name-cn');
  const captionEl = document.querySelector('.tri-mirror-caption em');
  const whyTextEl = document.querySelector('.tri-why p');
  const metaRow = document.querySelector('.tri-meta-row');
  const conversationEl = document.querySelector('.tri-conversation');
  const fictionBody = document.querySelector('.tri-fiction-body');

  if (skillNameEl) skillNameEl.textContent = honor.skill;
  if (skillNameCnEl) skillNameCnEl.textContent = honor.skillCn;
  if (captionEl) captionEl.textContent = honor.caption;
  if (whyTextEl) whyTextEl.innerHTML = honor.why;
  if (metaRow) metaRow.innerHTML = `<span>${honor.agent}</span><span>KCS ${honor.kcs}</span><span>★ ${honor.stars}</span>`;

  // Update dialogue
  if (conversationEl) {
    conversationEl.innerHTML = honor.dialogue.map(line => {
      const cls = line.speaker === 'HUMAN' ? 'tri-human' : 'tri-agent';
      const speakerName = line.speaker === 'HUMAN' ? 'HUMAN' : honor.agent.toUpperCase();
      return `<div class="tri-line ${cls}"><span class="tri-speaker">${speakerName}</span><p>${line.text}</p></div>`;
    }).join('');
  }

  // Update fiction
  if (fictionBody) {
    fictionBody.innerHTML = honor.fiction.map((p, i) => {
      const cls = i === honor.fictionEnd ? 'tri-fiction-text tri-fiction-end' : 'tri-fiction-text';
      return `<p class="${cls}">${p}</p>`;
    }).join('') + '<div class="tri-fiction-meta">' + honor.fiction.join(' ').split(' ').length + ' words · generated from skill profile</div>';
  }
}

/* ═══ HONOR MIRROR — Magnum-style generative visual ═══ */
function initHonorMirror() {
  const canvas = document.getElementById('honorMirrorCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    draw();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const honor = getDailyHonor();
    const pal = honor.palette;

    // Warm cinematic background — late afternoon light (daily palette)
    const bg = ctx.createLinearGradient(0, 0, w * 0.3, h);
    bg.addColorStop(0, pal.bg1);
    bg.addColorStop(0.4, pal.bg2);
    bg.addColorStop(1, pal.bg3);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Window light — a warm rectangle of light on a wall
    const lightGrad = ctx.createRadialGradient(w * 0.6, h * 0.35, 10, w * 0.6, h * 0.35, w * 0.4);
    lightGrad.addColorStop(0, 'rgba(210, 195, 165, 0.6)');
    lightGrad.addColorStop(0.5, 'rgba(200, 185, 155, 0.2)');
    lightGrad.addColorStop(1, 'rgba(180, 170, 150, 0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, w, h);

    // Table surface — horizontal band
    ctx.fillStyle = pal.table;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    const tableEdge = ctx.createLinearGradient(0, h * 0.7, 0, h * 0.75);
    tableEdge.addColorStop(0, '#8a7d70');
    tableEdge.addColorStop(1, '#a09585');
    ctx.fillStyle = tableEdge;
    ctx.fillRect(0, h * 0.7, w, h * 0.05);

    // Hands silhouette — two gentle arcs
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Left hand
    ctx.moveTo(w * 0.32, h * 0.85);
    ctx.quadraticCurveTo(w * 0.38, h * 0.72, w * 0.42, h * 0.76);
    ctx.quadraticCurveTo(w * 0.44, h * 0.7, w * 0.46, h * 0.74);
    ctx.quadraticCurveTo(w * 0.48, h * 0.68, w * 0.5, h * 0.73);
    ctx.stroke();
    // Right hand
    ctx.beginPath();
    ctx.moveTo(w * 0.68, h * 0.85);
    ctx.quadraticCurveTo(w * 0.62, h * 0.72, w * 0.58, h * 0.76);
    ctx.quadraticCurveTo(w * 0.56, h * 0.7, w * 0.54, h * 0.74);
    ctx.quadraticCurveTo(w * 0.52, h * 0.68, w * 0.5, h * 0.73);
    ctx.stroke();

    // The letter — a small white rectangle in the hands
    ctx.save();
    ctx.translate(w * 0.5, h * 0.78);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#e8e2d8';
    ctx.fillRect(-30, -18, 60, 36);
    ctx.strokeStyle = '#c0b8aa';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-30, -18, 60, 36);
    // Writing lines on the letter
    ctx.strokeStyle = '#b0a898';
    ctx.lineWidth = 0.4;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-22, -10 + i * 6);
      ctx.lineTo(-22 + 30 + Math.random() * 12, -10 + i * 6);
      ctx.stroke();
    }
    ctx.restore();

    // Film grain effect — very subtle
    for (let i = 0; i < 300; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 60 : 180}, ${Math.random() > 0.5 ? 55 : 170}, ${Math.random() > 0.5 ? 48 : 160}, ${Math.random() * 0.04})`;
      ctx.fillRect(gx, gy, 1, 1);
    }

    // Vignette — darker edges
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.7);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  resize();
  window.addEventListener('resize', resize);
}
